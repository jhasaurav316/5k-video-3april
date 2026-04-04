# ============================================================================
# Generate ALL Audio for 5010 Videos (run separately from video render)
# ============================================================================
# Skips already generated audio. Run this in a separate PowerShell window
# while video rendering runs in another window.
# Usage: cd C:\test\5k-video-3april && .\generate-all-audio.ps1
# ============================================================================

$ErrorActionPreference = "Stop"
$ProjectDir = $PSScriptRoot

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  GENERATING ALL AUDIO (5010 videos)" -ForegroundColor Cyan
Write-Host "  Skips existing audio. Run alongside video render." -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

Set-Location $ProjectDir

$Voice = "en-IN-NeerjaNeural"
$Rate = "-10%"
$Pitch = "+5Hz"

# Find all category folders with catalog.json
$categoryDirs = Get-ChildItem -Directory $ProjectDir | Where-Object {
    (Test-Path (Join-Path $_.FullName "catalog.json")) -and
    $_.Name -notin @("node_modules", "src", "out", "public", "dist", ".git")
} | Sort-Object Name

$startTime = Get-Date
$totalVideos = 0
$generated = 0
$skipped = 0
$failed = 0

# Count total first
foreach ($catDir in $categoryDirs) {
    $catPath = Join-Path $catDir.FullName "catalog.json"
    $json = Get-Content $catPath -Raw | ConvertFrom-Json
    $videos = if ($json -is [System.Array]) { $json } else { $json.videos }
    $totalVideos += $videos.Count
}

Write-Host "  Found $($categoryDirs.Count) categories, $totalVideos total videos" -ForegroundColor White
Write-Host ""

$current = 0

foreach ($catDir in $categoryDirs) {
    $catPath = Join-Path $catDir.FullName "catalog.json"
    $json = Get-Content $catPath -Raw | ConvertFrom-Json
    $videos = if ($json -is [System.Array]) { $json } else { $json.videos }

    $catName = $catDir.Name
    Write-Host "  --- $catName ($($videos.Count) videos) ---" -ForegroundColor Magenta

    foreach ($video in $videos) {
        $current++
        $videoId = $video.id
        $audioDir = Join-Path (Join-Path $ProjectDir "public") "$videoId-audio"

        # Skip if already generated
        if (Test-Path $audioDir) {
            $skipped++
            continue
        }

        $elapsed = (Get-Date) - $startTime
        Write-Host "  [$current/$totalVideos] Audio: $videoId [$($elapsed.ToString('hh\:mm\:ss'))]" -ForegroundColor Cyan
        New-Item -ItemType Directory -Path $audioDir -Force | Out-Null

        $items = $video.items
        if (-not $items) { $items = $video.letters }

        $audioFailed = $false
        for ($i = 0; $i -lt $items.Count; $i++) {
            $item = $items[$i]
            $text = "$($item.letter) for $($item.word)"
            $outFile = Join-Path $audioDir "letter_$i.mp3"
            $prevEAP = $ErrorActionPreference; $ErrorActionPreference = "Continue"
            edge-tts --voice $Voice --rate="$Rate" --pitch="$Pitch" --text "$text" --write-media "$outFile" 2>&1 | Out-Null
            if ($LASTEXITCODE -ne 0) { $audioFailed = $true }
            $ErrorActionPreference = $prevEAP
        }

        # BGM
        $duration = $video.targetDuration
        $bgmFile = Join-Path $audioDir "bgm.mp3"
        $prevEAP = $ErrorActionPreference; $ErrorActionPreference = "Continue"
        $ffmpegCmd = "ffmpeg -y -f lavfi -i `"sine=frequency=523.25:duration=$duration`" -f lavfi -i `"sine=frequency=659.25:duration=$duration`" -f lavfi -i `"sine=frequency=783.99:duration=$duration`" -filter_complex `"[0]volume=0.08,aformat=channel_layouts=mono[c];[1]volume=0.06,aformat=channel_layouts=mono[e];[2]volume=0.04,aformat=channel_layouts=mono[g];[c][e][g]amix=inputs=3:duration=longest,lowpass=f=2000,volume=0.5[out]`" -map `"[out]`" `"$bgmFile`""
        cmd /c $ffmpegCmd 2>&1 | Out-Null
        $ErrorActionPreference = $prevEAP

        if ($audioFailed) {
            $failed++
        } else {
            $generated++
        }
    }
}

$elapsed = (Get-Date) - $startTime
Write-Host ""
Write-Host "================================================================" -ForegroundColor Green
Write-Host "  ALL AUDIO COMPLETE!" -ForegroundColor Green
Write-Host "  Generated: $generated | Skipped: $skipped | Failed: $failed" -ForegroundColor White
Write-Host "  Time: $($elapsed.ToString('hh\:mm\:ss'))" -ForegroundColor White
Write-Host "================================================================" -ForegroundColor Green
