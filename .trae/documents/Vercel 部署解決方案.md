# 繼續 Vercel 部署流程

## 當前狀態

* ✅ 已完成 Vercel 瀏覽器認證

* ⏳ 終端機等待確認專案設置

## 下一步操作

1. **確認專案設置**

   * 在終端輸入 `Y` 確認設置專案

2. **部署到 Vercel**

   * 執行 `vercel --prod` 部署到生產環境

3. **配置環境變量**

   * 在 Vercel Dashboard 添加必需的環境變量

   * 包括：DATABASE\_URL, JWT\_SECRET, GLM\_API\_KEY 等

4. **測試部署**

   * 訪問部署的 URL

   * 驗證功能正常運作

## 預期結果

* 雲端 URL: `https://[project-name].vercel.app`

* 24/7 可訪問

* LINE Bot webhook 正常運作

* AI 功能使用本地 Ollama

* 數據庫：本地為主，雲端備份

