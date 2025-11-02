/**
 * 환경 변수 검증 유틸리티
 */

const requiredEnvVars = [
  "PORT",
  "DB_HOST",
  "DB_USER",
  "DB_PASSWORD",
  "DB_NAME",
  "KAKAO_MAP_API_KEY",
];

/**
 * 필수 환경 변수가 모두 설정되어 있는지 검증
 */
function validateEnv() {
  const missing = requiredEnvVars.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error("❌ 필수 환경 변수가 설정되지 않았습니다:");
    missing.forEach((key) => console.error(`  - ${key}`));
    process.exit(1);
  }

  // 포트 번호 검증
  const port = parseInt(process.env.PORT, 10);
  if (isNaN(port) || port < 1 || port > 65535) {
    console.error("❌ 유효하지 않은 PORT 값:", process.env.PORT);
    process.exit(1);
  }

  console.log("✅ 환경 변수 검증 완료");
}

module.exports = { validateEnv };

