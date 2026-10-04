#!/usr/bin/env pwsh
# Migration Script: Supabase से Google Cloud SQL में data transfer करना
# Windows PowerShell में चलाने के लिए

Write-Host "🔄 Dairy Walla - Supabase to Google Cloud SQL Migration" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan

# Configuration
$SupabaseHost = Read-Host "Supabase Host (db.YOUR_PROJECT.supabase.co)"
$SupabaseUser = "postgres"
$SupabasePassword = Read-Host "Supabase Password" -AsSecureString
$SupabaseDB = "postgres"

$GoogleCloudIP = Read-Host "Google Cloud SQL Public IP"
$GoogleCloudUser = "postgres"
$GoogleCloudPassword = Read-Host "Google Cloud SQL Password" -AsSecureString
$GoogleCloudDB = "dairy_walla_db"

# Convert secure strings to plain text for pg_dump
$SupabasePasswordPlain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToCoTaskMemUnicode($SupabasePassword))
$GoogleCloudPasswordPlain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToCoTaskMemUnicode($GoogleCloudPassword))

# Backup file names
$BackupFile = "dairy_supabase_backup_$(Get-Date -Format 'yyyy-MM-dd_HHmmss').sql"
$LogFile = "migration_$(Get-Date -Format 'yyyy-MM-dd_HHmmss').log"

Write-Host "`n📝 Backup details:" -ForegroundColor Yellow
Write-Host "   Backup file: $BackupFile"
Write-Host "   Log file: $LogFile"

# Step 1: Backup Supabase
Write-Host "`n1️⃣ Supabase से backup ले रहे हैं..." -ForegroundColor Green
try {
    $env:PGPASSWORD = $SupabasePasswordPlain
    $PgDumpPath = "C:\Program Files\PostgreSQL\15\bin\pg_dump.exe"
    
    if (!(Test-Path $PgDumpPath)) {
        Write-Host "⚠️ PostgreSQL Client Tools नहीं मिल रहे।" -ForegroundColor Yellow
        Write-Host "   pg_dump को download करें या PostgreSQL install करें:" -ForegroundColor Yellow
        Write-Host "   https://www.postgresql.org/download/windows/" -ForegroundColor Cyan
        exit 1
    }
    
    & $PgDumpPath -h $SupabaseHost -U $SupabaseUser -d $SupabaseDB `
        --verbose --format=plain --no-password > $BackupFile 2>&1
    
    Write-Host "✅ Backup successful: $BackupFile" -ForegroundColor Green
} catch {
    Write-Host "❌ Backup failed: $_" -ForegroundColor Red
    exit 1
}

# Step 2: Verify backup
Write-Host "`n2️⃣ Backup को verify कर रहे हैं..." -ForegroundColor Green
if (Test-Path $BackupFile) {
    $BackupSize = (Get-Item $BackupFile).Length / 1MB
    Write-Host "✅ Backup file size: $([Math]::Round($BackupSize, 2)) MB" -ForegroundColor Green
} else {
    Write-Host "❌ Backup file नहीं मिल रही!" -ForegroundColor Red
    exit 1
}

# Step 3: Upload to Google Cloud SQL
Write-Host "`n3️⃣ Google Cloud SQL में data restore कर रहे हैं..." -ForegroundColor Green
try {
    $env:PGPASSWORD = $GoogleCloudPasswordPlain
    $PsqlPath = "C:\Program Files\PostgreSQL\15\bin\psql.exe"
    
    if (!(Test-Path $PsqlPath)) {
        Write-Host "⚠️ psql command नहीं मिल रहा।" -ForegroundColor Yellow
        Write-Host "   PostgreSQL Client Tools install करें" -ForegroundColor Yellow
        exit 1
    }
    
    # First, create required extensions
    Write-Host "   Extensions setup कर रहे हैं..."
    & $PsqlPath -h $GoogleCloudIP -U $GoogleCloudUser -d $GoogleCloudDB `
        -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";" `
        -c "CREATE EXTENSION IF NOT EXISTS \"pgcrypto\";" `
        --no-password
    
    # Then restore the database
    Write-Host "   Data restore कर रहे हैं (यह कुछ मिनट ले सकता है)..."
    & $PsqlPath -h $GoogleCloudIP -U $GoogleCloudUser -d $GoogleCloudDB `
        --no-password < $BackupFile 2>&1 | Tee-Object -FilePath $LogFile
    
    Write-Host "✅ Restore successful!" -ForegroundColor Green
} catch {
    Write-Host "❌ Restore failed: $_" -ForegroundColor Red
    Write-Host "   Log देखें: $LogFile" -ForegroundColor Yellow
    exit 1
}

# Step 4: Verify migration
Write-Host "`n4️⃣ Migration को verify कर रहे हैं..." -ForegroundColor Green
try {
    $env:PGPASSWORD = $GoogleCloudPasswordPlain
    $TableCount = & $PsqlPath -h $GoogleCloudIP -U $GoogleCloudUser -d $GoogleCloudDB `
        -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';" `
        --no-password
    
    Write-Host "✅ Google Cloud में कुल tables: $($TableCount.Trim())" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Verification failed (लेकिन migration हो सकता है successful हो)" -ForegroundColor Yellow
}

# Step 5: Summary
Write-Host "`n✨ Migration Complete!" -ForegroundColor Green
Write-Host "======================================================" -ForegroundColor Green
Write-Host "
अगले Steps:
1. अपने .env में DATABASE_URL update करें:
   DATABASE_URL='postgresql://postgres:$GoogleCloudPasswordPlain@$GoogleCloudIP:5432/$GoogleCloudDB'

2. अपनी application को test करें:
   npm run build:api
   npm run start:api

3. Supabase को cancel करें (optional, पर पैसे बचाने के लिए अच्छा है)

Backup file: $BackupFile (सुरक्षित रखें!)
Log file: $LogFile
" -ForegroundColor Cyan

# Cleanup
$env:PGPASSWORD = $null
