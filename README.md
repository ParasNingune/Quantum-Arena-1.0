# 🛡️ Sentinels: ClariMed AI

### 👥 Team Members
1. **Paras Ningune**
2. **Soham Mane**
3. **Siddhant Pote**

---

## 📝 Description
**ClariMed AI** is a cutting-edge health-tech solution designed to bridge the gap between complex medical data and patient understanding. By leveraging the power of **Google Gemini 3 Flash**, the application intelligently analyzes pathology lab reports (PDFs), extracts critical biomarkers, and translates them into a visually stunning, patient-friendly health summary.

Whether you're a patient trying to understand your blood work or a healthcare provider looking for a faster way to summarize data, ClariMed AI provides actionable insights, health scoring, and personalized lifestyle recommendations in seconds.

## ✨ Key Features

### 🖥️ Frontend (Next.js)
- **Modern UI/UX**: A sleek, responsive dashboard built with **Next.js** and **Tailwind CSS**.
- **Instant Uploads**: Easy-to-use interface for uploading medical PDFs.
- **Dynamic Dashboards**: Visualize your health score and biomarkers with interactive charts.
- **Real-time Results**: See your analysis as soon as the backend processes it.

### ⚙️ Backend (FastAPI & Gemini AI)
- **Deep Medical Analysis**: Uses **Gemini 3 Flash** to understand medical context beyond just numbers.
- **Smart Data Extraction**: Seamlessly parses text from PDF reports using `pypdf`.
- **Health Scoring System**: Generates a health score (0-100) based on clinical patterns.
- **Professional PDF Export**: Generates a high-quality, multi-page PDF report with graphical dials and clinical insights using `reportlab`.
- **Clinical Pattern Recognition**: Identifies relationships between different biomarkers (e.g., Vitamin D and Calcium).
- **Specialist Recommendations**: (Internal) Map-integrated clinical suggestions based on your report.

## Getting Started

### Prerequisites
- Python 3.10+
- An API Key for Gemini (`GEMINI_API_KEY`)

### Setup and Installation

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   # On Mac/Linux:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Set up Environment Variables:
   - Copy `.env.example` to `.env`.
   - Update `.env` with your `GEMINI_API_KEY`.

### Running the Server

Start the FastAPI application using `uvicorn`:
```bash
uvicorn main:app --reload --port 8000
```

Once running, the interactive API documentation (Swagger UI) is available at:
👉 **[http://localhost:8000/docs](http://localhost:8000/docs)**

## API Endpoints

### 1. JSON Analysis Core
`POST /analyze`
Accepts a patient's medical lab report as a PDF and returns the analysis in structured JSON.

**Request Form Data:**
- `file`: (File, required) The Medical report PDF.

**Returns:** JSON document detailing health score, summary, and individual biomarkers (normal, low, high).

### 2. Generate PDF Health Report
`POST /analyze/pdf`
Accepts a lab report and patient data, parses it, and dynamically generates a beautifully styled downloaded PDF Report.

**Request Form Data:**
- `file`: (File, required) The Medical report PDF.
- `age`: (Integer, required) Patient's age.
- `gender`: (String: 'M' or 'F', required) Patient's gender.
- `patient_name`: (String, optional) Defaults to "Patient".

**Returns:** An `application/pdf` file download.

## Project Structure

```text
backend/
├── main.py                 # FastAPI Application routes and setup
├── requirements.txt        # Python dependencies
├── .env                    # Environment variables (API Keys)
└── pipeline/
    ├── analyzer.py         # Google Gemini 3 Flash integration & prompts
    └── pdf_report.py       # Custom ReportLab PDF generator logic
```

## Technologies Used
* **[FastAPI](https://fastapi.tiangolo.com/)**: High-performance async web framework.
* **[Gemini 3 Flash](https://ai.google.dev/)**: Core Engine providing intelligent medical inference.
* **[ReportLab](https://pypi.org/project/reportlab/)**: Engine for laying out and designing actionable PDF reports.
* **[pyPDF](https://pypi.org/project/pypdf/)**: Pure-python library for PDF text extraction.
