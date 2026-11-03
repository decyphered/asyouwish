# Writes one calendar file per half-hour start time for a dinner night, for the page's "Add to my calendar" button.
#
#   calendar.ps1 -Date 2026-11-07 -UtcOffset -09:00 [-Title "Dinner and show w/ C!!"] [-Hours 3]
#
# Output: calendar\<Date>\HHMM.ics (0000 ... 2330) at the repo root. iOS Safari only offers "Add to Calendar"
# for a real .ics file served over https, not one the page builds itself, so these are static and public:
# keep her picks out of them. UtcOffset is Alaska's offset on that date (-09:00 winter, -08:00 daylight time).
param(
  [Parameter(Mandatory)] [string]$Date,
  [Parameter(Mandatory)] [string]$UtcOffset,
  [string]$Title = 'Dinner and show w/ C!!',
  [double]$Hours = 3,
  [string]$Site = 'https://dinnerwithcat.com'
)
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..\..')).Path
$dir = Join-Path $root "calendar\$Date"
if (Test-Path $dir) { Remove-Item -Recurse -Force $dir }
New-Item -ItemType Directory $dir -Force | Out-Null

$esc = { param($s) $s -replace '\\', '\\' -replace ';', '\;' -replace ',', '\,' }
$stamp = (Get-Date).ToUniversalTime().ToString("yyyyMMdd'T'HHmmss'Z'")
$utf8 = New-Object Text.UTF8Encoding $false
for ($m = 0; $m -lt 1440; $m += 30) {
  $hhmm = '{0:D2}{1:D2}' -f [int][math]::Floor($m / 60), ($m % 60)
  $start = [DateTimeOffset]::Parse("$($Date)T$($hhmm.Substring(0,2)):$($hhmm.Substring(2)):00$UtcOffset").UtcDateTime
  $end = $start.AddHours($Hours)
  $title = & $esc $Title
  $lines = @(
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//dinnerwithcat.com//dinner night//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    "UID:dinner-$Date@dinnerwithcat.com",
    "DTSTAMP:$stamp",
    "DTSTART:$($start.ToString("yyyyMMdd'T'HHmmss'Z'"))",
    "DTEND:$($end.ToString("yyyyMMdd'T'HHmmss'Z'"))",
    "SUMMARY:$title",
    "DESCRIPTION:Your picks are saved at $Site/",
    "URL:$Site/",
    'BEGIN:VALARM', 'ACTION:DISPLAY', 'TRIGGER:-PT1H', "DESCRIPTION:$title", 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR'
  )
  [IO.File]::WriteAllText((Join-Path $dir "$hhmm.ics"), ($lines -join "`r`n") + "`r`n", $utf8)
}
Write-Output "Wrote 48 calendar files to calendar\$Date"
