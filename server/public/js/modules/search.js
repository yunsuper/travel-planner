/**
 * 검색 기능 모듈
 */

// API 경로를 동적으로 가져오는 함수
function getAPI() {
    const base = window.API_BASE || window.location.origin;
    return base.replace(/\/$/, "");
}

// DB+Kakao 통합 검색
function triggerSearch(allPlaces, filterItinerary) {
    const keyword = document
        .getElementById("searchInput")
        .value.trim()
        .toLowerCase();
    
    // 1. DB 마커 필터
    if (typeof filterItinerary === "function") {
        filterItinerary(keyword);
    }

    // 2. DB 결과 없으면 Kakao API 검색
    const foundInDB = allPlaces.some((p) =>
        p.name.toLowerCase().includes(keyword)
    );
    if (!foundInDB && keyword) {
        searchPlaceByKakao(keyword);
    }
}

// Kakao API 검색
function searchPlaceByKakao(keyword) {
    if (!keyword) return;

    const ps = new kakao.maps.services.Places();
    ps.keywordSearch(keyword, function (data, status) {
        if (status === kakao.maps.services.Status.OK && data.length > 0) {
            const place = data[0];
            console.log("카카오맵 검색 결과:", data);

            // 클러스터러 클리어
            if (typeof window.clearClusterer === "function") {
                window.clearClusterer();
            }

            // 검색된 장소를 selectedPlaces에 추가
            const tempPlace = {
                places_id: `temp_${Date.now()}`,
                name: place.place_name,
                address: place.road_address_name || place.address_name,
                latitude: parseFloat(place.y),
                longitude: parseFloat(place.x),
                isTemp: true,
            };

            // 선택 목록에 추가
            if (typeof window.toggleSelectPlace === "function") {
                window.toggleSelectPlace(tempPlace);
            }

            // 검색 결과 마커 생성
            const map = window.getMapInstance ? window.getMapInstance() : null;
            if (!map) return;

            const marker = new kakao.maps.Marker({
                position: new kakao.maps.LatLng(place.y, place.x),
                title: place.place_name,
            });

            marker.setMap(map);
            marker.tempId = tempPlace.places_id;
            
            if (typeof window.setLastClickedMarker === "function") {
                window.setLastClickedMarker(marker);
            }

            // 오버레이 표시
            const overlayDiv = document.createElement("div");
            overlayDiv.className = "customoverlay";
            overlayDiv.innerHTML = `
                <div class="overlay-wrap">
                    <div class="overlay-title">${place.place_name}</div>
                    <div class="overlay-body">${
                        place.road_address_name ||
                        place.address_name ||
                        "주소 정보 없음"
                    }</div>
                    <div class="overlay-close" title="닫기">×</div>
                </div>
            `;

            const overlay = new kakao.maps.CustomOverlay({
                content: overlayDiv,
                position: marker.getPosition(),
                yAnchor: 1.4,
                zIndex: 3,
            });

            if (typeof window.openOverlay === "function") {
                window.openOverlay(overlay);
            }

            // 닫기 버튼
            const closeBtn = overlayDiv.querySelector(".overlay-close");
            closeBtn.onclick = () => {
                overlay.setMap(null);
                if (typeof window.closeOverlay === "function") {
                    window.closeOverlay();
                }
            };

            // 마커 클릭 시 오버레이 다시 열기
            kakao.maps.event.addListener(marker, "click", () => {
                if (typeof window.openOverlay === "function") {
                    window.openOverlay(overlay);
                }
            });

            // 검색 결과 중심으로 지도 이동
            const center = new kakao.maps.LatLng(
                parseFloat(place.y),
                parseFloat(place.x)
            );
            map.setCenter(center);
            map.setLevel(3);
        } else if (status === kakao.maps.services.Status.ZERO_RESULT) {
            alert("검색 결과가 없습니다.");
        } else {
            console.error("카카오맵 검색 오류:", status);
        }
    });
}

// DB 마커 필터
function filterMarkers(query, markers, allPlaces, map) {
    let found = false;
    markers.forEach((marker, i) => {
        const name = allPlaces[i]?.name.toLowerCase() || "";
        if (name.includes(query)) {
            marker.setMap(map);
            if (!found) {
                map.setCenter(marker.getPosition());
                found = true;
            }
        } else {
            marker.setMap(null);
        }
    });

    if (!found && query) {
        alert("검색 결과가 없습니다.");
    }
}

// 전역 함수로 등록
window.triggerSearch = triggerSearch;
window.searchPlaceByKakao = searchPlaceByKakao;
window.filterMarkers = filterMarkers;

