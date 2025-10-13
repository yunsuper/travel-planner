const express = require("express");
const router = express.Router();
const pool = require("../db");

// 특정 코스 일정 조회
router.get("/courses/:courseId", async (req, res) => {
    const { courseId } = req.params;

    try {
        const conn = await pool.getConnection();
        const rows = await conn.query(
            "SELECT * FROM schedules WHERE courses_id = ?",
            [req.params.courseId]
        );
        conn.release();
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
