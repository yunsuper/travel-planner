/**
 * 코스 관리 모듈
 */

// API 경로를 동적으로 가져오는 함수
function getAPI() {
    const base = window.API_BASE || window.location.origin;
    return base.replace(/\/$/, "");
}

let selectedPlaces = [];

function getSelectedPlaces() {
    return selectedPlaces;
}

function setSelectedPlaces(places) {
    selectedPlaces = places;
}

// 선택 장소 추가/삭제
function toggleSelectPlace(place) {
    const index = selectedPlaces.findIndex(
        (p) => p.places_id === place.places_id
    );
    if (index > -1) {
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

// 선택된 장소 저장
async function saveSelectedPlaces() {
    if (selectedPlaces.length === 0) {
        alert("저장할 장소를 선택하세요!");
        return;
    }

    try {
        const dbPlaces = selectedPlaces.filter((p) => !p.isTemp);
        const tempPlaces = selectedPlaces.filter((p) => p.isTemp);

        // 기존 장소 조회
        const res = await fetch(`${getAPI()}/course_places/courses/1`);
        if (!res.ok) throw new Error("기존 장소 조회 실패");
        const existingPlaces = window.parseBigIntFields ? window.parseBigIntFields(await res.json()) : await res.json();
        const existingPlaceIds = existingPlaces.map((p) => p.places_id);

        // 중복 처리
        const duplicatePlaces = selectedPlaces.filter(
            (p) => !p.isTemp && existingPlaceIds.includes(p.places_id)
        );
        if (duplicatePlaces.length > 0) {
            const names = duplicatePlaces.map((p) => p.name).join(", ");
            if (!confirm(`이미 저장된 장소: ${names}. 계속 저장하시겠습니까?`)) {
                return;
            }
        }

        // DB에 있는 장소 bulk 저장
        const dbPlaceIdsToSave = dbPlaces
            .filter((p) => !existingPlaceIds.includes(p.places_id))
            .map((p) => p.places_id);

        if (dbPlaceIdsToSave.length > 0) {
            await fetch(`${getAPI()}/course_places/bulk`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    courses_id: 1,
                    places: dbPlaceIdsToSave,
                }),
            });
        }

        // 임시 장소 저장
        for (const p of tempPlaces) {
            const addRes = await fetch(`${getAPI()}/course_places/add-temp`, {
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
                const data = window.parseBigIntFields ? window.parseBigIntFields(await addRes.json()) : await addRes.json();
                p.places_id = data.places_id;
                p.isTemp = false;
            }
        }

        alert("코스가 저장되었습니다.");
        selectedPlaces = [];
        renderSelectedList();
        
        // 폴리라인 갱신
        if (typeof loadCoursePolyline === "function") {
            loadCoursePolyline();
        }
    } catch (err) {
        console.error("❌ 장소 저장 실패:", err);
        alert(`장소 저장에 실패했습니다: ${err.message}`);
    }
}

// 저장된 코스 장소 렌더링
function renderCoursePlaces(places, allPlacesList = []) {
    const ul = document.getElementById("savedCoursesList");
    if (!ul) return console.error("savedCoursesList not found in DOM");
    ul.innerHTML = "";

    const placesArray = Array.isArray(places) ? places : [places];

    if (!placesArray || placesArray.length === 0) {
        ul.innerHTML = "<li>저장된 장소가 없습니다.</li>";
        return;
    }

    placesArray.forEach((p, index) => {
        const fullPlace = allPlacesList.find((ap) => ap.places_id === p.places_id);
        const address = p.address || (fullPlace ? fullPlace.address : "주소 정보 없음");

        const li = document.createElement("li");
        li.textContent = `${index + 1}. ${p.name || "알 수 없는 장소"} (${
            address || "주소 정보 없음"
        })`;

        const delBtn = document.createElement("button");
        delBtn.type = "button";
        delBtn.textContent = "코스 삭제";
        delBtn.addEventListener("click", async () => {
            const confirmDelete = confirm(
                `'${p.name || "알 수 없는 장소"}' 장소를 코스에서 삭제하시겠습니까?`
            );
            if (confirmDelete) {
                try {
                    const res = await fetch(`${getAPI()}/course_places/places/${p.places_id}`, {
                        method: "DELETE",
                    });
                    if (!res.ok) {
                        const errorText = await res.text();
                        throw new Error(`삭제 실패: ${res.status} - ${errorText}`);
                    }
                    const response = window.parseBigIntFields ? window.parseBigIntFields(await res.json()) : await res.json();
                    alert(`'${p.name || "알 수 없는 장소"}' 장소가 삭제되었습니다.`);
                    renderCoursePlaces(response.places, allPlacesList);

                    // 폴리라인 갱신
                    if (typeof loadCoursePolyline === "function") {
                        loadCoursePolyline();
                    }
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

// 전역 함수로 등록
window.getSelectedPlaces = getSelectedPlaces;
window.setSelectedPlaces = setSelectedPlaces;
window.toggleSelectPlace = toggleSelectPlace;
window.renderSelectedList = renderSelectedList;
window.saveSelectedPlaces = saveSelectedPlaces;
window.renderCoursePlaces = renderCoursePlaces;

