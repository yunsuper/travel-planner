const express = require("express");
const router = express.Router();
const pool = require("../db");
const { alarmsValidators } = require("../middleware/validator");
const { AppError } = require("../middleware/errorHandler");
const { stringifyBigInt } = require("../utils/bigintHandler");

const toMysqlDateTime = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        throw new AppError("유효한 알람 시간이 필요합니다.", 400);
    }

    const pad = (n) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
        date.getDate()
    )} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(
        date.getSeconds()
    )}`;
};

// ✅ 알람 등록
router.post("/", alarmsValidators.create, async (req, res, next) => {
    let connection;
    const { courses_id, message, alarm_time } = req.body;

    try {
        connection = await pool.getConnection();

        const query = `
            INSERT INTO alarms (courses_id, message, alarm_time)
            VALUES (?, ?, ?)
        `;

        const normalizedTime = toMysqlDateTime(alarm_time);

        const result = await connection.query(query, [
            courses_id,
            message,
            normalizedTime,
        ]);

        res.status(201).json(
            stringifyBigInt({
                success: true,
                alarms_id: result.insertId,
                courses_id,
                message,
                alarm_time: normalizedTime,
            })
        );
    } catch (err) {
        next(err);
    } finally {
        if (connection) connection.release();
    }
});

// ✅ 알람 조회 (코스별)
router.get(
    "/courses/:courses_id",
    alarmsValidators.getByCourseId,
    async (req, res, next) => {
        let connection;
        const courses_id = parseInt(req.params.courses_id, 10);

        try {
            connection = await pool.getConnection();
            const rows = await connection.query(
                "SELECT alarms_id, courses_id, message, alarm_time, created_at FROM alarms WHERE courses_id=? ORDER BY alarm_time ASC",
                [courses_id]
            );
            res.json(stringifyBigInt(rows));
        } catch (err) {
            next(err);
        } finally {
            if (connection) connection.release();
        }
    }
);

// ✅ 알람 삭제
router.delete(
    "/:alarms_id",
    alarmsValidators.delete,
    async (req, res, next) => {
        let connection;
        const alarms_id = parseInt(req.params.alarms_id, 10);

        try {
            connection = await pool.getConnection();
            const result = await connection.query(
                "DELETE FROM alarms WHERE alarms_id=?",
                [alarms_id]
            );
            if (!result.affectedRows) {
                throw new AppError("해당 알람을 찾을 수 없습니다.", 404);
            }
            res.json({ message: "알람이 삭제되었습니다." });
        } catch (err) {
            next(err);
        } finally {
            if (connection) connection.release();
        }
    }
);

module.exports = router;
