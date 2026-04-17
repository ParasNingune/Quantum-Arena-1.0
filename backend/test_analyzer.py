import os
import sys
import logging

logging.basicConfig(level=logging.DEBUG)
from loguru import logger

logger.info("Initializing analyzer...")
from pipeline.analyzer import get_analyzer
analyzer = get_analyzer()
logger.info("Analyzer initialized. Calling analyze()...")

try:
    # Use a timeout context if possible, but requests are sync. We'll just wait.
    res = analyzer.analyze("Hemoglobin 10.2", 30, "M")
    logger.info("Returned from analyze()!")
    print(res)
except Exception as e:
    logger.exception("Error during analyze()")
