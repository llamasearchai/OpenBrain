param(
  [switch]$SaveImages
)

$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$Ts = Get-Date -Format 'yyyyMMdd-HHmmss'
$OutDir = Join-Path $Root 'backups'
$Archive = Join-Path $OutDir ("openbrain-$Ts.zip")
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

$include = @(
  (Join-Path $Root 'data'),
  (Join-Path $Root 'deploy')
)

if ($SaveImages) {
  $tmp = New-Item -ItemType Directory -Force -Path ([System.IO.Path]::GetTempPath() + [System.IO.Path]::GetRandomFileName())
  docker save openbrain/app:local openbrain/litellm:local qdrant/qdrant:latest grafana/grafana:10.4.2 prom/prometheus:v2.54.1 grafana/loki:2.9.8 otel/opentelemetry-collector-contrib:0.109.0 ollama/ollama:latest -o (Join-Path $tmp 'images.tar')
  $include += (Join-Path $tmp 'images.tar')
}

Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]

if (Test-Path $Archive) { Remove-Item -Force $Archive }

$zip.CreateFromDirectory($Root, $Archive)
Write-Output "Backup created at: $Archive"
