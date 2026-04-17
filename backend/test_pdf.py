import sys
import os

# Ensure backend folder is in sys path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__))))

from pipeline.pdf_report import generate_pdf_file

def main():
    mock_analysis = {
        "health_score": 75,
        "health_grade": "Fair",
        "health_summary": "Overall your health is fair, but you have key indicators that require immediate attention.",
        "doctors_narrative": "There is a notable interaction between your elevated fasting glucose and high triglycerides, suggesting an increased risk of early metabolic syndrome. Your LDL is borderline high. However, organ functions (liver, kidneys) appear entirely normal.",
        "tests": [
            {
                "test_name": "Hemoglobin",
                "value": "13.2",
                "unit": "g/dL",
                "status": "normal",
                "reference_range": "13.5 - 17.5",
                "deviation_pct": 0,
                "explanation": "Normal oxygen-carrying capacity in the blood.",
                "category": "Complete Blood Count",
                "severity": "normal",
                "gauge_position": 0.45
            },
            {
                "test_name": "Fasting Glucose",
                "value": "115",
                "unit": "mg/dL",
                "status": "high",
                "reference_range": "70 - 99",
                "deviation_pct": 16.2,
                "explanation": "Elevated blood sugar. Indicates prediabetes.",
                "category": "Metabolic",
                "severity": "moderate",
                "gauge_position": 0.85
            },
            {
                "test_name": "Triglycerides",
                "value": "210",
                "unit": "mg/dL",
                "status": "high",
                "reference_range": "< 150",
                "deviation_pct": 40.0,
                "explanation": "High fat levels in the blood, often associated with sugary diets and low activity.",
                "category": "Lipids",
                "severity": "moderate",
                "gauge": "[ - - - - * H ]"
            }
        ],
        "path_to_normal": {
            "dietary_swaps": [
                "Swap sugary sodas with sparkling water or unsweetened tea.",
                "Replace white rice/bread with quinoa or whole wheat alternatives.",
                "Incorporate more omega-3 rich fish instead of red meat to tackle triglycerides."
            ],
            "activity_prescription": "Aim for at least 30 minutes of brisk walking 5 days a week. Add 2 days of light resistance training (e.g., bodyweight squats, pushups) to improve muscle glucose uptake."
        },
        "curated_resources": {
            "youtube": [
                {"title": "Mayo Clinic: Understanding Prediabetes", "url": "https://youtube.com/watch?v=mock1"},
                {"title": "AHA: Triglycerides Explained", "url": "https://youtube.com/watch?v=mock2"}
            ],
            "articles": [
                {"title": "NIDDK: Reversing Metabolic Syndrome", "url": "https://nih.gov/mock3"}
            ]
        }
    }
    
    out_path = "test_output.pdf"
    generate_pdf_file(mock_analysis, out_path, "John Doe", 45, "M")
    print(f"Generated {out_path} successfully!")

if __name__ == '__main__':
    main()
