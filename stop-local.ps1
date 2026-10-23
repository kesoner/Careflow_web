$ErrorActionPreference='Stop'
$projectRoot=Split-Path -Parent $MyInvocation.MyCommand.Path
$pidFile=Join-Path $projectRoot '.runtime\server.json'
if(-not(Test-Path -LiteralPath $pidFile)){Write-Output 'No local CareFlow server record.';exit 0}
$saved=Get-Content -LiteralPath $pidFile -Raw | ConvertFrom-Json
$serverPath=Join-Path $projectRoot 'server.mjs'
$proc=Get-CimInstance Win32_Process -Filter "ProcessId=$($saved.pid)" -ErrorAction SilentlyContinue
if($proc -and $proc.CommandLine.Contains($serverPath)){Stop-Process -Id $saved.pid;Write-Output 'CareFlow server stopped.'}
elseif($proc){throw 'PID belongs to a different process; left unchanged.'}
Remove-Item -LiteralPath $pidFile
