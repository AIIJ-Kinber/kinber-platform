import os
import requests
from PyPDF2 import PdfReader
from docx import Document
from io import BytesIO
import mimetypes
import pytesseract
from PIL import Image
import tempfile
from pdf2image import convert_from_bytes   # for scanned PDFs

# Detect Poppler Path (Windows)
POPPLER_PATH = os.getenv("POPPLER_PATH", r"C:\Program Files\Tesseract-OCR")

def extract_attachment_text(url_or_path: str) -> str:
    """
    Extract readable text from attachments (PDF, DOCX, TXT, or image).
    Fully supports:
      - scanned PDFs (OCR using Tesseract)
      - text-layer PDFs
      - DOCX
      - TXT files
      - images (PNG/JPG)
    """
    try:
        print(f"📂 Extracting from: {url_or_path}")

        # ─────────────────────────────────────────────
        # STEP 1 — Load file bytes
        # ─────────────────────────────────────────────
        if url_or_path.lower().startswith("http"):
            print(f"📥 Downloading from remote URL: {url_or_path}")
            res = requests.get(url_or_path, timeout=30)
            res.raise_for_status()
            file_bytes = BytesIO(res.content)
            mime_type = res.headers.get("content-type") or mimetypes.guess_type(url_or_path)[0]
        else:
            with open(url_or_path, "rb") as f:
                file_bytes = BytesIO(f.read())
            mime_type = mimetypes.guess_type(url_or_path)[0]

        if not mime_type:
            mime_type = "application/octet-stream"

        extracted_text = ""

        # ─────────────────────────────────────────────
        # STEP 2 — PDF extraction (text-layer + fallback OCR)
        # ─────────────────────────────────────────────
        if mime_type == "application/pdf" or url_or_path.lower().endswith(".pdf"):
            try:
                reader = PdfReader(file_bytes)
                text_layer = "\n".join([(p.extract_text() or "") for p in reader.pages])
                extracted_text = text_layer.strip()

                print(f"📘 PDF text layer extracted: {len(extracted_text)} chars")

                # If PDF has no text → scanned PDF → run OCR
                if len(extracted_text) < 10:
                    print("📄 PDF contains little/no text → running OCR on each page...")

                    pdf_bytes = file_bytes.getvalue()

                    pages = convert_from_bytes(
                        pdf_bytes,
                        dpi=300,
                        poppler_path=POPPLER_PATH  # Windows fix
                    )

                    ocr_text = ""

                    for i, page in enumerate(pages):
                        print(f"🔍 OCR on PDF page {i+1}/{len(pages)}")
                        try:
                            page_text = pytesseract.image_to_string(
                                page,
                                lang="ara+eng"
                            )
                            ocr_text += f"\n\n--- OCR Page {i+1} ---\n{page_text}"
                        except Exception as e:
                            print(f"⚠️ OCR failed on page {i+1}: {e}")

                    extracted_text = ocr_text

            except Exception as e:
                print(f"⚠️ PDF extraction error: {e}")

        # ─────────────────────────────────────────────
        # STEP 3 — DOCX extraction
        # ─────────────────────────────────────────────
        elif (
            mime_type in ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"]
            or url_or_path.lower().endswith(".docx")
        ):
            try:
                doc = Document(file_bytes)
                extracted_text = "\n".join([para.text for para in doc.paragraphs])
                print(f"📄 Extracted {len(extracted_text)} chars from DOCX.")
            except Exception as e:
                print(f"⚠️ DOCX extraction error: {e}")

        # ─────────────────────────────────────────────
        # STEP 4 — TXT extraction
        # ─────────────────────────────────────────────
        elif mime_type.startswith("text") or url_or_path.lower().endswith(".txt"):
            try:
                extracted_text = file_bytes.read().decode("utf-8", errors="ignore")
                print(f"📄 Extracted {len(extracted_text)} chars from TXT.")
            except Exception as e:
                print(f"⚠️ TXT extraction error: {e}")

        # ─────────────────────────────────────────────
        # STEP 5 — Image OCR extraction
        # ─────────────────────────────────────────────
        elif mime_type.startswith("image"):
            try:
                with tempfile.NamedTemporaryFile(suffix=".png") as tmp:
                    tmp.write(file_bytes.getvalue())
                    tmp.flush()
                    img = Image.open(tmp.name)
                    extracted_text = pytesseract.image_to_string(img, lang="ara+eng")
                    print(f"🖼️ OCR extracted {len(extracted_text)} chars from image.")
            except Exception as e:
                print(f"⚠️ OCR image extraction error: {e}")

        else:
            print(f"⚠️ Unsupported file type: {mime_type}")
            return ""

        # ─────────────────────────────────────────────
        # STEP 6 — Clean & return
        # ─────────────────────────────────────────────
        clean_text = extracted_text.strip().replace("\x00", "")[:15000]
        if not clean_text:
            print("⚠️ No readable text found in file.")
        return clean_text

    except Exception as e:
        print(f"❌ extract_attachment_text failed: {e}")
        return ""
