// Windows: read & control whatever is playing (Spotify, browsers, Apple Music, ...) via the
// Windows media session (SMTC) using a small PowerShell helper.
const { spawn, execFile } = require('child_process');
const fs = require('fs');
const path = require('path');

// param() must be first statement, so build the script explicitly.
const SCRIPT = [
  "param([string]$Cmd='',[double]$Arg=0)",
  "[Console]::OutputEncoding=[System.Text.Encoding]::UTF8",
  "$ErrorActionPreference='SilentlyContinue'",
  "Add-Type -AssemblyName System.Runtime.WindowsRuntime",
  "$null=[Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager,Windows.Media.Control,ContentType=WindowsRuntime]",
  "$null=[Windows.Storage.Streams.IRandomAccessStreamWithContentType,Windows.Storage.Streams,ContentType=WindowsRuntime]",
  "$asTask=([System.WindowsRuntimeSystemExtensions].GetMethods()|Where-Object{$_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'})[0]",
  "function Await($op,$type){$t=$asTask.MakeGenericMethod($type).Invoke($null,@($op));$null=$t.Wait(-1);$t.Result}",
  "$mgr=Await ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])",
  "if($Cmd -ne ''){",
  "  $s=$mgr.GetCurrentSession()",
  "  if($s){",
  "    if($Cmd -eq 'toggle'){$null=Await ($s.TryTogglePlayPauseAsync()) ([bool])}",
  "    if($Cmd -eq 'next'){$null=Await ($s.TrySkipNextAsync()) ([bool])}",
  "    if($Cmd -eq 'prev'){$null=Await ($s.TrySkipPreviousAsync()) ([bool])}",
  "    if($Cmd -eq 'seek'){$null=Await ($s.TryChangePlaybackPositionAsync([long]($Arg*10000000))) ([bool])}",
  "  }",
  "  exit",
  "}",
  "$lastKey=''",
  "while($true){",
  "  try{",
  "    $s=$mgr.GetCurrentSession()",
  "    if($s){",
  "      $p=Await ($s.TryGetMediaPropertiesAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])",
  "      $pb=$s.GetPlaybackInfo();$tl=$s.GetTimelineProperties()",
  "      $key=$p.Title+'|'+$p.Artist",
  "      $art=''",
  "      if($key -ne $lastKey){",
  "        $lastKey=$key",
  "        $art='-'",
  "        if($p.Thumbnail){try{",
  "          $rs=Await ($p.Thumbnail.OpenReadAsync()) ([Windows.Storage.Streams.IRandomAccessStreamWithContentType])",
  "          $st=[System.IO.WindowsRuntimeStreamExtensions]::AsStreamForRead($rs)",
  "          $ms=New-Object System.IO.MemoryStream;$st.CopyTo($ms)",
  "          if($ms.Length -gt 0){$art='data:image/jpeg;base64,'+[Convert]::ToBase64String($ms.ToArray())}",
  "        }catch{}}",
  "      }",
  "      $o=@{title=[string]$p.Title;artist=[string]$p.Artist;album=[string]$p.AlbumTitle;playing=([int]$pb.PlaybackStatus -eq 4);position=[double]$tl.Position.TotalSeconds;duration=[double]$tl.EndTime.TotalSeconds;app=[string]$s.SourceAppUserModelId;art=$art}",
  "      [Console]::Out.WriteLine(($o|ConvertTo-Json -Compress))",
  "    } else {[Console]::Out.WriteLine('{\"none\":true}')}",
  "  }catch{}",
  "  Start-Sleep -Milliseconds 1000",
  "}"
].join('\n');

let proc = null;
let scriptPath = null;
let stopped = false;

function psArgs(extra) {
  return ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-File', scriptPath, ...extra];
}

function start(onState, dir) {
  scriptPath = path.join(dir, 'musico-media.ps1');
  fs.writeFileSync(scriptPath, '﻿' + SCRIPT, 'utf8');
  stopped = false;
  const launch = () => {
    proc = spawn('powershell.exe', psArgs([]), { windowsHide: true });
    let buf = '';
    proc.stdout.setEncoding('utf8');
    proc.stdout.on('data', (d) => {
      buf += d;
      let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i).trim();
        buf = buf.slice(i + 1);
        if (!line) continue;
        try { const j = JSON.parse(line); onState(j.none ? null : j); } catch { /* ignore partial */ }
      }
    });
    proc.on('exit', () => { if (!stopped) setTimeout(launch, 3000); });
    proc.on('error', () => { if (!stopped) setTimeout(launch, 8000); });
  };
  launch();
}
function stop() { stopped = true; try { proc && proc.kill(); } catch {} }

function command(name, arg) {
  if (!scriptPath) return;
  execFile('powershell.exe', psArgs(['-Cmd', name, '-Arg', String(arg || 0)]), { windowsHide: true, timeout: 8000 }, () => {});
}

module.exports = { start, stop, command, SCRIPT };
