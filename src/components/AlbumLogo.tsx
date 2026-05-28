"use client";

import React from "react";

interface AlbumLogoProps {
  width?: number | string;
  height?: number | string;
  className?: string;
  style?: React.CSSProperties;
}

export default function AlbumLogo({ width = 36, height = 36, className, style }: AlbumLogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      width={width}
      height={height}
      className={className}
      style={{ flexShrink: 0, ...style }}
      aria-label="AlbumHelper Logo"
    >
      <defs>
        <linearGradient id="albumCover" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--primary, #3b82f6)" />
          <stop offset="100%" stopColor="var(--primary-hover, #1d4ed8)" />
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
