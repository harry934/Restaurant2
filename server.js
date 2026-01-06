const express = require("express");
require("dotenv").config();
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const ExcelJS = require("exceljs");
const mongoose = require("mongoose");

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB Connection
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/restaurant";

let isConnected = false;
mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("Connected to MongoDB");
    isConnected = true;
  })
  .catch((err) => {
    console.error("MongoDB Connection Error:", err);
    isConnected = false;
  });

// Health check middleware to warn if DB is down
app.use((req, res, next) => {
  if (req.path.startsWith('/api') && !isConnected) {
    // Attempt reconnect if request comes in and we are disconnected
    if (mongoose.connection.readyState === 1) isConnected = true;
    else return res.status(500).json({ success: false, message: "Database connection unavailable. Check server logs." });
  }
  next();
});

// Schemas
const OrderSchema = new mongoose.Schema({
  id: String,
  customerName: String,
  phoneNumber: String,
  location: String,
  notes: String,
  items: Array,
  totalAmount: Number,
  status: { type: String, default: "New" },
  paymentStatus: { type: String, default: "Pending" },
  date: { type: Date, default: Date.now },
  rating: Number,
  feedback: String,
  estimatedTime: String,
  assignedRiderId: String,
});

const MenuSchema = new mongoose.Schema({
  id: Number,
  name: String,
  price: Number,
  category: String,
  image: String,
  tag: String,
  isAvailable: { type: Boolean, default: true },
});

const SettingsSchema = new mongoose.Schema(
  {
    supportPhone: { type: String, default: "0112601334" },
    homeTitle: String,
    homeSubtext: String,
    aboutText: String,
    promoCodes: { type: Array, default: [] },
    team: { type: Array, default: [] },
    riders: { type: Array, default: [] },
    menuCategories: { type: Array, default: [] },
    dealOfWeek: Object,
    homeAbout: Object,
    whatsappNumber: String,
  },
  { strict: false }
);

const OrderLogSchema = new mongoose.Schema({
  order: Object,
  logDate: { type: Date, default: Date.now },
});

const Order = mongoose.model("Order", OrderSchema);
const Menu = mongoose.model("Menu", MenuSchema);
const Settings = mongoose.model("Settings", SettingsSchema);
const OrderLog = mongoose.model("OrderLog", OrderLogSchema);

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, "uploads");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage: storage });

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve Static Files
app.use(express.static(path.join(__dirname, "fruitkha-1.0.0")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Data Storage (Legacy for migration/fallback)
const ORDERS_FILE = path.join(__dirname, "orders.json");
const MENU_FILE = path.join(__dirname, "menu.json");
const SETTINGS_FILE = path.join(__dirname, "settings.json");

// --- MongoDB Helpers ---

const getOrders = async () => {
  return await Order.find().sort({ date: -1 });
};

const getMenu = async () => {
  return await Menu.find();
};

const getSettings = async () => {
  let settings = await Settings.findOne();
  if (!settings) {
    settings = new Settings({ supportPhone: "0112601334" });
    await settings.save();
  }
  return settings;
};

const saveOrder = async (orderData) => {
  const newOrder = new Order(orderData);
  await newOrder.save();

  const log = new OrderLog({ order: orderData });
  await log.save();
  return newOrder;
};

const updateOrder = async (orderId, updates) => {
  return await Order.findOneAndUpdate({ id: orderId }, updates, { new: true });
};

// --- API ROUTES ---

// 1. Menu Items
app.get("/api/menu", async (req, res) => {
  res.json(await getMenu());
});

// 2. Promo Code & Loyalty Validation
app.post("/api/validate-promo", async (req, res) => {
  const { code, phone } = req.body;
  const settings = await getSettings();
  const promos = settings.promoCodes || [];
  
  if (phone) {
    const orders = await getOrders();
    const successfulcount = orders.filter(o => o.phoneNumber === phone && o.paymentStatus === 'Successful').length;
    if (successfulcount >= 5) {
      return res.json({ success: true, discountPercent: 15, message: "Loyalty Discount Applied (15% Off)!" });
    }
  }

  const promo = promos.find(p => p.code.toUpperCase() === (code || '').toUpperCase());
  if (promo) {
    res.json({ success: true, discountPercent: promo.discount });
  } else {
    res.json({ success: false, message: "Invalid or expired promo code" });
  }
});

// 3. Rate Order
app.post("/api/order/rate", async (req, res) => {
  const { id, rating, feedback } = req.body;
  const updated = await Order.findOneAndUpdate({ id }, { rating, feedback }, { new: true });
  if (updated) {
    res.json({ success: true });
  } else {
    res.status(404).json({ success: false });
  }
});

// Admin Menu Management (with file upload)
app.post("/api/admin/menu/add", upload.single('imageFile'), async (req, res) => {
  try {
    const { name, price, category, tag } = req.body;
    
    // Find highest ID to increment
    const highestItem = await Menu.findOne().sort({ id: -1 });
    const nextId = highestItem ? highestItem.id + 1 : 1;

    let imagePath = req.body.image || 'assets/img/products/product-img-1.png';
    if (req.file) {
      imagePath = 'uploads/' + req.file.filename;
    }

    const newItem = new Menu({
      id: nextId,
      name,
      price: parseInt(price),
      category,
      image: imagePath,
      tag
    });

    await newItem.save();
    res.json({ success: true, item: newItem });
  } catch (e) {
    console.error("Add Menu Error:", e);
    res.status(500).json({ success: false, message: e.message });
  }
});

// Admin Menu Management - Update
app.post("/api/admin/menu/update", upload.single('imageFile'), async (req, res) => {
  try {
    const { id, name, price, category, tag } = req.body;
    
    const updates = {
      name,
      price: parseFloat(price),
      category,
      tag: tag || ''
    };
    if (req.file) updates.image = 'uploads/' + req.file.filename;
    
    const updated = await Menu.findOneAndUpdate({ id: parseInt(id) }, updates, { new: true });
    if (updated) {
      res.json({ success: true, item: updated });
    } else {
      res.status(404).json({ success: false, message: "Item not found" });
    }
  } catch (e) {
    console.error("Update Menu Error:", e);
    res.status(500).json({ success: false, message: e.message });
  }
});

// Admin Menu Management - Toggle Availability
app.post("/api/admin/menu/toggle-availability", async (req, res) => {
  try {
    const { id } = req.body;
    const item = await Menu.findOne({ id: parseInt(id) });
    
    if (item) {
      item.isAvailable = !item.isAvailable;
      await item.save();
      res.json({ success: true, isAvailable: item.isAvailable });
    } else {
      res.status(404).json({ success: false, message: "Item not found" });
    }
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

app.post("/api/admin/menu/delete", async (req, res) => {
  try {
    const { id } = req.body;
    await Menu.deleteOne({ id: parseInt(id) });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Settings API
app.get("/api/settings", async (req, res) => {
  try {
    res.json(await getSettings());
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

app.post("/api/admin/settings/update", async (req, res) => {
  try {
    // Upsert ensures document is created if it doesn't exist
    const updated = await Settings.findOneAndUpdate({}, req.body, { new: true, upsert: true });
    res.json({ success: true, settings: updated });
  } catch (e) {
    console.error("Update Settings Error:", e);
    res.status(500).json({ success: false, message: e.message });
  }
});

// Media Upload (for deal image, home about video, etc.)
app.post("/api/admin/settings/upload", upload.single('mediaFile'), (req, res) => {
  if (req.file) {
    res.json({ success: true, filePath: 'uploads/' + req.file.filename });
  } else {
    res.status(400).json({ success: false, message: "No file uploaded" });
  }
});

// Team Management
app.post("/api/admin/team/add", upload.single("teamImg"), async (req, res) => {
  try {
    const { name, role, phone, facebook, twitter, instagram, linkedin } = req.body;
    
    const newMember = {
      id: Date.now(),
      name,
      role,
      image: req.file ? 'uploads/' + req.file.filename : 'assets/img/team/team-1.jpg',
      phone: phone || '',
      facebook: facebook || '',
      twitter: twitter || '',
      instagram: instagram || '',
      linkedin: linkedin || ''
    };

    // Use upsert to create Settings doc if missing
    await Settings.findOneAndUpdate({}, { $push: { team: newMember } }, { upsert: true });
    res.json({ success: true, member: newMember });
  } catch (e) {
    console.error("Add Team Error:", e);
    res.status(500).json({ success: false, message: e.message });
  }
});

app.post("/api/admin/team/delete", async (req, res) => {
  try {
    const { id } = req.body;
    await Settings.findOneAndUpdate({}, { $pull: { team: { id: parseInt(id) } } });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

app.post("/api/admin/team/update", upload.single("teamImg"), async (req, res) => {
  try {
    const { id, name, role, phone, facebook, twitter, instagram, linkedin } = req.body;
    const current = await getSettings();
    const team = current.team || [];
    const index = team.findIndex((m) => m.id == id);

    if (index !== -1) {
      const updatedMember = {
        ...team[index],
        name,
        role,
        phone: phone || team[index].phone || '',
        facebook: facebook || team[index].facebook || '',
        twitter: twitter || team[index].twitter || '',
        instagram: instagram || team[index].instagram || '',
        linkedin: linkedin || team[index].linkedin || ''
      };
      if (req.file) updatedMember.image = "uploads/" + req.file.filename;

      await Settings.findOneAndUpdate({ "team.id": parseInt(id) }, { $set: { "team.$": updatedMember } });
      res.json({ success: true, member: updatedMember });
    } else {
      res.status(404).json({ success: false, message: "Member not found" });
    }
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Rider Management
app.post("/api/admin/riders/add", upload.single("riderImg"), async (req, res) => {
  try {
    const { name, phone, vehicle } = req.body;

    const newRider = {
      id: Date.now().toString(),
      name,
      phone,
      vehicle: vehicle || '',
      image: req.file ? 'uploads/' + req.file.filename : 'assets/img/team/team-1.jpg'
    };

    await Settings.findOneAndUpdate({}, { $push: { riders: newRider } }, { upsert: true });
    res.json({ success: true, rider: newRider });
  } catch (e) {
    console.error("Add Rider Error:", e);
    res.status(500).json({ success: false, message: e.message });
  }
});

app.post("/api/admin/riders/delete", async (req, res) => {
  try {
    const { id } = req.body;
    await Settings.findOneAndUpdate({}, { $pull: { riders: { id: id.toString() } } });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

app.post("/api/admin/riders/update", upload.single("riderImg"), async (req, res) => {
  try {
    const { id, name, phone, vehicle } = req.body;
    const current = await getSettings();
    const riders = current.riders || [];
    const index = riders.findIndex((r) => r.id == id);

    if (index !== -1) {
      const updatedRider = {
        ...riders[index],
        name,
        phone,
        vehicle: vehicle || riders[index].vehicle || ''
      };
      if (req.file) updatedRider.image = "uploads/" + req.file.filename;

      await Settings.findOneAndUpdate({ "riders.id": id.toString() }, { $set: { "riders.$": updatedRider } });
      res.json({ success: true, rider: updatedRider });
    } else {
      res.status(404).json({ success: false, message: "Rider not found" });
    }
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Category Management
app.post("/api/admin/category/add", async (req, res) => {
  try {
    const { catId, catName } = req.body;
    await Settings.findOneAndUpdate({}, { $push: { menuCategories: { id: catId, name: catName } } }, { upsert: true });
    res.json({ success: true, category: { id: catId, name: catName } });
  } catch (e) {
    console.error("Add Category Error:", e);
    res.status(500).json({ success: false, message: e.message });
  }
});

app.post("/api/admin/category/delete", async (req, res) => {
  try {
    const { id } = req.body;
    await Settings.findOneAndUpdate({}, { $pull: { menuCategories: { id: id } } });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

app.post("/api/admin/category/update", async (req, res) => {
  try {
    const { oldId, catId, catName } = req.body;
    await Settings.findOneAndUpdate({ "menuCategories.id": oldId }, { $set: { "menuCategories.$": { id: catId, name: catName } } });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Promo Management
app.post("/api/admin/promo/add", async (req, res) => {
  try {
    const { code, discount } = req.body;
    await Settings.findOneAndUpdate({}, { $push: { promoCodes: { code: code.toUpperCase(), discount: parseInt(discount) } } }, { upsert: true });
    res.json({ success: true });
  } catch (e) {
    console.error("Add Promo Error:", e);
    res.status(500).json({ success: false, message: e.message });
  }
});

app.post("/api/admin/promo/delete", async (req, res) => {
  try {
    const { code } = req.body;
    await Settings.findOneAndUpdate({}, { $pull: { promoCodes: { code: code } } });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// --- BACKUPS (Legacy or Cloud) ---
// We skip local file backups as MongoDB Atlas handles persistence.

// Export Orders to CSV
app.get("/api/admin/export-csv", async (req, res) => {
  try {
    const orders = await getOrders();
    // Headers
    let csv =
      "Order ID,Date,Customer,Phone,Items,Total Amount,Payment,Status\n";

    // Rows
    orders.forEach((o) => {
      const itemsStr = o.items
        .map((i) => `${i.quantity}x ${i.name}`)
        .join(" | ")
        .replace(/,/g, "");
      const row = [
        o.id,
        new Date(o.date).toLocaleString().replace(/,/g, ""),
        o.customerName.replace(/,/g, ""),
        o.phoneNumber,
        itemsStr,
        o.totalAmount,
        o.paymentStatus,
        o.status,
      ].join(",");
      csv += row + "\n";
    });

    res.header("Content-Type", "text/csv");
    res.attachment(`orders-export-${Date.now()}.csv`);
    res.send(csv);
  } catch (e) {
    res.status(500).send("Error generating export");
  }
});

// --- M-PESA INTEGRATION ---
const getMpesaToken = async (key, secret) => {
  const auth = Buffer.from(`${key}:${secret}`).toString("base64");
  try {
    const response = await fetch(
      "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
      {
        headers: { Authorization: `Basic ${auth}` },
      }
    );
    const data = await response.json();
    return data.access_token;
  } catch (err) {
    console.error("M-Pesa Token Error:", err);
    return null;
  }
};

// 2. Place Order & Payment (Real M-Pesa STK Push)
app.post("/api/order", async (req, res) => {
  const {
    customerName,
    phoneNumber,
    location,
    notes,
    items,
    totalAmount,
    paymentMethod,
    credentials,
  } = req.body;

  // Validate
  if (!customerName || !phoneNumber || !items || items.length === 0) {
    return res
      .status(400)
      .json({ success: false, message: "Missing required fields" });
  }

  const orderId = "ORD-" + Date.now();
  const newOrderData = {
    id: orderId,
    customerName,
    phoneNumber,
    location: location || "Pick Up",
    notes: notes || "",
    items,
    totalAmount,
    status: "New",
    paymentStatus: "Pending",
    date: new Date().toISOString(),
  };

  await saveOrder(newOrderData);

  if (paymentMethod === "stk") {
    // Trigger STK Push
    const token = await getMpesaToken(
      credentials.consumerKey,
      credentials.consumerSecret
    );
    if (!token) {
      return res
        .status(500)
        .json({
          success: false,
          message: "Failed to authenticate with M-Pesa",
        });
    }

    const timestamp = new Date()
      .toISOString()
      .replace(/[-:T.Z]/g, "")
      .slice(0, 14);
    const passkey =
      "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919"; // Standard Sandbox Passkey
    const shortcode = "174379"; // Standard Sandbox Shortcode
    const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString(
      "base64"
    );

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
      TransactionDesc: `Pay for Order ${orderId}`,
    };

    try {
      const stkRes = await fetch(
        "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(stkBody),
        }
      );

      const stkData = await stkRes.json();
      console.log(`[M-PESA] Response:`, stkData);

      if (stkRes.ok) {
        return res.json({
          success: true,
          message: "STK Push Sent. Please enter your PIN on your phone.",
          orderId,
        });
      } else {
        return res
          .status(400)
          .json({
            success: false,
            message: stkData.errorMessage || "STK Push failed",
          });
      }
    } catch (err) {
      console.error("STK Push Error:", err);
      return res
        .status(500)
        .json({ success: false, message: "M-Pesa service unavailable" });
    }
  }

  // Fallback for Till/Manual
  res.json({
    success: true,
    message: "Order placed successfully! Please pay via Til Number 6994591.",
    orderId,
  });
});

// Validate Promo Code
app.post("/api/validate-promo", async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ success: false, message: "No code provided" });

    // 1. Check if it's the global "LOYALTY" code (10% off) - Hardcoded legacy or move to DB
    // 2. Check DB Promo Codes
    const settings = await getSettings();
    const promo = (settings.promoCodes || []).find(p => p.code === code.toUpperCase());

    if (promo) {
      return res.json({ 
        success: true, 
        discountPercent: promo.discount, 
        message: `Code applied! You get ${promo.discount}% off your entire order.` 
      });
    } else {
      return res.json({ success: false, message: "Invalid or expired promo code" });
    }
  } catch (e) {
    console.error("Promo Error:", e);
    res.status(500).json({ success: false, message: "Server error checking code" });
  }
});

// 2b. Track Order Status (Public)
app.get("/api/order/:id", async (req, res) => {
  const order = await Order.findOne({ id: req.params.id });
  if (order) {
    // Get rider details if assigned
    let riderInfo = null;
    if (order.assignedRiderId) {
      const settings = await getSettings();
      riderInfo = (settings.riders || []).find(
        (r) => r.id === order.assignedRiderId
      );
    }

    // Return only necessary public info
    res.json({
      success: true,
      order: {
        id: order.id,
        status: order.status,
        paymentStatus: order.paymentStatus,
        customerName: order.customerName,
        items: order.items,
        totalAmount: order.totalAmount,
        estimatedTime: order.estimatedTime,
        assignedRider: riderInfo,
      },
    });
  } else {
    res.status(404).json({ success: false, message: "Order not found" });
  }
});

// --- ADMIN ROUTES ---
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "pcnc-secret-token-123";

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const queryToken = req.query.token;

  if (authHeader === `Bearer ${ADMIN_TOKEN}` || queryToken === ADMIN_TOKEN) {
    next();
  } else {
    res.status(401).json({ success: false, message: "Unauthorized Access" });
  }
};

// 3. Admin: Get Orders
app.get("/api/admin/orders", authMiddleware, async (req, res) => {
  const orders = await getOrders();
  // Sort by newest
  orders.sort((a, b) => new Date(b.date) - new Date(a.date));
  res.json(orders);
});

// Helper to sync changes to OrderLog
const syncOrderLog = async (orderId, updates) => {
  try {
    await OrderLog.findOneAndUpdate(
      { "order.id": orderId },
      { $set: Object.keys(updates).reduce((acc, key) => {
          acc[`order.${key}`] = updates[key];
          return acc;
        }, {}) 
      }
    );
  } catch (e) {
    console.error("Failed to sync OrderLog:", e);
  }
};

// 4. Admin: Update Order Status or Payment
app.post("/api/admin/order/update", async (req, res) => {
  const { orderId, ...rest } = req.body;

  const updated = await updateOrder(orderId, rest);
  if (updated) {
    await syncOrderLog(orderId, rest); // Keep log in sync
    res.json({ success: true, order: updated });
  } else {
    res.status(404).json({ success: false, message: "Order not found" });
  }
});

// Admin: Delete Order
app.post("/api/admin/order/delete", async (req, res) => {
  const { orderId } = req.body;
  console.log(`[ADMIN] Request to delete order: ${orderId}`);
  
  // Update log status to "Deleted" before removing from active Orders
  await syncOrderLog(orderId, { status: 'Deleted (Admin)' });

  const result = await Order.deleteOne({ id: orderId });
  if (result.deletedCount > 0) {
    console.log(`[ADMIN] Order ${orderId} deleted successfully`);
    res.json({ success: true });
  } else {
    res.status(404).json({ success: false, message: "Order not found" });
  }
});

// 5. Admin: Export Daily Report (Excel)
app.get("/api/admin/export", async (req, res) => {
  try {
    const logs = await OrderLog.find().sort({ logDate: -1 });
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Sales Report");
    
    worksheet.columns = [
      { header: "Order ID", key: "id", width: 15 },
      { header: "Date", key: "date", width: 22 },
      { header: "Customer", key: "customerName", width: 20 },
      { header: "Phone", key: "phoneNumber", width: 15 },
      { header: "Location", key: "location", width: 25 },
      { header: "Items Ordered", key: "items", width: 40 },
      { header: "Total (KES)", key: "totalAmount", width: 12 },
      { header: "Payment Status", key: "paymentStatus", width: 15 },
      { header: "Order Status", key: "status", width: 15 },
      { header: "Rating", key: "rating", width: 10 },
      { header: "Feedback", key: "feedback", width: 30 }
    ];
    
    // Style header
    worksheet.getRow(1).font = { bold: true };
    
    logs.forEach(log => {
      const o = log.order || {};
      // Format items list
      const itemsStr = (o.items || []).map(i => `${i.quantity}x ${i.name}`).join(", ");
      
      worksheet.addRow({
        id: o.id,
        date: o.date ? new Date(o.date).toLocaleString() : '',
        customerName: o.customerName,
        phoneNumber: o.phoneNumber,
        location: o.location,
        items: itemsStr,
        totalAmount: o.totalAmount,
        paymentStatus: o.paymentStatus,
        status: o.status,
        rating: o.rating || '',
        feedback: o.feedback || ''
      });
    });
    
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=PCnC_Sales_Report_${Date.now()}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (e) {
    console.error("Export Error:", e);
    res.status(500).send("Error exporting data");
  }
});

// Order Rating
app.post("/api/order/rate", async (req, res) => {
  const { id, rating, feedback } = req.body;
  try {
    const updated = await Order.findOneAndUpdate(
      { id: id }, 
      { rating: parseInt(rating), feedback: feedback },
      { new: true }
    );
    if (updated) {
      await syncOrderLog(id, { rating: parseInt(rating), feedback: feedback });
      res.json({ success: true });
    } else {
      res.status(404).json({ success: false, message: "Order not found" });
    }
  } catch (e) {
    res.status(500).json({ success: false });
  }
});

// 5. Admin: Login (Environment Variable Based)
app.post("/api/admin/login", (req, res) => {
  const { username, password } = req.body;
  const secureUser = process.env.ADMIN_USER || "admin";
  const securePass = process.env.ADMIN_PASS || "admin123";

  if (username === secureUser && password === securePass) {
    res.json({
      success: true,
      token: ADMIN_TOKEN,
    });
  } else {
    res.status(401).json({ success: false, message: "Invalid credentials" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
