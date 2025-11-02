/**
 * main.js에서 제공하는 지도 전역 상태를 보조하기 위한 래퍼 모듈
 * - 중복 전역 선언을 피하고, 없을 수도 있는 헬퍼만 보완한다.
 */

(function () {
    const get = (fn) => (typeof fn === "function" ? fn() : undefined);

    function buildState() {
        return {
            map: get(window.getMapInstance) ?? null,
            markers: get(window.getMarkers) ?? [],
            allPlaces: get(window.getAllPlaces) ?? [],
            courseMarkers: get(window.getCourseMarkers) ?? [],
            markersVisible: window.markersVisible ?? false,
            clusterer: get(window.getClusterer) ?? null,
            activeOverlay: get(window.getActiveOverlay) ?? null,
            lastClickedMarker: get(window.getLastClickedMarker) ?? null,
        };
    }

    function applyState(next) {
        if (!next || typeof next !== "object") return;

        if ("map" in next && typeof window.setMapInstance === "function") {
            window.setMapInstance(next.map);
        }
        if ("markers" in next && typeof window.setMarkers === "function") {
            window.setMarkers(next.markers);
        }
        if ("allPlaces" in next && typeof window.setAllPlaces === "function") {
            window.setAllPlaces(next.allPlaces);
        }
        if ("courseMarkers" in next && typeof window.setCourseMarkers === "function") {
            window.setCourseMarkers(next.courseMarkers);
        }
        if ("clusterer" in next && typeof window.setClusterer === "function") {
            window.setClusterer(next.clusterer);
        }
        if ("activeOverlay" in next && typeof window.setActiveOverlay === "function") {
            window.setActiveOverlay(next.activeOverlay);
        }
        if ("lastClickedMarker" in next && typeof window.setLastClickedMarker === "function") {
            window.setLastClickedMarker(next.lastClickedMarker);
        }
        if ("markersVisible" in next) {
            window.markersVisible = !!next.markersVisible;
        }
    }

    function handleEscapeKeyFallback() {
        const state = buildState();

        if (state.activeOverlay) {
            if (typeof window.closeOverlay === "function") {
                window.closeOverlay();
            } else if (state.activeOverlay.setMap) {
                state.activeOverlay.setMap(null);
                applyState({ activeOverlay: null });
            }
            return true;
        }

        if (state.lastClickedMarker && state.lastClickedMarker.tempId) {
            state.lastClickedMarker.setMap(null);
            if (typeof window.removeSelectedPlace === "function") {
                window.removeSelectedPlace(state.lastClickedMarker.tempId);
            }
            applyState({ lastClickedMarker: null });
            return { removed: true, tempId: state.lastClickedMarker.tempId };
        }

        return false;
    }

    if (typeof window.getMapState !== "function") {
        window.getMapState = buildState;
    }

    if (typeof window.setMapState !== "function") {
        window.setMapState = applyState;
    }

    if (typeof window.handleEscapeKey !== "function") {
        window.handleEscapeKey = handleEscapeKeyFallback;
    }

    if (typeof window.initMapInstance !== "function") {
        window.initMapInstance = () => buildState().map;
    }

    if (typeof window.openOverlay !== "function") {
        window.openOverlay = (overlay) => {
            const state = buildState();
            if (state.activeOverlay) {
                state.activeOverlay.setMap(null);
            }
            overlay.setMap(state.map);
            applyState({ activeOverlay: overlay });
        };
    }

    if (typeof window.closeOverlay !== "function") {
        window.closeOverlay = () => {
            const state = buildState();
            if (state.activeOverlay) {
                state.activeOverlay.setMap(null);
                applyState({ activeOverlay: null });
            }
        };
    }
})();

