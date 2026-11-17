# Read-only export of all retained raid history from production D1, with pagination.
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$tmp = Join-Path ([IO.Path]::GetTempPath()) ('octo-raid-audit-' + [Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $tmp | Out-Null
Push-Location $root
try {
  $cursor = 0
  $page = 0
  $files = @()
  while ($true) {
    $sql = "SELECT id,type,realm,observed_at,payload_json FROM metric_events WHERE type IN ('raid_sessions','raid_session_ended','raid_session_revision') AND id > $cursor ORDER BY id LIMIT 1000"
    $raw = & npx wrangler d1 execute octometrics --remote --config .\wrangler.metrics.toml --command $sql --json
    if ($LASTEXITCODE -ne 0) { throw "Wrangler export failed at ID $cursor" }
    $data = ($raw -join "`n") | ConvertFrom-Json
    $rows = @($data | ForEach-Object { $_.results } | Where-Object { $null -ne $_ })
    if ($rows.Count -eq 0) { break }
    $page++
    $path = Join-Path $tmp ("page-$page.json")
    ($raw -join "`n") | Set-Content -Path $path -Encoding UTF8
    $files += $path
    $next = [long]$rows[-1].id
    if ($next -le $cursor) { throw 'Pagination did not advance' }
    $cursor = $next
    if ($rows.Count -lt 1000) { break }
  }
  if ($files.Count -eq 0) { Write-Output '[]'; return }
  & node cloudflare/octometrics/audit-raid-history.mjs @files
  if ($LASTEXITCODE -ne 0) { throw 'History reconciliation failed' }
} finally {
  Pop-Location
  Remove-Item -Path $tmp -Recurse -Force
}
