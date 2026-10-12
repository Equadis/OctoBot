from __future__ import annotations

import re
import unicodedata

# Every host Discord uses for invites. The code itself is the last path segment.
_INVITE_RE = re.compile(
    r"""
    (?:https?://)?                      # optional scheme
    (?:www\.)?                          # optional www
    (?:
        discord(?:app)?\.com/invite     # discord.com/invite/CODE
      | (?:ptb\.|canary\.)?discord\.gg  # discord.gg/CODE
      | discord\.me                     # legacy redirector
      | dsc\.gg                         # common invite shortener
      | invite\.gg
    )
    /+
    (?P<code>[A-Za-z0-9\-_]{2,64})      # the invite code or vanity name
    """,
    re.IGNORECASE | re.VERBOSE,
)

# Confusables people use to slip a link past a plain text match.
_CONFUSABLES = str.maketrans({
    "​": "",  # zero-width space
    "‌": "",
    "‍": "",
    "﻿": "",
    "（": "(",
    "）": ")",
    "［": "[",
    "］": "]",
})


def normalize_for_invites(text: str) -> str:
    """Fold the tricks that hide an invite from a literal match.

    Zero-width characters are dropped, full-width forms are folded by NFKC, and
    spacing around the dots and slashes is closed up, so "discord . gg / abc"
    and "discord​.gg/abc" both read as the plain link they are.
    """
    folded = unicodedata.normalize("NFKC", text or "").translate(_CONFUSABLES)
    # Close spaces that only exist to break the pattern: around dots and slashes.
    folded = re.sub(r"\s*([./])\s*", r"\1", folded)
    return folded


def find_invite_codes(text: str) -> list[str]:
    """Every Discord invite code in ``text``, in order, without duplicates."""
    codes: list[str] = []
    for match in _INVITE_RE.finditer(normalize_for_invites(text)):
        code = match.group("code")
        # "invite" is the path segment, not a code, when the URL is malformed.
        if code.casefold() == "invite":
            continue
        if code not in codes:
            codes.append(code)
    return codes


def contains_invite(text: str) -> bool:
    return bool(find_invite_codes(text))
