// INTENTIONALLY VULNERABLE CODE - FOR EDUCATIONAL PURPOSES ONLY
const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const { exec } = require("child_process");
const crypto = require("crypto");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// VULNERABILITY #1: Hardcoded credentials
const db = new sqlite3.Database(":memory:");
const API_KEY = "sk_live_12345_hardcoded_secret_key";
const ADMIN_PASSWORD = "admin123";

// Initialize database
db.serialize(() => {
  db.run(
    "CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT, email TEXT, password TEXT, role TEXT)"
  );
  db.run(
    "CREATE TABLE posts (id INTEGER PRIMARY KEY, user_id INTEGER, title TEXT, content TEXT)"
  );

  // Insert sample data
  db.run(
    "INSERT INTO users VALUES (1, 'admin', 'admin@example.com', 'e99a18c428cb38d5f260853678922e03', 'admin')"
  );
  db.run(
    "INSERT INTO users VALUES (2, 'john', 'john@example.com', '098f6bcd4621d373cade4e832627b4f6', 'user')"
  );
  db.run("INSERT INTO posts VALUES (1, 1, 'Welcome', 'Welcome to our site')");
});

// VULNERABILITY #2: SQL Injection in login
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  // VULNERABLE: String concatenation allows SQL injection
  const query = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;

  db.get(query, (err, user) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (user) {
      res.json({ message: "Login successful", user });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  });
});

// VULNERABILITY #3: Cross-Site Scripting (XSS)
app.get("/search", (req, res) => {
  const searchTerm = req.query.q;

  // VULNERABLE: Directly embedding user input without escaping
  const html = `
    <html>
      <body>
        <h1>Search Results for: ${searchTerm}</h1>
        <p>You searched for: ${searchTerm}</p>
      </body>
    </html>
  `;

  res.send(html);
});

// VULNERABILITY #4: Insecure Direct Object Reference
app.get("/user/:id", (req, res) => {
  const userId = req.params.id;

  // VULNERABLE: No authorization check - any user can access any profile
  db.get(`SELECT * FROM users WHERE id = ?`, [userId], (err, user) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(user);
  });
});

// VULNERABILITY #5: Command Injection
app.post("/ping", (req, res) => {
  const host = req.body.host;

  // VULNERABLE: Unsanitized user input in system command
  exec(`ping -c 3 ${host}`, (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    res.json({ output: stdout });
  });
});

// VULNERABILITY #6: Weak password hashing (MD5)
app.post("/register", (req, res) => {
  const { username, email, password } = req.body;

  // VULNERABLE: MD5 is cryptographically broken
  const hashedPassword = crypto
    .createHash("md5")
    .update(password)
    .digest("hex");

  const query = `INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, 'user')`;

  db.run(query, [username, email, hashedPassword], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: "User registered", id: this.lastID });
  });
});

// VULNERABILITY #7: Missing input validation
app.post("/update-profile", (req, res) => {
  const { userId, email, bio } = req.body;

  // VULNERABLE: No validation of email format, bio length, or user authorization
  db.run(`UPDATE users SET email = '${email}' WHERE id = ${userId}`, (err) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: "Profile updated" });
  });
});

// VULNERABILITY #8: Exposed sensitive information
app.get("/debug", (req, res) => {
  // VULNERABLE: Exposing environment and system information
  res.json({
    env: process.env,
    api_key: API_KEY,
    admin_password: ADMIN_PASSWORD,
    node_version: process.version,
    platform: process.platform,
  });
});

// DEMO HELPER: View database contents
app.get("/admin/view-db", (req, res) => {
  const results = {};

  db.all("SELECT * FROM users", [], (err, users) => {
    if (err) return res.status(500).json({ error: err.message });
    results.users = users;

    db.all("SELECT * FROM posts", [], (err, posts) => {
      if (err) return res.status(500).json({ error: err.message });
      results.posts = posts;

      res.json({
        message: "Database contents",
        tables: results,
      });
    });
  });
});

const PORT = 3002;
app.listen(PORT, () => {
  console.log(`Vulnerable demo app running on port ${PORT}`);
  console.log(
    "WARNING: This app contains intentional security vulnerabilities"
  );
});
