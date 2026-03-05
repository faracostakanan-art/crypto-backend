require("dotenv").config();
const express = require("express");
const { Pool } = require("pg");
const { ethers } = require("ethers");

const app = express();
app.use(express.json());

/* =========================
   DATABASE
========================= */

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      eth_address TEXT UNIQUE NOT NULL,
      balance NUMERIC DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS deposits (
      id SERIAL PRIMARY KEY,
      tx_hash TEXT UNIQUE NOT NULL,
      user_id INTEGER REFERENCES users(id),
      amount NUMERIC,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
}

initDB();

/* =========================
   WALLET MASTER (HD)
========================= */

if (!process.env.MASTER_SEED) {
  console.error("MASTER_SEED missing");
  process.exit(1);
}

const masterWallet = ethers.HDNodeWallet.fromPhrase(process.env.MASTER_SEED);

/* =========================
   CREATE USER
========================= */

app.post("/register", async (req, res) => {
  const { email } = req.body;

  if (!email) return res.status(400).json({ error: "Email required" });

  const countResult = await pool.query("SELECT COUNT(*) FROM users");
  const index = parseInt(countResult.rows[0].count);

  const child = masterWallet.derivePath(`m/44'/60'/0'/0/${index}`);
  const address = child.address;

  try {
    const result = await pool.query(
      "INSERT INTO users(email, eth_address) VALUES($1,$2) RETURNING *",
      [email, address]
    );

    res.json({
      success: true,
      deposit_address: address
    });
  } catch (err) {
    res.status(400).json({ error: "User exists" });
  }
});

/* =========================
   WEBHOOK (ALCHEMY)
========================= */

app.post("/webhook", async (req, res) => {
  const data = req.body;

  if (!data.event) return res.sendStatus(200);

  const tx = data.event.activity?.[0];
  if (!tx) return res.sendStatus(200);

  const toAddress = tx.toAddress?.toLowerCase();
  const amount = parseFloat(tx.value);

  const userResult = await pool.query(
    "SELECT * FROM users WHERE LOWER(eth_address) = $1",
    [toAddress]
  );

  if (userResult.rows.length === 0) return res.sendStatus(200);

  const user = userResult.rows[0];

  try {
    await pool.query(
      "INSERT INTO deposits(tx_hash, user_id, amount) VALUES($1,$2,$3)",
      [tx.hash, user.id, amount]
    );

    await pool.query(
      "UPDATE users SET balance = balance + $1 WHERE id = $2",
      [amount, user.id]
    );

    console.log("Deposit credited:", amount);
  } catch (e) {
    console.log("Already processed");
  }

  res.sendStatus(200);
});

/* =========================
   CHECK BALANCE
========================= */

app.get("/balance/:email", async (req, res) => {
  const result = await pool.query(
    "SELECT balance FROM users WHERE email = $1",
    [req.params.email]
  );

  if (result.rows.length === 0)
    return res.status(404).json({ error: "Not found" });

  res.json({ balance: result.rows[0].balance });
});

/* ========================= */

app.get("/", (req, res) => {
  res.send("Backend production running");
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Server started");
});
