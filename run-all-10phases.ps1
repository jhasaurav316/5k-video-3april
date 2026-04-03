# ============================================================================
# Run Phase 1 to 10 (approx 1010 videos)
# ============================================================================

$startTime = Get-Date

for ($i = 1; $i -le 10; $i++) {
    Write-Host "`n========== STARTING PHASE $i of 10 ==========" -ForegroundColor Yellow
    & "$PSScriptRoot\run-phase$i.ps1"
    Write-Host "========== PHASE $i DONE ==========`n" -ForegroundColor Green
}

$elapsed = (Get-Date) - $startTime
Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  ALL 10 PHASES COMPLETE!" -ForegroundColor Cyan
Write-Host "  Total Time: $($elapsed.ToString('hh\:mm\:ss'))" -ForegroundColor White
Write-Host "================================================================" -ForegroundColor Cyan
