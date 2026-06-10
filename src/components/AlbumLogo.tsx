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
    <img
      src="/logo.png"
      alt="AlbumHelper Logo"
      width={width}
      height={height}
      className={className}
      style={{ flexShrink: 0, objectFit: "contain", ...style }}
    />
  );
}
