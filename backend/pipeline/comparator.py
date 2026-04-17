import os
import json
from loguru import logger
from google import genai
from google.genai import types

def get_comparator():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not configured")
    return Comparator(api_key)

class Comparator:
    def __init__(self, api_key: str):
        self.client = genai.Client(api_key=api_key)
        self.model = os.getenv("GEMINI_COMPARATOR_MODEL", "gemini-3.1-flash-lite-preview")
        self.system_prompt = """
You are a highly analytical Medical AI. The user has provided two medical test reports from different dates.
Your job is to compare the older report with the newer report.
Analyze the differences in their test values, health scores, and patterns.

You MUST structure your response as JSON matching this schema:
{
  "improved": ["List of markdown bullet points explaining what improved. Use distinct percentages or values if available."],
  "declined": ["List of markdown bullet points explaining what got worse or moved further from normal."],
  "next_steps": ["Actionable, clear medical recommendations based on the trajectory."]
}

Focus on clarity, clinical relevance, and use a supportive tone.
"""

    def compare(self, report1: dict, report2: dict) -> dict:
        try:
            # Sort by date
            date1 = report1.get("created_at", "")
            date2 = report2.get("created_at", "")
            
            if date1 and date2 and date1 > date2:
                older = report2
                newer = report1
            else:
                older = report1
                newer = report2

            payload = {
                "older_report": older,
                "newer_report": newer
            }

            prompt = f"Please compare these two reports and return the JSON response:\n\n{json.dumps(payload, indent=2)}"

            logger.info("Requesting comparative analysis from Gemini...")
            
            response = self.client.models.generate_content(
                model=self.model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=self.system_prompt,
                    response_mime_type="application/json",
                ),
            )
            
            return json.loads(response.text)
            
        except Exception as e:
            logger.error(f"Comparator Error: {str(e)}")
            return {"error": str(e)}
