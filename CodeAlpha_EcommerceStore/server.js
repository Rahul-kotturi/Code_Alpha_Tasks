import express from 'express';
import session from 'express-session';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import db from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: 'codealpha-secret-key',
    resave: false,
    saveUninitialized: true
}));

// HTML Routes
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'views', 'index.html')));
app.get('/product', (req, res) => res.sendFile(path.join(__dirname, 'views', 'product.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'views', 'login.html')));
app.get('/cart', (req, res) => res.sendFile(path.join(__dirname, 'views' , 'cart.html')));
// --- API Endpoints ---

// Get all products
// Get all products (With optional search query filter)
app.get('/api/products', (req, res) => {
    const search = req.query.search;
    if (search) {
        db.all("SELECT * FROM products WHERE name LIKE ? OR description LIKE ?", [`%${search}%`, `%${search}%`], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
    } else {
        db.all("SELECT * FROM products", [], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
    }
});

// Get single product details
app.get('/api/products/:id', (req, res) => {
    db.get("SELECT * FROM products WHERE id = ?", [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(row);
    });
});

// User Registration
app.post('/api/register', (req, res) => {
    const { username, password } = req.body;
    const hashedPassword = bcrypt.hashSync(password, 10);
    db.run("INSERT INTO users (username, password) VALUES (?, ?)", [username, hashedPassword], function(err) {
        if (err) return res.status(400).json({ error: "Username already exists." });
        res.json({ message: "Registration successful!" });
    });
});

// User Login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
        if (err || !user || !bcrypt.compareSync(password, user.password)) {
            return res.status(401).json({ error: "Invalid credentials" });
        }
        req.session.userId = user.id;
        req.session.username = user.username;
        res.json({ message: "Login successful!", user: user.username });
    });
});

// Get Current User Session
app.get('/api/session', (req, res) => {
    if (req.session.userId) {
        res.json({ loggedIn: true, username: req.session.username });
    } else {
        res.json({ loggedIn: false });
    }
});

// Logout
app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ message: "Logged out" });
});

// Checkout / Order Processing
app.post('/api/orders', (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: "Please log in to place an order." });
    
    const { total, items } = req.body;
    db.run("INSERT INTO orders (user_id, total_price, items) VALUES (?, ?, ?)", 
        [req.session.userId, total, JSON.stringify(items)], 
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Order placed successfully!", orderId: this.lastID });
        }
    );
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));