$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$backendDir = Join-Path $repoRoot 'backend'
$healthUrl = 'http://127.0.0.1:8080/health'
$backendProcess = $null
$startedBackend = $false

function Test-BackendHealth {
  try {
    $response = Invoke-WebRequest -Uri $healthUrl -UseBasicParsing -TimeoutSec 2
    return $response.StatusCode -ge 200 -and $response.StatusCode -lt 500
  } catch {
    return $false
  }
}

if (-not (Test-BackendHealth)) {
  Write-Host 'Starting backend on http://127.0.0.1:8080 ...'

  $backendProcess = Start-Process `
    -FilePath 'python' `
    -ArgumentList 'scripts/start_dev.py', '--no-reload' `
    -WorkingDirectory $backendDir `
    -PassThru

  $startedBackend = $true

  $isHealthy = $false
  for ($attempt = 0; $attempt -lt 30; $attempt++) {
    Start-Sleep -Seconds 1

    if ($backendProcess.HasExited) {
      throw "Backend exited early with code $($backendProcess.ExitCode)."
    }

    if (Test-BackendHealth) {
      $isHealthy = $true
      break
    }
  }

  if (-not $isHealthy) {
    throw 'Backend did not become healthy on http://127.0.0.1:8080/health within 30 seconds.'
  }
}

try {
  pnpm --filter skyroc-admin dev
} finally {
  if ($startedBackend -and $backendProcess -and -not $backendProcess.HasExited) {
    Write-Host 'Stopping backend ...'
    Stop-Process -Id $backendProcess.Id -Force
  }
}
