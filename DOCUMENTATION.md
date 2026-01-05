# PCnC Restaurant System Documentation

This document provides a comprehensive overview of the technologies, architecture, and implementation details of the PCnC Restaurant website and Admin Dashboard.

---

## 🏗️ 1. System Architecture

The application follows a **Client-Server Architecture**:

- **Frontend**: A rich, responsive UI built with HTML5, CSS3, and JavaScript, served as static files.
- **Backend**: A RESTful API built with Node.js and Express.js to handle data processing, file uploads, and reporting.
- **Persistence**: A lightweight, file-based JSON storage system (NoSQL style).

---

## 🎨 2. Frontend Technologies

The user interface is designed for premium look and feel, responsiveness across all devices, and interactive feedback.

### Core Stack:

- **HTML5 & CSS3**: Custom responsive layouts using modern styling techniques (glassmorphism, vibrant gradients).
- **JavaScript (ES6)**: Handles dynamic page updates and asynchronous API communications.
- **jQuery (1.11.3)**: Used for DOM manipulation, AJAX requests, and UI effects.
- **Bootstrap 4**: Provides the foundation for grid systems, modals (pop-ups), and base styling.

### UI Enhancements:

- **FontAwesome 5**: High-quality icons used for status indicators, actions, and navigation.
- **Google Fonts (Inter & Poppins)**: Custom typography for a professional, modern aesthetic.
- **Animate.css**: Subtle animations for page transitions and notifications.
- **Toast Notifications**: Simplified custom alert system for real-time admin feedback.

---

## ⚙️ 3. Backend Technologies

The server acts as the central hub managing order flow, menu updates, and system configuration.

### Core Stack:

- **Node.js**: The runtime environment for the backend.
- **Express.js (v5.x)**: The web framework used to build RESTful API endpoints.

### Key Libraries:

- **Multer**: Middleware specifically used for handling `multipart/form-data` during menu item photo uploads.
- **ExcelJS**: A powerful engine used to generate and format the Daily Report (.xlsx) files.
- **CORS**: Enables secure cross-origin resource sharing between the frontend and backend.
- **Body-Parser**: Parses incoming request bodies (JSON and URL-encoded).

---

## 🗄️ 4. Data Storage ("Database")

The system uses **JSON Flat-Files** for storage, providing a fast, schema-less, and easy-to-manage data layer.

| File              | Purpose                                                           |
| :---------------- | :---------------------------------------------------------------- |
| `menu.json`       | Stores the restaurant menu (name, price, category, images, tags). |
| `orders.json`     | Stores currently active orders being processed in the kitchen.    |
| `order_logs.json` | A permanent audit trail (Black Box) of every order ever placed.   |
| `settings.json`   | Global system configurations (Support phone, email, rider names). |

---

## 🚀 5. Key Feature Implementations

### Real-Time Order Tracking

- **How it works**: The user side uses "Polling" (via `setInterval`) to ping the `/api/order/:id` endpoint every few seconds.
- **Experience**: This allows order status changes (e.g., from "Preparing" to "On the Way") to appear instantly on the user's screen without a refresh.

### Professional Admin Dashboard ("Command Center")

- **Kitchen Actions**: One-click status updates (`status: 'Preparing'`, etc.).
- **Visual Filters**: Separate views for "Active Orders" and "Order History" using JavaScript array filtering.
- **Status Coloring**: Dynamic CSS classes (`row-new`, `row-preparing`) applied based on order state for high-speed operation.

### M-Pesa Payment Flow (Simulation)

- Integrates with the `orders.json` logic to mark payments as "Pending Verification" until an admin clicks "Mark Paid," ensuring secure financial control.

### WhatsApp Support Integration

- Dynamically converts phone numbers from `settings.json` into international `wa.me` links for instant customer-to-support messaging.

---

## 📂 6. Folder Structure

- `/fruitkha-1.0.0`: The complete frontend codebase.
- `/fruitkha-1.0.0/admin`: Secure admin management pages.
- `/uploads`: Storage for menu item images uploaded by the admin.
- `server.js`: The heart of the system containing all API logic.

---

**Developed for PCnC Restaurant**
