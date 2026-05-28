"use client";

import { useState, useEffect, useRef } from "react";
import ConfirmModal from "./ConfirmModal";
import ShareModal from "./ShareModal";
import styles from "./StickerAlbum.module.css";
import { SECTIONS, SectionInfo } from "@/lib/albumData";
import { useI18n } from "@/lib/i18n";
import { getFlagImgUrl } from "@/lib/flagUtils";

interface CatalogSticker {
  code: string;
  sectionCode: string;
  number: number;
  name: string;
  position: string | null;
  imageUrl: string | null;
  isSpecial: boolean;
}

interface StickerAlbumProps {
  catalog: CatalogSticker[];
}

// Map country codes to primary colors for stylized shirts
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

export default function StickerAlbum({ catalog }: StickerAlbumProps) {
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

  // Collection counts mapping: { "MEX 1": 2 }
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  // FIFA -> ISO country code mapping for flag images
  const [flagMap, setFlagMap] = useState<Record<string, string>>({});

  // Layout and filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "need" | "swaps">("all");
  const [sortBy, setSortBy] = useState<"album" | "alpha">("album");
  const [bulkText, setBulkText] = useState("");
  
  // Collapse state: default everything expanded
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});



  // Confirm Modal states
  const [confirmStickerCode, setConfirmStickerCode] = useState<string | null>(null);

  // Share Modal states
  const [isShareOpen, setIsShareOpen] = useState(false);

  // Long-press detection helpers for mobile
  const longPressActiveRef = useRef(false);
  const touchTimerRef = useRef<any>(null);

  // Fetch quantities and trigger 5-second polling (visibility-aware)
  const fetchQuantities = async () => {
    try {
      const res = await fetch("/api/stickers");
      if (res.ok) {
        const data = await res.json();
        setQuantities(data);
      }
    } catch (e) {
      console.error("Error fetching sticker quantities:", e);
    } finally {
      setLoading(false);
    }
  };

  // Fetch FIFA->ISO flag mapping
  const fetchFlagMap = async () => {
    try {
      const res = await fetch("/api/flags");
      if (res.ok) {
        const data = await res.json();
        setFlagMap(data);
      }
    } catch (e) {
      console.error("Error fetching flag map:", e);
    }
  };

  useEffect(() => {
    fetchQuantities();
    fetchFlagMap();

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchQuantities();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Haptic feedback provider
  const triggerHaptic = (pattern: number | number[]) => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  };

  // Mutate sticker quantity API caller
  const updateStickerQuantity = async (code: string, action: "add" | "remove") => {
    // 1. Check if trying to remove a collected cromo (1 -> 0) to prompt confirm
    if (action === "remove" && (quantities[code] || 0) === 1 && !confirmStickerCode) {
      setConfirmStickerCode(code);
      return;
    }

    // Clear confirm state if verified
    setConfirmStickerCode(null);

    // Optimistic UI updates
    const currentQty = quantities[code] || 0;
    const newQty = action === "add" ? currentQty + 1 : Math.max(0, currentQty - 1);
    
    setQuantities((prev) => {
      const updated = { ...prev };
      if (newQty === 0) {
        delete updated[code];
      } else {
        updated[code] = newQty;
      }
      return updated;
    });

    // Vibration feedback
    if (action === "add") {
      triggerHaptic(newQty >= 2 ? [10, 30, 10] : 15);
    } else {
      triggerHaptic(40);
    }

    try {
      const res = await fetch("/api/stickers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stickerCode: code, action })
      });
      if (!res.ok) {
        throw new Error();
      }
      const data = await res.json();
      // Re-align count from server response
      setQuantities((prev) => {
        const updated = { ...prev };
        if (data.quantity === 0) {
          delete updated[code];
        } else {
          updated[code] = data.quantity;
        }
        return updated;
      });
    } catch (e) {
      // Revert optimistic update on fail
      fetchQuantities();
    }
  };

  // Bulk Quick-Add Submit Handler
  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkText.trim()) return;

    // Split on commas
    const codes = bulkText.split(",").map((c) => c.trim().toUpperCase());
    setBulkText("");

    // Optimistic additions
    setQuantities((prev) => {
      const updated = { ...prev };
      codes.forEach((c) => {
        updated[c] = (updated[c] || 0) + 1;
      });
      return updated;
    });
    triggerHaptic([20, 50, 20]);

    try {
      const res = await fetch("/api/stickers/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codes })
      });
      fetchQuantities(); // Pull fresh server counts
    } catch (e) {
      fetchQuantities();
    }
  };

  // Decouple touch long press parameters for mobile
  const handleTouchStart = (code: string) => {
    longPressActiveRef.current = false;
    touchTimerRef.current = setTimeout(() => {
      longPressActiveRef.current = true;
      updateStickerQuantity(code, "remove");
    }, 500); // 500ms long press threshold
  };

  const handleTouchEnd = () => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
    }
  };

  const handleStickerClick = (sticker: CatalogSticker) => {
    if (longPressActiveRef.current) {
      longPressActiveRef.current = false;
      return; // Ignore clicking if it was a long-press
    }
    // Tap increments the cromo
    updateStickerQuantity(sticker.code, "add");
  };

  const handleContextMenu = (e: React.MouseEvent, code: string) => {
    e.preventDefault(); // Disable default context menu
    updateStickerQuantity(code, "remove");
  };

  const toggleSection = (code: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [code]: !prev[code]
    }));
  };

  // ----------------------------------------------------
  // FILTERING AND SORTING ENGINE
  // ----------------------------------------------------
  
  // Sort sections depending on toggle
  const getSortedSections = (): SectionInfo[] => {
    if (sortBy === "album") {
      return SECTIONS;
    }
    // Alphabetical Order
    const specials = SECTIONS.filter((s) => s.type === "special");
    const teams = SECTIONS.filter((s) => s.type === "team").sort((a, b) =>
      a.name.localeCompare(b.name, "es-ES")
    );
    const promos = SECTIONS.filter((s) => s.type === "promo");
    return [...specials, ...teams, ...promos];
  };

  const filteredSections = getSortedSections().map((section) => {
    // Get all stickers in this section
    const sectionStickers = catalog.filter((s) => s.sectionCode === section.code);

    // Apply search and status filters
    const filteredStickers = sectionStickers.filter((sticker) => {
      // 1. Text Search Filter (name, code, or position)
      const matchesSearch =
        searchTerm === "" ||
        sticker.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sticker.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (sticker.position && sticker.position.toLowerCase().includes(searchTerm.toLowerCase()));

      if (!matchesSearch) return false;

      // 2. Ownership Filter
      const qty = quantities[sticker.code] || 0;
      if (statusFilter === "need") {
        return qty === 0;
      }
      if (statusFilter === "swaps") {
        return qty >= 2;
      }
      return true; // "all"
    });

    return {
      ...section,
      stickers: filteredStickers,
      totalCount: sectionStickers.length
    };
  }).filter((sec) => sec.stickers.length > 0 || searchTerm !== ""); // Hide empty sections during searches

  const translateGroup = (group: string | undefined) => {
    if (!group) return "";
    const groupPart = group.replace("Grupo ", "");
    return `${t("groupText")} ${groupPart}`;
  };

  return (
    <div className={styles.container}>
      {/* 1. Floating Search & Filter Bar (Sticky) */}
      <div className={`${styles.floatingControls} glass-card`}>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={`${styles.searchInput} input`}
          placeholder={t("searchPlaceholder")}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className={styles.filterSelect}
        >
          <option value="all">{t("filterAll")}</option>
          <option value="need">{t("filterNeed")}</option>
          <option value="swaps">{t("filterSwaps")}</option>
        </select>
      </div>

      {/* 2. Utility settings and actions card (Non-sticky) */}
      <div className={`${styles.utilityCard} glass-card`}>
        <div className={styles.utilityLeft}>
          <div className={styles.buttonGroup}>
            <button
              onClick={() => setSortBy("album")}
              className={`${styles.toggleBtn} ${sortBy === "album" ? styles.toggleBtnActive : ""}`}
            >
              {t("orderOfficial")}
            </button>
            <button
              onClick={() => setSortBy("alpha")}
              className={`${styles.toggleBtn} ${sortBy === "alpha" ? styles.toggleBtnActive : ""}`}
            >
              {t("orderAlpha")}
            </button>
          </div>
          <button
            type="button"
            onClick={() => setIsShareOpen(true)}
            className={styles.shareBtn}
          >
            {t("shareBtn")}
          </button>
        </div>

        {/* Bulk Quick-Add Console */}
        <form onSubmit={handleBulkSubmit} className={styles.bulkConsole}>
          <input
            type="text"
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            className={`${styles.bulkInput} input`}
            placeholder={t("bulkPlaceholder")}
          />
          <button type="submit" className={`${styles.bulkBtn} btn-primary`}>
            {t("bulkBtn")}
          </button>
        </form>
      </div>

      {/* 2. Interactive Sections Grid */}
      <div className={styles.albumGrid}>
        {filteredSections.map((section) => {
          const isCollapsed = collapsedSections[section.code] || false;
          
          // Calculate progress for this section
          const sectionStickerCodes = catalog.filter((s) => s.sectionCode === section.code).map((s) => s.code);
          const collectedInSection = sectionStickerCodes.filter((c) => (quantities[c] || 0) > 0).length;
          const sectionProgressPercent = Math.round((collectedInSection / sectionStickerCodes.length) * 100) || 0;

          return (
            <div
              key={section.code}
              className={`${styles.section} glass-card ${isCollapsed ? styles.sectionCollapsed : ""}`}
            >
              {/* Header */}
              <div
                onClick={() => toggleSection(section.code)}
                className={`${styles.sectionHeader} ${
                  section.type === "special"
                    ? styles.headerSpecial
                    : section.type === "promo"
                    ? styles.headerPromo
                    : styles.headerTeam
                }`}
              >
                <div className={styles.sectionLeft}>
                  {flagMap[section.code] ? (
                    <img
                      src={getFlagImgUrl(flagMap[section.code]) || ""}
                      alt={section.name}
                      className={styles.sectionFlagImg}
                      onError={(e) => {
                        // Fallback to emoji if CDN image fails
                        (e.target as HTMLImageElement).style.display = "none";
                        const parent = (e.target as HTMLImageElement).parentElement;
                        if (parent) {
                          const span = document.createElement("span");
                          span.className = styles.sectionFlag || "";
                          span.textContent = section.flag;
                          parent.insertBefore(span, e.target as HTMLImageElement);
                        }
                      }}
                    />
                  ) : (
                    <span className={styles.sectionFlag}>{section.flag}</span>
                  )}
                  <h2 className={styles.sectionTitle}>{section.name}</h2>
                  {section.type === "team" && (
                    <span className={styles.sectionCode}>{section.code}</span>
                  )}
                  {section.group && <span className={styles.sectionGroup}>{translateGroup(section.group)}</span>}
                </div>
                <div className={styles.sectionRight}>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 700 }}>
                    {collectedInSection}/{sectionStickerCodes.length} ({sectionProgressPercent}%)
                  </span>
                  <span className={styles.sectionArrow}>▼</span>
                </div>
              </div>

              {/* Body */}
              <div className={styles.sectionBody}>
                <div className={styles.stickerGrid}>
                  {section.stickers.map((sticker) => {
                    const qty = quantities[sticker.code] || 0;
                    const isOwned = qty > 0;
                    
                    // Determine class states
                    let stickerStyle = styles.stickerEmpty;
                    if (sticker.isSpecial) {
                      stickerStyle = isOwned ? styles.stickerSpecialOwned : styles.stickerSpecialEmpty;
                    } else if (isOwned) {
                      stickerStyle = styles.stickerOwned;
                    }

                    return (
                      <div
                        key={sticker.code}
                        onClick={() => handleStickerClick(sticker)}
                        onContextMenu={(e) => handleContextMenu(e, sticker.code)}
                        onTouchStart={() => handleTouchStart(sticker.code)}
                        onTouchEnd={handleTouchEnd}
                        className={`${styles.sticker} ${stickerStyle}`}
                        title={`${sticker.name} (${translatePosition(sticker.position, sticker.isSpecial)})`}
                      >
                        {sticker.number}

                        {/* Duplicate alert tag (+X indicator) */}
                        {qty >= 2 && (
                          <div className={styles.duplicateTag}>
                            {qty - 1}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>



      {/* 4. Custom Glassmorphic Removal Confirmation Modal */}
      <ConfirmModal
        isOpen={!!confirmStickerCode}
        title={t("confirmTitle")}
        message={t("confirmMsg")}
        onConfirm={() => confirmStickerCode && updateStickerQuantity(confirmStickerCode, "remove")}
        onCancel={() => setConfirmStickerCode(null)}
      />

      {/* 5. Custom Glassmorphic Share Modal */}
      <ShareModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        quantities={quantities}
        catalog={catalog}
      />
    </div>
  );
}
