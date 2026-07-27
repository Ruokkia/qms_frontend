# QMS 联调测试脚本 v2：登录 → 获取 Token → 测试 M0/M1/M2/通知 关键接口
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$base = 'http://127.0.0.1:8080/api/v1'

function Invoke-QmsApi($Method, $Uri, $Body, $Token) {
    $headers = @{ 'Content-Type' = 'application/json' }
    if ($Token) { $headers['Authorization'] = "Bearer $Token" }
    try {
        if ($Body) {
            $json = $Body | ConvertTo-Json -Compress
            return Invoke-WebRequest -Uri $Uri -Method $Method -Body $json -Headers $headers -UseBasicParsing | ConvertFrom-Json
        } else {
            return Invoke-WebRequest -Uri $Uri -Method $Method -Headers $headers -UseBasicParsing | ConvertFrom-Json
        }
    } catch {
        $resp = $_.Exception.Response
        $code = $resp.StatusCode.value__
        Write-Output "ERROR($code): $Uri"
        return $null
    }
}

# 1. 获取验证码
$captcha = Invoke-QmsApi -Method GET -Uri "$base/auth/captcha"
if ($captcha -eq $null -or $captcha.code -ne 0) { Write-Output "Captcha failed"; exit 1 }
$key = $captcha.data.captchaKey

# 2. 从 Redis 读取验证码
$raw = docker exec zhilv-yuntu-redis-1 redis-cli GET "qms:auth:captcha:$key"
$code = ($raw -replace '[^A-Za-z0-9]', '').ToUpper()

# 3. 登录
$login = Invoke-QmsApi -Method POST -Uri "$base/auth/login" -Body @{
    account = 'sz_mgr01'
    password = '123456'
    plantCode = 'SZ'
    captchaKey = $key
    captcha = $code
}
if ($login -eq $null -or $login.code -ne 0) { Write-Output "Login failed"; exit 1 }
$token = $login.data.token
Write-Output "[LOGIN] OK  plant=$($login.data.userInfo.plantCode) role=$($login.data.userInfo.roleName)"

# 4. /me
$me = Invoke-QmsApi -Method GET -Uri "$base/auth/me" -Token $token
Write-Output "[/me] code=$($me.code) account=$($me.data.account)"

# 5. M1 来料检验列表 + 统计
$incoming = Invoke-QmsApi -Method GET -Uri "$base/material-inspections?page=1&size=10" -Token $token
Write-Output "[M1 list] code=$($incoming.code) total=$($incoming.data.total) size=$($incoming.data.list.Length)"
$incomingStats = Invoke-QmsApi -Method GET -Uri "$base/material-inspections/stats" -Token $token
Write-Output "[M1 stats] code=$($incomingStats.code)"

# 6. M2 异常单列表 + 统计 + 分析 + 供应商频次
$exceptions = Invoke-QmsApi -Method GET -Uri "$base/exceptions?page=1&size=10" -Token $token
Write-Output "[M2 list] code=$($exceptions.code) total=$($exceptions.data.total) size=$($exceptions.data.list.Length)"
$exceptionStats = Invoke-QmsApi -Method GET -Uri "$base/exceptions/stats" -Token $token
Write-Output "[M2 stats] code=$($exceptionStats.code)"
$analysis = Invoke-QmsApi -Method GET -Uri "$base/exceptions/analysis?dimension=supplier" -Token $token
Write-Output "[M2 analysis] code=$($analysis.code) items=$($analysis.data.items.Length)"
$supFreq = Invoke-QmsApi -Method GET -Uri "$base/exceptions/supplier-summary?minCount=1" -Token $token
Write-Output "[M2 supplier-freq] code=$($supFreq.code) suppliers=$($supFreq.data.Length)"
$escalation = Invoke-QmsApi -Method POST -Uri "$base/escalations/check" -Body @{} -Token $token
Write-Output "[M2 escalation-check] code=$($escalation.code) triggered=$($escalation.data.triggeredSuppliers.Length)"

# 7. M0 追溯：看板 + 双向追溯
$dash = Invoke-QmsApi -Method GET -Uri "$base/trace/dashboard" -Token $token
Write-Output "[M0 dashboard] code=$($dash.code)"
$trace = Invoke-QmsApi -Method GET -Uri "$base/trace/full?nodeCode=SN2026-SZ-0001&maxLevel=8" -Token $token
Write-Output "[M0 full-trace] code=$($trace.code) root=$($trace.data.root.nodeCode) children=$($trace.data.root.children.Length)"

# 8. 通知未读数 + 列表
$notice = Invoke-QmsApi -Method GET -Uri "$base/notifications/unread-count" -Token $token
Write-Output "[NOTICE unread] code=$($notice.code) total=$($notice.data.total)"
$noticeList = Invoke-QmsApi -Method GET -Uri "$base/notifications?page=1&size=10" -Token $token
Write-Output "[NOTICE list] code=$($noticeList.code) total=$($noticeList.data.total)"

Write-Output "`nAll integration tests completed."
