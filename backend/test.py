import os, sys, time, io
from dotenv import load_dotenv

print("\n" + "="*50)
print("🚀 CLARIMED — ROBUST TEST")
print("="*50)

load_dotenv()

try:
    import pypdf
    from pipeline.analyzer import get_analyzer
    
    pdf_path = sys.argv[1]
    with open(pdf_path, "rb") as f:
        reader = pypdf.PdfReader(io.BytesIO(f.read()))
        text = "\n".join([p.extract_text() or "" for p in reader.pages])
    
    print("🤖 Calling AI...")
    result = get_analyzer().analyze(text, 41, "M", [])
    
    if isinstance(result, dict) and "error" not in result:
        print(f"✅ SUCCESS! Health Score: {result.get('health_score')}")
        print(f"📝 Summary: {str(result.get('health_summary'))[:100]}...")
    else:
        print(f"❌ FAILED! Result was a {type(result)}: {result}")

except Exception as e:
    print(f"❌ SYSTEM CRASH: {e}")

print("="*50 + "\n")
