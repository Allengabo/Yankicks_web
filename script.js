// Currency conversion: USD to PHP
const USD_TO_PHP = 56;

// Global State
let products = [];
let cart = [];
const API_URL = 'http://localhost:3000/api'; // Centralized API URL

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Core Systems
    initializeCart();
    initializeEventListeners();
    checkUserSession(); 

    // 2. Page Specific Logic
    const path = window.location.pathname;

    if (path.includes('view-cart.html')) {
        loadCartPage();
    } else if (path.includes('checkout.html')) {
        // Optional: Redirect to login if not authenticated
        const user = JSON.parse(localStorage.getItem('yankicks_user'));
        if (!user) {
            alert("Please login to proceed to checkout.");
            window.location.href = 'login-register.html';
        }
    } else if (path.includes('login-register.html')) {
        setupAuthListeners();
    } else if (path.includes('account.html')) {
        loadAccountPage();
    } else if (path.includes('my-orders.html')) {
        loadOrderHistory(); // NEW: Load history on orders page
    } else if (path.includes('payment-confirmation.html')) {
        loadOrderConfirmation(); // NEW: Show order ID on confirmation
    } else {
        // Load products for Shop, Home, etc.
        fetchProducts(); 
    }
});

// ----------------------------------------------------------------------
// AUTHENTICATION & SESSION MANAGEMENT
// ----------------------------------------------------------------------

function checkUserSession() {
    const user = JSON.parse(localStorage.getItem('yankicks_user'));
    const accountBtns = document.querySelectorAll('.account-btn');
    
    // Update Nav Icons based on state
    accountBtns.forEach(btn => {
        if (user) {
            btn.href = 'account.html';
            btn.title = `Logged in as ${user.name}`;
        } else {
            btn.href = 'login-register.html';
            btn.title = 'Login / Register';
        }
    });

    // Redirect logic if on Auth pages while logged in
    if (user && window.location.pathname.includes('login-register.html')) {
        window.location.href = 'account.html';
    }
}

function loadAccountPage() {
    const user = JSON.parse(localStorage.getItem('yankicks_user'));
    
    if (!user) {
        alert('Please login to view your account.');
        window.location.href = 'login-register.html';
        return;
    }

    const welcomeMsg = document.getElementById('userWelcomeMsg');
    const authActionCard = document.getElementById('authActionCard');
    
    if (welcomeMsg) welcomeMsg.textContent = `Welcome, ${user.name}`;
    
    // Change "Login/Register" card to "Logout"
    if (authActionCard) {
        authActionCard.href = "#";
        authActionCard.innerHTML = `
            <h3>Logout</h3>
            <p>Sign out of your account</p>
        `;
        authActionCard.onclick = (e) => {
            e.preventDefault();
            handleLogout();
        };
    }
}

function handleLogout() {
    if(confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('yankicks_user');
        // localStorage.removeItem('yankicks_cart'); // Keep cart if you want
        alert('Logged out successfully.');
        window.location.href = 'index.html';
    }
}

function setupAuthListeners() {
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
}

async function handleRegister(e) {
    e.preventDefault(); 
    const userData = {
        registerName: document.getElementById('registerName').value,
        registerEmail: document.getElementById('registerEmail').value,
        registerPassword: document.getElementById('registerPassword').value
    };

    try {
        const response = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });
        const data = await response.json();
        
        if (response.ok) {
            alert('Registration Successful! Please sign in.');
            window.location.reload(); 
        } else {
            alert('Registration Failed: ' + (data.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Server connection failed.');
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const loginData = {
        loginEmail: document.getElementById('loginEmail').value,
        loginPassword: document.getElementById('loginPassword').value
    };
    
    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(loginData)
        });
        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('yankicks_user', JSON.stringify(data.user));
            alert(`Welcome back, ${data.user.name}!`);
            window.location.href = 'account.html';
        } else {
            alert('Login Failed: ' + (data.message || 'Invalid credentials'));
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Server connection failed.');
    }
}

// ----------------------------------------------------------------------
// NEW: CHECKOUT & ORDER HISTORY
// ----------------------------------------------------------------------

async function processCheckout() {
    const user = JSON.parse(localStorage.getItem('yankicks_user'));
    const cart = JSON.parse(localStorage.getItem('yankicks_cart'));

    if (!user) {
        alert('Please login to checkout.');
        window.location.href = 'login-register.html';
        return;
    }

    if (!cart || cart.length === 0) {
        alert('Your cart is empty.');
        return;
    }

    // Basic Validation of Form
    const fullName = document.getElementById('fullName').value;
    const address = document.getElementById('address').value;
    if(!fullName || !address) {
        alert("Please fill in your shipping details.");
        return;
    }

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    try {
        const response = await fetch(`${API_URL}/checkout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: user.id,
                cart: cart,
                total: total,
                paymentMethod: 'Credit Card' // Default for now
            })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.removeItem('yankicks_cart'); // Clear cart
            window.location.href = `payment-confirmation.html?orderId=${data.orderId}`;
        } else {
            alert('Checkout failed: ' + (data.message || 'Error'));
        }
    } catch (error) {
        console.error('Checkout Error:', error);
        alert('Could not process checkout. Check server.');
    }
}

async function loadOrderHistory() {
    const user = JSON.parse(localStorage.getItem('yankicks_user'));
    const container = document.getElementById('ordersListContainer');

    if (!container) return;
    if (!user) {
        container.innerHTML = '<p>Please login to view your orders.</p>';
        return;
    }

    try {
        const response = await fetch(`${API_URL}/orders/${user.id}`);
        const orders = await response.json();

        if (orders.length === 0) {
            container.innerHTML = '<p>You have no order history yet.</p>';
            return;
        }

        // Render orders using your existing styles logic
        container.innerHTML = orders.map(order => `
            <div style="border: 1px solid #ddd; padding: 15px; margin-bottom: 15px; border-radius: 8px;">
                <div style="display:flex; justify-content:space-between; border-bottom:1px solid #eee; padding-bottom:10px; margin-bottom:10px;">
                    <h3 style="font-size: 1.1rem; margin:0;">Order #${order.id}</h3>
                    <span style="color: #2ecc71; font-weight:bold;">${order.status}</span>
                </div>
                <p style="margin: 5px 0;"><strong>Date:</strong> ${new Date(order.order_date).toLocaleDateString()}</p>
                <p style="margin: 5px 0;"><strong>Total:</strong> ₱${Number(order.total_amount).toFixed(2)}</p>
                <p style="margin: 5px 0;"><strong>Payment:</strong> ${order.payment_method}</p>
            </div>
        `).join('');

    } catch (error) {
        console.error('History Error:', error);
        container.innerHTML = '<p>Error loading orders. Check server connection.</p>';
    }
}

function loadOrderConfirmation() {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('orderId');
    const displayElement = document.getElementById('displayOrderId');
    
    if (orderId && displayElement) {
        displayElement.textContent = `YK-2024-${orderId}`;
        displayElement.style.fontWeight = "bold";
        displayElement.style.color = "#333";
    }
}

// ----------------------------------------------------------------------
// DATABASE PRODUCT FETCHING
// ----------------------------------------------------------------------

async function fetchProducts() {
    const grid = document.getElementById('productsGrid');
    if (!grid) return; 

    try {
        const response = await fetch(`${API_URL}/products`);
        if (!response.ok) throw new Error('Network response was not ok');
        
        products = await response.json();
        
        products = products.map(p => ({
            ...p,
            price: Number(p.price)
        }));

        displayProducts(products);

    } catch (error) {
        console.error('Error fetching products:', error);
        grid.innerHTML = `
            <div style="text-align:center; padding: 40px; width: 100%;">
                <h3>Unavailable</h3>
                <p>Could not connect to product database. Make sure your server is running.</p>
            </div>`;
    }
}

// ----------------------------------------------------------------------
// CART & UI UTILITIES
// ----------------------------------------------------------------------

function initializeCart() {
    const savedCart = localStorage.getItem('yankicks_cart');
    if (savedCart) {
        cart = JSON.parse(savedCart);
        updateCartUI();
    }
}

function initializeEventListeners() {
    const cartBtn = document.getElementById('cartBtn');
    const closeCart = document.getElementById('closeCart');
    const cartSidebar = document.getElementById('cartSidebar');
    const contactForm = document.getElementById('contactForm');

    if (cartBtn) {
        cartBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            cartSidebar.classList.toggle('active');
        });
    }
    if (closeCart) closeCart.addEventListener('click', () => cartSidebar.classList.remove('active'));
    
    document.addEventListener('click', (e) => {
        if (cartSidebar && cartSidebar.classList.contains('active') && 
            !cartSidebar.contains(e.target) && 
            e.target !== cartBtn && !cartBtn.contains(e.target)) {
            cartSidebar.classList.remove('active');
        }
    });

    if (contactForm) contactForm.addEventListener('submit', handleContactForm);

    const categoryFilter = document.getElementById('categoryFilter');
    const priceFilter = document.getElementById('priceFilter');
    if (categoryFilter) categoryFilter.addEventListener('change', filterProducts);
    if (priceFilter) priceFilter.addEventListener('change', sortProducts);
}

function displayProducts(productsToDisplay) {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;

    if (productsToDisplay.length === 0) {
        grid.innerHTML = '<p style="text-align:center; width:100%;">No products found.</p>';
        return;
    }

    grid.innerHTML = productsToDisplay.map(product => `
        <div class="product-card">
            <img src="${product.image || 'assets/images/default.jpg'}" alt="${product.name}" class="product-image">
            <div class="product-info">
                <div class="product-category">${product.category}</div>
                <h3 class="product-name">${product.name}</h3>
                <div class="product-price">₱${Number(product.price).toFixed(2)}</div>
                <div class="product-rating">
                    ${'★'.repeat(Math.round(product.rating || 5))}${'☆'.repeat(5 - Math.round(product.rating || 5))}
                </div>
                <button class="add-to-cart-btn" onclick="addToCart(${product.id})">Add to Cart</button>
            </div>
        </div>
    `).join('');
}

function addToCart(productId) {
    const product = products.find(p => p.id === productId); 
    if (!product) return;
    
    const cartItem = cart.find(item => item.id === productId);

    if (cartItem) {
        cartItem.quantity++;
    } else {
        cart.push({ ...product, quantity: 1 });
    }
    saveCart();
    updateCartUI();
    
    const cartBtn = document.getElementById('cartBtn');
    if(cartBtn) {
        cartBtn.style.transform = 'scale(1.2)';
        setTimeout(() => cartBtn.style.transform = 'scale(1)', 200);
    }
}

function updateCartUI() {
    const cartCount = document.getElementById('cartCount');
    const cartItems = document.getElementById('cartItems');
    const cartTotal = document.getElementById('cartTotal');

    if (!cartCount || !cartItems) return;

    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = totalItems;

    cartItems.innerHTML = cart.map(item => `
        <div class="cart-item">
            <div class="cart-item-info">
                <h3>${item.name}</h3>
                <p>₱${Number(item.price).toFixed(2)} × ${item.quantity}</p>
            </div>
            <div class="cart-item-actions">
                <button class="quantity-btn" onclick="updateQuantity(${item.id}, -1)">−</button>
                <span>${item.quantity}</span>
                <button class="quantity-btn" onclick="updateQuantity(${item.id}, 1)">+</button>
                <button class="remove-btn" onclick="removeFromCart(${item.id})">✕</button>
            </div>
        </div>
    `).join('');

    const total = cart.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0);
    if (cartTotal) cartTotal.textContent = '₱' + total.toFixed(2);
}

function updateQuantity(productId, change) {
    const item = cart.find(i => i.id === productId);
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) removeFromCart(productId);
        else {
            saveCart();
            updateCartUI();
        }
    }
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    saveCart();
    updateCartUI();
}

function saveCart() {
    localStorage.setItem('yankicks_cart', JSON.stringify(cart));
}

function filterProducts() {
    const category = document.getElementById('categoryFilter').value;
    const filtered = category === 'all' ? products : products.filter(p => p.category === category);
    displayProducts(filtered);
}

function sortProducts() {
    const sortValue = document.getElementById('priceFilter').value;
    let sorted = [...products]; 
    if (sortValue === 'low-high') sorted.sort((a, b) => a.price - b.price);
    else if (sortValue === 'high-low') sorted.sort((a, b) => b.price - a.price);
    displayProducts(sorted);
}

function handleContactForm(e) {
    e.preventDefault();
    alert('Thank you for your message! We will get back to you soon.');
    e.target.reset();
}

function loadCartPage() {
   // Logic for full view-cart.html if implemented
}

// ----------------------------------------------------------------------
// NEW: CHECKOUT & ORDERS LOGIC
// ----------------------------------------------------------------------

async function processCheckout() {
    const user = JSON.parse(localStorage.getItem('yankicks_user'));
    const cart = JSON.parse(localStorage.getItem('yankicks_cart'));

    if (!user) {
        alert('Please login to checkout.');
        window.location.href = 'login-register.html';
        return;
    }

    if (!cart || cart.length === 0) {
        alert('Your cart is empty.');
        return;
    }

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    try {
        const response = await fetch(`${API_URL}/checkout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: user.id,
                cart: cart,
                total: total,
                paymentMethod: 'Credit Card' // Can be dynamic from a form
            })
        });

        const data = await response.json();

        if (response.ok) {
            // Clear cart locally
            localStorage.removeItem('yankicks_cart');
            // Redirect to confirmation with Order ID
            window.location.href = `payment-confirmation.html?orderId=${data.orderId}`;
        } else {
            alert('Checkout failed: ' + JSON.stringify(data));
        }
    } catch (error) {
        console.error('Checkout Error:', error);
    }
}

async function loadOrderHistory() {
    const user = JSON.parse(localStorage.getItem('yankicks_user'));
    const container = document.getElementById('ordersListContainer');

    if (!user) {
        window.location.href = 'login-register.html';
        return;
    }

    try {
        const response = await fetch(`${API_URL}/orders/${user.id}`);
        const orders = await response.json();

        if (orders.length === 0) {
            container.innerHTML = '<p>You have no order history yet.</p>';
            return;
        }

        container.innerHTML = orders.map(order => `
            <div class="account-link-card" style="display:block; margin-bottom: 15px; text-align:left;">
                <div style="display:flex; justify-content:space-between;">
                    <h3>Order #${order.id}</h3>
                    <span style="color: green; font-weight:bold;">${order.status}</span>
                </div>
                <p>Date: ${new Date(order.order_date).toLocaleDateString()}</p>
                <p>Total: <strong>₱${order.total_amount}</strong></p>
                <p>Payment: ${order.payment_method}</p>
            </div>
        `).join('');

    } catch (error) {
        console.error('History Error:', error);
        container.innerHTML = '<p>Error loading orders.</p>';
    }
}

function loadOrderConfirmation() {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('orderId');
    
    if (orderId) {
        document.getElementById('displayOrderId').textContent = `YK-2024-${orderId}`;
    }
}