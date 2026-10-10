param(
  [string]$FfmpegPath = '',
  [string]$VoiceName = 'Microsoft Zira Desktop - English (United States)',
  [switch]$Force
)

# Windows SAPI 本机合成：仅处理公开原创课程，不发送文本到云端。
# 依赖：Windows 英语桌面语音、ffmpeg；也支持 python -m pip install imageio-ffmpeg。
$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path $PSScriptRoot -Parent
$audioRoot = Join-Path $taskRoot 'public/audio'
$manifestPath = Join-Path $taskRoot 'src/data/course-audio.json'
$utf8 = New-Object System.Text.UTF8Encoding($false)

if (-not $FfmpegPath) {
  $ffmpegCommand = Get-Command ffmpeg -ErrorAction SilentlyContinue
  if ($ffmpegCommand) { $FfmpegPath = $ffmpegCommand.Source }
  else {
    $FfmpegPath = (& python -c 'import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())' | Select-Object -Last 1)
    if ($LASTEXITCODE -ne 0) { throw '请安装 ffmpeg，或执行 python -m pip install imageio-ffmpeg。' }
  }
}
if (-not (Test-Path -LiteralPath $FfmpegPath -PathType Leaf)) { throw '找不到 ffmpeg 可执行文件。' }

$voice = New-Object -ComObject SAPI.SpVoice
$selectedVoice = @($voice.GetVoices() | Where-Object { $_.GetDescription() -eq $VoiceName })
if ($selectedVoice.Count -ne 1) { throw "找不到指定的 Windows 英语语音：$VoiceName" }
$voice.Voice = $selectedVoice[0]
$voice.Rate = 0
$voice.Volume = 100

$courses = Get-Content (Join-Path $taskRoot 'src/data/curriculum.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$texts = New-Object 'System.Collections.Generic.HashSet[string]' ([System.StringComparer]::Ordinal)
foreach ($course in $courses) {
  foreach ($word in $course.vocabulary) { [void]$texts.Add([string]$word.word) }
  [void]$texts.Add([string]$course.listening.text)
}
if ($texts.Count -eq 0 -or $texts.Contains('')) { throw '课程中存在空音频文本，或课程为空。' }
[void](New-Item -ItemType Directory -Force -Path $audioRoot)
$manifest = [ordered]@{}
$generated = 0
$totalBytes = [long]0
$sha = [System.Security.Cryptography.SHA256]::Create()

try {
  foreach ($text in ($texts | Sort-Object -CaseSensitive)) {
    # 声音、速度、编码参数均参与内容哈希；调整配置会生成新的缓存地址。
    $identity = "$VoiceName`nrate=0;mono=1;sample=22050;bitrate=64k;v=1`n$text"
    $hash = ([BitConverter]::ToString($sha.ComputeHash($utf8.GetBytes($identity)))).Replace('-', '').ToLowerInvariant().Substring(0, 16)
    $target = Join-Path $audioRoot "$hash.mp3"
    if ($Force -or -not (Test-Path -LiteralPath $target)) {
      $temporaryBase = Join-Path ([System.IO.Path]::GetTempPath()) ([Guid]::NewGuid().ToString('N'))
      $wav = "$temporaryBase.wav"
      $mp3 = "$temporaryBase.mp3"
      $stream = New-Object -ComObject SAPI.SpFileStream
      try {
        $stream.Format.Type = 22 # SAFT22kHz16BitMono
        $stream.Open($wav, 3, $false) # SSFMCreateForWrite
        $voice.AudioOutputStream = $stream
        [void]$voice.Speak($text, 16) # SVSFIsNotXML：原文中的符号不解释为 SSML。
        $stream.Close()
        & $FfmpegPath -nostdin -hide_banner -loglevel error -y -i $wav -ac 1 -ar 22050 -codec:a libmp3lame -b:a 64k -map_metadata -1 $mp3
        if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $mp3)) { throw "音频编码失败：$hash" }
        Move-Item -LiteralPath $mp3 -Destination $target -Force
        $generated++
      }
      finally {
        try { $stream.Close() } catch { }
        [void][System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($stream)
        foreach ($temporaryFile in @($wav, $mp3)) {
          if (Test-Path -LiteralPath $temporaryFile) { Remove-Item -LiteralPath $temporaryFile -Force }
        }
      }
    }
    if ((Get-Item -LiteralPath $target).Length -lt 512) { throw "音频文件过小：$hash" }
    # 每个文件完整解码验证；任意失败均不发布新的 manifest。
    & $FfmpegPath -nostdin -hide_banner -loglevel error -i $target -f null -
    if ($LASTEXITCODE -ne 0) { throw "音频解码验证失败：$hash" }
    $manifest[$text] = "audio/$hash.mp3"
    $totalBytes += (Get-Item -LiteralPath $target).Length
  }
  $manifestTemporary = "$manifestPath.tmp"
  [System.IO.File]::WriteAllText($manifestTemporary, ($manifest | ConvertTo-Json -Depth 3), $utf8)
  Move-Item -LiteralPath $manifestTemporary -Destination $manifestPath -Force
  [pscustomobject]@{ Courses = $courses.Count; UniqueAudio = $manifest.Count; Generated = $generated; Bytes = $totalBytes; DecodeValidation = '全部通过'; Voice = $VoiceName } | ConvertTo-Json
}
finally {
  $sha.Dispose()
  [void][System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($voice)
}
