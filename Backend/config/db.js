const path = require("path");
const mysql = require("mysql2");

require("dotenv").config({ path: path.join(__dirname, "..", ".env"), override: true });

const db = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password:
    process.env.DB_PASSWORD !== undefined && process.env.DB_PASSWORD !== null
      ? String(process.env.DB_PASSWORD)
      : "",
  database: process.env.DB_NAME || "furniture_billing",
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONN_LIMIT || 10),
  queueLimit: Number(process.env.DB_QUEUE_LIMIT || 0),
  connectTimeout: 15000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  dateStrings: true,
});

db.getConnection((err, connection) => {
  if (err) {
    console.error("DB Error:", err.message || err);
    console.error("Please verify that MySQL (XAMPP) is running on port " + (process.env.DB_PORT || 3306));
  } else {
    console.log(`MySQL Connected to database: ${process.env.DB_NAME || "furniture_billing"}`);
    connection.release();
  }
});

module.exports = db;
