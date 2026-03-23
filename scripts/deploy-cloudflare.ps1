param(
  [string]$EnvFile = ".env.local",
  [switch]$RunMigrate
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

    if (
      ($value.StartsWith('"') -and $value.EndsWith('"')) -or
      ($value.StartsWith("'") -and $value.EndsWith("'"))
    ) {
      $value = $value.Substring(1, $value.Length - 2)
    }

    $values[$key] = $value
  }

  return $values
}

function Ensure-Command {
  param([string]$Name)
  $cmd = Get-Command $Name -ErrorAction SilentlyContinue
  if ($null -eq $cmd) {
    throw "Command '$Name' was not found in PATH."
  }
}

function Invoke-Step {
  param(
    [string]$Name,
    [scriptblock]$Command
  )

  & $Command
  if ($LASTEXITCODE -ne 0) {
    throw "$Name failed with exit code $LASTEXITCODE"
  }
}

function Update-WranglerVarsBlock {
  param(
    [string]$WranglerPath,
    [hashtable]$Vars
  )

  if (-not (Test-Path $WranglerPath)) {
    throw "wrangler.toml not found at $WranglerPath"
  }

  $content = Get-Content $WranglerPath -Raw
  $keys = $Vars.Keys | Sort-Object

  if ($keys.Count -eq 0) {
    Write-Host "No non-secret MPP vars found in env file. Skipping [vars] update."
    return
  }

  $lines = @("[vars]")
  foreach ($key in $keys) {
    $escaped = ($Vars[$key] -replace "\\", "\\\\" -replace '"', '\"')
    $lines += "$key = `"$escaped`""
  }
  $newBlock = ($lines -join "`r`n") + "`r`n"

  # Remove all existing [vars] blocks first, then append a single canonical block.
  $pattern = "(?ms)^\[vars\]\r?\n(?:.*?\r?\n)*?(?=^\[|\z)"
  $withoutVars = [regex]::Replace($content, $pattern, "")
  $updated = $withoutVars.TrimEnd() + "`r`n`r`n" + $newBlock

  Set-Content -Path $WranglerPath -Value $updated -NoNewline
  Write-Host "Updated [vars] block in $WranglerPath"
}

function Put-WranglerSecret {
  param(
    [string]$Name,
    [string]$Value
  )

  if (-not $Value) {
    Write-Host "Skip secret $Name (empty)."
    return
  }

  $maxAttempts = 3
  for ($attempt = 1; $attempt -le $maxAttempts; $attempt++) {
    Write-Host "Setting Cloudflare secret: $Name (attempt $attempt/$maxAttempts)"
    $Value | pnpm exec wrangler secret put $Name
    if ($LASTEXITCODE -eq 0) {
      Write-Host "Secret synced: $Name"
      return
    }

    if ($attempt -lt $maxAttempts) {
      Write-Host "Secret sync failed for $Name, retrying..." -ForegroundColor Yellow
      Start-Sleep -Seconds (2 * $attempt)
    }
  }

  throw "Failed to sync Cloudflare secret '$Name' after $maxAttempts attempts."
}

Write-Host "== MDShare Cloudflare one-click deploy ==" -ForegroundColor Cyan
Write-Host "Working directory: $(Get-Location)"

Ensure-Command -Name "pnpm"

$envValues = Read-EnvFile -Path $EnvFile
if ($envValues.Count -eq 0) {
  Write-Host "WARN: $EnvFile not found or empty. Continuing with current wrangler.toml + existing secrets." -ForegroundColor Yellow
} else {
  Write-Host "Loaded environment values from $EnvFile"
}

Write-Host ""
Write-Host "[1/6] Verifying Wrangler auth..."
Invoke-Step -Name "Wrangler auth check" -Command { pnpm exec wrangler whoami }

Write-Host ""
Write-Host "[2/6] Syncing non-secret MPP vars into wrangler.toml..."
$varKeys = @("MPP_ENABLED", "MPP_AMOUNT", "MPP_CURRENCY", "MPP_MODE", "MPP_WAIT_FOR_CONFIRMATION")
$varsToWrite = @{}
foreach ($key in $varKeys) {
  if ($envValues.ContainsKey($key) -and $envValues[$key]) {
    $varsToWrite[$key] = $envValues[$key]
  }
}
Update-WranglerVarsBlock -WranglerPath "wrangler.toml" -Vars $varsToWrite

Write-Host ""
Write-Host "[3/6] Syncing secrets to Cloudflare Worker..."
$secretKeys = @("MPP_SECRET_KEY", "MPP_RECIPIENT", "CRON_SECRET")
foreach ($key in $secretKeys) {
  if ($envValues.ContainsKey($key)) {
    Put-WranglerSecret -Name $key -Value $envValues[$key]
  }
}

if ($RunMigrate) {
  Write-Host ""
  Write-Host "[4/6] Running remote D1 migrations..."
  Invoke-Step -Name "Remote D1 migrations" -Command { pnpm run db:migrate }
} else {
  Write-Host ""
  Write-Host "[4/6] Skipping remote D1 migrations (use -RunMigrate to enable)."
}

Write-Host ""
Write-Host "[5/6] Building Cloudflare bundle..."
Invoke-Step -Name "Cloudflare bundle build" -Command { pnpm run cf:build }

Write-Host ""
Write-Host "[6/6] Deploying Worker..."
$previousCi = $env:CI
$env:CI = "1"
try {
  Invoke-Step -Name "Wrangler deploy" -Command { pnpm exec wrangler deploy --log-level error }
} finally {
  if ($null -eq $previousCi) {
    Remove-Item Env:CI -ErrorAction SilentlyContinue
  } else {
    $env:CI = $previousCi
  }
}

Write-Host ""
Write-Host "Done. Deployment flow completed." -ForegroundColor Green
