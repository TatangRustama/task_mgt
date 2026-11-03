# Script Otomasi Deployment ke Server Online (Branch: prod)
param (
    [switch]$MigrateDb,
    [switch]$SkipPush
)

$ErrorActionPreference = "Stop"
$SSH_KEY = "$env:USERPROFILE\.ssh\task_mgt_devops_ims"
$SSH_HOST = "45.76.154.46"
$SSH_PORT = "29453"
$SSH_USER = "task_mgt_devops"

Write-Host "=== Memulai Prosedur Deployment Kinerja (SiapTugas) ===" -ForegroundColor Cyan

if (-not (Test-Path $SSH_KEY)) {
    Write-Error "SSH Private Key tidak ditemukan di $SSH_KEY"
    exit 1
}

if (-not $SkipPush) {
    Write-Host "1. Mengunggah commit ke GitHub (branch: prod)..." -ForegroundColor Yellow
    $currentBranch = (git branch --show-current).Trim()
    if ($currentBranch -ne "prod") {
        Write-Host "   (Posisi saat ini di branch '$currentBranch'. Menyinkronkan branch prod...)"
        git checkout prod
        git merge $currentBranch
    }
    git push origin prod
    Write-Host "   Commit berhasil di-push ke origin/prod." -ForegroundColor Green
} else {
    Write-Host "1. Melewati langkah git push (-SkipPush aktif)." -ForegroundColor Gray
}

Write-Host "2. Menarik pembaruan di server online & rebuild kontainer..." -ForegroundColor Yellow
$remoteCmd = "cd ~/task_mgt/app && git pull origin prod && sudo /usr/local/sbin/task-mgt-docker deploy"
if ($MigrateDb) {
    $remoteCmd += " && sudo /usr/local/sbin/task-mgt-docker migrate"
}

ssh -i $SSH_KEY -p $SSH_PORT -o BatchMode=yes -o StrictHostKeyChecking=accept-new "$SSH_USER@$SSH_HOST" $remoteCmd

Write-Host "3. Memeriksa status kesehatan aplikasi..." -ForegroundColor Yellow
ssh -i $SSH_KEY -p $SSH_PORT -o BatchMode=yes "$SSH_USER@$SSH_HOST" "sudo /usr/local/sbin/task-mgt-docker status && curl -s http://127.0.0.1:3002/api/health"

Write-Host "`n=== Deployment Selesai! ===" -ForegroundColor Green
Write-Host "Aplikasi dapat diakses di: https://siaptugas.dev-ims.net`n" -ForegroundColor Cyan
