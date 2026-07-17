import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execFileSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const src = path.join(root, "src");
const dist = path.join(root, "dist");
const outXpi = path.join(dist, "cats-and-rats-firefox.zip");

fs.mkdirSync(dist, { recursive: true });
if (fs.existsSync(outXpi)) fs.unlinkSync(outXpi);

// Firefox AMO accepts a zip of the extension root (same as Chrome for unlisted/self-dist).
// For listed AMO, run: npx web-ext sign (needs API keys) or upload this zip on AMO.
const ps = `
$src = '${src.replace(/'/g, "''")}'
$out = '${outXpi.replace(/'/g, "''")}'
if (Test-Path $out) { Remove-Item $out -Force }
Compress-Archive -Path (Join-Path $src '*') -DestinationPath $out -Force
Write-Host "Wrote $out" (Get-Item $out).Length
`;
execFileSync(
  "powershell.exe",
  ["-NoProfile", "-Command", ps],
  { stdio: "inherit" }
);

console.log("Firefox package:", outXpi);
console.log("Submit via https://addons.mozilla.org/developers/ or self-host the XPI.");
