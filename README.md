# 📖 AlbumHelper - Digital Album Tracker & Duplicate Sticker Manager

A lightweight, self-hosted utility to track and manage your 2026 World Cup sticker collection. Easily log missing items, track duplicates, and generate clean trading lists.

**Disclaimer:** Independent project not affiliated with, endorsed by, or associated with FIFA or Panini. All trademarks and copyrights belong to their respective owners. No official assets, logos, or protected brand names are used within this application.

---

## ✨ Features & Capabilities

*   **Interactive Digital Album:** Easily log collected items, duplicates (swaps), and missing stickers. Taps increase counts, right-clicks or long-presses decrease counts.
*   **3D Flip-Cards:** Detailed player profiles, custom team-colored jerseys, and interactive flip-to-view sticker info.
*   **Smart Trade Matching:** Generate clean checklist exports. Automatically calculate matches with friends' collections by scanning their QR codes or pasting text-based lists.
*   **Family Groups:** Share and sync your collection in real-time with family members or friends using a unified database.
*   **Modern Security:** Secure your account with **Two-Factor Authentication (2FA/TOTP)** and passwordless **Passkeys (WebAuthn/Biometrics)**.
*   **Automated Backups:** Scheduled background service that compresses the database into ZIP files every 24 hours with a rolling 7-day retention window.
*   **Multilingual Interface:** Localized in English, Spanish, Italian, Portuguese, and French.

---

## 🚀 Prerequisites

Before you begin, ensure you have the following installed on your machine or server:
*   **Docker** (version 20.10 or superior)
*   **Docker Compose**

---

## 📦 Deployment Methods

Choose one of the following methods to deploy the application on your server or local computer:

### Method A: Interactive Deployment (Recommended)

We provide interactive assistant scripts that automatically detect previous configurations (port and data paths) and handle initial setup and container execution.

#### On Linux / macOS:
1. Grant execute permissions to the script:
   ```bash
   chmod +x deploy.sh
   ```
2. Run the script:
   ```bash
   ./deploy.sh
   ```

#### On Windows (PowerShell):
1. Open your PowerShell terminal in the project directory and run:
   ```powershell
   .\deploy.ps1
   ```

The assistant will ask for:
*   The host **port** where the application should be exposed (default is `3000`).
*   The **host folder** where the SQLite database and backups will be stored persistently (default is `./data`).

---

### Method B: Manual Deployment with Docker Compose

If you prefer to configure and run the container manually:

1. Copy the environment variables template:
   ```bash
   cp .env.example .env
   ```
2. Open the `.env` file and customize the values:
   *   `PORT`: Exposed host port.
   *   `DB_DIR`: Persistent host data directory (e.g. `./data` or absolute path like `/var/album_data`).
3. Build and launch the container in the background:
   ```bash
   docker compose up -d --build
   ```

---

## 💾 Data Persistence and Backups

All database files and configuration details are stored securely in the directory mapped to `DB_DIR` on the host.

### Daily Backup System
The app includes a background service that:
*   **ZIP Compresses** the active SQLite database (`figuritas.db`) every 24 hours and stores it in the `backups/` subfolder.
*   **Applies a 7-day retention policy** to automatically clean up older zip archives to save disk space.
*   **Allows direct download/restoration** by keeping backups easily accessible in `[Configured-DB-Path]/backups/` on the host.

---

## 👤 Initial Setup (First Run)

Once the container is running:
1. Open your browser and navigate to `http://localhost:[PORT]` (e.g., `http://localhost:3000`).
2. The app will detect an empty database and automatically redirect you to the **Initial Setup Wizard** (`/setup`).
3. Register your account. The first registered user is automatically assigned the **Administrator** role.
4. You are ready to go! Start logging stickers, opening packs, inviting family members, or configuring Google OAuth login in the Settings menu.

---

## 🛠️ Utility Commands

*   **Stop the application:**
    ```bash
    docker compose down
    ```
*   **View real-time logs:**
    ```bash
    docker compose logs -f app
    ```
*   **Restart the container:**
    ```bash
    docker compose restart app
    ```
