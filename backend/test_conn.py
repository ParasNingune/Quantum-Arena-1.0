import requests
import traceback

print("Testing connection to Gemini endpoint...")
try:
    res = requests.get("https://generativelanguage.googleapis.com/v1beta/models", timeout=5)
    print("Status:", res.status_code)
except Exception as e:
    print("Exception:")
    traceback.print_exc()
