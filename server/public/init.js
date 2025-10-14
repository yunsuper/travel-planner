// DOM이 로드된 후 실행
document.addEventListener("DOMContentLoaded", function () {
    // config.js의 initMap 함수가 정의되었는지 확인
    if (typeof window.initMap === "function") {
        window.initMap();
    } else {
        console.error("initMap 함수를 찾을 수 없습니다.");
    }
});
