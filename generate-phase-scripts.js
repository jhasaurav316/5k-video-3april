#!/usr/bin/env node
// ============================================================================
// Generate Phase-wise Render Scripts (50 phases × ~100 videos = ~5010)
// ============================================================================
// Duration: 2:00-2:50 (120-170 seconds) with looping letter content
// GPU: NVENC h264_nvenc with CPU fallback
// ============================================================================

const path = require("path");
const fs = require("fs");

const BASE_DIR = __dirname;
const TOTAL_PHASES = 50;

// ============================================================================
// Discover all categories and their video counts
// ============================================================================
console.log("Scanning categories...\n");

const categories = [];
const dirs = fs.readdirSync(BASE_DIR).filter(d => {
  const fullPath = path.join(BASE_DIR, d);
  return fs.statSync(fullPath).isDirectory()
    && fs.existsSync(path.join(fullPath, "catalog.json"))
    && !["node_modules", "src", "out", "public", "dist", ".git"].includes(d);
}).sort();

for (const dir of dirs) {
  const catalog = JSON.parse(fs.readFileSync(path.join(BASE_DIR, dir, "catalog.json"), "utf-8"));
  const videos = Array.isArray(catalog) ? catalog : catalog.videos || [];
  const name = videos[0]?.title?.replace(/ - Part \d+$/, "") || dir;
  categories.push({ key: dir, name, count: videos.length });
}

const totalVideos = categories.reduce((sum, c) => sum + c.count, 0);
console.log(`Found ${categories.length} categories, ${totalVideos} total videos`);
console.log(`Distributing across ${TOTAL_PHASES} phases\n`);

// ============================================================================
// Distribute videos across phases (~100 per phase)
// ============================================================================
const videosPerPhase = Math.ceil(totalVideos / TOTAL_PHASES);

const PHASES = [];
let phaseNum = 1;
let phaseCategories = [];
let phaseCount = 0;
let catIdx = 0;
let catOffset = 0;

while (catIdx < categories.length) {
  const cat = categories[catIdx];
  const remaining = cat.count - catOffset;
  const spaceInPhase = videosPerPhase - phaseCount;

  if (remaining <= spaceInPhase) {
    // Entire remaining portion fits in this phase
    phaseCategories.push({ key: cat.key, name: cat.name, from: catOffset, to: cat.count });
    phaseCount += remaining;
    catOffset = 0;
    catIdx++;
  } else {
    // Split category across phases
    phaseCategories.push({ key: cat.key, name: cat.name, from: catOffset, to: catOffset + spaceInPhase });
    catOffset += spaceInPhase;
    phaseCount += spaceInPhase;
  }

  // Phase is full or we're at the end
  if (phaseCount >= videosPerPhase || catIdx >= categories.length) {
    PHASES.push({ phase: phaseNum, categories: phaseCategories });
    phaseNum++;
    phaseCategories = [];
    phaseCount = 0;
  }
}

// Verify totals
let totalCheck = 0;
for (const p of PHASES) {
  let phaseTotal = 0;
  for (const c of p.categories) {
    phaseTotal += c.to - c.from;
  }
  totalCheck += phaseTotal;
  console.log(`Phase ${p.phase}: ${phaseTotal} videos (${p.categories.map(c => `${c.to - c.from} ${c.name}`).join(" + ")})`);
}
console.log(`\nTotal: ${totalCheck} videos across ${PHASES.length} phases\n`);

// ============================================================================
// Generate each phase script
// ============================================================================
for (const phaseConfig of PHASES) {
  const phaseNum = phaseConfig.phase;
  const phaseTotal = phaseConfig.categories.reduce((sum, c) => sum + (c.to - c.from), 0);

  const catDescs = phaseConfig.categories.map(c => {
    const count = c.to - c.from;
    return `${count} ${c.name}`;
  }).join(" + ");

  const catalogEntries = phaseConfig.categories.map(c =>
    `    @{ Path = "${c.key}\\catalog.json"; Name = "${c.name}"; From = ${c.from}; To = ${c.to} }`
  ).join(",\n");

  const registerCategories = [...new Set(phaseConfig.categories.map(c => c.key))];
  const registerLines = registerCategories.map(k =>
    `node (Join-Path $ProjectDir "${k}\\register-compositions.js")`
  ).join("\n");

  const script = `# ============================================================================
# Phase ${phaseNum} - ${phaseTotal} Videos (${catDescs})
# ============================================================================
# Batch: 5k-video-3april | Each video: 2:00-2:50 (120-170 seconds)
# Usage: cd C:\\test\\5k-video-3april && .\\run-phase${phaseNum}.ps1
# ============================================================================

$ErrorActionPreference = "Stop"
$ProjectDir = $PSScriptRoot
$cpuCores = (Get-CimInstance Win32_Processor).NumberOfLogicalProcessors

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  PHASE ${phaseNum}: ${catDescs}" -ForegroundColor Cyan
Write-Host "  ${phaseTotal} Videos | Using $cpuCores CPU cores | Full HD (1080x1920)" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

Set-Location $ProjectDir

# ======================== STEP 1: GENERATE AUDIO ========================
Write-Host "  STEP 1: Generating Audio" -ForegroundColor Yellow
Write-Host ""

$Voice = "en-IN-NeerjaNeural"
$Rate = "-10%"
$Pitch = "+5Hz"

$catalogs = @(
${catalogEntries}
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
        $ffmpegCmd = "ffmpeg -y -f lavfi -i \`"sine=frequency=523.25:duration=$duration\`" -f lavfi -i \`"sine=frequency=659.25:duration=$duration\`" -f lavfi -i \`"sine=frequency=783.99:duration=$duration\`" -filter_complex \`"[0]volume=0.08,aformat=channel_layouts=mono[c];[1]volume=0.06,aformat=channel_layouts=mono[e];[2]volume=0.04,aformat=channel_layouts=mono[g];[c][e][g]amix=inputs=3:duration=longest,lowpass=f=2000,volume=0.5[out]\`" -map \`"[out]\`" \`"$bgmFile\`""
        cmd /c $ffmpegCmd 2>&1 | Out-Null
        $ErrorActionPreference = $prevEAP
    }
}

Write-Host "  Audio done!" -ForegroundColor Green
Write-Host ""

# ======================== STEP 2: REGISTER COMPOSITIONS ========================
Write-Host "  STEP 2: Registering Compositions" -ForegroundColor Yellow
${registerLines}
Write-Host "  Done!" -ForegroundColor Green
Write-Host ""

# ======================== STEP 2b: FIX ENTRY POINT ========================
Write-Host "  STEP 2b: Rebuilding Entry Point (index.ts)" -ForegroundColor Yellow
node (Join-Path $ProjectDir "fix-entry-point.js")
Write-Host ""

# ======================== STEP 3: RENDER VIDEOS ========================
Write-Host "  STEP 3: Rendering ${phaseTotal} Videos (2:00-2:50 each)" -ForegroundColor Yellow
Write-Host ""

$startTime = Get-Date
$rendered = 0
$skipped = 0
$failed = 0
$current = 0
$total = ${phaseTotal}

foreach ($cat in $catalogs) {
    $catPath = Join-Path $ProjectDir $cat.Path
    $folder = $cat.Path.Split('\\\\')[0]
    $json = Get-Content $catPath -Raw | ConvertFrom-Json
    $videos = if ($json -is [System.Array]) { $json } else { $json.videos }
    $subset = $videos[$cat.From..($cat.To - 1)]

    $outDir = Join-Path (Join-Path $ProjectDir "out") $folder
    if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir -Force | Out-Null }

    Write-Host "  --- $($cat.Name) ---" -ForegroundColor Magenta

    foreach ($video in $subset) {
        $current++
        $videoId = $video.id
        $compId = ($videoId -split '[-_\\s]+' | ForEach-Object { $_.Substring(0,1).ToUpper() + $_.Substring(1).ToLower() }) -join ''
        $outputFile = Join-Path $outDir "$videoId.mp4"

        if (Test-Path $outputFile) {
            $skipped++
            Write-Host "  [$current/$total] SKIP: $($video.title)" -ForegroundColor DarkYellow
            continue
        }

        $elapsed = (Get-Date) - $startTime
        Write-Host "  [$current/$total] $($video.title) [$($elapsed.ToString('hh\\:mm\\:ss'))]" -ForegroundColor Cyan

        $prevEAP = $ErrorActionPreference; $ErrorActionPreference = "Continue"
        npx remotion render src/index.ts $compId "$outputFile" --concurrency=$cpuCores --log=error --crf=18 --codec=h264 --gl=angle --enable-multiprocess-on-linux --port=3100 --bundle-cache=true
        $ErrorActionPreference = $prevEAP

        if ($LASTEXITCODE -eq 0) {
            $rendered++
            $fileSize = [math]::Round((Get-Item $outputFile).Length / 1MB, 1)
            Write-Host "    Done! (\${fileSize} MB)" -ForegroundColor Green
        } else {
            $failed++
            Write-Host "    FAILED!" -ForegroundColor Red
        }
    }
}

$elapsed = (Get-Date) - $startTime
Write-Host ""
Write-Host "================================================================" -ForegroundColor Green
Write-Host "  PHASE ${phaseNum} COMPLETE!" -ForegroundColor Green
Write-Host "  Rendered: $rendered | Skipped: $skipped | Failed: $failed" -ForegroundColor White
Write-Host "  Time: $($elapsed.ToString('hh\\:mm\\:ss'))" -ForegroundColor White
Write-Host "================================================================" -ForegroundColor Green
`;

  const scriptPath = path.join(BASE_DIR, `run-phase${phaseNum}.ps1`);
  fs.writeFileSync(scriptPath, script);
  console.log(`Generated run-phase${phaseNum}.ps1 (${phaseTotal} videos)`);
}

console.log(`\nAll ${PHASES.length} phase scripts generated!`);

// Generate summary
const summary = {
  batchName: "5k-video-3april",
  date: "2026-04-03",
  totalVideos: totalCheck,
  totalPhases: PHASES.length,
  totalCategories: categories.length,
  videosPerPhase: videosPerPhase,
  durationRange: "120-170 seconds (2:00-2:50)",
  categories: categories.map(c => ({ category: c.name, key: c.key, count: c.count })),
  phases: PHASES.map(p => ({
    phase: p.phase,
    videos: p.categories.reduce((s, c) => s + (c.to - c.from), 0),
    categories: p.categories.map(c => `${c.key}[${c.from}-${c.to}]`),
  })),
};
fs.writeFileSync(path.join(BASE_DIR, "summary.json"), JSON.stringify(summary, null, 2));
console.log("\nSummary saved to summary.json");
