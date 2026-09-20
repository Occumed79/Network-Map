import re
from urllib.parse import urlparse


def wayback_snapshot_url(source_url, timestamp):
    if not re.fullmatch(r"\d{14}", str(timestamp or "")):
        return ""
    parsed = urlparse(str(source_url or ""))
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        return ""
    return f"https://web.archive.org/web/{timestamp}id_/{source_url}"
