/**
 * 메인 초기화 파일 - 모듈들을 통합하여 애플리케이션 초기화
 */

// API 경로를 동적으로 가져오는 함수
function getAPI() {
    const base = window.API_BASE || window.location.origin;
    return base.replace(/\/$/, "");
}

// 전역 변수 초기화 (모듈 간 공유)
let map;
let markers = [];
let allPlaces = [];
let courseMarkers = [];
let clusterer = null;
let activeOverlay = null;
let lastClickedMarker = null;
let markersVisible = false; // 마커 표시 상태

// 전역 함수 등록 (모듈 간 통신용)
window.getMapInstance = () => map;
window.getAllPlaces = () => allPlaces;
window.getMarkers = () => markers;
window.getCourseMarkers = () => courseMarkers;
window.getClusterer = () => clusterer;
window.getActiveOverlay = () => activeOverlay;
window.getLastClickedMarker = () => lastClickedMarker;

window.setMapInstance = (instance) => { map = instance; };
window.setAllPlaces = (places) => { allPlaces = places; };
window.setMarkers = (ms) => { markers = ms; };
window.setCourseMarkers = (ms) => { courseMarkers = ms; };
window.setClusterer = (c) => { clusterer = c; };
window.setActiveOverlay = (overlay) => { activeOverlay = overlay; };
window.setLastClickedMarker = (marker) => { lastClickedMarker = marker; };

window.clearClusterer = () => {
    if (clusterer) clusterer.clear();
};

window.clearCourseMarkers = () => {
    courseMarkers.forEach((m) => m.setMap(null));
    courseMarkers = [];
};

window.openOverlay = (overlay) => {
    if (activeOverlay) activeOverlay.setMap(null);
    overlay.setMap(map);
    activeOverlay = overlay;
};

window.closeOverlay = () => {
    if (activeOverlay) {
        activeOverlay.setMap(null);
        activeOverlay = null;
    }
};

// 기존 DB 마커 로드
async function loadPlaces() {
    try {
        const res = await fetch(`${getAPI()}/places`);
        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`장소 조회 실패: ${res.status} - ${errorText}`);
        }
        const places = window.parseBigIntFields ? window.parseBigIntFields(await res.json()) : await res.json();
        allPlaces = places;

        if (clusterer) {
            clusterer.clear();
        }
        // 기존 마커 제거
        markers.forEach((m) => m.setMap(null));
        markers = [];

        places.forEach((p) => {
            const marker = new kakao.maps.Marker({
                position: new kakao.maps.LatLng(p.latitude, p.longitude),
                title: p.name,
            });

            if (markersVisible) {
                markers.forEach((marker) => marker.setMap(map));
                if (clusterer) {
                    clusterer.addMarkers(markers);
                }
            }

            // 커스텀 오버레이 생성
            const overlayDiv = document.createElement("div");
            overlayDiv.className = "customoverlay";
            overlayDiv.innerHTML = `
                <div class="overlay-wrap">
                    <div class="overlay-title">${p.name}</div>
                    <div class="overlay-body">${p.address || "주소 정보 없음"}</div>
                    <div class="overlay-close" title="닫기">×</div>
                </div>
            `;

            const overlay = new kakao.maps.CustomOverlay({
                content: overlayDiv,
                position: marker.getPosition(),
                yAnchor: 1.4,
                zIndex: 3,
            });

            // 마커 클릭 시 오버레이 열기
            kakao.maps.event.addListener(marker, "click", function () {
                window.openOverlay(overlay);
                window.toggleSelectPlace(p);
            });

            // 닫기 버튼
            const closeBtn = overlayDiv.querySelector(".overlay-close");
            if (closeBtn) {
                closeBtn.onclick = () => {
                    window.closeOverlay();
                };
            }

            markers.push(marker);
        });
    } catch (err) {
        console.error("❌ 장소 불러오기 실패:", err);
    }
}

async function loadSchedule() {
    const container = document.getElementById("itineraryList");
    if (!container) return console.error("itineraryList not found in DOM");

    container.innerHTML = "";
    try {
        const res = await fetch(`${getAPI()}/schedules/courses/1`);
        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`일정 조회 실패: ${res.status} - ${errorText}`);
        }
        const schedules = window.parseBigIntFields ? window.parseBigIntFields(await res.json()) : await res.json();

        if (!Array.isArray(schedules) || schedules.length === 0) {
            container.innerHTML = "<p>등록된 일정이 없습니다.</p>";
            return;
        }

        schedules.forEach((s, i) => {
            const article = document.createElement("article");
            article.className = "item";
            article.innerHTML = `<div class="index">${i + 1}</div>
                                 <div>
                                    <h3>${s.name}</h3>
                                    <p>${s.description || ""}</p>
                                 </div>`;
            container.appendChild(article);
        });
    } catch (err) {
        container.innerHTML = "<p>일정을 불러올 수 없습니다.</p>";
        console.error("❌ 일정 불러오기 실패:", err);
    }
}

function filterItinerary(query) {
    const items = document.querySelectorAll("#itineraryList .item");
    items.forEach((item) => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(query) ? "" : "none";
    });
}

// 지도 초기화 함수를 전역 콜백으로 등록
function initMap() {
    // 중복 실행 방지
    if (window.mapInitialized) {
        console.warn("지도가 이미 초기화되었습니다.");
        return;
    }
    window.mapInitialized = true;

    const mapContainer = document.getElementById("map");
    if (!mapContainer) {
        console.error("지도 컨테이너를 찾을 수 없습니다.");
        return;
    }

    const options = {
        center: new kakao.maps.LatLng(37.5665, 126.978),
        level: 5,
    };

    map = new kakao.maps.Map(mapContainer, options);

    // 클러스터러 초기화
    clusterer = new kakao.maps.MarkerClusterer({
        map: map,
        averageCenter: true,
        minLevel: 7,
        styles: [
            {
                width: "50px",
                height: "50px",
                background: "rgba(0,0,0,0.2)",
                color: "#ffffff",
                textAlign: "center",
                lineHeight: "50px",
                borderRadius: "25px",
                fontWeight: "bold",
                fontSize: "14px",
                textShadow:
                    "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000",
            },
        ],
    });

    // 전역 상태 업데이트
    window.setMapInstance(map);
    window.setClusterer(clusterer);

    // 데이터 로드
    try {
        loadPlaces();
        loadSchedule();
        
        if (typeof window.loadCoursePolyline === "function") {
            window.loadCoursePolyline();
        }
    } catch (error) {
        console.error("데이터 로드 중 오류:", error);
    }

    // 이벤트 리스너 등록
    const searchInput = document.getElementById("searchInput");
    const searchBtn = document.getElementById("searchBtn");
    const saveBtn = document.getElementById("saveCourseBtn");
    const polylineBtn = document.getElementById("showPolylineBtn");
    const toggleMarkersBtn = document.getElementById("toggleMarkersBtn");

    if (searchBtn) {
        searchBtn.addEventListener("click", () => {
            if (typeof window.triggerSearch === "function") {
                window.triggerSearch(allPlaces, filterItinerary);
            }
        });
    }

    if (searchInput) {
        searchInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") {
                if (typeof window.triggerSearch === "function") {
                    window.triggerSearch(allPlaces, filterItinerary);
                }
            }
        });
    }

    if (saveBtn) {
        saveBtn.addEventListener("click", () => {
            if (typeof window.saveSelectedPlaces === "function") {
                window.saveSelectedPlaces();
            }
        });
    }

    if (polylineBtn) {
        polylineBtn.addEventListener("click", () => {
            if (typeof window.toggleCoursePolyline === "function") {
                window.toggleCoursePolyline();
            }
        });
    }

    if (toggleMarkersBtn) {
        toggleMarkersBtn.addEventListener("click", () => {
            if (typeof window.toggleAllMarkers === "function") {
                window.toggleAllMarkers();
            }
        });
    }

    // 알람 초기화
    if (typeof window.initAlarms === "function") {
        window.initAlarms();
    }

    // 지도 클릭 이벤트
    kakao.maps.event.addListener(map, "click", function (mouseEvent) {
        const latlng = mouseEvent.latLng;
        const geocoder = new kakao.maps.services.Geocoder();

        geocoder.coord2Address(latlng.getLng(), latlng.getLat(), function (result, status) {
            let placeName = "사용자 지정 위치";
            let placeAddress = "주소 정보 없음";
            
            if (status === kakao.maps.services.Status.OK) {
                const roadAddress = result[0].road_address
                    ? result[0].road_address.address_name
                    : null;
                const oldAddress = result[0].address
                    ? result[0].address.address_name
                    : null;
                placeAddress = roadAddress || oldAddress || "주소 정보 없음";

                const buildingName =
                    result[0].road_address && result[0].road_address.building_name
                        ? result[0].road_address.building_name
                        : null;
                placeName = buildingName || placeAddress;
            }

            const marker = new kakao.maps.Marker({
                position: latlng,
                map: map,
            });

            const tempPlace = {
                places_id: `temp_${Date.now()}`,
                name: placeName,
                address: placeAddress,
                latitude: latlng.getLat(),
                longitude: latlng.getLng(),
                isTemp: true,
            };

            marker.tempId = tempPlace.places_id;
            lastClickedMarker = marker;

            if (typeof window.toggleSelectPlace === "function") {
                window.toggleSelectPlace(tempPlace);
            }
            
            markers.push(marker);
        });
    });
}

// 전역 콜백으로 등록 (config.js에서 호출하기 위해)
window.initMapCallback = initMap;

// ESC 키 이벤트 리스너
document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        // 오버레이 닫기
        if (activeOverlay) {
            window.closeOverlay();
            return;
        }

        // 마지막 클릭 마커 삭제
        if (lastClickedMarker && lastClickedMarker.tempId) {
            lastClickedMarker.setMap(null);

            if (typeof window.removeSelectedPlace === "function") {
                window.removeSelectedPlace(lastClickedMarker.tempId);
            }

            lastClickedMarker = null;
        }
    }
});

// 모듈 함수 전역 등록
const originalToggleSelectPlace = window.toggleSelectPlace;
window.toggleSelectPlace = (place) => {
    if (typeof originalToggleSelectPlace === "function") originalToggleSelectPlace(place);
};

window.removeSelectedPlace = (tempId) => {
    if (typeof window.getSelectedPlaces === "function") {
        const selectedPlaces = window.getSelectedPlaces();
        const indexToRemove = selectedPlaces.findIndex(
            (p) => p.places_id === tempId
        );
        if (indexToRemove > -1) {
            selectedPlaces.splice(indexToRemove, 1);
            if (typeof renderSelectedList === "function") {
                renderSelectedList();
            }
        }
    }
};

const originalRenderCoursePlaces = window.renderCoursePlaces;
window.renderCoursePlaces = (places, allPlacesList) => {
    if (typeof originalRenderCoursePlaces === "function") {
        originalRenderCoursePlaces(places, allPlacesList);
    }
};

window.toggleAllMarkers = () => {
    if (!clusterer) return;
    
    if (markersVisible) {
        clusterer.clear();
        markersVisible = false;
    } else {
        clusterer.addMarkers(courseMarkers);
        markersVisible = true;
    }
};

