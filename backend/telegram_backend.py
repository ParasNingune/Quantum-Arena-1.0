import io
import os
from dataclasses import dataclass, field
from typing import Dict, List, Optional

from dotenv import load_dotenv
from loguru import logger
from telegram import Update
from telegram.constants import ChatAction
from telegram.ext import (
    Application,
    CommandHandler,
    ContextTypes,
    MessageHandler,
    filters,
)

from database import get_reports_by_user, save_report
from pipeline.analyzer import get_analyzer
from pipeline.chatbot import get_chat_manager
from pipeline.ocr import get_extractor
from pipeline.pdf_report import generate_pdf

load_dotenv()


SUPPORTED_LANGUAGES = {"English", "Hindi", "Marathi", "Tamil", "Telugu", "Bengali"}


@dataclass
class TelegramSession:
    age: int = 30
    gender: str = "M"
    language: str = "English"
    patient_name: str = "Patient"
    patient_context: dict = field(default_factory=dict)
    latest_analysis: Optional[dict] = None
    latest_report_id: Optional[str] = None
    chat_history: List[dict] = field(default_factory=list)


class TelegramClariMedBackend:
    def __init__(self) -> None:
        self.sessions: Dict[int, TelegramSession] = {}

    def get_session(self, chat_id: int) -> TelegramSession:
        if chat_id not in self.sessions:
            self.sessions[chat_id] = TelegramSession()
        return self.sessions[chat_id]

    @staticmethod
    def storage_user(chat_id: int) -> str:
        return f"tg_{chat_id}@telegram.local"

    @staticmethod
    async def send_long_text(update: Update, text: str) -> None:
        if not update.effective_message:
            return
        chunk_size = 3500
        chunks = [text[i : i + chunk_size] for i in range(0, len(text), chunk_size)] or [text]
        for chunk in chunks:
            await update.effective_message.reply_text(chunk)

    async def start(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
        if not update.effective_chat:
            return
        chat_id = update.effective_chat.id
        self.get_session(chat_id)
        message = (
            "Welcome to ClariMed on Telegram.\n\n"
            "Upload a report (PDF/JPG/PNG) and I will analyze it.\n"
            "After analysis, send any question to chat about your report.\n\n"
            "Commands:\n"
            "/setage <number>\n"
            "/setgender <M/F>\n"
            "/setlang <English|Hindi|Marathi|Tamil|Telugu|Bengali>\n"
            "/setname <patient name>\n"
            "/status\n"
            "/reports\n"
            "/pdf\n"
            "/reset"
        )
        await update.message.reply_text(message)

    async def set_age(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
        if not update.effective_chat:
            return
        session = self.get_session(update.effective_chat.id)
        if not context.args:
            await update.message.reply_text("Usage: /setage <number>")
            return
        try:
            age = int(context.args[0])
            if age <= 0:
                raise ValueError
            session.age = age
            await update.message.reply_text(f"Age updated to {age}.")
        except ValueError:
            await update.message.reply_text("Please provide a valid positive age.")

    async def set_gender(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
        if not update.effective_chat:
            return
        session = self.get_session(update.effective_chat.id)
        if not context.args:
            await update.message.reply_text("Usage: /setgender <M/F>")
            return
        value = context.args[0].strip().upper()
        if value not in {"M", "F"}:
            await update.message.reply_text("Gender must be M or F.")
            return
        session.gender = value
        await update.message.reply_text(f"Gender updated to {value}.")

    async def set_language(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
        if not update.effective_chat:
            return
        session = self.get_session(update.effective_chat.id)
        if not context.args:
            await update.message.reply_text("Usage: /setlang <English|Hindi|Marathi|Tamil|Telugu|Bengali>")
            return
        value = " ".join(context.args).strip().title()
        if value not in SUPPORTED_LANGUAGES:
            await update.message.reply_text("Unsupported language. Use one of: English, Hindi, Marathi, Tamil, Telugu, Bengali.")
            return
        session.language = value
        await update.message.reply_text(f"Language updated to {value}.")

    async def set_name(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
        if not update.effective_chat:
            return
        session = self.get_session(update.effective_chat.id)
        value = " ".join(context.args).strip() if context.args else ""
        if not value:
            await update.message.reply_text("Usage: /setname <patient name>")
            return
        session.patient_name = value
        await update.message.reply_text(f"Patient name updated to {value}.")

    async def status(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
        if not update.effective_chat:
            return
        session = self.get_session(update.effective_chat.id)
        has_report = "yes" if session.latest_analysis else "no"
        message = (
            f"Current settings:\n"
            f"- Name: {session.patient_name}\n"
            f"- Age: {session.age}\n"
            f"- Gender: {session.gender}\n"
            f"- Language: {session.language}\n"
            f"- Latest report loaded: {has_report}"
        )
        await update.message.reply_text(message)

    async def reset(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
        if not update.effective_chat:
            return
        self.sessions[update.effective_chat.id] = TelegramSession()
        await update.message.reply_text("Session reset. Upload a report to begin again.")

    async def reports(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
        if not update.effective_chat:
            return
        storage_user = self.storage_user(update.effective_chat.id)
        reports = get_reports_by_user(storage_user)[:5]
        if not reports:
            await update.message.reply_text("No saved reports yet. Upload a report first.")
            return

        lines = ["Recent reports:"]
        for rep in reports:
            lines.append(
                f"- {rep.get('id', 'N/A')} | score: {rep.get('health_score', 'N/A')} | grade: {rep.get('health_grade', 'N/A')}"
            )
        await update.message.reply_text("\n".join(lines))

    async def send_pdf(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
        if not update.effective_chat or not update.effective_message:
            return
        session = self.get_session(update.effective_chat.id)
        if not session.latest_analysis:
            await update.message.reply_text("No analyzed report available. Upload a report first.")
            return

        try:
            pdf_bytes = generate_pdf(
                session.latest_analysis,
                patient_name=session.patient_name,
                patient_age=session.age,
                patient_gender=session.gender,
            )
            file_name = f"ClariMed_Report_{session.latest_report_id or 'latest'}.pdf"
            await update.effective_message.reply_document(document=io.BytesIO(pdf_bytes), filename=file_name)
        except Exception as exc:
            logger.error(f"Telegram PDF generation failed: {exc}")
            await update.message.reply_text("Failed to generate PDF. Please try again.")

    async def handle_report_upload(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
        if not update.effective_chat or not update.effective_message:
            return
        session = self.get_session(update.effective_chat.id)
        storage_user = self.storage_user(update.effective_chat.id)

        file_name = "upload.bin"
        content_type = "application/octet-stream"
        telegram_file = None

        if update.message.document:
            doc = update.message.document
            file_name = doc.file_name or "upload.bin"
            content_type = doc.mime_type or "application/octet-stream"
            telegram_file = await doc.get_file()
        elif update.message.photo:
            file_name = "photo.jpg"
            content_type = "image/jpeg"
            photo = update.message.photo[-1]
            telegram_file = await photo.get_file()

        if telegram_file is None:
            await update.message.reply_text("Please upload a PDF/JPG/PNG report.")
            return

        lowered = file_name.lower()
        if not (lowered.endswith(".pdf") or lowered.endswith(".png") or lowered.endswith(".jpg") or lowered.endswith(".jpeg") or content_type.startswith("image/")):
            await update.message.reply_text("Unsupported file. Please send PDF, JPG, JPEG, or PNG.")
            return

        await context.bot.send_chat_action(chat_id=update.effective_chat.id, action=ChatAction.TYPING)

        try:
            buffer = io.BytesIO()
            await telegram_file.download_to_memory(out=buffer)
            content = buffer.getvalue()

            extractor = get_extractor()
            extraction = extractor.extract_from_bytes(content, content_type, file_name)
            text = extraction.raw_text

            if not text.strip():
                warning = extraction.warnings[0] if extraction.warnings else "Could not extract text from uploaded file."
                await update.message.reply_text(f"Extraction failed: {warning}")
                return

            analyzer = get_analyzer()
            analysis = analyzer.analyze(
                text,
                session.age,
                session.gender,
                session.language,
                session.patient_context,
            )

            if "error" in analysis:
                await update.message.reply_text(f"Analysis failed: {analysis['error']}")
                return

            report_to_save = {
                **analysis,
                "patient_name": session.patient_name,
                "patient_age": session.age,
                "patient_gender": session.gender,
                "report_language": session.language,
                "patient_context": session.patient_context,
                "source_filename": file_name,
            }

            report_id = save_report(storage_user, report_to_save)
            session.latest_analysis = report_to_save
            session.latest_report_id = report_id
            session.chat_history = []

            summary = (
                f"Analysis complete.\n"
                f"- Report ID: {report_id}\n"
                f"- Health Score: {report_to_save.get('health_score', 'N/A')}\n"
                f"- Grade: {report_to_save.get('health_grade', 'N/A')}\n"
                f"- Summary: {report_to_save.get('health_summary', 'N/A')}\n\n"
                "You can now ask questions about this report, or use /pdf to download it."
            )
            await self.send_long_text(update, summary)

        except Exception as exc:
            logger.error(f"Telegram upload handler failed: {exc}")
            await update.message.reply_text("Something went wrong while analyzing the report. Please try again.")

    async def handle_chat_message(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
        if not update.effective_chat or not update.effective_message:
            return
        user_text = (update.message.text or "").strip()
        if not user_text:
            return

        session = self.get_session(update.effective_chat.id)
        if not session.latest_analysis:
            await update.message.reply_text("Please upload a report first so I can answer with your report context.")
            return

        await context.bot.send_chat_action(chat_id=update.effective_chat.id, action=ChatAction.TYPING)
        try:
            chat_manager = get_chat_manager()
            result = chat_manager.chat(user_text, session.chat_history, session.latest_analysis)
            if "error" in result:
                await update.message.reply_text(f"Chat failed: {result['error']}")
                return

            reply = result.get("reply", "I could not generate a reply.")
            session.chat_history.append({"role": "user", "content": user_text})
            session.chat_history.append({"role": "model", "content": reply})
            session.chat_history = session.chat_history[-20:]
            await self.send_long_text(update, reply)
        except Exception as exc:
            logger.error(f"Telegram chat handler failed: {exc}")
            await update.message.reply_text("Something went wrong while generating a response.")


def build_application() -> Application:
    token = os.getenv("TELEGRAM_BOT_TOKEN", "").strip()
    if not token:
        raise RuntimeError("TELEGRAM_BOT_TOKEN is not set in environment")

    backend = TelegramClariMedBackend()
    app = Application.builder().token(token).build()

    app.add_handler(CommandHandler("start", backend.start))
    app.add_handler(CommandHandler("help", backend.start))
    app.add_handler(CommandHandler("setage", backend.set_age))
    app.add_handler(CommandHandler("setgender", backend.set_gender))
    app.add_handler(CommandHandler("setlang", backend.set_language))
    app.add_handler(CommandHandler("setname", backend.set_name))
    app.add_handler(CommandHandler("status", backend.status))
    app.add_handler(CommandHandler("reports", backend.reports))
    app.add_handler(CommandHandler("pdf", backend.send_pdf))
    app.add_handler(CommandHandler("reset", backend.reset))

    app.add_handler(MessageHandler(filters.Document.ALL | filters.PHOTO, backend.handle_report_upload))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, backend.handle_chat_message))

    return app


def main() -> None:
    application = build_application()
    logger.info("Starting ClariMed Telegram backend (polling mode)")
    application.run_polling(close_loop=False)


if __name__ == "__main__":
    main()
