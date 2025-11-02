const express = require("express");
const router = express.Router();
const pool = require("../db");
const { coursePlacesValidators } = require("../middleware/validator");
const { AppError } = require("../middleware/errorHandler");
const { stringifyBigInt } = require("../utils/bigIntHandler");

// ✅ 여러 장소 한 번에 저장
router.post("/bulk", coursePlacesValidators.bulkCreate, async (req, res, next) => {
    let connection;
    const { courses_id, places } = req.body;

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
        const result = await connection.query(insertQuery, values);

        if (!result || !result.affectedRows) {
            await connection.rollback();
            throw new AppError("장소 추가에 실패했습니다.", 400);
        }

        const rows = await connection.query(
            `
            SELECT cp.id, cp.courses_id, cp.places_id, p.name, p.address, p.latitude, p.longitude, cp.sequence
            FROM course_places cp
            INNER JOIN places p ON cp.places_id = p.places_id
            WHERE cp.courses_id = ?
            ORDER BY cp.sequence, cp.id
            `,
            [courses_id]
        );

        await connection.commit();
        res.json(stringifyBigInt(Array.isArray(rows) ? rows : [rows]));
    } catch (err) {
        if (connection) await connection.rollback();
        next(err);
    } finally {
        if (connection) connection.release();
    }
});

// ✅ 코스별 장소 목록 조회
router.get("/courses/:courses_id", coursePlacesValidators.getByCourseId, async (req, res, next) => {
    let connection;
    const courseId = parseInt(req.params.courses_id, 10);

    try {
        connection = await pool.getConnection();
        const query = `
            SELECT cp.id, cp.courses_id, cp.places_id, p.name, p.address, p.latitude, p.longitude, cp.sequence
            FROM course_places cp
            INNER JOIN places p ON cp.places_id = p.places_id
            WHERE cp.courses_id = ?
            ORDER BY cp.sequence, cp.id
        `;
        const rows = await connection.query(query, [courseId]);

        res.json(stringifyBigInt(Array.isArray(rows) ? rows : [rows]));
    } catch (err) {
        next(err);
    } finally {
        if (connection) connection.release();
    }
});

// ✅ 단일 코스 삭제 (places_id 기준)
router.delete("/places/:places_id", coursePlacesValidators.deleteByPlaceId, async (req, res, next) => {
    let connection;
    const placeId = parseInt(req.params.places_id, 10);

    try {
        connection = await pool.getConnection();
        const result = await connection.query(
            "DELETE FROM course_places WHERE places_id = ? AND courses_id = 1",
            [placeId]
        );

        if (!result || !result.affectedRows) {
            throw new AppError("해당 장소를 찾을 수 없습니다.", 404);
        }

        const rows = await connection.query(
            `
            SELECT cp.id, cp.courses_id, cp.places_id, p.name, p.address, p.latitude, p.longitude, cp.sequence
            FROM course_places cp
            INNER JOIN places p ON cp.places_id = p.places_id
            WHERE cp.courses_id = 1
            ORDER BY cp.sequence, cp.id
            `,
            []
        );
        res.json(
            stringifyBigInt({
                message: "장소가 삭제되었습니다.",
                places: Array.isArray(rows) ? rows : [rows],
            })
        );
    } catch (err) {
        next(err);
    } finally {
        if (connection) connection.release();
    }
});

// ✅ 임시 장소를 DB에 등록 후 코스에 추가
router.post("/add-temp", coursePlacesValidators.addTemp, async (req, res, next) => {
    let connection;
    const { courses_id, name, address, latitude, longitude } = req.body;

    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // 1. places 테이블에 새 장소 추가
        const insertPlaceQuery =
            "INSERT INTO places (name, address, latitude, longitude) VALUES (?, ?, ?, ?)";
        const resultArr = await connection.query(insertPlaceQuery, [
            name,
            address,
            latitude,
            longitude,
        ]);
        const result = Array.isArray(resultArr) ? resultArr[0] : resultArr;
        const newPlaceId = result.insertId;

        // 2. course_places에 코스와 연결
        const maxSeqArr = await connection.query(
            "SELECT MAX(sequence) AS maxSeq FROM course_places WHERE courses_id = ?",
            [courses_id]
        );
        const maxSeqResult = Array.isArray(maxSeqArr)
            ? maxSeqArr[0]
            : maxSeqArr;
        const maxSeq = maxSeqResult[0]?.maxSeq || 0;

        await connection.query(
            "INSERT INTO course_places (courses_id, places_id, sequence) VALUES (?, ?, ?)",
            [courses_id, newPlaceId, maxSeq + 1]
        );

        await connection.commit();

        res.json({
            message: "새로운 장소가 코스에 추가되었습니다.",
            places_id: newPlaceId.toString(),
        });
    } catch (err) {
        if (connection) await connection.rollback();
        next(err);
    } finally {
        if (connection) connection.release();
    }
});

module.exports = router;
