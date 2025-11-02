/**
 * BigInt 안전 직렬화 및 파싱 유틸리티
 */

/**
 * BigInt를 문자열로 변환하여 JSON 직렬화
 */
function stringifyBigInt(obj) {
  return JSON.parse(
    JSON.stringify(obj, (_, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );
}

/**
 * 문자열로 된 숫자를 안전하게 Number로 변환
 */
function parseBigIntFields(obj) {
  if (Array.isArray(obj)) {
    return obj.map(parseBigIntFields);
  } else if (obj && typeof obj === "object") {
    const newObj = {};
    for (const key in obj) {
      const val = obj[key];
      if (typeof val === "string" && /^\d+$/.test(val)) {
        const num = Number(val);
        newObj[key] = Number.isSafeInteger(num) ? num : val;
      } else {
        newObj[key] = parseBigIntFields(val);
      }
    }
    return newObj;
  } else {
    return obj;
  }
}

module.exports = {
  stringifyBigInt,
  parseBigIntFields,
};

