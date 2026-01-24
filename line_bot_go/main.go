package main

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gorilla/mux"
	"github.com/joho/godotenv"
	"github.com/sirupsen/logrus"
)

type Config struct {
	// LINE API 配置
	ChannelSecret    string
	ChannelAccessToken string
	
	// 數據庫配置
	DatabaseURL string
	DBHost     string
	DBPort     string
	DBName     string
	DBUser     string
	DBPassword string
	
	// 其他服務
	KnowledgeAPIURL string
	Port           string
}

type LineBot struct {
	config         *Config
	database       *Database
	knowledgeAPI   *KnowledgeAPI
	logger         *logrus.Logger
	lineSDK        *LineBotSDK
}

type LineBotSDK struct {
	ChannelSecret string
}

type WebhookEvent struct {
	Events []LineEvent `json:"events"`
}

type LineEvent struct {
	Type      string `json:"type"`
	Source    Source `json:"source"`
	ReplyToken string `json:"replyToken"`
	Message    Message `json:"message"`
}

type Source struct {
	Type   string `json:"type"`
	UserID string `json:"userId"`
	GroupID string `json:"groupId"`
}

type Message struct {
	Type string `json:"type"`
	ID   string `json:"id"`
	Text string `json:"text"`
}

type Response struct {
	Status  string `json:"status"`
	Message string `json:"message"`
	Timestamp string `json:"timestamp"`
}

func NewConfig() *Config {
	return &Config{
		// 從環境變量讀取配置
		ChannelSecret:    os.Getenv("LINE_CHANNEL_SECRET"),
		ChannelAccessToken: os.Getenv("LINE_CHANNEL_ACCESS_TOKEN"),
		DatabaseURL:    os.Getenv("DATABASE_URL"),
		DBHost:         os.Getenv("DB_HOST"),
		DBPort:         os.Getenv("DB_PORT"),
		DBName:         os.Getenv("DB_NAME"),
		DBUser:         os.Getenv("DB_USER"),
		DBPassword:     os.Getenv("DB_PASSWORD"),
		KnowledgeAPIURL: os.Getenv("KNOWLEDGE_API_URL"),
		Port:           os.Getenv("PORT"),
	}
}

func NewLineBot() (*LineBot, error) {
	// 載入環境變量
	if err := godotenv.Load(); err != nil {
		log.Println("Warning: .env file not found")
	}

	config := NewConfig()

	// 初始化日誌
	logger := logrus.New()
	logger.SetLevel(logrus.InfoLevel)
	logger.SetFormatter(&logrus.JSONFormatter{})

	// 初始化數據庫連接
	database, err := InitDatabase(config)
	if err != nil {
		log.Printf("Warning: Database initialization failed: %v", err)
		// 不返回錯誤，讓應用可以無數據庫運行
	}

	// 初始化知識庫 API
	knowledgeAPI := NewKnowledgeAPI(config.KnowledgeAPIURL)

	// 初始化 LINE SDK
	lineSDK := &LineBotSDK{
		ChannelSecret: config.ChannelSecret,
	}

	return &LineBot{
		config:       config,
		database:     database,
		knowledgeAPI: knowledgeAPI,
		logger:       logger,
		lineSDK:      lineSDK,
	}, nil
}

// 初始化數據庫連接（使用 database.go 中的函數）

// 驗證 LINE 簽名
func (bot *LineBot) verifySignature(body []byte, signature string) bool {
	expectedSignature := bot.generateSignature(body)
	return hmac.Equal([]byte(expectedSignature), []byte(signature))
}

func (bot *LineBot) generateSignature(body []byte) string {
	mac := hmac.New(sha256.New, []byte(bot.config.ChannelSecret))
	mac.Write(body)
	return hex.EncodeToString(mac.Sum(nil))
}

// 處理 LINE webhook
func (bot *LineBot) handleWebhook(w http.ResponseWriter, r *http.Request) {
	// 獲取請求體
	body := make([]byte, r.ContentLength)
	_, err := r.Body.Read(body)
	if err != nil {
		bot.logger.Error("Failed to read request body: ", err)
		http.Error(w, "Bad Request", 400)
		return
	}
	
	// 驗證 LINE 簽名
	signature := r.Header.Get("X-Line-Signature")
	if signature == "" {
		bot.logger.Warn("Missing X-Line-Signature header")
		http.Error(w, "Missing signature", 403)
		return
	}
	
	if !bot.verifySignature(body, signature) {
		bot.logger.Warn("Invalid LINE signature")
		http.Error(w, "Invalid signature", 403)
		return
	}
	
	// 解析 webhook 事件
	var webhook WebhookEvent
	if err := json.Unmarshal(body, &webhook); err != nil {
		bot.logger.Error("Failed to parse webhook JSON: ", err)
		http.Error(w, "Bad Request", 400)
		return
	}
	
	// 處理事件
	bot.processEvents(webhook.Events)
	
	w.WriteHeader(200)
}

// 處理 LINE 事件
func (bot *LineBot) processEvents(events []LineEvent) {
	for _, event := range events {
		switch event.Type {
		case "message":
			bot.handleMessage(event)
		case "follow":
			bot.handleFollow(event)
		case "unfollow":
			bot.handleUnfollow(event)
		default:
			bot.logger.Info("Unhandled event type: ", event.Type)
		}
	}
}

// 處理訊息事件
func (bot *LineBot) handleMessage(event LineEvent) {
	bot.logger.WithFields(logrus.Fields{
		"userId":  event.Source.UserID,
		"message": event.Message.Text,
	}).Info("Processing message")
	
	// 根據訊息類型處理
	switch event.Message.Type {
	case "text":
		bot.handleTextMessage(event)
	case "image":
		bot.handleImageMessage(event)
	default:
		bot.sendTextMessage(event, "很抱歉，我只支援文字訊息。")
	}
}

// 處理文字訊息
func (bot *LineBot) handleTextMessage(event LineEvent) {
	message := event.Message.Text
	
	// 處理業務邏輯
	response := bot.processBusinessLogic(message)
	
	// 回覆訊息
	bot.sendTextMessage(event, response)
}

// 處理圖片訊息
func (bot *LineBot) handleImageMessage(event LineEvent) {
	bot.sendTextMessage(event, "收到了圖片，但目前僅支援文字訊息。")
}

// 處理業務邏輯
func (bot *LineBot) processBusinessLogic(message string) string {
	// 這裡實現與 Python 版本相同的業務邏輯
	// 例如：知識庫查詢、AI 處理等
	
	// 簡單的響應邏輯
	if message == "hi" || message == "你好" || message == "Hello" {
		return "你好！我是九九瓦斯行的客服機器人。請問有什麼可以為您服務的嗎？"
	}
	
	if message == "價格" || message == "價格表" {
		return "目前瓦斯價格：\n4kg: NT$160\n10kg: NT$360\n16kg: NT$550\n20kg: NT$620-730\n50kg: NT$1,550"
	}
	
	if message == "訂購" || message == "訂單" {
		return "您可以通過以下方式訂購瓦斯：\n1. 電話訂購：02-XXXX-XXXX\n2. 線上訂購：訪問我們的網站\n3. 傳真：02-XXXX-XXXX"
	}
	
	// 如果需要更智能的處理，可以調用知識庫 API
	return "謝謝您的訊息，我會盡快為您處理。如果您有其他問題，請隨時聯絡我們。"
}

// 發送文字訊息
func (bot *LineBot) sendTextMessage(event LineEvent, text string) {
	// 這裡應該實現實際的 LINE API 調用
	// 為了演示，我們只記錄日誌
	bot.logger.WithFields(logrus.Fields{
		"userId": event.Source.UserID,
		"reply":  text,
	}).Info("Sending text message")
}

// 處理關注事件
func (bot *LineBot) handleFollow(event LineEvent) {
	bot.logger.WithField("userId", event.Source.UserID).Info("User followed")
	welcomeMessage := "歡迎加入九九瓦斯行！我們是您可信賴的瓦斯供應商，隨時為您提供優質服務。"
	bot.sendTextMessage(event, welcomeMessage)
}

// 處理取消關注事件
func (bot *LineBot) handleUnfollow(event LineEvent) {
	bot.logger.WithField("userId", event.Source.UserID).Info("User unfollowed")
}

// 健康檢查端點
func (bot *LineBot) healthCheck(w http.ResponseWriter, r *http.Request) {
	response := Response{
		Status:    "healthy",
		Message:   "Go LINE Bot is running",
		Timestamp: time.Now().Format(time.RFC3339),
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// 根端點
func (bot *LineBot) rootHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	response := map[string]interface{}{
		"name":        "LINE Bot Go",
		"version":     "1.0.0",
		"status":      "running",
		"language":    "Go",
		"timestamp":    time.Now().Format(time.RFC3339),
		"description": "九九瓦斯行 LINE Bot - Go 語言版本",
	}
	json.NewEncoder(w).Encode(response)
}

// 知識庫搜索處理器
func (bot *LineBot) knowledgeSearchHandler(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query().Get("q")
	if query == "" {
		http.Error(w, "Query parameter 'q' is required", 400)
		return
	}
	
	// 調用知識庫 API
	results, err := bot.knowledgeAPI.Search(query)
	if err != nil {
		bot.logger.Error("Knowledge search failed: ", err)
		http.Error(w, "Knowledge search failed", 500)
		return
	}
	
	w.Header().Set("Content-Type", "application/json")
	response := map[string]interface{}{
		"status":  "success",
		"query":   query,
		"results": results,
		"count":   len(results),
		"timestamp": time.Now().Format(time.RFC3339),
	}
	json.NewEncoder(w).Encode(response)
}

// 產品列表處理器
func (bot *LineBot) productsHandler(w http.ResponseWriter, r *http.Request) {
	// 這裡應該查詢數據庫獲取產品列表
	// 為了演示，返回靜態數據
	
	products := []map[string]interface{}{
		{
			"id":    1,
			"name":  "4kg 瓦斯",
			"price": 160,
			"unit":  "桶",
		},
		{
			"id":    2,
			"name":  "10kg 瓦斯",
			"price": 360,
			"unit":  "桶",
		},
		{
			"id":    3,
			"name":  "16kg 瓦斯",
			"price": 550,
			"unit":  "桶",
		},
		{
			"id":    4,
			"name":  "20kg 瓦斯",
			"price": 620,
			"unit":  "桶",
		},
		{
			"id":    5,
			"name":  "50kg 瓦斯",
			"price": 1550,
			"unit":  "桶",
		},
	}
	
	w.Header().Set("Content-Type", "application/json")
	response := map[string]interface{}{
		"status":  "success",
		"products": products,
		"count":   len(products),
		"timestamp": time.Now().Format(time.RFC3339),
	}
	json.NewEncoder(w).Encode(response)
}

func main() {
	// 初始化 LINE Bot
	bot, err := NewLineBot()
	if err != nil {
		log.Fatalf("Failed to initialize LINE Bot: %v", err)
	}
	
	bot.logger.Info("Starting LINE Bot Go server...")
	
	// 創建路由器
	r := mux.NewRouter()
	
	// 添加中間件
	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			bot.logger.WithField("path", r.URL.Path).Info("Request received")
			next.ServeHTTP(w, r)
		})
	})
	
	// 定義路由
	r.HandleFunc("/", bot.rootHandler).Methods("GET")
	r.HandleFunc("/health", bot.healthCheck).Methods("GET")
	r.HandleFunc("/api/webhook/line", bot.handleWebhook).Methods("POST")
	
	// 知識庫 API 路由
	r.HandleFunc("/api/knowledge/search", bot.knowledgeSearchHandler).Methods("GET")
	r.HandleFunc("/api/products", bot.productsHandler).Methods("GET")
	
	// 啟動服務器
	port := bot.config.Port
	if port == "" {
		port = "9997" // 使用端口 9997 (9900-9999 範圍)
	}
	
	srv := &http.Server{
		Addr:         ":" + port,
		Handler:      r,
		ReadTimeout:  60 * time.Second,
		WriteTimeout: 60 * time.Second,
		IdleTimeout:  120 * time.Second,
	}
	
	// 在 goroutine 中啟動服務器
	go func() {
		bot.logger.Infof("LINE Bot Go server listening on port %s", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			bot.logger.Fatalf("Server failed: %v", err)
		}
	}()
	
	// 等待中斷信號以優雅關閉
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	
	bot.logger.Info("Shutting down server...")
	
	// 關閉服務器
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	
	if err := srv.Shutdown(ctx); err != nil {
		bot.logger.Fatalf("Server forced to shutdown: %v", err)
	}
	
	bot.logger.Info("Server exited")
}