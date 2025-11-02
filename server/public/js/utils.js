/**
 * 유틸리티 함수 모듈
 */

// BigInt 안전 변환 함수
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

// API_BASE 끝에 슬래시 중복 방지
function getApiBase() {
    return window.API_BASE ? window.API_BASE.replace(/\/$/, "") : "";
}

// 커스텀 오버레이 생성 헬퍼
function createCustomOverlay(marker, placeName, placeAddress) {
    const overlayDiv = document.createElement("div");
    overlayDiv.className = "customoverlay";
    overlayDiv.innerHTML = `
        <div class="overlay-wrap">
            <div class="overlay-title">${placeName}</div>
            <div class="overlay-body">${placeAddress || "주소 정보 없음"}</div>
            <div class="overlay-close" title="닫기">×</div>
        </div>
    `;

    const overlay = new kakao.maps.CustomOverlay({
        content: overlayDiv,
        position: marker.getPosition(),
        yAnchor: 1.4,
        zIndex: 3,
    });

    // 닫기 버튼 이벤트
    const closeBtn = overlayDiv.querySelector(".overlay-close");
    if (closeBtn) {
        closeBtn.onclick = () => {
            overlay.setMap(null);
            return overlay;
        };
    }

    return overlay;
}

// 전역으로 노출
window.parseBigIntFields = parseBigIntFields;
window.getApiBase = getApiBase;
window.createCustomOverlay = createCustomOverlay;
