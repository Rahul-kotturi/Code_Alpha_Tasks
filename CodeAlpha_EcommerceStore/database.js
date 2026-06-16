import sqlite3 from 'sqlite3';
import bcrypt from 'bcryptjs';

const db = new sqlite3.Database('./ecommerce.db', (err) => {
    if (err) console.error(err.message);
    else console.log('Connected to the SQLite database.');
});

db.serialize(() => {
    // Users Table
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT
    )`);

    // Products Table (Includes rating and review_count columns)
    db.run(`CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        price REAL,
        description TEXT,
        image_url TEXT,
        rating REAL DEFAULT 4.5,
        review_count INTEGER DEFAULT 12
    )`);

    // Orders Table
    db.run(`CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        total_price REAL,
        items TEXT,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    // Insert dummy user if not exists (Password: password123)
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync('password123', salt);
    db.run(`INSERT OR IGNORE INTO users (id, username, password) VALUES (1, 'intern@codealpha.com', '${hashedPassword}')`);

    // Check product count and load expanded catalog items if empty
    db.get("SELECT COUNT(*) as count FROM products", [], (err, row) => {
        if (row.count === 0) {
            const stmt = db.prepare("INSERT INTO products (name, price, description, image_url, rating, review_count) VALUES (?, ?, ?, ?, ?, ?)");
            
            stmt.run("Minimalist Watch", 129.99, "A sleek, classic timepiece for daily wear.", "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500", 4.8, 24);
            stmt.run("Wireless Headphones", 89.99, "High-quality sound with active noise cancellation.", "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500", 4.5, 89);
            stmt.run("Leather Backpack", 59.99, "Durable and spacious leather bag perfect for laptops.", "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500", 4.2, 45);
            stmt.run("Mechanical Keyboard", 110.00, "Tactile RGB mechanical keyboard with custom switches.", "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=500", 4.7, 56);
            stmt.run("Classic Sunglasses", 35.50, "Polarized retro sunglasses with UV400 protective lenses.", "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=500", 4.4, 112);
            stmt.run("4K Action Camera", 199.99, "Waterproof sports camera with ultra-smooth stabilization.", "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=500", 4.6, 73);
            stmt.run("Ceramic Coffee Mug", 18.00, "Ergonomic minimalist mug designed to retain warmth.", "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500", 4.9, 19);
            stmt.run("Realme 11x 5g", 11999.99, "6GB/128GB RAM\n 50MP megapixels Front Camera\n 5MP Rear Camera.", "https://media.tatacroma.com/Croma%20Assets/Communication/Mobiles/Images/300086_0_yjvqka.png",4.5,80);
            stmt.finalize();
            console.log("Expanded catalog successfully injected into the database!");
        }
    });
});

export default db;