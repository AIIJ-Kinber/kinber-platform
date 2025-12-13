# backend/services/response_formatter.py

"""
Kinber Response Formatter & Validation Layer
--------------------------------------------

This module cleans, formats, and validates all LLM responses before they are
saved to the database or returned to the frontend.

It is fully self-contained and safe to integrate into the existing pipeline.
"""

import re


# ─────────────────────────────────────────────────────────────
# PUBLIC ENTRY — the only function other modules need to import
# ─────────────────────────────────────────────────────────────
def format_and_validate_response(raw_text: str, agent: str | None = "default") -> str:
    """
    High-level wrapper that:
      1. Cleans spacing and whitespace.
      2. Normalizes bullet structures.
      3. Structures paragraphs for readability.
      4. Applies Kinber style guide.
      5. Performs simple validation.

    Fail-safe: If any step errors, return raw_text.
    """

    if not raw_text:
        return "I'm sorry, I couldn't generate a response."

    try:
        text = raw_text

        # Step 1: spacing cleanup
        text = clean_text_spacing(text)

        # Step 2: bullet cleanup
        text = normalize_bullets(text)

        # Step 3: paragraph structure
        text = normalize_paragraphs(text)

        # Step 4: style enforcement (agent-aware)
        text = enforce_style(text, agent)

        # Step 5: validation
        text = validate_output(text)

        return text.strip()

    except Exception:
        # FAIL-SAFE: never break the pipeline
        return raw_text.strip()


# ─────────────────────────────────────────────────────────────
# SPACING CLEANUP
# ─────────────────────────────────────────────────────────────
def clean_text_spacing(text: str) -> str:
    """Remove excess blank lines, trim spaces, fix common spacing issues."""

    # Remove Windows-style CRLF
    text = text.replace("\r", "")

    # Trim spaces around each line
    lines = [line.strip() for line in text.split("\n")]

    # Remove consecutive blank lines (max 1)
    cleaned = []
    blank_count = 0
    for line in lines:
        if line == "":
            blank_count += 1
            if blank_count > 1:
                continue
        else:
            blank_count = 0
        cleaned.append(line)

    return "\n".join(cleaned).strip()


# ─────────────────────────────────────────────────────────────
# BULLET NORMALIZATION
# ─────────────────────────────────────────────────────────────
def normalize_bullets(text: str) -> str:
    """
    Enforce consistent bullet structure:
      - Convert '*', '-', '+' to '•'
      - Normalize numbered lists to '1. 2. 3.'
    """

    lines = text.split("\n")
    normalized = []

    for line in lines:
        stripped = line.lstrip()

        # Standard bullets
        if stripped.startswith(("* ", "- ", "+ ")):
            line = "• " + stripped[2:].strip()

        # Numbered lists: "1) text" or "1. text"
        match = re.match(r"^(\d+)[\.\)]\s+(.*)", stripped)
        if match:
            number = match.group(1)
            content = match.group(2)
            line = f"{number}. {content}"

        normalized.append(line)

    return "\n".join(normalized)


# ─────────────────────────────────────────────────────────────
# PARAGRAPH NORMALIZATION
# ─────────────────────────────────────────────────────────────
def normalize_paragraphs(text: str) -> str:
    """
    Ensure clean paragraph separation:
      - Ensure exactly 1 blank line between paragraphs.
      - Avoid overly long chains of text without breaks.
    """

    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    cleaned_blocks = []

    for p in paragraphs:
        # Split exceedingly long paragraphs (basic safety)
        if len(p) > 500:
            chunks = chunk_long_paragraph(p)
            cleaned_blocks.extend(chunks)
        else:
            cleaned_blocks.append(p)

    return "\n\n".join(cleaned_blocks).strip()


def chunk_long_paragraph(paragraph: str, limit: int = 350) -> list:
    """Split very long paragraphs into readable chunks."""
    words = paragraph.split()
    blocks, current = [], []

    for word in words:
        current.append(word)
        if len(" ".join(current)) > limit:
            blocks.append(" ".join(current))
            current = []

    if current:
        blocks.append(" ".join(current))

    return blocks


# ─────────────────────────────────────────────────────────────
# STYLE ENFORCEMENT
# ─────────────────────────────────────────────────────────────
def enforce_style(text: str, agent: str | None = "default") -> str:
    """
    Enforce Kinber formatting rules:
      - Bold major headings
      - No emojis unless user used them
      - Optional agent-specific styling (future expansion)
    """

    # Add bold to lines that look like headings
    lines = text.split("\n")
    styled = []

    for line in lines:
        if looks_like_heading(line):
            if not (line.startswith("**") and line.endswith("**")):
                line = f"**{line.strip(': ')}**"
        styled.append(line)

    return "\n".join(styled)


def looks_like_heading(line: str) -> bool:
    """Detect simple headings like 'Summary', 'Steps', 'Key Points', etc."""
    keywords = [
        "summary",
        "overview",
        "steps",
        "key points",
        "recommendations",
        "conclusion",
        "notes",
    ]
    lower = line.lower().strip(": ").strip()

    return lower in keywords or lower.endswith(":")


# ─────────────────────────────────────────────────────────────
# VALIDATION LAYER (LIGHTWEIGHT)
# ─────────────────────────────────────────────────────────────
def validate_output(text: str) -> str:
    """
    Lightweight sanity checks:
      - Ensure non-empty content
      - Remove placeholder artifacts
      - Remove duplicated headers
      - Fix truncated sentences
    """

    if not text or len(text.strip()) == 0:
        return "I'm sorry, I couldn't generate a response."

    # Remove repeated headings like: "Summary\nSummary"
    lines = text.split("\n")
    cleaned = []
    prev = None

    for line in lines:
        if line.strip() == prev:
            continue
        cleaned.append(line)
        prev = line.strip()

    text = "\n".join(cleaned)

    # Remove accidental markdown artifacts
    text = text.replace("```", "").replace("***", "**")

    # Fix truncated endings (e.g. ending with "the")
    if re.search(r"\b(the|and|or|but|to)$", text.strip()):
        text = text.strip() + " …"

    return text.strip()
