#!/bin/bash
echo "============================================="
echo "   AlbumHelper - Despliegue con Docker"
echo "============================================="

# Cargar puerto anterior desde .env si existe
DEFAULT_PORT=3000
if [ -f .env ]; then
  # Buscar PORT en el archivo .env
  SAVED_PORT=$(grep -E "^PORT=" .env | cut -d= -f2)
  if [ ! -z "$SAVED_PORT" ]; then
    DEFAULT_PORT=$SAVED_PORT
    echo "Se detectó configuración previa. Puerto por defecto: $DEFAULT_PORT"
  fi
fi

# Preguntar puerto
read -p "Ingresa el puerto en el que correrá la aplicación [Default: $DEFAULT_PORT]: " PORT
PORT=${PORT:-$DEFAULT_PORT}

# Guardar variables en .env para docker-compose
echo "Guardando configuración en archivo .env..."
echo "PORT=$PORT" > .env

# Levantar contenedores
echo "Construyendo y levantando el contenedor de Docker..."
docker compose up -d --build

echo "============================================="
echo "¡Despliegue completado con éxito!"
echo "La aplicación está corriendo en http://localhost:$PORT"
echo "============================================="
