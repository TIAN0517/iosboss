import path from 'path';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Vercel 不需要 standalone 模式，使用默認輸出
  // output: "standalone", // 註釋掉，讓 Vercel 使用默認輸出
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  reactStrictMode: false,
  // 確保環境變數在構建時可用
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  },
  // 明確配置 webpack 路徑別名解析
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
    };
    return config;
  },
};

export default nextConfig;
