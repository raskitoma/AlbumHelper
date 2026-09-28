Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "   AlbumHelper - Despliegue con Docker" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

$defaultPort = "3000"
$defaultDbDir = "./data"
$defaultDockerNetwork = "album_network"
$defaultContainerName = "album-helper"
$defaultAppUrl = ""

if (Test-Path .env) {
    $envContent = Get-Content .env
    foreach ($line in $envContent) {
        if ($line -match "^PORT=(.*)$") {
            $defaultPort = $Matches[1].Trim()
        }
        if ($line -match "^DB_DIR=(.*)$") {
            $defaultDbDir = $Matches[1].Trim()
        }
        if ($line -match "^DOCKER_NETWORK=(.*)$") {
            $defaultDockerNetwork = $Matches[1].Trim()
        }
        if ($line -match "^CONTAINER_NAME=(.*)$") {
            $defaultContainerName = $Matches[1].Trim()
        }
        if ($line -match "^APP_URL=(.*)$") {
            $defaultAppUrl = $Matches[1].Trim()
        }
    }
    Write-Host "Se detectó configuración previa:" -ForegroundColor Yellow
    Write-Host "  Puerto: $defaultPort" -ForegroundColor Yellow
    Write-Host "  Ruta DB: $defaultDbDir" -ForegroundColor Yellow
    Write-Host "  Red Docker: $defaultDockerNetwork" -ForegroundColor Yellow
    Write-Host "  Contenedor: $defaultContainerName" -ForegroundColor Yellow
    Write-Host "  URL pública: $(if ($defaultAppUrl) { $defaultAppUrl } else { '(sin definir)' })" -ForegroundColor Yellow
    Write-Host "=============================================" -ForegroundColor Yellow
}

$port = Read-Host "Ingresa el puerto en el que correrá la aplicación [Default: $defaultPort]"
if (-not $port) { $port = $defaultPort }

$dbDir = Read-Host "Ingresa la ruta de la carpeta donde se guardará la DB y backups [Default: $defaultDbDir]"
if (-not $dbDir) { $dbDir = $defaultDbDir }

$dockerNetwork = Read-Host "Ingresa el nombre de la red de Docker (ej. para Nginx Proxy Manager) [Default: $defaultDockerNetwork]"
if (-not $dockerNetwork) { $dockerNetwork = $defaultDockerNetwork }

$containerName = Read-Host "Ingresa el nombre del contenedor de Docker [Default: $defaultContainerName]"
if (-not $containerName) { $containerName = $defaultContainerName }

# URL pública (se usa en los enlaces de los correos: restablecer contraseña, invitaciones)
$appUrl = Read-Host "Ingresa la URL pública de la aplicación, ej. https://album.ejemplo.com [Default: $(if ($defaultAppUrl) { $defaultAppUrl } else { 'vacío' })]"
if (-not $appUrl) { $appUrl = $defaultAppUrl }
if (-not $appUrl) {
    Write-Host "AVISO: APP_URL vacío. Los enlaces de los correos apuntarán a http://localhost:3000 y no funcionarán fuera de este equipo." -ForegroundColor Yellow
} elseif ($appUrl -match "localhost|127\.0\.0\.1") {
    Write-Host "AVISO: APP_URL apunta a localhost. Los enlaces de los correos no funcionarán fuera de este equipo." -ForegroundColor Yellow
}

# Asegurar que la red de Docker existe
$networkCheck = docker network ls --filter name="^$dockerNetwork$" -q
if (-not $networkCheck) {
    Write-Host "La red de Docker '$dockerNetwork' no existe. Creándola..." -ForegroundColor Yellow
    docker network create $dockerNetwork
}

Write-Host "Guardando configuración en archivo .env..." -ForegroundColor Yellow
$envLines = @("PORT=$port", "DB_DIR=$dbDir", "DOCKER_NETWORK=$dockerNetwork", "CONTAINER_NAME=$containerName", "APP_URL=$appUrl")
$envLines | Out-File -FilePath .env -Encoding ascii

Write-Host "Construyendo y levantando el contenedor de Docker..." -ForegroundColor Yellow
docker compose up -d --build

Write-Host "=============================================" -ForegroundColor Green
Write-Host "¡Despliegue completado con éxito!" -ForegroundColor Green
Write-Host "La aplicación está corriendo en http://localhost:$port" -ForegroundColor Green
Write-Host "Base de datos y respaldos mapeados en: $dbDir" -ForegroundColor Green
Write-Host "Red de Docker conectada: $dockerNetwork" -ForegroundColor Green
Write-Host "Contenedor de Docker: $containerName" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
