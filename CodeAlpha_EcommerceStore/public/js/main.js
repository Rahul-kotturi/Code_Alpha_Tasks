document.addEventListener("DOMContentLoaded", () => {
    checkSession();
    if (document.getElementById("product-grid")) {
        loadProducts();
    }
    // Global listener to close profile dropdown if clicking outside of it
    window.addEventListener('click', (e) => {
        if (!e.target.matches('.profile-btn')) {
            const dropdowns = document.getElementsByClassName("dropdown-content");
            for (let i = 0; i < dropdowns.length; i++) {
                dropdowns[i].classList.remove('show');
            }
        }
    });
});

// Manage Session Check and Inject Profile UI with Click Event Support
function checkSession() {
    fetch('/api/session')
        .then(res => res.json())
        .then(data => {
            const navActions = document.getElementById("nav-actions-container");
            if (!navActions) return;

            let authHtml = '';
            if (data.loggedIn) {
                authHtml = `
                    <div class="profile-dropdown">
                        <button class="profile-btn" onclick="toggleProfileDropdown(event)">👤 My Profile</button>
                        <div id="profileDropdownContent" class="dropdown-content">
                            <p><strong>Account User:</strong><br>${data.username}</p>
                            <a href="#" onclick="viewOrderHistory(event)">📋 View Orders</a>
                            <a href="#">⚙️ Settings</a>
                            <button onclick="logout()">Logout Account</button>
                        </div>
                    </div>
                `;
            } else {
                authHtml = `<a href="/login" style="color:white; text-decoration:none; font-weight:600;">Login / Register</a>`;
            }
            
            navActions.innerHTML = `
                <button class="cart-btn" onclick="window.location.href='/cart'">🛒 Shopping Cart (<span id="cart-count">0</span>)</button>
                ${authHtml}
            `;
            updateCartCounterOnly();
        });
}

// Explicit Click Trigger Toggle for Profile Dropdown Menu
function toggleProfileDropdown(event) {
    event.stopPropagation(); // Prevents the global window listener from instantly shutting it
    document.getElementById("profileDropdownContent").classList.toggle("show");
}

// Fetch all available products with live search filter support
function loadProducts(searchQuery = '') {
    const url = searchQuery ? `/api/products?search=${encodeURIComponent(searchQuery)}` : '/api/products';
    
    fetch(url)
        .then(res => res.json())
        .then(products => {
            const grid = document.getElementById("product-grid");
            if (!grid) return;
            if (products.length === 0) {
                grid.innerHTML = `<p style="grid-column: 1/-1; text-align:center; padding: 2rem; color: #777;">No matching products found.</p>`;
                return;
            }
            grid.innerHTML = products.map(p => `
                <div class="card">
                    <img src="${p.image_url}" alt="${p.name}">
                    <h3>${p.name}</h3>
                    <div class="rating-stars">★ ${p.rating || 4.5} <span style="color:#777; font-size:0.75rem;">(${p.review_count || 12})</span></div>
                    <p style="margin-top:0.5rem;">$${p.price.toFixed(2)}</p>
                    <a href="/product?id=${p.id}">View Details</a><br>
                    <button onclick="addToCart(${p.id}, '${p.name.replace(/'/g, "\\'")}', ${p.price}, '${p.image_url.trim()}', ${p.rating || 4.5})">Add to Cart</button>
                </div>
            `).join('');
        });
}

function handleSearch(event) {
    event.preventDefault();
    const query = document.getElementById("search-input").value;
    loadProducts(query);
}

// Local Storage Core Cart logic
function addToCart(id, name, price, imageUrl, rating) {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    const existing = cart.find(item => item.id === id);
    if (existing) {
        existing.quantity++;
    } else {
        cart.push({ id, name, price, imageUrl, rating, quantity: 1 });
    }
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCounterOnly();
    alert(`Added ${name} to your cart!`);
}

function updateCartCounterOnly() {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    const countSpan = document.getElementById("cart-count");
    if (countSpan) {
        countSpan.innerText = cart.reduce((sum, item) => sum + item.quantity, 0);
    }
}

// Dedicated Page Cart Array UI Builder (Runs on cart.html)
function updateCartPageUI() {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    updateCartCounterOnly();

    const pageItemsTarget = document.getElementById("cart-page-items");
    if (!pageItemsTarget) return; 
    
    let total = 0;
    if (cart.length === 0) {
        pageItemsTarget.innerHTML = `
            <div style="text-align:center; padding: 4rem; background:white; border-radius:8px; border:1px dashed #ccc;">
                <p style="font-size:1.2rem; color:#555;">Your basket feels lonely. Let's add items!</p><br>
                <a href="/" class="button" style="background-color:#007bff; color:white; padding:0.6rem 1.2rem; text-decoration:none; border-radius:4px;">Browse Catalog</a>
            </div>`;
    } else {
        pageItemsTarget.innerHTML = cart.map(item => {
            total += item.price * item.quantity;
            return `
                <div class="page-cart-row">
                    <img src="${item.imageUrl || 'https://via.placeholder.com/90'}" alt="${item.name}">
                    <div class="page-cart-info-block">
                        <h4>${item.name}</h4>
                        <div class="rating-stars">★ ${item.rating || 4.5}</div>
                        <div class="page-cart-meta-metrics">
                            <span><strong>Unit Price:</strong> $${item.price.toFixed(2)}</span>
                            <span><strong>Quantity:</strong> ${item.quantity}</span>
                            <span><strong>Total:</strong> $${(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                    </div>
                    <button onclick="removePageCartItem(${item.id})" style="background-color:#dc3545; padding:0.4rem 0.8rem; font-size:0.85rem;">Delete</button>
                </div>
            `;
        }).join('');
    }

    const totalTarget = document.getElementById("cart-total");
    if (totalTarget) totalTarget.innerText = total.toFixed(2);
}

function removePageCartItem(id) {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    cart = cart.filter(item => item.id !== id);
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartPageUI();
}

// Processes Orders, Generates History Records dynamically
function checkout() {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    let total = parseFloat(document.getElementById("cart-total").innerText);

    if (cart.length === 0) return alert("Your cart is empty!");

    fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ total, items: cart })
    })
    .then(res => res.json())
    .then(data => {
        if (data.error) {
            alert(data.error);
            if(data.error.includes("log in")) window.location.href = '/login';
        } else {
            const orderId = `#${Math.floor(Math.random() * 90000) + 10000}`;
            let itemSummary = cart.map(item => `• ${item.name} (Qty: ${item.quantity}) - $${(item.price * item.quantity).toFixed(2)}`).join('\n');
            
            // Save the newly completed order directly into LocalStorage History
            let orderHistory = JSON.parse(localStorage.getItem('orderHistory')) || [];
            orderHistory.push({
                id: orderId,
                date: new Date().toLocaleDateString(),
                total: total.toFixed(2),
                summary: itemSummary
            });
            localStorage.setItem('orderHistory', JSON.stringify(orderHistory));

            // Alert Invoice
            alert(`🎉 ORDER CONFIRMED SUCCESSFULLY!\n\nOrder ID: ${orderId}\n\nProducts Ordered:\n${itemSummary}\n\nFinal Bill Amount: $${total.toFixed(2)}\n\nThank you for shopping with CodeAlpha!`);
            
            localStorage.removeItem('cart');
            window.location.href = '/';
        }
    });
}

// Pulls and lists order details saved in localStorage history logs
function viewOrderHistory(event) {
    event.preventDefault();
    let orderHistory = JSON.parse(localStorage.getItem('orderHistory')) || [];
    
    if (orderHistory.length === 0) {
        alert("📋 ORDER HISTORY\n\nYou haven't placed any orders yet!");
    } else {
        let historyString = orderHistory.map((order, idx) => 
            `${idx + 1}. Order ID: ${order.id}\n   Date: ${order.date}\n   Items:\n${order.summary}\n   Total Paid: $${order.total}\n`
        ).join('\n---------------------------------------\n\n');
        
        alert(`📋 YOUR SECURED ACCOUNT ORDER HISTORY\n\n${historyString}`);
    }
}

function handleAuth(type) {
    const username = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    fetch(`/api/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    })
    .then(res => res.json())
    .then(data => {
        if (data.error) alert(data.error);
        else {
            alert(data.message);
            window.location.href = '/';
        }
    });
}

function logout() {
    fetch('/api/logout', { method: 'POST' })
        .then(() => window.location.reload());
}