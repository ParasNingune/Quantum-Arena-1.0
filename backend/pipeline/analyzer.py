from __future__ import annotations
import json
import os
from loguru import logger
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

SYSTEM_PROMPT = """You are a Senior Medical Consultant specializing in Clinical Pathology and Patient Communication.
Your task is to transform a raw medical report into a high-literacy, professional "Patient Health Blueprint".
Maintain a professional, authoritative, yet reassuring tone.
Return ONLY a valid JSON object. Do not include markdown formatting like ```json."""

ANALYSIS_PROMPT = """Analyze this lab report for a {age} year old {gender_full} patient.

Output language requirement:
- Write ALL user-facing content in {language}.
- Keep JSON keys exactly in English as provided in the schema.
- Translate values like health_summary, doctors_narrative, explanations, pattern text, doctor questions, dietary notes, activity prescription, and curated resource titles into {language}.

JSON Structure Requirements:
{{
  "health_score": 0,
  "health_grade": "Excellent/Good/Fair/Poor",
  "health_summary": "Short 1-2 sentence intro summary.",
  "doctors_narrative": "A professional causal analysis explaining 'what is what' and 'what leads to what'. MUST be formatted as a cleanly spaced markdown bulleted list using '- ' for each point.",
  "tests": [
    {{
      "test_name": "Name",
      "value": "Value",
      "unit": "Clean string representation of unit (e.g., mg/dL, 10^9/L, mmol/L)",
      "status": "normal/high/low/critical_high/critical_low",
      "reference_range": "Normal range",
      "deviation_pct": 0.0,
      "explanation": "Jargon-checked explanation. Explain complex terms with analogies (e.g., 'Think of eGFR as the speed limit').",
      "category": "Category",
      "severity": "normal/mild/moderate/critical",
      "gauge_position": 0.5
    }}
  ],
  "patterns": [
    {{
      "name": "Clinical Pattern name (e.g., Metabolic Syndrome, Iron Deficiency Anemia)",
      "confidence": 0.0,
      "urgency": "low/moderate/high",
      "severity": "mild/moderate/moderate-severe/severe",
      "explanation": "Describe how these specific test values interact to suggest this pattern.",
      "symptoms": ["Specific symptoms to watch for"],
      "doctor_questions": ["High-quality questions to ask a specialist about this"],
      "dietary_note": "A specific dietary recommendation for this pattern.",
      "icd10": "Related ICD-10 code string",
      "matched_tests": ["List of test names from above that triggered this pattern"]
    }}
  ],
  "path_to_normal": {{
    "dietary_swaps": ["Direct replacements (e.g., 'Replace red meat with plant-based proteins to reduce kidney load')"],
    "activity_prescription": "Specific exercise type recommendations based on findings."
  }},
  "curated_resources": {{
    "youtube": [{{"title": "Title (e.g. Mayo Clinic: Understanding Cholesterol)", "url": "Actual or constructed search url"}}],
    "articles": [
      {{"title": "Accurate Article Title from Reputable Source (e.g. American Heart Association)", "url": "Actual URL for a relevant health article"}}
    ]
  }},
  "recommended_specialists": [
    {{
      "specialty": "Specialist Type (e.g., Cardiologist, Endocrinologist)",
      "emoji": "🫀",
      "reason": "Clear explanation of why this specialist is needed (e.g., 'To evaluate elevated Lipid levels and heart health').",
      "maps_query": "Specialist Type near me"
    }}
  ]
}}

REPORT: {report_text}"""

class MedicalAnalyzer:
  def __init__(self):
    self.api_key = os.environ.get("GEMINI_API_KEY", "")
    self.client = genai.Client(api_key=self.api_key) if self.api_key else None
    self.model = os.environ.get("GEMINI_ANALYZER_MODEL", "").strip()
    if not self.model:
      raise RuntimeError("GEMINI_ANALYZER_MODEL is not set in environment")
    self.max_report_chars = int(os.environ.get("ANALYZER_MAX_REPORT_CHARS", "20000"))
    if self.client:
      logger.info("Gemini 3 Medical Engine Ready.")

  def _extract_status_code(self, error_text: str) -> int:
    if "429" in error_text:
      return 429
    if "503" in error_text or "UNAVAILABLE" in error_text:
      return 503
    if "504" in error_text:
      return 504
    return 500

  def analyze(self, report_text: str, age: int, gender: str, language: str = "English") -> dict:
    if not self.client:
      return {"error": "No API Key", "error_status_code": 500}

    prompt = ANALYSIS_PROMPT.format(
      age=age,
      gender_full="Male" if gender == "M" else "Female",
      language=language,
      report_text=report_text[: self.max_report_chars]
    )

    try:
      response = self.client.models.generate_content(
        model=self.model,
        contents=prompt,
        config=types.GenerateContentConfig(
          system_instruction=SYSTEM_PROMPT,
          response_mime_type="application/json",
          temperature=0.1
        )
      )

      data = json.loads(response.text)
      return data[0] if isinstance(data, list) else data

    except Exception as e:
      error_text = (str(e) or repr(e)).strip()
      if not error_text:
        error_text = "Unknown Gemini analysis error"
      logger.error(f"Analysis Failed: {error_text}")
      return {
        "error": error_text,
        "error_status_code": self._extract_status_code(error_text),
        "error_type": "analysis_failed",
      }

_INSTANCE = None
def get_analyzer():
    global _INSTANCE
    if _INSTANCE is None: _INSTANCE = MedicalAnalyzer()
    return _INSTANCE
