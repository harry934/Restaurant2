const mongoose = require("mongoose");
require("dotenv").config();

// Define Schema EXACTLY as in server.js
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

const Settings = mongoose.model("Settings", SettingsSchema);

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/restaurant";

console.log("Connecting to:", MONGODB_URI);

mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log("Connected to MongoDB");
    const settings = await Settings.findOne();
    if (settings) {
        console.log("Settings found!");
        console.log("Team:", JSON.stringify(settings.team, null, 2));
        console.log("Menu Categories:", JSON.stringify(settings.menuCategories, null, 2));
        
        // Check if fields exist but are empty or undefined
        if (!settings.team) console.log("WARNING: team field is missing/undefined");
        if (!settings.menuCategories) console.log("WARNING: menuCategories field is missing/undefined");
        
    } else {
        console.log("No settings document found.");
    }
    mongoose.connection.close();
  })
  .catch(err => {
    console.error("Error:", err);
    process.exit(1);
  });
