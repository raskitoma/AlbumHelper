"use client";

import { useState, useEffect } from "react";
import styles from "./DashboardStats.module.css";
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

interface DashboardStatsProps {
  catalog: CatalogSticker[];
}

const CONFEDERATIONS = [
  { key: "confCONMEBOL", codes: ["ARG", "BRA", "COL", "ECU", "PAR", "URU"] },
  { key: "confUEFA", codes: ["AUT", "BEL", "BIH", "CRO", "CZE", "ENG", "FRA", "GER", "NED", "NOR", "POR", "SCO", "ESP", "SWE", "SUI", "TUR"] },
  { key: "confCONCACAF", codes: ["USA", "MEX", "CAN", "CUW", "HAI", "PAN"] },
  { key: "confCAF", codes: ["ALG", "CPV", "COD", "CIV", "EGY", "GHA", "MAR", "SEN", "RSA", "TUN"] },
  { key: "confAFC", codes: ["AUS", "IRQ", "IRN", "JPN", "JOR", "KOR", "QAT", "KSA", "UZB"] },
  { key: "confOFC", codes: ["NZL"] }
];

export default function DashboardStats({ catalog }: DashboardStatsProps) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [activity, setActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { t, language } = useI18n();

  const fetchStats = async () => {
    try {
      // 1. Fetch sticker quantities
      const stickersRes = await fetch("/api/stickers");
      if (stickersRes.ok) {
        const stickersData = await stickersRes.json();
        setQuantities(stickersData);
      }

      // 2. Fetch group activity
      const groupRes = await fetch("/api/group");
      if (groupRes.ok) {
        const groupData = await groupRes.json();
        if (groupData.activity) {
          setActivity(groupData.activity);
        }
      }
    } catch (e) {
      console.error("Error loading stats dashboard:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchStats();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // ----------------------------------------------------
  // METRICS CALCULATIONS (Relative to 980 standard album stickers)
  // ----------------------------------------------------
  const standardCatalog = catalog.filter((s) => s.sectionCode !== "COKE");
  const totalAlbumStickers = 980; // 20 FWC + 48 teams * 20 = 980

  // Collected count: unique stickers owned (excluding Coke)
  const collectedCount = standardCatalog.filter((s) => (quantities[s.code] || 0) > 0).length;
  const missingCount = Math.max(0, totalAlbumStickers - collectedCount);
  const completedPercent = Math.round((collectedCount / totalAlbumStickers) * 100) || 0;

  // Swaps/Duplicates count: sum of quantities - 1 for standard owned stickers >= 2
  let duplicateCount = 0;
  standardCatalog.forEach((s) => {
    const qty = quantities[s.code] || 0;
    if (qty >= 2) {
      duplicateCount += qty - 1;
    }
  });

  // Specials collected: FWC specials + team badges (Total 68 items)
  const specialsCatalog = standardCatalog.filter((s) => s.isSpecial);
  const totalSpecials = specialsCatalog.length; // 68
  const specialsCollected = specialsCatalog.filter((s) => (quantities[s.code] || 0) > 0).length;

  // SVG Progress Arc Circle Math
  const radius = 58;
  const circumference = 2 * Math.PI * radius; // ~364.42
  const strokeDashoffset = circumference - (completedPercent / 100) * circumference;

  // ----------------------------------------------------
  // CONFEDERATIONS BREAKDOWN CALCULATIONS
  // ----------------------------------------------------
  const confedProgress = CONFEDERATIONS.map((conf) => {
    const teamCodes = conf.codes;
    const confedStickers = catalog.filter((s) => teamCodes.includes(s.sectionCode));
    const total = confedStickers.length;
    const collected = confedStickers.filter((s) => (quantities[s.code] || 0) > 0).length;
    const percent = Math.round((collected / total) * 100) || 0;

    return { name: t(conf.key), total, collected, percent };
  });

  // ----------------------------------------------------
  // POSITIONS BREAKDOWN CALCULATIONS
  // ----------------------------------------------------
  const POSITIONS = ["Goalkeeper", "Defender", "Midfielder", "Forward"];
  const positionProgress = POSITIONS.map((pos) => {
    const posStickers = catalog.filter((s) => s.position === pos);
    const total = posStickers.length;
    const collected = posStickers.filter((s) => (quantities[s.code] || 0) > 0).length;
    const percent = Math.round((collected / total) * 100) || 0;

    // Display translation mapping
    const translate: Record<string, string> = {
      Goalkeeper: t("posGoalkeeper"),
      Defender: t("posDefender"),
      Midfielder: t("posMidfielder"),
      Forward: t("posForward")
    };

    return { name: translate[pos] || pos, total, collected, percent };
  });

  return (
    <div className={styles.container}>
      {/* H1 header is handled by parent, let's render overview card */}
      <div className={`${styles.overviewRow} glass-card`}>
        {/* Progress Ring Card */}
        <div className={styles.progressRingCard}>
          <div className={styles.ringContainer}>
            <svg className={styles.svg}>
              <circle className={styles.ringBg} cx="75" cy="75" r={radius} />
              <circle
                className={styles.ringBar}
                cx="75"
                cy="75"
                r={radius}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
              />
            </svg>
            <div className={styles.ringText}>
              <span className={styles.percentVal}>{completedPercent}%</span>
              <span className={styles.percentLabel}>{t("statsCompleted")}</span>
            </div>
          </div>
        </div>

        {/* Metrics details */}
        <div className={styles.metricsGrid}>
          <div className={`${styles.metricCard} glass-card`}>
            <span className={styles.metricLabel}>{t("statsTotal")}</span>
            <span className={styles.metricValue}>{totalAlbumStickers}</span>
          </div>
          <div className={`${styles.metricCard} glass-card`}>
            <span className={styles.metricLabel}>{t("statsCollected")}</span>
            <span className={styles.metricValue} style={{ color: "var(--primary)" }}>{collectedCount}</span>
          </div>
          <div className={`${styles.metricCard} glass-card`}>
            <span className={styles.metricLabel}>{t("statsMissing")}</span>
            <span className={styles.metricValue} style={{ color: "var(--text-secondary)" }}>{missingCount}</span>
          </div>
          <div className={`${styles.metricCard} glass-card`}>
            <span className={styles.metricLabel}>{t("statsSwaps")}</span>
            <span className={styles.metricValue} style={{ color: "var(--danger)" }}>{duplicateCount}</span>
          </div>
          <div className={`${styles.metricCard} glass-card`}>
            <span className={styles.metricLabel}>{t("statsSpecials")}</span>
            <span className={styles.metricValue} style={{ color: "var(--accent)" }}>{specialsCollected}/{totalSpecials}</span>
          </div>
        </div>
      </div>

      {/* Regional / Positional breakdowns */}
      <div className={styles.breakdownSection}>
        {/* Confederation Card */}
        <div className={`${styles.breakdownCard} glass-card`}>
          <h3 className={styles.cardHeader}>{t("statsByConf")}</h3>
          {confedProgress.map((item) => (
            <div key={item.name} className={styles.progressItem}>
              <div className={styles.progressMeta}>
                <span className={styles.progressName}>{item.name}</span>
                <span className={styles.progressVal}>
                  {item.collected}/{item.total} ({item.percent}%)
                </span>
              </div>
              <div className={styles.progressTrack}>
                <div
                  className={styles.progressBar}
                  style={{
                    width: `${item.percent}%`,
                    background: "linear-gradient(to right, var(--primary), var(--accent))"
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Position Card */}
        <div className={`${styles.breakdownCard} glass-card`}>
          <h3 className={styles.cardHeader}>{t("statsByPos")}</h3>
          {positionProgress.map((item) => (
            <div key={item.name} className={styles.progressItem}>
              <div className={styles.progressMeta}>
                <span className={styles.progressName}>{item.name}</span>
                <span className={styles.progressVal}>
                  {item.collected}/{item.total} ({item.percent}%)
                </span>
              </div>
              <div className={styles.progressTrack}>
                <div
                  className={styles.progressBar}
                  style={{
                    width: `${item.percent}%`,
                    background: "linear-gradient(to right, var(--primary), var(--success))"
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity Timeline Feed */}
      <div className={`${styles.activityCard} glass-card`}>
        <h3 className={styles.cardHeader}>{t("recentActivity")}</h3>
        <div className={styles.activityList}>
          {activity.length === 0 ? (
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", textAlign: "center", padding: "1rem" }}>
              {t("noActivity")}
            </p>
          ) : (
            activity.map((log) => {
              const date = new Date(log.timestamp);
              const localeStr = language === "es" ? "es-ES" : language;
              const timeString = date.toLocaleTimeString(localeStr, { hour: "2-digit", minute: "2-digit" });
              const dateString = date.toLocaleDateString(localeStr);
              
              const isAdd = log.action === "ADD";
              const initials = log.userEmail.substring(0, 2);

              return (
                <div key={log.id} className={styles.activityItem}>
                  <div className={styles.activityAvatar}>{initials}</div>
                  <div className={styles.activityContent}>
                    <p className={styles.activityText}>
                      <span style={{ fontWeight: 700 }}>{log.userEmail}</span>{" "}
                      {isAdd ? (
                        <span className={styles.activityActionAdd}>{t("addedSticker")}</span>
                      ) : (
                        <span className={styles.activityActionRemove}>{t("removedSticker")}</span>
                      )}{" "}
                      <span className={styles.activityCode}>{log.stickerCode}</span>
                    </p>
                    <div className={styles.activityTime}>
                      {dateString} {t("atTime")} {timeString}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
