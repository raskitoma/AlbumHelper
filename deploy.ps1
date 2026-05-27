Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "   AlbumHelper - Despliegue con Docker" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

$defaultPort = "3000"
if (Test-Path .env) {
    $envContent = Get-Content .env
    foreach ($line in $envContent) {
        if ($line -match "^PORT=(.*)$") {
            $defaultPort = $Matches[1].Trim()
            Write-Host "Se detectó configuración previa. Puerto por defecto: $defaultPort" -ForegroundColor Yellow
        }
    }
}

$port = Read-Host "Ingresa el puerto en el que correrá la aplicación [Default: $defaultPort]"
if (-not $port) { $port = $defaultPort }

Write-Host "Guardando configuración en archivo .env..." -ForegroundColor Yellow
"PORT=$port" | Out-File -FilePath .env -Encoding utf8

Write-Host "Construyendo y levantando el contenedor de Docker..." -ForegroundColor Yellow
docker compose up -d --build

Write-Host "=============================================" -ForegroundColor Green
Write-Host "¡Despliegue completado con éxito!" -ForegroundColor Green
Write-Host "La aplicación está corriendo en http://localhost:$port" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
