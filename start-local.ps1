param([int]$Port=4190,[switch]$OpenBrowser)
$ErrorActionPreference='Stop'
$projectRoot=Split-Path -Parent $MyInvocation.MyCommand.Path
$serverPath=Join-Path $projectRoot 'server.mjs'
$runtimeDir=Join-Path $projectRoot '.runtime'
New-Item -ItemType Directory -Path $runtimeDir -Force | Out-Null
$nodeCommand=Get-Command node -ErrorAction SilentlyContinue
$bundledNode=Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
$nodePath=if(Test-Path -LiteralPath $bundledNode){$bundledNode}elseif($nodeCommand){$nodeCommand.Source}else{''}
if(-not(Test-Path -LiteralPath $nodePath)){throw 'Please install Node.js 18.17 or later.'}
$pidFile=Join-Path $runtimeDir 'server.json'
if(Test-Path -LiteralPath $pidFile){
  $saved=Get-Content -LiteralPath $pidFile -Raw | ConvertFrom-Json
  $existing=Get-CimInstance Win32_Process -Filter "ProcessId=$($saved.pid)" -ErrorAction SilentlyContinue
  if($existing -and $existing.CommandLine.Contains($serverPath)){
    $localUrl="http://127.0.0.1:$($saved.port)/"
    Write-Output "CareFlow is already running: $localUrl"
    if($OpenBrowser){Start-Process $localUrl}
    exit 0
  }
}
if(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue){throw "Port $Port is already in use."}
$proc=Start-Process -FilePath $nodePath -ArgumentList @(('"'+$serverPath+'"'),'--port',"$Port") -WorkingDirectory $projectRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $runtimeDir 'stdout.log') -RedirectStandardError (Join-Path $runtimeDir 'stderr.log') -PassThru
@{pid=$proc.Id;port=$Port;root=$projectRoot} | ConvertTo-Json | Set-Content -LiteralPath $pidFile -Encoding UTF8
$localUrl="http://127.0.0.1:$Port/"
for($n=0;$n -lt 35;$n++){
  try{if((Invoke-WebRequest -Uri $localUrl -UseBasicParsing -TimeoutSec 2).StatusCode -eq 200){Write-Output "CareFlow ready: $localUrl";if($OpenBrowser){Start-Process $localUrl};exit 0}}catch{Start-Sleep -Milliseconds 150}
}
throw "Server did not become ready. See .runtime/stderr.log."
