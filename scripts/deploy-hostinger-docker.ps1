# Deploy Dapp Docker project to Hostinger VPS via API (VPS ID 1245452).
# Usage:
#   $env:HOSTINGER_API_TOKEN = "your-token"
#   $env:GITHUB_REPO_URL = "https://github.com/your-user/d-Dapp"
#   .\scripts\deploy-hostinger-docker.ps1
# Or: .\scripts\deploy-hostinger-docker.ps1 -ApiToken "..." -GitHubRepoUrl "https://github.com/..."
# Optional: $env:ENV_FILE = "path\to\.env" to send env vars to the project (do not commit .env).

param(
    [string] $ApiToken = $env:HOSTINGER_API_TOKEN,
    [string] $GitHubRepoUrl = $env:GITHUB_REPO_URL,
    [string] $EnvFile = $env:ENV_FILE,
    [string] $VpsId = "1245452",
    [string] $ProjectName = "dapp"
)

$ErrorActionPreference = "Stop"
$baseUrl = "https://developers.hostinger.com"

if (-not $ApiToken) {
    Write-Error "Set HOSTINGER_API_TOKEN or pass -ApiToken. Get token from Hostinger MCP config or hpanel."
}
if (-not $GitHubRepoUrl) {
    Write-Error "Set GITHUB_REPO_URL or pass -GitHubRepoUrl (e.g. https://github.com/username/d-Dapp)."
}

$headers = @{
    "Authorization" = "Bearer $ApiToken"
    "Content-Type"  = "application/json"
}

$body = @{
    project_name = $ProjectName
    content      = $GitHubRepoUrl
} | ConvertTo-Json -Compress

if ($EnvFile -and (Test-Path $EnvFile)) {
    $envContent = Get-Content -Raw -Path $EnvFile
    if ($envContent.Length -gt 8192) {
        Write-Warning "ENV content exceeds 8192 chars; truncating."
        $envContent = $envContent.Substring(0, 8192)
    }
    $bodyObj = @{
        project_name = $ProjectName
        content      = $GitHubRepoUrl
        environment  = $envContent.Trim()
    }
    $body = $bodyObj | ConvertTo-Json -Compress
}

$uri = "$baseUrl/api/vps/v1/virtual-machines/$VpsId/docker"
Write-Host "POST $uri (project: $ProjectName, content: GitHub repo URL)"
$response = Invoke-RestMethod -Uri $uri -Method Post -Headers $headers -Body $body
$response | ConvertTo-Json -Depth 5
Write-Host "Done. Check project status: GET $uri"
