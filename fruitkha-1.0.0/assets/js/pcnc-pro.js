let MENU_ITEMS = [];
let APPLIED_DISCOUNT_PERCENT = 0;
let APPLIED_PROMO_CODE = null;

const CATEGORY_ICONS = {
  pizza: '<i class="fas fa-pizza-slice"></i>',
  sides: '<i class="fas fa-hamburger"></i>',
  drinks: '<i class="fas fa-glass-whiskey"></i>',
  dessert: '<i class="fas fa-ice-cream"></i>',
  pasta: '<i class="fas fa-utensils"></i>',
  meals: '<i class="fas fa-drumstick-bite"></i>',
  chicken: '<i class="fas fa-drumstick-bite"></i>',
  'rice/ugali': '<i class="fas fa-bowl-rice"></i>',
  rice: '<i class="fas fa-bowl-rice"></i>',
  ugali: '<i class="fas fa-bowl-rice"></i>',
  burgers: '<i class="fas fa-burger"></i>',
  all: '<i class="fas fa-th-large"></i>',
};

async function loadMenuData() {
  try {
    const res = await fetch("/api/menu");
    MENU_ITEMS = await res.json();
    return MENU_ITEMS;
  } catch (e) {
    console.error("Failed to load menu", e);
    return [];
  }
}

let currentFilter = "all";

// Notification System - Minimalist & Snappy
function showNotification(title, message, type = "success") {
  injectNotificationStyles();

  let container = document.querySelector(".pcnc-toast-container");
  if (!container) {
    container = document.createElement("div");
    container.className = "pcnc-toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `pcnc-toast-compact ${type}`;

  let icon = "fa-check-circle";
  if (type === "error") icon = "fa-times-circle";
  if (type === "info") icon = "fa-info-circle";
  if (type === "warning") icon = "fa-exclamation-triangle";

  toast.innerHTML = `
        <div class="toast-icon">
            <i class="fas ${icon}"></i>
        </div>
        <div class="toast-body">
            <div class="toast-title">${title}</div>
            <div class="toast-msg">${message}</div>
        </div>
        <button class="toast-close-btn" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;

  container.appendChild(toast);

  // Auto remove after 3 seconds
  setTimeout(() => {
    toast.classList.add("fade-out");
    setTimeout(() => {
      if (toast.parentElement) toast.remove();
    }, 200);
  }, 3000);
}

function injectNotificationStyles() {
  if (document.getElementById("pcnc-compact-notify-styles")) return;
  const style = document.createElement("style");
  style.id = "pcnc-compact-notify-styles";
  style.innerHTML = `
        .pcnc-toast-container {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 999999;
            display: flex;
            flex-direction: column;
            gap: 10px;
            pointer-events: none;
        }
        .pcnc-toast-compact {
            background: #fff;
            color: #333;
            width: 280px;
            border-radius: 10px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.08);
            display: flex;
            align-items: center;
            padding: 12px 15px;
            pointer-events: auto;
            border: 1px solid #eee;
            animation: snappyIn 0.25s ease-out forwards;
            font-family: 'Poppins', -apple-system, system-ui, sans-serif;
            position: relative;
        }
        .pcnc-toast-compact.fade-out {
            animation: snappyOut 0.2s ease-in forwards;
        }
        .toast-icon {
            font-size: 1.1rem;
            margin-right: 12px;
            flex-shrink: 0;
            width: 32px; height: 32px;
            display: flex; align-items: center; justify-content: center;
            border-radius: 50%;
        }
        .pcnc-toast-compact.success .toast-icon { color: #2ecc71; background: #eafaf1; }
        .pcnc-toast-compact.error .toast-icon { color: #e74c3c; background: #fdf2f2; }
        .pcnc-toast-compact.warning .toast-icon { color: #f39c12; background: #fef9e7; }
        .pcnc-toast-compact.info .toast-icon { color: #3498db; background: #ebf5fb; }

        .toast-body { flex-grow: 1; }
        .toast-title {
            font-weight: 800;
            font-size: 0.85rem;
            color: #111;
            line-height: 1.2;
        }
        .toast-msg {
            font-size: 0.75rem;
            color: #777;
            font-weight: 500;
        }
        .toast-close-btn {
            background: none; border: none;
            color: #ccc;
            cursor: pointer;
            padding: 2px;
            font-size: 0.9rem;
            transition: 0.2s;
            margin-left: 5px;
        }
        .toast-close-btn:hover { color: #999; }

        @keyframes snappyIn {
            from { opacity: 0; transform: translateX(20px) scale(0.95); }
            to { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes snappyOut {
            from { opacity: 1; transform: translateX(0) scale(1); }
            to { opacity: 0; transform: translateX(20px) scale(0.95); }
        }

        @media (max-width: 576px) {
            .pcnc-toast-container {
                top: 15px; right: 15px; left: 15px;
            }
            .pcnc-toast-compact {
                width: 100%;
            }
        }
    `;
  document.head.appendChild(style);
}

// CART LOGIC
function getCart() {
  return JSON.parse(localStorage.getItem("pcnc_cart")) || [];
}

function saveCart(cart) {
  localStorage.setItem("pcnc_cart", JSON.stringify(cart));
  updateCartMetadata();
}

function addToCart(id) {
  const cart = getCart();
  const item = MENU_ITEMS.find((i) => i.id === id);
  if (!item) return;

  const existing = cart.find((i) => i.id === id);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ ...item, quantity: 1 });
  }
  saveCart(cart);
  showNotification(
    "Added!",
    item.name + " has been added to your cart.",
    "success",
  );

  // Force immediate re-render to show quantity selector
  setTimeout(() => {
    if (window.location.pathname.includes("shop.html")) {
      renderMenu(currentFilter);
    }
  }, 100);
}

function updateCartMetadata() {
  const cart = getCart();
  const count = cart.reduce((sum, i) => sum + i.quantity, 0);
  const total = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);

  // Update top header badges
  const badges = document.querySelectorAll(".pcnc-header-badge");
  badges.forEach((b) => {
    b.innerText = count;
    b.style.display = count > 0 ? "flex" : "none";
  });

  // Update bottom nav cart count
  const bottomNavCount = document.querySelector(
    ".mobile-bottom-nav .cart-count",
  );
  if (bottomNavCount) {
    bottomNavCount.innerText = count;
    bottomNavCount.style.display = count > 0 ? "block" : "none";
  }

  // Update any other .cart-count elements
  const genericCounts = document.querySelectorAll(
    ".cart-count:not(.mobile-bottom-nav .cart-count)",
  );
  genericCounts.forEach((gc) => (gc.innerText = count));
}

function updateFloatingCartBar(count, total) {
  // Disabled per user request to reduce distraction
  let bar = document.querySelector(".floating-cart-bar");
  if (bar) bar.classList.remove("show");
}

function removeFromCart(id) {
  let cart = getCart();
  cart = cart.filter((i) => i.id !== id);
  saveCart(cart);
  if (
    window.location.pathname.includes("cart.html") ||
    window.location.pathname.includes("checkout.html")
  ) {
    renderCartPage();
  } else if (window.location.pathname.includes("shop.html")) {
    renderMenu(currentFilter);
  }
}

function updateQuantity(id, delta) {
  let cart = getCart();
  const item = cart.find((i) => i.id === id);
  if (item) {
    item.quantity += delta;
    if (item.quantity <= 0) {
      removeFromCart(id);
      return;
    }
    saveCart(cart);
    if (
      window.location.pathname.includes("cart.html") ||
      window.location.pathname.includes("checkout.html")
    ) {
      renderCartPage();
    }
  }
}

// Helper to generate horizontal list-style product card HTML
function generateProductCardHTML(item) {
  const isSoldOut = item.isAvailable === false;
  const opacity = isSoldOut ? "0.6" : "1";

  // Check if item is in cart
  const cart = getCart();
  const cartItem = cart.find((c) => c.id === item.id);
  const quantity = cartItem ? cartItem.quantity : 0;

  return `
        <div class="col-12 menu-item-card" data-category="${item.category}" data-item-id="${item.id}" style="opacity: ${opacity}; margin-bottom: 12px; padding: 0;">
            <div class="horizontal-food-card" onclick="toggleCardExpansion(${item.id}, event)">
                <div class="food-image-container">
                    <img src="${item.image}" alt="${item.name}" class="food-image">
                    ${isSoldOut ? `<span class="sold-out-badge">Sold Out</span>` : ""}
                </div>
                
                <div class="food-details">
                    <div class="title-row">
                        <h3 class="food-title">${item.name}</h3>
                        ${item.tag && !isSoldOut ? `<span class="discount-tag">${item.tag}</span>` : ""}
                    </div>
                    <p class="food-description">${item.description || "Delicious and freshly prepared"}</p>
                </div>
                
                <div class="food-pricing" onclick="event.stopPropagation()">
                    <div class="price-block">
                        <span class="current-price">KSh${item.price.toLocaleString()}</span>
                    </div>
                    ${
                      isSoldOut
                        ? `
                        <button class="add-item-btn disabled" disabled>
                            <i class="fas fa-plus"></i>
                        </button>
                    `
                        : quantity > 0
                          ? `
                        <div class="horizontal-qty-control">
                            <button onclick="updateProductCardQty(${item.id}, -1, event); return false;" class="qty-btn">
                                <i class="fas fa-minus"></i>
                            </button>
                            <span class="qty-display">${quantity}</span>
                            <button onclick="updateProductCardQty(${item.id}, 1, event); return false;" class="qty-btn">
                                <i class="fas fa-plus"></i>
                            </button>
                        </div>
                    `
                          : `
                        <button class="add-item-btn" onclick="addToCart(${item.id}); return false;">
                            <i class="fas fa-plus"></i>
                        </button>
                    `
                    }
                </div>
            </div>
        </div>
    `;
}

function updateProductCardQty(id, change, event) {
  // Prevent page scroll/jump
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  
  if (change > 0) {
    addToCart(id);
  } else {
    // Find existing cart item to decrease
    let cart = getCart();
    const existing = cart.find((i) => i.id === id);
    if (existing) {
      if (existing.quantity > 1) {
        existing.quantity--;
        saveCart(cart);
        updateCartMetadata();
      } else {
        removeFromCart(id);
        return;
      }
    }
  }

  // Force re-render to show updated quantity
  setTimeout(() => {
    if (window.location.pathname.includes("shop.html")) {
      renderMenu(currentFilter);
    }
  }, 100);
}

// Toggle card expansion to show full text
function toggleCardExpansion(id, event) {
  // Don't expand if clicking on buttons
  if (event && (event.target.closest('.food-pricing') || event.target.closest('button'))) {
    return;
  }
  
  const card = document.querySelector(`[data-item-id="${id}"] .horizontal-food-card`);
  if (!card) return;
  
  const isExpanded = card.classList.contains('expanded');
  
  // Remove expanded class from all cards
  document.querySelectorAll('.horizontal-food-card.expanded').forEach(c => {
    c.classList.remove('expanded');
  });
  
  // Toggle current card
  if (!isExpanded) {
    card.classList.add('expanded');
  }
}

function renderSkeleton() {
  return Array(8)
    .fill(0)
    .map(
      () => `
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
    `,
    )
    .join("");
}

// RENDER MENU (shop.html)
async function renderMenu(filter = "all") {
  const container = document.getElementById("menu-container");
  if (!container) return;

  injectPremiumStyles();

  // Show skeletons if no data yet
  if (MENU_ITEMS.length === 0) {
    container.innerHTML = renderSkeleton();
    await loadMenuData();
  }

  currentFilter = filter;
  const searchEl = document.getElementById("shopSearch");
  const searchTerm = (searchEl?.value || "").toLowerCase();

  let items = MENU_ITEMS;
  if (filter !== "all") {
    items = items.filter((i) => i.category === filter);
  }
  if (searchTerm) {
    items = items.filter((i) => i.name.toLowerCase().includes(searchTerm));
  }

  container.innerHTML = "";
  if (items.length === 0) {
    container.innerHTML =
      '<div class="col-12 text-center py-5"><h3 class="text-muted">No items found matching your search.</h3></div>';
    return;
  }

  if (filter === "all" && !searchTerm) {
    const grouped = items.reduce((acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    }, {});

    const settingsRes = await fetch("/api/settings");
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
      container.innerHTML += grouped[catId]
        .map((item) => generateProductCardHTML(item))
        .join("");
    }
  } else {
    container.innerHTML = items
      .map((item) => generateProductCardHTML(item))
      .join("");
  }

  setupFilters();
  initScrollspy();
}

// RENDER HOMEPAGE MENU (index.html)
async function renderHomepageMenu() {
  const container = document.getElementById("homepage-menu-container");
  if (!container) return;

  if (MENU_ITEMS.length === 0) await loadMenuData();

  injectPremiumStyles();

  // Show top 3 featured/bestseller items
  const sampleItems = MENU_ITEMS.slice(0, 3);
  container.innerHTML = sampleItems
    .map((item) => generateProductCardHTML(item))
    .join("");
}

function injectPremiumStyles() {
  if (document.getElementById("glovo-styles")) return;
  const style = document.createElement("style");
  style.id = "glovo-styles";
  style.innerHTML = `
        :root {
            --glovo-red: #e7252d;
            --glovo-yellow: #ffc244;
            --glovo-green: #00a082;
            --glovo-text: #333;
            --glovo-light-text: #888;
            --glovo-bg: #f5f5f5;
        }

        /* Category Header - Enhanced */
        .category-header-glovo {
            padding: 35px 0 20px;
            margin-bottom: 15px;
            border-bottom: 3px solid #f5f5f5;
        }
        .category-header-glovo h2 {
            font-size: 1.6rem;
            font-weight: 900;
            color: #1a1a1a;
            margin: 0;
            position: relative;
            padding-left: 15px;
        }
        .category-header-glovo h2::before {
            content: '';
            position: absolute;
            left: 0;
            top: 50%;
            transform: translateY(-50%);
            width: 5px;
            height: 30px;
            background: var(--glovo-red);
            border-radius: 3px;
        }

        /* Glovo Cards - Professional Redesign */
        .glovo-card {
            background: #fff;
            border-radius: 14px;
            overflow: hidden;
            border: 1.5px solid #e8e8e8;
            height: 100%;
            display: flex;
            flex-direction: column;
            transition: all 0.25s ease;
            cursor: pointer;
            box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        }
        .glovo-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(0,0,0,0.08);
            border-color: #d0d0d0;
        }

        .glovo-img-wrap {
            position: relative;
            padding-top: 70%;
            background: linear-gradient(135deg, #f9f9f9 0%, #ffffff 100%);
            border-bottom: 1px solid #f0f0f0;
        }
        .glovo-img {
            position: absolute;
            top: 0; left: 0; width: 100%; height: 100%;
            object-fit: cover;
            padding: 15px;
            transition: 0.3s;
        }
        .glovo-card:hover .glovo-img { transform: scale(1.05); }

        .glovo-badge-sold {
            position: absolute;
            top: 12px; right: 12px;
            background: rgba(0,0,0,0.85);
            color: #fff;
            font-size: 0.7rem;
            font-weight: 900;
            padding: 6px 12px;
            border-radius: 8px;
            z-index: 5;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }
        .glovo-badge-tag {
            position: absolute;
            top: 12px; left: 12px;
            background: linear-gradient(135deg, #e7252d 0%, #c11b17 100%);
            color: #fff;
            font-size: 0.7rem;
            font-weight: 900;
            padding: 6px 12px;
            border-radius: 8px;
            z-index: 5;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            box-shadow: 0 2px 8px rgba(231, 37, 45, 0.3);
        }

        .glovo-body {
            padding: 20px;
            flex-grow: 1;
            display: flex;
            flex-direction: column;
            background: #fff;
        }
        .glovo-title {
            font-size: 1.3rem;
            font-weight: 900;
            margin-bottom: 12px;
            color: #000;
            line-height: 1.4;
            display: block;
            text-align: left;
            min-height: auto;
            letter-spacing: -0.3px;
        }

        .glovo-footer {
            margin-top: auto;
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 10px;
            padding-top: 12px;
            border-top: 1px solid #f5f5f5;
        }
        .glovo-price {
            font-weight: 900;
            font-size: 1.15rem;
            color: #000;
            letter-spacing: -0.5px;
        }
        .glovo-add-btn {
            width: 38px; height: 38px;
            background: linear-gradient(135deg, #e7252d 0%, #c11b17 100%);
            color: #fff;
            border: none;
            border-radius: 10px;
            display: flex;
            align-items: center; justify-content: center;
            font-size: 15px;
            font-weight: 900;
            transition: 0.2s;
            box-shadow: 0 3px 10px rgba(231, 37, 45, 0.25);
            flex-shrink: 0;
        }
        .glovo-add-btn:hover { background: linear-gradient(135deg, #c11b17 0%, #a01512 100%); transform: scale(1.05); box-shadow: 0 5px 15px rgba(231, 37, 45, 0.4); }
        .glovo-add-btn.disabled { background: #ddd; box-shadow: none; cursor: not-allowed; }

        /* Quantity Selector */
        .glovo-qty-selector {
            display: flex;
            align-items: center;
            gap: 8px;
            background: #fff;
            border: 2px solid #000;
            border-radius: 10px;
            padding: 4px 10px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }
        .glovo-qty-selector button {
            width: 28px; height: 28px;
            border-radius: 8px;
            border: none;
            background: #f5f5f5;
            color: #000;
            display: flex;
            align-items: center; justify-content: center;
            font-size: 13px;
            font-weight: 900;
            transition: 0.2s;
        }
        .glovo-qty-selector button:hover { background: #000; color: #fff; }
        .glovo-qty-selector span {
            font-weight: 900;
            font-size: 1rem;
            min-width: 20px;
            text-align: center;
            color: #000;
        }

        /* HORIZONTAL FOOD CARD DESIGN */
        .horizontal-food-card {
            background: #fff;
            border-radius: 12px;
            padding: 12px;
            display: flex;
            align-items: center;
            gap: 12px;
            border: 1px solid #e8e8e8;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 2px 8px rgba(0,0,0,0.04);
            cursor: pointer;
        }
        .horizontal-food-card:hover {
            box-shadow: 0 4px 16px rgba(0,0,0,0.08);
            transform: translateY(-1px);
        }
        
        /* Expanded card state - smooth transitions */
        .horizontal-food-card.expanded {
            background: #f9f9f9;
            box-shadow: 0 6px 20px rgba(0,0,0,0.12);
            border-color: #e7252d;
        }
        .horizontal-food-card.expanded .food-title {
            white-space: normal !important;
            overflow: visible !important;
            text-overflow: clip !important;
            max-width: none !important;
        }
        .horizontal-food-card.expanded .food-description {
            display: block !important;
            -webkit-line-clamp: unset !important;
            overflow: visible !important;
        }
        
        .food-image-container {
            position: relative;
            width: 100px;
            height: 100px;
            flex-shrink: 0;
            border-radius: 10px;
            overflow: hidden;
            background: #f9f9f9;
        }
        .food-image {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        .sold-out-badge {
            position: absolute;
            top: 8px;
            left: 8px;
            background: rgba(0,0,0,0.85);
            color: #fff;
            padding: 4px 10px;
            border-radius: 6px;
            font-size: 0.7rem;
            font-weight: 900;
            text-transform: uppercase;
        }
        
        .food-details {
            flex: 1;
            min-width: 0;
        }
        .title-row {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 8px;
        }
        .food-title {
            font-size: 1.2rem;
            font-weight: 900;
            color: #000;
            margin: 0;
            line-height: 1.3;
        }
        .discount-tag {
            display: inline-block;
            background: linear-gradient(135deg, #e7252d 0%, #c11b17 100%);
            color: #fff;
            padding: 4px 10px;
            border-radius: 6px;
            font-size: 0.75rem;
            font-weight: 900;
            box-shadow: 0 2px 6px rgba(231, 37, 45, 0.25);
        }
        .food-description {
            font-size: 0.9rem;
            color: #666;
            margin: 0;
            line-height: 1.4;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }
        
        .food-pricing {
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: 12px;
            min-width: 100px; /* Ensure price area doesn't collapse */
        }
        .price-block {
            text-align: right;
        }
        .original-price {
            display: block;
            font-size: 0.85rem;
            color: #999;
            text-decoration: line-through;
            margin-bottom: 2px;
        }
        .current-price {
            display: block;
            font-size: 1.3rem;
            font-weight: 900;
            color: #000;
        }
        
        .add-item-btn {
            width: 40px;
            height: 40px;
            border-radius: 10px;
            border: none;
            background: linear-gradient(135deg, #e7252d 0%, #c11b17 100%);
            color: #fff;
            font-size: 16px;
            cursor: pointer;
            transition: all 0.2s ease;
            box-shadow: 0 3px 10px rgba(231, 37, 45, 0.25);
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .add-item-btn:hover {
            transform: scale(1.05);
            box-shadow: 0 5px 15px rgba(231, 37, 45, 0.4);
        }
        .add-item-btn.disabled {
            background: #ccc;
            box-shadow: none;
            cursor: not-allowed;
        }
        
        .horizontal-qty-control {
            display: flex;
            align-items: center;
            gap: 8px;
            background: #fff;
            border: 2px solid #000;
            border-radius: 10px;
            padding: 6px 12px;
        }
        .qty-btn {
            width: 28px;
            height: 28px;
            border-radius: 8px;
            border: none;
            background: #f5f5f5;
            color: #000;
            font-size: 12px;
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 900;
        }
        .qty-btn:hover {
            background: #000;
            color: #fff;
        }
        .qty-display {
            font-size: 1rem;
            font-weight: 900;
            color: #000;
            min-width: 25px;
            text-align: center;
        }
        
        /* UNIVERSAL MOBILE OPTIMIZATION (Android & iOS) */
        @media (max-width: 768px) {
            .glovo-layout-wrapper {
                flex-direction: column;
            }
            .horizontal-food-card {
                flex-direction: row;
                padding: 12px;
                gap: 12px;
                align-items: center; 
                min-height: 100px;
            }
            .food-image-container {
                width: 85px;
                height: 85px;
                flex-shrink: 0;
            }
            .food-details {
                display: flex;
                flex-direction: column;
                justify-content: center;
                flex: 1;
                min-width: 0; /* Allows flex child to shrink */
            }
            .title-row {
                flex-wrap: wrap;
                gap: 5px;
                margin-bottom: 2px;
            }
            .food-title {
                font-size: 0.95rem;
                margin-bottom: 0;
                display: block;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                max-width: 100%;
            }
            .discount-tag {
                padding: 2px 6px;
                font-size: 0.65rem;
            }
            .food-description {
                font-size: 0.75rem;
                line-height: 1.2;
                display: -webkit-box;
                -webkit-line-clamp: 1;
                -webkit-box-orient: vertical;
                overflow: hidden;
            }
            .food-pricing {
                flex-direction: column;
                justify-content: center;
                gap: 5px;
                align-items: flex-end;
                min-width: 75px; 
                flex-shrink: 0;
            }
            .current-price {
                font-size: 0.95rem;
                white-space: nowrap;
            }
            .add-item-btn {
                width: 32px;
                height: 32px;
                font-size: 14px;
            }
            .horizontal-qty-control {
                padding: 4px 8px;
                gap: 5px;
            }
            .qty-btn {
                width: 24px;
                height: 24px;
            }
            .qty-display {
                font-size: 0.9rem;
                min-width: 15px;
            }
            /* Sidebar Optimization */
            .glovo-sidebar {
                padding: 10px 15px;
                position: sticky;
                top: 70px; /* Adjusted to fit below main sticky header */
                z-index: 100;
                background: #fff;
                box-shadow: 0 2px 10px rgba(0,0,0,0.05);
            }
            .sidebar-search { display: none; } 
            .sidebar-category-list {
                display: flex;
                overflow-x: auto;
                white-space: nowrap;
                padding-bottom: 5px;
                -webkit-overflow-scrolling: touch; 
                scrollbar-width: none; 
            }
            .sidebar-category-list::-webkit-scrollbar { display: none; } 
            
            .sidebar-category-item {
                flex-shrink: 0;
                margin-bottom: 0;
                margin-right: 10px;
                padding: 8px 16px;
                border-radius: 20px;
                border: 1px solid #f0f0f0;
            }
            .sidebar-header { display: none; }
        }

        /* Small Phones (Android Mini/iPhone SE) */
        @media (max-width: 480px) {
             .horizontal-food-card {
                padding: 10px;
                gap: 10px;
            }
            .food-image-container {
                width: 80px;
                height: 80px;
            }
            .food-title {
                font-size: 0.95rem;
            }
            
            /* Better Touch Targets */
            .pcnc-toast {
                width: 90%;
                left: 5%;
                right: auto;
                min-width: auto;
            }
        }

        /* Force single column on all mobile devices */
        @media (max-width: 991px) {
            #menu-container {
                display: flex !important;
                flex-direction: column !important;
            }
            #menu-container .menu-item-card {
                width: 100% !important;
                max-width: 100% !important;
                flex: 0 0 100% !important;
            }
            .glovo-main-content .container {
                padding: 0 15px;
            }
        }

        /* GLOVO-STYLE SIDEBAR LAYOUT */
        .glovo-layout-wrapper {
            display: flex;
            min-height: 600px;
            gap: 0;
            background: #f9f9f9;
        }
        
        .glovo-sidebar {
            width: 280px;
            background: #fff;
            border-right: 1px solid #e8e8e8;
            padding: 25px 20px;
            position: sticky;
            top: 90px;
            height: calc(100vh - 90px);
            overflow-y: auto;
            flex-shrink: 0;
        }
        
        .sidebar-header h4 {
            font-size: 1.1rem;
            font-weight: 900;
            color: #000;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 2px solid #f0f0f0;
        }
        
        .sidebar-search .input-group {
            border: 1.5px solid #e8e8e8;
            border-radius: 12px;
            overflow: hidden;
        }
        .sidebar-search .input-group-text {
            background: #fff;
            border: none;
            color: #999;
        }
        .sidebar-search .form-control {
            border: none;
            padding: 12px;
            font-size: 0.9rem;
        }
        .sidebar-search .form-control:focus {
            box-shadow: none;
        }
        
        .sidebar-category-list {
            list-style: none;
            padding: 0;
            margin: 0;
        }
        
        .sidebar-category-item {
            padding: 14px 18px;
            margin-bottom: 8px;
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            gap: 12px;
            font-weight: 600;
            font-size: 0.95rem;
            color: #333;
            background: #fafafa;
        }
        
        .sidebar-category-item i {
            font-size: 1.1rem;
            color: #666;
            width: 24px;
            text-align: center;
        }
        
        .sidebar-category-item:hover {
            background: #e7252d;
            color: #fff;
        }
        
        .sidebar-category-item:hover i {
            color: #fff;
        }
        
        .sidebar-category-item.active {
            background: #e7252d;
            color: #fff;
            font-weight: 800;
            box-shadow: 0 4px 12px rgba(231, 37, 45, 0.2);
        }
        
        .sidebar-category-item.active i {
            color: #fff;
        }
        
        .glovo-main-content {
            flex: 1;
            padding: 25px;
            overflow-y: auto;
        }
        
        @media (max-width: 991px) {
            .glovo-layout-wrapper {
                flex-direction: column;
            }
            .glovo-sidebar {
                width: 100%;
                position: relative;
                height: auto;
                top: 0;
                border-right: none;
                border-bottom: 1px solid #e8e8e8;
                max-height: 400px;
            }
            .sidebar-category-list {
                max-height: 250px;
                overflow-y: auto;
            }
        }
        
        /* PREMIUM CART STYLES - Mobile Optimized */
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
        .cart-info { flex-grow: 1; min-width: 0; }
        .cart-item-title { font-size: 1.1rem; font-weight: 800; color: var(--glovo-text); margin-bottom: 5px; word-wrap: break-word; }
        .cart-item-price { font-size: 0.95rem; font-weight: 700; color: var(--glovo-red); }
        .cart-actions { display: flex; align-items: center; gap: 20px; flex-wrap: wrap; }
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
            width: 100%;
        }
        .glovo-checkout-btn:hover { transform: translateY(-3px); box-shadow: 0 8px 20px rgba(231, 37, 45, 0.3); }
        
        /* Mobile Cart Optimizations */
        @media (max-width: 768px) {
            .premium-cart-card {
                padding: 15px;
                gap: 12px;
                flex-wrap: wrap;
            }
            .cart-img-wrap {
                width: 80px;
                height: 80px;
            }
            .cart-item-title {
                font-size: 1rem;
            }
            .cart-actions {
                width: 100%;
                justify-content: space-between;
                gap: 10px;
            }
            .premium-summary-card {
                position: relative;
                top: 0;
                margin-top: 20px;
                padding: 20px;
            }
            .summary-title {
                font-size: 1.2rem;
            }
        }

        /* Horizontal Scroll Nav - Glovo Style */
        .pcnc-filter-wrap {
            position: relative;
            overflow: hidden;
            background: #fff;
            border-bottom: 1px solid #e8e8e8;
        }
        .pcnc-filter-wrap::after {
            content: '›';
            position: absolute;
            top: 50%; right: 5px;
            transform: translateY(-50%);
            width: 35px; height: 50px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(to left, #fff 0%, rgba(255,255,255,0) 100%);
            color: #666;
            font-size: 2rem;
            font-weight: 300;
            pointer-events: none;
            z-index: 3;
        }
        .pcnc-filter-list {
            display: flex !important;
            overflow-x: auto;
            white-space: nowrap;
            padding: 12px 20px !important;
            gap: 12px !important;
            -ms-overflow-style: none;
            scrollbar-width: none;
            scroll-behavior: smooth;
            padding-right: 50px !important;
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
  const filterBtns = document.querySelectorAll(".sidebar-category-item");
  if (!filterBtns.length) return;

  filterBtns.forEach((btn) => {
    const filterVal = btn.getAttribute("data-filter");

    // Initial state sync
    if (filterVal === currentFilter) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }

    btn.onclick = (e) => {
      // Remove active from all
      filterBtns.forEach((b) => b.classList.remove("active"));
      // Add active to clicked
      btn.classList.add("active");

      // Re-render menu
      renderMenu(filterVal);
    };
  });
}

function initScrollspy() {
  if (currentFilter !== "all" || document.getElementById("shopSearch")?.value)
    return;

  const sections = document.querySelectorAll(".category-header-glovo");
  const filterBtns = document.querySelectorAll(".filter-btn");

  window.onscroll = () => {
    let currentSectionId = "";
    sections.forEach((sec) => {
      const top = sec.offsetTop - 200;
      if (window.pageYOffset >= top) {
        currentSectionId = sec.id.replace("section-", "");
      }
    });

    if (currentSectionId) {
      filterBtns.forEach((btn) => {
        const bVal = btn.getAttribute("data-filter");
        if (bVal === currentSectionId) {
          btn.classList.add("active-filter");
          // Scroll nav into view
          btn.parentNode.scrollTo({
            left:
              btn.offsetLeft -
              btn.parentNode.offsetWidth / 2 +
              btn.offsetWidth / 2,
            behavior: "smooth",
          });
        } else {
          btn.classList.remove("active-filter");
        }
      });
    }
  };
}

// RENDER CART (cart.html) & CHECKOUT (checkout.html)
function renderCartPage() {
  const listContainer = document.getElementById("cart-item-list");
  const tbody = document.getElementById("cart-table-body");
  const totalEl = document.getElementById("cart-total");
  const subtotalEl = document.getElementById("subtotal");

  if (!listContainer && !tbody) return;

  injectPremiumStyles();

  const cart = getCart();
  if (cart.length === 0) {
    if (listContainer)
      listContainer.innerHTML =
        '<div class="text-center py-5"><h3 class="text-muted">Your cart is empty</h3><a href="shop.html" class="boxed-btn mt-3">Go to Menu</a></div>';
    if (tbody)
      tbody.innerHTML =
        '<tr><td colspan="6" class="text-center">Your cart is empty</td></tr>';
    if (totalEl) totalEl.innerText = "KES 0";
    if (subtotalEl) subtotalEl.innerText = "KES 0";
    return;
  }

  const isCheckout = window.location.pathname.includes("checkout.html");
  let total = 0;

  if (isCheckout) {
    // ... (Checkout logic as is, it's already reasonably clean)
    tbody.innerHTML = cart
      .map((item) => {
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
      })
      .join("");
  } else if (listContainer) {
    // PREMIUM CART (cart.html)
    listContainer.innerHTML = cart
      .map((item) => {
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
      })
      .join("");
  }

  // Handle Summary Section
  if (subtotalEl) subtotalEl.innerText = "KES " + total.toLocaleString();

  // Handle Discount
  if (APPLIED_DISCOUNT_PERCENT > 0) {
    const discountAmount = Math.round(total * (APPLIED_DISCOUNT_PERCENT / 100));
    const discRow = document.getElementById("discount-row");
    const discAmtEl = document.getElementById("discount-amount");
    if (discRow) discRow.style.display = "flex";
    if (discAmtEl)
      discAmtEl.innerText = `-KES ${discountAmount.toLocaleString()}`;
    total -= discountAmount;
  } else {
    const discRow = document.getElementById("discount-row");
    if (discRow) discRow.style.display = "none";
  }

  if (totalEl) totalEl.innerText = "KES " + total.toLocaleString();

  // Add Delivery Fee if present
  const deliveryFeeEl = document.getElementById("delivery_fee_hidden");
  if (deliveryFeeEl && parseInt(deliveryFeeEl.value) > 0) {
    const fee = parseInt(deliveryFeeEl.value);
    total += fee;
    if (totalEl) totalEl.innerText = "KES " + total.toLocaleString();
  }
}

// CHECKOUT (checkout.html)
async function submitOrder(e) {
  if (e) e.preventDefault();

  const cart = getCart();
  if (cart.length === 0) {
    showNotification(
      "Cart Empty",
      "Please add some items to your cart before proceeding.",
      "error",
    );
    return;
  }

  const customerName = document.getElementById("name").value.trim();
  const phoneNumber = document.getElementById("phone").value.trim();
  const location = document.getElementById("address").value.trim();
  const notes = document.getElementById("order-notes").value.trim();

  // VALIDATION
  if (!customerName || !phoneNumber || !location) {
    showNotification(
      "Missing Details",
      "Please fill in your name, phone, and delivery address.",
      "error",
    );
    return;
  }

  // Phone Validation: 10 digits starting with 07 or 01
  const phoneRegex = /^(07|01)\d{8}$/;
  if (!phoneRegex.test(phoneNumber)) {
    showNotification(
      "Invalid Phone",
      "Please enter a valid 10-digit Kenyan phone number starting with 07 or 01.",
      "error",
    );
    return;
  }

  const paymentMethod = document.querySelector(
    'input[name="payment_method"]:checked',
  ).value;
  const totalAmountRaw = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const discountAmount = Math.round(
    totalAmountRaw * (APPLIED_DISCOUNT_PERCENT / 100),
  );

  const deliveryFee = document.getElementById("delivery_fee_hidden")
    ? parseInt(document.getElementById("delivery_fee_hidden").value)
    : 0;
  const totalAmount = totalAmountRaw - discountAmount + deliveryFee;

  // M-Pesa Credentials
  const mpesa_credentials = {
    consumerKey: "RB7RwzrKvbNHTPAic7xvndo3ChzkwSk67uIj0wMw4T2A0rTY",
    consumerSecret:
      "DlUU4Bsp7SK8EPiTeJgXAirYPwBNaY19E75LA7PBWBthAvLk8iQIaJoG7tpMcAhU",
    shortCode: "6994591",
  };

  const btn = document.getElementById("placeOrderBtn");
  if (btn) {
    btn.innerText = "Processing...";
    btn.disabled = true;
  }

  const lat = document.getElementById("lat")
    ? document.getElementById("lat").value
    : null;
  const lng = document.getElementById("lng")
    ? document.getElementById("lng").value
    : null;

  try {
    const res = await fetch("/api/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
        credentials: mpesa_credentials,
      }),
    });
    const data = await res.json();
    if (data.success) {
      showNotification(
        "Order Placed",
        "Your order has been received! Redirecting to tracking...",
        "success",
      );
      localStorage.removeItem("pcnc_cart");

      // Store multiple order IDs
      let orders = JSON.parse(localStorage.getItem("pcnc_order_ids") || "[]");
      orders.unshift(data.orderId);
      localStorage.setItem("pcnc_order_ids", JSON.stringify(orders));
      localStorage.setItem("pcnc_last_order_id", data.orderId);

      setTimeout(() => {
        window.location.href = `track-order.html?id=${data.orderId}`;
      }, 2000);
    } else {
      showNotification("Order Failed", data.message, "error");
      btn.innerText = "Confirm Order";
      btn.disabled = false;
    }
  } catch (err) {
    console.error("Checkout Error:", err);
    showNotification(
      "Connection Error",
      "Payment Request Failed. Please check your network.",
      "error",
    );
    btn.innerText = "Confirm Order";
    btn.disabled = false;
  }
}

// LOCATION SEARCH LOGIC (Google Maps-style Autocomplete)
let globalSearchTimeout;
function initializeLocationSearch() {
  const addressInput = document.getElementById("address");
  const suggestionBox = document.getElementById("location-suggestions");
  if (!addressInput || !suggestionBox) return;

  // Apply suggestion box styles
  Object.assign(suggestionBox.style, {
    position: "absolute",
    top: "100%",
    left: "0",
    right: "0",
    background: "#fff",
    borderRadius: "12px",
    boxShadow: "0 12px 40px rgba(0,0,0,0.15)",
    zIndex: "10000",
    display: "none",
    overflow: "hidden",
    border: "1px solid #eee",
    marginTop: "8px",
    transition: "all 0.2s ease",
  });

  addressInput.addEventListener("input", (e) => {
    const val = e.target.value;
    if (val.length < 2) {
      suggestionBox.style.display = "none";
      return;
    }

    clearTimeout(globalSearchTimeout);
    globalSearchTimeout = setTimeout(() => {
      const restLat =
        typeof usiuPos !== "undefined" ? usiuPos[0] : -1.1766610736906116;
      const restLng =
        typeof usiuPos !== "undefined" ? usiuPos[1] : 36.94006231794019;

      // Search near the restaurant for better relevance
      fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(val)}&lat=${restLat}&lon=${restLng}&limit=6`,
      )
        .then((r) => r.json())
        .then((data) => {
          let html = "";
          if (data.features && data.features.length > 0) {
            html = data.features
              .map((f) => {
                const p = f.properties;
                const mainName = p.name || p.street || "Unknown Place";
                const subName = [p.street, p.district, p.city]
                  .filter((s) => s && s !== mainName)
                  .join(", ");

                // Determine icon based on type
                let icon = '<i class="fas fa-map-marker-alt"></i>';
                if (p.type === "house" || p.osm_key === "building")
                  icon = '<i class="fas fa-house-user"></i>';
                if (p.osm_value === "restaurant" || p.osm_value === "cafe")
                  icon = '<i class="fas fa-utensils"></i>';
                if (p.type === "city" || p.type === "town")
                  icon = '<i class="fas fa-city"></i>';

                return `
                                <div class="suggestion-item" 
                                     onclick="selectLocation(${f.geometry.coordinates[1]}, ${f.geometry.coordinates[0]}, '${mainName.replace(/'/g, "\\'")} ${subName ? ", " + subName.replace(/'/g, "\\'") : ""}')" 
                                     style="padding: 12px 18px; cursor: pointer; border-bottom: 1px solid #f8f8f8; display: flex; align-items: flex-start; transition: background 0.2s;">
                                    <div style="color: #e7252d; margin-right: 15px; margin-top: 3px; font-size: 1.1rem; width: 20px; text-align: center;">
                                        ${icon}
                                    </div>
                                    <div style="flex: 1;">
                                        <div style="font-weight: 700; color: #1a1a1a; font-size: 0.95rem; line-height: 1.2;">${mainName}</div>
                                        <div style="font-size: 0.8rem; color: #777; margin-top: 2px;">${subName || "Street Address"}</div>
                                    </div>
                                </div>
                            `;
              })
              .join("");

            // Attribution
            html += `
                            <div style="padding: 8px 18px; background: #fafafa; border-top: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;">
                                <span style="font-size: 0.65rem; color: #aaa; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Results near you</span>
                                <img src="https://photon.komoot.io/static/img/photon_logo.png" style="height: 12px; filter: grayscale(1); opacity: 0.5;">
                            </div>
                        `;
          }

          if (html === "") {
            html = `
                            <div class="suggestion-item" onclick="selectLocation(${restLat}, ${restLng}, '${val.replace(/'/g, "\\'")}')" style="padding: 15px 20px; cursor: pointer;">
                                <div style="display: flex; align-items: center; color: #856404; font-weight: 600;">
                                    <i class="fas fa-keyboard" style="margin-right: 12px;"></i>
                                    <span>Use: "${val}"</span>
                                </div>
                            </div>
                        `;
          }

          suggestionBox.innerHTML = html;
          suggestionBox.style.display = "block";
        });
    }, 500);
  });

  // Close on click outside
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".location-search-wrapper")) {
      suggestionBox.style.display = "none";
    }
  });

  // Styles for hover effect
  if (!document.getElementById("autocomplete-styles")) {
    const style = document.createElement("style");
    style.id = "autocomplete-styles";
    style.innerHTML = `
            .suggestion-item:hover { background: #fdf2f2 !important; }
            .suggestion-item:hover div { color: #e7252d !important; }
            .suggestion-item:last-child { border-bottom: none; }
        `;
    document.head.appendChild(style);
  }
}

function selectLocation(lat, lng, name) {
  const addressInput = document.getElementById("address");
  const suggestionBox = document.getElementById("location-suggestions");
  if (addressInput) addressInput.value = name;
  if (suggestionBox) suggestionBox.style.display = "none";

  // Update global lat/lng if inputs exist
  const latInp = document.getElementById("lat");
  const lngInp = document.getElementById("lng");
  if (latInp) latInp.value = lat;
  if (lngInp) lngInp.value = lng;

  // Trigger fee update if defined (in checkout.html)
  if (typeof updateDeliveryFee === "function") {
    updateDeliveryFee(lat, lng);
  }
}

async function applyPromoCode() {
  const input = document.getElementById("promoCodeInput");
  const msg = document.getElementById("promo-msg");
  const phone = document.getElementById("phone")?.value;
  const code = input.value.trim();

  if (!code && !phone) return;

  try {
    const res = await fetch("/api/validate-promo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, phone }),
    });
    const data = await res.json();

    if (data.success) {
      APPLIED_DISCOUNT_PERCENT = data.discountPercent;
      APPLIED_PROMO_CODE = code ? code.toUpperCase() : "LOYALTY";
      msg.innerText =
        data.message || `Success! ${data.discountPercent}% discount applied.`;
      msg.style.color = "#116940";
      msg.style.display = "block";
      if (code) input.disabled = true;
      renderCartPage();
      showNotification(
        "Reward Applied!",
        data.message || `You saved ${data.discountPercent}% on your order.`,
        "success",
      );
    } else if (code) {
      msg.innerText = data.message;
      msg.style.color = "#e7252d";
      msg.style.display = "block";
      showNotification("Invalid Code", data.message, "error");
    }
  } catch (e) {
    console.error(e);
  }
}

// Init
document.addEventListener("DOMContentLoaded", () => {
  updateCartMetadata();
  if (document.getElementById("menu-container")) renderMenu();
  if (document.getElementById("homepage-menu-container")) renderHomepageMenu();
  if (
    document.getElementById("cart-table-body") ||
    document.getElementById("cart-item-list")
  )
    renderCartPage();

  const checkoutForm = document.getElementById("checkout-form");
  if (checkoutForm) {
    // Prevent Enter key from submitting the form (Desktop)
    checkoutForm.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && e.target.tagName === "INPUT") {
        e.preventDefault();
        return false;
      }
    });

    checkoutForm.addEventListener("submit", (e) => {
      e.preventDefault();
      submitOrder(e);
    });
  }

  // Initialize Location Search
  initializeLocationSearch();

  // Bottom Nav Active State
  const currentPath = window.location.pathname;
  const bottomNavItems = document.querySelectorAll(
    ".mobile-bottom-nav .nav-item",
  );
  bottomNavItems.forEach((item) => {
    const href = item.getAttribute("href");
    if (
      currentPath.includes(href) ||
      (currentPath === "/" && href === "index.html")
    ) {
      bottomNavItems.forEach((i) => i.classList.remove("active"));
      item.classList.add("active");
    }
  });

  // Payment method switch logic
  const paymentRadios = document.querySelectorAll(
    'input[name="payment_method"]',
  );
  paymentRadios.forEach((radio) => {
    radio.addEventListener("change", (e) => {
      const stkNotice = document.getElementById("stk-notice");
      const tillNotice = document.getElementById("till-instructions");
      if (e.target.value === "stk") {
        if (stkNotice) stkNotice.style.display = "block";
        if (tillNotice) tillNotice.style.display = "none";
      } else {
        if (stkNotice) stkNotice.style.display = "none";
        if (tillNotice) tillNotice.style.display = "block";
      }
    });
  });
});
