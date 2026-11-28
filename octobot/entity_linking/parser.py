"""Find ``[type:name]`` references in a Discord message. Pure functions, bounded work."""
from __future__ import annotations

import re
import unicodedata

from .models import ENTITY_TYPES, Reference

MAX_SCAN_CHARS = 4000      # only the start of a message is scanned
MAX_QUERY_CHARS = 80       # longest accepted name
MAX_REFERENCES = 6         # distinct references considered per message
MAX_PREVIEWS = 3           # entity embeds shown per message

_TYPES = "|".join(sorted(ENTITY_TYPES, key=len, reverse=True))
_REFERENCE = re.compile(rf"\[\s*({_TYPES})\s*:\s*([^\[\]\r\n]{{1,{MAX_QUERY_CHARS}}}?)\s*\]", re.IGNORECASE)
_FENCE = re.compile(r"```.*?(?:```|\Z)", re.DOTALL)
_INLINE = re.compile(r"(`+)(?:(?!\1).)+?\1", re.DOTALL)
_APOSTROPHES = str.maketrans({c: "'" for c in "‘’‛ʼ′´`"})
_NON_WORD = re.compile(r"[^\w]+", re.UNICODE)


def strip_code(text: str) -> str:
    """Remove fenced and inline code so references inside it are ignored."""
    return _INLINE.sub(" ", _FENCE.sub(" ", text))


def normalize(text: str) -> str:
    """Case-, accent-, punctuation- and apostrophe-insensitive search form."""
    text = unicodedata.normalize("NFKD", text.translate(_APOSTROPHES))
    text = "".join(ch for ch in text if not unicodedata.combining(ch)).casefold()
    text = text.replace("'", "")
    return _NON_WORD.sub(" ", text.replace("_", " ")).strip()


def parse_references(content: str | None) -> list[Reference]:
    """Distinct, valid references in order of appearance (bounded)."""
    if not content or "[" not in content or ":" not in content:
        return []
    text = content[:MAX_SCAN_CHARS]
    if "`" in text:
        text = strip_code(text)
    found: list[Reference] = []
    seen: set[tuple[str, str]] = set()
    for match in _REFERENCE.finditer(text):
        kind = match.group(1).lower()
        query = " ".join(match.group(2).split())
        if not query or not normalize(query):
            continue
        if query.isdigit() and len(query) > 9:
            continue
        key = (kind, normalize(query))
        if key in seen:
            continue
        seen.add(key)
        found.append(Reference(kind, query))
        if len(found) >= MAX_REFERENCES:
            break
    return found
