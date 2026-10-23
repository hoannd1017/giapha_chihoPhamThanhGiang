$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root
Start-Process "http://localhost:3000"
Write-Host "Opened http://localhost:3000"
