# Screenshots a local page with headless Edge.
#
#   Phone check:   render.ps1 -Page C:\path\index.html -Out C:\tmp\phones.png
#                  (renders the page side by side at 320, 375 and 414 px wide)
#   Preview image: render.ps1 -Page C:\path\preview.html -Out C:\path\preview.png -Preview
#                  (renders exactly 1200x630 for the og:image)
#
# Edge won't size a headless window below ~500px, so phone widths are rendered
# inside iframes on a wider canvas instead of by resizing the window.
param(
  [Parameter(Mandatory)] [string]$Page,
  [Parameter(Mandatory)] [string]$Out,
  [switch]$Preview,
  [int]$Height = 1500
)

$edge = @(
  "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
  "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
  "$env:ProgramFiles\Google\Chrome\Application\chrome.exe"
) | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $edge) { throw "Edge or Chrome not found." }

$work = Join-Path ([IO.Path]::GetTempPath()) "dinner-night-render"
New-Item -ItemType Directory -Force $work | Out-Null
$pageUrl = "file:///" + ((Resolve-Path $Page).Path -replace '\\', '/')

if ($Preview) {
  $url = $pageUrl; $size = "1200,630"
} else {
  $frames = (320, 375, 414 | ForEach-Object { "<iframe src='$pageUrl' style='width:${_}px;height:${Height}px;border:0'></iframe>" }) -join ""
  $harness = Join-Path $work "phones.html"
  Set-Content -Path $harness -Encoding utf8 -Value "<!doctype html><body style='margin:0;background:#888;display:flex;gap:20px;padding:20px;align-items:flex-start'>$frames</body>"
  $url = "file:///" + ($harness -replace '\\', '/'); $size = "1250,$($Height + 40)"
}

& $edge --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 `
  --virtual-time-budget=8000 --allow-file-access-from-files `
  --user-data-dir="$work\profile" --window-size="$size" --screenshot="$Out" $url | Out-Null
Write-Output "Wrote $Out"
