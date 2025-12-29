# 🔍 IP 地址變更檢查指南

## ✅ 好消息

**Cloudflare Tunnel 不依賴源服務器的固定 IP 地址！**

### 為什麼？

Cloudflare Tunnel 的工作原理：
- ✅ 通過 **outbound 連接**建立（從您的服務器到 Cloudflare）
- ✅ 不依賴源服務器的公網 IP
- ✅ 即使 IP 地址改變，Tunnel 也能正常工作
- ✅ 這是 Cloudflare Tunnel 的優勢之一

## ⚠️ 但需要檢查的配置

雖然 Tunnel 本身不依賴 IP，但以下配置可能受 IP 變更影響：

### 1. API Token 的 IP 地址限制

如果您的 Cloudflare API Token 配置了 IP 地址限制：

1. **檢查 API Token 設置**：
   - 訪問：https://dash.cloudflare.com/profile/api-tokens
   - 找到您使用的 API Token
   - 檢查 **客戶端 IP 位址篩選**（Client IP Address Filtering）
   - 如果有限制，需要：
     - 添加新的 IP 地址
     - 或移除 IP 限制

### 2. Cloudflare Access 策略中的 IP 限制

如果配置了 Access 策略：

1. **檢查 Access 策略**：
   - 訪問：https://one.dash.cloudflare.com/access/policies
   - 檢查是否有 IP 地址限制規則
   - 如果有，更新為新的 IP 地址

### 3. Firewall 規則中的 IP 限制

1. **檢查 Firewall 規則**：
   - 訪問：https://dash.cloudflare.com/
   - 選擇域名：`jytian.it.com`
   - 進入 **Security** → **WAF** → **Tools**
   - 檢查是否有 IP 地址相關的規則

## 🔧 檢查步驟

### 步驟 1：獲取當前 IP 地址

```powershell
# 獲取當前公網 IP
Invoke-RestMethod -Uri "https://api.ipify.org?format=json"
```

### 步驟 2：檢查 API Token 設置

1. 訪問：https://dash.cloudflare.com/profile/api-tokens
2. 找到您使用的 API Token（名稱：`Jyt`）
3. 檢查 **客戶端 IP 位址篩選**
4. 如果有限制：
   - 點擊 **編輯**
   - 添加新的 IP 地址
   - 或選擇 **所有位址**（不限制）

### 步驟 3：檢查 Access 策略

1. 訪問：https://one.dash.cloudflare.com/access/policies
2. 檢查是否有 IP 地址限制
3. 如果有，更新為新的 IP

### 步驟 4：檢查 Firewall 規則

1. 訪問：https://dash.cloudflare.com/
2. 選擇域名：`jytian.it.com`
3. 進入 **Security** → **WAF**
4. 檢查是否有 IP 相關規則

## 🎯 最可能的原因

如果 IP 地址變更導致 521 錯誤，最可能的原因是：

**API Token 配置了 IP 地址限制**

### 解決方法：

1. **訪問 API Token 設置**：
   - https://dash.cloudflare.com/profile/api-tokens
   - 找到 Token：`Jyt`

2. **檢查 IP 限制**：
   - 查看 **客戶端 IP 位址篩選** 部分
   - 如果看到 IP 地址列表，這就是問題所在

3. **更新 IP 限制**：
   - 點擊 **編輯**
   - 添加新的 IP 地址
   - 或選擇 **所有位址**（推薦，因為 Tunnel 不依賴 IP）

4. **保存並測試**：
   - 保存設置
   - 等待 1-2 分鐘
   - 測試外網訪問

## 📋 檢查清單

- [ ] 獲取當前公網 IP 地址
- [ ] 檢查 API Token 的 IP 限制
- [ ] 檢查 Access 策略的 IP 限制
- [ ] 檢查 Firewall 規則的 IP 限制
- [ ] 更新所有 IP 限制為新 IP
- [ ] 或移除 IP 限制（推薦）

## 💡 推薦設置

對於 Cloudflare Tunnel，**建議不設置 IP 限制**，因為：
- Tunnel 通過 outbound 連接，不依賴源 IP
- 設置 IP 限制可能會導致連接問題
- 如果 IP 地址經常變更，會很麻煩

---

**下一步**：檢查 API Token 的 IP 地址限制設置，這很可能是問題所在！

