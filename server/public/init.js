/**
 * 애플리케이션 초기화
 * 모든 스크립트가 로드된 후 실행되어 지도 및 관련 기능을 초기화합니다.
 */
// 전역 초기화 플래그로 중복 실행 방지
if (!window.appInitStarted) {
    window.appInitStarted = true;

    (function initApp() {
        let retryCount = 0;
        const MAX_RETRIES = 50; // 최대 5초

        const getMapLoader = () =>
            window.initMapLoader || window.configInitMap || window.initMap;

        const init = () => {
            const loadKakaoMap = getMapLoader();

            // Kakao 지도 로더가 준비되었는지 확인
            if (typeof loadKakaoMap !== "function") {
                retryCount++;
                if (retryCount < MAX_RETRIES) {
                    setTimeout(init, 100);
                } else {
                    console.error("❌ Kakao 지도 로더를 찾을 수 없습니다.");
                }
                return;
            }

            // initMap 실행 (한 번만)
            if (!window.initMapCalled) {
                window.initMapCalled = true;
                loadKakaoMap()
                    .then(() => {
                        console.log("✅ 애플리케이션 초기화 완료");
                    })
                    .catch((error) => {
                        window.initMapCalled = false; // 실패 시 재시도 가능하도록
                        console.error("❌ 애플리케이션 초기화 실패:", error);
                        alert(
                            "애플리케이션 초기화에 실패했습니다: " +
                                error.message
                        );
                    });
            }
        };

        // DOM이 준비되었는지 확인하고 초기화
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", () => {
                setTimeout(init, 500);
            });
        } else {
            setTimeout(init, 500);
        }
    })();
}