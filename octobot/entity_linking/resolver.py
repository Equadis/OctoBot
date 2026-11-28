"""Turn a ``Reference`` into an entity, an ambiguity list, or nothing. No Discord imports.

Matching priority (first tier with hits wins):
  1 numeric id   2 exact name (case-insensitive)   3 normalised exact name   4 configured alias
  5 head phrase ("Thunderfury" for "Thunderfury, Blessed Blade...")   6 prefix
  7 partial (substring)   8 fuzzy spelling

Several plausible entities never auto-resolve: they come back as ``ambiguous`` so a person chooses.
"""
from __future__ import annotations

import difflib
import logging
import re
import threading
from collections import OrderedDict

from .database import EntityDatabase
from .models import Entity, Reference, Resolution
from .parser import normalize

log = logging.getLogger(__name__)
MAX_CHOICES = 25            # Discord select-menu limit
MIN_PARTIAL_CHARS = 3
MIN_FUZZY_CHARS = 5
FUZZY_ACCEPT = 0.84         # minimum similarity for a spelling match
FUZZY_MARGIN = 0.06         # lead the best fuzzy match needs over the runner-up to auto-resolve
CACHE_SIZE = 512
_RANK_SUFFIX = re.compile(r"^(?P<base>.*?)[\s,(\-]*\brank\s*(?P<rank>\d{1,2})\)?\s*$", re.IGNORECASE)


class Resolver:
    def __init__(self, database: EntityDatabase):
        self.db = database
        self._cache: OrderedDict[tuple[str, str], Resolution] = OrderedDict()
        self._cache_lock = threading.Lock()       # lookups run in worker threads
        self._cache_identity: object = None

    # ------------------------------------------------------------------ public
    def resolve(self, reference: Reference) -> Resolution:
        identity = self.db._identity
        key = (reference.type, normalize(reference.query))
        with self._cache_lock:
            if identity != self._cache_identity:
                self._cache.clear()
            hit = self._cache.get(key)
            if hit is not None:
                self._cache.move_to_end(key)
                return hit
        result = self._resolve(reference)
        if result.status != "resolved":
            result = self._apply_rank(reference, result)
        with self._cache_lock:
            self._cache_identity = self.db._identity
            self._cache[key] = result
            if len(self._cache) > CACHE_SIZE:
                self._cache.popitem(last=False)
        return result

    def get(self, kind: str, ref: int) -> Entity | None:
        found = self.db.by_ref(kind, ref)
        return found[0] if found else None

    def _apply_rank(self, reference: Reference, result: Resolution) -> Resolution:
        """``[spell:Name Rank 2]`` / ``[spell:Name (Rank 2)]`` selects one rank of a spell."""
        match = _RANK_SUFFIX.match(reference.query.strip())
        if not match or not match["base"].strip():
            return result
        base = self._resolve(Reference(reference.type, match["base"].strip()))
        wanted = f"Rank {int(match['rank'])}"
        pool = [base.entity] if base.entity else list(base.candidates)
        ranked = [e for e in pool if e.rank == wanted]
        if len(ranked) == 1:
            return Resolution("resolved", ranked[0], (), "rank")
        if len(ranked) > 1:
            return Resolution("ambiguous", None, tuple(ranked[:MAX_CHOICES]), "rank")
        return result

    # ------------------------------------------------------------------ tiers
    def _resolve(self, reference: Reference) -> Resolution:
        kind, query = reference.type, reference.query.strip()
        norm = normalize(query)
        if reference.is_id:
            return self._decide(self.db.by_ref(kind, int(query)), "id")
        if not norm:
            return Resolution("none")
        for tier, finder in (
            ("exact", lambda: self.db.by_name(kind, query)),
            ("normalised", lambda: self.db.by_norm(kind, norm)),
            ("alias", lambda: self.db.by_alias(kind, norm)),
            ("head", lambda: self.db.by_head(kind, norm)),
        ):
            hits = finder()
            if hits:
                return self._decide(hits, tier)
        prefix = self.db.by_prefix(kind, norm)
        if prefix:
            return self._decide(prefix, "prefix")
        if len(norm) >= MIN_PARTIAL_CHARS:
            partial = self.db.by_substring(kind, norm)
            if partial:
                return self._decide(partial, "partial")
        if len(norm) >= MIN_FUZZY_CHARS:
            return self._fuzzy(kind, norm)
        return Resolution("none")

    @staticmethod
    def _decide(hits: list[Entity], tier: str) -> Resolution:
        unique = list({e.key: e for e in hits}.values())
        if not unique:
            return Resolution("none")
        if len(unique) == 1:
            return Resolution("resolved", unique[0], (), tier)
        return Resolution("ambiguous", None, tuple(unique[:MAX_CHOICES]), tier)

    def _fuzzy(self, kind: str, norm: str) -> Resolution:
        scored: list[tuple[float, Entity]] = []
        matcher = difflib.SequenceMatcher(autojunk=False)
        matcher.set_seq2(norm)
        for entity in self.db.fuzzy_candidates(kind, norm):
            best = 0.0
            candidate_norm = self._candidate_norm(entity)
            # Compare against the whole name and against each leading run of words, so a
            # misspelt short form ("thunderfurry") matches "thunderfury blessed blade ...".
            words = candidate_norm.split()
            spans = {candidate_norm} | {" ".join(words[:n]) for n in range(1, min(len(words), 4) + 1)}
            for span in spans:
                if abs(len(span) - len(norm)) > max(3, len(norm) // 3):
                    continue
                matcher.set_seq1(span)
                if matcher.real_quick_ratio() < FUZZY_ACCEPT or matcher.quick_ratio() < FUZZY_ACCEPT:
                    continue
                best = max(best, matcher.ratio())
            if best >= FUZZY_ACCEPT:
                scored.append((best, entity))
        if not scored:
            return Resolution("none")
        scored.sort(key=lambda pair: (-pair[0], -(pair[1].quality or 0), -(pair[1].level or 0), pair[1].name))
        top = scored[0][0]
        close = [e for s, e in scored if top - s < FUZZY_MARGIN]
        if len(close) == 1:
            return Resolution("resolved", close[0], (), "fuzzy")
        return Resolution("ambiguous", None, tuple(close[:MAX_CHOICES]), "fuzzy")

    @staticmethod
    def _candidate_norm(entity: Entity) -> str:
        return normalize(entity.name)
