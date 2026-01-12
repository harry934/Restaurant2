# Deployment Plan: Hybrid Hosting (HostPinnacle + Railway)

This document outlines the strategy for hosting the **Pizza Chick n Crust** application using a hybrid model: **HostPinnacle** for the frontend/domain and **Railway** for the backend logic/database.

## 1. The Strategy

- **HostPinnacle (Frontend):** You will purchase a `.co.ke` domain here. This server will host only your static files (`index.html`, `shop.html`, `assets/`, etc.). This ensures blazing-fast load times for customers in Kenya.
- **Railway (Backend):** Your `server.js` file will run here. It handles orders, admin logins, and menu management.
- **MongoDB Atlas (Database):** All your order history, staff credentials, and menu items remain securely stored in the cloud.

---

## 2. Step-by-Step Implementation

### Step 1: Purchasing the Domain (HostPinnacle)

1.  Go to [HostPinnacle.co.ke](https://www.hostpinnacle.co.ke/).
2.  Search for and purchase your preferred domain (e.g., `pizzachickncrust.co.ke`).
3.  Ensure you have **Shared Hosting** (Standard package is usually enough).

### Step 2: Preparing the Backend (Railway)

1.  Ensure your `server.js` is pushed to your Railway project.
2.  **Crucial:** Copy your Railway App URL (e.g., `https://pcnc-production.up.railway.app`).
3.  Update the `CORS` settings in `server.js` to allow your new HostPinnacle domain (see section below).

### Step 3: Updating the Frontend

1.  In every frontend JavaScript file (like `admin-name-display.js` or standard scripts in your HTML), we need to change the API calls.
2.  **Currently:** `fetch('/api/admin/login')`
3.  **Future:** `fetch('https://your-railway-app.railway.app/api/admin/login')`

---

## 3. Code Modifications (Where to Change)

### In `server.js` (Backend)

You will need to update the `cors` middleware to recognize your new domain.
Look for line **213**:

```javascript
// CURRENT
app.use(cors());

// CHANGE TO (when domain is ready)
app.use(
  cors({
    origin: [
      "https://pizzachickncrust.co.ke",
      "https://www.pizzachickncrust.co.ke",
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Staff-Name",
      "X-Admin-Session-Id",
      "X-Admin-Username",
    ],
  })
);
```

### In Frontend Files

You will need to search for all occurrences of `/api/` in your `fruitkha-1.0.0/` folder and prefix them with your Railway URL.

- **Files to check:** `dashboard.html`, `index.html`, `shop.html`, and any `.js` files in `assets/js/`.

---

## 4. Why this is the best move

1.  **Speed:** Kenyan customers hit the Kenyan HostPinnacle servers first, making the site feel instant.
2.  **Reliability:** If HostPinnacle has a timeout (common on shared hosting), your Railway backend stays alive and keeps processing orders.
3.  **Security:** Your database credentials stay hidden in Railway's environment variables.

---

### Ready for the next step?

When you have purchased the domain, give me the signal and I will provide the exact commands to update all your file paths at once!
