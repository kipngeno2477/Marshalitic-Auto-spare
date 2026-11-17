# MASHALITIC AUTO SPARES – SALES & INVENTORY MANAGEMENT SYSTEM
> **Drive with Confidence.**  
> Commercial-Grade Automotive Spare Parts Retail, Inventory, POS & Financial ERP System.

---

## 1. System Overview

**MASHALITIC AUTO SPARES** is a modern, high-performance, responsive full-stack enterprise management system designed specifically for the automotive spare parts industry. It combines a Point of Sale (POS) terminal, inventory catalog with multi-vehicle compatibility, purchase orders, customer & supplier ledgers, operational expenses tracking, Safaricom M-Pesa Daraja payment automation, 80mm thermal receipt printing, and complete Profit & Loss (COGS) reporting.

---

## 2. Key Features

- **Automotive Brand Identity**: Premium dark navy (`#071B38`), royal blue (`#1264D8`), and automotive orange (`#FF7900`) aesthetic with high-contrast KPI cards.
- **Dynamic KPI Dashboard**: Live today's sales, gross profit, inventory unit counts, total customers, weekly sales trends, top-selling parts, and stock alerts.
- **High-Speed POS Module**:
  - Barcode scanner support with laser visual simulation and instant SKU lookup.
  - Cart management with stock validation, 16% VAT calculations, and discounts.
  - Multi-payment support: Safaricom M-Pesa (STK Push), Cash (with change calculator), Card, and Bank Transfer.
  - 80mm thermal receipt generation with instant browser print (`window.print()`) and raw text download.
- **Automotive Vehicle Compatibility Finder**:
  - Filter parts by Vehicle Make (Toyota, Nissan, Subaru, Mazda, Mitsubishi, etc.), Model (Vitz, Premio, Fielder, Note, Probox, Forester, Prado, Hilux), and Year range.
  - Many-to-many relationship: link single spare parts to multiple car models with axle fitment notes.
- **Inventory & Warehouse Tracking**:
  - Product catalog with SKU, Barcode, Shelf location, Cost Price, Selling Price, and Reorder levels.
  - Stock adjustment workflows (Add, Deduct, Damaged with audit reasons).
  - Excel (.xlsx) import and export.
  - Live inventory valuation (Total Cost Value, Retail Value, Potential Gross Margin).
- **Purchasing & Inbound Goods**:
  - Supplier purchase orders (POs) with ordered vs received vs paid quantity tracking.
  - Goods delivery receipt modal that automatically increments live warehouse stock and creates movement audit entries.
- **Customer & Supplier Portals**:
  - Customer directory with vehicle registration tracking, approved credit limits, and full statement of account.
  - Supplier directory with outstanding payable balance tracking.
- **Financial Reports & P&L Analysis**:
  - Comprehensive Income Statement (Gross Sales, Discounts, Returns, Net Revenue, COGS, Gross Profit, Expenses, Net Profit).
  - Cash flow tracking (Inflows vs Outflows).
  - Fast-moving vs slow-moving inventory turnover analysis.
- **Role-Based Access Control (RBAC)**:
  - Admin (Full system access & user management)
  - Manager (Purchases, sales, reports, adjustments)
  - Cashier (POS checkout, customer registry, receipts)
  - Storekeeper (Warehouse stock intake and adjustments)
- **Database Engine Dual-Support**:
  - Production-ready MySQL 8.0+ schema (`backend/src/database/schema.sql`).
  - Built-in zero-dependency embedded database (`backend/data/mashalitic.db`) for instant turnkey execution without external daemon dependencies.
- **Disaster Recovery**:
  - Instant one-click full database JSON snapshot export and download.

---

## 3. Technology Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Lucide React, Recharts, React Router v6, React Hot Toast, SheetJS (XLSX).
- **Backend**: Node.js, Express.js, REST API architecture, JWT authentication, Bcrypt password hashing.
- **Database**: MySQL 8.0+ / High-Performance SQLite, atomic ACID transactions, foreign keys, and indexes.
- **Integrations**: Safaricom M-Pesa Daraja API (STK Push with live credential handling & sandbox test simulation).

---

## 4. Default User Credentials

| Name | Role | Email | Password |
|---|---|---|---|
| **Brian Admin** | Administrator | `admin@mashalitic.co.ke` | `admin123` |
| **Sarah Mwangi** | Manager | `manager@mashalitic.co.ke` | `manager123` |
| **Brian Cashier** | Cashier | `cashier@mashalitic.co.ke` | `cashier123` |
| **David Omondi** | Storekeeper | `store@mashalitic.co.ke` | `store123` |

---

## 5. Quick Start & Installation

### Prerequisites
- Node.js (v18 or higher; tested on Node v24)
- npm or pnpm
- (Optional) MySQL 8.0+ (if running MySQL instead of the built-in SQLite engine)

### Step 1: Backend Setup
```bash
cd backend
npm install
# Seed the initial database (users, categories, products, vehicles, sales, settings)
node src/database/seed.js
# Start the backend server
node src/server.js
```
The API server will start at `http://localhost:5000`.

### Step 2: Frontend Setup
In a new terminal window:
```bash
cd frontend
npm install
npm run dev
```
The application will launch at `http://localhost:3000`.

---

## 6. MySQL Database Setup (Optional Production Mode)

To use a dedicated MySQL server instead of the embedded SQLite engine:
1. Create a MySQL database:
   ```sql
   CREATE DATABASE mashalitic_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```
2. Import the complete MySQL schema:
   ```bash
   mysql -u root -p mashalitic_db < backend/src/database/schema.sql
   ```
3. Edit `backend/.env`:
   ```ini
   DB_CLIENT=mysql
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=mashalitic_db
   ```
4. Run the seed script:
   ```bash
   cd backend
   node src/database/seed.js
   ```

---

## 7. M-Pesa Safaricom Daraja Integration

Configure your Daraja API credentials in `backend/.env` or inside the **System Settings** UI:
- `MPESA_ENV`: `sandbox` (for test simulation) or `production`
- `MPESA_CONSUMER_KEY`: Your Safaricom developer key
- `MPESA_CONSUMER_SECRET`: Your Safaricom developer secret
- `MPESA_PASSKEY`: Safaricom online passkey
- `MPESA_SHORTCODE`: Business Paybill or Till Number (e.g. `174379`)

*Note: In sandbox/demo mode without live credentials, the POS automatically triggers high-fidelity STK Push simulation with instant confirmation receipts (e.g. `MSH92819KJ`).*

---

## 8. License & Commercial Rights
Designed and engineered for **MASHALITIC AUTO SPARES – DRIVE WITH CONFIDENCE**. All rights reserved.
