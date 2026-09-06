Inventory Sentinel tracks hardware inventory and uses Google Gemini AI to read customer reviews. Based on this feedback, it automatically decides whether to buy more stock or pause orders.

## 1. How to Start the App

**Using the Terminal**

1. Open Command Prompt or PowerShell and go to the backend folder:
```powershell
cd e:\CSBoards_Prep\inventory-sentinel\backend

```


2. Start the local server:
```powershell
python -m uvicorn main:app --reload --port 8000

```


3. Open your web browser and go to `http://localhost:8000`.
*(To stop the server, press **Ctrl + C** in the terminal).*

---

## 2. Important Links

| Resource | URL | Description |
| --- | --- | --- |
| **Web App** | `http://localhost:8000` | The main application interface. |
| **API Docs** | `http://localhost:8000/docs` | Technical page to test backend connections. |

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
