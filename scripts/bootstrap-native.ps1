param(
  [switch]$Offline
)

$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$Vendor = Join-Path $Root 'vendor'
$Backend = Join-Path $Root 'backend'
$Web = Join-Path $Root 'web'

$python = Get-Command python -ErrorAction SilentlyContinue
if (-not $python) { $python = Get-Command python3 -ErrorAction SilentlyContinue }
if (-not $python) { Write-Error 'Python is required'; exit 1 }

# Python venv
$venvPath = Join-Path $Backend '.venv'
& $python.Path -m venv $venvPath
$activate = Join-Path $venvPath 'Scripts\Activate.ps1'
. $activate

$PipArgs = @()
if ($Offline) {
  $PipArgs += @('--no-index','--find-links', (Join-Path $Vendor 'python'))
}

pip install --upgrade pip
pip install -r (Join-Path $Backend 'requirements.txt') @PipArgs

# Node
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Write-Error 'Node.js is required'; exit 1 }
Push-Location $Web
if ($Offline -and (Test-Path (Join-Path $Vendor 'node'))) {
  npm ci --offline
} else {
  npm ci
}
npm run build
Pop-Location

$env:OPENAI_BASE_URL = $env:OPENAI_BASE_URL ? $env:OPENAI_BASE_URL : 'http://127.0.0.1:4000'

# Start backend and frontend preview
Push-Location $Backend
Start-Process -FilePath (Join-Path $venvPath 'Scripts\uvicorn.exe') -ArgumentList 'app.main:app','--host','127.0.0.1','--port','8000'
Pop-Location
Push-Location $Web
npx vite preview --host 127.0.0.1 --port 5173
Pop-Location
