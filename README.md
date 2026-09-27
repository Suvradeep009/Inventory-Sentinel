Inventory Sentinel tracks hardware inventory and uses Google Gemini AI to read customer reviews. Based on this feedback, it automatically decides whether to buy more stock or pause orders.

## 1. How to Start the App

You can run Inventory Sentinel in either mode:

### Option A: Next.js V2 Platform (Recommended)
1. **Quick Launch**: Double-click `run.bat` in the project root.
2. **Or via Terminal**:
```powershell
cd e:\CSBoards_Prep\inventory-sentinel
npm run dev
```
3. Open your browser at **`http://localhost:3000`**.

---

### Option B: Python FastAPI + React BroadSheet Stack
1. Open PowerShell and navigate to the backend:
```powershell
cd e:\CSBoards_Prep\inventory-sentinel\backend
python -m uvicorn main:app --reload --port 8000
```
2. Open your browser at **`http://localhost:8000`**.
*(API documentation and Swagger UI available at `http://localhost:8000/docs`)*.

---

## 2. Important Links

| Resource | URL | Description |
| --- | --- | --- |
| **Next.js V2 Platform** | `http://localhost:3000` | Full-stack Next.js app with live DummyJSON store sync & Gemini analysis. |
| **FastAPI Web App** | `http://localhost:8000` | FastAPI server hosting the SQLite catalog & built React frontend. |
| **FastAPI Swagger Docs**| `http://localhost:8000/docs` | Interactive API documentation for backend endpoints. |

---

## 3. App Features & Navigation

* **Home Hub (`/`)**
View your current inventory of 30 hardware items, including their categories, units, and prices (₹). You can manually add new stock or click **⚡ Sync Live Store Data** to automatically pull the latest stock and review data from the store.
* **Sentiment (`/sentiment`)**
Reads customer reviews and grades them into 5 clear categories: Very Bad, Bad, Neutral, Good, and Very Good. You can view these as a simple list or a board. Use the dropdown menu to switch between products.
* **Demand Alerts (`/demand`)**
Compares positive and negative reviews against your current stock to make automatic ordering decisions:
* **HALT RESTOCK:** If negative reviews hit 45% or higher, it freezes new orders for that item.
* **INCREASE ORDER:** If positive reviews hit 65% or higher, it automatically increases the next order by 35%.


* **Insights (`/insights`)**
An AI chat assistant for warehouse staff. You can ask it questions about specific products, and it will summarize the reviews in plain English without mixing up data from other items.

---
