# Pizza Chick n Crust (PCnC) Website

This is the official website for Pizza Chick n Crust, built on top of a responsive HTML template with a Node.js backend.

## Features

- **User Side**:
  - Home Page with Offers and Featured Products.
  - Menu Page with dynamic cart functionality.
  - Cart & Checkout with M-Pesa STK Push simulation.
  - No user accounts required.
- **Admin Side**:
  - Secure Login.
  - Dashboard to view and manage orders.
  - Real-time order status updates.

## Setup & Run

1.  **Install Dependencies**:

    ```bash
    npm install
    ```

2.  **Start the Server**:

    ```bash
    node server.js
    ```

    The server runs on `http://localhost:3000`.

3.  **Access the Website**:
    - **Customer View**: [http://localhost:3000](http://localhost:3000)
    - **Admin Dashboard**: [http://localhost:3000/admin/index.html](http://localhost:3000/admin/index.html)

## Credentials

- **Admin Login**:
  - Username: `admin`
  - Password: `admin123`

## Project Structure

- `server.js`: Backend logic (API, Static Server).
- `public/`: Frontend files (HTML, CSS, JS, Assets).
  - `assets/js/pcnc.js`: Core frontend logic for Cart and Checkout.
  - `admin/`: Admin dashboard files.
- `orders.json`: Stores orders (created automatically).

## Notes

- The payment integration is a **simulation**. It triggers a log on the server and auto-successes after 10 seconds for demonstration.
- Images for pizzas and burgers were generated using AI.
