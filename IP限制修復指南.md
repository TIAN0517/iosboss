# 🔧 IP 地址限制修復指南

## 🔍 問題分析

**IP 地址變更可能導致 521 錯誤，如果配置了 IP 限制！**

### 當前狀態
- 當前公網 IP: `49.158.236.211`
- 原本配置的 IP: 不同（您提到的）

### 為什麼會影響？

雖然 **Cloudflare Tunnel 本身不依賴固定 IP**，但以下配置可能受 IP 變更影響：

1. **API Token 的 IP 地址限制** ⚠️ **最可能**
2. Cloudflare Access 策略中的 IP 限制
3. Firewall 規則中的 IP 限制

## 🎯 最可能的原因：API Token IP 限制

如果您的 API Token 配置了 IP 地址限制，而 IP 地址變更了，Cloudflare 可能會拒絕來自新 IP 的請求。

### 檢查步驟

1. **訪問 API Token 設置**：
   - https://dash.cloudflare.com/profile/api-tokens
   - 找到 Token：`Jyt`

2. **檢查 IP 限制**：
   - 點擊 Token 名稱或編輯按鈕
   - 查看 **客戶端 IP 位址篩選**（Client IP Address Filtering）部分
   - 如果看到 IP 地址列表，這就是問題！

3. **修復方法**：

   **選項 A：添加新 IP（如果必須保留 IP 限制）**
   - 點擊 **編輯**
   - 在 **客戶端 IP 位址篩選** 部分
   - 點擊 **+ 新增其他**
   - 添加新 IP：`49.158.236.211`
   - 保存

   **選項 B：移除 IP 限制（推薦）**
   - 點擊 **編輯**
   - 在 **客戶端 IP 位址篩選** 部分
   - 刪除所有 IP 地址限制
   - 或選擇 **所有位址**（不限制）
   - 保存

## 🔧 完整修復步驟

### 步驟 1：檢查 API Token

1. 訪問：https://dash.cloudflare.com/profile/api-tokens
2. 找到 Token：`Jyt`
3. 檢查 **客戶端 IP 位址篩選**

### 步驟 2：更新 IP 限制

**如果有限制**：
- 添加新 IP：`49.158.236.211`
- 或移除所有 IP 限制（推薦）

### 步驟 3：檢查其他 IP 限制

1. **Access 策略**：
   - 訪問：https://one.dash.cloudflare.com/access/policies
   - 檢查是否有 IP 地址限制
   - 如果有，更新為新 IP

2. **Firewall 規則**：
   - 訪問：https://dash.cloudflare.com/
   - 選擇域名：`jytian.it.com`
   - 進入 **Security** → **WAF**
   - 檢查是否有 IP 相關規則

### 步驟 4：重啟服務

```powershell
docker compose restart cloudflared
```

### 步驟 5：測試

```powershell
curl https://linebot.jytian.it.com/api/webhook/line
```

## 💡 為什麼推薦移除 IP 限制？

對於 Cloudflare Tunnel：
- ✅ Tunnel 通過 outbound 連接，不依賴源 IP
- ✅ 設置 IP 限制沒有安全意義
- ✅ 如果 IP 地址經常變更，會很麻煩
- ✅ 移除限制可以避免未來的問題

## 📋 檢查清單

- [ ] 檢查 API Token 的 IP 限制
- [ ] 添加新 IP 或移除限制
- [ ] 檢查 Access 策略的 IP 限制
- [ ] 檢查 Firewall 規則的 IP 限制
- [ ] 重啟 Cloudflare Tunnel
- [ ] 測試外網訪問

## 🎯 快速修復

**最可能的情況**：API Token 配置了 IP 限制

**快速修復**：
1. 訪問：https://dash.cloudflare.com/profile/api-tokens
2. 找到 Token：`Jyt`
3. 編輯 → 客戶端 IP 位址篩選
4. 添加新 IP：`49.158.236.211` 或移除所有限制
5. 保存
6. 重啟：`docker compose restart cloudflared`
7. 測試：`curl https://linebot.jytian.it.com/api/webhook/line`

---

**這很可能是 521 錯誤的根本原因！** 請立即檢查 API Token 的 IP 限制設置。

