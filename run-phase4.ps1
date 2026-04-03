# ============================================================================
# Phase 4 - 101 Videos (27 Baked Goods + 30 Bath Time + 30 Bathroom Items + 14 Beach & Seaside)
# ============================================================================
# Batch: 5k-video-3april | Each video: 2:00-2:50 (120-170 seconds)
# Usage: cd C:\test\5k-video-3april && .\run-phase4.ps1
# ============================================================================

$ErrorActionPreference = "Stop"
$ProjectDir = $PSScriptRoot

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  PHASE 4: 27 Baked Goods + 30 Bath Time + 30 Bathroom Items + 14 Beach & Seaside" -ForegroundColor Cyan
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
    @{ Path = "baked-goods\catalog.json"; Name = "Baked Goods"; From = 3; To = 30 },
    @{ Path = "bath-time\catalog.json"; Name = "Bath Time"; From = 0; To = 30 },
    @{ Path = "bathroom-items\catalog.json"; Name = "Bathroom Items"; From = 0; To = 30 },
    @{ Path = "beach\catalog.json"; Name = "Beach & Seaside"; From = 0; To = 14 }
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
node (Join-Path $ProjectDir "baked-goods\register-compositions.js")
node (Join-Path $ProjectDir "bath-time\register-compositions.js")
node (Join-Path $ProjectDir "bathroom-items\register-compositions.js")
node (Join-Path $ProjectDir "beach\register-compositions.js")
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

        # Step A: Render frames as JPEG sequence (CPU at 75%)
        $framesDir = Join-Path $outDir "$videoId-frames"
        if (-not (Test-Path $framesDir)) { New-Item -ItemType Directory -Path $framesDir -Force | Out-Null }

        $prevEAP = $ErrorActionPreference; $ErrorActionPreference = "Continue"
        npx remotion render $compId $framesDir --concurrency=75% --log=error --gl=angle --image-format=jpeg --jpeg-quality=90 --sequence
        $renderExit = $LASTEXITCODE

        if ($renderExit -eq 0) {
            # Step B: Encode with FFmpeg NVENC (GPU accelerated)
            Write-Host "    Encoding with GPU (NVENC)..." -ForegroundColor Yellow
            $audioFile = Join-Path (Join-Path $ProjectDir "public") "$videoId-audio\bgm.mp3"
            ffmpeg -y -framerate 30 -i "$framesDir\frame%d.jpeg" -i "$audioFile" -c:v h264_nvenc -preset p4 -cq 20 -b:v 8M -c:a aac -b:a 128k -shortest "$outputFile" -loglevel error 2>&1 | Out-Null

            if ($LASTEXITCODE -eq 0) {
                $rendered++
                $fileSize = [math]::Round((Get-Item $outputFile).Length / 1MB, 1)
                Write-Host "    Done! (${fileSize} MB)" -ForegroundColor Green
            } else {
                Write-Host "    NVENC failed, falling back to CPU..." -ForegroundColor Yellow
                ffmpeg -y -framerate 30 -i "$framesDir\frame%d.jpeg" -i "$audioFile" -c:v libx264 -crf 18 -preset fast -c:a aac -b:a 128k -shortest "$outputFile" -loglevel error 2>&1 | Out-Null
                if ($LASTEXITCODE -eq 0) {
                    $rendered++
                    $fileSize = [math]::Round((Get-Item $outputFile).Length / 1MB, 1)
                    Write-Host "    Done! (${fileSize} MB) [CPU fallback]" -ForegroundColor Green
                } else {
                    $failed++
                    Write-Host "    FAILED!" -ForegroundColor Red
                }
            }
            Remove-Item -Recurse -Force $framesDir -ErrorAction SilentlyContinue
        } else {
            $failed++
            Write-Host "    FAILED (frame render)!" -ForegroundColor Red
            Remove-Item -Recurse -Force $framesDir -ErrorAction SilentlyContinue
        }
        $ErrorActionPreference = $prevEAP
    }
}

$elapsed = (Get-Date) - $startTime
Write-Host ""
Write-Host "================================================================" -ForegroundColor Green
Write-Host "  PHASE 4 COMPLETE!" -ForegroundColor Green
Write-Host "  Rendered: $rendered | Skipped: $skipped | Failed: $failed" -ForegroundColor White
Write-Host "  Time: $($elapsed.ToString('hh\:mm\:ss'))" -ForegroundColor White
Write-Host "================================================================" -ForegroundColor Green
