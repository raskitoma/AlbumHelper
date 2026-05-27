"use client";

import { useState, useEffect } from "react";
import { SECTIONS } from "@/lib/albumData";
import styles from "./ShareModal.module.css";
import { useI18n } from "@/lib/i18n";

interface CatalogSticker {
  code: string;
  sectionCode: string;
  number: number;
  name: string;
  position: string | null;
  imageUrl: string | null;
  isSpecial: boolean;
}

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  quantities: Record<string, number>;
  catalog: CatalogSticker[];
}

export default function ShareModal({ isOpen, onClose, quantities, catalog }: ShareModalProps) {
  const [copyingType, setCopyingType] = useState<string | null>(null);
  const { t } = useI18n();

  // Prevent scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const generateShareText = (type: "missing" | "swaps" | "have") => {
    let text = "";
    if (type === "missing") {
      text = `${t("shareMissingHeader")}\n\n`;
    } else if (type === "swaps") {
      text = `${t("shareSwapsHeader")}\n\n`;
    } else {
      text = `${t("shareHaveHeader")}\n\n`;
    }

    let totalCount = 0;

    SECTIONS.forEach((section) => {
      const sectionStickers = catalog.filter((s) => s.sectionCode === section.code);
      const matches: string[] = [];
      
      sectionStickers.forEach((sticker) => {
        const qty = quantities[sticker.code] || 0;
        if (type === "missing" && qty === 0) {
          matches.push(sticker.number.toString());
        } else if (type === "swaps" && qty >= 2) {
          const duplicateCount = qty - 1;
          matches.push(duplicateCount > 1 ? `${sticker.number} (x${duplicateCount})` : `${sticker.number}`);
        } else if (type === "have" && qty >= 1) {
          matches.push(sticker.number.toString());
        }
      });

      if (matches.length > 0) {
        text += `${section.flag} ${section.code}: ${matches.join(", ")}\n`;
        totalCount += matches.length;
      }
    });

    if (totalCount === 0) {
      text += t("shareEmptyList");
    } else {
      text += `\n${t("shareTotal").replace("{count}", String(totalCount))}`;
    }
    return text;
  };

  const handleCopy = async (type: "missing" | "swaps" | "have") => {
    const text = generateShareText(type);
    try {
      await navigator.clipboard.writeText(text);
      setCopyingType(type);
      setTimeout(() => setCopyingType(null), 2000);
    } catch (err) {
      console.error("No se pudo copiar el texto: ", err);
    }
  };

  const handleShare = async (type: "missing" | "swaps" | "have") => {
    const text = generateShareText(type);
    const title = type === "missing" ? t("listMissing") : type === "swaps" ? t("listSwaps") : t("listHave");
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Figuritas - ${title}`,
          text: text
        });
      } catch (err) {
        console.error("Error al compartir: ", err);
      }
    } else {
      // Fallback to copy if Web Share is not supported
      handleCopy(type);
    }
  };

  const isShareSupported = typeof navigator !== "undefined" && !!navigator.share;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={`${styles.modal} glass-card`} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose}>×</button>
        
        <div>
          <h2 className={styles.title}>{t("shareTitle")}</h2>
          <p className={styles.desc}>
            {t("shareDesc")}
          </p>
        </div>

        {/* 1. Missing List */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>
            <span>⚽</span> {t("listMissing")}
          </div>
          <div className={styles.preview}>
            {generateShareText("missing")}
          </div>
          <div className={styles.actions}>
            <button
              onClick={() => handleCopy("missing")}
              className={`${styles.actionBtn} btn-secondary`}
            >
              {copyingType === "missing" ? t("shareCopied") : t("shareCopy")}
            </button>
            {isShareSupported && (
              <button
                onClick={() => handleShare("missing")}
                className={`${styles.actionBtn} btn-primary`}
              >
                {t("shareNative")}
              </button>
            )}
          </div>
        </div>

        {/* 2. Duplicates List */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>
            <span>🔄</span> {t("listSwaps")}
          </div>
          <div className={styles.preview}>
            {generateShareText("swaps")}
          </div>
          <div className={styles.actions}>
            <button
              onClick={() => handleCopy("swaps")}
              className={`${styles.actionBtn} btn-secondary`}
            >
              {copyingType === "swaps" ? t("shareCopied") : t("shareCopy")}
            </button>
            {isShareSupported && (
              <button
                onClick={() => handleShare("swaps")}
                className={`${styles.actionBtn} btn-primary`}
              >
                {t("shareNative")}
              </button>
            )}
          </div>
        </div>

        {/* 3. Collected List */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>
            <span>✨</span> {t("listHave")}
          </div>
          <div className={styles.preview}>
            {generateShareText("have")}
          </div>
          <div className={styles.actions}>
            <button
              onClick={() => handleCopy("have")}
              className={`${styles.actionBtn} btn-secondary`}
            >
              {copyingType === "have" ? t("shareCopied") : t("shareCopy")}
            </button>
            {isShareSupported && (
              <button
                onClick={() => handleShare("have")}
                className={`${styles.actionBtn} btn-primary`}
              >
                {t("shareNative")}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
