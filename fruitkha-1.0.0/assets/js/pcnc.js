let MENU_ITEMS = [];
let APPLIED_DISCOUNT_PERCENT = 0;
let APPLIED_PROMO_CODE = null;

async function loadMenuData() {
    try {
        const res = await fetch('/api/menu');
        MENU_ITEMS = await res.json();
        return MENU_ITEMS;
    } catch (e) {
        console.error("Failed to load menu", e);
        return [];
    }
}

let currentFilter = 'all';

// Notification System
function showNotification(title, message, type = 'success') {
    let container = document.querySelector('.pcnc-notification-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'pcnc-notification-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `pcnc-toast ${type}`;
    
    let icon = 'fa-check-circle';
    if (type === 'error') icon = 'fa-times-circle';
    if (type === 'info') icon = 'fa-info-circle';
    
    toast.innerHTML = `
        <i class="fas ${icon}"></i>
        <div class="pcnc-toast-content">
            <span class="pcnc-toast-title">${title}</span>
            <span class="pcnc-toast-msg">${message}</span>
        </div>
    `;

    container.appendChild(toast);

    // Auto remove after 4 seconds
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 4000);
}

// CART LOGIC
function getCart() {
    return JSON.parse(localStorage.getItem('pcnc_cart')) || [];
}

function saveCart(cart) {
    localStorage.setItem('pcnc_cart', JSON.stringify(cart));
    updateCartMetadata();
}

function addToCart(id) {
    const cart = getCart();
    const item = MENU_ITEMS.find(i => i.id === id);
    if (!item) return;

    const existing = cart.find(i => i.id === id);
    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({ ...item, quantity: 1 });
    }
    saveCart(cart);
    showNotification('Added!', item.name + ' has been added to your cart.', 'success');
}

function updateCartMetadata() {
    const cart = getCart();
    const count = cart.reduce((sum, i) => sum + i.quantity, 0);
    
    // Update top header badges
    const badges = document.querySelectorAll('.pcnc-header-badge');
    badges.forEach(b => {
        b.innerText = count;
        b.style.display = count > 0 ? 'flex' : 'none';
    });

    // Update bottom nav cart count
    const bottomNavCount = document.querySelector('.mobile-bottom-nav .cart-count');
    if (bottomNavCount) {
        bottomNavCount.innerText = count;
        bottomNavCount.style.display = count > 0 ? 'block' : 'none';
    }

    // Update any other .cart-count elements
    const genericCounts = document.querySelectorAll('.cart-count:not(.mobile-bottom-nav .cart-count)');
    genericCounts.forEach(gc => gc.innerText = count);
}

function removeFromCart(id) {
    let cart = getCart();
    cart = cart.filter(i => i.id !== id);
    saveCart(cart);
    if (window.location.pathname.includes('cart.html') || window.location.pathname.includes('checkout.html')) {
        renderCartPage();
    }
}

function updateQuantity(id, delta) {
    let cart = getCart();
    const item = cart.find(i => i.id === id);
    if (item) {
        item.quantity += delta;
        if (item.quantity <= 0) {
            removeFromCart(id);
            return;
        }
        saveCart(cart);
        if (window.location.pathname.includes('cart.html') || window.location.pathname.includes('checkout.html')) {
            renderCartPage();
        }
    }
}

// Helper to generate premium product card HTML
function generateProductCardHTML(item) {
    const isSoldOut = item.isAvailable === false;
    const opacity = isSoldOut ? '0.7' : '1';
    const grayscale = isSoldOut ? 'grayscale(1)' : 'none';
    
    return `
        <div class="col-lg-4 col-md-6 mb-5 menu-item-card" data-category="${item.category}" style="opacity: ${opacity};">
            <div class="single-product-item premium-card">
                ${isSoldOut ? `<span class="badge-sold-out">Sold Out</span>` : ''}
                ${item.tag ? `<span class="badge-tag">${item.tag}</span>` : ''}
                
                <div class="product-image-wrap">
                    <img src="${item.image}" alt="${item.name}" style="filter: ${grayscale};" class="product-img-hover">
                </div>
                
                <div class="product-details">
                    <h3 class="product-title">${item.name}</h3>
                    <p class="product-description">Freshly prepared with authentic Kibby's flavors and the finest ingredients.</p>
                    
                    <div class="product-footer">
                        <div class="price-wrap">
                            <span class="price-label">Price</span>
                            <span class="price-value">KES ${item.price.toLocaleString()}</span>
                        </div>
                        ${isSoldOut ? `
                            <button class="cart-btn sold-out-btn" disabled>
                                <i class="fas fa-ban"></i>
                            </button>
                        ` : `
                            <a href="#" onclick="addToCart(${item.id}); return false;" class="cart-btn">
                                <i class="fas fa-shopping-cart"></i>
                            </a>
                        `}
                    </div>
                </div>
            </div>
        </div>
    `;
}

// RENDER MENU (shop.html)
async function renderMenu(filter = 'all') {
    const container = document.getElementById('menu-container');
    if (!container) return;

    if (MENU_ITEMS.length === 0) await loadMenuData();

    injectPremiumStyles();
    
    currentFilter = filter;
    const searchTerm = (document.getElementById('shopSearch')?.value || '').toLowerCase();
    
    // 1. Filter items first
    let items = MENU_ITEMS;
    if (filter !== 'all') {
        items = items.filter(i => i.category === filter);
    }
    if (searchTerm) {
        items = items.filter(i => i.name.toLowerCase().includes(searchTerm));
    }

    // 2. Clear container
    container.innerHTML = '';

    if (items.length === 0) {
        container.innerHTML = '<div class="col-12 text-center py-5"><h3 class="text-muted">No items found matching your search.</h3></div>';
        return;
    }

    // 3. Group by category if filter is 'all'
    if (filter === 'all' && !searchTerm) {
        const grouped = items.reduce((acc, item) => {
            if (!acc[item.category]) acc[item.category] = [];
            acc[item.category].push(item);
            return acc;
        }, {});

        // Load category names for headers
        const settingsRes = await fetch('/api/settings');
        const settings = await settingsRes.json();
        const categoryMap = (settings.menuCategories || []).reduce((acc, cat) => {
            acc[cat.id] = cat.name;
            return acc;
        }, {});

        for (const catId in grouped) {
            const catName = categoryMap[catId] || catId.toUpperCase();
            const headerHtml = `
                <div class="col-12 category-header" id="cat-scroll-${catId}">
                    <h2>${catName}</h2>
                    <div class="header-line"></div>
                </div>
            `;
            container.innerHTML += headerHtml;
            container.innerHTML += grouped[catId].map(item => generateProductCardHTML(item)).join('');
        }
    } else {
        // Just render the list (filtered or searched)
        container.innerHTML = items.map(item => generateProductCardHTML(item)).join('');
    }
    
    setupFilters();
}

// RENDER HOMEPAGE MENU (index.html)
async function renderHomepageMenu() {
    const container = document.getElementById('homepage-menu-container');
    if (!container) return;

    if (MENU_ITEMS.length === 0) await loadMenuData();

    injectPremiumStyles();

    // Show top 3 featured/bestseller items
    const sampleItems = MENU_ITEMS.slice(0, 3);
    container.innerHTML = sampleItems.map(item => generateProductCardHTML(item)).join('');
}

function injectPremiumStyles() {
    if (document.getElementById('pcnc-menu-styles')) return;
    const style = document.createElement('style');
    style.id = 'pcnc-menu-styles';
    style.innerHTML = `
        :root {
            --pcnc-red: #e7252d;
            --pcnc-dark: #1a1a1a;
            --pcnc-gray: #f9f9f9;
        }

        .category-header {
            margin-top: 60px;
            margin-bottom: 30px;
            text-align: left;
        }
        .category-header h2 {
            font-weight: 900;
            font-size: 2.2rem;
            color: var(--pcnc-dark);
            text-transform: uppercase;
            letter-spacing: 2px;
            margin-bottom: 10px;
        }
        .header-line {
            width: 60px;
            height: 4px;
            background: var(--pcnc-red);
            border-radius: 2px;
        }

        .premium-card {
            background: #fff;
            border-radius: 24px;
            padding: 20px;
            transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            position: relative;
            overflow: hidden;
            border: 1px solid #f0f0f0;
            height: 100%;
            display: flex;
            flex-direction: column;
        }
        .premium-card:hover { 
            transform: translateY(-12px) scale(1.02); 
            box-shadow: 0 25px 50px rgba(231, 37, 45, 0.1) !important; 
            border-color: rgba(231, 37, 45, 0.2);
        }

        .badge-sold-out {
            position: absolute;
            top: 20px;
            right: 20px;
            background: #333;
            color: #fff;
            padding: 6px 14px;
            border-radius: 50px;
            font-size: 0.65rem;
            font-weight: 800;
            z-index: 10;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .badge-tag {
            position: absolute;
            top: 20px;
            left: 20px;
            background: var(--pcnc-red);
            color: #fff;
            padding: 6px 14px;
            border-radius: 50px;
            font-size: 0.65rem;
            font-weight: 800;
            z-index: 10;
            text-transform: uppercase;
            letter-spacing: 1px;
            box-shadow: 0 4px 10px rgba(231, 37, 45, 0.3);
        }

        .product-image-wrap {
            height: 200px;
            background: var(--pcnc-gray);
            border-radius: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            margin-bottom: 20px;
            transition: 0.4s;
        }
        .product-img-hover {
            max-height: 100%;
            width: auto;
            object-fit: contain;
            transition: 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .premium-card:hover .product-image-wrap {
            background: #fff4f4;
        }
        .premium-card:hover .product-img-hover {
            transform: scale(1.15) rotate(5deg);
        }

        .product-details {
            flex-grow: 1;
            display: flex;
            flex-direction: column;
        }
        .product-title {
            font-size: 1.4rem;
            font-weight: 800;
            color: var(--pcnc-dark);
            margin-bottom: 8px;
            line-height: 1.2;
        }
        .product-description {
            color: #777;
            font-size: 0.85rem;
            line-height: 1.5;
            margin-bottom: 20px;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }

        .product-footer {
            margin-top: auto;
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-top: 15px;
            border-top: 1px dashed #eee;
        }
        .price-label {
            display: block;
            font-size: 0.7rem;
            color: #aaa;
            text-transform: uppercase;
            font-weight: 800;
            letter-spacing: 1px;
        }
        .price-value {
            font-size: 1.5rem;
            font-weight: 900;
            color: var(--pcnc-red);
        }

        .cart-btn {
            background: var(--pcnc-dark);
            color: #fff;
            width: 50px;
            height: 50px;
            border-radius: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: 0.3s;
            font-size: 1.2rem;
            box-shadow: 0 6px 20px rgba(0,0,0,0.1);
        }
        .cart-btn:hover { 
            background: var(--pcnc-red) !important; 
            transform: scale(1.1) rotate(-5deg); 
            color: #fff;
            box-shadow: 0 10px 25px rgba(231, 37, 45, 0.4) !important;
        }
        .sold-out-btn {
            background: #ccc;
            cursor: not-allowed;
            box-shadow: none;
        }

        .pcnc-filter-list {
            padding: 0;
            list-style: none;
            display: inline-flex;
            gap: 12px;
            flex-wrap: wrap;
            justify-content: center;
            margin: 0;
        }

        .product-filters {
            position: sticky;
            top: 90px;
            z-index: 100;
            padding: 20px 0;
            background: rgba(255,255,255,0.98);
            backdrop-filter: blur(10px);
            border-bottom: 1px solid #f0f0f0;
            margin-bottom: 40px;
            margin-top: 20px;
        }
        
        .filter-btn {
            padding: 10px 25px;
            border-radius: 50px;
            cursor: pointer;
            font-weight: 700;
            background: #fff;
            color: var(--pcnc-dark);
            border: 2px solid #eee;
            transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) !important;
            box-shadow: 0 4px 10px rgba(0,0,0,0.03);
            list-style: none;
            display: inline-block;
        }
        .filter-btn.active-filter {
            background: var(--pcnc-red) !important;
            color: #fff !important;
            border-color: var(--pcnc-red) !important;
            box-shadow: 0 8px 20px rgba(231, 37, 45, 0.3);
        }
    `;
    document.head.appendChild(style);
}

function setupFilters() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        const filterVal = btn.getAttribute('data-filter');
        
        // Initial state sync
        if (filterVal === currentFilter) {
            btn.classList.add('active-filter');
        } else {
            btn.classList.remove('active-filter');
        }

        btn.onclick = () => {
            filterBtns.forEach(b => b.classList.remove('active-filter'));
            btn.classList.add('active-filter');
            
            // Scroll to category if in 'All' view
            if (currentFilter === 'all' && filterVal !== 'all' && !(document.getElementById('shopSearch')?.value)) {
                const target = document.getElementById(`cat-scroll-${filterVal}`);
                if (target) {
                    const offset = 180; // Account for sticky header
                    const bodyRect = document.body.getBoundingClientRect().top;
                    const elementRect = target.getBoundingClientRect().top;
                    const elementPosition = elementRect - bodyRect;
                    const offsetPosition = elementPosition - offset;

                    window.scrollTo({
                        top: offsetPosition,
                        behavior: 'smooth'
                    });
                    return;
                }
            }
            
            renderMenu(filterVal);
        };
    });
}

// RENDER CART (cart.html) & CHECKOUT (checkout.html)
function renderCartPage() {
    const tbody = document.getElementById('cart-table-body');
    const totalEl = document.getElementById('cart-total');
    if (!tbody) return;

    const cart = getCart();
    if (cart.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">Your cart is empty</td></tr>';
        if(totalEl) totalEl.innerText = 'KES 0';
        return;
    }

    const isCheckout = window.location.pathname.includes('checkout.html');
    let total = 0;

    if (isCheckout) {
        tbody.innerHTML = cart.map(item => {
            const itemTotal = item.price * item.quantity;
            total += itemTotal;
            return `
            <tr class="summary-item-row">
                <td>
                    <div style="font-weight: 700; color: #1a1a1a; margin-bottom: 8px; font-size: 0.95rem;">${item.name}</div>
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div style="display: flex; align-items: center; background: #fff; border: 1.5px solid #eee; border-radius: 50px; padding: 4px 10px; gap: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.02);">
                            <button onclick="updateQuantity(${item.id}, -1)" style="border: none; background: none; color: #e7252d; cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: 900; padding: 2px 5px;">
                                <i class="fas fa-minus" style="font-size: 10px;"></i>
                            </button>
                            <span style="font-weight: 800; color: #333; font-size: 0.9rem; min-width: 15px; text-align: center;">${item.quantity}</span>
                            <button onclick="updateQuantity(${item.id}, 1)" style="border: none; background: none; color: #116940; cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: 900; padding: 2px 5px;">
                                <i class="fas fa-plus" style="font-size: 10px;"></i>
                            </button>
                        </div>
                    </div>
                </td>
                <td style="text-align: right; vertical-align: middle; font-weight: 800; color: #1a1a1a; font-size: 1rem;">
                    KES ${itemTotal.toLocaleString()}
                </td>
            </tr>
            `;
        }).join('');

        // Handle Discount
        if (APPLIED_DISCOUNT_PERCENT > 0) {
            const discountAmount = Math.round(total * (APPLIED_DISCOUNT_PERCENT / 100));
            document.getElementById('discount-row').style.display = 'flex';
            document.getElementById('discount-amount').innerText = `-KES ${discountAmount.toLocaleString()}`;
            total -= discountAmount;
        } else {
            const drow = document.getElementById('discount-row');
            if (drow) drow.style.display = 'none';
        }

    } else {
        tbody.innerHTML = cart.map(item => {
            const itemTotal = item.price * item.quantity;
            total += itemTotal;
            return `
            <tr class="table-body-row">
                <td class="product-remove"><a href="#" onclick="removeFromCart(${item.id})"><i class="far fa-window-close"></i></a></td>
                <td class="product-image"><img src="${item.image}" alt=""></td>
                <td class="product-name">${item.name}</td>
                <td class="product-price">KES ${item.price.toLocaleString()}</td>
                <td class="product-quantity"><input type="number" value="${item.quantity}" onchange="updateQuantity(${item.id}, this.value - ${item.quantity})"></td>
                <td class="product-total">KES ${itemTotal.toLocaleString()}</td>
            </tr>
            `;
        }).join('');
    }

    if(totalEl) totalEl.innerText = 'KES ' + total.toLocaleString();
    
    // Add Delivery Fee if present
    const deliveryFeeEl = document.getElementById('delivery_fee_hidden');
    if (deliveryFeeEl && parseInt(deliveryFeeEl.value) > 0) {
        const fee = parseInt(deliveryFeeEl.value);
        total += fee;
        if(totalEl) totalEl.innerText = 'KES ' + total.toLocaleString();
    }

    // Also update checkout subtotal if present
    const subtotalEl = document.getElementById('subtotal');
    if (subtotalEl) subtotalEl.innerText = 'KES ' + total;
}

// CHECKOUT (checkout.html)
async function submitOrder(e) {
    if(e) e.preventDefault();
    
    const cart = getCart();
    if (cart.length === 0) {
        showNotification('Cart Empty', 'Please add some items to your cart before proceeding.', 'error');
        return;
    }

    const customerName = document.getElementById('name').value.trim();
    const phoneNumber = document.getElementById('phone').value.trim();
    const location = document.getElementById('address').value.trim();
    const notes = document.getElementById('order-notes').value.trim();

    // VALIDATION
    if (!customerName || !phoneNumber || !location) {
        showNotification('Missing Details', 'Please fill in your name, phone, and delivery address.', 'error');
        return;
    }

    // Phone Validation: 10 digits starting with 07 or 01
    const phoneRegex = /^(07|01)\d{8}$/;
    if (!phoneRegex.test(phoneNumber)) {
        showNotification('Invalid Phone', 'Please enter a valid 10-digit Kenyan phone number starting with 07 or 01.', 'error');
        return;
    }

    const paymentMethod = document.querySelector('input[name="payment_method"]:checked').value;
    const totalAmountRaw = cart.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    const discountAmount = Math.round(totalAmountRaw * (APPLIED_DISCOUNT_PERCENT / 100));
    
    const deliveryFee = document.getElementById('delivery_fee_hidden') ? parseInt(document.getElementById('delivery_fee_hidden').value) : 0;
    const totalAmount = totalAmountRaw - discountAmount + deliveryFee;

    // M-Pesa Credentials
    const mpesa_credentials = {
        consumerKey: "RB7RwzrKvbNHTPAic7xvndo3ChzkwSk67uIj0wMw4T2A0rTY",
        consumerSecret: "DlUU4Bsp7SK8EPiTeJgXAirYPwBNaY19E75LA7PBWBthAvLk8iQIaJoG7tpMcAhU",
        shortCode: "6994591"
    };

    const btn = document.getElementById('placeOrderBtn');
    if (btn) {
        btn.innerText = 'Processing...';
        btn.disabled = true;
    }

    const lat = document.getElementById('lat') ? document.getElementById('lat').value : null;
    const lng = document.getElementById('lng') ? document.getElementById('lng').value : null;

    try {
        const res = await fetch('/api/order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                customerName,
                phoneNumber,
                location,
                lat,
                lng,
                notes,
                paymentMethod,
                items: cart,
                totalAmount,
                discountAmount,
                deliveryFee,
                promoCode: APPLIED_PROMO_CODE,
                credentials: mpesa_credentials
            })
        });
        const data = await res.json();
        if (data.success) {
            showNotification('Order Placed', 'Your order has been received! Redirecting to tracking...', 'success');
            localStorage.removeItem('pcnc_cart');
            
            // Store multiple order IDs
            let orders = JSON.parse(localStorage.getItem('pcnc_order_ids') || '[]');
            orders.unshift(data.orderId);
            localStorage.setItem('pcnc_order_ids', JSON.stringify(orders));
            localStorage.setItem('pcnc_last_order_id', data.orderId);

            setTimeout(() => {
                window.location.href = `track-order.html?id=${data.orderId}`;
            }, 2000);

        } else {
            showNotification('Order Failed', data.message, 'error');
            btn.innerText = 'Confirm Order';
            btn.disabled = false;
        }
    } catch (err) {
        console.error("Checkout Error:", err);
        showNotification('Connection Error', 'Payment Request Failed. Please check your network.', 'error');
        btn.innerText = 'Confirm Order';
        btn.disabled = false;
    }
}

// LOCATION SEARCH LOGIC
const NEARBY_AREAS = [
    { name: "Ndichu Container (USIU Road)", lat: -1.220041, lng: 36.878141, distance: "0.1km" },
    { name: "USIU-Africa Main Campus", lat: -1.220141, lng: 36.882841, distance: "0.3km" },
    { name: "Lillian Hostels", lat: -1.219500, lng: 36.884100, distance: "0.2km" },
    { name: "Esanto Hostel", lat: -1.219700, lng: 36.883500, distance: "0.4km" },
    { name: "Priwanna Hostels (Near Esanto)", lat: -1.219800, lng: 36.883700, distance: "0.4km" },
    { name: "Qwetu Student Residences (USIU)", lat: -1.214100, lng: 36.885800, distance: "0.6km" },
    { name: "Lumina Hostels", lat: -1.217800, lng: 36.885200, distance: "0.4km" },
    { name: "Kisima Melrose Hostels", lat: -1.221000, lng: 36.884500, distance: "0.4km" },
    { name: "Millennium Hostels", lat: -1.219000, lng: 36.885000, distance: "0.3km" },
    { name: "Arcadia Hostels", lat: -1.218500, lng: 36.884800, distance: "0.2km" },
    { name: "Millennials Apartments", lat: -1.216500, lng: 36.886000, distance: "0.5km" },
    { name: "TRM Drive Apartments", lat: -1.219500, lng: 36.888500, distance: "0.9km" },
    { name: "The Address (USIU Road)", lat: -1.218800, lng: 36.884200, distance: "0.5km" },
    { name: "Gilgal Mansions", lat: -1.221500, lng: 36.885500, distance: "0.6km" },
    { name: "Naivas Roysambu", lat: -1.217500, lng: 36.890500, distance: "0.8km" },
    { name: "Thika Road Mall (TRM)", lat: -1.218500, lng: 36.889700, distance: "1.0km" }
];

let globalSearchTimeout;
function initializeLocationSearch() {
    const addressInput = document.getElementById('address');
    const suggestionBox = document.getElementById('location-suggestions');
    if (!addressInput || !suggestionBox) return;

    addressInput.addEventListener('input', (e) => {
        const val = e.target.value.toLowerCase();
        if (val.length < 1) {
            suggestionBox.style.display = 'none';
            return;
        }

        // 1. Filter Local Landmarks First (Instant)
        const matches = NEARBY_AREAS.filter(area => 
            area.name.toLowerCase().includes(val)
        );

        let html = '';
        if (matches.length > 0) {
            html = matches.map(area => `
                <div class="suggestion-item" onclick="selectLocation(${area.lat}, ${area.lng}, '${area.name.replace(/'/g, "\\'")}')" style="padding: 12px 20px; cursor: pointer; border-bottom: 1px solid #f5f5f5; display: flex; justify-content: space-between; align-items: center; transition: background 0.2s;">
                    <div style="font-weight: 600; color: #333;">
                        <i class="fas fa-map-marker-alt" style="color: #e7252d; margin-right: 10px; font-size: 0.8rem;"></i>
                        ${area.name}
                    </div>
                    <small style="color: #999; font-weight: 700;">${area.distance}</small>
                </div>
            `).join('');
            suggestionBox.innerHTML = html;
            suggestionBox.style.display = 'block';
        }

        // 2. Clear previous global timeout
        clearTimeout(globalSearchTimeout);

        // 3. Trigger Global Search (Debounced) if length > 2
        if (val.length > 2) {
            globalSearchTimeout = setTimeout(() => {
                const restLat = (typeof usiuPos !== 'undefined') ? usiuPos[0] : -1.220041;
                const restLng = (typeof usiuPos !== 'undefined') ? usiuPos[1] : 36.878141;

                fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(e.target.value)}&lat=${restLat}&lon=${restLng}&limit=5`)
                    .then(r => r.json())
                    .then(data => {
                        if (data.features && data.features.length > 0) {
                            const globalHtml = data.features.map(f => {
                                const p = f.properties;
                                const label = [p.name, p.street, p.city].filter(Boolean).join(', ');
                                // Avoid duplicate labels if local match already shown
                                if (matches.some(m => m.name.toLowerCase() === label.toLowerCase())) return '';
                                
                                return `
                                    <div class="suggestion-item" onclick="selectLocation(${f.geometry.coordinates[1]}, ${f.geometry.coordinates[0]}, '${label.replace(/'/g, "\\'")}')" style="padding: 12px 20px; cursor: pointer; border-bottom: 1px solid #f5f5f5; background: #fffcf5;">
                                        <i class="fas fa-search-location" style="color: #666; margin-right: 10px;"></i>
                                        <span style="font-size: 0.85rem; color: #555;">${label}</span>
                                    </div>
                                `;
                            }).join('');
                            
                            if (globalHtml) {
                                // Append or show if no local matches
                                if (matches.length === 0) {
                                    suggestionBox.innerHTML = globalHtml;
                                } else {
                                    suggestionBox.innerHTML += `<div style="padding: 5px 20px; background: #f8f9fa; font-size: 0.65rem; color: #aaa; text-transform: uppercase; font-weight: 800;">Other Results</div>` + globalHtml;
                                }
                                suggestionBox.style.display = 'block';
                            }
                        }
                        
                        // Fallback "Use Typed" option
                        if (suggestionBox.innerHTML === '') {
                             suggestionBox.innerHTML = `
                                <div class="suggestion-item" onclick="selectLocation(${restLat}, ${restLng}, '${e.target.value.replace(/'/g, "\\'")}')" style="padding: 12px 20px; cursor: pointer; background: #fffcf5;">
                                    <i class="fas fa-keyboard" style="color: #d4a017; margin-right: 10px;"></i>
                                    <span style="color: #856404; font-weight: 600;">Use: "${e.target.value}"</span>
                                </div>
                            `;
                            suggestionBox.style.display = 'block';
                        }
                    });
            }, 600);
        }
    });

    // Close suggestions when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.location-search-container')) {
            suggestionBox.style.display = 'none';
        }
    });

    // Add styles for hover
    const style = document.createElement('style');
    style.innerHTML = `
        .suggestion-item:hover { background: #f9f9f9 !important; }
        .suggestion-item:last-child { border-bottom: none; }
    `;
    document.head.appendChild(style);
}

function selectLocation(lat, lng, name) {
    const addressInput = document.getElementById('address');
    const suggestionBox = document.getElementById('location-suggestions');
    if (addressInput) addressInput.value = name;
    if (suggestionBox) suggestionBox.style.display = 'none';

    // Update global lat/lng if inputs exist
    const latInp = document.getElementById('lat');
    const lngInp = document.getElementById('lng');
    if (latInp) latInp.value = lat;
    if (lngInp) lngInp.value = lng;

    // Trigger fee update if defined (in checkout.html)
    if (typeof updateDeliveryFee === 'function') {
        updateDeliveryFee(lat, lng);
    }
}

async function applyPromoCode() {
    const input = document.getElementById('promoCodeInput');
    const msg = document.getElementById('promo-msg');
    const phone = document.getElementById('phone')?.value;
    const code = input.value.trim();
    
    if (!code && !phone) return;

    try {
        const res = await fetch('/api/validate-promo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, phone })
        });
        const data = await res.json();
        
        if (data.success) {
            APPLIED_DISCOUNT_PERCENT = data.discountPercent;
            APPLIED_PROMO_CODE = code ? code.toUpperCase() : 'LOYALTY';
            msg.innerText = data.message || `Success! ${data.discountPercent}% discount applied.`;
            msg.style.color = '#116940';
            msg.style.display = 'block';
            if (code) input.disabled = true;
            renderCartPage();
            showNotification('Reward Applied!', data.message || `You saved ${data.discountPercent}% on your order.`, 'success');
        } else if (code) {
            msg.innerText = data.message;
            msg.style.color = '#e7252d';
            msg.style.display = 'block';
            showNotification('Invalid Code', data.message, 'error');
        }
    } catch (e) {
        console.error(e);
    }
}



// Init
document.addEventListener('DOMContentLoaded', () => {
    updateCartMetadata();
    if (document.getElementById('menu-container')) renderMenu();
    if (document.getElementById('homepage-menu-container')) renderHomepageMenu();
    if (document.getElementById('cart-table-body')) renderCartPage();
    
    const checkoutForm = document.getElementById('checkout-form');
    if (checkoutForm) {
        // Prevent Enter key from submitting the form (Desktop)
        checkoutForm.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.target.tagName === 'INPUT') {
                e.preventDefault();
                return false;
            }
        });

        checkoutForm.addEventListener('submit', (e) => {
            e.preventDefault();
            submitOrder(e);
        });
    }

    // Initialize Location Search
    initializeLocationSearch();

    // Bottom Nav Active State
    const currentPath = window.location.pathname;
    const bottomNavItems = document.querySelectorAll('.mobile-bottom-nav .nav-item');
    bottomNavItems.forEach(item => {
        const href = item.getAttribute('href');
        if (currentPath.includes(href) || (currentPath === '/' && href === 'index.html')) {
            bottomNavItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
        }
    });

    // Payment method switch logic
    const paymentRadios = document.querySelectorAll('input[name="payment_method"]');
    paymentRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const stkNotice = document.getElementById('stk-notice');
            const tillNotice = document.getElementById('till-instructions');
            if (e.target.value === 'stk') {
                if(stkNotice) stkNotice.style.display = 'block';
                if(tillNotice) tillNotice.style.display = 'none';
            } else {
                if(stkNotice) stkNotice.style.display = 'none';
                if(tillNotice) tillNotice.style.display = 'block';
            }
        });
    });
});
