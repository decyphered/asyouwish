# Builds the password-locked page from a readable source page.
#
#   lock.ps1 -Source next\src -Out next\index.html -Answer "brat-ass"
#
# Everything inside <body> of <Source>\index.html, plus <Source>\app.js, is AES-256-CBC
# encrypted with a PBKDF2-SHA256 key from the answer. The output keeps the <head> (title,
# link preview, CSS) and swaps the body for lock\gate.html, which decrypts in the browser.
# The answer is never written anywhere. Keep the readable source out of git: the repo is public.
param(
  [Parameter(Mandatory)] [string]$Source,
  [Parameter(Mandatory)] [string]$Out,
  [Parameter(Mandatory)] [string]$Answer,
  [int]$Iterations = 150000
)

# ReadAllText, not Get-Content: PowerShell 5.1's ConvertTo-Json writes Get-Content strings as objects,
# which made the bundled app.js arrive as "[object Object]" and never run.
$page = [IO.File]::ReadAllText((Resolve-Path (Join-Path $Source 'index.html')))
$js = [IO.File]::ReadAllText((Resolve-Path (Join-Path $Source 'app.js')))
$gate = [IO.File]::ReadAllText((Resolve-Path (Join-Path $PSScriptRoot '..\lock\gate.html')))

$m = [regex]::Match($page, '(?s)^(.*<body[^>]*>)(.*)(</body>.*)$')
if (-not $m.Success) { throw "No <body> in source page." }
$body = $m.Groups[2].Value -replace '<script src="app\.js[^"]*"></script>', ''
$svg = [regex]::Match($body, '(?s)<svg class="night".*?</svg>').Value

# Same normalisation the gate uses on what she types.
$word = ($Answer.ToLower() -replace '[^a-z]', '') -replace '^thatsa', '' -replace 'candle$', ''

$json = @{ html = $body; js = $js } | ConvertTo-Json -Compress
$salt = New-Object byte[] 16; $iv = New-Object byte[] 16
$rng = [Security.Cryptography.RandomNumberGenerator]::Create(); $rng.GetBytes($salt); $rng.GetBytes($iv)
$kdf = New-Object Security.Cryptography.Rfc2898DeriveBytes($word, $salt, $Iterations, [Security.Cryptography.HashAlgorithmName]::SHA256)
$aes = [Security.Cryptography.Aes]::Create()
$aes.Mode = 'CBC'; $aes.Padding = 'PKCS7'; $aes.Key = $kdf.GetBytes(32); $aes.IV = $iv
$plain = [Text.Encoding]::UTF8.GetBytes($json)
$cipher = $aes.CreateEncryptor().TransformFinalBlock($plain, 0, $plain.Length)

$vault = @{ iter = $Iterations; salt = [Convert]::ToBase64String($salt); iv = [Convert]::ToBase64String($iv); data = [Convert]::ToBase64String($cipher) } | ConvertTo-Json -Compress
$locked = $gate.Replace('{{NIGHT_SVG}}', $svg).Replace('{{VAULT}}', $vault)

$outText = $m.Groups[1].Value + "`n" + $locked + "`n" + $m.Groups[3].Value
[IO.File]::WriteAllText((Join-Path (Get-Location) $Out), $outText, (New-Object Text.UTF8Encoding $false))
Write-Output "Locked $Out ($([math]::Round($cipher.Length / 1KB)) KB encrypted)"
