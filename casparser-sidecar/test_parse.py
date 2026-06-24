"""Quick test script to verify /parse endpoint works inside the container."""
import urllib.request
import urllib.error

boundary = "----TestBoundary123"
parts = []
parts.append(f"--{boundary}")
parts.append('Content-Disposition: form-data; name="file"; filename="test.pdf"')
parts.append("Content-Type: application/pdf")
parts.append("")
parts.append("%PDF-1.4 fake content")
parts.append(f"--{boundary}")
parts.append('Content-Disposition: form-data; name="password"')
parts.append("")
parts.append("testpass")
parts.append(f"--{boundary}--")

body = "\r\n".join(parts).encode()

req = urllib.request.Request(
    "http://localhost:7070/parse",
    data=body,
    headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
    method="POST",
)
try:
    resp = urllib.request.urlopen(req)
    print("Status:", resp.status)
    print("Body:", resp.read().decode()[:500])
except urllib.error.HTTPError as e:
    print("Status:", e.code)
    print("Body:", e.read().decode()[:500])
