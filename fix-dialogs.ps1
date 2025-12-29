# Fix DialogDescription in all component files

$files = @(
    "src/components/OrderManagement.tsx",
    "src/components/InventoryManagement.tsx",
    "src/components/CheckManagement.tsx",
    "src/components/CostAnalysis.tsx",
    "src/components/MarketingManagement.tsx",
    "src/components/MeterReadingManagement.tsx",
    "src/components/MonthlyStatementPage.tsx",
    "src/components/StaffManagement.tsx",
    "src/components/CallRecordsPage.tsx"
)

$baseDir = "C:/Users/tian7/OneDrive/Desktop/媽媽ios/"

foreach ($file in $files) {
    $filePath = Join-Path $baseDir $file
    if (Test-Path $filePath) {
        $content = Get-Content $filePath -Raw -Encoding UTF8
        
        # Add DialogDescription to import if not already present
        if ($content -match 'import \{ .* DialogHeader, DialogTitle,.* \} from ''@/components/ui/dialog''') {
            $content = $content -replace '(import \{ .* DialogHeader, DialogTitle,)(.* \} from ''@/components/ui/dialog'')', '$1 DialogDescription,$2'
        }
        
        Set-Content $filePath $content -Encoding UTF8 -NoNewline
        Write-Host "Updated import in $file"
    }
}
