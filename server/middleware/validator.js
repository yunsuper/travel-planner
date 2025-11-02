const { body, param, validationResult } = require("express-validator");

// 검증 결과 처리 미들웨어
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: "입력값 검증 실패",
      details: errors.array(),
    });
  }
  next();
};

// Places 라우터 검증
const placesValidators = {};

// Courses 라우터 검증
const coursesValidators = {};

// Course Places 라우터 검증
const coursePlacesValidators = {
  // POST /bulk
  bulkCreate: [
    body("courses_id")
      .isInt({ min: 1 })
      .withMessage("유효한 courses_id가 필요합니다."),
    body("places")
      .isArray({ min: 1 })
      .withMessage("places는 최소 1개 이상의 배열이어야 합니다."),
    body("places.*")
      .isInt({ min: 1 })
      .withMessage("모든 places_id는 양수여야 합니다."),
    handleValidationErrors,
  ],

  // GET /courses/:courses_id
  getByCourseId: [
    param("courses_id")
      .isInt({ min: 1 })
      .withMessage("유효하지 않은 courses_id입니다."),
    handleValidationErrors,
  ],

  // DELETE /places/:places_id
  deleteByPlaceId: [
    param("places_id")
      .isInt({ min: 1 })
      .withMessage("유효하지 않은 places_id입니다."),
    handleValidationErrors,
  ],

  // POST /add-temp
  addTemp: [
    body("courses_id")
      .isInt({ min: 1 })
      .withMessage("유효한 courses_id가 필요합니다."),
    body("name")
      .trim()
      .notEmpty()
      .withMessage("이름이 필요합니다.")
      .isLength({ max: 255 })
      .withMessage("이름은 255자 이하여야 합니다."),
    body("address")
      .trim()
      .notEmpty()
      .withMessage("주소가 필요합니다.")
      .isLength({ max: 500 })
      .withMessage("주소는 500자 이하여야 합니다."),
    body("latitude")
      .isFloat({ min: -90, max: 90 })
      .withMessage("유효한 위도(-90 ~ 90)가 필요합니다."),
    body("longitude")
      .isFloat({ min: -180, max: 180 })
      .withMessage("유효한 경도(-180 ~ 180)가 필요합니다."),
    handleValidationErrors,
  ],
};

// Schedules 라우터 검증
const schedulesValidators = {
  getByCourseId: [
    param("courseId")
      .isInt({ min: 1 })
      .withMessage("유효하지 않은 courseId입니다."),
    handleValidationErrors,
  ],
};

// Alarms 라우터 검증
const alarmsValidators = {
  // POST /
  create: [
    body("courses_id")
      .isInt({ min: 1 })
      .withMessage("유효한 courses_id가 필요합니다."),
    body("message")
      .trim()
      .notEmpty()
      .withMessage("메시지가 필요합니다.")
      .isLength({ max: 2000 })
      .withMessage("메시지는 2000자 이하여야 합니다."),
    body("alarm_time")
      .notEmpty()
      .withMessage("알람 시간이 필요합니다.")
      .isISO8601()
      .withMessage("유효한 ISO 8601 날짜 형식이 필요합니다."),
    handleValidationErrors,
  ],

  // GET /courses/:courses_id
  getByCourseId: [
    param("courses_id")
      .isInt({ min: 1 })
      .withMessage("유효하지 않은 courses_id입니다."),
    handleValidationErrors,
  ],

  // DELETE /:alarms_id
  delete: [
    param("alarms_id")
      .isInt({ min: 1 })
      .withMessage("유효하지 않은 alarms_id입니다."),
    handleValidationErrors,
  ],
};

module.exports = {
  handleValidationErrors,
  placesValidators,
  coursesValidators,
  coursePlacesValidators,
  schedulesValidators,
  alarmsValidators,
};

