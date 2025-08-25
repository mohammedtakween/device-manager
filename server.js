const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
const PORT = 3000;
const JWT_SECRET = 'your_jwt_secret_key'; // Replace with a strong, unique secret key

app.use(express.json());
app.use(express.static(path.join(__dirname)));

const db = new sqlite3.Database('./devices.db', (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        db.run(`CREATE TABLE IF NOT EXISTS devices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customerName TEXT NOT NULL,
            deviceName TEXT NOT NULL,
            amount REAL NOT NULL,
            date TEXT NOT NULL,
            status TEXT NOT NULL,
            userId INTEGER,
            FOREIGN KEY (userId) REFERENCES users(id)
        )`, (err) => {
            if (err) {
                console.error('Error creating devices table:', err.message);
            }
        });

        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL
        )`, (err) => {
            if (err) {
                console.error('Error creating users table:', err.message);
            }
        });
    }
});

// User Registration
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        db.run(`INSERT INTO users (username, password) VALUES (?, ?)`, 
            [username, hashedPassword], 
            function(err) {
                if (err) {
                    if (err.message.includes('UNIQUE constraint failed')) {
                        return res.status(409).json({ message: 'Username already exists' });
                    }
                    return res.status(500).json({ message: err.message });
                }
                res.status(201).json({ message: 'User registered successfully', userId: this.lastID });
            }
        );
    } catch (error) {
        res.status(500).json({ message: 'Server error during registration' });
    }
});

// User Login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
    }

    db.get(`SELECT * FROM users WHERE username = ?`, [username], async (err, user) => {
        if (err) {
            return res.status(500).json({ message: err.message });
        }
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        try {
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(400).json({ message: 'Invalid credentials' });
            }

            const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '1h' });
            res.json({ message: 'Logged in successfully', token });
        } catch (error) {
            res.status(500).json({ message: 'Server error during login' });
        }
    });
});

// Middleware to protect routes
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) return res.sendStatus(401); // No token

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403); // Invalid token
        req.user = user;
        next();
    });
};

// Apply authentication middleware to device routes
app.use('/api/devices', authenticateToken);

// Get all devices
app.get('/api/devices', (req, res) => {
    const userId = req.user.id;
    db.all('SELECT * FROM devices WHERE userId = ?', [userId], (err, rows) => {
        if (err) {
            return res.status(500).json({ message: err.message });
        }
        res.json(rows);
    });
});

// Add a new device
app.post('/api/devices', (req, res) => {
    const userId = req.user.id;
    const { customerName, deviceName, amount, date, status } = req.body;

    db.run(`INSERT INTO devices (customerName, deviceName, amount, date, status, userId) VALUES (?, ?, ?, ?, ?, ?)`, [
        customerName,
        deviceName,
        amount,
        date,
        status,
        userId
    ], function(err) {
        if (err) {
            return res.status(500).json({ message: err.message });
        }
        res.status(201).json({ id: this.lastID, customerName, deviceName, amount, date, status });
    });
});

// Update a device
app.put('/api/devices/:id', (req, res) => {
    const userId = req.user.id;
    const deviceId = req.params.id;
    const { customerName, deviceName, amount, date, status } = req.body;
    db.run(`UPDATE devices SET customerName = ?, deviceName = ?, amount = ?, date = ?, status = ? WHERE id = ? AND userId = ?`,
        [customerName, deviceName, amount, date, status, deviceId, userId],
        function(err) {
            if (err) {
                return res.status(500).json({ message: err.message });
            }
            if (this.changes === 0) {
                return res.status(404).json({ message: 'Device not found' });
            }
            res.json({ id: deviceId, customerName, deviceName, amount, date, status });
        }
    );
});

// Delete a device
app.delete('/api/devices/:id', (req, res) => {
    const userId = req.user.id;
    const deviceId = req.params.id;
    db.run(`DELETE FROM devices WHERE id = ? AND userId = ?`, [req.params.id, userId], function(err) {
        if (err) {
            return res.status(500).json({ message: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ message: 'Device not found' });
        }
        res.status(204).send();
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('SIGINT signal received: closing SQLite connection.');
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err.message);
        } else {
            console.log('SQLite connection closed.');
        }
        process.exit(0);
    });
});

process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing SQLite connection.');
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err.message);
        } else {
            console.log('SQLite connection closed.');
        }
        process.exit(0);
    });
});