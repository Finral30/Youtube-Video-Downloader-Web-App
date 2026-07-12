"""
utils/filename.py
-----------------
Filename sanitization and unique path generation.
"""

import os
import re


def sanitize_filename(name: str, max_length: int = 200) -> str:
    """Remove characters illegal in file names on Windows/macOS/Linux."""
    # Replace illegal characters with underscores
    sanitized = re.sub(r'[<>:"/\\|?*\x00-\x1f]', "_", name)
    # Collapse multiple spaces/underscores
    sanitized = re.sub(r"[ _]{2,}", " ", sanitized).strip(". ")
    return sanitized[:max_length] or "download"


def unique_filepath(directory: str, filename: str) -> str:
    """Return a filepath that does not yet exist, appending (1), (2)… as needed."""
    base, ext = os.path.splitext(filename)
    candidate = os.path.join(directory, filename)
    counter = 1
    while os.path.exists(candidate):
        candidate = os.path.join(directory, f"{base} ({counter}){ext}")
        counter += 1
    return candidate
