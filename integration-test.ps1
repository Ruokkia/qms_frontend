# QMS 全模块联调冒烟测试（断言化）
# 覆盖：登录 -> M0 追溯 -> M1 来料/成品/绑定 -> M2 异常/分析/升级 -> 通知
#
# 说明：后端响应为 UTF-8 但未声明 charset，Windows PowerShell 5.1 默认按系统编码解码会乱码。
# 本脚本改用 curl.exe 直连，并用 UTF-8 显式解码响应体，避免编码问题导致断言失败。
# 所有关键接口均断言 code==0 且返回 data 非空（或关键字段非空），任一步失败即 throw 终止（非 0 退出）。
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$ErrorActionPreference = 'Stop'
$base = 'http://127.0.0.1:8080/api/v1'

# 使用临时文件传递 JSON body，并把响应写入临时文件后以 UTF-8 读取，
# 彻底绕开 PowerShell 对 curl 输出的编码猜测，避免中文乱码
function Invoke-QmsApi($Method, $Uri, $Body, $Token) {
    $bodyFile = $null
    $outFile = $null
    try {
        $curlArgs = @('-s', '-X', $Method, $Uri, '-H', 'Content-Type: application/json')
        if ($Token) { $curlArgs += '-H'; $curlArgs += "Authorization: Bearer $Token" }
        if ($Body) {
            $json = $Body | ConvertTo-Json -Compress -Depth 5
            $bodyFile = [System.IO.Path]::GetTempFileName()
            [System.IO.File]::WriteAllText($bodyFile, $json, [System.Text.Encoding]::UTF8)
            $curlArgs += '--data-binary'; $curlArgs += "@$bodyFile"
        }
        $outFile = [System.IO.Path]::GetTempFileName()
        $curlArgs += '-o'; $curlArgs += $outFile
        curl.exe @curlArgs
        $text = [System.IO.File]::ReadAllText($outFile, [System.Text.Encoding]::UTF8)
        return $text | ConvertFrom-Json
    } catch {
        return [PSCustomObject]@{ code = -1; message = $_.Exception.Message; data = $null }
    } finally {
        if ($bodyFile -and (Test-Path $bodyFile)) { Remove-Item $bodyFile -Force }
        if ($outFile -and (Test-Path $outFile)) { Remove-Item $outFile -Force }
    }
}

# 正向断言：code=0 且返回 data 非空
function Assert-OK($result, $label) {
    if ($null -eq $result -or $result.code -ne 0) {
        throw "[$label] 预期成功但失败：$($result.code) $($result.message)"
    }
    if ($null -eq $result.data) {
        throw "[$label] code=0 但 data 为空（断言：字段非空）"
    }
    Write-Output "  [PASS] $label"
}

# 正向断言 + list 非空：code=0 且 data.list 存在且长度>0
function Assert-List($result, $label) {
    Assert-OK $result $label
    $list = $result.data.list
    if ($null -eq $list -or $list.Count -eq 0) {
        throw "[$label] data.list 为空（断言：列表非空）"
    }
    Write-Output "  [PASS] $label（list.Count=$($list.Count)）"
}

# ---------- 1. 登录（sz_mgr01 / R06 质量经理，无需验证码） ----------
$login = Invoke-QmsApi -Method POST -Uri "$base/auth/login" -Body @{
    account   = 'sz_mgr01'
    password  = '123456'
    plantCode = 'SZ'
}
if ($login.code -ne 0) { throw "登录失败：$($login.message)" }
$token = $login.data.token
Write-Output "[LOGIN] OK  plant=$($login.data.userInfo.plantCode) role=$($login.data.userInfo.roleName)"

# ---------- 2. 当前用户 ----------
$r = Invoke-QmsApi -Method GET -Uri "$base/auth/me" -Token $token
Assert-OK $r 'M0 当前用户 /me'
if (-not $r.data.account) { throw "[/me] account 字段为空" }

# ---------- 3. M0 追溯仪表盘 + 全链路 ----------
$r = Invoke-QmsApi -Method GET -Uri "$base/trace/dashboard" -Token $token
Assert-OK $r 'M0 追溯仪表盘 /trace/dashboard'
$r = Invoke-QmsApi -Method GET -Uri "$base/trace/full-trace?barcode=SN-SZ-0001" -Token $token
Assert-OK $r 'M0 全链路追溯 /trace/full-trace'

# ---------- 4. M1 来料 / 成品 / 绑定 ----------
$r = Invoke-QmsApi -Method GET -Uri "$base/material-inspections" -Token $token
Assert-List $r 'M1 来料检验列表 /material-inspections'
$r = Invoke-QmsApi -Method GET -Uri "$base/material-inspections/stats" -Token $token
Assert-OK $r 'M1 来料统计 /material-inspections/stats'
$r = Invoke-QmsApi -Method GET -Uri "$base/finished-goods" -Token $token
Assert-List $r 'M1 成品检验列表 /finished-goods'
$r = Invoke-QmsApi -Method GET -Uri "$base/finished-goods/stats" -Token $token
Assert-OK $r 'M1 成品统计 /finished-goods/stats'
$r = Invoke-QmsApi -Method GET -Uri "$base/material-bindings" -Token $token
Assert-List $r 'M1 关键物料绑定列表 /material-bindings'

# ---------- 5. M2 异常 / 分析 / 升级 ----------
$r = Invoke-QmsApi -Method GET -Uri "$base/exceptions" -Token $token
Assert-List $r 'M2 异常单列表 /exceptions'
$r = Invoke-QmsApi -Method GET -Uri "$base/exceptions/stats" -Token $token
Assert-OK $r 'M2 异常统计 /exceptions/stats'
$r = Invoke-QmsApi -Method GET -Uri "$base/exception-analysis?range=30" -Token $token
Assert-OK $r 'M2 异常分析 /exception-analysis'
$r = Invoke-QmsApi -Method GET -Uri "$base/supplier-frequency?days=90" -Token $token
Assert-OK $r 'M2 供应商升级频次 /supplier-frequency'
$r = Invoke-QmsApi -Method POST -Uri "$base/escalations/check" -Body @{ supplier = 'SUP-TEST'; defectType = '尺寸' } -Token $token
Assert-OK $r 'M2 升级前置检查 /escalations/check'

# ---------- 6. 通知 ----------
$r = Invoke-QmsApi -Method GET -Uri "$base/notifications/unread/count" -Token $token
Assert-OK $r 'NOTICE 未读计数 /notifications/unread/count'
$r = Invoke-QmsApi -Method GET -Uri "$base/notifications" -Token $token
Assert-List $r 'NOTICE 通知列表 /notifications'

Write-Output ''
Write-Output 'ALL PASS - 全模块联调冒烟通过'
