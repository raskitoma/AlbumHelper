#!/bin/bash
echo "============================================="
echo "   AlbumHelper - Despliegue con Docker"
echo "============================================="

# Preguntar puerto
read -p "Ingresa el puerto en el que correrá la aplicación [Default: 3000]: " PORT
PORT=${PORT:-3000}

# Guardar variables en .env para docker-compose
echo "Creando archivo .env..."
echo "PORT=$PORT" > .env

# Levantar contenedores
echo "Construyendo y levantando el contenedor de Docker..."
docker compose up -d --build

echo "============================================="
echo "¡Despliegue completado con éxito!"
echo "La aplicación está corriendo en http://localhost:$PORT"
echo "============================================="
