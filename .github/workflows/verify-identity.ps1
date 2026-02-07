# Identity Hygiene Verification Script
# Ensures no "omni" references exist outside allowed locations
# Usage: .\verify-identity.ps1

Write-Host "Running identity hygiene check..." -ForegroundColor Cyan

$excludeDirs = @(
    "node_modules",
    ".git",
    "dist",
    "build",
    "_ai_intake",
    "vendor"
)

$excludeFiles = @(
    "*.lock",
    "OMNIPLATFORM_*"
)

# Build exclusion pattern
$excludePattern = ($excludeDirs | ForEach-Object { [regex]::Escape($_) }) -join '|'

Write-Host "Searching for 'omni' references..." -ForegroundColor Yellow
Write-Host "Excluded directories: $($excludeDirs -join ', ')" -ForegroundColor Gray
Write-Host "Excluded files: $($excludeFiles -join ', ')" -ForegroundColor Gray
Write-Host ""

try {
    $matches = Get-ChildItem -Recurse -File -Exclude $excludeFiles |
        Where-Object { $_.FullName -notmatch $excludePattern } |
        Select-String -Pattern "omni" -CaseSensitive:$false |
        Where-Object { $_.Filename -notmatch "verify-identity" }

    if ($matches) {
        Write-Host "❌ FAIL: Found 'omni' references in:" -ForegroundColor Red
        Write-Host ""
        
        $matches | ForEach-Object {
            Write-Host "  $($_.Path):$($_.LineNumber) - $($_.Line.Trim())" -ForegroundColor Red
        }
        
        Write-Host ""
        Write-Host "Identity hygiene check failed. Please update these references." -ForegroundColor Red
        exit 1
    } else {
        Write-Host "✅ PASS: No 'omni' references found" -ForegroundColor Green
        Write-Host "Identity hygiene check passed!" -ForegroundColor Green
        exit 0
    }
} catch {
    Write-Host "❌ ERROR: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
