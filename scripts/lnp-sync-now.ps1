# Uruchom TEN skrypt lokalnie — wklejasz token sam, od razu po skopiowaniu z Chrome.
# Prawy przycisk → "Uruchom w PowerShell" NIE zadziała dobrze — otwórz terminal w folderze projektu.

$teamId = "312e40bc-a65a-4558-ad00-d1edccc66e60"
Write-Host ""
Write-Host "1) Odswiez laczynaspilka.pl (F5) na stronie kadry GLKS Mietkow"
Write-Host "2) F12 -> Siec -> GET .../players -> skopiuj Bearer (bez slowa Bearer)"
Write-Host ""
$token = Read-Host "Wklej token i nacisnij Enter"
$token = $token.Trim().Replace("Bearer ", "")

if ($token.Length -lt 20) {
  Write-Host "Token za krotki." -ForegroundColor Red
  exit 1
}

$env:LNP_ACCESS_TOKEN = $token
$env:LNP_TEAM_ID = $teamId

Write-Host "Test API..." -ForegroundColor Cyan
node scripts/lnp-paste-and-sync.mjs $token
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Pelny sync..." -ForegroundColor Cyan
node scripts/sync-league-live.mjs
exit $LASTEXITCODE
