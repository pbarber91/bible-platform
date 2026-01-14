# scripts/context_bundle.ps1
# Usage:
#   pwsh ./scripts/context_bundle.ps1
# Produces:
#   docs/_context/context_bundle.zip

$ErrorActionPreference = "Stop"

$root = (Get-Location).Path
$outDir = Join-Path $root "docs/_context"
$tmpDir = Join-Path $outDir "bundle"
$zipPath = Join-Path $outDir "context_bundle.zip"

New-Item -ItemType Directory -Force -Path $outDir | Out-Null
if (Test-Path $tmpDir) { Remove-Item -Recurse -Force $tmpDir }
New-Item -ItemType Directory -Force -Path $tmpDir | Out-Null

function Write-File($relPath, $content) {
  $path = Join-Path $tmpDir $relPath
  $dir = Split-Path $path -Parent
  New-Item -ItemType Directory -Force -Path $dir | Out-Null
  Set-Content -Path $path -Value $content -Encoding UTF8
}

# 1) Snapshot basics
Write-File "meta/when.txt" ("Generated: " + (Get-Date).ToString("yyyy-MM-dd HH:mm:ss zzz"))
Write-File "meta/pwd.txt" $root

# 2) Git snapshot (safe even if not a repo)
try {
  $gitStatus = git status --porcelain=v1 2>$null
  Write-File "git/status.txt" ($gitStatus -join "`n")
} catch {
  Write-File "git/status.txt" "git status failed (not a repo?)"
}

try {
  $gitHead = git rev-parse HEAD 2>$null
  Write-File "git/head.txt" $gitHead
} catch {
  Write-File "git/head.txt" "git rev-parse failed"
}

try {
  $gitLog = git log --oneline --decorate -20 2>$null
  Write-File "git/log.txt" ($gitLog -join "`n")
} catch {
  Write-File "git/log.txt" "git log failed"
}

try {
  $gitDiff = git diff 2>$null
  Write-File "git/diff.txt" ($gitDiff -join "`n")
} catch {
  Write-File "git/diff.txt" "git diff failed"
}

# 3) File tree (exclude heavy dirs)
$tree = Get-ChildItem -Recurse -File |
  Where-Object {
    $_.FullName -notmatch "\\node_modules\\" -and
    $_.FullName -notmatch "\\.next\\" -and
    $_.FullName -notmatch "\\.git\\"
  } |
  ForEach-Object { $_.FullName.Replace($root, "").TrimStart("\") } |
  Sort-Object
Write-File "meta/tree.txt" ($tree -join "`n")

# 4) Copy “spine” files (adjust as needed)
$include = @(
  "package.json",
  "tsconfig.json",
  "next.config.ts",
  "src/app/layout.tsx",
  "src/app/page.tsx",

  "src/lib/auth.ts",
  "src/lib/tenant.ts",
  "src/lib/tenant_personal.ts",
  "src/lib/supabase/server.ts",
  "src/lib/supabase/client.ts",

  "src/lib/db/studies.ts",
  "src/lib/db/study_sessions.ts",

  "src/components/session-editor/SessionEditorForm.tsx",

  "docs/AI_STATE.md"
)

foreach ($rel in $include) {
  $src = Join-Path $root $rel
  if (Test-Path $src) {
    $dst = Join-Path $tmpDir ("files/" + $rel)
    $dstDir = Split-Path $dst -Parent
    New-Item -ItemType Directory -Force -Path $dstDir | Out-Null
    Copy-Item -Force $src $dst
  } else {
    Write-File ("missing/" + ($rel -replace "[\\/]", "_") + ".txt") "Missing: $rel"
  }
}

# 5) Optional: include flutter reference if present
$flutterRef = Join-Path $root "docs/flutter_ref"
if (Test-Path $flutterRef) {
  Copy-Item -Recurse -Force $flutterRef (Join-Path $tmpDir "flutter_ref")
}

# 6) Zip it
if (Test-Path $zipPath) { Remove-Item -Force $zipPath }
Compress-Archive -Path (Join-Path $tmpDir "*") -DestinationPath $zipPath -Force

Write-Host "✅ Context bundle created:"
Write-Host $zipPath
