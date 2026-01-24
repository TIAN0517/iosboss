/**
 * 品牌圖標組件
 * 統一使用 jyt.ico 作為品牌標誌
 * Jy技術團隊品牌 - 唯一圖標
 */

import React, { useState } from 'react';

interface BrandIconProps {
  className?: string;
  size?: number;
}

export const BrandIcon = ({ className = "", size = 24 }: BrandIconProps) => {
  const [imgError, setImgError] = useState(false);
  const [imgSrc, setImgSrc] = useState("/jyt.ico");

  // 如果 ICO 加載失敗，嘗試使用 SVG
  const handleError = () => {
    if (imgSrc === "/jyt.ico") {
      setImgError(true);
      setImgSrc("/logo.svg");
    } else if (imgSrc === "/logo.svg") {
      // 如果 SVG 也失敗，使用文字備用方案
      setImgSrc("");
    }
  };

  // 如果所有圖標都加載失敗，顯示文字備用方案
  if (!imgSrc) {
    return (
      <div
        className={`flex items-center justify-center bg-gradient-to-br from-orange-500 to-red-600 text-white font-bold rounded-full ${className}`}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          fontSize: `${size * 0.4}px`,
        }}
      >
        九
      </div>
    );
  }

  return (
    <img
      src={imgSrc}
      alt="九九瓦斯行 - Jy技術團隊"
      width={size}
      height={size}
      className={className}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        display: 'block',
        objectFit: 'contain',
        flexShrink: 0,
        userSelect: 'none',
        pointerEvents: 'none'
      }}
      onError={handleError}
      loading="eager"
      onLoad={() => setImgError(false)}
    />
  );
};

export default BrandIcon;
