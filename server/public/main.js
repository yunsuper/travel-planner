// API_BASE 끝에 슬래시 중복 방지
const API = window.API_BASE.replace(/\/$/, "");

var map;
let markers = [];
let allPlaces = [];
let selectedPlaces = [];
let courseMarkers = [];
let coursePolyline = null;
let markersVisible = false; // 초기 상태: 안보임
let clusterer = null; // 마커 클러스터러
let activeOverlay = null; // 커스텀 오버레이 (infowindow)
let lastClickedMarker = null; // 마지막으로 클릭된 임시 마커

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

// 지도 초기화
function initMap() {
    const mapContainer = document.getElementById("map");
    if (!mapContainer) return;

    const options = {
        center: new kakao.maps.LatLng(37.5665, 126.978),
        level: 5,
    };

    map = new kakao.maps.Map(mapContainer, options);

    // 클러스터러 초기화
    clusterer = new kakao.maps.MarkerClusterer({
        map: map,
        averageCenter: true,
        minLevel: 7, // 👈 이게 "클러스터 해제 기준 줌 레벨"
        styles: [
            {
                width: "50px",
                height: "50px",
                background: "rgba(0,0,0,0.2)",
                color: "#ffffff", // 글씨 색
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

    loadPlaces(); // DB 마커 로드
    loadSchedule(); // 일정 로드
    loadCoursePolyline(); // 코스 폴리라인 로드

    const searchInput = document.getElementById("searchInput");
    const searchBtn = document.getElementById("searchBtn");
    const saveBtn = document.getElementById("saveCourseBtn");

    searchBtn.addEventListener("click", triggerSearch);
    searchInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") triggerSearch(searchInput.value);
    });

    saveBtn.addEventListener("click", saveSelectedPlaces);

    const polylineBtn = document.getElementById("showPolylineBtn");
    polylineBtn.addEventListener("click", toggleCoursePolyline);

    const toggleMarkersBtn = document.getElementById("toggleMarkersBtn");
    toggleMarkersBtn.addEventListener("click", toggleAllMarkers);

    initAlarms();

    // 지도 클릭 이벤트: 클릭한 위치에 마커를 추가하고 선택 목록에 추가
    kakao.maps.event.addListener(map, "click", function (mouseEvent) {
        // 클릭한 위치의 좌표
        const latlng = mouseEvent.latLng;
        // 주소-좌표 변환 객체 생성
        const geocoder = new kakao.maps.services.Geocoder();
        // 좌표로 주소 정보 요청
        geocoder.coord2Address(
            latlng.getLng(),
            latlng.getLat(),
            function (result, status) {
                let placeName = "사용자 지정 위치";
                let placeAddress = "주소 정보 없음";
                if (status === kakao.maps.services.Status.OK) {
                    const roadAddress = result[0].road_address
                        ? result[0].road_address.address_name
                        : null;
                    const oldAddress = result[0].address
                        ? result[0].address.address_name
                        : null;
                    placeAddress =
                        roadAddress || oldAddress || "주소 정보 없음";

                    const buildingName =
                        result[0].road_address &&
                        result[0].road_address.building_name
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

                // 선택 장소 목록에 추가
                marker.tempId = tempPlace.places_id;
                lastClickedMarker = marker;

                toggleSelectPlace(tempPlace);
                markers.push(marker);
            }
        );
    });
}

// ESC 키 이벤트 리스너
document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        // 열려있는 커스텀 오버레이(인포윈도우) 닫기
        if (activeOverlay) {
            activeOverlay.setMap(null);
            activeOverlay = null;
            return; // 오버레이를 닫았으면 다른 동작은 멈춤
        }

        // 마지막으로 클릭해서 생성된 임시 마커 닫기
        if (lastClickedMarker && lastClickedMarker.tempId) {
            // 마커를 지도에서 제거
            lastClickedMarker.setMap(null);

            // 선택 목록(selectedPlaces)에서 해당 장소 제거
            const indexToRemove = selectedPlaces.findIndex(
                (p) => p.places_id === lastClickedMarker.tempId
            );
            if (indexToRemove > -1) {
                selectedPlaces.splice(indexToRemove, 1);
                renderSelectedList(); // 목록 UI 갱신
            }

            // 마지막 클릭 마커 정보 초기화
            lastClickedMarker = null;
        }
    }
});

// 클러스터링 기반 마커 토글
function toggleAllMarkers() {
    if (!clusterer) return;
    if (markersVisible) {
        clusterer.clear(); // 클러스터러에서 마커 제거
        markersVisible = false;
    } else {
        clusterer.addMarkers(courseMarkers); // courseMarkers만 클러스터링
        markersVisible = true;
    }
}

// DB+Kakao 통합 검색
function triggerSearch() {
    const keyword = document
        .getElementById("searchInput")
        .value.trim()
        .toLowerCase();
    // 1. DB 마커 필터
    filterItinerary(keyword);

    // 2. DB 결과 없으면 Kakao API 검색
    const foundInDB = allPlaces.some((p) =>
        p.name.toLowerCase().includes(keyword)
    );
    if (!foundInDB) {
        searchPlaceByKakao(keyword);
    }
}

// DB+Kakao 통합 검색에서 Kakao API 호출
function searchPlaceByKakao(keyword) {
    if (!keyword) return;

    var ps = new kakao.maps.services.Places();
    ps.keywordSearch(keyword, function (data, status) {
        if (status === kakao.maps.services.Status.OK && data.length > 0) {
            const place = data[0]; // 배열의 첫 번째 결과만 사용
            console.log("카카오맵 검색 결과:", data);

            // 🔹 코스 마커 숨기기 (검색 집중)
            if (clusterer) clusterer.clear();
            markersVisible = false;

            // 검색된 장소를 selectedPlaces에 추가하기 위한 임시 객체
            const tempPlace = {
                places_id: `temp_${Date.now()}`, // 임시 ID 부여
                name: place.place_name,
                address: place.road_address_name || place.address_name,
                latitude: parseFloat(place.y),
                longitude: parseFloat(place.x),
                isTemp: true,
            };

            // 검색 즉시 선택 목록에 추가
            toggleSelectPlace(tempPlace);

            // 검색 결과 마커 생성
            const marker = new kakao.maps.Marker({
                position: new kakao.maps.LatLng(place.y, place.x),
                title: place.place_name,
            });

            // 🔹 마커를 지도에 명시적으로 표시 (clusterer 영향 방지)
            marker.setMap(map);

            // 생성된 마커를 lastClickedMarker로 설정하여 ESC로 삭제 가능하게 함
            marker.tempId = tempPlace.places_id;
            lastClickedMarker = marker;
            markers.push(marker); // 마커 배열에도 추가

            // 🔹 CustomOverlay 생성
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

            // 검색 즉시 오버레이 표시
            if (activeOverlay) activeOverlay.setMap(null);
            overlay.setMap(map);
            activeOverlay = overlay;

            // 🔹 X 버튼 클릭 시 닫기
            const closeBtn = overlayDiv.querySelector(".overlay-close");
            closeBtn.onclick = () => {
                overlay.setMap(null);
                activeOverlay = null;
            };

            // 🔹 마커 클릭 시 오버레이를 다시 열도록 설정
            kakao.maps.event.addListener(marker, "click", () => {
                if (activeOverlay) activeOverlay.setMap(null);
                overlay.setMap(map);
                activeOverlay = overlay;
            });

            // 🔹 검색 결과 중심으로 지도 이동 + 확대
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

// 기존 DB 마커 로드
async function loadPlaces() {
    try {
        // const res = await fetch(`${API_BASE}/places`);
        const res = await fetch(`${API}/places`);
        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`장소 조회 실패: ${res.status} - ${errorText}`);
        }
        const places = parseBigIntFields(await res.json());
        allPlaces = places;

        // 기존 마커 제거
        markers.forEach((m) => m.setMap(null));
        markers = [];

        places.forEach((p) => {
            const marker = new kakao.maps.Marker({
                map,
                position: new kakao.maps.LatLng(p.latitude, p.longitude),
                title: p.name,
                map: markersVisible ? map : null,
            });

            // overlayContent를 문자열이 아니라 div 엘리먼트로 생성
            const overlayDiv = document.createElement("div");
            overlayDiv.className = "customoverlay";

            overlayDiv.innerHTML = `
                <div class="overlay-wrap">
                    <div class="overlay-title">${p.name}</div>
                    <div class="overlay-body">
                        ${p.address || "주소 정보 없음"}
                    </div>
                    <div class="overlay-close" title="닫기">×</div>
                </div>
            `;

            const overlay = new kakao.maps.CustomOverlay({
                content: overlayDiv, // HTMLElement 전달
                position: marker.getPosition(),
                yAnchor: 1.4,
                zIndex: 3,
            });

            // 🔹 마커 클릭 시 커스텀 오버레이 열기
            kakao.maps.event.addListener(marker, "click", function () {
                // 다른 오버레이 닫기
                if (activeOverlay) activeOverlay.setMap(null);
                // 새 오버레이 표시
                overlay.setMap(map);
                activeOverlay = overlay;

                // 닫기 버튼 연결
                const closeBtn = overlayDiv.querySelector(".overlay-close");
                if (closeBtn) {
                    closeBtn.onclick = () => {
                        overlay.setMap(null);
                        activeOverlay = null;
                    };
                }
            });

            kakao.maps.event.addListener(marker, "click", () =>
                toggleSelectPlace(p)
            );
            markers.push(marker);
        });
    } catch (err) {
        console.error("❌ 장소 불러오기 실패:", err);
    }
}

// 선택 장소 추가/삭제
function toggleSelectPlace(place) {
    const index = selectedPlaces.findIndex(
        (p) => p.places_id === place.places_id
    );
    if (index > -1) {
        // 이미 목록에 있는 경우, 제거하지 않고 알림만 표시
        console.log("이미 선택된 장소입니다:", place.name);
        return;
    }
    selectedPlaces.push(place);
    renderSelectedList();
}

// 선택 목록 렌더링
function renderSelectedList() {
    const list = document.getElementById("coursePlacesList");
    if (!list) return console.error("coursePlacesList not found in DOM");
    list.innerHTML = "";

    selectedPlaces.forEach((p, index) => {
        const li = document.createElement("li");
        li.textContent = `${index + 1}. ${p.name || "알 수 없는 장소"} (${
            p.address || "주소 정보 없음"
        })`;

        const delBtn = document.createElement("button");
        delBtn.type = "button";
        delBtn.textContent = "삭제";
        delBtn.addEventListener("click", () => {
            selectedPlaces.splice(index, 1);
            renderSelectedList();
        });

        li.appendChild(delBtn);
        list.appendChild(li);
    });
}

//선택된 장소 저장
async function saveSelectedPlaces() {
    if (selectedPlaces.length === 0) {
        alert("저장할 장소를 선택하세요!");
        return;
    }

    try {
        // 1️⃣ DB에 이미 있는 장소만 필터링
        const dbPlaces = selectedPlaces.filter((p) => !p.isTemp);
        const tempPlaces = selectedPlaces.filter((p) => p.isTemp);

        // 2️⃣ 기존 장소 조회
        // const res = await fetch(`${API_BASE}/course_places/courses/1`);
        const res = await fetch(`${API}/course_places/courses/1`);
        if (!res.ok) throw new Error("기존 장소 조회 실패");
        const existingPlaces = parseBigIntFields(await res.json());
        const existingPlaceIds = existingPlaces.map((p) => p.places_id);

        // 중복 처리
        const duplicatePlaces = selectedPlaces.filter(
            (p) => !p.isTemp && existingPlaceIds.includes(p.places_id)
        );
        if (duplicatePlaces.length > 0) {
            const names = duplicatePlaces.map((p) => p.name).join(", ");
            if (
                !confirm(`이미 저장된 장소: ${names}. 계속 저장하시겠습니까?`)
            ) {
                return;
            }
        }

        // 3️⃣ DB에 있는 장소 bulk 저장
        const dbPlaceIdsToSave = dbPlaces
            .filter((p) => !existingPlaceIds.includes(p.places_id))
            .map((p) => p.places_id);

        if (dbPlaceIdsToSave.length > 0) {
            // await fetch(`${API_BASE}/course_places/bulk`, {
            await fetch(`${API}/course_places/bulk`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    courses_id: 1,
                    places: dbPlaceIdsToSave, // 장소의 ID 목록만 보냅니다.
                }),
            });
        }

        // 4️⃣ 임시 장소는 /add-temp API로 등록 후 코스에 추가
        for (const p of tempPlaces) {
            // const addRes = await fetch(`${API_BASE}/course_places/add-temp`, {
            const addRes = await fetch(`${API}/course_places/add-temp`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    courses_id: 1,
                    name: p.name,
                    address: p.address,
                    latitude: p.latitude,
                    longitude: p.longitude,
                }),
            });
            if (!addRes.ok) {
                const errText = await addRes.text();
                console.error("임시 장소 저장 실패:", errText);
                alert(`'${p.name}' 저장 실패: ${errText}`);
            } else {
                const data = parseBigIntFields(await addRes.json());
                p.places_id = data.places_id; // 새 ID 업데이트
                p.isTemp = false;
            }
        }

        alert("코스가 저장되었습니다.");
        selectedPlaces = [];
        renderSelectedList();
        loadCoursePolyline(); // 폴리라인 갱신
    } catch (err) {
        console.error("❌ 장소 저장 실패:", err);
        alert(`장소 저장에 실패했습니다: ${err.message}`);
    }
}

function renderCoursePlaces(places) {
    const ul = document.getElementById("savedCoursesList");
    if (!ul) return console.error("savedCoursesList not found in DOM");
    ul.innerHTML = "";

    const placesArray = Array.isArray(places) ? places : [places];

    if (!placesArray || placesArray.length === 0) {
        ul.innerHTML = "<li>저장된 장소가 없습니다.</li>";
        return;
    }

    placesArray.forEach((p, index) => {
        // 서버에서 받은 코스 장소에 address가 없을 경우, allPlaces에서 찾아 보충합니다.
        const fullPlace = allPlaces.find((ap) => ap.places_id === p.places_id);
        const address =
            p.address || (fullPlace ? fullPlace.address : "주소 정보 없음");

        const li = document.createElement("li");
        li.textContent = `${index + 1}. ${p.name || "알 수 없는 장소"} (${
            address || "주소 정보 없음"
        })`;

        const delBtn = document.createElement("button");
        delBtn.type = "button";
        delBtn.textContent = "코스 삭제";
        delBtn.addEventListener("click", async () => {
            const confirmDelete = confirm(
                `'${
                    p.name || "알 수 없는 장소"
                }' 장소를 코스에서 삭제하시겠습니까?`
            );
            if (confirmDelete) {
                try {
                    const res = await fetch(
                        // `${API_BASE}/course_places/places/${p.places_id}`,
                        // {
                        //     method: "DELETE",
                        // }
                        `${API}/course_places/places/${p.places_id}`,
                        {
                            method: "DELETE",
                        }
                    );
                    if (!res.ok) {
                        const errorText = await res.text();
                        throw new Error(
                            `삭제 실패: ${res.status} - ${errorText}`
                        );
                    }
                    const response = parseBigIntFields(await res.json());
                    console.log("DELETE response:", response);
                    alert(
                        `'${
                            p.name || "알 수 없는 장소"
                        }' 장소가 삭제되었습니다.`
                    );
                    renderCoursePlaces(response.places);

                    // 마커와 폴리라인 갱신
                    loadCoursePolyline();
                } catch (err) {
                    console.error("❌ 장소 삭제 실패:", err);
                    alert(`장소 삭제에 실패했습니다: ${err.message}`);
                }
            }
        });

        li.appendChild(delBtn);
        ul.appendChild(li);
    });
}

// 코스 폴리라인 토글
let isPolylineVisible = false;

async function toggleCoursePolyline() {
    const btn = document.getElementById("showPolylineBtn");

    if (!isPolylineVisible) {
        await showCoursePolyline();
        btn.textContent = "폴리라인 숨기기";
        isPolylineVisible = true;
    } else {
        hideCoursePolyline();
        btn.textContent = "폴리라인 표시";
        isPolylineVisible = false;
    }
}

// 코스 폴리라인 표시
async function showCoursePolyline() {
    try {
        // const res = await fetch(`${API_BASE}/course_places/courses/1`);
        const res = await fetch(`${API}/course_places/courses/1`);
        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`폴리라인 조회 실패: ${res.status} - ${errorText}`);
        }
        const data = parseBigIntFields(await res.json());
        console.log("showCoursePolyline data:", data);

        const dataArray = Array.isArray(data) ? data : [data];

        if (dataArray.length < 2) {
            // alert("폴리라인을 그리려면 최소 2개 이상의 장소가 필요합니다.");
            return;
        }

        if (coursePolyline) coursePolyline.setMap(null);

        const linePath = dataArray
            .filter((p) => p.latitude && p.longitude)
            .map((p) => new kakao.maps.LatLng(p.latitude, p.longitude));

        coursePolyline = new kakao.maps.Polyline({
            path: linePath,
            strokeWeight: 4,
            strokeColor: "#FF0000",
            strokeOpacity: 0.8,
            strokeStyle: "solid",
        });
        coursePolyline.setMap(map);

        if (linePath.length > 0) {
            const bounds = new kakao.maps.LatLngBounds();
            linePath.forEach((point) => bounds.extend(point));
            map.setBounds(bounds);
        }
    } catch (err) {
        console.error("❌ 폴리라인 표시 실패:", err);
        alert("폴리라인을 표시할 수 없습니다.");
    }
}

// 코스 폴리라인 숨기기
function hideCoursePolyline() {
    if (coursePolyline) {
        coursePolyline.setMap(null);
    }
}

// 서버에서 코스 불러오기
async function loadCoursePolyline() {
    try {
        // const res = await fetch(`${API_BASE}/course_places/courses/1`);
        const res = await fetch(`${API}/course_places/courses/1`);
        if (!res.ok) {
            const errorText = await res.text();
            console.error("❌ 서버 응답 에러:", res.status, errorText);
            throw new Error(`서버 응답 에러: ${res.status}`);
        }
        const data = parseBigIntFields(await res.json());
        console.log("📦 서버에서 받은 data:", data);

        const list = document.getElementById("savedCoursesList");
        if (!list) return console.error("savedCoursesList not found in DOM");
        list.innerHTML = "";

        const dataArray = Array.isArray(data) ? data : [data];

        if (dataArray.length === 0) {
            list.innerHTML = "<li>저장된 장소가 없습니다.</li>";
            return;
        }

        renderCoursePlaces(dataArray);

        // 기존 코스 마커와 폴리라인 제거
        courseMarkers.forEach((m) => m.setMap(null));
        courseMarkers = [];
        if (coursePolyline) coursePolyline.setMap(null);

        // 클러스터러 초기화
        if (clusterer) {
            clusterer.clear();
        }

        dataArray
            .filter((p) => p.latitude && p.longitude)
            .forEach((p) => {
                const marker = new kakao.maps.Marker({
                    map,
                    position: new kakao.maps.LatLng(p.latitude, p.longitude),
                    title: p.name,
                });
                courseMarkers.push(marker);
            });

        if (
            dataArray.length > 0 &&
            dataArray[0].latitude &&
            dataArray[0].longitude
        ) {
            const bounds = new kakao.maps.LatLngBounds();
            dataArray
                .filter((p) => p.latitude && p.longitude)
                .forEach((p) =>
                    bounds.extend(
                        new kakao.maps.LatLng(p.latitude, p.longitude)
                    )
                );
            map.setBounds(bounds);
        }
    } catch (err) {
        console.error("❌ course_places 불러오기 실패:", err);
        const list = document.getElementById("savedCoursesList");
        if (list) list.innerHTML = "<li>저장된 장소가 없습니다.</li>";
    }
}

async function loadSchedule() {
    const container = document.getElementById("itineraryList");
    if (!container) return console.error("itineraryList not found in DOM");

    container.innerHTML = "";
    try {
        // const res = await fetch(`${API_BASE}/schedules/courses/1`);
        const res = await fetch(`${API}/schedules/courses/1`);
        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`일정 조회 실패: ${res.status} - ${errorText}`);
        }
        const schedules = parseBigIntFields(await res.json());

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

// DB 마커 필터 + 결과 여부 반환
function filterMarkers(query) {
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
