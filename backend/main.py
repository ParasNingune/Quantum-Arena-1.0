from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import io
import os
import pypdf
from pipeline.analyzer import get_analyzer
from pipeline.chatbot import get_chat_manager
from pipeline.comparator import get_comparator
from pipeline.ocr import get_extractor
from pipeline.pdf_report import generate_pdf
from pipeline.comparison_pdf import generate_comparison_pdf
from database import save_report, get_reports_by_user, get_report_by_id
from loguru import logger
from dotenv import load_dotenv

load_dotenv()

cors_origins_raw = os.getenv("CORS_ORIGINS", "*")
cors_origins = [origin.strip() for origin in cors_origins_raw.split(",") if origin.strip()]

app = FastAPI(title="MediSense AI API", version="3.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins if cors_origins else ["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class MedicalTest(BaseModel):
    test_name: str
    value: float | str
    unit: str
    status: str
    reference_range: str
    deviation_pct: float
    explanation: str
    category: str
    severity: str
    gauge_position: float

class PathToNormal(BaseModel):
    dietary_swaps: List[str]
    activity_prescription: str

class Resource(BaseModel):
    title: str
    url: str

class CuratedResources(BaseModel):
    youtube: List[Resource]
    articles: List[Resource]

class Specialist(BaseModel):
    specialty: str
    emoji: str
    reason: str
    maps_query: str

class MedicalPattern(BaseModel):
    name: str
    confidence: float
    urgency: str
    severity: str
    explanation: str
    symptoms: List[str]
    doctor_questions: List[str]
    dietary_note: str
    icd10: str
    matched_tests: List[str]

class AnalysisResponse(BaseModel):
    id: Optional[str] = None
    created_at: Optional[str] = None
    health_score: int
    health_grade: str
    health_summary: str
    doctors_narrative: str
    tests: List[MedicalTest]
    patterns: Optional[List[MedicalPattern]] = []
    path_to_normal: PathToNormal
    curated_resources: CuratedResources
    recommended_specialists: Optional[List[Specialist]] = []

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage] = []
    context: dict

class CompareRequest(BaseModel):
    report1_id: str
    report2_id: str

@app.get("/")
def home():
    return {
        "status": "online",
        "engine": os.getenv("GEMINI_ANALYZER_MODEL", "gemini-2.5-flash"),
    }

@app.post("/analyze", response_model=AnalysisResponse)
async def analyze_report(
    file: UploadFile = File(...),
    age: int = Form(...),
    gender: str = Form(...),
    language: str = Form(...),
    user_email: Optional[str] = Form(None),
):
    filename = (file.filename or "").lower()
    supported_extensions = (".pdf", ".png", ".jpg", ".jpeg")
    if not filename.endswith(supported_extensions):
        raise HTTPException(status_code=400, detail="Unsupported file type. Please upload PDF, PNG, JPG, or JPEG.")
    try:
        content = await file.read()
        extractor = get_extractor()
        extraction = extractor.extract_from_bytes(content, file.content_type or "", file.filename or "")
        text = extraction.raw_text

        if not text.strip():
            warning = extraction.warnings[0] if extraction.warnings else "Could not extract text from uploaded file."
            raise HTTPException(status_code=422, detail=warning)

        # Map gender string to M/F for the analyzer
        gender_code = "M" if gender.lower().startswith("m") else "F"

        logger.info(
            f"Analyzing file: {file.filename} (age={age}, gender={gender_code}, extraction={extraction.method_used})"
        )
        analyzer = get_analyzer()
        result = analyzer.analyze(text, age, gender_code, language)

        if "error" in result:
            status_code = int(result.get("error_status_code", 500))
            raw_error = (result.get("error") or "").strip() or "Analysis failed"
            if status_code == 503:
                detail = "Gemini is currently under high load. Please retry in a few moments."
            else:
                detail = raw_error
            raise HTTPException(status_code=status_code, detail=detail)

        if user_email:
            try:
                save_report(user_email, result)
            except Exception as db_err:
                logger.error(f"Failed to save report to DB: {db_err}")

        return result

    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"API Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/reports/{user_email}")
async def get_user_reports(user_email: str):
    try:
        reports = get_reports_by_user(user_email)
        return {"reports": reports}
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"DB Error getting reports: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/report/{report_id}")
async def get_single_report(report_id: str):
    try:
        report = get_report_by_id(report_id)
        if not report:
            raise HTTPException(status_code=404, detail="Report not found")
        return {"report": report}
    except Exception as e:
        if isinstance(e, HTTPException): raise e
        logger.error(f"DB Error getting report {report_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat")
async def chat_interaction(req: ChatRequest):
    try:
        chatbot = get_chat_manager()
        history_dicts = [{"role": msg.role, "content": msg.content} for msg in req.history]
        result = chatbot.chat(req.message, history_dicts, req.context)
        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])
        return {"reply": result["reply"]}
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Chat API Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

class ExportPDFRequest(BaseModel):
    analysis: dict
    patient_name: str = "Patient"
    age: int = 30
    gender: str = "M"

@app.post("/export/pdf")
async def export_pdf(req: ExportPDFRequest):
    try:
        pdf_bytes = generate_pdf(
            req.analysis,
            patient_name=req.patient_name,
            patient_age=req.age,
            patient_gender=req.gender,
        )
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": 'attachment; filename="MediSense_Report.pdf"'},
        )
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"PDF Export Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/analyze/pdf")
async def analyze_and_download_pdf(
    file: UploadFile = File(...),
    age: int = Form(...),
    gender: str = Form(...),
    patient_name: str = Form("Patient"),
    language: str = Form("en"),
    medications: Optional[str] = Form(None),
):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
    try:
        content = await file.read()
        pdf_reader = pypdf.PdfReader(io.BytesIO(content))
        text = "\n".join([page.extract_text() or "" for page in pdf_reader.pages])

        if not text.strip():
            raise HTTPException(status_code=422, detail="Could not extract text from PDF.")

        logger.info(f"Analyzing file for PDF report: {file.filename}")
        analyzer = get_analyzer()
        gender_code = "M" if gender.lower().startswith("m") else "F"
        analysis = analyzer.analyze(text, age, gender_code, language)

        if "error" in analysis:
            raise HTTPException(status_code=500, detail=analysis["error"])

        pdf_bytes = generate_pdf(
            analysis,
            patient_name=patient_name,
            patient_age=age,
            patient_gender=gender,
        )

        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": 'attachment; filename="MediSense_Report.pdf"'},
        )

    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"PDF Export Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/compare")
async def compare_reports(req: CompareRequest):
    try:
        report1 = get_report_by_id(req.report1_id)
        report2 = get_report_by_id(req.report2_id)
        
        if not report1 or not report2:
            raise HTTPException(status_code=404, detail="One or both reports not found")
            
        comparator = get_comparator()
        result = comparator.compare(report1, report2)
        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])
            
        return {"comparison": result, "report1": report1, "report2": report2}
        
    except Exception as e:
        if isinstance(e, HTTPException): raise e
        logger.error(f"Compare API Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

class ComparisonPDFRequest(BaseModel):
    report1: dict
    report2: dict
    comparison: dict

@app.post("/export/comparison-pdf")
async def export_comparison_pdf(req: ComparisonPDFRequest):
    try:
        pdf_bytes = generate_comparison_pdf(
            req.report1,
            req.report2,
            req.comparison,
        )
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": 'attachment; filename="MediSense_Comparison_Report.pdf"'},
        )
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Comparison PDF Export Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)