-- The OctoWoW website-wide census was historically stored as 'nzoth'.
-- Reattribute only official census readings, preserving their exact timestamps
-- and counts; leave independently verified realm-specific data unchanged.
INSERT OR IGNORE INTO readings (realm,timestamp_ms,online,source)
SELECT 'all',timestamp_ms,online,source
FROM readings WHERE realm='nzoth' AND source='official census';
DELETE FROM readings WHERE realm='nzoth' AND source='official census';
