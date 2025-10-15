// GitHub Pages 배포용 config.js
// 서버 호출 없이 Kakao Map SDK와 main.js 로드

window.API_BASE = "./"; // 로컬스토리지 기준
const KAKAO_MAP_API_KEY = "82052cab3c65260dfc440b231c8e1091"; // 앱키 입력

window.initMap = function () {
    return new Promise((resolve) => {
        // Kakao Map SDK 스크립트 생성
        const script = document.createElement("script");
        script.type = "text/javascript";
        script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_MAP_API_KEY}&libraries=services,clusterer&autoload=false`;

        script.onload = () => {
            // SDK 로드 후 Kakao Maps 초기화
            kakao.maps.load(() => {
                // main.js 로드
                const mainScript = document.createElement("script");
                mainScript.src = "/main.js";
                mainScript.onload = () => {
                    // main.js에 정의된 initMap 실행
                    if (typeof initMap === "function") initMap();
                    resolve();
                };
                document.head.appendChild(mainScript);
            });
        };

        script.onerror = () => {
            console.error("Kakao Map SDK 로드 실패");
            alert("지도 로드에 실패했습니다.");
        };

        document.head.appendChild(script);
    });
};

// window.initMap = function () {
//     return fetch("/api/config")
//         .then((res) => res.json())
//         .then((config) => {
//              window.API_BASE = config.apiBaseUrl;

//             return new Promise((resolve) => {
//                 const script = document.createElement("script");
//                 script.type = "text/javascript";
//                 script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${config.kakaoMapApiKey}&libraries=services,clusterer&autoload=false`;

//                 script.onload = () => {
//                     // SDK 로드 후 초기화
//                     kakao.maps.load(() => {
//                         // main.js 로드
//                         const mainScript = document.createElement("script");
//                         mainScript.src = "/main.js";
//                         mainScript.onload = () => {
//                             if (typeof initMap === "function") {
//                                 initMap();
//                             }

//                             resolve();
//                         };
//                         document.head.appendChild(mainScript);
//                     });
//                 };

//                 document.head.appendChild(script);
//             });
//         })
//         .catch((err) => {
//             console.error("설정 로드 실패:", err);
//             alert("서버 설정을 불러오는데 실패했습니다.");
//         });
// };
