const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Database Connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'yankicks'
});

db.connect(err => {
    if (err) console.error('Error connecting to MySQL:', err);
    else console.log('Connected to MySQL database');
});

// --- API ROUTES ---

// 1. Fetch All Products
app.get('/api/products', (req, res) => {
    db.query('SELECT * FROM products', (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

// 2. Register New User
app.post('/api/register', (req, res) => {
    const { registerName, registerEmail, registerPassword } = req.body;
    const sql = 'INSERT INTO users (full_name, email, password) VALUES (?, ?, ?)';
    db.query(sql, [registerName, registerEmail, registerPassword], (err, result) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ message: 'Email already exists' });
            return res.status(500).json({ message: 'Database error', error: err });
        }
        res.status(201).json({ message: 'User registered successfully!' });
    });
});

// 3. NEW: Login User
app.post('/api/login', (req, res) => {
    const { loginEmail, loginPassword } = req.body;
    const sql = 'SELECT * FROM users WHERE email = ?';

    db.query(sql, [loginEmail], (err, results) => {
        if (err) return res.status(500).json({ message: 'Database error', error: err });
        
        // Check if user exists
        if (results.length === 0) return res.status(401).json({ message: 'Login failed: User not found.' });

        const user = results[0];
        
        // Check password (WARNING: Should use bcrypt.compare in production)
        if (user.password === loginPassword) {
            return res.status(200).json({ message: 'Login successful!', user: { id: user.id, name: user.full_name } });
        } else {
            return res.status(401).json({ message: 'Login failed: Incorrect password.' });
        }
    });
});

app.listen(3000, () => {
    console.log('Server running on port 3000');
});

// 4. NEW: Checkout (Save Order)
app.post('/api/checkout', (req, res) => {
    const { userId, cart, total, paymentMethod } = req.body;

    // 1. Insert into 'orders' table
    const orderSql = 'INSERT INTO orders (user_id, total_amount, payment_method) VALUES (?, ?, ?)';
    db.query(orderSql, [userId, total, paymentMethod || 'Credit Card'], (err, result) => {
        if (err) return res.status(500).json({ error: err });
        
        const orderId = result.insertId;

        // 2. Insert into 'order_items' table (Loop through cart)
        const itemSql = 'INSERT INTO order_items (order_id, product_name, price, quantity) VALUES ?';
        const itemsData = cart.map(item => [orderId, item.name, item.price, item.quantity]);

        db.query(itemSql, [itemsData], (err, result) => {
            if (err) return res.status(500).json({ error: err });
            res.json({ message: 'Order placed successfully', orderId: orderId });
        });
    });
});

// 5. NEW: Get User Orders (History)
app.get('/api/orders/:userId', (req, res) => {
    const userId = req.params.userId;
    const sql = `
        SELECT * FROM orders 
        WHERE user_id = ? 
        ORDER BY order_date DESC
    `;
    db.query(sql, [userId], (err, results) => {
        if (err) return res.status(500).json({ error: err });
        res.json(results);
    });
});