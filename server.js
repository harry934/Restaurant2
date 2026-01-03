const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true })); // For form data

// Serve Static Files (Frontend)
app.use(express.static(path.join(__dirname, 'fruitkha-1.0.0')));

// Data Storage (Simple JSON file simulation)
const ORDERS_FILE = path.join(__dirname, "orders.json");

// Helper to read orders
const getOrders = () => {
  if (!fs.existsSync(ORDERS_FILE)) return [];
  try {
    const data = fs.readFileSync(ORDERS_FILE);
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
};

// Helper to save orders
const saveOrder = (order) => {
  const orders = getOrders();
  orders.push(order);
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
};

// Update order helper
const updateOrder = (orderId, updates) => {
  let orders = getOrders();
  const index = orders.findIndex((o) => o.id === orderId);
  if (index !== -1) {
    orders[index] = { ...orders[index], ...updates };
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
    return orders[index];
  }
  return null;
};

// --- API ROUTES ---

// 1. Menu Items (Hardcoded for simplicity as per request)
app.get("/api/menu", (req, res) => {
  const menu = [
    {
      id: 1,
      name: "Chicken Burger",
      price: 1000,
      category: "Fast Food",
      image: "assets/img/products/product-img-1.jpg",
    },
    {
      id: 2,
      name: "Hawaiian Pizza",
      price: 1000,
      category: "Pizza",
      image: "assets/img/products/product-img-2.jpg",
    },
    {
      id: 3,
      name: "Medium Pizza Chick Barbeque",
      price: 1000,
      category: "Pizza",
      image: "assets/img/products/product-img-3.jpg",
    },
    {
      id: 4,
      name: "Pizza Pie",
      price: 300,
      category: "Snacks",
      description: "Mini folded pizza snack with all toppings",
      image: "assets/img/products/product-img-4.jpg",
    },
  ];
  // Note: In a real app we would map these images to actual files in public/assets/img...
  res.json(menu);
});

// --- M-PESA INTEGRATION ---
const getMpesaToken = async (key, secret) => {
  const auth = Buffer.from(`${key}:${secret}`).toString("base64");
  try {
    const response = await fetch("https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials", {
      headers: { Authorization: `Basic ${auth}` }
    });
    const data = await response.json();
    return data.access_token;
  } catch (err) {
    console.error("M-Pesa Token Error:", err);
    return null;
  }
};

// 2. Place Order & Payment (Real M-Pesa STK Push)
app.post("/api/order", async (req, res) => {
  const { customerName, phoneNumber, location, items, totalAmount, paymentMethod, credentials } = req.body;

  // Validate
  if (!customerName || !phoneNumber || !items || items.length === 0) {
    return res.status(400).json({ success: false, message: "Missing required fields" });
  }

  const orderId = "ORD-" + Date.now();
  const newOrder = {
    id: orderId,
    customerName,
    phoneNumber,
    location: location || "Pick Up",
    items,
    totalAmount,
    status: "New",
    paymentStatus: "Pending",
    date: new Date().toISOString(),
  };

  saveOrder(newOrder);

  if (paymentMethod === "stk") {
    // Trigger STK Push
    const token = await getMpesaToken(credentials.consumerKey, credentials.consumerSecret);
    if (!token) {
      return res.status(500).json({ success: false, message: "Failed to authenticate with M-Pesa" });
    }

    const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
    const passkey = "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919"; // Standard Sandbox Passkey
    const shortcode = "174379"; // Standard Sandbox Shortcode
    const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64");

    // Clean phone number (remove + or leading 0)
    let cleanPhone = phoneNumber.replace(/\+/g, "");
    if (cleanPhone.startsWith("0")) cleanPhone = "254" + cleanPhone.slice(1);
    if (!cleanPhone.startsWith("254")) cleanPhone = "254" + cleanPhone;

    const stkBody = {
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: Math.round(totalAmount),
      PartyA: cleanPhone,
      PartyB: shortcode,
      PhoneNumber: cleanPhone,
      CallBackURL: `https://your-domain.com/api/callback`, // Needs to be public
      AccountReference: "PCnC Restaurant",
      TransactionDesc: `Pay for Order ${orderId}`
    };

    try {
      const stkRes = await fetch("https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest", { 
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(stkBody)
      });
      
      const stkData = await stkRes.json();
      console.log(`[M-PESA] Response:`, stkData);

      if (stkRes.ok) {
        return res.json({
          success: true,
          message: "STK Push Sent. Please enter your PIN on your phone.",
          orderId
        });
      } else {
        return res.status(400).json({ success: false, message: stkData.errorMessage || "STK Push failed" });
      }
    } catch (err) {
      console.error("STK Push Error:", err);
      return res.status(500).json({ success: false, message: "M-Pesa service unavailable" });
    }
  }

  // Fallback for Till/Manual
  res.json({
    success: true,
    message: "Order placed successfully! Please pay via Til Number 6994591.",
    orderId,
  });
});

// 3. Admin: Get Orders
app.get("/api/admin/orders", (req, res) => {
  const orders = getOrders();
  // Sort by newest
  orders.sort((a, b) => new Date(b.date) - new Date(a.date));
  res.json(orders);
});

// 4. Admin: Update Order Status
app.post("/api/admin/order/update", (req, res) => {
  const { orderId, status } = req.body;
  const updated = updateOrder(orderId, { status });
  if (updated) {
    res.json({ success: true, order: updated });
  } else {
    res.status(404).json({ success: false, message: "Order not found" });
  }
});

// 5. Admin: Login (Simple hardcoded)
app.post("/api/admin/login", (req, res) => {
  const { username, password } = req.body;
  if (username === "admin" && password === "admin123") {
    res.json({ success: true, token: "fake-jwt-token-123" });
  } else {
    res.status(401).json({ success: false, message: "Invalid credentials" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
