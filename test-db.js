const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;
const ADMIN_USER = process.env.ADMIN1_USER || process.env.ADMIN_USER;

console.log('--- MongoDB Connection Test ---');
console.log('URI:', MONGODB_URI ? 'Detected (starts with ' + MONGODB_URI.substring(0, 15) + '...)' : 'MISSING');
console.log('Target Admin:', ADMIN_USER || 'Not specified (will use default: admin1)');

if (!MONGODB_URI) {
    console.error('ERROR: MONGODB_URI is not set in .env');
    process.exit(1);
}

const StaffSchema = new mongoose.Schema({
    username: String,
    role: String,
    status: String
});
const Staff = mongoose.model('Staff', StaffSchema);

async function test() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected successfully!');

        const count = await Staff.countDocuments();
        console.log('Total Staff in DB:', count);

        const admins = await Staff.find({ role: 'super-admin' });
        console.log('Found Super Admins:');
        admins.forEach(a => {
            console.log(` - ${a.username} (${a.status})`);
        });

        if (admins.length === 0) {
            console.log('⚠️ No super-admins found. The seed script should run when you start the server.');
        } else {
            const match = admins.find(a => a.username === (ADMIN_USER || 'admin1'));
            if (match) {
                console.log(`✅ Success! Your admin "${match.username}" exists and is ${match.status}.`);
            } else {
                console.log(`❌ Admin "${ADMIN_USER || 'admin1'}" not found in database.`);
            }
        }

    } catch (err) {
        console.error('❌ Connection failed:', err.message);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected.');
    }
}

test();
