const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

// Schemas (Simplified for migration)
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

const Menu = mongoose.model("Menu", MenuSchema);
const Settings = mongoose.model("Settings", SettingsSchema);

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/restaurant";

async function migrate() {
    console.log("Connecting to DB...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected.");

    // 1. Migrate Menu
    const menuPath = path.join(__dirname, "menu.json");
    if (fs.existsSync(menuPath)) {
        const menuData = JSON.parse(fs.readFileSync(menuPath, "utf8"));
        console.log(`Found ${menuData.length} items in menu.json`);
        
        for (const item of menuData) {
            const exists = await Menu.findOne({ id: item.id });
            if (!exists) {
                await new Menu(item).save();
                console.log(`Migrated Menu Item: ${item.name}`);
            }
        }
    } else {
        console.log("menu.json not found.");
    }

    // 2. Migrate Settings
    const settingsPath = path.join(__dirname, "settings.json");
    if (fs.existsSync(settingsPath)) {
        const fileSettings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
        console.log("Found settings.json");

        let dbSettings = await Settings.findOne();
        if (!dbSettings) {
            dbSettings = new Settings(fileSettings);
            console.log("Created new Settings document from file.");
        } else {
            console.log("Updating existing Settings document...");
            // Merge arrays if DB is empty but file has data
            if ((!dbSettings.riders || dbSettings.riders.length === 0) && fileSettings.riders?.length > 0) {
                dbSettings.riders = fileSettings.riders;
                console.log("Migrated Riders");
            }
            if ((!dbSettings.promoCodes || dbSettings.promoCodes.length === 0) && fileSettings.promoCodes?.length > 0) {
                dbSettings.promoCodes = fileSettings.promoCodes;
                console.log("Migrated PromoCodes");
            }
             if ((!dbSettings.team || dbSettings.team.length === 0) && fileSettings.team?.length > 0) {
                dbSettings.team = fileSettings.team;
                console.log("Migrated Team");
            }
             if ((!dbSettings.menuCategories || dbSettings.menuCategories.length === 0) && fileSettings.menuCategories?.length > 0) {
                dbSettings.menuCategories = fileSettings.menuCategories;
                console.log("Migrated MenuCategories");
            }
            
            // Merge other fields if missing in DB
            if (!dbSettings.homeTitle && fileSettings.homeTitle) dbSettings.homeTitle = fileSettings.homeTitle;
            if (!dbSettings.dealOfWeek && fileSettings.dealOfWeek) dbSettings.dealOfWeek = fileSettings.dealOfWeek;
            if (!dbSettings.homeAbout && fileSettings.homeAbout) dbSettings.homeAbout = fileSettings.homeAbout;
        }
        await dbSettings.save();
        console.log("Settings migration complete.");
    } else {
        console.log("settings.json not found.");
    }

    console.log("Done.");
    process.exit(0);
}

migrate().catch(e => { console.error(e); process.exit(1); });
