"use client";

import { useState, useEffect } from "react";
import styles from "./PackOpener.module.css";
import { SECTIONS } from "@/lib/albumData";
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

interface PackOpenerProps {
  catalog: CatalogSticker[];
}

const TEAM_COLORS: Record<string, { bg: string; text: string }> = {
  ARG: { bg: "linear-gradient(to right, #74acdf, #ffffff, #74acdf)", text: "#1e293b" },
  BRA: { bg: "linear-gradient(135deg, #ffdf00, #009b3a)", text: "#1e293b" },
  COL: { bg: "linear-gradient(to right, #fcd116, #003893, #ce1126)", text: "#ffffff" },
  MEX: { bg: "linear-gradient(to bottom, #006341, #ffffff, #c8102e)", text: "#1e293b" },
  USA: { bg: "linear-gradient(135deg, #002868, #ffffff, #bf0a30)", text: "#ffffff" },
  CAN: { bg: "linear-gradient(to right, #ff0000, #ffffff, #ff0000)", text: "#1e293b" },
  ENG: { bg: "linear-gradient(135deg, #ffffff, #cf081b)", text: "#1e293b" },
  GER: { bg: "linear-gradient(to bottom, #ffffff, #000000, #dd0000)", text: "#1e293b" },
  FRA: { bg: "linear-gradient(to right, #00209f, #ffffff, #d80027)", text: "#ffffff" },
  ESP: { bg: "linear-gradient(to bottom, #c8102e, #f1bf00, #c8102e)", text: "#ffffff" },
  POR: { bg: "linear-gradient(to right, #00662d, #ff0000)", text: "#ffffff" },
  KSA: { bg: "#006c35", text: "#ffffff" },
  QAT: { bg: "#8a1538", text: "#ffffff" },
  MAR: { bg: "linear-gradient(to bottom, #c1272d, #006233, #c1272d)", text: "#ffffff" },
  SEN: { bg: "linear-gradient(to right, #00853f, #fdef42, #e31b23)", text: "#1e293b" },
  RSA: { bg: "linear-gradient(135deg, #007749, #ffb81c, #1c1c1c)", text: "#ffffff" },
  NED: { bg: "#f36c21", text: "#ffffff" },
  BEL: { bg: "linear-gradient(to right, #e30613, #ffd900, #000000)", text: "#ffffff" },
  CRO: { bg: "linear-gradient(135deg, #ff0000, #ffffff, #ff0000)", text: "#1e293b" },
  URU: { bg: "#009bd6", text: "#ffffff" },
  ITA: { bg: "#0047ab", text: "#ffffff" }
};

export default function PackOpener({ catalog }: PackOpenerProps) {
  const { t } = useI18n();

  const translatePosition = (pos: string | null, isSpecial: boolean) => {
    if (!pos) return isSpecial ? t("posSpecial") : "Cromo";
    if (pos === "Goalkeeper") return t("posGoalkeeper");
    if (pos === "Defender") return t("posDefender");
    if (pos === "Midfielder") return t("posMidfielder");
    if (pos === "Forward") return t("posForward");
    if (pos === "Badge") return t("posSpecial");
    if (pos === "Stadium") return t("posStadium");
    if (pos === "Team Photo") return t("posTeamPhoto");
    return pos;
  };

  const [packState, setPackState] = useState<"closed" | "tearing" | "opened">("closed");
  const [revealedStickers, setRevealedStickers] = useState<CatalogSticker[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");

  const fetchQuantities = async () => {
    try {
      const res = await fetch("/api/stickers");
      if (res.ok) {
        const data = await res.json();
        setQuantities(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchQuantities();
  }, []);

  const triggerHaptic = (pattern: number | number[]) => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  };

  const handleOpenPack = () => {
    if (packState !== "closed") return;
    
    setPackState("tearing");
    triggerHaptic([40, 80, 40]); // Double pulse ripping vibration

    // Wait 800ms for split animation
    setTimeout(() => {
      const revealed: CatalogSticker[] = [];

      for (let i = 0; i < 5; i++) {
        // 25% chance of shiny/special
        const isShiny = Math.random() < 0.25;
        const pool = isShiny
          ? catalog.filter((s) => s.isSpecial)
          : catalog.filter((s) => !s.isSpecial);

        const randomItem = pool[Math.floor(Math.random() * pool.length)];
        revealed.push(randomItem);
      }

      setRevealedStickers(revealed);
      setPackState("opened");
      triggerHaptic(20); // Soft deal confirmation pulse
    }, 800);
  };

  const handleSaveToAlbum = async () => {
    setSaving(true);
    setSaveStatus("idle");

    try {
      const codes = revealedStickers.map((s) => s.code);
      const res = await fetch("/api/stickers/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codes })
      });

      if (!res.ok) throw new Error();

      setSaveStatus("success");
      triggerHaptic([15, 40, 15]);
      
      // Update quantities
      fetchQuantities();
    } catch (e) {
      setSaveStatus("error");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setPackState("closed");
    setRevealedStickers([]);
    setSaveStatus("idle");
  };

  return (
    <div className={styles.container}>
      <div>
        <h1 className={styles.title}>{t("packsTitle")}</h1>
        <p className={styles.desc} style={{ marginTop: "0.25rem" }}>
          {t("packsDesc")}
        </p>
      </div>

      {packState === "closed" && (
        <div className={styles.packWrapper} onClick={handleOpenPack}>
          <div className={styles.pack}>
            <div className={styles.packShiny} />
            <div className={styles.packTearLine}>
              <span>{t("packsTearLine")}</span>
              <span>✂️</span>
            </div>
            <div className={styles.packText}>
              <span className={styles.packLogo}>⚽</span>
              <span className={styles.packTitle}>{t("packsLogoTitle")}</span>
              <span className={styles.packSub}>{t("packsLogoSub")}</span>
              <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.5)", marginTop: "1rem", fontWeight: 600 }}>
                {t("packsClickOpen")}
              </span>
            </div>
          </div>
        </div>
      )}

      {packState === "tearing" && (
        <div className={styles.packWrapper}>
          <div className={`${styles.pack} ${styles.packTornTop}`} style={{ height: "50%", position: "absolute", top: 0 }}>
            <div className={styles.packText} style={{ transform: "translateY(50%)" }}>
              <span className={styles.packLogo}>⚽</span>
            </div>
          </div>
          <div className={`${styles.pack} ${styles.packTornBottom}`} style={{ height: "50%", position: "absolute", bottom: 0 }}>
            <div className={styles.packText} style={{ transform: "translateY(-50%)" }}>
              <span className={styles.packTitle}>{t("packsLogoTitle")}</span>
            </div>
          </div>
        </div>
      )}

      {packState === "opened" && (
        <div style={{ width: "100%" }}>
          <div className={styles.cardsRow}>
            {revealedStickers.map((sticker, idx) => {
              const hasIt = (quantities[sticker.code] || 0) > 0;
              const styleDelay = { animationDelay: `${idx * 0.15}s` };
              
              const isSpecial = sticker.isSpecial;

              return (
                <div
                  key={`${sticker.code}-${idx}`}
                  className={`${styles.cardItem} ${
                    isSpecial ? styles.cardItemSpecial : ""
                  } glass-card`}
                  style={{
                    ...styleDelay,
                    background: isSpecial
                      ? "linear-gradient(135deg, #fcd34d, #d97706, #fbbf24)"
                      : TEAM_COLORS[sticker.sectionCode]?.bg || "linear-gradient(135deg, var(--primary), var(--accent))"
                  }}
                >
                  {/* Status Overlay: NUEVO or REPETIDO */}
                  <span
                    className={`${styles.cardStatus} ${
                      hasIt ? styles.statusDup : styles.statusNew
                    }`}
                  >
                    {hasIt ? t("packsCardDup") : t("packsCardNew")}
                  </span>

                  {/* Player Image / Silhouette */}
                  <div className={styles.cardVisual}>
                    {sticker.imageUrl ? (
                      <img
                        src={sticker.imageUrl}
                        alt={sticker.name}
                        className={styles.cardStarImage}
                      />
                    ) : (
                      <div className={styles.shirt}>
                        <div className={styles.shirtNum} style={{ color: isSpecial ? "#1e293b" : "white" }}>
                          {sticker.number}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Player Info */}
                  <div className={styles.cardInfo}>
                    <span
                      className={styles.cardName}
                      style={{ color: isSpecial ? "#1e293b" : "white" }}
                      title={sticker.name}
                    >
                      {sticker.name}
                    </span>
                    <span
                      className={styles.cardPos}
                      style={{ color: isSpecial ? "rgba(30,41,59,0.7)" : "rgba(255,255,255,0.7)" }}
                    >
                      {translatePosition(sticker.position, sticker.isSpecial)}
                    </span>
                    
                    {/* Badge and flag */}
                    <div className={styles.cardMeta} style={{ color: isSpecial ? "#1e293b" : "white" }}>
                      <span>{SECTIONS.find((s) => s.code === sticker.sectionCode)?.flag}</span>
                      <span className={styles.cardCode}>#{sticker.code}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Row */}
          <div className={styles.actions} style={{ margin: "2rem auto" }}>
            {saveStatus === "success" ? (
              <div
                style={{
                  background: "rgba(16, 185, 129, 0.15)",
                  border: "1px solid var(--success)",
                  color: "var(--success)",
                  padding: "0.85rem 1.5rem",
                  borderRadius: "12px",
                  fontWeight: 600,
                  width: "100%"
                }}
              >
                {t("packsSavedSuccess")}
              </div>
            ) : (
              <>
                <button
                  onClick={handleSaveToAlbum}
                  disabled={saving}
                  className="btn-primary"
                  style={{ flex: 1 }}
                >
                  {saving ? "..." : t("packsSaveBtn")}
                </button>
              </>
            )}

            <button
              onClick={handleReset}
              disabled={saving}
              className="btn-secondary"
              style={{ flex: 1 }}
            >
              {t("packsOpenAnother")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
