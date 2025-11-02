const express = require("express");
const router = express.Router();
const pool = require("../db");
const { schedulesValidators } = require("../middleware/validator");
const { AppError } = require("../middleware/errorHandler");

// 특정 코스 일정 조회
router.get("/courses/:courseId", schedulesValidators.getByCourseId, async (req, res, next) => {
    let connection;
    const courseId = parseInt(req.params.courseId, 10);

    try {
        connection = await pool.getConnection();
        const rows = await connection.query(
            "SELECT * FROM schedules WHERE courses_id = ?",
            [courseId]
        );
        res.json(rows);
    } catch (err) {
        next(err);
    } finally {
        if (connection) connection.release();
    }
});

module.exports = router;
