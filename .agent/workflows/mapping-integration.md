---
description: Implement Uber-like location search and real-time mapping for PCnC
---

# Uber-like Mapping Workflow

This workflow tracks the implementation of the professional mapping and location search functionality.

## Status: IN PROGRESS

### 1. Checkout Page Enhancements [IN PROGRESS]

- [ ] Add Leaflet.js and Photon Search dependencies to `checkout.html`
- [ ] Create a map UI component for pinpointing delivery location
- [ ] Implement "Find My Location" (GPS) functionality
- [ ] Implement address search with auto-complete using Photon API
- [ ] Ensure Lat/Lng coordinates are captured during checkout

### 2. Backend & Data Integration [NOT STARTED]

- [ ] Update Order schema in `server.js` to store `coordinates` (lat, lng)
- [ ] Update `/api/order` endpoint to handle coordinate data

### 3. Admin Dashboard Enhancements [NOT STARTED]

- [ ] Add "View on Map" button for each order in the dashboard
- [ ] Implement a map modal in `dashboard.html` to show order location
- [ ] (Optional) Show rider real-time position if sharing is active

### 4. User Tracking Page Enhancements [NOT STARTED]

- [ ] Show the customer's delivery point on a map in `track-order.html`
- [ ] (Optional) Show "Out for Delivery" rider position simulating travel

### 5. UI/UX Polishing [NOT STARTED]

- [ ] Refine notification system in `pcnc.js` (Done in part, need verification)
- [ ] Final responsive testing for maps and vertical timeline
