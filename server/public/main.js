const API_BASE = "http://localhost:3000";

var map;
let markers = [];
let allPlaces = [];
let selectedPlaces = [];
let courseMarkers = [];
let coursePolyline = null;
let markersVisible = false; // 초기 상태: 안보임

function initMap() {
    const mapContainer = document.getElementById("map");
        if (!mapContainer) return;

        const options = {
            center: new kakao.maps.LatLng(37.5665, 126.978),
            level: 5,
        };

    map = new kakao.maps.Map(mapContainer, options);

    loadPlaces();
    loadSchedule();
    loadCoursePolyline();

    const searchInput = document.getElementById("searchInput");
    const searchBtn = document.getElementById("searchBtn");
    const saveBtn = document.getElementById("saveCourseBtn");

    searchBtn.addEventListener("click", triggerSearch);
    searchInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") triggerSearch();
    });

    saveBtn.addEventListener("click", saveSelectedPlaces);

    const polylineBtn = document.getElementById("showPolylineBtn");
    polylineBtn.addEventListener("click", toggleCoursePolyline);

    const toggleMarkersBtn = document.getElementById("toggleMarkersBtn"); 
    toggleMarkersBtn.addEventListener("click", toggleAllMarkers);
}

function toggleAllMarkers() {
    if (markersVisible) {
        markers.forEach((marker) => marker.setMap(null));
        markersVisible = false;
    } else {
        markers.forEach((marker) => marker.setMap(map));
        markersVisible = true;
    }
}

function triggerSearch() {
    const keyword = document
        .getElementById("searchInput")
        .value.trim()
        .toLowerCase();
    
    filterItinerary(keyword);
    filterMarkers(keyword);
}

window.onload = function () {
    initMap();
};

async function loadPlaces() {
    try {
        const res = await fetch(`${API_BASE}/places`);
        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`장소 조회 실패: ${res.status} - ${errorText}`);
        }
        const places = await res.json();
        allPlaces = places;

        markers.forEach((m) => m.setMap(null));
        markers = [];

        places.forEach((p) => {
            const marker = new kakao.maps.Marker({
                map,
                position: new kakao.maps.LatLng(p.latitude, p.longitude),
                title: p.name,
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

function toggleSelectPlace(place) {
    const index = selectedPlaces.findIndex(
        (p) => p.places_id === place.places_id
    );
    if (index >= 0) selectedPlaces.splice(index, 1);
    else selectedPlaces.push(place);
    renderSelectedList();
}

function renderSelectedList() {
    const list = document.getElementById("coursePlacesList");
    if (!list) return console.error("coursePlacesList not found in DOM");
    list.innerHTML = "";

    selectedPlaces.forEach((p, index) => {
        const li = document.createElement("li");
        li.textContent = `${p.name} (lat: ${p.latitude}, lng: ${p.longitude})`;

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

async function saveSelectedPlaces() {
    if (selectedPlaces.length === 0) {
        alert("저장할 장소를 선택하세요!");
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/course_places/courses/1`);
        if (!res.ok) {
            const errorText = await res.text();
            console.error("❌ 기존 장소 조회 에러:", res.status, errorText);
            throw new Error(`기존 장소 조회 실패: ${res.status}`);
        }
        const existingPlaces = await res.json();
        console.log("saveSelectedPlaces GET data:", existingPlaces);

        const existingPlaceIds = existingPlaces.map((p) => p.places_id);
        const duplicatePlaces = selectedPlaces.filter((p) =>
            existingPlaceIds.includes(p.places_id)
        );
        if (duplicatePlaces.length > 0) {
            const names = duplicatePlaces.map((p) => p.name).join(", ");
            alert(`이미 저장된 장소입니다: ${names}\n그래도 저장됩니다.`);
        }

        const payload = {
            courses_id: 1,
            places: selectedPlaces.map((p) => p.places_id),
        };

        const saveRes = await fetch(`${API_BASE}/course_places/bulk`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        if (!saveRes.ok) {
            const errorText = await saveRes.text();
            console.error("❌ bulk 저장 에러:", saveRes.status, errorText);
            throw new Error(`장소 저장 실패: ${saveRes.status}`);
        }

        const list = await saveRes.json();
        console.log("saveSelectedPlaces POST data:", list);
        renderCoursePlaces(list);

        alert("코스가 저장되었습니다.");
        selectedPlaces = [];
        renderSelectedList();
        loadCoursePolyline();
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
        const lat = p.latitude || "N/A";
        const lng = p.longitude || "N/A";
        const seq = p.sequence || "N/A";

        const li = document.createElement("li");
        li.textContent = `${index + 1}. ${
            p.name || "알 수 없는 장소"
        } (lat: ${lat}, lng: ${lng})`;

        const delBtn = document.createElement("button");
        delBtn.type = "button";
        delBtn.textContent = "코스 삭제";
        delBtn.addEventListener("click", async () => {
            const confirmDelete = confirm(
                `"${
                    p.name || "알 수 없는 장소"
                }" 장소를 코스에서 삭제하시겠습니까?`
            );
            if (confirmDelete) {
                try {
                    const res = await fetch(
                        `${API_BASE}/course_places/places/${p.places_id}`,
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
                    const response = await res.json();
                    console.log("DELETE response:", response);
                    alert(
                        `${p.name || "알 수 없는 장소"} 장소가 삭제되었습니다.`
                    );
                    renderCoursePlaces(response.places);
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

async function showCoursePolyline() {
    try {
        const res = await fetch(`${API_BASE}/course_places/courses/1`);
        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`폴리라인 조회 실패: ${res.status} - ${errorText}`);
        }
        const data = await res.json();
        console.log("showCoursePolyline data:", data);

        const dataArray = Array.isArray(data) ? data : [data];

        if (dataArray.length < 2) {
            alert("폴리라인을 그리려면 최소 2개 이상의 장소가 필요합니다.");
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

function hideCoursePolyline() {
    if (coursePolyline) {
        coursePolyline.setMap(null);
    }
}

async function loadCoursePolyline() {
    try {
        const res = await fetch(`${API_BASE}/course_places/courses/1`);
        if (!res.ok) {
            const errorText = await res.text();
            console.error("❌ 서버 응답 에러:", res.status, errorText);
            throw new Error(`서버 응답 에러: ${res.status}`);
        }
        const data = await res.json();
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

        courseMarkers.forEach((m) => m.setMap(null));
        courseMarkers = [];
        if (coursePolyline) coursePolyline.setMap(null);

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
    container.innerHTML = "";
    try {
        const res = await fetch(`${API_BASE}/schedules/courses/1`);
        const schedules = await res.json();

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
                                    <p>${s.description}</p>
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

kakao.maps.load(initMap);
