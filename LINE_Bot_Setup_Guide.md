# LINE Bot 完整設定指南
## 讓您的 Bot 在群組中正常工作

### 📋 步驟一：創建 LINE Bot

1. **訪問 LINE Developer Console**
   - 網址：https://developers.line.biz/
   - 登入您的 LINE 帳號

2. **創建新的 Provider**
   - 選擇「Create a new provider」
   - 輸入您的公司/個人名稱

3. **創建 Messaging API Channel**
   - 選擇「Messaging API」
   - 填入 Bot 資訊：
     - Bot 名稱：BossJy-99 智能助手
     - Bot 類型：Messaging API
     - 描述：瓦斯行智能客服機器人

### 🔑 步驟二：獲取重要 Token

**在 Messaging API 標籤頁面找到：**

1. **Channel access token**
   ```
   長度：約 250-300 字符
   格式：eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

2. **Channel secret**
   ```
   長度：約 32 字符  
   格式：1234567890abcdef1234567890abcdef
   ```

3. **Webhook URL**
   ```
   格式：https://your-domain.com/api/webhook/line
   本地開發：http://localhost:8888/api/webhook/line
   ```

### 🔧 步驟三：設定環境變數

**更新 .env 文件：**
```bash
# LINE Bot 設定（替換成您的真實 Token）
LINE_CHANNEL_SECRET=您的Channel_secret
LINE_CHANNEL_ACCESS_TOKEN=您的Channel_access_token

# Webhook URL
WEBHOOK_URL=https://your-domain.com/api/webhook/line

# 群組 ID（可選）
ZHANG_GROUP_ID=C986ae8b3208735b53872a6d609a7bbe7
DIHUANG_GROUP_ID=your_dihuang_group_id
EMPLOYEE_GROUP_ID=your_employee_group_id
```

### 🚀 步驟四：啟動 Bot 服務

**管理員權限啟動：**
```bash
# Windows（PowerShell 管理員）
cd c:\Users\tian7\OneDrive\Desktop\媽媽ios\line_bot_ai
python smart_group_bot.py

# 或使用完整版
python main.py
```

### 📱 步驟五：設定 Webhook

1. **在 LINE Developer Console 設定：**
   - 進入 Messaging API 標籤
   - 找到「Webhook settings」
   - 開啟「Use webhook」
   - 填入您的 Webhook URL

2. **測試連接：**
   - 點擊「Verify」
   - 確認返回「Success」

### 🤖 步驟六：邀請 Bot 到群組

**邀請方式：**
1. 在群組中點擊「+」號
2. 搜尋您的 Bot 名稱
3. 選擇「Add」

**群組使用功能：**
- @Bot 提及機器人
- 直接說「瓦斯助手」
- 群組成員皆可互動

### 💬 群組互動範例

**用戶可以說：**
- "@Bot 訂 20kg 瓦斯"
- "瓦斯助手 查詢價格"
- "有瓦斯嗎？"
- "@BossJy-99 訂單狀況"

**Bot 會回應：**
- 價格表
- 訂購指引
- 服務說明
- 聯絡方式

### 🛠️ 常見問題排除

**問題 1：Bot 無法接收訊息**
- 檢查 Webhook URL 是否正確
- 確認 HTTPS 連接（生產環境）
- 檢查 Server 狀態

**問題 2：Bot 無法回應**
- 驗證 Channel Access Token
- 檢查環境變數設定
- 確認 Bot 狀態為「On」

**問題 3：群組無法使用**
- 確認 Bot 已加入群組
- 檢查 Bot 權限設定
- 重新邀請 Bot

### 🔒 安全注意事項

1. **保護 Token**
   - 不要在程式碼中硬編碼
   - 使用環境變數
   - 定期更新 Token

2. **Webhook 安全**
   - 使用 HTTPS（生產環境）
   - 驗證 LINE Signature
   - 限制存取權限

3. **訊息內容**
   - 避免敏感資訊
   - 定期清理日誌
   - 遵守 LINE 政策

### 📞 技術支援

如需進一步協助，請提供：
1. LINE Developer Console 截圖
2. Bot 錯誤日誌
3. Webhook 設定畫面
4. 群組邀請記錄

---

**完成以上設定後，您的 Bot 就能在群組中正常工作了！** 🎉