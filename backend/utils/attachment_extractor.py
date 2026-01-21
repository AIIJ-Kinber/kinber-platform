# backend/utils/attachment_extractor.py

import pdfplumber
from io import BytesIO
import logging

logger = logging.getLogger(__name__)


def extract_attachment_text(file_content: BytesIO) -> str:
    """
    Robust PDF text extraction supporting:
    - RTL / Arabic
    - Multi-page layouts
    - Safety guards
    """
    try:
        file_content.seek(0)
        text_parts = []

        with pdfplumber.open(file_content) as pdf:
            for page_num, page in enumerate(pdf.pages):
                try:
                    page_text = page.extract_text(
                        layout=True,
                        x_tolerance=3,
                        y_tolerance=3,
                    )
                    if page_text and page_text.strip():
                        text_parts.append(
                            f"--- Page {page_num + 1} ---\n{page_text}"
                        )
                except Exception as e:
                    logger.warning(
                        f"Failed to extract page {page_num + 1}: {e}"
                    )

        return "\n\n".join(text_parts).strip()

    except Exception as e:
        logger.error(f"Error extracting PDF text: {e}")
        return ""
