const mongoose = require("mongoose");
require("dotenv").config();

const SettingsSchema = new mongoose.Schema({}, { strict: false });
const Settings = mongoose.model("Settings", SettingsSchema);

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/restaurant";

console.log("Connecting...");
mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log("Connected.");
    const allSettings = await Settings.find({});
    console.log(`Found ${allSettings.length} setting documents.`);
    
    allSettings.forEach((s, i) => {
        console.log(`--- DOC ${i} ID: ${s._id} ---`);
        console.log("Team Count:", s.team ? s.team.length : 'undefined');
        console.log("Categories Count:", s.menuCategories ? s.menuCategories.length : 'undefined');
        if (s.menuCategories && s.menuCategories.length > 0) {
            console.log("First Category:", JSON.stringify(s.menuCategories[0]));
        }
    });
    
    mongoose.connection.close();
  })
  .catch(err => console.error(err));
