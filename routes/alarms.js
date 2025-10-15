const express = require("express");
const router = express.Router();
const pool = require("../db");

// ✅ 알람 등록
router.post("/", async (req, res) => {
    const { courses_id, message, alarm_time } = req.body;
    if (!courses_id || !message || !alarm_time) {
        return res
            .status(400)
            .json({ error: "courses_id, message, alarm_time 필요" });
    }

    let connection;
    try {
        connection = await pool.getConnection();

        const query = `
            INSERT INTO alarms (courses_id, message, alarm_time)
            VALUES (?, ?, ?)
        `;

        // ✅ mysql2/promise는 [result] 형태로 반환됨
        const [result] = await connection.query(query, [
            courses_id,
            message,
            alarm_time,
        ]);

        res.status(201).json({
            success: true,
            alarms_id: result.insertId,
            courses_id,
            message,
            alarm_time,
        });
    } catch (err) {
        console.error("❌ 알람 등록 실패:", err);
        res.status(500).json({ success: false, error: err.message });
    } finally {
        if (connection) connection.release();
    }
});

// ✅ 알람 조회 (코스별)
router.get("/courses/:courses_id", async (req, res) => {
    const { courses_id } = req.params;
    let connection;
    try {
        connection = await pool.getConnection();
        const rows = await connection.query(
            "SELECT alarms_id, courses_id, message, alarm_time, created_at FROM alarms WHERE courses_id=? ORDER BY alarm_time ASC",
            [courses_id]
        );
        res.json(rows); // INT라서 안전하게 배열 전송 가능
    } catch (err) {
        console.error("❌ 알람 조회 실패:", err);
        res.status(500).json({ error: err.message });
    } finally {
        if (connection) connection.release();
    }
});

// ✅ 알람 삭제
router.delete("/:alarms_id", async (req, res) => {
    const { alarms_id } = req.params;
    let connection;
    try {
        connection = await pool.getConnection();
        const result = await connection.query(
            "DELETE FROM alarms WHERE alarms_id=?",
            [alarms_id]
        );
        if (!result.affectedRows) {
            return res
                .status(404)
                .json({ error: "해당 알람을 찾을 수 없습니다." });
        }
        res.json({ message: "알람이 삭제되었습니다." });
    } catch (err) {
        console.error("❌ 알람 삭제 실패:", err);
        res.status(500).json({ error: err.message });
    } finally {
        if (connection) connection.release();
    }
});

module.exports = router;
