const express = require("express");
require("dotenv").config();
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const ExcelJS = require("exceljs");
const mongoose = require("mongoose");

// Initialize Express
const app = express();
const PORT = process.env.PORT || 3000;

// Track active admin sessions
const activeAdminSessions = {}; 
const SESSION_TIMEOUT = 10 * 60 * 1000; // 10 minutes inactivity timeout

// Cleanup stale sessions every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const username in activeAdminSessions) {
    if (now - activeAdminSessions[username].lastActive > SESSION_TIMEOUT) {
      const staffName = activeAdminSessions[username].name;
      delete activeAdminSessions[username];
      console.log(`[SESSION CLEANUP] Removed stale session for ${staffName} (${username})`);
    }
  }
}, 3 * 60 * 1000); // More frequent cleanup (3 mins)
// ADMIN_TOKEN defined below in Admin Routes section

// (Security middleware removed)

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI;

let isConnected = false;
mongoose
  .connect(MONGODB_URI, { bufferCommands: false })
  .then(() => {
    console.log("Connected to MongoDB");
    isConnected = true;
    seedSuperAdmin(); // Seed the super admin
  })
  .catch((err) => {
    console.error("MongoDB Connection Error:", err);
    isConnected = false;
  });

// (Removed aggressive DB check to prevent unnecessary 500s)

// Schemas
const StaffSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String, default: "" },
  phone: { type: String, default: "" },
  profilePhoto: { type: String, default: "" }, // Base64 or path
  role: { type: String, enum: ['super-admin', 'staff'], default: 'staff' },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  isBlocked: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

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
  lat: Number,
  lng: Number,
  deliveryFee: { type: Number, default: 0 },
});

const MenuSchema = new mongoose.Schema({
  id: Number,
  name: String,
  price: Number,
  category: String,
  image: String,
  tag: String,
  description: { type: String, default: "" },
  isAvailable: { type: Boolean, default: true },
});

const SettingsSchema = new mongoose.Schema(
  {
    supportPhone: { type: String, default: "0715430320" },
    supportPhones: { type: Array, default: [] },
    supportEmails: { type: Array, default: [] },
    homeTitle: String,
    homeSubtext: String,
    aboutText: String,
    promoCodes: { type: Array, default: [] },
    team: { type: Array, default: [] },
    riders: { type: Array, default: [] },
    menuCategories: { type: Array, default: [] },
    dealOfWeek: Object,
    homeAbout: Object,
    aboutPromo: Object,
    whatsappNumber: String,
    restaurantLat: { type: Number, default: -1.1766610736906116 },
    restaurantLng: { type: Number, default: 36.94006231794019 },
  },
  { strict: false }
);

const OrderLogSchema = new mongoose.Schema({
  order: Object,
  logDate: { type: Date, default: Date.now },
});

const Staff = mongoose.model("Staff", StaffSchema);
const Order = mongoose.model("Order", OrderSchema);
const Menu = mongoose.model("Menu", MenuSchema);
const Settings = mongoose.model("Settings", SettingsSchema);
const OrderLog = mongoose.model("OrderLog", OrderLogSchema);

// Admin Session Schema for persistence across redeploys
const AdminSessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  name: String,
  role: String,
  photo: String,
  lastActive: { type: Date, default: Date.now },
  expiresAt: { type: Date, index: { expires: '24h' } } // Auto-cleanup after 24h
});
const AdminSession = mongoose.model("AdminSession", AdminSessionSchema);

// Helper to seed super admin from environment variables
async function seedSuperAdmin() {
  const superUser = process.env.ADMIN1_USER || process.env.ADMIN_USER || "admin1";
  const superPass = process.env.ADMIN1_PASS || process.env.ADMIN_PASS || "admin123";
  const superName = process.env.ADMIN1_NAME || "KIBBY ADMIN";

  const staff2User = process.env.ADMIN2_USER || "admin2";
  const staff2Pass = process.env.ADMIN2_PASS || "kibbys2026";
  const staff2Name = process.env.ADMIN2_NAME || "HARRY MOKAYA";

  try {
    // 1. Seed or Update Super Admin
    let boss = await Staff.findOne({ username: superUser });
    if (!boss) {
      boss = new Staff({
        username: superUser,
        password: superPass,
        name: superName,
        role: 'super-admin',
        status: 'approved'
      });
      await boss.save();
      console.log(`[SEED] Super Admin ${superName} created.`);
    } else {
      // Sync role, status, and name if they change in environment variables
      let updated = false;
      if (boss.role !== 'super-admin') { boss.role = 'super-admin'; updated = true; }
      if (boss.status !== 'approved') { boss.status = 'approved'; updated = true; }
      if (boss.name !== superName) { boss.name = superName; updated = true; }
      
      if (updated) {
        await boss.save();
        console.log(`[SEED] Super Admin ${superName} profile updated.`);
      }
    }

    // 2. Seed Pre-defined Staff (if configured AND NO OTHER STAFF EXIST)
    // This allows the initial setup to have a staff member, but if deleted, they stay deleted.
    const staffCount = await Staff.countDocuments({ role: 'staff' });
    const existingStaff2 = await Staff.findOne({ username: staff2User });
    if (staffCount === 0 && !existingStaff2) {
      const worker = new Staff({
        username: staff2User,
        password: staff2Pass,
        name: staff2Name,
        role: 'staff',
        status: 'approved'
      });
      await worker.save();
      console.log(`[SEED] Initial Staff ${staff2Name} created.`);
    }
  } catch (err) {
    console.error("[SEED] Error seeding admins:", err);
  }
}

// Image Storage Schema - for persisting images in MongoDB
const ImageSchema = new mongoose.Schema({
  filename: { type: String, required: true, unique: true },
  originalName: String,
  mimeType: String,
  data: String, // base64 encoded image data
  size: Number,
  uploadDate: { type: Date, default: Date.now },
  category: String, // 'menu', 'team', 'rider', 'deal', etc.
});

const Image = mongoose.model("Image", ImageSchema);

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

// (Moved to top)

// Standard Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
    settings = new Settings({
      supportPhone: "0715430320",
      supportPhones: ["0715430320"],
      supportEmails: ["hello@kibbyskitchen.com"],
      whatsappNumber: "0715430320",
      restaurantLat: -1.2200414264779664,
      restaurantLng: 36.87814128003106,
      
      // CMS Content
      homeTitle: "Kibby’s Hot Kitchen",
      homeSubtext: "Fresh & Healthy, Every day!",
      aboutText: "Kibby’s Hot Kitchen is your destination for delicious, fresh, and healthy meals. Located at Unicity Mall (KU), we serve the best flavors in town.",
      logo: "assets/img/kibbys-logo.png",
      heroBg: "assets/img/hero-bg.jpg",
      
      contact: {
        address: "Unicity Mall (KU)",
        phone: "0715430320",
        email: "hello@kibbyskitchen.com",
        till: "0715430320",
        hours: "MON - SUN: 8:00 AM to 9:00 PM"
      },
      
      social: {
        facebook: "#",
        twitter: "#",
        instagram: "#",
        tiktok: "#",
        linkedin: "#"
      },
      
      homeFeatures: [
        { icon: "fas fa-shipping-fast", title: "Free Delivery", desc: "Around USIU area" },
        { icon: "fas fa-phone-volume", title: "Open Daily", desc: "8:00 AM to 9:00 PM" },
        { icon: "fas fa-sync", title: "Best Offers", desc: "Tasty & Healthy Meals" }
      ],
      
      dealOfWeek: {
        title: "Deal of the Week",
        subtitle: "Hot & Fresh Cuisines",
        description: "Enjoy our delicious hot meals prepared daily with the freshest ingredients.",
        image: "assets/img/traditional-supreme-pizza-isolated-white-background.jpg"
      },
      
      homeAbout: {
        title: "Fresh & Tasty",
        heading: "About <span class=\"orange-text\">Kibby’s Hot Kitchen</span>",
        description: "Kibby’s Hot Kitchen is your destination for delicious, fresh, and healthy meals. Located at Unicity Mall (KU), we serve the best flavors in town.",
        abtImage: "assets/img/about-img.jpg",
        videoLink: "https://www.youtube.com/watch?v=DBLlFWYcIGQ",
        isVideoLocal: false
      },
      
      shopBanner: {
          title: "New Year BOGO! <br> with <span class=\"orange-text\">Kibby’s Hot Kitchen</span>",
          percentText: "<span style=\"color: #fff; font-weight: 700;\">Buy One <br> Get One</span> FREE <span>on Tue & Thur</span>",
          image: "assets/img/shop-banner-bg.jpg"
      },
      
      aboutPage: {
          whyTitle: "Why <span style=\"color: #c11b17;\">Kibby’s Hot Kitchen?</span>",
          features: [
              { icon: "fas fa-shipping-fast", title: "Fast Delivery", desc: "We deliver your pizza and chicken hot and fresh to your doorstep around the USIU area." },
              { icon: "fas fa-utensils", title: "Quality Ingredients", desc: "We use the highest quality dough, cheese, and fresh ingredients for every meal we serve." },
              { icon: "fas fa-money-bill-alt", title: "Student Friendly Prices", desc: "Get the best value for your money with our affordable meal combos and special offers." },
              { icon: "fas fa-heart", title: "Made with Passion", desc: "Every order is prepared with care to ensure you enjoy the signature Kibby’s taste every time." }
          ]
      },

      staffLogins: [
        { id: 1, username: "admin1", password: "admin123", name: "Staff1" },
        { id: 2, username: "admin2", password: "kibbys2026", name: "Staff2" }
      ]
    });
    await settings.save();
  } else {
      // Ensure new fields exist even if settings were already there
      let updated = false;
      const defaults = {
          contact: { address: "Unicity Mall (KU)", phone: "0715430320", email: "hello@kibbyskitchen.com", till: "0715430320", hours: "MON - SUN: 8:00 AM to 9:00 PM" },
          social: { facebook: "#", twitter: "#", instagram: "#", tiktok: "#", linkedin: "#" },
          logo: "assets/img/kibbys-logo.png",
          aboutPage: { whyTitle: "Why <span style=\"color: #c11b17;\">Kibby’s Hot Kitchen?</span>", features: [] }
      };
      
      for (let key in defaults) {
          if (settings[key] === undefined) {
              settings[key] = defaults[key];
              updated = true;
          }
      }
      if (updated) {
          settings.markModified('contact');
          settings.markModified('social');
          settings.markModified('aboutPage');
          await settings.save();
      }
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

// Image Storage Helpers
const saveImageToMongoDB = async (file, category = "general") => {
  try {
    const base64Data = fs.readFileSync(file.path, { encoding: "base64" });
    const imageDoc = new Image({
      filename: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      data: base64Data,
      size: file.size,
      category: category,
    });
    await imageDoc.save();
    // Delete the file from uploads folder after saving to DB
    fs.unlinkSync(file.path);
    return `db-image/${file.filename}`;
  } catch (e) {
    console.error("Error saving image to MongoDB:", e);
    return `uploads/${file.filename}`; // Fallback to file system
  }
};

const getImageFromMongoDB = async (filename) => {
  try {
    const image = await Image.findOne({ filename });
    return image;
  } catch (e) {
    console.error("Error retrieving image from MongoDB:", e);
    return null;
  }
};

// --- ADMIN SECURITY ---
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "kibbys-secret-token-123";

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const queryToken = req.query.token;
  const sessionId = req.headers["x-admin-session-id"];
  const username = req.headers["x-admin-username"];

  if (authHeader === `Bearer ${ADMIN_TOKEN}` || queryToken === ADMIN_TOKEN) {
    // Session validation
    if (username && sessionId) {
      const dbSession = await AdminSession.findOne({ sessionId, username });
      const now = Date.now();
      
      if (!dbSession) {
        return res.status(401).json({ success: false, message: "Session expired or active elsewhere." });
      }
      
      // Update activity and attach info to request
      dbSession.lastActive = new Date();
      await dbSession.save();

      req.staffName = dbSession.name;
      req.staffRole = dbSession.role;
      req.staffUsername = username;
    }
    next();
  } else {
    res.status(401).json({ success: false, message: "Unauthorized Access" });
  }
};

// Admin Logout Route - Extremely robust to clear sessions
app.post("/api/admin/logout", async (req, res) => {
  const { username, sessionId } = req.body;
  try {
    const result = await AdminSession.deleteOne({ sessionId, username });
    res.json({ success: true, cleared: result.deletedCount > 0 });
  } catch (e) {
    res.status(500).json({ success: false });
  }
});

// Get Active Admin status for the whole system (Robust mapping)
app.get("/api/admin/active-sessions", authMiddleware, async (req, res) => {
  try {
    const sessions = await AdminSession.find();
    const onlineNames = sessions.map(s => s.name.toUpperCase());
    res.json({ success: true, onlineAdmins: onlineNames, serverTime: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ success: false });
  }
});

// --- API ROUTES ---

// Serve images from MongoDB
app.get("/db-image/:filename", async (req, res) => {
  try {
    const image = await getImageFromMongoDB(req.params.filename);
    if (!image) {
      return res.status(404).send("Image not found");
    }
    const buffer = Buffer.from(image.data, "base64");
    res.set("Content-Type", image.mimeType);
    res.set("Content-Length", buffer.length);
    res.send(buffer);
  } catch (e) {
    console.error("Error serving image:", e);
    res.status(500).send("Error serving image");
  }
});

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
    const successfulcount = orders.filter(
      (o) => o.phoneNumber === phone && o.paymentStatus === "Successful"
    ).length;
    if (successfulcount >= 5) {
      return res.json({
        success: true,
        discountPercent: 15,
        message: "Loyalty Discount Applied (15% Off)!",
      });
    }
  }

  const promo = promos.find(
    (p) => p.code.toUpperCase() === (code || "").toUpperCase()
  );
  if (promo) {
    res.json({ success: true, discountPercent: promo.discount });
  } else {
    res.json({ success: false, message: "Invalid or expired promo code" });
  }
});

// Admin Menu Management (with file upload)
app.post(
  "/api/admin/menu/add",
  authMiddleware,
  upload.single("imageFile"),
  async (req, res) => {
    try {
      console.log(`[ADMIN ACTION] ${req.staffName} adding menu item`);
      const { name, price, category, tag, description } = req.body;

      // Find highest ID to increment
      const highestItem = await Menu.findOne().sort({ id: -1 });
      const nextId = highestItem ? highestItem.id + 1 : 1;

      let imagePath = req.body.image || "assets/img/products/product-img-1.png";
      if (req.file) {
        imagePath = await saveImageToMongoDB(req.file, "menu");
      }

      const newItem = new Menu({
        id: nextId,
        name,
        price: parseInt(price),
        category,
        image: imagePath,
        tag,
        description,
      });

      await newItem.save();
      res.json({ success: true, item: newItem });
    } catch (e) {
      console.error("Add Menu Error:", e);
      res.status(500).json({ success: false, message: e.message });
    }
  }
);

// Admin Menu Management - Update
app.post(
  "/api/admin/menu/update",
  authMiddleware,
  upload.single("imageFile"),
  async (req, res) => {
    try {
      console.log(`[ADMIN ACTION] ${req.staffName} updating menu item ${req.body.id}`);
      const { id, name, price, category, tag, description } = req.body;

      const updates = {
        name,
        price: parseFloat(price),
        category,
        tag: tag || "",
        description: description || "",
      };
      if (req.file) updates.image = await saveImageToMongoDB(req.file, "menu");

      const updated = await Menu.findOneAndUpdate(
        { id: parseInt(id) },
        updates,
        { new: true }
      );
      if (updated) {
        res.json({ success: true, item: updated });
      } else {
        res.status(404).json({ success: false, message: "Item not found" });
      }
    } catch (e) {
      console.error("Update Menu Error:", e);
      res.status(500).json({ success: false, message: e.message });
    }
  }
);

// Admin Menu Management - Toggle Availability
app.post("/api/admin/menu/toggle-availability", authMiddleware, async (req, res) => {
  try {
    const { id } = req.body;
    console.log(`[ADMIN ACTION] ${req.staffName} toggling availability of item ${id}`);
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

app.post("/api/admin/menu/delete", authMiddleware, async (req, res) => {
  try {
    const { id } = req.body;
    console.log(`[ADMIN ACTION] ${req.staffName} deleting menu item ${id}`);
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

app.post("/api/admin/settings/update", authMiddleware, async (req, res) => {
  try {
    console.log(`[ADMIN ACTION] ${req.staffName} updating system settings`);
    // Upsert ensures document is created if it doesn't exist
    const updated = await Settings.findOneAndUpdate({}, { $set: req.body }, {
      new: true,
      upsert: true,
    });
    res.json({ success: true, settings: updated });
  } catch (e) {
    console.error("Update Settings Error:", e);
    res.status(500).json({ success: false, message: e.message });
  }
});

// Media Upload (for deal image, home about video, etc.)
// Media Upload (for deal image, etc.)
app.post(
  "/api/admin/settings/upload",
  authMiddleware,
  upload.single("mediaFile"),
  async (req, res) => {
    if (req.file) {
      try {
        console.log(`[ADMIN ACTION] ${req.staffName} uploading setting media`);
        const dbPath = await saveImageToMongoDB(req.file, "settings");
        res.json({ success: true, filePath: dbPath });
      } catch (e) {
        res.status(500).json({ success: false, message: e.message });
      }
    } else {
      res.status(400).json({ success: false, message: "No file uploaded" });
    }
  }
);

// Home About Section Update (Video/Image)
app.post(
  "/api/admin/settings/home-about",
  authMiddleware,
  upload.fields([
    { name: "videoFile", maxCount: 1 },
    { name: "abtImage", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      console.log(`[ADMIN ACTION] ${req.staffName} updating Home About section`);
      const { title, heading, description, videoLink, isVideoLocal } = req.body;

      const homeAbout = {
        title,
        heading,
        description,
        videoLink: videoLink || "",
        isVideoLocal: isVideoLocal === "on" || isVideoLocal === "true",
      };

      // Handle File Uploads
      if (req.files["videoFile"]) {
        // Warning: MongoDB Document size limit is 16MB. Large videos will fail.
        homeAbout.videoLink = await saveImageToMongoDB(
          req.files["videoFile"][0],
          "home-video"
        );
        homeAbout.isVideoLocal = true;
      }

      if (req.files["abtImage"]) {
        homeAbout.abtImage = await saveImageToMongoDB(
          req.files["abtImage"][0],
          "home-image"
        );
      } else {
        const current = await getSettings();
        if (current.homeAbout && current.homeAbout.abtImage) {
          homeAbout.abtImage = current.homeAbout.abtImage;
        }
      }

      if (!req.files["videoFile"] && !homeAbout.videoLink) {
        const current = await getSettings();
        if (current.homeAbout && current.homeAbout.videoLink) {
          homeAbout.videoLink = current.homeAbout.videoLink;
          homeAbout.isVideoLocal = current.homeAbout.isVideoLocal;
        }
      }

      // Update Settings
      await Settings.findOneAndUpdate(
        {},
        { $set: { homeAbout: homeAbout } },
        { upsert: true }
      );

      res.json({ success: true, homeAbout });
    } catch (e) {
      console.error("Home About Error:", e);
      res.status(500).json({ success: false, message: e.message });
    }
  }
);

// Team Management
app.post("/api/admin/team/add", authMiddleware, upload.single("teamImg"), async (req, res) => {
  try {
    console.log(`[ADMIN ACTION] ${req.staffName} adding team member`);
    const { name, role, phone, facebook, twitter, instagram, linkedin } =
      req.body;

    const newMember = {
      id: Date.now(),
      name,
      role,
      image: req.file
        ? await saveImageToMongoDB(req.file, "team")
        : "assets/img/team/team-1.jpg",
      phone: phone || "",
      facebook: facebook || "",
      twitter: twitter || "",
      instagram: instagram || "",
      linkedin: linkedin || "",
    };

    // Use ID-based update for safety
    const settings = await getSettings();
    await Settings.findByIdAndUpdate(
      settings._id,
      { $push: { team: newMember } },
      { new: true }
    );
    res.json({ success: true, member: newMember });
  } catch (e) {
    console.error("Add Team Error:", e);
    res.status(500).json({ success: false, message: e.message });
  }
});

app.post("/api/admin/team/delete", authMiddleware, async (req, res) => {
  try {
    const { id } = req.body;
    console.log(`[ADMIN ACTION] ${req.staffName} deleting team member ${id}`);
    await Settings.findOneAndUpdate(
      {},
      { $pull: { team: { id: parseInt(id) } } }
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

app.post(
  "/api/admin/team/update",
  authMiddleware,
  upload.single("teamImg"),
  async (req, res) => {
    try {
      const { id, name, role, phone, facebook, twitter, instagram, linkedin } =
        req.body;
      console.log(`[ADMIN ACTION] ${req.staffName} updating team member ${id}`);
      const current = await getSettings();
      const team = current.team || [];
      const index = team.findIndex((m) => m.id == id);

      if (index !== -1) {
        const updatedMember = {
          ...team[index],
          name,
          role,
          phone: phone || team[index].phone || "",
          facebook: facebook || team[index].facebook || "",
          twitter: twitter || team[index].twitter || "",
          instagram: instagram || team[index].instagram || "",
          linkedin: linkedin || team[index].linkedin || "",
        };
        if (req.file)
          updatedMember.image = await saveImageToMongoDB(req.file, "team");

        await Settings.findOneAndUpdate(
          { "team.id": parseInt(id) },
          { $set: { "team.$": updatedMember } }
        );
        res.json({ success: true, member: updatedMember });
      } else {
        res.status(404).json({ success: false, message: "Member not found" });
      }
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  }
);

// Rider Management
app.post(
  "/api/admin/riders/add",
  authMiddleware,
  upload.single("riderImg"),
  async (req, res) => {
    try {
      const { name, phone, vehicle } = req.body;
      console.log(`[ADMIN ACTION] ${req.staffName} adding rider ${name}`);

      const newRider = {
        id: Date.now().toString(),
        name,
        phone,
        vehicle: vehicle || "",
        image: req.file
          ? await saveImageToMongoDB(req.file, "rider")
          : "assets/img/team/team-1.jpg",
      };

      await Settings.findOneAndUpdate(
        {},
        { $push: { riders: newRider } },
        { upsert: true }
      );
      res.json({ success: true, rider: newRider });
    } catch (e) {
      console.error("Add Rider Error:", e);
      res.status(500).json({ success: false, message: e.message });
    }
  }
);

app.post("/api/admin/riders/delete", authMiddleware, async (req, res) => {
  try {
    const { id } = req.body;
    console.log(`[ADMIN ACTION] ${req.staffName} deleting rider ${id}`);
    await Settings.findOneAndUpdate(
      {},
      { $pull: { riders: { id: id.toString() } } }
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

app.post(
  "/api/admin/riders/update",
  authMiddleware,
  upload.single("riderImg"),
  async (req, res) => {
    try {
      const { id, name, phone, vehicle } = req.body;
      console.log(`[ADMIN ACTION] ${req.staffName} updating rider ${id}`);
      const current = await getSettings();
      const riders = current.riders || [];
      const index = riders.findIndex((r) => r.id == id);

      if (index !== -1) {
        const updatedRider = {
          ...riders[index],
          name,
          phone,
          vehicle: vehicle || riders[index].vehicle || "",
        };
        if (req.file)
          updatedRider.image = await saveImageToMongoDB(req.file, "rider");

        await Settings.findOneAndUpdate(
          { "riders.id": id.toString() },
          { $set: { "riders.$": updatedRider } }
        );
        res.json({ success: true, rider: updatedRider });
      } else {
        res.status(404).json({ success: false, message: "Rider not found" });
      }
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  }
);

// Category Management
app.post("/api/admin/category/add", authMiddleware, async (req, res) => {
  try {
    const { catId, catName } = req.body;
    console.log(`[ADMIN ACTION] ${req.staffName} adding category ${catName}`);
    const settings = await getSettings();
    await Settings.findByIdAndUpdate(
      settings._id,
      { $push: { menuCategories: { id: catId, name: catName } } },
      { new: true }
    );
    res.json({ success: true, category: { id: catId, name: catName } });
  } catch (e) {
    console.error("Add Category Error:", e);
    res.status(500).json({ success: false, message: e.message });
  }
});

app.post("/api/admin/category/delete", authMiddleware, async (req, res) => {
  try {
    const { id } = req.body;
    console.log(`[ADMIN ACTION] ${req.staffName} deleting category ${id}`);
    await Settings.findOneAndUpdate(
      {},
      { $pull: { menuCategories: { id: id } } }
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

app.post("/api/admin/category/update", authMiddleware, async (req, res) => {
  try {
    const { oldId, catId, catName } = req.body;
    console.log(`[ADMIN ACTION] ${req.staffName} updating category ${oldId}`);
    await Settings.findOneAndUpdate(
      { "menuCategories.id": oldId },
      { $set: { "menuCategories.$": { id: catId, name: catName } } }
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Promo Management
app.post("/api/admin/promo/add", authMiddleware, async (req, res) => {
  try {
    const { code, discount } = req.body;
    console.log(`[ADMIN ACTION] ${req.staffName} adding promo code ${code}`);
    await Settings.findOneAndUpdate(
      {},
      {
        $push: {
          promoCodes: {
            code: code.toUpperCase(),
            discount: parseInt(discount),
          },
        },
      },
      { upsert: true }
    );
    res.json({ success: true });
  } catch (e) {
    console.error("Add Promo Error:", e);
    res.status(500).json({ success: false, message: e.message });
  }
});

app.post("/api/admin/promo/delete", authMiddleware, async (req, res) => {
  try {
    const { code } = req.body;
    console.log(`[ADMIN ACTION] ${req.staffName} deleting promo code ${code}`);
    await Settings.findOneAndUpdate(
      {},
      { $pull: { promoCodes: { code: code } } }
    );
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
    lat,
    lng,
    notes,
    items,
    totalAmount,
    deliveryFee,
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
    lat: lat ? parseFloat(lat) : null,
    lng: lng ? parseFloat(lng) : null,
    deliveryFee: deliveryFee || 0,
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
      return res.status(500).json({
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
      AccountReference: "Kibby's Hot Kitchen",
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
        return res.status(400).json({
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
    if (!code)
      return res
        .status(400)
        .json({ success: false, message: "No code provided" });

    // 1. Check if it's the global "LOYALTY" code (10% off) - Hardcoded legacy or move to DB
    // 2. Check DB Promo Codes
    const settings = await getSettings();
    const promo = (settings.promoCodes || []).find(
      (p) => p.code === code.toUpperCase()
    );

    if (promo) {
      return res.json({
        success: true,
        discountPercent: promo.discount,
        message: `Code applied! You get ${promo.discount}% off your entire order.`,
      });
    } else {
      return res.json({
        success: false,
        message: "Invalid or expired promo code",
      });
    }
  } catch (e) {
    console.error("Promo Error:", e);
    res
      .status(500)
      .json({ success: false, message: "Server error checking code" });
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
        lat: order.lat,
        lng: order.lng,
      },
    });
  } else {
    res.status(404).json({ success: false, message: "Order not found" });
  }
});

// --- ADMIN ROUTES ---
// authMiddleware moved higher up for global usage across admin routes.

// 3. Admin: Get Orders
app.get("/api/admin/orders", authMiddleware, async (req, res) => {
  const orders = await getOrders();
  // Sort by newest
  orders.sort((a, b) => new Date(b.date) - new Date(a.date));
  res.json(orders);
});

// Helper to sync changes to OrderLog
const syncOrderLog = async (orderId, updates, staffName) => {
  try {
    const setQuery = Object.keys(updates).reduce((acc, key) => {
      acc[`order.${key}`] = updates[key];
      return acc;
    }, {});

    if (staffName) {
      setQuery["order.updatedBy"] = staffName;
    }

    await OrderLog.findOneAndUpdate(
      { "order.id": orderId },
      { $set: setQuery }
    );
  } catch (e) {
    console.error("Failed to sync OrderLog:", e);
  }
};

// 4. Admin: Update Order Status or Payment
app.post("/api/admin/order/update", authMiddleware, async (req, res) => {
  const { orderId, ...rest } = req.body;

  const updated = await updateOrder(orderId, rest);
  if (updated) {
    await syncOrderLog(orderId, rest, req.staffName); // Keep log in sync
    res.json({ success: true, order: updated });
  } else {
    res.status(404).json({ success: false, message: "Order not found" });
  }
});

// Admin: Delete Order
app.post("/api/admin/order/delete", authMiddleware, async (req, res) => {
  const { orderId } = req.body;
  console.log(
    `[ADMIN] Request to delete order: ${orderId} by ${req.staffName}`
  );

  // Update log status to "Deleted" before removing from active Orders
  await syncOrderLog(orderId, { status: "Deleted (Admin)" }, req.staffName);

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
    ];

    // Style header
    worksheet.getRow(1).font = { bold: true };

    logs.forEach((log) => {
      const o = log.order || {};
      // Format items list
      const itemsStr = (o.items || [])
        .map((i) => `${i.quantity}x ${i.name}`)
        .join(", ");

      worksheet.addRow({
        id: o.id,
        date: o.date ? new Date(o.date).toLocaleString() : "",
        customerName: o.customerName,
        phoneNumber: o.phoneNumber,
        location: o.location,
        items: itemsStr,
        totalAmount: o.totalAmount,
        paymentStatus: o.paymentStatus,
        status: o.status,
      });
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=Kibbys_Sales_Report_${Date.now()}.xlsx`
    );
    await workbook.xlsx.write(res);
    res.end();
  } catch (e) {
    console.error("Export Error:", e);
    res.status(500).send("Error exporting data");
  }
});

  // 5. Admin: Login & Signup & Management
  
  // Staff Signup
  app.post("/api/admin/signup", async (req, res) => {
    const { username, password, name, profilePhoto, email, phone } = req.body;
    try {
      const existing = await Staff.findOne({ username });
      if (existing) return res.json({ success: false, message: "Username already taken." });
      
      const newStaff = new Staff({ 
        username, 
        password, 
        name, 
        email: email || "",
        phone: phone || "",
        profilePhoto: profilePhoto || "",
        status: 'pending', 
        role: 'staff' 
      });
      await newStaff.save();
      res.json({ success: true, message: "Application submitted! Wait for Super Admin approval." });
    } catch (e) {
      console.error("Signup Error:", e);
      res.status(500).json({ success: false, message: "Signup failed." });
    }
  });

  // Database-backed Login
  app.post("/api/admin/login", async (req, res) => {
    const { username, password } = req.body;
    const now = Date.now();
  
    try {
      if (!mongoose.connection.readyState) {
        console.error("[LOGIN ERROR] Database not connected (readyState: 0)");
        return res.status(503).json({ success: false, message: "Database connection is not ready. Check your MONGODB_URI." });
      }

      const user = await Staff.findOne({ username, password });
      if (!user) return res.status(401).json({ success: false, message: "Invalid credentials." });
      
      if (user.isBlocked) return res.status(403).json({ success: false, message: "Your account has been blocked. Contact Super Admin." });
      if (user.status === 'pending') return res.status(403).json({ success: false, message: "Your account is pending approval." });
      if (user.status === 'rejected') return res.status(403).json({ success: false, message: "Your account access has been denied." });

      const sessionId = Math.random().toString(36).substring(2, 15);
      
      // If this is the Super Admin (from env), force their profile to match current env settings
      const superUser = process.env.ADMIN1_USER || process.env.ADMIN_USER || "admin1";
      if (user.role === 'super-admin' && user.username === superUser) {
        user.name = process.env.ADMIN1_NAME || user.name;
      }

      activeAdminSessions[username] = { 
        lastActive: now, 
        sessionId, 
        name: user.name, 
        role: user.role,
        photo: user.profilePhoto
      };

      // Save persistent session to MongoDB
      await AdminSession.findOneAndUpdate(
        { username: user.username },
        { 
          sessionId, 
          name: user.name, 
          role: user.role, 
          photo: user.profilePhoto,
          lastActive: new Date(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) 
        },
        { upsert: true }
      );
      
      console.log(`[ADMIN LOGIN] ${user.name} (${user.role}) logged in successfully`);
      return res.json({
        success: true,
        token: ADMIN_TOKEN,
        staffName: user.name,
        role: user.role,
        profilePhoto: user.profilePhoto,
        username: user.username,
        email: user.email || "",
        phone: user.phone || "",
        sessionId
      });
    } catch (e) {
      console.error("[LOGIN CRITICAL ERROR]", e);
      res.status(500).json({ success: false, message: "Server error during login: " + e.message });
    }
  });

  // Staff Management (Super Admin Only)
  app.get("/api/admin/staff/list", authMiddleware, async (req, res) => {
    if (req.staffRole !== 'super-admin') return res.status(403).json({ success: false });
    try {
      const allStaff = await Staff.find({ role: 'staff' });
      res.json({ success: true, staff: allStaff });
    } catch (e) { res.status(500).json({ success: false }); }
  });

  app.post("/api/admin/staff/action", authMiddleware, async (req, res) => {
    if (req.staffRole !== 'super-admin') return res.status(403).json({ success: false });
    const { username, action } = req.body; // action: 'approved' | 'rejected' | 'delete' | 'block' | 'unblock'
    
    try {
      if (action === 'delete') {
        await Staff.deleteOne({ username });
        delete activeAdminSessions[username];
        return res.json({ success: true });
      }
      
      if (action === 'block') {
        await Staff.updateOne({ username }, { isBlocked: true });
        delete activeAdminSessions[username];
        return res.json({ success: true });
      }

      if (action === 'unblock') {
        await Staff.updateOne({ username }, { isBlocked: false });
        return res.json({ success: true });
      }
      
      await Staff.updateOne({ username }, { status: action });
      if (action === 'rejected') delete activeAdminSessions[username];
      
      res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
  });


  // Profile Management for Admin/Staff
  app.post("/api/admin/profile/update", authMiddleware, async (req, res) => {
    const { name, username, password, profilePhoto, email, phone } = req.body;
    const oldUsername = req.staffUsername;
    
    try {
      const user = await Staff.findOne({ username: oldUsername });
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });
      
      // If updating username, check for duplicates
      if (username && username !== oldUsername) {
        const existing = await Staff.findOne({ username });
        if (existing) return res.status(400).json({ success: false, message: 'Username already taken' });
        
        // Update active session key if username changes
        if (activeAdminSessions[oldUsername]) {
          activeAdminSessions[username] = activeAdminSessions[oldUsername];
          delete activeAdminSessions[oldUsername];
        }
        user.username = username;
      }

      if (name) user.name = name;
      if (password) user.password = password;
      if (profilePhoto) user.profilePhoto = profilePhoto;
      if (email !== undefined) user.email = email;
      if (phone !== undefined) user.phone = phone;
      
      await user.save();
      
      res.json({ 
        success: true, 
        message: 'Profile updated successfully',
        staffName: user.name,
        username: user.username,
        profilePhoto: user.profilePhoto,
        email: user.email,
        phone: user.phone
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ success: false, message: 'Server error during update' });
    }
  });

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
