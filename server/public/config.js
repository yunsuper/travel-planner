window.initMap = function () {
    return fetch("/api/config")
        .then((res) => res.json())
        .then((config) => {
            window.API_BASE = config.apiBaseUrl;

            return new Promise((resolve) => {
                const script = document.createElement("script");
                script.type = "text/javascript";
                script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${config.kakaoMapApiKey}&libraries=services,clusterer&autoload=false`;

                script.onload = () => {
                    // SDK 로드 후 초기화
                    kakao.maps.load(() => {
                        // main.js 로드
                        const mainScript = document.createElement("script");
                        mainScript.src = "/main.js";
                        mainScript.onload = () => {
                            if (typeof initMap === "function") {
                                initMap();
                            }
                            
                            resolve();
                        };
                        document.head.appendChild(mainScript);
                    });
                };

                document.head.appendChild(script);
            });
        })
        .catch((err) => {
            console.error("설정 로드 실패:", err);
            alert("서버 설정을 불러오는데 실패했습니다.");
        });
};
