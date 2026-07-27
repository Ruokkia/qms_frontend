param(
  [Parameter(Mandatory = $true)][string]$Token,
  [string]$BaseUrl = 'http://127.0.0.1:8081'
)

$ErrorActionPreference = 'Stop'
$headers = @{ Authorization = "Bearer $Token"; 'Content-Type' = 'application/json' }
function Invoke-Trace([string]$Method, [string]$Path, $Body = $null) {
  $args = @{ Method = $Method; Uri = "$BaseUrl$Path"; Headers = $headers; UseBasicParsing = $true }
  if ($null -ne $Body) { $args.Body = ($Body | ConvertTo-Json -Compress) }
  $result = Invoke-WebRequest @args | ConvertFrom-Json
  if ($result.code -ne 0) { throw "API failed: $Path $($result.message)" }
  return $result.data
}

$summary = Invoke-Trace GET '/api/v2/incoming-trace/summary'
if ($summary.totalNodes -lt 10) { throw 'Seed data is missing' }

$down = Invoke-Trace GET '/api/v2/incoming-trace/tree?rootBarcode=FG-A100&direction=DOWN'
if ($down.root.children.Count -lt 2) { throw 'FG-A100 tree is incomplete' }

$impact = Invoke-Trace GET '/api/v2/incoming-trace/tree?rootBarcode=LOT-20260721&direction=BATCH_IMPACT'
if ($impact.root.children.Count -lt 2) { throw 'Batch impact fan-out is incomplete' }

$barcode = "MAT-SMOKE-$([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())"
$createdId = Invoke-Trace POST '/api/v2/incoming-trace/nodes' @{
  nodeType = 'MATERIAL'; barcode = $barcode; name = 'Smoke test material'; materialCode = 'SMOKE-001'; materialBatchNo = 'LOT-SMOKE'
}
$null = Invoke-Trace POST '/api/v2/incoming-trace/relations' @{
  parentNodeId = 2; childNodeId = $createdId; quantity = 1; workOrderNo = 'WO-SMOKE'; processName = 'Smoke test'
}
$createdTree = Invoke-Trace GET "/api/v2/incoming-trace/tree?rootBarcode=$barcode&direction=UP"
if ($createdTree.root.children.Count -lt 1) { throw 'Manually entered relation is not traceable' }

try {
  Invoke-Trace POST '/api/v2/incoming-trace/relations' @{ parentNodeId = 4; childNodeId = 1 } | Out-Null
  throw 'Cycle relation was incorrectly accepted'
} catch {
  if ($_.Exception.Message -like '*Cycle relation was incorrectly accepted*') { throw }
}

Write-Output "PASS: nodes=$($summary.totalNodes), FG-A100 children=$($down.root.children.Count), batch lots=$($impact.root.children.Count), manual-node=$barcode"
