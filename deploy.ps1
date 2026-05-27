Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "   AlbumHelper - Despliegue con Docker" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

$port = Read-Host "Ingresa el puerto en el que correrá la aplicación [Default: 3000]"
if (-not $port) { $port = "3000" }

Write-Host "Creando archivo .env..." -ForegroundColor Yellow
"PORT=$port" | Out-File -FilePath .env -Encoding utf8

Write-Host "Construyendo y levantando el contenedor de Docker..." -ForegroundColor Yellow
docker compose up -d --build

Write-Host "=============================================" -ForegroundColor Green
Write-Host "¡Despliegue completado con éxito!" -ForegroundColor Green
Write-Host "La aplicación está corriendo en http://localhost:$port" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
