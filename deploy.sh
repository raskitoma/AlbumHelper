#!/bin/bash
echo "============================================="
echo "   AlbumHelper - Despliegue con Docker"
echo "============================================="

# Cargar configuración anterior desde .env si existe
DEFAULT_PORT=3000
DEFAULT_DB_DIR="./data"

if [ -f .env ]; then
  SAVED_PORT=$(grep -E "^PORT=" .env | cut -d= -f2)
  if [ ! -z "$SAVED_PORT" ]; then
    DEFAULT_PORT=$SAVED_PORT
  fi
  SAVED_DB_DIR=$(grep -E "^DB_DIR=" .env | cut -d= -f2)
  if [ ! -z "$SAVED_DB_DIR" ]; then
    DEFAULT_DB_DIR=$SAVED_DB_DIR
  fi
  echo "Se detectó configuración previa:"
  echo "  Puerto: $DEFAULT_PORT"
  echo "  Ruta DB: $DEFAULT_DB_DIR"
  echo "============================================="
fi

# Preguntar puerto
read -p "Ingresa el puerto en el que correrá la aplicación [Default: $DEFAULT_PORT]: " PORT
PORT=${PORT:-$DEFAULT_PORT}

# Preguntar ruta de base de datos
read -p "Ingresa la ruta de la carpeta donde se guardará la DB y backups [Default: $DEFAULT_DB_DIR]: " DB_DIR
DB_DIR=${DB_DIR:-$DEFAULT_DB_DIR}

# Guardar variables en .env para docker-compose
echo "Guardando configuración en archivo .env..."
echo "PORT=$PORT" > .env
echo "DB_DIR=$DB_DIR" >> .env

# Levantar contenedores
echo "Construyendo y levantando el contenedor de Docker..."
docker compose up -d --build

echo "============================================="
echo "¡Despliegue completado con éxito!"
echo "La aplicación está corriendo en http://localhost:$PORT"
echo "Base de datos y respaldos mapeados en: $DB_DIR"
echo "============================================="
