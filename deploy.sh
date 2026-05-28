#!/bin/bash
echo "============================================="
echo "   AlbumHelper - Despliegue con Docker"
echo "============================================="

# Cargar configuración anterior desde .env si existe
DEFAULT_PORT=3000
DEFAULT_DB_DIR="./data"
DEFAULT_DOCKER_NETWORK="album_network"
DEFAULT_CONTAINER_NAME="album-helper"

if [ -f .env ]; then
  SAVED_PORT=$(grep -E "^PORT=" .env | cut -d= -f2 | tr -d '\r')
  if [ ! -z "$SAVED_PORT" ]; then
    DEFAULT_PORT=$SAVED_PORT
  fi
  SAVED_DB_DIR=$(grep -E "^DB_DIR=" .env | cut -d= -f2 | tr -d '\r')
  if [ ! -z "$SAVED_DB_DIR" ]; then
    DEFAULT_DB_DIR=$SAVED_DB_DIR
  fi
  SAVED_DOCKER_NETWORK=$(grep -E "^DOCKER_NETWORK=" .env | cut -d= -f2 | tr -d '\r')
  if [ ! -z "$SAVED_DOCKER_NETWORK" ]; then
    DEFAULT_DOCKER_NETWORK=$SAVED_DOCKER_NETWORK
  fi
  SAVED_CONTAINER_NAME=$(grep -E "^CONTAINER_NAME=" .env | cut -d= -f2 | tr -d '\r')
  if [ ! -z "$SAVED_CONTAINER_NAME" ]; then
    DEFAULT_CONTAINER_NAME=$SAVED_CONTAINER_NAME
  fi
  echo "Se detectó configuración previa:"
  echo "  Puerto: $DEFAULT_PORT"
  echo "  Ruta DB: $DEFAULT_DB_DIR"
  echo "  Red Docker: $DEFAULT_DOCKER_NETWORK"
  echo "  Contenedor: $DEFAULT_CONTAINER_NAME"
  echo "============================================="
fi

# Preguntar puerto
read -p "Ingresa el puerto en el que correrá la aplicación [Default: $DEFAULT_PORT]: " PORT
PORT=${PORT:-$DEFAULT_PORT}

# Preguntar ruta de base de datos
read -p "Ingresa la ruta de la carpeta donde se guardará la DB y backups [Default: $DEFAULT_DB_DIR]: " DB_DIR
DB_DIR=${DB_DIR:-$DEFAULT_DB_DIR}

# Preguntar red de docker
read -p "Ingresa el nombre de la red de Docker (ej. para Nginx Proxy Manager) [Default: $DEFAULT_DOCKER_NETWORK]: " DOCKER_NETWORK
DOCKER_NETWORK=${DOCKER_NETWORK:-$DEFAULT_DOCKER_NETWORK}

# Preguntar nombre del contenedor
read -p "Ingresa el nombre del contenedor de Docker [Default: $DEFAULT_CONTAINER_NAME]: " CONTAINER_NAME
CONTAINER_NAME=${CONTAINER_NAME:-$DEFAULT_CONTAINER_NAME}

# Asegurar que la red de Docker existe
if ! docker network inspect "$DOCKER_NETWORK" >/dev/null 2>&1; then
  echo "La red de Docker '$DOCKER_NETWORK' no existe. Creándola..."
  docker network create "$DOCKER_NETWORK"
fi

# Guardar variables en .env para docker-compose
echo "Guardando configuración en archivo .env..."
echo "PORT=$PORT" > .env
echo "DB_DIR=$DB_DIR" >> .env
echo "DOCKER_NETWORK=$DOCKER_NETWORK" >> .env
echo "CONTAINER_NAME=$CONTAINER_NAME" >> .env

# Levantar contenedores
echo "Construyendo y levantando el contenedor de Docker..."
docker compose up -d --build

echo "============================================="
echo "¡Despliegue completado con éxito!"
echo "La aplicación está corriendo en http://localhost:$PORT"
echo "Base de datos y respaldos mapeados en: $DB_DIR"
echo "Red de Docker conectada: $DOCKER_NETWORK"
echo "Contenedor de Docker: $CONTAINER_NAME"
echo "============================================="
