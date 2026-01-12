<div align="center">

# 🍕 Pizza Chick n Crust (PCnC)

### _A Premium Full-Stack E-Commerce Ecosystem for Modern Food Delivery_

[![Status](https://img.shields.io/badge/Status-Active-success.svg)]()
[![Node.js](https://img.shields.io/badge/Node.js-v14+-green?logo=node.js)](https://nodejs.org/)
[![Database](https://img.shields.io/badge/Database-MongoDB_Atlas-green?logo=mongodb)](https://www.mongodb.com/atlas)
[![License](https://img.shields.io/badge/License-MIT-blue)](LICENSE)

---

**Pizza Chick n Crust** is a state-of-the-art digital storefront engineered for the fast-paced food industry.
Designed specifically for the USIU-A community, it seamlessly blends gourmet aesthetics with industrial-grade reliability.

[Explore Documentation](DOCUMENTATION.md) • [Report Bug](https://github.com/your-username/pizza-chick-n-crust/issues) • [Request Feature](https://github.com/your-username/pizza-chick-n-crust/issues)

</div>

---

## 💎 The Premium Experience

### Seamless User Journey

- ✨ **Natural Search Engine**: Intelligent location-aware search that prioritizes local landmarks (USIU Hostels) with an automatic global fallback for distant areas.
- 🗺️ **Precision Delivery Maps**: Integrated Leaflet.js map with a confirmation pinpoint system. Marker-dragging triggers real-time delivery fee recalculations.
- 🛒 **Smart Persistence**: Utilizes `localStorage` to ensure your cart and preferences survive refreshes and browser downtime.
- 🏷️ **Promo Engine**: Fully integrated marketing tools supporting dynamic percentage-based discount codes.

### 🛡️ Secure Command Center (Admin)

- 📟 **Order Command Center**: A real-time hub for kitchen management with status flow control (Preparing ➔ Dispatched ➔ Delivered).
- 🍱 **Live Menu Architect**: High-end interface for updating prices, categories, and high-resolution product photography on the fly.
- ⚙️ **Global Configuration**: Centrally manage restaurant GPS coordinates, support contacts, and rider details without a single line of code.

---

## 🏗️ Technical Architecture

### 🛡️ The Shield (Security)

- **Rate Limiting**: Protection against DDoS and brute-force order spamming.
- **Encrypted Payloads**: Secure handling of customer data and API communications.
- **Robust Input Validation**: Strict verification of phone numbers (10 digits, Kenyan prefixes) and mandatory fields.

### ⚙️ The Core (Stack)

```mermaid
graph TD
    A[Frontend: HTML5/CSS3/jQuery] --> B[API: Node.js/Express]
    B --> C[Cloud DB: MongoDB Atlas]
    A --> D[Maps: Leaflet.js]
    A --> E[Payments: M-Pesa API]
    B --> F[Storage: Local Disk / Cloud]
```

---

## Installation & Setup

### 📋 Prerequisites

- **Runtime**: Node.js v14 or higher
- **Database**: A free cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)

### 🚀 Guided Setup

1.  **Clone with SSH/HTTPS**

    ```bash
    git clone https://github.com/your-username/pizza-chick-n-crust.git
    cd pizza-chick-n-crust
    ```

2.  **Install Production Dependencies**

    ```bash
    npm install
    ```

3.  **Configure Environment Variables**
    Create a `.env` file in the root directory:

    ```env
    MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/pcnc
    PORT=3000
    MPESA_CONSUMER_KEY=your_key
    MPESA_CONSUMER_SECRET=your_secret
    ```

4.  **Launch the Engine**
    ```bash
    npm start
    ```

---

## 🗺️ Hybrid Deployment Strategy

We utilize a high-performance hybrid hosting model to ensure maximum speed for Kenyan users while maintaining a robust backend.

| Component             | Platform          | Role                                                     |
| :-------------------- | :---------------- | :------------------------------------------------------- |
| **Frontend & Domain** | **HostPinnacle**  | Hosts static assets and `.co.ke` domain for local speed. |
| **Backend API**       | **Railway**       | Runs the Node.js server and handles business logic.      |
| **Database**          | **MongoDB Atlas** | Secure, cloud-native data persistence.                   |
| **Payments**          | **M-Pesa Daraja** | Integrated payment processing (Safaricom).               |

> [!TIP] > **Detailed Deployment Instructions:** See [DEPLOYMENT_PLAN.md](DEPLOYMENT_PLAN.md) for step-by-step implementation details, CORS setup, and API pathing.

---

---

## 🤝 Contributing

We welcome contributions that push the boundaries of digital dining. Feel free to fork, branch, and submit a pull request!

---

<p align="center">
  <b>© 2026 Pizza Chick n Crust</b><br>
  <i>Crafted with passion for the perfect crust.</i>
</p>
