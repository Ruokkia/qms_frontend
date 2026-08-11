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
        $response = $text | ConvertFrom-Json
    } catch {
        return [PSCustomObject]@{ code = -1; message = $_.Exception.Message; data = $null }
    } finally {
        if ($bodyFile -and (Test-Path $bodyFile)) { Remove-Item $bodyFile -Force }
        if ($outFile -and (Test-Path $outFile)) { Remove-Item $outFile -Force }
    }
    # 断言化：code==0 且 data 非空
    if ($null -eq $response -or $response.code -ne 0) {
        throw "API failed: $Path -> code=$($response.code) msg=$($response.message)"
    }
    if ($null -eq $response.data) {
        throw "API data empty: $Path (断言：字段非空)"
    }
    return $response.data
}

$suffix = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$finished = Invoke-Trace POST '/api/v2/incoming-trace/nodes' @{ nodeType = 'FINISHED_GOOD'; barcode = "FG-COMPLETE-$suffix"; name = 'Completeness verification finished good' }
if (-not $finished) { throw 'Created finished good id is empty' }
$semiA = Invoke-Trace POST '/api/v2/incoming-trace/nodes' @{ nodeType = 'SEMI_FINISHED'; barcode = "SF-COMPLETE-A-$suffix"; name = 'Completeness verification semi A' }
if (-not $semiA) { throw 'Created semi A id is empty' }
$semiB = Invoke-Trace POST '/api/v2/incoming-trace/nodes' @{ nodeType = 'SEMI_FINISHED'; barcode = "SF-COMPLETE-B-$suffix"; name = 'Completeness verification semi B' }
if (-not $semiB) { throw 'Created semi B id is empty' }
$materialBarcode = "MAT-COMPLETE-$suffix"
$material = Invoke-Trace POST '/api/v2/incoming-trace/nodes' @{ nodeType = 'MATERIAL'; barcode = $materialBarcode; name = 'Completeness verification material'; materialCode = 'COMPLETE-001'; materialBatchNo = "LOT-COMPLETE-$suffix" }
if (-not $material) { throw 'Created material id is empty' }

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
