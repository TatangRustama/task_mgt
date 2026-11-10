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

print("2. Creating deploy.zip with maximum compression...")
with zipfile.ZipFile(zip_file, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as zipf:
    for dirpath, dirnames, filenames in os.walk(standalone):
        for filename in filenames:
            file_path = os.path.join(dirpath, filename)
            rel_path = os.path.relpath(file_path, standalone)
            zipf.write(file_path, rel_path)

file_size = os.path.getsize(zip_file)
print(f"deploy.zip created: {file_size / (1024*1024):.2f} MB")

CHUNK_SIZE = 8 * 1024 * 1024  # 8 MB per chunk
num_chunks = (file_size + CHUNK_SIZE - 1) // CHUNK_SIZE
print(f"Splitting into {num_chunks} chunks of ~8 MB each for reliable upload...")

php_deploy = """<?php
header('Content-Type: text/plain');
ini_set('display_errors', 1);
ini_set('max_execution_time', 600);
error_reporting(E_ALL);

// Reassemble chunks if present
$chunks = glob(__DIR__ . '/chunk_*.bin');
$zipPath = __DIR__ . '/deploy.zip';

if (!empty($chunks)) {
    sort($chunks);
    $out = fopen($zipPath, 'wb');
    foreach ($chunks as $chunk) {
        $in = fopen($chunk, 'rb');
        stream_copy_to_stream($in, $out);
        fclose($in);
        @unlink($chunk);
    }
    fclose($out);
    echo "Combined " . count($chunks) . " chunks into deploy.zip (" . round(filesize($zipPath) / 1024 / 1024, 2) . " MB)\\n";
} elseif (!file_exists($zipPath)) {
    $zipPath = '/home/pondokm8/public_html/kinerjapb.pondokmatoa.id/deploy.zip';
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

print("3. Connecting to FTP & uploading do_deploy.php...")
def get_ftp():
    f = ftplib.FTP('ftp.pondokmatoa.id', timeout=60)
    f.login('kinerjapb@pondokmatoa.id', 'B&np^-gV8gWh=Bgg')
    return f

ftp = get_ftp()
ftp.storbinary('STOR do_deploy.php', io.BytesIO(php_deploy.encode('utf-8')))
print("do_deploy.php uploaded")
ftp.quit()

print("4. Uploading chunks to FTP...")
with open(zip_file, 'rb') as f:
    for i in range(num_chunks):
        chunk_name = f"chunk_{i:02d}.bin"
        chunk_data = f.read(CHUNK_SIZE)
        chunk_len = len(chunk_data)
        
        # Upload chunk with retries
        for attempt in range(3):
            try:
                print(f"Uploading {chunk_name} ({i+1}/{num_chunks}, {chunk_len / (1024*1024):.2f} MB)...", end=" ", flush=True)
                t0 = time.time()
                ftp = get_ftp()
                ftp.storbinary(f'STOR {chunk_name}', io.BytesIO(chunk_data))
                ftp.quit()
                speed = (chunk_len / 1024) / (time.time() - t0)
                print(f"Done in {time.time() - t0:.1f}s ({speed:.1f} KB/s)")
                break
            except Exception as e:
                print(f"Error on attempt {attempt+1}: {e}")
                time.sleep(2)
        else:
            print(f"FATAL: Failed to upload {chunk_name} after 3 attempts.")
            sys.exit(1)

print("All chunks uploaded successfully!")

print("5. Triggering extraction...")
ctx = ssl._create_unverified_context()
req = urllib.request.Request('https://kinerjapb.pondokmatoa.id/do_deploy.php')
with urllib.request.urlopen(req, context=ctx, timeout=120) as res:
    print(res.read().decode('utf-8'))

print("Deployment complete!")
