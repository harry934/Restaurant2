# 🍕 Pizza Chick n Crust (PCnC)

[![Node.js](https://img.shields.io/badge/Node.js-v14+-green?logo=node.js)](https://nodejs.org/)
[![Database](https://img.shields.io/badge/Database-MongoDB_Atlas-green?logo=mongodb)](https://www.mongodb.com/atlas)
[![License](https://img.shields.io/badge/License-MIT-blue)](LICENSE)

**Pizza Chick n Crust (PCnC)** is a high-performance, modern e-commerce solution built for the fast-food industry. Specifically tailored for the USIU-A community and Nairobi environs, it features a "natural" location-based ordering system, real-time tracking, and a powerful administrative command center.

---

## ✨ Key Features

### 🛒 Ordering Experience

- **Natural Location Search**: Integrated local landmark database (USIU hostels) with a global geocoding fallback (Photon API).
- **Dynamic Delivery Fees**: Intelligent distance calculation—**Free delivery within 1.0km**, and KES 100/km beyond.
- **Interactive Pinpoint**: An always-available Map (Leaflet.js) allows users to drag markers to their exact gate for precision delivery.
- **Cart Persistence**: Smart `localStorage` integration keeps your cart and details saved even if you refresh or close the tab.
- **Promo System**: Support for percentage-based discount codes.

### 🛡️ Admin Command Center

- **Real-time Order Management**: Process orders through "Preparing", "On the Way", and "Delivered" states.
- **Menu Management**: Change prices, add items, and upload photos directly from the dashboard.
- **Global Settings**: Configure restaurant coordinates, support phone numbers, and delivery riders without touching code.
- **Order Analytics**: Complete order logs and tracking status history.

---

## 🛠️ Technology Stack

| Layer        | Technology                                   |
| :----------- | :------------------------------------------- |
| **Backend**  | Node.js, Express.js (REST API)               |
| **Database** | MongoDB Atlas (Cloud NoSQL)                  |
| **Frontend** | HTML5, CSS3, JavaScript (ES6+), jQuery       |
| **Mapping**  | Leaflet.js, OpenStreetMap, Photon Geocoding  |
| **Payment**  | M-Pesa STK Push / Merchant Till Integration  |
| **Styling**  | Custom CSS3 (Glassmorphism & Vibrant Design) |

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) installed
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) account for cloud storage

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/your-username/pizza-chick-n-crust.git
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file in the root directory:

   ```env
   MONGODB_URI=your_mongodb_connection_string
   PORT=3000
   MPESA_CONSUMER_KEY=your_key
   MPESA_CONSUMER_SECRET=your_secret
   ```

4. **Run the server**
   ```bash
   npm start
   ```
   Open `http://localhost:3000` in your browser.

---

## 🗺️ Deployment

The project is optimized for deployment on **Render**, **Railway**, or **Heroku**.

1. Connect your GitHub repository to your hosting provider.
2. In the provider's dashboard, set the Build Command to `npm install` and Start Command to `node server.js`.
3. Add your Environment Variables from your `.env` file to the provider's settings.

---

## 📝 Project Structure

- `/fruitkha-1.0.0`: The frontend application (HTML/JS/CSS).
- `/fruitkha-1.0.0/admin`: Dashboard and shop management tools.
- `/uploads`: Dynamically uploaded menu item images.
- `server.js`: The central API server logic.
- `DOCUMENTATION.md`: Deep dive into technical implementation and roadmap.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Developed for Pizza Chick n Crust Restaurant**
_Crafted for taste, delivery, and speed._
