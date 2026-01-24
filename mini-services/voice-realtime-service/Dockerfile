# Phase 2: 实时语音 WebSocket 服务 Dockerfile
FROM node:20-alpine

WORKDIR /app

# 复制 package 文件
COPY package*.json ./
COPY tsconfig.json ./

# 复制源码
COPY index.ts ./

# 安装所有依赖（包括 TypeScript 用于编译）
RUN npm install --legacy-peer-deps

# 编译 TypeScript
RUN npx tsc

# 暴露端口
EXPOSE 3006

# 启动服务
CMD ["node", "index.js"]
