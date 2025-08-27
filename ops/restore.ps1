param(
  [Parameter(Mandatory=$true)][string]$Archive
)

$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

Add-Type -AssemblyName 'System.IO.Compression.FileSystem'
[System.IO.Compression.ZipFile]::ExtractToDirectory($Archive, $Root)
Write-Output "Restore completed into: $Root"
