const COURSE_ID = 1; // 현재 코스 ID, 필요시 동적 변경 가능

let alarmTimeInput, alarmMessageInput, addAlarmBtn, alarmList;
let alarms = JSON.parse(localStorage.getItem("alarms") || "[]");

// 알람 저장 (로컬 캐시 용도)
function saveAlarms() {
    localStorage.setItem("alarms", JSON.stringify(alarms));
}

function toDate(alarmTime) {
    if (!alarmTime) return null;
    const isoLike = alarmTime.includes("T")
        ? alarmTime
        : alarmTime.replace(" ", "T");
    const date = new Date(isoLike);
    return Number.isNaN(date.getTime()) ? null : date;
}

// 브라우저 알람 울림
function scheduleAlarm(alarm) {
    if (alarm.scheduled) return; // 중복 예약 방지
    const alarmDate = toDate(alarm.alarm_time);
    if (!alarmDate) {
        console.warn("알람 시간을 해석할 수 없습니다:", alarm.alarm_time);
        return;
    }

    alarm.scheduled = true;

    const diff = alarmDate - new Date();
    if (diff > 0) {
        setTimeout(() => {
            const audio = new Audio("/sounds/alarm.mp3");
            audio.loop = true;
            audio.play().catch((e) => console.warn("오디오 재생 실패:", e));

            showCustomModal(alarm.message, () => {
                audio.pause();
                audio.currentTime = 0;
            });
        }, diff);
    }
}

function showCustomModal(message, onConfirm) {
    const modal = document.createElement("div");
    modal.style.position = "fixed";
    modal.style.top = "0";
    modal.style.left = "0";
    modal.style.width = "100%";
    modal.style.height = "100%";
    modal.style.background = "rgba(0,0,0,0.5)";
    modal.style.display = "flex";
    modal.style.alignItems = "center";
    modal.style.justifyContent = "center";
    modal.style.zIndex = "9999";

    const box = document.createElement("div");
    box.className = "modal-box";
    box.style.background = "#000000ff";
    box.style.color = "white";
    box.style.padding = "20px";
    box.style.borderRadius = "8px";
    box.style.minWidth = "200px";
    box.style.border = "2px solid white";
    box.innerHTML = `
        <p style="margin-bottom:12px;">${message}</p>
        <button>확인</button>
    `;
    modal.appendChild(box);
    document.body.appendChild(modal);

    box.querySelector("button").addEventListener("click", () => {
        document.body.removeChild(modal);
        if (onConfirm) onConfirm();
    });
}

// 서버에서 알람 목록 불러오기
async function loadAlarms() {
    try {
        const res = await fetch(
            `${window.API_BASE}/alarms/courses/${COURSE_ID}`
        );
        if (!res.ok) throw new Error(`알람 조회 실패: ${res.status}`);
        const data = await res.json();
        alarms = Array.isArray(data) ? data : data[0] || [];
        saveAlarms();
    } catch (err) {
        console.error("❌ 알람 불러오기 실패:", err);
    } finally {
        renderAlarms();
    }
}

// 알람 렌더링
function renderAlarms() {
    if (!alarmList) {
        console.error("alarmList DOM 요소가 초기화되지 않았습니다.");
        return;
    }
    alarmList.innerHTML = "";
    alarms.forEach((alarm) => {
        const date = toDate(alarm.alarm_time);
        const displayText = date
            ? `${date.toLocaleString()} - ${alarm.message}`
            : `${alarm.alarm_time} - ${alarm.message}`;

        const li = document.createElement("li");
        li.textContent = displayText;

        const delBtn = document.createElement("button");
        delBtn.textContent = "삭제";
        delBtn.style.marginLeft = "8px";
        delBtn.addEventListener("click", async () => {
            if (!confirm(`"${alarm.message}" 알람을 삭제하시겠습니까?`)) return;

            try {
                const res = await fetch(
                    `${window.API_BASE}/alarms/${alarm.alarms_id}`,
                    {
                        method: "DELETE",
                    }
                );
                if (!res.ok) throw new Error(`삭제 실패: ${res.status}`);
                alarms = alarms.filter((a) => a.alarms_id !== alarm.alarms_id);
                saveAlarms();
                renderAlarms();
            } catch (err) {
                console.error("❌ 알람 삭제 실패:", err);
                alert("알람 삭제에 실패했습니다. 잠시 후 다시 시도하세요.");
            }
        });

        li.appendChild(delBtn);
        alarmList.appendChild(li);
        scheduleAlarm(alarm);
    });
}

// 새로운 알람 등록
async function addAlarm() {
    const timeValue = alarmTimeInput.value;
    const messageValue = alarmMessageInput.value.trim();

    if (!timeValue || !messageValue) {
        alert("시간과 메시지를 모두 입력해주세요.");
        return;
    }

    const localDate = new Date(timeValue);
    if (Number.isNaN(localDate.getTime())) {
        alert("유효한 날짜/시간을 입력해주세요.");
        return;
    }

    const newAlarmPayload = {
        courses_id: COURSE_ID,
        message: messageValue,
        alarm_time: localDate.toISOString(), // ISO8601 변환
    };

    try {
        const res = await fetch(`${window.API_BASE}/alarms`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newAlarmPayload),
        });
        if (!res.ok) throw new Error(`등록 실패: ${res.status}`);
        const savedAlarm = await res.json();

        const normalizedAlarm = {
            alarms_id: savedAlarm.alarms_id,
            courses_id: savedAlarm.courses_id,
            message: savedAlarm.message,
            alarm_time: savedAlarm.alarm_time,
            scheduled: false,
        };

        alarms.push(normalizedAlarm);
        saveAlarms();
        renderAlarms();

        alarmTimeInput.value = "";
        alarmMessageInput.value = "";
        alert("✅ 알람이 등록되었습니다!");
    } catch (err) {
        console.error("❌ 알람 등록 실패:", err);
        alert("알람 등록에 실패했습니다. 잠시 후 다시 시도하세요.");
    }
}

// 초기화
function initAlarms() {
    if (alarmTimeInput && alarmMessageInput && addAlarmBtn && alarmList) {
        return;
    }

    alarmTimeInput = document.getElementById("alarmTime");
    alarmMessageInput = document.getElementById("alarmMessage");
    addAlarmBtn = document.getElementById("addAlarmBtn");
    alarmList = document.getElementById("alarmList");

    if (!alarmTimeInput || !alarmMessageInput || !addAlarmBtn || !alarmList) {
        console.error("알람 관련 DOM 요소를 찾을 수 없습니다.");
        return;
    }

    addAlarmBtn.addEventListener("click", (e) => {
        e.preventDefault();
        addAlarm();
    });

    loadAlarms();
}

window.initAlarms = initAlarms;
