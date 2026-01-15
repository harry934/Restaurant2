let MENU_ITEMS = [];
let APPLIED_DISCOUNT_PERCENT = 0;
let APPLIED_PROMO_CODE = null;

const CATEGORY_ICONS = {
    'pizza': '<i class="fas fa-pizza-slice"></i>',
    'sides': '<i class="fas fa-hamburger"></i>',
    'drinks': '<i class="fas fa-wine-glass-alt"></i>',
    'dessert': '<i class="fas fa-ice-cream"></i>',
    'pasta': '<i class="fas fa-utensils"></i>',
    'all': '<i class="fas fa-th-large"></i>'
};

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
    const total = cart.reduce((sum, i) => sum + (i.price * i.quantity), 0);

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

function updateFloatingCartBar(count, total) {
    // Disabled per user request to reduce distraction
    let bar = document.querySelector('.floating-cart-bar');
    if (bar) bar.classList.remove('show');
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

// Helper to generate compact Glovo-style product card HTML
function generateProductCardHTML(item) {
    const isSoldOut = item.isAvailable === false;
    const opacity = isSoldOut ? '0.7' : '1';
    
    // Check if item is in cart
    const cart = getCart();
    const cartItem = cart.find(c => c.id === item.id);
    const quantity = cartItem ? cartItem.quantity : 0;
    
    return `
        <div class="col-lg-3 col-md-4 col-6 mb-4 menu-item-card" data-category="${item.category}" data-item-id="${item.id}" style="opacity: ${opacity};">
            <div class="glovo-card">
                ${isSoldOut ? `<span class="glovo-badge-sold">Sold Out</span>` : ''}
                ${item.tag ? `<span class="glovo-badge-tag">${item.tag}</span>` : ''}
                
                <div class="glovo-img-wrap">
                    <img src="${item.image}" alt="${item.name}" class="glovo-img">
                </div>
                
                <div class="glovo-body">
                    <h3 class="glovo-title">${item.name}</h3>
                    <div class="glovo-footer" id="footer-${item.id}">
                        <span class="glovo-price">KES ${item.price.toLocaleString()}</span>
                        ${isSoldOut ? `
                            <button class="glovo-add-btn disabled" disabled><i class="fas fa-plus"></i></button>
                        ` : (quantity > 0 ? `
                            <div class="glovo-qty-selector">
                                <button onclick="updateProductCardQty(${item.id}, -1); return false;"><i class="fas fa-minus"></i></button>
                                <span>${quantity}</span>
                                <button onclick="updateProductCardQty(${item.id}, 1); return false;"><i class="fas fa-plus"></i></button>
                            </div>
                        ` : `
                            <button class="glovo-add-btn" onclick="addToCart(${item.id}); return false;"><i class="fas fa-plus"></i></button>
                        `)}
                    </div>
                </div>
            </div>
        </div>
    `;
}

function updateProductCardQty(id, change) {
    if (change > 0) {
        addToCart(id);
    } else {
        // Find existing cart item to decrease
        let cart = getCart();
        const existing = cart.find(i => i.id === id);
        if (existing) {
            if (existing.quantity > 1) {
                existing.quantity--;
                saveCart(cart);
                renderCart();
                updateCartMetadata();
            } else {
                removeFromCart(id);
            }
        }
    }
    
    // Specifically update ONLY this footer to avoid full re-render
    const footer = document.getElementById(`footer-${id}`);
    const item = MENU_ITEMS.find(i => i.id === id);
    if (footer && item) {
        const cart = getCart();
        const cartItem = cart.find(c => c.id === id);
        const quantity = cartItem ? cartItem.quantity : 0;
        
        footer.innerHTML = `
            <span class="glovo-price">KES ${item.price.toLocaleString()}</span>
            ${quantity > 0 ? `
                <div class="glovo-qty-selector">
                    <button onclick="updateProductCardQty(${item.id}, -1); return false;"><i class="fas fa-minus"></i></button>
                    <span>${quantity}</span>
                    <button onclick="updateProductCardQty(${item.id}, 1); return false;"><i class="fas fa-plus"></i></button>
                </div>
            ` : `
                <button class="glovo-add-btn" onclick="addToCart(${item.id}); return false;"><i class="fas fa-plus"></i></button>
            `}
        `;
    }
}

function renderSkeleton() {
    return Array(8).fill(0).map(() => `
        <div class="col-lg-3 col-md-4 col-6 mb-4">
            <div class="glovo-card skeleton">
                <div class="glovo-img-wrap skeleton-box" style="height: 140px;"></div>
                <div class="glovo-body">
                    <div class="skeleton-box" style="width: 80%; height: 15px; margin-bottom: 10px;"></div>
                    <div class="glovo-footer">
                        <div class="skeleton-box" style="width: 40%; height: 20px;"></div>
                        <div class="skeleton-box" style="width: 30px; height: 30px; border-radius: 50%;"></div>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// RENDER MENU (shop.html)
async function renderMenu(filter = 'all') {
    const container = document.getElementById('menu-container');
    if (!container) return;

    injectPremiumStyles();
    
    // Show skeletons if no data yet
    if (MENU_ITEMS.length === 0) {
        container.innerHTML = renderSkeleton();
        await loadMenuData();
    }
    
    currentFilter = filter;
    const searchEl = document.getElementById('shopSearch');
    const searchTerm = (searchEl?.value || '').toLowerCase();
    
    let items = MENU_ITEMS;
    if (filter !== 'all') {
        items = items.filter(i => i.category === filter);
    }
    if (searchTerm) {
        items = items.filter(i => i.name.toLowerCase().includes(searchTerm));
    }

    container.innerHTML = '';
    if (items.length === 0) {
        container.innerHTML = '<div class="col-12 text-center py-5"><h3 class="text-muted">No items found matching your search.</h3></div>';
        return;
    }

    if (filter === 'all' && !searchTerm) {
        const grouped = items.reduce((acc, item) => {
            if (!acc[item.category]) acc[item.category] = [];
            acc[item.category].push(item);
            return acc;
        }, {});

        const settingsRes = await fetch('/api/settings');
        const settings = await settingsRes.json();
        const categoryMap = (settings.menuCategories || []).reduce((acc, cat) => {
            acc[cat.id] = cat.name;
            return acc;
        }, {});

        for (const catId in grouped) {
            const catName = categoryMap[catId] || catId.toUpperCase();
            container.innerHTML += `
                <div class="col-12 category-header-glovo" id="section-${catId}">
                    <h2>${catName}</h2>
                </div>
            `;
            container.innerHTML += grouped[catId].map(item => generateProductCardHTML(item)).join('');
        }
    } else {
        container.innerHTML = items.map(item => generateProductCardHTML(item)).join('');
    }
    
    setupFilters();
    initScrollspy();
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
    if (document.getElementById('glovo-styles')) return;
    const style = document.createElement('style');
    style.id = 'glovo-styles';
    style.innerHTML = `
        :root {
            --glovo-red: #e7252d;
            --glovo-yellow: #ffc244;
            --glovo-green: #00a082;
            --glovo-text: #333;
            --glovo-light-text: #888;
            --glovo-bg: #f5f5f5;
        }

        /* Category Header - Glovo Style */
        .category-header-glovo {
            padding: 30px 0 15px;
            margin-bottom: 10px;
        }
        .category-header-glovo h2 {
            font-size: 1.5rem;
            font-weight: 800;
            color: var(--glovo-text);
            margin: 0;
        }

        /* Glovo Cards */
        .glovo-card {
            background: #fff;
            border-radius: 12px;
            overflow: hidden;
            border: 1px solid #f2f2f2;
            height: 100%;
            display: flex;
            flex-direction: column;
            transition: all 0.2s ease;
            cursor: pointer;
        }
        .glovo-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 8px 25px rgba(0,0,0,0.06);
            border-color: #eee;
        }

        .glovo-img-wrap {
            position: relative;
            padding-top: 75%; /* 4:3 Aspect Ratio */
            background: #fafafa;
        }
        .glovo-img {
            position: absolute;
            top: 0; left: 0; width: 100%; height: 100%;
            object-fit: cover;
            padding: 10px;
            transition: 0.3s;
        }
        .glovo-card:hover .glovo-img { transform: scale(1.05); }

        .glovo-badge-sold {
            position: absolute;
            top: 10px; right: 10px;
            background: rgba(0,0,0,0.6);
            color: #fff;
            font-size: 0.6rem;
            font-weight: 800;
            padding: 4px 8px;
            border-radius: 4px;
            z-index: 5;
            text-transform: uppercase;
        }
        .glovo-badge-tag {
            position: absolute;
            top: 10px; left: 10px;
            background: var(--glovo-red);
            color: #fff;
            font-size: 0.6rem;
            font-weight: 800;
            padding: 4px 8px;
            border-radius: 4px;
            z-index: 5;
            text-transform: uppercase;
        }

        .glovo-body {
            padding: 12px;
            flex-grow: 1;
            display: flex;
            flex-direction: column;
        }
        .glovo-title {
            font-size: 0.95rem;
            font-weight: 700;
            margin-bottom: 12px;
            color: var(--glovo-text);
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
            min-height: 2.4em;
        }

        .glovo-footer {
            margin-top: auto;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .glovo-price {
            font-weight: 800;
            font-size: 1rem;
            color: var(--glovo-text);
        }
        .glovo-add-btn {
            width: 32px; height: 32px;
            background: var(--glovo-red);
            color: #fff;
            border: none;
            border-radius: 50%;
            display: flex;
            align-items: center; justify-content: center;
            font-size: 12px;
            transition: 0.2s;
            box-shadow: 0 4px 10px rgba(231, 37, 45, 0.2);
        }
        .glovo-add-btn:hover { background: #c11b17; transform: scale(1.15); }
        .glovo-add-btn.disabled { background: #ddd; box-shadow: none; cursor: not-allowed; }

        /* Quantity Selector */
        .glovo-qty-selector {
            display: flex;
            align-items: center;
            gap: 12px;
            background: #fff;
            border: 1px solid #eee;
            border-radius: 50px;
            padding: 3px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }
        .glovo-qty-selector button {
            width: 28px; height: 28px;
            border-radius: 50%;
            border: none;
            background: #f8f8f8;
            color: var(--glovo-text);
            display: flex;
            align-items: center; justify-content: center;
            font-size: 10px;
            transition: 0.2s;
        }
        .glovo-qty-selector button:hover { background: var(--glovo-red); color: #fff; }
        .glovo-qty-selector span {
            font-weight: 800;
            font-size: 0.9rem;
            min-width: 15px;
            text-align: center;
        }

        /* Horizontal Scroll Nav with Indicators */
        .pcnc-filter-wrap {
            position: relative;
            overflow: hidden;
            background: #fff;
        }
        .pcnc-filter-wrap::after {
            content: '';
            position: absolute;
            top: 0; right: 0;
            width: 50px; height: 100%;
            background: linear-gradient(to right, transparent, rgba(255,255,255,0.9));
            pointer-events: none;
            z-index: 2;
        }
        .pcnc-filter-list {
            display: flex !important;
            overflow-x: auto;
            white-space: nowrap;
            padding: 10px 20px !important;
            gap: 15px !important;
            -ms-overflow-style: none;
            scrollbar-width: none;
            scroll-behavior: smooth;
            padding-right: 60px !important; /* Space for fade indicator */
        }
        .pcnc-filter-list::-webkit-scrollbar { display: none; }

        .filter-btn {
            display: flex !important;
            align-items: center;
            gap: 8px;
            flex: 0 0 auto;
            padding: 10px 22px !important;
            font-size: 0.9rem !important;
            border-radius: 30px !important;
            border: 1px solid #f0f0f0 !important;
            background: #fff !important;
            color: var(--glovo-text) !important;
            font-weight: 700 !important;
            box-shadow: 0 2px 8px rgba(0,0,0,0.02) !important;
        }
        .filter-btn i {
            font-size: 1.1rem;
            color: var(--glovo-red);
            opacity: 0.8;
        }
        .filter-btn.active-filter {
            background: var(--glovo-red) !important;
            color: #fff !important;
            border-color: var(--glovo-red) !important;
        }
        .filter-btn.active-filter i {
            color: #fff;
            opacity: 1;
        }

        /* PREMIUM CART STYLES */
        .glovo-cart-list {
            display: flex;
            flex-direction: column;
            gap: 20px;
            margin-bottom: 40px;
        }
        .premium-cart-card {
            background: #fff;
            border-radius: 16px;
            padding: 20px;
            display: flex;
            align-items: center;
            gap: 20px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.04);
            border: 1px solid #f2f2f2;
            transition: 0.3s;
        }
        .premium-cart-card:hover { transform: translateY(-3px); box-shadow: 0 8px 25px rgba(0,0,0,0.08); }
        .cart-img-wrap {
            width: 100px; height: 100px;
            border-radius: 12px;
            overflow: hidden;
            flex-shrink: 0;
            background: #f9f9f9;
        }
        .cart-img-wrap img { width: 100%; height: 100%; object-fit: cover; }
        .cart-info { flex-grow: 1; }
        .cart-item-title { font-size: 1.1rem; font-weight: 800; color: var(--glovo-text); margin-bottom: 5px; }
        .cart-item-price { font-size: 0.95rem; font-weight: 700; color: var(--glovo-red); }
        .cart-actions { display: flex; align-items: center; gap: 20px; }
        .premium-qty-select {
            display: flex;
            align-items: center;
            gap: 15px;
            background: #f8f8f8;
            border-radius: 50px;
            padding: 5px 15px;
        }
        .premium-qty-select button {
            border: none; background: none; color: var(--glovo-red);
            font-weight: 900; cursor: pointer; padding: 5px;
        }
        .remove-icon { color: #ccc; cursor: pointer; font-size: 1.2rem; transition: 0.2s; }
        .remove-icon:hover { color: var(--glovo-red); }

        .premium-summary-card {
            background: #fff;
            border-radius: 20px;
            padding: 30px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.06);
            border: 1px solid #f0f0f0;
            position: sticky;
            top: 120px;
        }
        .summary-title { font-size: 1.4rem; font-weight: 900; margin-bottom: 25px; color: var(--glovo-text); }
        .summary-row { display: flex; justify-content: space-between; margin-bottom: 15px; font-weight: 600; color: #666; }
        .total-row { color: var(--glovo-text); font-weight: 900; font-size: 1.3rem; margin-top: 15px; }
        .glovo-checkout-btn {
            background: var(--glovo-red) !important;
            border: none !important;
            color: #fff !important;
            padding: 15px !important;
            border-radius: 50px !important;
            font-weight: 800 !important;
            text-transform: uppercase !important;
            letter-spacing: 1px !important;
            transition: 0.3s !important;
        }
        .glovo-checkout-btn:hover { transform: translateY(-3px); box-shadow: 0 8px 20px rgba(231, 37, 45, 0.3); }

        /* Skeleton Loading */
        .skeleton-box {
            background: linear-gradient(90deg, #f2f2f2 25%, #e6e6e6 50%, #f2f2f2 75%);
            background-size: 200% 100%;
            animation: skeleton-loading 1.5s infinite;
        }
        @keyframes skeleton-loading {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
        }

        /* Floating Cart Summary */
        .floating-cart-bar {
            position: fixed;
            bottom: 80px; /* Above mobile bottom nav */
            left: 20px; right: 20px;
            background: var(--pcnc-dark);
            color: #fff;
            padding: 15px 25px;
            border-radius: 100px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            z-index: 1000;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            transform: translateY(150%);
            transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            max-width: 500px;
            margin: 0 auto;
        }
        .floating-cart-bar.show { transform: translateY(0); }
        .floating-cart-total { font-weight: 800; font-size: 1.1rem; }
        .floating-checkout-btn {
            background: var(--glovo-red);
            color: #fff;
            border: none;
            padding: 8px 18px;
            border-radius: 50px;
            font-weight: 800;
            font-size: 0.85rem;
            display: flex;
            align-items: center;
            gap: 10px;
        }
    `;
    document.head.appendChild(style);
}

function setupFilters() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    if (!filterBtns.length) return;

    filterBtns.forEach(btn => {
        const filterVal = btn.getAttribute('data-filter');
        
        // Initial state sync
        if (filterVal === currentFilter) {
            btn.classList.add('active-filter');
        } else {
            btn.classList.remove('active-filter');
        }

        btn.onclick = (e) => {
            const searchTerm = document.getElementById('shopSearch')?.value;
            
            if (currentFilter === 'all' && filterVal !== 'all' && !searchTerm) {
                // Smooth scroll to section
                const target = document.getElementById(`section-${filterVal}`);
                if (target) {
                    const offset = 160; 
                    const bodyRect = document.body.getBoundingClientRect().top;
                    const elementRect = target.getBoundingClientRect().top;
                    const elementPosition = elementRect - bodyRect;
                    window.scrollTo({ top: elementPosition - offset, behavior: 'smooth' });
                    return;
                }
            }
            
            // Re-render if switching view modes
            renderMenu(filterVal);
            
            // Center the clicked button in horizontal nav
            btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        };
    });
}

function initScrollspy() {
    if (currentFilter !== 'all' || document.getElementById('shopSearch')?.value) return;

    const sections = document.querySelectorAll('.category-header-glovo');
    const filterBtns = document.querySelectorAll('.filter-btn');
    
    window.onscroll = () => {
        let currentSectionId = '';
        sections.forEach(sec => {
            const top = sec.offsetTop - 200;
            if (window.pageYOffset >= top) {
                currentSectionId = sec.id.replace('section-', '');
            }
        });

        if (currentSectionId) {
            filterBtns.forEach(btn => {
                const bVal = btn.getAttribute('data-filter');
                if (bVal === currentSectionId) {
                    btn.classList.add('active-filter');
                    // Scroll nav into view
                    btn.parentNode.scrollTo({
                        left: btn.offsetLeft - (btn.parentNode.offsetWidth / 2) + (btn.offsetWidth / 2),
                        behavior: 'smooth'
                    });
                } else {
                    btn.classList.remove('active-filter');
                }
            });
        }
    };
}

// RENDER CART (cart.html) & CHECKOUT (checkout.html)
function renderCartPage() {
    const listContainer = document.getElementById('cart-item-list');
    const tbody = document.getElementById('cart-table-body');
    const totalEl = document.getElementById('cart-total');
    const subtotalEl = document.getElementById('subtotal');
    
    if (!listContainer && !tbody) return;

    injectPremiumStyles();

    const cart = getCart();
    if (cart.length === 0) {
        if (listContainer) listContainer.innerHTML = '<div class="text-center py-5"><h3 class="text-muted">Your cart is empty</h3><a href="shop.html" class="boxed-btn mt-3">Go to Menu</a></div>';
        if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="text-center">Your cart is empty</td></tr>';
        if (totalEl) totalEl.innerText = 'KES 0';
        if (subtotalEl) subtotalEl.innerText = 'KES 0';
        return;
    }

    const isCheckout = window.location.pathname.includes('checkout.html');
    let total = 0;

    if (isCheckout) {
        // ... (Checkout logic as is, it's already reasonably clean)
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
    } else if (listContainer) {
        // PREMIUM CART (cart.html)
        listContainer.innerHTML = cart.map(item => {
            const itemTotal = item.price * item.quantity;
            total += itemTotal;
            return `
            <div class="premium-cart-card">
                <div class="cart-img-wrap">
                    <img src="${item.image}" alt="${item.name}">
                </div>
                <div class="cart-info">
                    <h4 class="cart-item-title">${item.name}</h4>
                    <div class="cart-item-price">KES ${item.price.toLocaleString()} each</div>
                </div>
                <div class="cart-actions">
                    <div class="premium-qty-select">
                        <button onclick="updateQuantity(${item.id}, -1)"><i class="fas fa-minus"></i></button>
                        <span>${item.quantity}</span>
                        <button onclick="updateQuantity(${item.id}, 1)"><i class="fas fa-plus"></i></button>
                    </div>
                    <div class="total-col font-weight-bold" style="min-width: 100px; text-align: right;">KES ${itemTotal.toLocaleString()}</div>
                    <i class="fas fa-trash-alt remove-icon ml-3" onclick="removeFromCart(${item.id})"></i>
                </div>
            </div>
            `;
        }).join('');
    }

    // Handle Summary Section
    if (subtotalEl) subtotalEl.innerText = 'KES ' + total.toLocaleString();

    // Handle Discount
    if (APPLIED_DISCOUNT_PERCENT > 0) {
        const discountAmount = Math.round(total * (APPLIED_DISCOUNT_PERCENT / 100));
        const discRow = document.getElementById('discount-row');
        const discAmtEl = document.getElementById('discount-amount');
        if (discRow) discRow.style.display = 'flex';
        if (discAmtEl) discAmtEl.innerText = `-KES ${discountAmount.toLocaleString()}`;
        total -= discountAmount;
    } else {
        const discRow = document.getElementById('discount-row');
        if (discRow) discRow.style.display = 'none';
    }

    if (totalEl) totalEl.innerText = 'KES ' + total.toLocaleString();
    
    // Add Delivery Fee if present
    const deliveryFeeEl = document.getElementById('delivery_fee_hidden');
    if (deliveryFeeEl && parseInt(deliveryFeeEl.value) > 0) {
        const fee = parseInt(deliveryFeeEl.value);
        total += fee;
        if (totalEl) totalEl.innerText = 'KES ' + total.toLocaleString();
    }
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
