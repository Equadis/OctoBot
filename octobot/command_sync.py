"""Persist Discord command schema state alongside the bot database."""
from __future__ import annotations

import hashlib
import json
import logging

log = logging.getLogger(__name__)


async def sync_commands(tree, database, application_id, guild, *, force=False, api=None):
    prefix = f"discord_commands:{application_id}"
    migration = f"{prefix}:global_cleanup_v1"
    tree.clear_commands(guild=None)
    if await database.get_metadata(migration) != "done":
        if api is None:
            await tree.sync()
        else:
            await api.call("command_sync", application_id, tree.sync)
        await database.set_metadata(migration, "done")
        log.info("Discord commands scope=global action=legacy_cleanup")
    commands = tree.get_commands(guild=guild)
    schema = [command.to_dict(tree) for command in commands]
    schema.sort(key=lambda item: (item.get("type", 1), item["name"]))
    fingerprint = hashlib.sha256(json.dumps(schema, sort_keys=True).encode()).hexdigest()
    key = f"{prefix}:guild:{guild.id}"
    if not force and await database.get_metadata(key) == fingerprint:
        log.info("Discord commands scope=guild action=unchanged guild=%d", guild.id)
        return
    if api is None:
        synced = await tree.sync(guild=guild)
    else:
        synced = await api.call("command_sync", guild.id, lambda: tree.sync(guild=guild))
    await database.set_metadata(key, fingerprint)
    log.info("Discord commands scope=guild action=synced guild=%d count=%d", guild.id, len(synced))
