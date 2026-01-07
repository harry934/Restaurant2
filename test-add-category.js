// Native fetch is available in Node 18+

async function testAdd() {
    console.log("Attempting to add category via API...");
    try {
        const res = await fetch('http://localhost:3000/api/admin/category/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ catId: 'test-cat', catName: 'Test Category' })
        });
        const data = await res.json();
        console.log("API Response:", data);
        
        // Now verify with DB
        const mongoose = require("mongoose");
        require("dotenv").config();
        const SettingsSchema = new mongoose.Schema({}, { strict: false });
        const Settings = mongoose.model("Settings", SettingsSchema);
        const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/restaurant";
        
        await mongoose.connect(MONGODB_URI);
        const settings = await Settings.findOne();
        console.log("DB Categories:", JSON.stringify(settings.menuCategories));
        mongoose.connection.close();
        
    } catch (e) {
        console.error("Error:", e);
    }
}

testAdd();
