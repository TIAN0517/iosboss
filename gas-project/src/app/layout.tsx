import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "瓦斯器具商城 - 花蓮九九瓦斯行 · 帝皇瓦斯行 · 高銘瓦斯行",
  description: "花蓮地區專業瓦斯器具銷售與服務，提供瓦斯爐、熱水器、瓦斯桶及各類配件。花蓮九九瓦斯行、帝皇瓦斯行、高銘瓦斯行聯合服務。",
  keywords: ["瓦斯器具", "瓦斯爐", "熱水器", "瓦斯桶", "花蓮瓦斯", "花蓮九九瓦斯行", "帝皇瓦斯行", "高銘瓦斯行"],
  authors: [{ name: "瓦斯器具商城" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "瓦斯器具商城 - 花蓮專業瓦斯器具",
    description: "花蓮地區專業瓦斯器具銷售與服務",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "瓦斯器具商城",
    description: "花蓮地區專業瓦斯器具銷售與服務",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW" suppressHydrationWarning>
      <body
        className={`${inter.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
        <Sonner />
      </body>
    </html>
  );
}
