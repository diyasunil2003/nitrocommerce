# 🚀 NitroCommerce: High-Concurrency E-Commerce Engine

NitroCommerce is a specialized e-commerce platform built to solve the challenges of "Flash Sales"—where thousands of users attempt to purchase limited inventory at the exact same second. It utilizes a modern, distributed stack to ensure atomic transactions and zero-latency inventory management.

## 🏗 System Architecture
The project is built as a set of containerized microservices to separate concerns and ensure high availability.

* **Frontend (Next.js 14):** A premium storefront utilizing Server-Side Rendering (SSR) for instant page loads and high SEO performance.
* **Backend (Go):** A high-performance API layer utilizing **Goroutines** for concurrent request handling.
* **Cache Layer (Redis):** Acts as the "source of truth" for real-time inventory, preventing race conditions and database overloads.
* **Database (PostgreSQL):** A relational database for persistent order storage and user management.

## 🔥 Key Technical Features

### 1. Atomic Inventory Management
Instead of querying the main database for every "Buy" request, NitroCommerce uses **Redis** to manage stock counts in memory. This ensures that even if 10,000 people click "Buy" at once, only the exact number of available items are sold.

### 2. Live Inventory Ticker
The product page features a real-time, pulsing stock indicator that provides instant feedback to the user, creating a dynamic shopping experience.

### 3. System Metrics Dashboard
A specialized `/admin` module provides deep visibility into the engine's health, including:
* **Request Throughput:** Monitoring requests per second.
* **Cache Latency:** Tracking Redis response times (measured in milliseconds).
* **System Health:** Visualizing real-time traffic streams.

## 🛠 Tech Stack
* **Languages:** Go (Golang), JavaScript (Next.js)
* **Styling:** Tailwind CSS (Utility-first, Dark-mode optimized)
* **Data:** PostgreSQL, Redis
* **Environment:** Docker & Docker Compose

## 🚀 Installation & Setup

### Prerequisites
* Docker Desktop installed on your system.

### Steps to Run
1.  Open your terminal in the project directory.
2.  Launch the ecosystem:
    ```bash
    docker-compose up --build
    ```
3.  **Access the application:**
    * **Storefront:** `http://localhost:3000`
    * **Metrics Dashboard:** `http://localhost:3000/admin`

## 📊 Performance Objectives
NitroCommerce was engineered to demonstrate that high-performance web applications require more than just a UI. By offloading logic to a **Go-based concurrency engine** and using **Redis** for state management, this project achieves a level of throughput that standard monolithic architectures cannot match.

---
**NitroCommerce Engine V1.0** | *Engineered for Speed*