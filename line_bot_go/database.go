package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	_ "github.com/lib/pq"
)

// 數據庫結構體
type Database struct {
	db     *sql.DB
	logger *log.Logger
}

// 客戶信息
type Customer struct {
	ID          int    `json:"id"`
	Name        string `json:"name"`
	Phone       string `json:"phone"`
	Address     string `json:"address"`
	CustomerType string `json:"customer_type"`
	LineUserID  string `json:"line_user_id"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// 訂單信息
type Order struct {
	ID          int    `json:"id"`
	CustomerID  int    `json:"customer_id"`
	ProductType string `json:"product_type"`
	Quantity    int    `json:"quantity"`
	TotalPrice  float64 `json:"total_price"`
	Status      string `json:"status"`
	Notes       string `json:"notes"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// 產品信息
type Product struct {
	ID          int    `json:"id"`
	Name        string `json:"name"`
	Unit        string `json:"unit"`
	BasePrice   float64 `json:"base_price"`
	Description string `json:"description"`
	Active      bool   `json:"active"`
}

// 初始化數據庫連接
func InitDatabase(config *Config) (*Database, error) {
	var dsn string
	if config.DatabaseURL != "" {
		dsn = config.DatabaseURL
	} else {
		dsn = fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
			config.DBHost, config.DBPort, config.DBUser, config.DBPassword, config.DBName)
	}

	db, err := sql.Open("postgres", dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	// 測試連接
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	// 設置連接池參數
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(5 * time.Minute)

	return &Database{
		db:     db,
		logger: log.New(os.Stdout, "[Database] ", log.LstdFlags),
	}, nil
}

// 根據 LINE UserID 查找客戶
func (d *Database) GetCustomerByLineUserID(lineUserID string) (*Customer, error) {
	query := `
		SELECT id, name, phone, address, customer_type, line_user_id, created_at, updated_at
		FROM customers
		WHERE line_user_id = $1 AND active = true
		LIMIT 1
	`
	
	var customer Customer
	var createdAt, updatedAt time.Time
	
	err := d.db.QueryRow(query, lineUserID).Scan(
		&customer.ID, &customer.Name, &customer.Phone, &customer.Address,
		&customer.CustomerType, &customer.LineUserID, &createdAt, &updatedAt,
	)
	
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil // 客戶不存在
		}
		return nil, fmt.Errorf("failed to query customer: %w", err)
	}
	
	customer.CreatedAt = createdAt
	customer.UpdatedAt = updatedAt
	
	return &customer, nil
}

// 創建新客戶
func (d *Database) CreateCustomer(customer *Customer) error {
	query := `
		INSERT INTO customers (name, phone, address, customer_type, line_user_id, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id
	`
	
	now := time.Now()
	customer.CreatedAt = now
	customer.UpdatedAt = now
	
	err := d.db.QueryRow(query, customer.Name, customer.Phone, customer.Address,
		customer.CustomerType, customer.LineUserID, now, now).Scan(&customer.ID)
	
	if err != nil {
		return fmt.Errorf("failed to create customer: %w", err)
	}
	
	d.logger.Printf("Created new customer: %s (ID: %d)", customer.Name, customer.ID)
	return nil
}

// 獲取所有產品
func (d *Database) GetProducts() ([]Product, error) {
	query := `
		SELECT id, name, unit, base_price, description, active
		FROM products
		WHERE active = true
		ORDER BY id
	`
	
	rows, err := d.db.Query(query)
	if err != nil {
		return nil, fmt.Errorf("failed to query products: %w", err)
	}
	defer rows.Close()
	
	var products []Product
	for rows.Next() {
		var product Product
		err := rows.Scan(&product.ID, &product.Name, &product.Unit,
			&product.BasePrice, &product.Description, &product.Active)
		if err != nil {
			return nil, fmt.Errorf("failed to scan product: %w", err)
		}
		products = append(products, product)
	}
	
	return products, nil
}

// 創建訂單
func (d *Database) CreateOrder(order *Order) error {
	query := `
		INSERT INTO orders (customer_id, product_type, quantity, total_price, status, notes, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id
	`
	
	now := time.Now()
	order.CreatedAt = now
	order.UpdatedAt = now
	
	err := d.db.QueryRow(query, order.CustomerID, order.ProductType, order.Quantity,
		order.TotalPrice, order.Status, order.Notes, now, now).Scan(&order.ID)
	
	if err != nil {
		return fmt.Errorf("failed to create order: %w", err)
	}
	
	d.logger.Printf("Created new order: %d for customer %d", order.ID, order.CustomerID)
	return nil
}

// 知識庫查詢
func (d *Database) SearchKnowledge(query string) ([]string, error) {
	// 這裡可以實現實際的知識庫搜索邏輯
	// 例如：模糊搜索、關鍵詞匹配等
	
	knowledgeBase := []string{
		"瓦斯安全使用注意事項",
		"瓦斯價格表",
		"配送服務說明",
		"客戶服務指南",
		"故障排除手冊",
	}
	
	var results []string
	for _, item := range knowledgeBase {
		if len(query) > 0 {
			// 簡單的包含檢查
			// 實際應用中應該使用更複雜的搜索算法
			// 例如：全文搜索、語義搜索等
			// 這裡只是演示
			results = append(results, item)
		}
	}
	
	return results, nil
}

// 記錄客戶訊息
func (d *Database) LogMessage(userID, messageType, content string) error {
	query := `
		INSERT INTO line_messages (user_id, message_type, content, created_at)
		VALUES ($1, $2, $3, $4)
	`
	
	_, err := d.db.Exec(query, userID, messageType, content, time.Now())
	if err != nil {
		return fmt.Errorf("failed to log message: %w", err)
	}
	
	return nil
}

// 健康檢查
func (d *Database) HealthCheck() error {
	return d.db.Ping()
}

// 關閉數據庫連接
func (d *Database) Close() error {
	return d.db.Close()
}

// API 端點：獲取產品列表
func (d *Database) ProductsHandler(w http.ResponseWriter, r *http.Request) {
	products, err := d.GetProducts()
	if err != nil {
		http.Error(w, "Failed to get products", 500)
		return
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status": "success",
		"data":   products,
		"count":  len(products),
	})
}

// API 端點：搜索知識庫
func (d *Database) KnowledgeSearchHandler(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query().Get("q")
	if query == "" {
		http.Error(w, "Query parameter 'q' is required", 400)
		return
	}
	
	results, err := d.SearchKnowledge(query)
	if err != nil {
		http.Error(w, "Failed to search knowledge", 500)
		return
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status": "success",
		"query":  query,
		"results": results,
		"count":  len(results),
	})
}

// API 端點：創建客戶
func (d *Database) CreateCustomerHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", 405)
		return
	}
	
	var customer Customer
	if err := json.NewDecoder(r.Body).Decode(&customer); err != nil {
		http.Error(w, "Invalid JSON", 400)
		return
	}
	
	if err := d.CreateCustomer(&customer); err != nil {
		http.Error(w, "Failed to create customer", 500)
		return
	}
	
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(201)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status": "success",
		"message": "Customer created successfully",
		"data":   customer,
	})
}

// API 端點：創建訂單
func (d *Database) CreateOrderHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", 405)
		return
	}
	
	var order Order
	if err := json.NewDecoder(r.Body).Decode(&order); err != nil {
		http.Error(w, "Invalid JSON", 400)
		return
	}
	
	if err := d.CreateOrder(&order); err != nil {
		http.Error(w, "Failed to create order", 500)
		return
	}
	
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(201)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status": "success",
		"message": "Order created successfully",
		"data":   order,
	})
}