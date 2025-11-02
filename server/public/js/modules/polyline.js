/**
 * 폴리라인 관리 모듈
 */

// API 경로를 동적으로 가져오는 함수
function getAPI() {
    const base = window.API_BASE || window.location.origin;
    return base.replace(/\/$/, "");
}

let coursePolyline = null;
let isPolylineVisible = false;

function getCoursePolyline() {
    return coursePolyline;
}

function setCoursePolyline(polyline) {
    coursePolyline = polyline;
}

// 코스 폴리라인 토글
async function toggleCoursePolyline() {
    const btn = document.getElementById("showPolylineBtn");
    const map = window.getMapInstance ? window.getMapInstance() : null;
    if (!map) return;

    if (!isPolylineVisible) {
        await showCoursePolyline(map);
        btn.textContent = "폴리라인 숨기기";
        isPolylineVisible = true;
    } else {
        hideCoursePolyline();
        btn.textContent = "폴리라인 표시";
        isPolylineVisible = false;
    }
}

// 코스 폴리라인 표시
async function showCoursePolyline(map) {
    try {
        const res = await fetch(`${getAPI()}/course_places/courses/1`);
        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`폴리라인 조회 실패: ${res.status} - ${errorText}`);
        }
        const data = window.parseBigIntFields ? window.parseBigIntFields(await res.json()) : await res.json();
        const dataArray = Array.isArray(data) ? data : [data];

        if (dataArray.length < 2) {
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
    const map = window.getMapInstance ? window.getMapInstance() : null;
    if (!map) return;

    try {
        const res = await fetch(`${getAPI()}/course_places/courses/1`);
        if (!res.ok) {
            const errorText = await res.text();
            console.error("❌ 서버 응답 에러:", res.status, errorText);
            throw new Error(`서버 응답 에러: ${res.status}`);
        }
        const data = window.parseBigIntFields ? window.parseBigIntFields(await res.json()) : await res.json();
        const dataArray = Array.isArray(data) ? data : [data];

        const list = document.getElementById("savedCoursesList");
        if (!list) return console.error("savedCoursesList not found in DOM");
        list.innerHTML = "";

        if (dataArray.length === 0) {
            list.innerHTML = "<li>저장된 장소가 없습니다.</li>";
            return;
        }

        // 코스 장소 렌더링
        if (typeof window.renderCoursePlaces === "function") {
            const allPlaces = window.getAllPlaces ? window.getAllPlaces() : [];
            window.renderCoursePlaces(dataArray, allPlaces);
        }

        // 기존 코스 마커와 폴리라인 제거
        if (typeof window.clearCourseMarkers === "function") {
            window.clearCourseMarkers();
        }
        if (coursePolyline) coursePolyline.setMap(null);

        // 클러스터러 초기화
        if (typeof window.clearClusterer === "function") {
            window.clearClusterer();
        }

        // 코스 마커 생성
        const courseMarkers = [];
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

        if (typeof window.setCourseMarkers === "function") {
            window.setCourseMarkers(courseMarkers);
        }

        // 지도 범위 조정
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

// 전역 함수로 등록
window.toggleCoursePolyline = toggleCoursePolyline;
window.showCoursePolyline = showCoursePolyline;
window.hideCoursePolyline = hideCoursePolyline;
window.loadCoursePolyline = loadCoursePolyline;

