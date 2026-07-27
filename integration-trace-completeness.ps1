param(
  [Parameter(Mandatory = $true)][string]$Token,
  [string]$BaseUrl = 'http://127.0.0.1:8080'
)

$ErrorActionPreference = 'Stop'
$headers = @{ Authorization = "Bearer $Token"; 'Content-Type' = 'application/json' }
function Invoke-Trace([string]$Method, [string]$Path, $Body = $null) {
  $args = @{ Method = $Method; Uri = "$BaseUrl$Path"; Headers = $headers; UseBasicParsing = $true }
  if ($null -ne $Body) { $args.Body = ($Body | ConvertTo-Json -Compress) }
  $response = Invoke-WebRequest @args | ConvertFrom-Json
  if ($response.code -ne 0) { throw "API failed: $Path $($response.message)" }
  $response.data
}

$suffix = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$finished = Invoke-Trace POST '/api/v2/incoming-trace/nodes' @{ nodeType = 'FINISHED_GOOD'; barcode = "FG-COMPLETE-$suffix"; name = 'Completeness verification finished good' }
$semiA = Invoke-Trace POST '/api/v2/incoming-trace/nodes' @{ nodeType = 'SEMI_FINISHED'; barcode = "SF-COMPLETE-A-$suffix"; name = 'Completeness verification semi A' }
$semiB = Invoke-Trace POST '/api/v2/incoming-trace/nodes' @{ nodeType = 'SEMI_FINISHED'; barcode = "SF-COMPLETE-B-$suffix"; name = 'Completeness verification semi B' }
$materialBarcode = "MAT-COMPLETE-$suffix"
$material = Invoke-Trace POST '/api/v2/incoming-trace/nodes' @{ nodeType = 'MATERIAL'; barcode = $materialBarcode; name = 'Completeness verification material'; materialCode = 'COMPLETE-001'; materialBatchNo = "LOT-COMPLETE-$suffix" }

foreach ($relation in @(
  @{ parentNodeId = $finished; childNodeId = $semiA },
  @{ parentNodeId = $finished; childNodeId = $semiB },
  @{ parentNodeId = $semiA; childNodeId = $material },
  @{ parentNodeId = $semiB; childNodeId = $material }
)) { Invoke-Trace POST '/api/v2/incoming-trace/relations' $relation | Out-Null }

$tree = Invoke-Trace GET "/api/v2/incoming-trace/tree?rootBarcode=$materialBarcode&direction=UP"
if ($tree.root.children.Count -ne 2) { throw 'Expected two semi-finished reverse paths' }
foreach ($semi in $tree.root.children) {
  if (($semi.children | Where-Object { $_.barcode -eq "FG-COMPLETE-$suffix" }).Count -ne 1) {
    throw 'Expected the finished good at the end of every reverse path'
  }
}
Write-Output "PASS: complete reverse tree for $materialBarcode"
