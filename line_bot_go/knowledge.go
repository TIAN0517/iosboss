package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"time"
)

// 知識庫 API 客戶端
type KnowledgeAPI struct {
	baseURL string
	client *http.Client
	logger *log.Logger
}

// 知識庫搜索請求
type KnowledgeSearchRequest struct {
	Query string `json:"query"`
	Limit int    `json:"limit"`
}

// 知識庫搜索回應
type KnowledgeSearchResponse struct {
	Status  string   `json:"status"`
	Results []Result `json:"results"`
	Count   int      `json:"count"`
}

type Result struct {
	Title   string `json:"title"`
	Content string `json:"content"`
	Score   float64 `json:"score"`
	Source  string `json:"source"`
}

// 創建新的知識庫 API 客戶端
func NewKnowledgeAPI(baseURL string) *KnowledgeAPI {
	return &KnowledgeAPI{
		baseURL: baseURL,
		client: &http.Client{
			Timeout: 30 * time.Second,
		},
		logger: log.New(os.Stdout, "[KnowledgeAPI] ", log.LstdFlags),
	}
}

// 搜索知識庫
func (k *KnowledgeAPI) Search(query string) ([]Result, error) {
	// 構建請求體
	reqBody := KnowledgeSearchRequest{
		Query: query,
		Limit: 5,
	}
	
	jsonBody, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}
	
	// 創建 HTTP 請求
	req, err := http.NewRequest("POST", k.baseURL, bytes.NewBuffer(jsonBody))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	
	// 設置標頭
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", "LineBot-Go/1.0")
	
	// 發送請求
	resp, err := k.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()
	
	// 讀取回應
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}
	
	// 檢查 HTTP 狀態碼
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("knowledge API returned status %d: %s", resp.StatusCode, string(body))
	}
	
	// 解析回應
	var apiResponse KnowledgeSearchResponse
	if err := json.Unmarshal(body, &apiResponse); err != nil {
		return nil, fmt.Errorf("failed to unmarshal response: %w", err)
	}
	
	if apiResponse.Status != "success" {
		return nil, fmt.Errorf("knowledge API returned error: %s", string(body))
	}
	
	k.logger.Printf("Search completed for query: '%s', found %d results", query, len(apiResponse.Results))
	return apiResponse.Results, nil
}

// 獲取知識庫統計信息
func (k *KnowledgeAPI) GetStats() (map[string]interface{}, error) {
	req, err := http.NewRequest("GET", k.baseURL+"/stats", nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create stats request: %w", err)
	}
	
	req.Header.Set("User-Agent", "LineBot-Go/1.0")
	
	resp, err := k.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to send stats request: %w", err)
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("knowledge API stats returned status %d", resp.StatusCode)
	}
	
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read stats response: %w", err)
	}
	
	var stats map[string]interface{}
	if err := json.Unmarshal(body, &stats); err != nil {
		return nil, fmt.Errorf("failed to unmarshal stats response: %w", err)
	}
	
	return stats, nil
}

// 知識庫集成到 LINE Bot
type KnowledgeIntegratedBot struct {
	*LineBot
	knowledgeAPI *KnowledgeAPI
}

// 集成知識庫搜索的業務邏輯
func (bot *KnowledgeIntegratedBot) processBusinessLogicWithKnowledge(message string) string {
	// 關鍵詞檢測
	if isBusinessQuery(message) {
		return bot.processBusinessQuery(message)
	}
	
	// 知識庫搜索
	results, err := bot.knowledgeAPI.Search(message)
	if err != nil {
		bot.logger.Warn("Knowledge search failed: ", err)
		return "抱歉，搜尋服務暫時不可用。請聯繫客服。"
	}
	
	if len(results) == 0 {
		return "沒有找到相關資訊。請嘗試其他問題，或聯繫客服。"
	}
	
	// 格式化搜索結果
	return formatKnowledgeResults(results)
}

// 檢測是否為業務查詢
func isBusinessQuery(message string) bool {
	businessKeywords := []string{
		"價格", "價格表", "訂購", "訂單", "客服", "聯絡", "電話", "地址", 
		"配送", "服務", "時間", "營業", "瓦斯", "桶", "公斤", "公斤", "多少",
	}
	
	for _, keyword := range businessKeywords {
		if containsKeyword(message, keyword) {
			return true
		}
	}
	return false
}

// 檢查字符串是否包含關鍵詞
func containsKeyword(text, keyword string) bool {
	// 簡單的包含檢查
	// 實際應用中應該使用更複雜的模糊搜索
	return len(text) >= len(keyword) && 
		   contains(text, keyword) ||
		   contains(keyword, text)
}

// 字符串包含檢查
func contains(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}

// 處理業務查詢
func (bot *KnowledgeIntegratedBot) processBusinessQuery(message string) string {
	// 價格相關
	if contains(message, "價格") || contains(message, "價格表") {
		return bot.getPriceList()
	}
	
	// 訂購相關
	if contains(message, "訂購") || contains(message, "訂單") {
		return bot.getOrderInfo()
	}
	
	// 客服相關
	if contains(message, "客服") || contains(message, "聯絡") {
		return bot.getContactInfo()
	}
	
	// 時間相關
	if contains(message, "時間") || contains(message, "營業") {
		return bot.getBusinessHours()
	}
	
	// 瓦斯相關
	if contains(message, "瓦斯") {
		return bot.getGasInfo()
	}
	
	return "請問您的具體需求是什麼？"
}

// 獲取價格表
func (bot *KnowledgeIntegratedBot) getPriceList() string {
	return `🔥 瓦斯價格表 🔥

📍 美崙站 (花蓮市中美路二街79號)
📞 (03) 831-5888
├ 50公斤：NT$1,850
├ 20公斤：NT$740
├ 16公斤：NT$630
├ 10公斤：NT$450
└ 4公斤：NT$250

📍 吉安站 (花蓮縣吉安鄉南昌路25號)
📞 (03) 833-1999
├ 20公斤：NT$720
├ 16公斤：NT$610
├ 10公斤：NT$430
└ 4公斤：NT$210

💡 注意事項：
• 價格僅供參考，實際價格以現場為準
• 配送費另計
• 歡迎來電諮詢最新優惠`
}

// 獲取訂購資訊
func (bot *KnowledgeIntegratedBot) getOrderInfo() string {
	return `📋 訂購方式：

📞 電話訂購：02-XXXX-XXXX
💻 線上訂購：訪問我們的網站
📠 傳真：02-XXXX-XXXX
📧 Email：order@99gas.com

⏰ 配送時間：
• 平日：08:00-18:00
• 假日：09:00-17:00

🚚 配送範圍：
• 台北市、新北市主要地區
• 其他地區請諮詢客服`
}

// 獲取聯絡資訊
func (bot *KnowledgeIntegratedBot) getContactInfo() string {
	return `📞 客服資訊：

🔥 花蓮九九瓦斯行/帝皇瓦斯行/高銘瓦斯行

📍 美崙站
   花蓮市中美路二街79號
   📞 (03) 831-5888
   ⏰ 08:00-21:00

📍 吉安站
   花蓮縣吉安鄉南昌路25號
   📞 (03) 833-1999
   ⏰ 08:00-20:00

📍 帝皇瓦斯行
   花蓮縣吉安鄉南昌路25號
   📞 (03) 822-2688
   ⏰ 08:30-19:30

💡 如需立即服務，歡迎撥打以上電話！`
}

// 獲取營業時間
func (bot *KnowledgeIntegratedBot) getBusinessHours() string {
	return `⏰ 營業時間：

🏢 美崙站 (高銘瓦斯行)
   花蓮市中美路二街79號
   📞 (03) 831-5888
   ⏰ 週一至週日 08:00-21:00

🏢 吉安站 (九九瓦斯行)
   花蓮縣吉安鄉南昌路25號2F
   📞 (03) 833-1999
   ⏰ 週一至週日 08:00-20:00

🏢 帝皇瓦斯行
   花蓮縣吉安鄉南昌路25號
   📞 (03) 822-2688
   ⏰ 週一至週日 08:30-19:30

🚚 配送服務：
   各站點營業時間內均可安排配送`
}

// 獲取瓦斯資訊
func (bot *KnowledgeIntegratedBot) getGasInfo() string {
	return `🔥 瓦斯資訊：

📦 產品規格：
• 4kg 瓦斯桶：適合小家庭
• 10kg 瓦斯桶：一般家庭
• 16kg 瓦斯桶：大家庭
• 20kg 瓦斯桶：商業用
• 50kg 瓦斯桶：餐廳用

🔒 安全保證：
• 定期檢測確保安全
• 專業配送團隊
• 24小時緊急服務

⚠️ 使用注意事項：
• 定期檢查管線
• 保持通風良好
• 發現異味立即停用`
}

// 格式化知識庫搜索結果
func formatKnowledgeResults(results []Result) string {
	if len(results) == 0 {
		return "沒有找到相關資訊。"
	}
	
	var formatted string = "🔍 相關資訊：\n\n"
	
	for i, result := range results {
		if i >= 3 { // 限制顯示數量
			break
		}
		
		formatted += fmt.Sprintf("📄 %s\n", result.Title)
		if len(result.Content) > 100 {
			formatted += fmt.Sprintf("%s...\n\n", result.Content[:100])
		} else {
			formatted += fmt.Sprintf("%s\n\n", result.Content)
		}
	}
	
	formatted += "💡 如需更多資訊，請聯繫客服。"
	return formatted
}