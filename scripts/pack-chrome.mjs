import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execFileSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const src = path.join(root, "src");
const dist = path.join(root, "dist");
const outZip = path.join(dist, "cats-and-rats-chrome.zip");

fs.mkdirSync(dist, { recursive: true });
if (fs.existsSync(outZip)) fs.unlinkSync(outZip);

// Chrome: zip contents of src/ (not the folder itself)
// Use PowerShell Compress-Archive on Windows
const ps = `
$src = '${src.replace(/'/g, "''")}'
$out = '${outZip.replace(/'/g, "''")}'
if (Test-Path $out) { Remove-Item $out -Force }
Compress-Archive -Path (Join-Path $src '*') -DestinationPath $out -Force
Write-Host "Wrote $out" (Get-Item $out).Length
`;
execFileSync(
  "powershell.exe",
  ["-NoProfile", "-Command", ps],
  { stdio: "inherit" }
);

console.log("Chrome Web Store upload:", outZip);
console.log("Zip root must contain manifest.json (verified by store).");
