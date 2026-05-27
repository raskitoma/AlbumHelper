import fs from "fs";
import path from "path";
import AdmZip from "adm-zip";

const BACKUP_RETENTION_DAYS = 7;

export function runBackup() {
  try {
    const todayStr = new Date().toISOString().split("T")[0];
    const prismaDir = path.join(process.cwd(), "prisma");
    const dbFilePath = path.join(prismaDir, "figuritas.db");
    const backupsDir = path.join(prismaDir, "backups");
    const backupZipPath = path.join(backupsDir, `backup_${todayStr}.zip`);

    // 1. Ensure backups directory exists
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }

    // 2. If SQLite file doesn't exist, we can't back it up yet
    if (!fs.existsSync(dbFilePath)) {
      console.log("[Backup Service] Database file not found. Skipping backup.");
      return;
    }

    // 3. If backup for today already exists, skip
    if (fs.existsSync(backupZipPath)) {
      console.log(`[Backup Service] Backup for today (${todayStr}) already exists. Skipping.`);
      return;
    }

    console.log(`[Backup Service] Creating daily backup: backup_${todayStr}.zip`);

    // 4. Compress DB to ZIP
    const zip = new AdmZip();
    zip.addLocalFile(dbFilePath);
    zip.writeZip(backupZipPath);

    console.log(`[Backup Service] Backup successfully created at: ${backupZipPath}`);

    // 5. Clean up backups older than 7 days
    cleanOldBackups(backupsDir);
  } catch (error) {
    console.error("[Backup Service] Error creating backup:", error);
  }
}

function cleanOldBackups(backupsDir: string) {
  try {
    const files = fs.readdirSync(backupsDir);
    const nowTime = new Date().getTime();

    files.forEach((file) => {
      // Expecting format: backup_YYYY-MM-DD.zip
      if (file.startsWith("backup_") && file.endsWith(".zip")) {
        const dateStr = file.replace("backup_", "").replace(".zip", "");
        const fileTime = new Date(dateStr).getTime();

        if (isNaN(fileTime)) {
          // Skip files with invalid date format
          return;
        }

        const diffTime = nowTime - fileTime;
        const diffDays = diffTime / (1000 * 60 * 60 * 24);

        if (diffDays > BACKUP_RETENTION_DAYS) {
          const filePath = path.join(backupsDir, file);
          fs.unlinkSync(filePath);
          console.log(`[Backup Service] Cleaned up old backup: ${file} (Age: ${Math.round(diffDays)} days)`);
        }
      }
    });
  } catch (error) {
    console.error("[Backup Service] Error cleaning up old backups:", error);
  }
}

let isSchedulerRunning = false;

export function startBackupScheduler() {
  if (isSchedulerRunning) return;
  isSchedulerRunning = true;

  console.log("[Backup Service] Starting Daily Backup Scheduler (7-day retention)...");

  // Run initial check on boot
  runBackup();

  // Run checks every hour to see if a new day has arrived
  setInterval(() => {
    runBackup();
  }, 1000 * 60 * 60); // 1 hour interval
}
