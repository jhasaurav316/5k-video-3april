# ============================================================================
# Phase 3 - 101 Videos (8 Autumn Words + 30 Baby Animals + 30 Baby Words + 30 Backyard Items + 3 Baked Goods)
# ============================================================================
# Batch: 5k-video-3april | Each video: 2:00-2:50 (120-170 seconds)
# Usage: cd C:\test\5k-video-3april && .\run-phase3.ps1
# ============================================================================

$ErrorActionPreference = "Stop"
$ProjectDir = $PSScriptRoot

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  PHASE 3: 8 Autumn Words + 30 Baby Animals + 30 Baby Words + 30 Backyard Items + 3 Baked Goods" -ForegroundColor Cyan
Write-Host "  101 Videos | 2:00-2:50 each | Full HD (1080x1920)" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

Set-Location $ProjectDir

# ======================== STEP 0: FIX ENTRY POINT ========================
Write-Host "  STEP 0: Verifying Entry Point" -ForegroundColor Yellow
node (Join-Path $ProjectDir "fix-entry-point.js")
Write-Host ""

# ======================== STEP 1: GENERATE AUDIO ========================
Write-Host "  STEP 1: Generating Audio" -ForegroundColor Yellow
Write-Host ""

$Voice = "en-IN-NeerjaNeural"
$Rate = "-10%"
$Pitch = "+5Hz"

$catalogs = @(
    @{ Path = "autumn-words\catalog.json"; Name = "Autumn Words"; From = 22; To = 30 },
    @{ Path = "baby-animals\catalog.json"; Name = "Baby Animals"; From = 0; To = 30 },
    @{ Path = "baby-words\catalog.json"; Name = "Baby Words"; From = 0; To = 30 },
    @{ Path = "backyard-items\catalog.json"; Name = "Backyard Items"; From = 0; To = 30 },
    @{ Path = "baked-goods\catalog.json"; Name = "Baked Goods"; From = 0; To = 3 }
)

$audioTotal = 0
$audioDone = 0

foreach ($cat in $catalogs) {
    $catPath = Join-Path $ProjectDir $cat.Path
    $json = Get-Content $catPath -Raw | ConvertFrom-Json
    $videos = if ($json -is [System.Array]) { $json } else { $json.videos }
    $subset = $videos[$cat.From..($cat.To - 1)]
    $audioTotal += $subset.Count
}

foreach ($cat in $catalogs) {
    $catPath = Join-Path $ProjectDir $cat.Path
    $json = Get-Content $catPath -Raw | ConvertFrom-Json
    $videos = if ($json -is [System.Array]) { $json } else { $json.videos }
    $subset = $videos[$cat.From..($cat.To - 1)]

    Write-Host "  --- $($cat.Name) ($($subset.Count) videos) ---" -ForegroundColor Magenta

    foreach ($video in $subset) {
        $audioDone++
        $videoId = $video.id
        $audioDir = Join-Path (Join-Path $ProjectDir "public") "$videoId-audio"

        if (Test-Path $audioDir) {
            Write-Host "  [$audioDone/$audioTotal] SKIP: $videoId" -ForegroundColor DarkYellow
            continue
        }

        Write-Host "  [$audioDone/$audioTotal] Audio: $videoId" -ForegroundColor Cyan
        New-Item -ItemType Directory -Path $audioDir -Force | Out-Null

        $items = $video.items
        if (-not $items) { $items = $video.letters }

        for ($i = 0; $i -lt $items.Count; $i++) {
            $item = $items[$i]
            $text = "$($item.letter) for $($item.word)"
            $outFile = Join-Path $audioDir "letter_$i.mp3"
            $prevEAP = $ErrorActionPreference; $ErrorActionPreference = "Continue"
            edge-tts --voice $Voice --rate="$Rate" --pitch="$Pitch" --text "$text" --write-media "$outFile" 2>&1 | Out-Null
            $ErrorActionPreference = $prevEAP
        }

        # BGM duration = per-video targetDuration (120-170 seconds)
        $duration = $video.targetDuration
        $bgmFile = Join-Path $audioDir "bgm.mp3"
        $prevEAP = $ErrorActionPreference; $ErrorActionPreference = "Continue"
        $ffmpegCmd = "ffmpeg -y -f lavfi -i `"sine=frequency=523.25:duration=$duration`" -f lavfi -i `"sine=frequency=659.25:duration=$duration`" -f lavfi -i `"sine=frequency=783.99:duration=$duration`" -filter_complex `"[0]volume=0.08,aformat=channel_layouts=mono[c];[1]volume=0.06,aformat=channel_layouts=mono[e];[2]volume=0.04,aformat=channel_layouts=mono[g];[c][e][g]amix=inputs=3:duration=longest,lowpass=f=2000,volume=0.5[out]`" -map `"[out]`" `"$bgmFile`""
        cmd /c $ffmpegCmd 2>&1 | Out-Null
        $ErrorActionPreference = $prevEAP
    }
}

Write-Host "  Audio done!" -ForegroundColor Green
Write-Host ""

# ======================== STEP 2: REGISTER COMPOSITIONS ========================
Write-Host "  STEP 2: Registering Compositions" -ForegroundColor Yellow
node (Join-Path $ProjectDir "autumn-words\register-compositions.js")
node (Join-Path $ProjectDir "baby-animals\register-compositions.js")
node (Join-Path $ProjectDir "baby-words\register-compositions.js")
node (Join-Path $ProjectDir "backyard-items\register-compositions.js")
node (Join-Path $ProjectDir "baked-goods\register-compositions.js")
Write-Host "  Done!" -ForegroundColor Green
Write-Host ""

# ======================== STEP 3: RENDER VIDEOS ========================
Write-Host "  STEP 3: Rendering 101 Videos (2:00-2:50 each)" -ForegroundColor Yellow
Write-Host ""

$startTime = Get-Date
$rendered = 0
$skipped = 0
$failed = 0
$current = 0
$total = 101

foreach ($cat in $catalogs) {
    $catPath = Join-Path $ProjectDir $cat.Path
    $folder = $cat.Path.Split('\\')[0]
    $json = Get-Content $catPath -Raw | ConvertFrom-Json
    $videos = if ($json -is [System.Array]) { $json } else { $json.videos }
    $subset = $videos[$cat.From..($cat.To - 1)]

    $outDir = Join-Path (Join-Path $ProjectDir "out") $folder
    if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir -Force | Out-Null }

    Write-Host "  --- $($cat.Name) ---" -ForegroundColor Magenta

    foreach ($video in $subset) {
        $current++
        $videoId = $video.id
        $compId = ($videoId -split '[-_\s]+' | ForEach-Object { $_.Substring(0,1).ToUpper() + $_.Substring(1).ToLower() }) -join ''
        $outputFile = Join-Path $outDir "$videoId.mp4"

        if (Test-Path $outputFile) {
            $skipped++
            Write-Host "  [$current/$total] SKIP: $($video.title)" -ForegroundColor DarkYellow
            continue
        }

        $elapsed = (Get-Date) - $startTime
        Write-Host "  [$current/$total] $($video.title) [$($elapsed.ToString('hh\:mm\:ss'))]" -ForegroundColor Cyan

        $prevEAP = $ErrorActionPreference; $ErrorActionPreference = "Continue"
        npx remotion render src/index.ts $compId "$outputFile" --concurrency=100% --log=error --crf=18 --codec=h264 --gl=angle --port=3100
        $ErrorActionPreference = $prevEAP

        if ($LASTEXITCODE -eq 0) {
            $rendered++
            $fileSize = [math]::Round((Get-Item $outputFile).Length / 1MB, 1)
            Write-Host "    Done! (${fileSize} MB)" -ForegroundColor Green
        } else {
            $failed++
            Write-Host "    FAILED!" -ForegroundColor Red
        }
    }
}

$elapsed = (Get-Date) - $startTime
Write-Host ""
Write-Host "================================================================" -ForegroundColor Green
Write-Host "  PHASE 3 COMPLETE!" -ForegroundColor Green
Write-Host "  Rendered: $rendered | Skipped: $skipped | Failed: $failed" -ForegroundColor White
Write-Host "  Time: $($elapsed.ToString('hh\:mm\:ss'))" -ForegroundColor White
Write-Host "================================================================" -ForegroundColor Green
