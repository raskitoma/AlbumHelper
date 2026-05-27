"use client";

import { useI18n } from "@/lib/i18n";
import styles from "./ConfirmModal.module.css";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({ isOpen, title, message, onConfirm, onCancel }: ConfirmModalProps) {
  const { t } = useI18n();

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={`${styles.modal} glass-card`} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <span className={styles.icon}>⚠️</span>
          <h3 className={styles.title}>{title}</h3>
        </div>
        <div className={styles.body}>
          <p className={styles.message}>{message}</p>
        </div>
        <div className={styles.footer}>
          <button onClick={onCancel} className="btn-secondary" style={{ padding: "0.5rem 1rem", fontSize: "0.9rem" }}>
            {t("confirmNo")}
          </button>
          <button onClick={onConfirm} className="btn-primary" style={{ padding: "0.5rem 1rem", fontSize: "0.9rem", background: "var(--danger)" }}>
            {t("confirmYes")}
          </button>
        </div>
      </div>
    </div>
  );
}
