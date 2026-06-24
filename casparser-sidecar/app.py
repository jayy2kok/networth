"""
CAS Parser Sidecar
------------------
Minimal FastAPI microservice that wraps the `casparser` library.
Called by the Java backend to parse CAS PDF files from CAMS / KFintech.

Endpoint:
  POST /parse  — multipart/form-data with `file` (PDF) + `password` (string)
  GET  /health — liveness probe
"""

import io
import json
import logging
from fastapi import FastAPI, File, Form, UploadFile, HTTPException
from fastapi.responses import JSONResponse
import casparser

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("casparser-sidecar")

app = FastAPI(title="CAS Parser Sidecar", version="1.0.0")


@app.middleware("http")
async def log_requests(request, call_next):
    if request.url.path == "/parse":
        ct = request.headers.get("content-type", "MISSING")
        logger.info("Incoming POST /parse — Content-Type: %s", ct)
    response = await call_next(request)
    return response


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/parse")
async def parse_cas(
    file: UploadFile = File(..., description="CAS PDF file from CAMS or KFintech"),
    password: str = Form(..., description="PDF password (typically PAN number)"),
):
    """
    Parse a CAS PDF and return the full JSON payload produced by casparser.

    Returns 400 if the PDF is invalid, the password is wrong, or the format
    is not supported.  All other errors surface as 500.
    """
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    content = await file.read()
    if len(content) > 20 * 1024 * 1024:  # 20 MB guard
        raise HTTPException(status_code=400, detail="File too large (max 20 MB)")

    logger.info("Parsing CAS PDF: filename=%s size=%d bytes", file.filename, len(content))

    try:
        pdf_stream = io.BytesIO(content)
        # casparser.read_cas_pdf with output="json" returns a JSON string
        raw = casparser.read_cas_pdf(pdf_stream, password, output="json")
        data = json.loads(raw) if isinstance(raw, str) else raw
        logger.info("Parse successful: file_type=%s", data.get("file_type", "UNKNOWN"))
        return JSONResponse(content=data)

    except casparser.exceptions.CASParseError as exc:
        logger.warning("CASParseError: %s", exc)
        raise HTTPException(status_code=400, detail=f"Failed to parse CAS: {exc}")

    except Exception as exc:  # noqa: BLE001
        logger.error("Unexpected error parsing CAS: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal error: {exc}")
