"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./DashboardLayout.module.css";
import { useI18n, Language } from "@/lib/i18n";
import AlbumLogo from "./AlbumLogo";

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
    { name: t("helpTitle") || "Ayuda", path: "/help", icon: "❓" },
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
      <main className={styles.main}>
        {children}
        <footer className={styles.footerCopyright}>
          &copy; {new Date().getFullYear()}{" "}
          <a href="https://raskitoma.io" target="_blank" rel="noopener noreferrer">
            Raskitoma.io
          </a>
        </footer>
      </main>

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
