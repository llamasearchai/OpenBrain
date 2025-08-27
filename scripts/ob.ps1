param(
  [switch]$Native,
  [switch]$NoObservability,
  [switch]$NoVector,
  [switch]$NoOllama,
  [switch]$Pull,
  [switch]$Offline
)

$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$Deploy = Join-Path $Root 'deploy'
$Data = Join-Path $Root 'data'
New-Item -ItemType Directory -Force -Path $Data | Out-Null

if ($Native) {
  & (Join-Path $Root 'scripts/bootstrap-native.ps1') @{
    Offline=$Offline
  }
  exit $LASTEXITCODE
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Write-Error 'Docker is required.'
  exit 1
}

$env:OPENAI_BASE_URL = $env:OPENAI_BASE_URL ? $env:OPENAI_BASE_URL : 'http://127.0.0.1:4000'

$Compose = Join-Path $Deploy 'compose.yml'

if ($Pull -and (-not $Offline)) {
  docker pull qdrant/qdrant:latest | Out-Null
  docker pull grafana/grafana:10.4.2 | Out-Null
  docker pull prom/prometheus:v2.54.1 | Out-Null
  docker pull grafana/loki:2.9.8 | Out-Null
  docker pull otel/opentelemetry-collector-contrib:0.109.0 | Out-Null
  docker pull ollama/ollama:latest | Out-Null
}

docker build -f (Join-Path $Deploy 'app.Dockerfile') -t openbrain/app:local $Root
docker build -f (Join-Path $Deploy 'litellm.Dockerfile') -t openbrain/litellm:local $Deploy

$profiles = @()
if (-not $NoObservability) { $profiles += @('--profile','observability') }
if (-not $NoVector) { $profiles += @('--profile','vector') }
if (-not $NoOllama) { $profiles += @('--profile','ollama') }

docker compose -f $Compose up -d @profiles
Write-Output 'Stack is starting. Backends: http://127.0.0.1:8000, Frontend: http://127.0.0.1:5173'
