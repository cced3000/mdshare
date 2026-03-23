param(
  [string]$BaseUrl = "http://127.0.0.1:3000"
)

$ErrorActionPreference = "Stop"

function Read-EnvFile {
  param([string]$Path)
  $values = @{}

  if (-not (Test-Path $Path)) {
    return $values
  }

  Get-Content $Path | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith("#")) { return }
    $idx = $line.IndexOf("=")
    if ($idx -lt 1) { return }
    $key = $line.Substring(0, $idx).Trim()
    $value = $line.Substring($idx + 1).Trim()
    $values[$key] = $value
  }

  return $values
}

Write-Host "== MPP verification for MDShare ==" -ForegroundColor Cyan
Write-Host "Base URL: $BaseUrl"

$envFile = ".env.local"
$envValues = Read-EnvFile -Path $envFile

Write-Host ""
Write-Host "[1/4] Checking local env config..."
$required = @("MPP_SECRET_KEY", "MPP_RECIPIENT")
$optional = @("MPP_ENABLED", "MPP_AMOUNT", "MPP_CURRENCY", "MPP_MODE", "MPP_WAIT_FOR_CONFIRMATION")

if ($envValues.Count -eq 0) {
  Write-Host "WARN: .env.local not found or empty. If you use Worker secrets, this can still be fine for production." -ForegroundColor Yellow
} else {
  foreach ($key in $required) {
    if ($envValues.ContainsKey($key) -and $envValues[$key]) {
      Write-Host "OK: $key is set"
    } else {
      Write-Host "FAIL: $key is missing in .env.local" -ForegroundColor Red
    }
  }
  foreach ($key in $optional) {
    if ($envValues.ContainsKey($key)) {
      Write-Host "INFO: $key=$($envValues[$key])"
    }
  }
}

Write-Host ""
Write-Host "[2/4] Checking server reachability..."
try {
  $homeResponse = Invoke-WebRequest -UseBasicParsing "$BaseUrl/" -TimeoutSec 8
  Write-Host "OK: Server reachable, status=$($homeResponse.StatusCode)"
} catch {
  Write-Host "FAIL: Cannot reach $BaseUrl. Start app first: pnpm run dev" -ForegroundColor Red
  Write-Host $_.Exception.Message
  exit 1
}

Write-Host ""
Write-Host "[3/4] Sending unpaid request to POST /api/mpp/shares..."
$payload = @{
  markdownContent = "mpp verification test"
  expiresInHours = 24
  burnMode = "OFF"
  editableMode = "READ_ONLY"
} | ConvertTo-Json

$response = $null
$statusCode = $null
$responseBody = ""

try {
  $response = Invoke-WebRequest `
    -UseBasicParsing `
    -Uri "$BaseUrl/api/mpp/shares" `
    -Method POST `
    -ContentType "application/json" `
    -Body $payload `
    -TimeoutSec 15

  $statusCode = [int]$response.StatusCode
  $responseBody = $response.Content
} catch {
  $webResponse = $_.Exception.Response
  if ($null -eq $webResponse) {
    Write-Host "FAIL: request threw exception" -ForegroundColor Red
    Write-Host $_.Exception.Message
    exit 1
  }

  try {
    $statusCode = [int]$webResponse.StatusCode
  } catch {
    $statusCode = $null
  }

  try {
    $stream = $webResponse.GetResponseStream()
    if ($stream) {
      $reader = New-Object System.IO.StreamReader($stream)
      $responseBody = $reader.ReadToEnd()
      $reader.Close()
    }
  } catch {
    $responseBody = ""
  }
}

if ($null -eq $statusCode) {
  Write-Host "FAIL: Unable to read HTTP status code from response." -ForegroundColor Red
  exit 1
}

Write-Host "Status: $statusCode"
Write-Host "Body:"
Write-Host $responseBody

Write-Host ""
Write-Host "[4/4] Result interpretation..."
if ($statusCode -eq 402) {
  Write-Host "PASS: MPP gate is active. Endpoint is payment-protected." -ForegroundColor Green
  exit 0
}

if ($statusCode -eq 200) {
  Write-Host "WARN: Endpoint returned 200 without payment. MPP gate is likely disabled." -ForegroundColor Yellow
  Write-Host "Check MPP_ENABLED / MPP_SECRET_KEY / MPP_RECIPIENT and restart server."
  exit 2
}

if ($statusCode -ge 500) {
  Write-Host "FAIL: Server-side error. Check server logs for MPP configuration issues." -ForegroundColor Red
  exit 3
}

Write-Host "INFO: Unexpected status. Review response body and logs."
exit 4
