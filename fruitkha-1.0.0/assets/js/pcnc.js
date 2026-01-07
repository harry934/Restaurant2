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
    const opacity = isSoldOut ? '0.6' : '1';
    const grayscale = isSoldOut ? 'grayscale(1)' : 'none';
    
    return `
        <div class="col-lg-4 col-md-6 mb-5" style="opacity: ${opacity}; pointer-events: ${isSoldOut ? 'none' : 'auto'};">
            <div class="single-product-item premium-card" style="border: none; box-shadow: 0 10px 40px rgba(0,0,0,0.05); border-radius: 20px; padding: 25px; transition: all 0.4s ease; background: #fff; position: relative; overflow: hidden;">
                ${isSoldOut ? `<span style="position: absolute; top: 15px; right: 15px; background: #333; color: #fff; padding: 5px 12px; border-radius: 50px; font-size: 0.7rem; font-weight: 800; z-index: 3; text-transform: uppercase;">Sold Out</span>` : ''}
                ${item.tag ? `<span style="position: absolute; top: 15px; left: 15px; background: #e7252d; color: #fff; padding: 5px 12px; border-radius: 50px; font-size: 0.7rem; font-weight: 800; z-index: 2; text-transform: uppercase;">${item.tag}</span>` : ''}
                
                <div class="product-image text-center mb-4" style="border-radius: 15px; overflow: hidden; background: #f9f9f9; padding: 20px;">
                    <a href="#"><img src="${item.image}" alt="${item.name}" style="height: 180px; width: auto; object-fit: contain; transition: transform 0.5s ease; filter: ${grayscale};" class="product-img-hover"></a>
                </div>
                
                <div style="text-align: left;">
                    <h3 style="font-size: 1.3rem; font-weight: 800; color: #1a1a1a; margin-bottom: 5px;">${item.name}</h3>
                    <p style="color: #777; font-size: 0.85rem; margin-bottom: 20px;">Deliciously crafted with signature PCnC spices and fresh crust.</p>
                    
                    <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #f0f0f0; padding-top: 15px;">
                        <div>
                            <span style="display: block; font-size: 0.75rem; color: #aaa; text-transform: uppercase; font-weight: 700;">Price</span>
                            <span style="font-size: 1.4rem; font-weight: 900; color: #e7252d;">KES ${item.price.toLocaleString()}</span>
                        </div>
                        ${isSoldOut ? `
                            <button class="btn btn-sm btn-secondary disabled" style="border-radius: 12px; font-weight: 700;">SOLD OUT</button>
                        ` : `
                            <a href="#" onclick="addToCart(${item.id}); return false;" class="cart-btn" style="background: #1a1a1a; color: #fff; width: 45px; height: 45px; border-radius: 12px; display: flex; align-items: center; justify-content: center; transition: 0.3s; font-size: 1.1rem;">
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
    
    let items = filter === 'all' ? MENU_ITEMS : MENU_ITEMS.filter(i => i.category === filter);
    
    if (searchTerm) {
        items = items.filter(i => i.name.toLowerCase().includes(searchTerm));
    }

    container.innerHTML = items.length > 0 
        ? items.map(item => generateProductCardHTML(item)).join('')
        : '<div class="col-12 text-center py-5"><h3 class="text-muted">No items found matching your search.</h3></div>';
    
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
        .premium-card:hover { 
            transform: translateY(-10px); 
            box-shadow: 0 20px 50px rgba(0,0,0,0.12) !important; 
        }
        .premium-card:hover .product-img-hover { 
            transform: scale(1.1); 
        }
        .cart-btn:hover { 
            background: #e7252d !important; 
            transform: scale(1.1); 
        }
        .filter-btn:hover {
            transform: scale(1.05);
            box-shadow: 0 5px 15px rgba(0,0,0,0.05);
        }
        .filter-btn {
            transition: all 0.3s ease !important;
        }
        .premium-card {
            background: #fff;
            transition: all 0.4s ease;
        }
    `;
    document.head.appendChild(style);
}

function setupFilters() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.onclick = () => {
            filterBtns.forEach(b => {
                b.style.background = 'transparent';
                b.style.color = '#333';
                b.style.borderColor = '#eee';
            });
            btn.style.background = '#e7252d';
            btn.style.color = '#fff';
            btn.style.borderColor = '#e7252d';
            renderMenu(btn.getAttribute('data-filter'));
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
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 15px 0;">
                    <div style="font-weight: 600; color: #333; margin-bottom: 5px;">${item.name}</div>
                    <div class="quantity-controls" style="display: flex; align-items: center; gap: 10px;">
                        <button onclick="updateQuantity(${item.id}, -1)" style="width: 25px; height: 25px; border-radius: 50%; border: 1px solid #e7252d; background: #fff; color: #e7252d; display: flex; align-items: center; justify-content: center; cursor: pointer; font-weight: bold; transition: 0.3s; font-size: 14px;">-</button>
                        <span style="font-weight: 700; min-width: 20px; text-align: center;">${item.quantity}</span>
                        <button onclick="updateQuantity(${item.id}, 1)" style="width: 25px; height: 25px; border-radius: 50%; border: 1px solid #e7252d; background: #e7252d; color: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; font-weight: bold; transition: 0.3s; font-size: 14px;">+</button>
                    </div>
                </td>
                <td style="padding: 15px 0; text-align: right; vertical-align: middle; font-weight: 600; color: #333;">KES ${itemTotal.toLocaleString()}</td>
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

    const customerName = document.getElementById('name').value;
    const phoneNumber = document.getElementById('phone').value;
    const location = document.getElementById('address').value;
    const notes = document.getElementById('order-notes').value;
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
        checkoutForm.addEventListener('submit', (e) => {
            e.preventDefault();
            submitOrder();
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
