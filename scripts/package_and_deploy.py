import os
import shutil
import zipfile
import ftplib
import time
import urllib.request
import ssl
import sys
import io

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
standalone = os.path.join(root, ".next", "standalone")

if not os.path.exists(standalone):
    print("ERROR: .next/standalone does not exist! Run npm run build first.")
    sys.exit(1)

print("1. Preparing standalone assets...")
public_src = os.path.join(root, "public")
public_dst = os.path.join(standalone, "public")
if os.path.exists(public_src):
    if os.path.exists(public_dst):
        shutil.rmtree(public_dst)
    shutil.copytree(public_src, public_dst)
    print("Copied public to standalone/public")

static_src = os.path.join(root, ".next", "static")
static_dst = os.path.join(standalone, ".next", "static")
if os.path.exists(static_src):
    if os.path.exists(static_dst):
        shutil.rmtree(static_dst)
    shutil.copytree(static_src, static_dst)
    print("Copied .next/static to standalone/.next/static")

# Do NOT overwrite server .env
for env_file in [".env", ".env.production", ".env.local"]:
    target = os.path.join(standalone, env_file)
    if os.path.exists(target):
        os.remove(target)

tmp_dir = os.path.join(standalone, "tmp")
os.makedirs(tmp_dir, exist_ok=True)
with open(os.path.join(tmp_dir, "restart.txt"), "w") as f:
    f.write(str(time.time()))

zip_file = os.path.join(root, "deploy.zip")
if os.path.exists(zip_file):
    os.remove(zip_file)

print("2. Creating deploy.zip...")
with zipfile.ZipFile(zip_file, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as zipf:
    for dirpath, dirnames, filenames in os.walk(standalone):
        for filename in filenames:
            file_path = os.path.join(dirpath, filename)
            rel_path = os.path.relpath(file_path, standalone)
            zipf.write(file_path, rel_path)

file_size = os.path.getsize(zip_file)
print(f"deploy.zip created: {file_size / (1024*1024):.2f} MB")

print("3. Connecting to FTP...")
ftp = ftplib.FTP('ftp.pondokmatoa.id', timeout=60)
ftp.login('kinerjapb@pondokmatoa.id', 'B&np^-gV8gWh=Bgg')

php_deploy = """<?php
header('Content-Type: text/plain');
ini_set('display_errors', 1);
ini_set('max_execution_time', 600);
error_reporting(E_ALL);

$zipPath = '/home/pondokm8/public_html/kinerjapb.pondokmatoa.id/deploy.zip';
if (!file_exists($zipPath)) {
    $zipPath = __DIR__ . '/deploy.zip';
}

if (!file_exists($zipPath)) {
    die("ERROR: deploy.zip not found\\n");
}

$target = '/home/pondokm8/kinerjapb.pondokmatoa.id';
echo "Extracting deploy.zip (" . round(filesize($zipPath) / 1024 / 1024, 2) . " MB) to $target...\\n";

$cmd = "unzip -o " . escapeshellarg($zipPath) . " -d " . escapeshellarg($target) . " 2>&1";
$out = shell_exec($cmd);
if ($out && strpos($out, 'inflating') !== false) {
    echo "Unzipped via CLI successfully.\\n";
} else {
    $zip = new ZipArchive();
    if ($zip->open($zipPath) === TRUE) {
        $zip->extractTo($target);
        $zip->close();
        echo "Extracted via ZipArchive.\\n";
    } else {
        echo "Failed to open zip.\\n";
    }
}

// Touch restart.txt
@mkdir("$target/tmp", 0755, true);
file_put_contents("$target/tmp/restart.txt", time());
@unlink($zipPath);

echo "SUCCESSFULLY_DEPLOYED\\n";
?>"""

ftp.storbinary('STOR do_deploy.php', io.BytesIO(php_deploy.encode('utf-8')))
print("do_deploy.php uploaded")

print("4. Uploading deploy.zip...")
uploaded = 0
last_pct = -1
start_time = time.time()

def progress_callback(chunk):
    global uploaded, last_pct
    uploaded += len(chunk)
    pct = int((uploaded / file_size) * 100)
    if pct != last_pct and pct % 10 == 0:
        elapsed = time.time() - start_time
        speed = (uploaded / 1024) / elapsed if elapsed > 0 else 0
        print(f"Upload: {pct}% ({uploaded / (1024*1024):.1f} MB) - {speed:.1f} KB/s")
        last_pct = pct

with open(zip_file, 'rb') as f:
    ftp.storbinary('STOR deploy.zip', f, blocksize=65536, callback=progress_callback)

ftp.quit()
print(f"deploy.zip uploaded in {time.time() - start_time:.1f}s")

print("5. Triggering extraction...")
ctx = ssl._create_unverified_context()
req = urllib.request.Request('https://kinerjapb.pondokmatoa.id/do_deploy.php')
with urllib.request.urlopen(req, context=ctx, timeout=120) as res:
    print(res.read().decode('utf-8'))

print("Deployment complete!")
