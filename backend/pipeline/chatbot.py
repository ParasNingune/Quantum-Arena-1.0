from google import genai
from google.genai import types
import os
import json
from loguru import logger
from dotenv import load_dotenv

load_dotenv()

CHAT_SYSTEM_PROMPT = """You are a friendly, warm, and helpful Medical Assistant.
You are helping a patient understand their recent blood test results.
Your tone should be comforting, supportive, and accessible (avoid overly dense medical jargon).
You have access to the patient's analysis context below.
Answer their questions based on the provided data, give general lifestyle/dietary advice, and explain the findings gently.
Always remind them that you are an AI, not a doctor, and they should confirm significant changes with their physician.
Keep your answers relatively concise, readable, and structured (use bullet points if helpful).

Patient Analysis Context:
{analysis_context}
"""

class ChatManager:
    def __init__(self):
        self.api_key = os.environ.get("GEMINI_API_KEY", "")
        self.client = genai.Client(api_key=self.api_key) if self.api_key else None
        self.model = os.environ.get("GEMINI_CHAT_MODEL", "").strip()
        if not self.model:
            raise RuntimeError("GEMINI_CHAT_MODEL is not set in environment")
        self.max_context_chars = int(os.environ.get("CHAT_CONTEXT_MAX_CHARS", "8000"))
        if self.client: logger.info("Gemini 3 Chat Engine Ready.")

    def chat(self, user_message: str, history: list, analysis_data: dict) -> dict:
        if not self.client: return {"error": "No API Key"}
        
        # Prepare a slimmed down context to save tokens, or just pass the whole dict
        context_str = json.dumps(analysis_data, indent=2)[: self.max_context_chars]

        prompt = CHAT_SYSTEM_PROMPT.format(analysis_context=context_str)

        # Build contents array
        # history should be in the format [{"role": "user"/"model", "content": "..."}]
        contents = []
        for msg in history:
            role = "user" if msg.get("role") == "user" else "model"
            contents.append(
                types.Content(role=role, parts=[types.Part.from_text(text=msg.get("content", ""))])
            )
        
        # Add the latest user message
        contents.append(
            types.Content(role="user", parts=[types.Part.from_text(text=user_message)])
        )

        try:
            response = self.client.models.generate_content(
                model=self.model,
                contents=contents,
                config=types.GenerateContentConfig(
                    system_instruction=prompt,
                    temperature=0.7,
                )
            )
            return {"reply": response.text}

        except Exception as e:
            logger.error(f"Chatbot failed: {e}")
            return {"error": str(e)}

_CHAT_INSTANCE = None
def get_chat_manager():
    global _CHAT_INSTANCE
    if _CHAT_INSTANCE is None: _CHAT_INSTANCE = ChatManager()
    return _CHAT_INSTANCE
