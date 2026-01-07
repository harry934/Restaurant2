# Pizza Chick n Crust (PCnC) - Digital Ecosystem Documentation

This document provides a comprehensive guide to the technology, architecture, and operation of the Pizza Chick n Crust website and administrative systems.

---

## 🏗️ 1. Technology Stack (The "Engine")

The application is built using a modern **MERN-style** stack (though it uses plain JavaScript/jQuery instead of React to maintain high performance and SEO compatibility).

- **Backend**: Node.js with Express.js (RESTful API).
- **Database**: **MongoDB Atlas** (Cloud-hosted NoSQL database for high reliability).
- **Frontend**: HTML5, CSS3, JavaScript (ES6+), jQuery.
- **Mapping**: Leaflet.js with OpenStreetMap.
- **Geocoding**: Photon API (for street/building search).
- **Payment**: M-Pesa STK Push API integration.

---

## 🗺️ 2. Smart Delivery System

One of the website's most advanced features is the **Natural Search & Delivery Calculation**.

### How Location Search Works:

1. **Local Priority**: The system carries a list of USIU-proximate landmarks (Hostels like Priwanna, Esanto, Qwetu, etc.). This makes searching instant for local students.
2. **Global Fallback**: If a user types an address outside the USIU vicinity, the system automatically queries the **Photon map database** to find any building or street in Kenya.
3. **Interactive Confirmation**: A map appears only if the distance is > 1km, allowing users to move a red marker to their exact gate.

### Delivery Fee Logic:

- **Free Zone**: 0 - 1.0 km from the restaurant is completely free.
- **Paid Zone**: > 1.0 km is charged at **KES 100 per kilometer**.
- **Dynamic Updates**: The fee updates in real-time as the marker is dragged.

---

## 🚀 3. Deployment Guide

The website is designed to be hosted on **Render.com** or **Railway.app** for the server, and **MongoDB Atlas** for the data.

### Step-by-Step Deployment:

1. **Database**: Create a free cluster on MongoDB Atlas and get your `MONGODB_URI`.
2. **Environment Variables**: Create a `.env` file containing:
   - `MONGODB_URI`: Your database link.
   - `PORT`: Usually 3000.
   - `MPESA_CONSUMER_KEY` & `SECRET`: For payments.
3. **Hosting (Render)**:
   - Connect your GitHub repository to Render.
   - Set the build command: `npm install`
   - Set the start command: `node server.js`
   - Add your `.env` variables in the "Environment" tab.

---

## ✅ 4. Pros & Cons

### Pros (Strengths):

- **User Experience**: No login/password required to order (reduces friction).
- **Mobile First**: Optimized for one-handed operation on smartphones.
- **Persistence**: Remembers your cart even if you refresh or close the browser (using `localStorage`).
- **Transparency**: Users see exactly where the delivery fee comes from via the distance calculation.
- **Admin Control**: Admins can change pizza prices, restaurant coordinates, and contact info without touching code.

### Cons (Current Limitations):

- **Manual verification**: Admins must manually confirm M-Pesa codes for "Buy Goods" payments.
- **Image Hosting**: Currently images are saved to the server disk; for very large scale, a cloud bucket (like AWS S3) would be better.

---

## 🔮 5. Future Roadmap

Potential upgrades to make the platform even more powerful:

1. **Rider App**: A simple interface for delivery riders to mark "Order Picked Up" and share their GPS location in real-time.
2. **Instant M-Pesa Callback**: Automatically mark orders as "Paid" the moment the user enters their PIN (using M-Pesa Daraja callbacks).
3. **User Accounts**: Optional login for users to see their "Loyalty Points" and "Order History."
4. **AI Recommendations**: Suggesting sides (like extra fries) based on the pizza selected.

---

## 🛠️ 6. Maintenance & Updates

- **Changing Restaurant Location**: Go to the Admin Settings page to update the Map Coordinates. This will instantly recalculate delivery fees for all customers.
- **Adding Promo Codes**: Done through the **Marketing & Deals** tab in the Admin Panel.
- **Backups**: Since data is in MongoDB Atlas, it is backed up automatically by the cloud provider.

---

**© 2026 Pizza Chick n Crust**
_Engineered for speed, taste, and efficiency._
