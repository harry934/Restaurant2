const MENU_ITEMS = [
    { id: 1, name: 'Hawaiian Pizza', price: 1000, category: 'pizza', image: 'assets/img/products/product-img-1.png', tag: 'Bestseller' },
    { id: 2, name: 'Premium Chicken Burger', price: 1000, category: 'burgers', image: 'assets/img/products/product-img-2.png', tag: 'Trending' },
    { id: 3, name: 'Pizza Chick Barbeque', price: 1000, category: 'pizza', image: 'assets/img/products/product-img-3.png', tag: 'Chef Choice' },
    { id: 4, name: 'Pizza Pie (Calzone)', price: 300, category: 'snacks', image: 'assets/img/products/product-img-4.png', tag: 'Mini Snack' }
];

let currentFilter = 'all';

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
    alert('Added to cart!');
}

function updateCartMetadata() {
    const cart = getCart();
    const count = cart.reduce((sum, i) => sum + i.quantity, 0);
    console.log('Cart count:', count);
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

// RENDER MENU (shop.html)
function renderMenu(filter = 'all') {
    const container = document.getElementById('menu-container');
    if (!container) return;
    
    currentFilter = filter;
    const items = filter === 'all' ? MENU_ITEMS : MENU_ITEMS.filter(i => i.category === filter);

    container.innerHTML = items.map(item => `
        <div class="col-lg-4 col-md-6 mb-5">
            <div class="single-product-item premium-card" style="border: none; box-shadow: 0 10px 40px rgba(0,0,0,0.05); border-radius: 20px; padding: 25px; transition: all 0.4s ease; background: #fff; position: relative; overflow: hidden;">
                ${item.tag ? `<span style="position: absolute; top: 15px; left: 15px; background: #e7252d; color: #fff; padding: 5px 12px; border-radius: 50px; font-size: 0.7rem; font-weight: 800; z-index: 2; text-transform: uppercase;">${item.tag}</span>` : ''}
                
                <div class="product-image text-center mb-4" style="border-radius: 15px; overflow: hidden; background: #f9f9f9; padding: 20px;">
                    <a href="#"><img src="${item.image}" alt="${item.name}" style="height: 180px; width: auto; object-fit: contain; transition: transform 0.5s ease;" class="product-img-hover"></a>
                </div>
                
                <div style="text-align: left;">
                    <h3 style="font-size: 1.3rem; font-weight: 800; color: #1a1a1a; margin-bottom: 5px;">${item.name}</h3>
                    <p style="color: #777; font-size: 0.85rem; margin-bottom: 20px;">Deliciously crafted with signature PCnC spices and fresh crust.</p>
                    
                    <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #f0f0f0; padding-top: 15px;">
                        <div>
                            <span style="display: block; font-size: 0.75rem; color: #aaa; text-transform: uppercase; font-weight: 700;">Price</span>
                            <span style="font-size: 1.4rem; font-weight: 900; color: #e7252d;">KES ${item.price.toLocaleString()}</span>
                        </div>
                        <a href="#" onclick="addToCart(${item.id}); return false;" class="cart-btn" style="background: #1a1a1a; color: #fff; width: 45px; height: 45px; border-radius: 12px; display: flex; align-items: center; justify-content: center; transition: 0.3s; font-size: 1.1rem;">
                            <i class="fas fa-shopping-cart"></i>
                        </a>
                    </div>
                </div>
            </div>
        </div>
    `).join('');

    // Setup filter click listeners once
    setupFilters();
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
                <td style="padding: 15px 0; text-align: right; vertical-align: middle; font-weight: 600; color: #333;">KES ${itemTotal}</td>
            </tr>
            `;
        }).join('');
    } else {
        tbody.innerHTML = cart.map(item => {
            const itemTotal = item.price * item.quantity;
            total += itemTotal;
            return `
            <tr class="table-body-row">
                <td class="product-remove"><a href="#" onclick="removeFromCart(${item.id})"><i class="far fa-window-close"></i></a></td>
                <td class="product-image"><img src="${item.image}" alt=""></td>
                <td class="product-name">${item.name}</td>
                <td class="product-price">KES ${item.price}</td>
                <td class="product-quantity"><input type="number" value="${item.quantity}" onchange="updateQuantity(${item.id}, this.value - ${item.quantity})"></td>
                <td class="product-total">KES ${itemTotal}</td>
            </tr>
            `;
        }).join('');
    }

    if(totalEl) totalEl.innerText = 'KES ' + total;
    
    // Also update checkout subtotal if present
    const subtotalEl = document.getElementById('subtotal');
    if (subtotalEl) subtotalEl.innerText = 'KES ' + total;
}

// CHECKOUT (checkout.html)
async function submitOrder(e) {
    if(e) e.preventDefault();
    
    const cart = getCart();
    if (cart.length === 0) {
        alert('Cart is empty');
        return;
    }

    const customerName = document.getElementById('name').value;
    const phoneNumber = document.getElementById('phone').value;
    const location = document.getElementById('address').value;
    const paymentMethod = document.querySelector('input[name="payment_method"]:checked').value;
    const totalAmount = cart.reduce((sum, i) => sum + (i.price * i.quantity), 0);

    // M-Pesa Credentials (for reference in backend logic)
    const mpesa_credentials = {
        consumerKey: "RB7RwzrKvbNHTPAic7xvndo3ChzkwSk67uIj0wMw4T2A0rTY",
        consumerSecret: "DlUU4Bsp7SK8EPiTeJgXAirYPwBNaY19E75LA7PBWBthAvLk8iQIaJoG7tpMcAhU",
        shortCode: "6994591" // Using the Till Number as identification
    };

    const btn = document.getElementById('placeOrderBtn');
    btn.innerText = 'Processing...';
    btn.disabled = true;

    try {
        const res = await fetch('http://localhost:3000/api/order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                customerName,
                phoneNumber,
                location,
                paymentMethod,
                items: cart,
                totalAmount,
                credentials: mpesa_credentials
            })
        });
        const data = await res.json();
        if (data.success) {
            alert(data.message);
            localStorage.removeItem('pcnc_cart');
            window.location.href = 'index.html';
        } else {
            alert('Error: ' + data.message);
            btn.innerText = 'Confirm Order';
            btn.disabled = false;
        }
    } catch (err) {
        console.error("Checkout Error:", err);
        alert('Payment Request Failed. Please check if the server is running and your network connection is stable.');
        btn.innerText = 'Confirm Order';
        btn.disabled = false;
    }
}

// Init
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('menu-container')) renderMenu();
    if (document.getElementById('cart-table-body')) renderCartPage();
    
    const checkoutForm = document.getElementById('checkout-form');
    if (checkoutForm) checkoutForm.addEventListener('submit', submitOrder);

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
