// NitroCommerce — High-Concurrency Flash Sale Engine (Go API)
//
// Single-file Gin server demonstrating:
//   * Atomic inventory management in Redis (DECR) for low-latency,
//     race-free stock decrements during a flash sale.
//   * Asynchronous order persistence to PostgreSQL via GORM, so the
//     hot path stays fast even under heavy load.
//   * CORS configured for the Next.js storefront (localhost:3000).
package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// ---- Constants ---------------------------------------------------------------

// We model a single flash-sale SKU for clarity. In a real system this would be
// keyed per product ID.
const (
	productID    = "flash-001"
	productName  = "Limited Edition NitroBoard"
	productPrice = 29900 // cents
	stockKey     = "stock:" + productID
)

// ---- Models ------------------------------------------------------------------

// Order is the GORM-managed persistence record written after a successful
// Redis decrement. We keep the schema intentionally small.
type Order struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	ProductID string    `gorm:"index;not null"   json:"product_id"`
	BuyerID   string    `gorm:"index;not null"   json:"buyer_id"`
	PriceCent int       `gorm:"not null"         json:"price_cent"`
	CreatedAt time.Time `json:"created_at"`
}

// ---- Globals -----------------------------------------------------------------

var (
	db    *gorm.DB
	rdb   *redis.Client
	ctx   = context.Background()
	stock int64
)

// ---- Bootstrap ---------------------------------------------------------------

func env(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func mustInitDB() {
	dsn := env("POSTGRES_DSN",
		"host=localhost user=nitro password=nitro dbname=nitrocommerce port=5432 sslmode=disable TimeZone=UTC")

	var err error
	// Retry briefly so we don't race the Postgres container at startup.
	for i := 0; i < 15; i++ {
		db, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
		if err == nil {
			break
		}
		log.Printf("postgres not ready (%v), retrying...", err)
		time.Sleep(2 * time.Second)
	}
	if err != nil {
		log.Fatalf("failed to connect to postgres: %v", err)
	}
	if err := db.AutoMigrate(&Order{}); err != nil {
		log.Fatalf("auto-migrate failed: %v", err)
	}
}

func mustInitRedis() {
	addr := env("REDIS_ADDR", "localhost:6379")
	rdb = redis.NewClient(&redis.Options{Addr: addr})

	for i := 0; i < 15; i++ {
		if err := rdb.Ping(ctx).Err(); err == nil {
			break
		}
		log.Println("redis not ready, retrying...")
		time.Sleep(2 * time.Second)
	}

	// Seed initial stock if the key isn't already present. Using SETNX keeps
	// restarts idempotent — we don't blow away in-flight inventory.
	stock, _ = strconv.ParseInt(env("INITIAL_STOCK", "1000"), 10, 64)
	ok, err := rdb.SetNX(ctx, stockKey, stock, 0).Result()
	if err != nil {
		log.Fatalf("failed to seed stock: %v", err)
	}
	if ok {
		log.Printf("seeded %d units of %s", stock, productID)
	} else {
		log.Printf("stock key already present; leaving as-is")
	}
}

// ---- Handlers ----------------------------------------------------------------

// GET /product — current product info + live stock from Redis.
func getProduct(c *gin.Context) {
	current, err := rdb.Get(ctx, stockKey).Int64()
	if err != nil && !errors.Is(err, redis.Nil) {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "redis read failed"})
		return
	}
	if current < 0 {
		current = 0
	}
	c.JSON(http.StatusOK, gin.H{
		"id":         productID,
		"name":       productName,
		"price_cent": productPrice,
		"stock":      current,
	})
}

// POST /buy — atomic purchase using Redis DECR.
//
// Concurrency model:
//   1. DECR returns the *new* stock value atomically. If it drops below 0,
//      we have oversold by exactly one — we INCR to restore and return 409.
//   2. Otherwise the buyer "owns" that unit. We persist the order asynchronously
//      so the request returns immediately; the order goroutine handles DB I/O.
func postBuy(c *gin.Context) {
	var body struct {
		BuyerID string `json:"buyer_id"`
	}
	_ = c.ShouldBindJSON(&body)
	if body.BuyerID == "" {
		body.BuyerID = "anon-" + strconv.FormatInt(time.Now().UnixNano(), 36)
	}

	remaining, err := rdb.Decr(ctx, stockKey).Result()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "stock decrement failed"})
		return
	}

	if remaining < 0 {
		// Restore: someone else already took the last unit.
		rdb.Incr(ctx, stockKey)
		c.JSON(http.StatusConflict, gin.H{
			"status":  "sold_out",
			"message": "Sold Out",
		})
		return
	}

	// Async persistence. The hot path returns immediately to the buyer; the
	// PostgreSQL write happens off the request goroutine.
	order := Order{
		ProductID: productID,
		BuyerID:   body.BuyerID,
		PriceCent: productPrice,
		CreatedAt: time.Now().UTC(),
	}
	go func(o Order) {
		if err := db.Create(&o).Error; err != nil {
			log.Printf("failed to persist order for buyer=%s: %v", o.BuyerID, err)
		}
	}(order)

	c.JSON(http.StatusOK, gin.H{
		"status":    "ok",
		"message":   "Purchase confirmed",
		"buyer_id":  body.BuyerID,
		"remaining": remaining,
	})
}

// GET /orders — recent persisted orders (handy for the demo).
func getOrders(c *gin.Context) {
	var orders []Order
	if err := db.Order("created_at desc").Limit(20).Find(&orders).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "db read failed"})
		return
	}
	c.JSON(http.StatusOK, orders)
}

// GET /healthz — liveness probe.
func health(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// ---- main --------------------------------------------------------------------

func main() {
	mustInitDB()
	mustInitRedis()

	r := gin.Default()

	// CORS: allow the Next.js storefront running on localhost:3000.
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000"},
		AllowMethods:     []string{"GET", "POST", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept"},
		AllowCredentials: false,
		MaxAge:           12 * time.Hour,
	}))

	r.GET("/healthz", health)
	r.GET("/product", getProduct)
	r.POST("/buy", postBuy)
	r.GET("/orders", getOrders)

	port := env("PORT", "8080")
	log.Printf("NitroCommerce API listening on :%s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("server failed: %v", err)
	}
}
