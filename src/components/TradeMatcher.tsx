"use client";

import { useState, useEffect, useRef } from "react";
import QRCode from "qrcode";
import { Html5QrcodeScanner } from "html5-qrcode";
import styles from "./TradeMatcher.module.css";
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

interface TradeMatcherProps {
  catalog: CatalogSticker[];
  userEmail: string;
}

export default function TradeMatcher({ catalog, userEmail }: TradeMatcherProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { t } = useI18n();
  
  // Current user's sticker quantities
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [swaps, setSwaps] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Scanner states
  const [scannerActive, setScannerActive] = useState(false);
  const [scannedFriendName, setScannedFriendName] = useState<string | null>(null);
  const [scannedFriendSwaps, setScannedFriendSwaps] = useState<string[]>([]);
  const [scanMatchedStickers, setScanMatchedStickers] = useState<string[]>([]);

  // Text pasting trade fallback
  const [pasteText, setPasteText] = useState("");
  const [pasteMatchedStickers, setPasteMatchedStickers] = useState<string[]>([]);
  const [pasteFriendName, setPasteFriendName] = useState("Amigo");

  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch quantities and compute local swaps list
  const fetchQuantities = async () => {
    try {
      const res = await fetch("/api/stickers");
      if (res.ok) {
        const data = await res.json();
        setQuantities(data);

        // Compute local swaps (stickers where count >= 2)
        const localSwaps: string[] = [];
        catalog.forEach((s) => {
          if ((data[s.code] || 0) >= 2) {
            localSwaps.push(s.code);
          }
        });
        setSwaps(localSwaps);
      }
    } catch (e) {
      console.error("Error fetching quantities for trade:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuantities();
  }, []);

  // Generate QR Code on canvas when swaps or origin changes
  useEffect(() => {
    if (loading || !canvasRef.current) return;

    const protocol = window.location.protocol;
    const host = window.location.host;
    const origin = `${protocol}//${host}`;
    
    const userPrefix = userEmail.split("@")[0];
    const compressedSwaps = swaps.join(",");
    
    // Construct trade url containing user's name and duplicate list
    const tradeUrl = `${origin}/trade?name=${encodeURIComponent(userPrefix)}&swaps=${encodeURIComponent(compressedSwaps)}`;

    QRCode.toCanvas(
      canvasRef.current,
      tradeUrl,
      {
        width: 180,
        margin: 1,
        color: {
          dark: "#1e293b",
          light: "#ffffff"
        }
      },
      (error) => {
        if (error) console.error("QR Generation Error:", error);
      }
    );
  }, [swaps, loading]);

  // Clean up scanner on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch((e) => console.error("Scanner clear fail:", e));
      }
    };
  }, []);

  // Start / Stop camera scanner
  const handleToggleScanner = () => {
    if (scannerActive) {
      // Stop scanner
      if (scannerRef.current) {
        scannerRef.current.clear().catch((e) => console.error(e));
        scannerRef.current = null;
      }
      setScannerActive(false);
    } else {
      setScannerActive(true);
      // Wait for div mount
      setTimeout(() => {
        const scanner = new Html5QrcodeScanner(
          "reader",
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0
          },
          false
        );

        scanner.render(
          (decodedText) => {
            // QR Code Decoded callback
            handleDecodedQrCode(decodedText);
            // Stop scanner after success
            scanner.clear().catch((e) => console.error(e));
            scannerRef.current = null;
            setScannerActive(false);
          },
          (error) => {
            // Scanning error (silent as it polls frequently)
          }
        );

        scannerRef.current = scanner;
      }, 100);
    }
  };

  // Parse and match decoded QR data
  const handleDecodedQrCode = (text: string) => {
    try {
      const url = new URL(text);
      const name = url.searchParams.get("name") || "Amigo";
      const swapsText = url.searchParams.get("swaps") || "";
      
      const friendSwaps = swapsText.split(",").filter((s) => s.length > 0);
      setScannedFriendName(name);
      setScannedFriendSwaps(friendSwaps);

      // Match: what they have (friendSwaps) that I need (quantities[code] is 0 or undefined)
      const matched = friendSwaps.filter((code) => {
        const hasIt = (quantities[code] || 0) > 0;
        const existsInCatalog = catalog.some((s) => s.code === code);
        return !hasIt && existsInCatalog;
      });

      setScanMatchedStickers(matched);
      
      // Haptic confirmation
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate([30, 80, 30]);
      }
    } catch (e) {
      setErrorMsg(t("tradeInvalidQr"));
    }
  };

  // Match pasted text duplicate list
  const handlePasteMatch = () => {
    // Parse text to extract sticker codes.
    // Standard clipboard structure will look like "🇲🇽 MEX: 1, 3, 5 | 🇦🇷 ARG: 10" or just plain codes
    // We can write a regex that matches section codes and numbers, or simply checks every word against our catalog!
    // E.g., split by spaces, commas, slashes, and check if any word uppercase matches a catalog code
    const words = pasteText
      .toUpperCase()
      .replace(/[^A-Z0-9\s-]/g, " ") // Clean special characters
      .split(/\s+/);

    const detectedCodes: string[] = [];
    const catalogSet = new Set(catalog.map((s) => s.code));

    // Try to find direct codes (like "MEX 1" or FWC sections)
    // E.g. join word + next word and check, or check singular words
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      // Check if it matches team code and next word is a number
      const nextWord = words[i + 1] || "";
      const potentialCode = `${word} ${nextWord}`;

      if (catalogSet.has(potentialCode)) {
        detectedCodes.push(potentialCode);
        i++; // skip next word
      } else if (catalogSet.has(word)) {
        detectedCodes.push(word);
      }
    }

    const uniqueDetected = Array.from(new Set(detectedCodes));

    // Match with current user's needs
    const matched = uniqueDetected.filter((code) => {
      const hasIt = (quantities[code] || 0) > 0;
      return !hasIt;
    });

    setPasteMatchedStickers(matched);
  };

  // Helper to render matched stickers with their flags
  const renderStickersList = (codes: string[]) => {
    if (codes.length === 0) {
      return <p className={styles.emptyMatch}>{t("tradeNoMatches")}</p>;
    }

    return (
      <div className={styles.matchTags}>
        {codes.map((code) => {
          const item = catalog.find((s) => s.code === code);
          const section = SECTIONS.find((s) => s.code === item?.sectionCode);
          return (
            <span key={code} className={styles.matchStickerTag}>
              <span className={styles.matchStickerFlag}>{section?.flag || "⚽"}</span>
              <span>{code}</span>
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.row}>
        {/* Left Card: Show My QR Code */}
        <div className={`${styles.card} glass-card`}>
          <h2 className={styles.title}>{t("tradeSwapsTitle")}</h2>
          <p className={styles.desc}>
            {t("tradeSwapsDesc")}
          </p>

          {loading ? (
            <p style={{ margin: "2rem" }}>{t("tradeGeneratingQr")}</p>
          ) : (
            <>
              <div className={styles.qrContainer}>
                <canvas ref={canvasRef} className={styles.qrCanvas} />
              </div>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 600 }}>
                {t("tradeSwapsCount").replace("{count}", String(swaps.length))}
              </p>
            </>
          )}
        </div>

        {/* Right Card: Scan or Paste Matcher */}
        <div className={`${styles.card} glass-card`}>
          <h2 className={styles.title}>{t("tradeScannerTitle")}</h2>
          <p className={styles.desc}>
            {t("tradeScannerDesc")}
          </p>

          {errorMsg && (
            <div
              className={styles.alertBox}
              style={{
                background: "rgba(239, 68, 68, 0.15)",
                border: "1px solid var(--danger)",
                color: "var(--danger)",
                padding: "0.85rem",
                borderRadius: "12px",
                marginBottom: "1rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: "0.9rem"
              }}
            >
              <span>{errorMsg}</span>
              <button
                onClick={() => setErrorMsg(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--danger)",
                  cursor: "pointer",
                  fontSize: "1.2rem",
                  padding: "0 0.5rem"
                }}
              >
                ×
              </button>
            </div>
          )}

          {/* Camera Scan Display */}
          {scannerActive ? (
            <div className={styles.scannerContainer}>
              <div id="reader" className={styles.reader} />
            </div>
          ) : (
            <button onClick={handleToggleScanner} className="btn-primary">
              {t("tradeBtnCamera")}
            </button>
          )}

          {scannerActive && (
            <button onClick={handleToggleScanner} className="btn-secondary" style={{ marginTop: "0.5rem" }}>
              {t("tradeBtnCancel")}
            </button>
          )}

          {/* Scanner Match Results */}
          {scannedFriendName && (
            <div className={styles.resultsContainer} style={{ marginTop: "1.5rem", width: "100%" }}>
              <div className={styles.resultsHeader}>
                <h3 className={styles.resultsTitle}>{t("tradeMatchWith")} {scannedFriendName}</h3>
                <button
                  onClick={() => {
                    setScannedFriendName(null);
                    setScanMatchedStickers([]);
                  }}
                  className="btn-secondary"
                  style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                >
                  {t("tradeBtnCancel")}
                </button>
              </div>
              <div className={styles.resultsList}>
                <div className={styles.matchSection}>
                  <h4 className={styles.matchSectionTitle}>
                    {t("tradeCanReceive").replace("{name}", scannedFriendName).replace("{count}", String(scanMatchedStickers.length))}
                  </h4>
                  {renderStickersList(scanMatchedStickers)}
                </div>
                <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                  {t("tradeTotalSwaps").replace("{count}", String(scannedFriendSwaps.length))}
                </p>
              </div>
            </div>
          )}

          {/* Text Clipboard Pasting Matcher */}
          <div style={{ marginTop: "2rem", width: "100%", borderTop: "1px solid var(--border-subtle)", paddingTop: "1.5rem" }}>
            <h3 className={styles.title} style={{ fontSize: "1rem" }}>{t("tradePasteTitle")}</h3>
            <p className={styles.desc} style={{ fontSize: "0.85rem" }}>
              {t("tradePasteDesc")}
            </p>
            <div className={styles.pasteGroup}>
              <input
                type="text"
                value={pasteFriendName}
                onChange={(e) => setPasteFriendName(e.target.value)}
                className="input"
                placeholder={t("tradeFriendName")}
              />
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                className="input"
                placeholder={t("tradePastePlaceholder")}
                rows={3}
                style={{ fontFamily: "monospace" }}
              />
              <button onClick={handlePasteMatch} type="button" className="btn-secondary">
                {t("tradeBtnCompare")}
              </button>
            </div>

            {pasteMatchedStickers.length > 0 || pasteText ? (
              <div className={styles.resultsContainer} style={{ marginTop: "1rem" }}>
                <div className={styles.matchSection}>
                  <h4 className={styles.matchSectionTitle}>
                    {t("tradeDetectedNeeded").replace("{name}", pasteFriendName).replace("{count}", String(pasteMatchedStickers.length))}
                  </h4>
                  {renderStickersList(pasteMatchedStickers)}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
