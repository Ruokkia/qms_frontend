param(
  [Parameter(Mandatory = $true)][string]$Token,
  [string]$BaseUrl = 'http://127.0.0.1:8080'
)

$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = 'Stop'

# 使用 curl.exe + 临时文件 UTF-8 读写，规避 PowerShell Invoke-WebRequest 中文乱码
function Invoke-Trace([string]$Method, [string]$Path, $Body = $null) {
    $bodyFile = $null
    $outFile = $null
    try {
        $curlArgs = @('-s', '-X', $Method, "$BaseUrl$Path", '-H', 'Content-Type: application/json', '-H', "Authorization: Bearer $Token")
        if ($null -ne $Body) {
            $json = $Body | ConvertTo-Json -Compress -Depth 5
            $bodyFile = [System.IO.Path]::GetTempFileName()
            [System.IO.File]::WriteAllText($bodyFile, $json, [System.Text.Encoding]::UTF8)
            $curlArgs += '--data-binary'; $curlArgs += "@$bodyFile"
        }
        $outFile = [System.IO.Path]::GetTempFileName()
        $curlArgs += '-o'; $curlArgs += $outFile
        curl.exe @curlArgs
        $text = [System.IO.File]::ReadAllText($outFile, [System.Text.Encoding]::UTF8)
        $result = $text | ConvertFrom-Json
    } catch {
        return [PSCustomObject]@{ code = -1; message = $_.Exception.Message; data = $null }
    } finally {
        if ($bodyFile -and (Test-Path $bodyFile)) { Remove-Item $bodyFile -Force }
        if ($outFile -and (Test-Path $outFile)) { Remove-Item $outFile -Force }
    }
    # 断言化：code==0 且 data 非空
    if ($null -eq $result -or $result.code -ne 0) {
        throw "API failed: $Path -> code=$($result.code) msg=$($result.message)"
    }
    if ($null -eq $result.data) {
        throw "API data empty: $Path (断言：字段非空)"
    }
    return $result.data
}

$summary = Invoke-Trace GET '/api/v2/incoming-trace/summary'
if ($summary.totalNodes -lt 10) { throw 'Seed data is missing (summary.totalNodes < 10)' }

$down = Invoke-Trace GET '/api/v2/incoming-trace/tree?rootBarcode=FG-A100&direction=DOWN'
if ($down.root.children.Count -lt 2) { throw 'FG-A100 tree is incomplete' }

$impact = Invoke-Trace GET '/api/v2/incoming-trace/tree?rootBarcode=LOT-20260721&direction=BATCH_IMPACT'
if ($impact.root.children.Count -lt 2) { throw 'Batch impact fan-out is incomplete' }

$barcode = "MAT-SMOKE-$([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())"
$createdId = Invoke-Trace POST '/api/v2/incoming-trace/nodes' @{
  nodeType = 'MATERIAL'; barcode = $barcode; name = 'Smoke test material'; materialCode = 'SMOKE-001'; materialBatchNo = 'LOT-SMOKE'
}
if (-not $createdId) { throw 'Created node id is empty' }
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
