<#
.SYNOPSIS
    Complete Phase 4 test suite for Shortly API (v2)
.NOTES
    Run from D:\shortly\backend
    Usage: .\test-all.ps1
#>

$ErrorActionPreference = 'Continue'
$baseUrl = "http://localhost:5000"
$api = "$baseUrl/api/v1"

$script:PassCount = 0
$script:FailCount = 0

function Test-Pass { param($msg) $script:PassCount++; Write-Host "[PASS] $msg" -ForegroundColor Green }
function Test-Fail { param($msg) $script:FailCount++; Write-Host "[FAIL] $msg" -ForegroundColor Red }
function Test-Info { param($msg) Write-Host "[INFO] $msg" -ForegroundColor Cyan }
function Test-Head { param($msg) Write-Host "`n=== $msg ===`n" -ForegroundColor Yellow }

function Invoke-Api {
    param(
        [string]$Method,
        [string]$Url,
        [hashtable]$Headers = @{},
        $Body = $null
    )
    $params = @{ Uri = $Url; Method = $Method; Headers = $Headers; UseBasicParsing = $true }
    if ($Body) {
        $params.ContentType = "application/json"
        $params.Body = ($Body | ConvertTo-Json -Depth 10 -Compress)
    }

    try {
        $resp = Invoke-WebRequest @params -ErrorAction Stop
        $statusCode = [int]$resp.StatusCode
        $content = $resp.Content
    } catch {
        $statusCode = 0
        try {
            if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
                $statusCode = [int]$_.Exception.Response.StatusCode.value__
            }
        } catch {}

        $content = ''
        try {
            if ($_.Exception.Response) {
                $stream = $_.Exception.Response.GetResponseStream()
                if ($stream) {
                    $reader = New-Object System.IO.StreamReader($stream)
                    $content = $reader.ReadToEnd()
                    $reader.Close()
                }
            }
        } catch {}
        if (-not $content -and $_.ErrorDetails) { $content = $_.ErrorDetails.Message }
        if (-not $content) { $content = $_.Exception.Message }
    }

    if ($content) {
        try {
            $json = $content | ConvertFrom-Json
            Add-Member -InputObject $json -MemberType NoteProperty -Name '_status' -Value $statusCode -Force
            return $json
        } catch {
            return [PSCustomObject]@{ _status = $statusCode; _raw = $content }
        }
    }
    return [PSCustomObject]@{ _status = $statusCode; _raw = '' }
}

Clear-Host
Write-Host "`n===================================================" -ForegroundColor Magenta
Write-Host "    SHORTLY API - PHASE 4 COMPLETE TEST SUITE" -ForegroundColor Magenta
Write-Host "===================================================" -ForegroundColor Magenta

$timestamp = Get-Date -Format "yyyyMMddHHmmss"
$testEmail = "tester+$timestamp@shortly.test"
$testPass = "TestPass123!"

# 1. HEALTH
Test-Head "1. HEALTH CHECKS"
$root = Invoke-Api GET "$baseUrl/"
if ($root.success) { Test-Pass "Root: $($root.data.name)" } else { Test-Fail "Root failed" }

$health = Invoke-Api GET "$baseUrl/health"
if ($health.services.mongodb -eq 'connected' -and $health.services.redis -eq 'connected') {
    Test-Pass "Health: MongoDB + Redis both connected"
} else { Test-Fail "Health failed" }

$status = Invoke-Api GET "$api/status"
if ($status.success) { Test-Pass "API Status OK" } else { Test-Fail "Status failed" }

# 2. REGISTER
Test-Head "2. AUTH - REGISTER"
$register = Invoke-Api POST "$api/auth/register" -Body @{
    name = "Test User"; email = $testEmail; password = $testPass
}
if ($register._status -eq 201 -and $register.data.access_token) {
    Test-Pass "Registered: $testEmail"
    $ACCESS_TOKEN = $register.data.access_token
    $REFRESH_TOKEN = $register.data.refresh_token
    $API_KEY = $register.data.api_key
    $USER_ID = $register.data.user.id
    Test-Info "User ID: $USER_ID"
} else {
    Test-Fail "Register failed (status=$($register._status)): $($register.message)"
    exit 1
}

$tokenScript = @"
`$ACCESS_TOKEN = "$ACCESS_TOKEN"
`$REFRESH_TOKEN = "$REFRESH_TOKEN"
`$API_KEY = "$API_KEY"
`$USER_ID = "$USER_ID"
`$TEST_EMAIL = "$testEmail"
"@
$tokenScript | Set-Content -Encoding UTF8 .test-tokens.ps1
Test-Pass "Tokens saved to .test-tokens.ps1"

# 3. LOGIN
Test-Head "3. AUTH - LOGIN"
$login = Invoke-Api POST "$api/auth/login" -Body @{ email = $testEmail; password = $testPass }
if ($login._status -eq 200 -and $login.data.access_token) {
    Test-Pass "Login successful"
    $ACCESS_TOKEN = $login.data.access_token
    $REFRESH_TOKEN = $login.data.refresh_token
} else { Test-Fail "Login failed (status=$($login._status)): $($login.message)" }

# 4. NEGATIVE AUTH
Test-Head "4. AUTH - NEGATIVE"
$wrong = Invoke-Api POST "$api/auth/login" -Body @{ email = $testEmail; password = "WrongPass123!" }
if ($wrong._status -eq 401) {
    Test-Pass "Wrong password -> 401: $($wrong.message)"
} else { Test-Fail "Wrong password (status=$($wrong._status)): $($wrong.message)" }

$dup = Invoke-Api POST "$api/auth/register" -Body @{ name = "Dup"; email = $testEmail; password = "Other123!" }
if ($dup._status -eq 409) {
    Test-Pass "Duplicate email -> 409: $($dup.message)"
} else { Test-Fail "Duplicate email (status=$($dup._status)): $($dup.message)" }

$noToken = Invoke-Api GET "$api/auth/me"
if ($noToken._status -eq 401) { Test-Pass "No token -> 401" } else { Test-Fail "No-token test (status=$($noToken._status))" }

# 5. /me
Test-Head "5. AUTH - /me"
$meBearer = Invoke-Api GET "$api/auth/me" -Headers @{ Authorization = "Bearer $ACCESS_TOKEN" }
if ($meBearer._status -eq 200 -and $meBearer.data.email -eq $testEmail) {
    Test-Pass "/me (Bearer): $($meBearer.data.email)"
} else { Test-Fail "/me (Bearer) (status=$($meBearer._status))" }

$meApiKey = Invoke-Api GET "$api/auth/me" -Headers @{ "X-API-Key" = $API_KEY }
if ($meApiKey._status -eq 200 -and $meApiKey.data.email -eq $testEmail) {
    Test-Pass "/me (API key): $($meApiKey.data.email)"
} else { Test-Fail "/me (API key) (status=$($meApiKey._status))" }

# 6. REFRESH
Test-Head "6. AUTH - REFRESH"
$refreshed = Invoke-Api POST "$api/auth/refresh" -Body @{ refresh_token = $REFRESH_TOKEN }
if ($refreshed._status -eq 200 -and $refreshed.data.access_token) {
    Test-Pass "Token refreshed"
    $ACCESS_TOKEN = $refreshed.data.access_token
    $REFRESH_TOKEN = $refreshed.data.refresh_token
} else { Test-Fail "Refresh (status=$($refreshed._status)): $($refreshed.message)" }

# 7. URL CREATE
Test-Head "7. URL - CREATE"
$authHeaders = @{ Authorization = "Bearer $ACCESS_TOKEN" }

$anon = Invoke-Api POST "$api/urls" -Body @{ long_url = "https://example.com/anon-$timestamp" }
if ($anon._status -eq 201 -and $anon.data.short_code) {
    $ANON_CODE = $anon.data.short_code
    Test-Pass "Anonymous URL: $ANON_CODE"
} else { Test-Fail "Anonymous create (status=$($anon._status)): $($anon.message)" }

$owned = Invoke-Api POST "$api/urls" -Headers $authHeaders -Body @{
    long_url = "https://github.com/mohitt1213"; custom_alias = "test-$timestamp"
}
if ($owned._status -eq 201 -and $owned.data.short_code) {
    $OWNED_CODE = $owned.data.short_code
    Test-Pass "Owned URL: $OWNED_CODE"
} else { Test-Fail "Owned create (status=$($owned._status)): $($owned.message)" }

$expiry = [DateTime]::UtcNow.AddDays(30).ToString("yyyy-MM-ddTHH:mm:ssZ")
$withExp = Invoke-Api POST "$api/urls" -Headers $authHeaders -Body @{
    long_url = "https://news.ycombinator.com"; expires_at = $expiry
}
if ($withExp._status -eq 201) {
    Test-Pass "URL with expiry: $($withExp.data.short_code)"
} else { Test-Fail "Expiry create (status=$($withExp._status)): $($withExp.message)" }

$invalid = Invoke-Api POST "$api/urls" -Body @{ long_url = "not-a-url" }
if ($invalid._status -eq 400) { Test-Pass "Invalid URL rejected" } else { Test-Fail "Invalid URL (status=$($invalid._status))" }

$reserved = Invoke-Api POST "$api/urls" -Body @{ long_url = "https://example.com"; custom_alias = "api" }
if ($reserved._status -eq 400) {
    Test-Pass "Reserved alias rejected: $($reserved.message)"
} else { Test-Fail "Reserved alias (status=$($reserved._status)): $($reserved.message)" }

$dupAlias = Invoke-Api POST "$api/urls" -Body @{
    long_url = "https://different.com"; custom_alias = "test-$timestamp"
}
if ($dupAlias._status -eq 409) {
    Test-Pass "Duplicate alias -> 409: $($dupAlias.message)"
} else { Test-Fail "Duplicate alias (status=$($dupAlias._status)): $($dupAlias.message)" }

# 8. LIST
Test-Head "8. URL - LIST"
$myUrls = Invoke-Api GET "$api/urls?page=1&limit=10" -Headers $authHeaders
if ($myUrls._status -eq 200 -and $myUrls.success) {
    Test-Pass "Listed $($myUrls.data.urls.Count) URL(s) (total: $($myUrls.data.pagination.total))"
} else { Test-Fail "List (status=$($myUrls._status)): $($myUrls.message)" }

$listNoAuth = Invoke-Api GET "$api/urls"
if ($listNoAuth._status -eq 401) { Test-Pass "List without auth -> 401" } else { Test-Fail "List without auth (status=$($listNoAuth._status))" }

# 9. DETAILS
Test-Head "9. URL - DETAILS"
if (-not $OWNED_CODE) {
    Test-Fail "OWNED_CODE not set (skipping details tests)"
} else {
    $publicView = Invoke-Api GET "$api/urls/$OWNED_CODE"
    if ($publicView._status -eq 200 -and $publicView.data.isOwner -eq $false) {
        Test-Pass "Public view: isOwner=false"
    } else { Test-Fail "Public view (status=$($publicView._status)): $($publicView | ConvertTo-Json -Compress)" }

    $ownerView = Invoke-Api GET "$api/urls/$OWNED_CODE" -Headers $authHeaders
    if ($ownerView._status -eq 200 -and $ownerView.data.isOwner -eq $true) {
        Test-Pass "Owner view: isOwner=true"
    } else { Test-Fail "Owner view (status=$($ownerView._status)): $($ownerView | ConvertTo-Json -Compress)" }
}

# 10. UPDATE
Test-Head "10. URL - UPDATE"
if (-not $OWNED_CODE) {
    Test-Fail "OWNED_CODE not set (skipping update tests)"
} else {
    $newExpiry = [DateTime]::UtcNow.AddDays(60).ToString("yyyy-MM-ddTHH:mm:ssZ")
    $updated = Invoke-Api PATCH "$api/urls/$OWNED_CODE" -Headers $authHeaders -Body @{ expires_at = $newExpiry }
    if ($updated._status -eq 200) {
        Test-Pass "Expiration updated to: $($updated.data.expiresAt)"
    } else { Test-Fail "Update (status=$($updated._status)): $($updated.message)" }

    $updateNoAuth = Invoke-Api PATCH "$api/urls/$OWNED_CODE" -Body @{ expires_at = $newExpiry }
    if ($updateNoAuth._status -eq 401) { Test-Pass "Update without auth -> 401" } else { Test-Fail "Update without auth (status=$($updateNoAuth._status))" }
}

# 11. REDIRECT
Test-Head "11. REDIRECT"
if (-not $OWNED_CODE) {
    Test-Fail "OWNED_CODE not set (skipping redirect tests)"
} else {
    $redirectStatus = curl.exe -s -o NUL -w "%{http_code}" "$baseUrl/$OWNED_CODE"
    if ($redirectStatus -eq "302") {
        Test-Pass "Redirect 302 for $OWNED_CODE"
    } else { Test-Fail "Redirect returned $redirectStatus" }

    1..4 | ForEach-Object { curl.exe -s -o NUL "$baseUrl/$OWNED_CODE" | Out-Null }
    Test-Pass "Fired 4 additional clicks for analytics"
}

$nfStatus = curl.exe -s -o NUL -w "%{http_code}" "$baseUrl/nope-$timestamp"
if ($nfStatus -eq "404") { Test-Pass "Non-existent -> 404" } else { Test-Fail "Non-existent returned $nfStatus" }

# 12. ANALYTICS
Test-Head "12. ANALYTICS"
Start-Sleep -Seconds 2
if (-not $OWNED_CODE) {
    Test-Fail "OWNED_CODE not set (skipping analytics tests)"
} else {
    $analytics = Invoke-Api GET "$api/analytics/$OWNED_CODE?days=30"
    if ($analytics._status -eq 200 -and $analytics.success) {
        Test-Pass "Analytics for $OWNED_CODE"
        Write-Host "   Total clicks: $($analytics.data.totalClicks)"
        Write-Host "   By device:    $($analytics.data.byDevice | ConvertTo-Json -Compress)"
        Write-Host "   By country:   $($analytics.data.byCountry | ConvertTo-Json -Compress)"
        Write-Host "   By day:       $($analytics.data.byDay | ConvertTo-Json -Compress)"
    } else { Test-Fail "Analytics (status=$($analytics._status)): $($analytics.message)" }
}

$flush = Invoke-Api POST "$api/analytics/flush" -Headers $authHeaders
if ($flush._status -eq 200) {
    Test-Pass "Flushed: processed=$($flush.data.processed) flushed=$($flush.data.flushed)"
} else { Test-Fail "Flush (status=$($flush._status)): $($flush.message)" }

# 13. OWNERSHIP 403
Test-Head "13. OWNERSHIP - 403 CHECKS"
if (-not $ANON_CODE -or -not $OWNED_CODE) {
    Test-Fail "Missing codes (skipping ownership tests)"
} else {
    $delAnon = Invoke-Api DELETE "$api/urls/$ANON_CODE" -Headers $authHeaders
    if ($delAnon._status -eq 403) {
        Test-Pass "Delete anonymous -> 403: $($delAnon.message)"
    } else { Test-Fail "Delete anonymous (status=$($delAnon._status)): $($delAnon.message)" }

    $newExpiry = [DateTime]::UtcNow.AddDays(60).ToString("yyyy-MM-ddTHH:mm:ssZ")
    $updAnon = Invoke-Api PATCH "$api/urls/$ANON_CODE" -Headers $authHeaders -Body @{ expires_at = $newExpiry }
    if ($updAnon._status -eq 403) {
        Test-Pass "Update anonymous -> 403: $($updAnon.message)"
    } else { Test-Fail "Update anonymous (status=$($updAnon._status)): $($updAnon.message)" }
}

# 14. DELETE
Test-Head "14. DELETE (owner)"
if (-not $OWNED_CODE) {
    Test-Fail "OWNED_CODE not set (skipping delete tests)"
} else {
    $del = Invoke-Api DELETE "$api/urls/$OWNED_CODE" -Headers $authHeaders
    if ($del._status -eq 200) {
        Test-Pass "Deleted $OWNED_CODE"
    } else { Test-Fail "Delete (status=$($del._status)): $($del.message)" }

    $verifyDel = curl.exe -s -o NUL -w "%{http_code}" "$baseUrl/$OWNED_CODE"
    if ($verifyDel -eq "404") { Test-Pass "Deleted URL -> 404" } else { Test-Fail "Deleted URL returned $verifyDel" }
}

# 15. LOGOUT
Test-Head "15. LOGOUT"
$logout = Invoke-Api POST "$api/auth/logout" -Headers $authHeaders -Body @{ refresh_token = $REFRESH_TOKEN }
if ($logout._status -eq 200) { Test-Pass "Logout successful" } else { Test-Fail "Logout (status=$($logout._status)): $($logout.message)" }

$refreshAfterLogout = Invoke-Api POST "$api/auth/refresh" -Body @{ refresh_token = $REFRESH_TOKEN }
if ($refreshAfterLogout._status -eq 401) {
    Test-Pass "Refresh after logout -> 401 (revoked)"
} else { Test-Fail "Refresh after logout (status=$($refreshAfterLogout._status))" }

# SUMMARY
Write-Host "`n===================================================" -ForegroundColor Magenta
Write-Host "              TEST SUITE COMPLETE" -ForegroundColor Magenta
Write-Host "===================================================" -ForegroundColor Magenta
Write-Host ""
Write-Host "PASS: $script:PassCount" -ForegroundColor Green
Write-Host "FAIL: $script:FailCount" -ForegroundColor $(if ($script:FailCount -gt 0) { 'Red' } else { 'Green' })
Write-Host ""
Write-Host "Tokens: .test-tokens.ps1" -ForegroundColor Yellow
Write-Host "Reset:  node cleanup.js" -ForegroundColor Yellow
