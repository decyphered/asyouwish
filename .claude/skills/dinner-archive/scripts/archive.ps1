# Saves a finished dinner night as a read-only keepsake at archive\<Date>\ and rebuilds archive\index.html.
#
#   archive.ps1 -Date 2026-10-25 -Source <folder> [-Title "Spooky season hang"] [-Pick '{"dinner":"...","time":"6:30 PM"}']
#               [-Note "A line to remember it by"] [-Answer "<gate answer>"] [-Force]
#   archive.ps1 -IndexOnly          # just rebuild archive\index.html
#
# <Source> holds the night's readable index.html + app.js (plus preview.png and favicon.svg if present).
# The archived app.js gets freeze.js appended: the form can't be changed or sent, and a "From the archive"
# banner links back to the index. With -Answer, the page is re-locked behind the password gate, and the
# readable copy is kept in archive-src\<Date>\ (gitignored) so it can be rebuilt later.
param(
  [string]$Date,
  [string]$Source,
  [string]$Title = '',
  [string]$Pick = '',
  [string]$Note = '',
  [string]$Answer = '',
  [switch]$Force,
  [switch]$IndexOnly
)
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..\..')).Path
$skill = Join-Path $PSScriptRoot '..'
$utf8 = New-Object Text.UTF8Encoding $false
$site = 'https://dinnerwithcat.com'
Push-Location $root
try {
  if (-not $IndexOnly) {
    if ($Date -notmatch '^\d{4}-\d{2}-\d{2}$') { throw "-Date must look like 2026-10-25." }
    if (-not (Test-Path (Join-Path $Source 'index.html')) -or -not (Test-Path (Join-Path $Source 'app.js'))) { throw "$Source needs index.html and app.js." }
    $dest = Join-Path 'archive' $Date
    if ((Test-Path $dest) -and -not $Force) { throw "$dest already exists. Pass -Force to replace it." }
    $pickObj = $null
    if ($Pick) { $pickObj = $Pick | ConvertFrom-Json }   # throws on bad JSON

    # Stage a frozen copy of the readable page.
    $stage = Join-Path ([IO.Path]::GetTempPath()) "dinner-archive-$Date"
    if (Test-Path $stage) { Remove-Item -Recurse -Force $stage }
    New-Item -ItemType Directory $stage | Out-Null
    foreach ($f in 'index.html', 'app.js', 'preview.png', 'favicon.svg') {
      if (Test-Path (Join-Path $Source $f)) { Copy-Item (Join-Path $Source $f) $stage }
    }
    if (-not (Test-Path (Join-Path $stage 'favicon.svg')) -and (Test-Path 'favicon.svg')) { Copy-Item 'favicon.svg' $stage }

    # Head: link previews point at this night's own image and URL, it stays out of search, and the index gets a title.
    $html = [IO.File]::ReadAllText((Join-Path $stage 'index.html'))
    $html = $html -replace "content=`"$([regex]::Escape($site))/preview\.png", "content=`"$site/archive/$Date/preview.png"
    $html = $html -replace "(property=`"og:url`" content=`")[^`"]*", "`${1}$site/archive/$Date/"
    $label = [Net.WebUtility]::HtmlEncode($Title)
    $robots = if ($html -match 'name="robots"') { '' } else { "`n<meta name=`"robots`" content=`"noindex`">" }
    $html = $html -replace '(<meta charset="utf-8">)', "`$1$robots`n<meta name=`"archive-title`" content=`"$label`">"
    [IO.File]::WriteAllText((Join-Path $stage 'index.html'), $html, $utf8)

    $config = [ordered]@{ date = $Date; pick = $pickObj; note = $Note } | ConvertTo-Json -Compress -Depth 5
    $freeze = [IO.File]::ReadAllText((Join-Path $skill 'freeze.js')).Replace('{{CONFIG}}', $config)
    $js = [IO.File]::ReadAllText((Join-Path $stage 'app.js'))
    [IO.File]::WriteAllText((Join-Path $stage 'app.js'), $js.TrimEnd() + "`n" + $freeze, $utf8)

    if (Test-Path $dest) { Remove-Item -Recurse -Force $dest }
    New-Item -ItemType Directory $dest | Out-Null
    foreach ($f in 'preview.png', 'favicon.svg') { if (Test-Path (Join-Path $stage $f)) { Copy-Item (Join-Path $stage $f) $dest } }
    if ($Answer) {
      $keep = Join-Path 'archive-src' $Date
      if (Test-Path $keep) { Remove-Item -Recurse -Force $keep }
      New-Item -ItemType Directory $keep -Force | Out-Null
      Copy-Item (Join-Path $stage '*') $keep
      & (Join-Path $root '.claude\skills\dinner-night\scripts\lock.ps1') -Source $stage -Out (Join-Path $dest 'index.html') -Answer $Answer
    } else {
      Copy-Item (Join-Path $stage 'index.html'), (Join-Path $stage 'app.js') $dest
    }
    Remove-Item -Recurse -Force $stage
    Write-Output "Archived $dest"
  }

  # Rebuild the index from every archived night, newest first.
  $items = foreach ($d in (Get-ChildItem 'archive' -Directory | Where-Object Name -match '^\d{4}-\d{2}-\d{2}$' | Sort-Object Name -Descending)) {
    $page = [IO.File]::ReadAllText((Join-Path $d.FullName 'index.html'))
    $t = [regex]::Match($page, '<meta name="archive-title" content="([^"]*)"').Groups[1].Value
    if (-not $t) { $t = [regex]::Match($page, '<meta property="og:description" content="([^"]*)"').Groups[1].Value }
    $day = [datetime]::ParseExact($d.Name, 'yyyy-MM-dd', [Globalization.CultureInfo]::InvariantCulture)
    $c = [Globalization.CultureInfo]::GetCultureInfo('en-US')
    $lock = if ($page.Contains('id="vault"')) { ' &#128274;' } else { '' }
    "    <li><a class=`"night`" href=`"$($d.Name)/`"><span class=`"day`"><b>$($day.Day)</b><span>$($day.ToString('MMM', $c))</span></span>" +
    "<span class=`"txt`"><strong>$($day.ToString('dddd, MMMM d, yyyy', $c))$lock</strong><span>$t</span></span></a></li>"
  }
  if (-not $items) { $items = '    <li class="empty">No nights archived yet.</li>' }
  $index = [IO.File]::ReadAllText((Join-Path $skill 'index-template.html')).Replace('{{NIGHTS}}', ($items -join "`n"))
  if (-not (Test-Path 'archive')) { New-Item -ItemType Directory 'archive' | Out-Null }
  [IO.File]::WriteAllText((Join-Path $root 'archive\index.html'), $index, $utf8)
  Write-Output "Rebuilt archive\index.html ($(@($items).Count) nights)"
} finally { Pop-Location }
