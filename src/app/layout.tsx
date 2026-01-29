import type { Metadata, Viewport } from "next";
import { Noto_Sans_TC } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { QueryProvider } from "@/components/providers/QueryProvider";

// 使用思源黑體（Noto Sans TC），適合中文顯示
const notoSansTC = Noto_Sans_TC({
  weight: ["400", "500", "700", "900"],
  subsets: ["latin"],
  variable: "--font-noto-sans-tc",
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  title: "九九瓦斯行管理系統",
  description: "專為瓦斯行設計的簡單易用管理系統，支援訂單管理、客戶管理、庫存管理等功能 - Jy技術團隊開發",
  keywords: ["瓦斯行", "管理系統", "訂單", "客戶", "庫存", "台灣", "Jy技術團隊"],
  authors: [{ name: "Jy技術團隊", url: "https://jytian.it.com" }],
  icons: {
    icon: [
      { url: "/jyt.ico", sizes: "64x64 32x32 24x24 16x16", type: "image/x-icon" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/jyt.ico",
    apple: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "瓦斯行",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
    address: false,
    email: false,
  },
  openGraph: {
    title: "九九瓦斯行管理系統",
    description: "專為瓦斯行設計的簡單易用管理系統 - Jy技術團隊",
    type: "website",
    siteName: "Jy技術團隊",
    images: ["/jyt.ico"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#f97316",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW" suppressHydrationWarning>
      <head>
        {/* iOS Safari 專用 meta 標籤 */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="瓦斯行" />
        <link rel="icon" type="image/x-icon" href="/jyt.ico" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/icon-192.png" />
        <link rel="apple-touch-icon" sizes="512x512" href="/icon-512.png" />
        <link rel="apple-touch-startup-image" href="/icon-512.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="瓦斯行 - Jy技術團隊" />
        <meta name="msapplication-TileColor" content="#f97316" />
        <meta name="msapplication-config" content="/browserconfig.xml" />

        {/* iOS 11+ 安全區域支援 */}
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, maximum-scale=1.0, user-scalable=no" />

        {/* 防止自動偵測電話號碼和地址 */}
        <meta name="format-detection" content="telephone=no,address=no,email=no" />

        {/* 預載關鍵資源 */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body
        lang="zh-TW"
        className={`${notoSansTC.variable} font-sans antialiased bg-background text-foreground ios-safe-area`}
      >
        <QueryProvider>
          {children}
        </QueryProvider>
        <Toaster />
      </body>
    </html>
  );
}
