# 📖 AlbumHelper - Contenedor de Álbum Digital y Gestión de Repetidos

AlbumHelper es una aplicación web moderna diseñada para registrar, coleccionar y coordinar el intercambio de cromos de forma colaborativa o individual, ideal para grupos familiares y comunidades de coleccionistas.

Este repositorio está empaquetado para correr en un **contenedor de Docker** con soporte para persistencia de datos (SQLite) y un sistema automatizado de copias de seguridad.

---

## 🚀 Requisitos Previos

Antes de comenzar, asegúrate de tener instalado en tu máquina o servidor:
* **Docker** (versión 20.10 o superior)
* **Docker Compose**

---

## 📦 Métodos de Despliegue

Elige uno de los siguientes métodos para levantar la aplicación en tu servidor o computadora local:

### Método A: Despliegue Interactivo (Recomendado)

Disponemos de asistentes interactivos que detectarán configuraciones anteriores (puerto y ruta de datos) y se encargarán de inicializar y arrancar los contenedores.

#### En Linux / macOS:
1. Dale permisos de ejecución al script:
   ```bash
   chmod +x deploy.sh
   ```
2. Ejecuta el script:
   ```bash
   ./deploy.sh
   ```

#### En Windows (PowerShell):
1. Abre tu terminal de PowerShell en el directorio del proyecto y corre:
   ```powershell
   .\deploy.ps1
   ```

El asistente te preguntará:
* El **puerto** del host donde deseas exponer la aplicación (por defecto `3000`).
* La **carpeta del host** donde deseas que se guarden la base de datos de SQLite y las copias de seguridad de forma persistente (por defecto `./data`).

---

### Método B: Despliegue Manual con Docker Compose

Si prefieres configurar y arrancar todo manualmente, sigue estos pasos:

1. Copia la plantilla de configuración de entorno:
   ```bash
   cp .env.example .env
   ```
2. Abre el archivo `.env` creado y personaliza los valores:
   * `PORT`: Puerto del host expuesto.
   * `DB_DIR`: Ruta de la carpeta persistente en el host (puede ser una ruta relativa como `./data` o absoluta como `/var/album_data`).
3. Construye y arranca los contenedores en segundo plano:
   ```bash
   docker compose up -d --build
   ```

---

## 💾 Persistencia de Datos y Respaldos (Backups)

Toda la información del álbum se almacena de forma segura en la carpeta montada en el host (`DB_DIR`). 

### Sistema de Respaldos Diarios
La aplicación incluye un programador en segundo plano que realiza las siguientes acciones:
* **Compresión ZIP**: Cada 24 horas genera una copia comprimida de la base de datos activa (`figuritas.db`) en la subcarpeta `backups/`.
* **Retención de 7 Días**: Mantiene un historial de copias de seguridad diario y elimina automáticamente las copias con una antigüedad mayor a 7 días para optimizar espacio.
* **Acceso Directo**: Las copias de seguridad se almacenan en `[Ruta-Configurada]/backups/` en tu host, facilitando su recuperación o almacenamiento externo.

---

## 👤 Configuración Inicial (Primer Inicio)

Una vez levantado el contenedor:
1. Accede en tu navegador a `http://localhost:[PUERTO]` (ej. `http://localhost:3000`).
2. Al detectar que la base de datos está vacía, la aplicación te redirigirá automáticamente al **Asistente de Configuración Inicial** (`/setup`).
3. Registra tu cuenta; el primer usuario registrado obtendrá automáticamente el rol de **Administrador**.
4. ¡Listo! Ya puedes empezar a escanear repetidos, abrir sobres, invitar a familiares o configurar el inicio de sesión OAuth de Google en los ajustes del sistema.

---

## 🛠️ Comandos de Utilidad

* **Detener la aplicación**:
  ```bash
  docker compose down
  ```
* **Ver registros en tiempo real (Logs)**:
  ```bash
  docker compose logs -f app
  ```
* **Reiniciar el contenedor**:
  ```bash
  docker compose restart app
  ```
