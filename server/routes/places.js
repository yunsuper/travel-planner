const express = require("express");
const router = express.Router();
const pool = require("../db");
const { AppError } = require("../middleware/errorHandler");

router.get("/", async (req, res, next) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const rows = await connection.query("SELECT * FROM places");
    res.json(rows);
  } catch (err) {
    next(err);
  } finally {
    if (connection) connection.release();
  }
});

module.exports = router;
