// 설정 파일
// 서버 모드와 로컬 모드 자동 감지

// API_BASE 설정 (서버 모드 감지)
if (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
) {
    // 로컬 개발 서버
    window.API_BASE = `http://${window.location.hostname}:${
        window.location.port || 3000
    }`;
} else {
    // 프로덕션 서버
    window.API_BASE = window.location.origin;
}

const KAKAO_MAP_API_KEY = "82052cab3c65260dfc440b231c8e1091"; // 앱키 입력

// 초기화 상태 추적
let isInitializing = false;
let isInitialized = false;

const initMapLoader = function () {
    // 이미 초기화되었거나 초기화 중이면 중복 실행 방지
    if (isInitialized) {
        return Promise.resolve();
    }
    if (isInitializing) {
        // 이미 초기화 중이면 기다림
        return new Promise((resolve) => {
            const checkInitialized = setInterval(() => {
                if (isInitialized) {
                    clearInterval(checkInitialized);
                    resolve();
                }
            }, 50);
            // 타임아웃 설정 (5초)
            setTimeout(() => {
                clearInterval(checkInitialized);
                resolve();
            }, 5000);
        });
    }

    isInitializing = true;

    return new Promise((resolve, reject) => {
        // Kakao Map SDK 스크립트가 이미 로드되었는지 확인
        if (typeof kakao !== "undefined" && kakao.maps) {
            kakao.maps.load(() => {
                if (typeof window.initMapCallback === "function") {
                    try {
                        window.initMapCallback();
                        isInitialized = true;
                        isInitializing = false;
                        resolve();
                    } catch (error) {
                        isInitializing = false;
                        console.error("initMap 실행 중 오류:", error);
                        reject(
                            new Error(
                                "지도 초기화 함수 실행 실패: " + error.message
                            )
                        );
                    }
                } else {
                    isInitializing = false;
                    reject(
                        new Error("initMapCallback 함수가 정의되지 않았습니다.")
                    );
                }
            });
            return;
        }

        // 이미 스크립트가 추가되었는지 확인
        const existingScript = document.querySelector(
            `script[src*="dapi.kakao.com"]`
        );
        if (existingScript && typeof kakao !== "undefined") {
            kakao.maps.load(() => {
                if (typeof window.initMapCallback === "function") {
                    try {
                        window.initMapCallback();
                        isInitialized = true;
                        isInitializing = false;
                        resolve();
                    } catch (error) {
                        isInitializing = false;
                        console.error("initMap 실행 중 오류:", error);
                        reject(
                            new Error(
                                "지도 초기화 함수 실행 실패: " + error.message
                            )
                        );
                    }
                } else {
                    isInitializing = false;
                    reject(
                        new Error("initMapCallback 함수가 정의되지 않았습니다.")
                    );
                }
            });
            return;
        } else if (existingScript) {
            existingScript.addEventListener("load", () => {
                kakao.maps.load(() => {
                    if (typeof window.initMapCallback === "function") {
                        try {
                            window.initMapCallback();
                            isInitialized = true;
                            isInitializing = false;
                            resolve();
                        } catch (error) {
                            isInitializing = false;
                            console.error("initMap 실행 중 오류:", error);
                            reject(
                                new Error(
                                    "지도 초기화 함수 실행 실패: " +
                                        error.message
                                )
                            );
                        }
                    } else {
                        isInitializing = false;
                        reject(
                            new Error(
                                "initMapCallback 함수가 정의되지 않았습니다."
                            )
                        );
                    }
                });
            });
            return;
        }

        // Kakao Map SDK 스크립트 생성
        const script = document.createElement("script");
        script.type = "text/javascript";
        script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_MAP_API_KEY}&libraries=services,clusterer&autoload=false`;

        script.onload = () => {
            kakao.maps.load(() => {
                if (typeof window.initMapCallback === "function") {
                    try {
                        window.initMapCallback();
                        isInitialized = true;
                        isInitializing = false;
                        resolve();
                    } catch (error) {
                        isInitializing = false;
                        console.error("initMap 실행 중 오류:", error);
                        reject(
                            new Error(
                                "지도 초기화 함수 실행 실패: " + error.message
                            )
                        );
                    }
                } else {
                    setTimeout(() => {
                        if (typeof window.initMapCallback === "function") {
                            try {
                                window.initMapCallback();
                                isInitialized = true;
                                isInitializing = false;
                                resolve();
                            } catch (error) {
                                isInitializing = false;
                                console.error("initMap 실행 중 오류:", error);
                                reject(
                                    new Error(
                                        "지도 초기화 함수 실행 실패: " +
                                            error.message
                                    )
                                );
                            }
                        } else {
                            isInitializing = false;
                            reject(
                                new Error(
                                    "main.js에 initMapCallback 함수가 정의되지 않았습니다."
                                )
                            );
                        }
                    }, 100);
                }
            });
        };

        script.onerror = () => {
            isInitializing = false;
            const error = new Error("Kakao Map SDK 로드 실패");
            console.error(error.message);
            reject(error);
        };

        document.head.appendChild(script);
    });
};

// 기존 전역 키 유지 + 새 식별자 노출
window.initMap = initMapLoader;
window.initMapLoader = initMapLoader;
window.configInitMap = initMapLoader;
