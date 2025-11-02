/**
 * 통일된 에러 처리 미들웨어
 */

// 커스텀 에러 클래스
class AppError extends Error {
    constructor(message, statusCode = 500) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

// 에러 처리 미들웨어
const errorHandler = (err, req, res, next) => {
    let statusCode = err.statusCode || 500;
    let message = err.message || "서버 오류가 발생했습니다.";

    // 데이터베이스 에러 처리
    if (err.code && err.code.startsWith("ER_")) {
        statusCode = 400;
        message = `데이터베이스 오류: ${err.sqlMessage || err.message}`;
    }

    // MariaDB 에러 처리
    if (err.errno) {
        statusCode = 400;
        message = err.sqlMessage || err.message;
    }

    // 응답 로깅 (개발 환경)
    if (process.env.NODE_ENV !== "production") {
        console.error("❌ 에러 발생:", {
            message: err.message,
            stack: err.stack,
            statusCode,
        });
    }

    // 에러 응답
    res.status(statusCode).json({
        success: false,
        error: message,
        ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
    });
};

// 404 처리 미들웨어
const notFoundHandler = (req, res, next) => {
    // DevTools 등에서 /.well-known/* 경로를 조회할 때는 조용히 무시
    if (req.originalUrl.startsWith("/.well-known/")) {
        return res.status(204).end();
    }

    const error = new AppError(
        `경로를 찾을 수 없습니다: ${req.originalUrl}`,
        404
    );
    next(error);
};

module.exports = {
    AppError,
    errorHandler,
    notFoundHandler,
};
