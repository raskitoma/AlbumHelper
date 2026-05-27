"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./DashboardLayout.module.css";
import { useI18n, Language } from "@/lib/i18n";

interface DashboardLayoutProps {
  children: React.ReactNode;
  userEmail: string;
  groupName: string;
  userRole: string;
  avatarType?: string;
  avatarUrl?: string | null;
}

const langOptions: { code: Language; flagCode: string; name: string }[] = [
  { code: "es", flagCode: "es", name: "Español" },
  { code: "en", flagCode: "us", name: "English" },
  { code: "it", flagCode: "it", name: "Italiano" },
  { code: "pt", flagCode: "pt", name: "Português" },
  { code: "fr", flagCode: "fr", name: "Français" }
];

function AlbumLogo() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="36" height="36" style={{ flexShrink: 0 }} aria-label="AlbumHelper Logo">
      <defs>
        <linearGradient id="albumCover" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--primary)" />
          <stop offset="100%" stopColor="var(--primary-hover)" />
        </linearGradient>
        <linearGradient id="goldStar" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
        <linearGradient id="sticker1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ec4899" />
          <stop offset="100%" stopColor="#db2777" />
        </linearGradient>
        <linearGradient id="sticker2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
      </defs>
      {/* Left page */}
      <path d="M 8 10 L 23 6 L 23 42 L 8 38 Z" fill="url(#albumCover)" filter="drop-shadow(0px 2px 4px rgba(0,0,0,0.15))" />
      {/* Right page */}
      <path d="M 40 10 L 25 6 L 25 42 L 40 38 Z" fill="url(#albumCover)" filter="drop-shadow(0px 2px 4px rgba(0,0,0,0.15))" />
      {/* Center spine */}
      <rect x="23.5" y="6" width="1" height="36" rx="0.5" fill="rgba(255,255,255,0.3)" />
      
      {/* Left Page Details (slot outlines) */}
      <rect x="11" y="12" width="9" height="7" rx="1" transform="skewY(-6.5)" fill="rgba(255,255,255,0.15)" />
      <rect x="11" y="24" width="9" height="7" rx="1" transform="skewY(-6.5)" fill="rgba(255,255,255,0.15)" />
      
      {/* Right Page Details (colored stickers) */}
      <rect x="28" y="13" width="9" height="7" rx="1" transform="skewY(6.5)" fill="url(#sticker1)" />
      <rect x="28" y="25" width="9" height="7" rx="1" transform="skewY(6.5)" fill="url(#sticker2)" />
      
      {/* Gold badge in front */}
      <path d="M 20 16 L 22.5 21 L 28 21.5 L 24 25.5 L 25.2 31 L 20 28 L 14.8 31 L 16 25.5 L 12 21.5 L 17.5 21 Z" fill="url(#goldStar)" stroke="#ffffff" strokeWidth="1" strokeLinejoin="round" filter="drop-shadow(0px 2px 4px rgba(217, 119, 6, 0.4))" />
    </svg>
  );
}

export default function DashboardLayout({ children, userEmail, groupName, userRole, avatarType = "GRAVATAR", avatarUrl }: DashboardLayoutProps) {
  const pathname = usePathname();
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [avatarSrc, setAvatarSrc] = useState<string>("");
  const { language, setLanguage, t } = useI18n();
  const [isLangOpen, setIsLangOpen] = useState(false);
  const langDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadAvatar = async () => {
      if (avatarType === "UPLOAD" && avatarUrl) {
        setAvatarSrc(avatarUrl);
      } else {
        try {
          const msgUint8 = new TextEncoder().encode(userEmail.trim().toLowerCase());
          const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
          setAvatarSrc(`https://www.gravatar.com/avatar/${hashHex}?d=identicon&s=80`);
        } catch (e) {
          setAvatarSrc(`https://www.gravatar.com/avatar/default?d=identicon`);
        }
      }
    };
    loadAvatar();
  }, [avatarType, avatarUrl, userEmail]);

  // Sync theme with localStorage and DOM on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute("data-theme", savedTheme);
    } else {
      // Check system preference
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const initialTheme = prefersDark ? "dark" : "light";
      setTheme(initialTheme);
      document.documentElement.setAttribute("data-theme", initialTheme);
    }
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (langDropdownRef.current && !langDropdownRef.current.contains(event.target as Node)) {
        setIsLangOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  };

  const navItems = [
    { name: t("album"), path: "/album", icon: "📖" },
    { name: t("stats"), path: "/stats", icon: "📊" },
    { name: t("trade"), path: "/trade", icon: "🔄" },
    { name: t("settings"), path: "/settings", icon: "⚙️" }
  ];

  return (
    <div className={styles.wrapper}>
      {/* 1. Top Header Bar */}
      <header className={styles.header}>
        <div className={styles.logoArea}>
          <Link href="/album" style={{ display: "flex", alignItems: "center" }} title="AlbumHelper">
            <AlbumLogo />
          </Link>
        </div>

        <div className={styles.actionArea}>
          {/* Custom Language Selector */}
          <div className={styles.langDropdownContainer} ref={langDropdownRef}>
            <button
              onClick={() => setIsLangOpen(!isLangOpen)}
              className={styles.langTrigger}
              aria-expanded={isLangOpen}
              aria-label="Seleccionar idioma"
              type="button"
            >
              <img
                src={`https://flagcdn.com/w40/${language === "en" ? "us" : language}.png`}
                alt={language}
                className={styles.langTriggerFlag}
              />
            </button>
            {isLangOpen && (
              <div className={`${styles.langDropdown} glass-card`}>
                {langOptions.map((opt) => (
                  <button
                    key={opt.code}
                    onClick={() => {
                      setLanguage(opt.code);
                      setIsLangOpen(false);
                    }}
                    className={`${styles.langOption} ${language === opt.code ? styles.langOptionActive : ""}`}
                    type="button"
                  >
                    <img
                      src={`https://flagcdn.com/w40/${opt.flagCode}.png`}
                      alt={opt.name}
                      className={styles.langOptionFlag}
                    />
                    <span>{opt.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick link to Packs simulation */}
          <Link href="/packs" style={{ textDecoration: "none", fontSize: "1.2rem", cursor: "pointer", display: "flex", alignItems: "center" }} title={t("packsTitle")}>
            🎒
          </Link>
          
          <button onClick={toggleTheme} className={styles.themeToggle} aria-label={theme === "light" ? "Modo Oscuro" : "Modo Claro"}>
            {theme === "light" ? "🌙" : "☀️"}
          </button>

          <Link href="/settings" style={{ display: "flex", alignItems: "center", textDecoration: "none" }} title="Ajustes de Perfil">
            <img
              src={avatarSrc || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%2364748b' d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z'/%3E%3C/svg%3E"}
              alt="Avatar"
              className={styles.avatarImg}
            />
          </Link>
        </div>
      </header>

      {/* 2. Main Content Wrapper */}
      <main className={styles.main}>{children}</main>

      {/* 3. Bottom Glassmorphic Navigation Bar */}
      <nav className={styles.nav}>
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.path);
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`${styles.navLink} ${isActive ? styles.navLinkActive : ""}`}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
