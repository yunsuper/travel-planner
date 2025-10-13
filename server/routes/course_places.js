const express = require("express");
const router = express.Router();
const pool = require("../db");

// ✅ 여러 장소 한 번에 저장
router.post("/bulk", async (req, res) => {
    let connection;
    const { courses_id, places } = req.body;

    if (!courses_id || isNaN(parseInt(courses_id, 10))) {
        return res
            .status(400)
            .json({ error: "유효한 courses_id가 필요합니다." });
    }
    if (!places || !Array.isArray(places) || places.length === 0) {
        return res
            .status(400)
            .json({ error: "유효한 places 배열이 필요합니다." });
    }
    if (places.some((id) => isNaN(parseInt(id, 10)))) {
        return res
            .status(400)
            .json({ error: "모든 places_id는 숫자여야 합니다." });
    }

    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const maxSeqResult = await connection.query(
            "SELECT MAX(sequence) AS maxSeq FROM course_places WHERE courses_id = ?",
            [courses_id]
        );
        const maxSeq = maxSeqResult[0]?.maxSeq || 0;

        const placeholders = places.map(() => "(?, ?, ?)").join(", ");
        const values = places.flatMap((placeId, i) => [
            courses_id,
            placeId,
            maxSeq + i + 1,
        ]);
        const insertQuery = `
            INSERT INTO course_places (courses_id, places_id, sequence)
            VALUES ${placeholders}
        `;
        console.log(
            "Executing bulk insert:",
            insertQuery,
            "with values:",
            values
        );
        const result = await connection.query(insertQuery, values);

        if (!result || !result.affectedRows) {
            await connection.rollback();
            return res.status(400).json({ error: "장소 추가에 실패했습니다." });
        }

        const rows = await connection.query(
            `
            SELECT cp.id, cp.courses_id, cp.places_id, p.name, p.latitude, p.longitude, cp.sequence
            FROM course_places cp
            INNER JOIN places p ON cp.places_id = p.places_id
            WHERE cp.courses_id = ?
            ORDER BY cp.sequence, cp.id
            `,
            [courses_id]
        );

        await connection.commit();
        res.json(Array.isArray(rows) ? rows : [rows]);
    } catch (err) {
        await connection.rollback();
        console.error("❌ bulk course_places 추가 실패:", {
            message: err.message,
            code: err.code,
            sqlMessage: err.sqlMessage,
        });
        res.status(500).json({
            error: `DB insert failed: ${err.sqlMessage || err.message}`,
        });
    } finally {
        if (connection) connection.release();
    }
});

// ✅ 코스별 장소 목록 조회
router.get("/courses/:courses_id", async (req, res) => {
    const { courses_id } = req.params;
    let connection;

    try {
        const courseId = parseInt(courses_id, 10);
        if (isNaN(courseId)) {
            return res
                .status(400)
                .json({ error: "유효하지 않은 courses_id입니다." });
        }

        connection = await pool.getConnection();
        const query = `
            SELECT cp.id, cp.courses_id, cp.places_id, p.name, p.latitude, p.longitude, cp.sequence
            FROM course_places cp
            INNER JOIN places p ON cp.places_id = p.places_id
            WHERE cp.courses_id = ?
            ORDER BY cp.sequence, cp.id
        `;
        console.log("Executing GET query:", query, "with courseId:", courseId);
        const rows = await connection.query(query, [courseId]);
        console.log("GET /course_places/courses/1 raw result:", rows);

        res.json(Array.isArray(rows) ? rows : [rows]);
    } catch (err) {
        console.error("❌ course_places 조회 실패:", {
            message: err.message,
            code: err.code,
            sqlMessage: err.sqlMessage,
        });
        res.status(500).json({
            error: `DB query failed: ${err.sqlMessage || err.message}`,
        });
    } finally {
        if (connection) connection.release();
    }
});

// ✅ 단일 코스 삭제 (places_id 기준)
router.delete("/places/:places_id", async (req, res) => {
    const { places_id } = req.params;
    let connection;

    try {
        const placeId = parseInt(places_id, 10);
        if (isNaN(placeId)) {
            return res
                .status(400)
                .json({ error: "유효하지 않은 places_id입니다." });
        }

        connection = await pool.getConnection();
        console.log(
            "Executing DELETE query: DELETE FROM course_places WHERE places_id =",
            placeId,
            "AND courses_id = 1"
        );
        const result = await connection.query(
            "DELETE FROM course_places WHERE places_id = ? AND courses_id = 1",
            [placeId]
        );
        console.log("DELETE result:", result);

        if (!result || !result.affectedRows) {
            return res
                .status(404)
                .json({ error: "해당 장소를 찾을 수 없습니다." });
        }

        const rows = await connection.query(
            `
            SELECT cp.id, cp.courses_id, cp.places_id, p.name, p.latitude, p.longitude, cp.sequence
            FROM course_places cp
            INNER JOIN places p ON cp.places_id = p.places_id
            WHERE cp.courses_id = 1
            ORDER BY cp.sequence, cp.id
            `,
            []
        );
        res.json({
            message: "장소가 삭제되었습니다.",
            places: Array.isArray(rows) ? rows : [rows],
        });
    } catch (err) {
        console.error("❌ course_places 삭제 실패:", {
            message: err.message,
            code: err.code,
            sqlMessage: err.sqlMessage,
        });
        res.status(500).json({
            error: `DB delete failed: ${err.sqlMessage || err.message}`,
        });
    } finally {
        if (connection) connection.release();
    }
});

module.exports = router;
