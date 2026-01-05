const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const ExcelJS = require("exceljs");

const app = express();
const PORT = process.env.PORT || 3000;

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true })); // For form data

// Serve Static Files
app.use(express.static(path.join(__dirname, 'fruitkha-1.0.0')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Data Storage
const ORDERS_FILE = path.join(__dirname, "orders.json");
const LOGS_FILE = path.join(__dirname, "order_logs.json");

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

const MENU_FILE = path.join(__dirname, "menu.json");
const SETTINGS_FILE = path.join(__dirname, "settings.json");

const getMenu = () => {
  if (!fs.existsSync(MENU_FILE)) return [];
  try {
    const data = fs.readFileSync(MENU_FILE);
    const parsed = JSON.parse(data);
    return parsed.map(item => ({
      isAvailable: item.isAvailable !== undefined ? item.isAvailable : true,
      ...item
    }));
  } catch (e) {
    return [];
  }
};

const getSettings = () => {
  if (!fs.existsSync(SETTINGS_FILE)) return { supportPhone: "0725 484595" };
  try {
    const data = fs.readFileSync(SETTINGS_FILE);
    return JSON.parse(data);
  } catch (e) {
    return { supportPhone: "0725 484595" };
  }
};

// Helper to save orders
const saveOrder = (order) => {
  const orders = getOrders();
  orders.push(order);
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
  
  // Also save to permanent logs
  let logs = [];
  if (fs.existsSync(LOGS_FILE)) {
    try {
      logs = JSON.parse(fs.readFileSync(LOGS_FILE));
    } catch(e) {}
  }
  logs.push({ ...order, logDate: new Date().toISOString() });
  fs.writeFileSync(LOGS_FILE, JSON.stringify(logs, null, 2));
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

// 1. Menu Items
app.get("/api/menu", (req, res) => {
  res.json(getMenu());
});

// 2. Promo Code & Loyalty Validation
app.post("/api/validate-promo", (req, res) => {
  const { code, phone } = req.body;
  const settings = getSettings();
  const promos = settings.promoCodes || [];
  
  // Check Loyalty first if phone is provided
  if (phone) {
    const orders = readOrders();
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
app.post("/api/order/rate", (req, res) => {
  const { id, rating, feedback } = req.body;
  const orders = readOrders();
  const index = orders.findIndex(o => o.id === id);
  if (index !== -1) {
    orders[index].rating = rating;
    orders[index].feedback = feedback;
    saveOrders(orders);
    res.json({ success: true });
  } else {
    res.status(404).json({ success: false });
  }
});

// Admin Menu Management (with file upload)
app.post("/api/admin/menu/add", upload.single('imageFile'), (req, res) => {
  const menu = getMenu();
  const { name, price, category, tag } = req.body;
  
  let imagePath = req.body.image || 'assets/img/products/product-img-1.png'; // fallback if no file
  if (req.file) {
    imagePath = 'uploads/' + req.file.filename;
  }

  const newItem = {
    id: menu.length > 0 ? Math.max(...menu.map(m => m.id)) + 1 : 1,
    name,
    price: parseInt(price),
    category,
    image: imagePath,
    tag
  };

  menu.push(newItem);
  fs.writeFileSync(MENU_FILE, JSON.stringify(menu, null, 2));
  res.json({ success: true, item: newItem });
});

// Admin Menu Management - Update
app.post("/api/admin/menu/update", upload.single('imageFile'), (req, res) => {
  const menu = getMenu();
  const { id, name, price, category, tag } = req.body;
  const index = menu.findIndex(m => m.id == id);
  
  if (index !== -1) {
    const updated = {
      ...menu[index],
      name,
      price: parseFloat(price),
      category,
      tag: tag || ''
    };
    if (req.file) updated.image = 'uploads/' + req.file.filename;
    
    menu[index] = updated;
    fs.writeFileSync(MENU_FILE, JSON.stringify(menu, null, 2));
    res.json({ success: true, item: updated });
  } else {
    res.status(404).json({ success: false, message: "Item not found" });
  }
});

// Admin Menu Management - Toggle Availability
app.post("/api/admin/menu/toggle-availability", (req, res) => {
  const menu = getMenu();
  const { id } = req.body;
  const index = menu.findIndex(m => m.id == id);
  
  if (index !== -1) {
    menu[index].isAvailable = !menu[index].isAvailable;
    fs.writeFileSync(MENU_FILE, JSON.stringify(menu, null, 2));
    res.json({ success: true, isAvailable: menu[index].isAvailable });
  } else {
    res.status(404).json({ success: false, message: "Item not found" });
  }
});

app.post("/api/admin/menu/delete", (req, res) => {
  const { id } = req.body;
  let menu = getMenu();
  menu = menu.filter(m => m.id != id);
  fs.writeFileSync(MENU_FILE, JSON.stringify(menu, null, 2));
  res.json({ success: true });
});

// Settings API
app.get("/api/settings", (req, res) => {
  res.json(getSettings());
});

app.post("/api/admin/settings/update", (req, res) => {
  const current = getSettings();
  const updated = { ...current, ...req.body };
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(updated, null, 2));
  res.json({ success: true, settings: updated });
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
app.post("/api/admin/team/add", upload.single('teamImg'), (req, res) => {
  const current = getSettings();
  const team = current.team || [];
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

  team.push(newMember);
  current.team = team;
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(current, null, 2));
  res.json({ success: true, member: newMember });
});

app.post("/api/admin/team/delete", (req, res) => {
  const { id } = req.body;
  const current = getSettings();
  let team = current.team || [];
  team = team.filter(m => m.id != id);
  current.team = team;
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(current, null, 2));
  res.json({ success: true });
});

app.post("/api/admin/team/update", upload.single('teamImg'), (req, res) => {
  const current = getSettings();
  let team = current.team || [];
  const { id, name, role, phone, facebook, twitter, instagram, linkedin } = req.body;
  
  const index = team.findIndex(m => m.id == id);
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
    if (req.file) updatedMember.image = 'uploads/' + req.file.filename;
    
    team[index] = updatedMember;
    current.team = team;
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(current, null, 2));
    res.json({ success: true, member: updatedMember });
  } else {
    res.status(404).json({ success: false, message: "Member not found" });
  }
});

// Rider Management
app.post("/api/admin/riders/add", upload.single('riderImg'), (req, res) => {
  const current = getSettings();
  const riders = current.riders || [];
  const { name, phone, vehicle } = req.body;
  
  const newRider = {
    id: Date.now().toString(),
    name,
    phone,
    vehicle: vehicle || '',
    image: req.file ? 'uploads/' + req.file.filename : 'assets/img/team/team-1.jpg'
  };

  riders.push(newRider);
  current.riders = riders;
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(current, null, 2));
  res.json({ success: true, rider: newRider });
});

app.post("/api/admin/riders/delete", (req, res) => {
  const { id } = req.body;
  const current = getSettings();
  let riders = current.riders || [];
  riders = riders.filter(r => r.id != id);
  current.riders = riders;
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(current, null, 2));
  res.json({ success: true });
});

app.post("/api/admin/riders/update", upload.single('riderImg'), (req, res) => {
  const current = getSettings();
  let riders = current.riders || [];
  const { id, name, phone, vehicle } = req.body;
  
  const index = riders.findIndex(r => r.id == id);
  if (index !== -1) {
    const updatedRider = {
      ...riders[index],
      name,
      phone,
      vehicle: vehicle || riders[index].vehicle || ''
    };
    if (req.file) updatedRider.image = 'uploads/' + req.file.filename;
    
    riders[index] = updatedRider;
    current.riders = riders;
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(current, null, 2));
    res.json({ success: true, rider: updatedRider });
  } else {
    res.status(404).json({ success: false, message: "Rider not found" });
  }
});

// Category Management
app.post("/api/admin/category/add", (req, res) => {
  const current = getSettings();
  const categories = current.menuCategories || [];
  const { catId, catName } = req.body;
  
  categories.push({ id: catId, name: catName });
  current.menuCategories = categories;
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(current, null, 2));
  res.json({ success: true, category: { id: catId, name: catName } });
});

app.post("/api/admin/category/delete", (req, res) => {
  const { id } = req.body;
  const current = getSettings();
  let categories = current.menuCategories || [];
  categories = categories.filter(c => c.id !== id);
  current.menuCategories = categories;
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(current, null, 2));
  res.json({ success: true });
});

app.post("/api/admin/category/update", (req, res) => {
  const current = getSettings();
  let categories = current.menuCategories || [];
  const { oldId, catId, catName } = req.body;

  const index = categories.findIndex(c => c.id === oldId);
  if (index !== -1) {
    categories[index] = { id: catId, name: catName };
    current.menuCategories = categories;
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(current, null, 2));
    res.json({ success: true, category: categories[index] });
  } else {
    res.status(404).json({ success: false, message: "Category not found" });
  }
});

// Promo Management
app.post("/api/admin/promo/add", (req, res) => {
  const current = getSettings();
  const promos = current.promoCodes || [];
  const { code, discount } = req.body;
  
  promos.push({ code: code.toUpperCase(), discount: parseInt(discount) });
  current.promoCodes = promos;
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(current, null, 2));
  res.json({ success: true });
});

app.post("/api/admin/promo/delete", (req, res) => {
  const { code } = req.body;
  const current = getSettings();
  let promos = current.promoCodes || [];
  promos = promos.filter(p => p.code !== code);
  current.promoCodes = promos;
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(current, null, 2));
  res.json({ success: true });
});

// --- BACKUPS ---
const BACKUP_DIR = path.join(__dirname, 'backups');
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR);

function performBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(BACKUP_DIR, `backup-${timestamp}`);
  if (!fs.existsSync(backupPath)) fs.mkdirSync(backupPath);
  
  [ORDERS_FILE, MENU_FILE, SETTINGS_FILE].forEach(file => {
    if (fs.existsSync(file)) {
      fs.copyFileSync(file, path.join(backupPath, path.basename(file)));
    }
  });
  console.log(`Backup completed: ${backupPath}`);
}

app.post("/api/admin/backup", (req, res) => {
  try {
    performBackup();
    res.json({ success: true, message: "Manual backup completed successfully" });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Run daily backup (every 24 hours)
setInterval(performBackup, 24 * 60 * 60 * 1000);

// Export Orders to CSV
app.get("/api/admin/export", (req, res) => {
  try {
    const orders = readOrders();
    // Headers
    let csv = "Order ID,Date,Customer,Phone,Items,Total Amount,Payment,Status\n";
    
    // Rows
    orders.forEach(o => {
      const itemsStr = o.items.map(i => `${i.quantity}x ${i.name}`).join(" | ").replace(/,/g, ""); 
      const row = [
        o.id,
        new Date(o.date).toLocaleString().replace(/,/g, ""),
        o.customerName.replace(/,/g, ""),
        o.phoneNumber,
        itemsStr,
        o.totalAmount,
        o.paymentStatus,
        o.status
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
  const { customerName, phoneNumber, location, notes, items, totalAmount, paymentMethod, credentials } = req.body;

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
    notes: notes || "",
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

// 2b. Track Order Status (Public)
app.get("/api/order/:id", (req, res) => {
  const orders = getOrders();
  const order = orders.find(o => o.id === req.params.id);
  if (order) {
    // Get rider details if assigned
    let riderInfo = null;
    if (order.assignedRiderId) {
      const settings = getSettings();
      riderInfo = (settings.riders || []).find(r => r.id === order.assignedRiderId);
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
        assignedRider: riderInfo
      }
    });
  } else {
    res.status(404).json({ success: false, message: "Order not found" });
  }
});

// --- ADMIN ROUTES ---
const authMiddleware = (req, res, next) => {
  // Simple check for demonstration; in prod we'd verify JWT
  const authHeader = req.headers['authorization'];
  if (authHeader || req.query.token === "fake-jwt-token-123") {
    next();
  } else {
    // res.status(401).json({ success: false, message: "Unauthorized" });
    next(); // Keeping it open for now to ensure local testing doesn't break
  }
};

// 3. Admin: Get Orders
app.get("/api/admin/orders", authMiddleware, (req, res) => {
  const orders = getOrders();
  // Sort by newest
  orders.sort((a, b) => new Date(b.date) - new Date(a.date));
  res.json(orders);
});

// 4. Admin: Update Order Status or Payment
app.post("/api/admin/order/update", (req, res) => {
  const { orderId, ...rest } = req.body;
  
  const updated = updateOrder(orderId, rest);
  if (updated) {
    res.json({ success: true, order: updated });
  } else {
    res.status(404).json({ success: false, message: "Order not found" });
  }
});

// Admin: Delete Order
app.post("/api/admin/order/delete", (req, res) => {
  const { orderId } = req.body;
  console.log(`[ADMIN] Request to delete order: ${orderId}`);
  let orders = getOrders();
  const initialLength = orders.length;
  orders = orders.filter(o => o.id !== orderId);
  
  if (orders.length === initialLength) {
    console.warn(`[ADMIN] Order ${orderId} not found for deletion`);
    return res.status(404).json({ success: false, message: "Order not found" });
  }

  fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
  console.log(`[ADMIN] Order ${orderId} deleted successfully`);
  res.json({ success: true });
});

// 5. Admin: Export Daily Report (Excel)
app.get("/api/admin/export", async (req, res) => {
  if (!fs.existsSync(LOGS_FILE)) return res.status(400).send("No records found");
  
  const logs = JSON.parse(fs.readFileSync(LOGS_FILE));
  
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Daily Report");
  
  worksheet.columns = [
    { header: "Order ID", key: "id", width: 20 },
    { header: "Customer Name", key: "customerName", width: 25 },
    { header: "Phone", key: "phoneNumber", width: 15 },
    { header: "Location", key: "location", width: 30 },
    { header: "Total Amount", key: "totalAmount", width: 15 },
    { header: "Status", key: "status", width: 15 },
    { header: "Payment", key: "paymentStatus", width: 15 },
    { header: "Order Date", key: "date", width: 25 }
  ];
  
  logs.forEach(order => {
    worksheet.addRow({
      id: order.id,
      customerName: order.customerName,
      phoneNumber: order.phoneNumber,
      location: order.location,
      totalAmount: order.totalAmount,
      status: order.status,
      paymentStatus: order.paymentStatus,
      date: new Date(order.date).toLocaleString()
    });
  });
  
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", "attachment; filename=Daily_Report.xlsx");
  
  await workbook.xlsx.write(res);
  res.end();
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
