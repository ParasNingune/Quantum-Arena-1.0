import requests

url = "http://127.0.0.1:8000/analyze"
file_path = "dummy.pdf"

with open(file_path, "wb") as f:
    f.write(b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 47 >>\nstream\nBT\n/F1 12 Tf\n72 712 Td\n(Hemoglobin 14.2 g/dL) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000216 00000 n \ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n314\n%%EOF\n")

print("Sending request...")
response = requests.post(
    url,
    files={"file": ("dummy.pdf", open(file_path, "rb"), "application/pdf")},
    data={"age": 30, "gender": "Male", "language": "English"}
)

print(f"Status: {response.status_code}")
if response.status_code == 200:
    print("Success. Summary of response keys:")
    import json
    try:
        data = response.json()
        print(data.keys())
    except Exception as e:
        print("JSON Error", e)
else:
    print(response.text)
