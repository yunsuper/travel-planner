const ALARMS_API = "http://localhost:3000";
const COURSE_ID = 1; // 현재 코스 ID, 필요시 동적 변경 가능

const alarmTimeInput = document.getElementById("alarmTime");
const alarmMessageInput = document.getElementById("alarmMessage");
const addAlarmBtn = document.getElementById("addAlarmBtn");
const alarmList = document.getElementById("alarmList");

let alarms = [];

// 브라우저 알람 울림
function scheduleAlarm(alarm) {
    if (alarm.scheduled) return; // 중복 예약 방지
    alarm.scheduled = true;

    const now = new Date();
    const alarmTime = new Date(alarm.alarm_time);
    const diff = alarmTime - now;
    if (diff > 0) {
        setTimeout(() => {
            // 오디오 객체 생성
            const audio = new Audio("/sounds/alarm.mp3"); // 경로 확인
            audio.loop = true; // 반복 재생

            // 재생 시도
            audio.play().catch((e) => console.warn("오디오 재생 실패:", e));

            // 브라우저 기본 alert 대신 커스텀 모달
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
    box.style.border = "2px solid white"; // 흰색 테두리 2px
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

// 알람 렌더링
function renderAlarms() {
    alarmList.innerHTML = "";
    alarms.forEach((alarm) => {
        const li = document.createElement("li");
        li.textContent = `${new Date(alarm.alarm_time).toLocaleString()} - ${
            alarm.message
        }`;

        const delBtn = document.createElement("button");
        delBtn.textContent = "삭제";
        delBtn.style.marginLeft = "8px";
        delBtn.addEventListener("click", async () => {
            if (!confirm(`"${alarm.message}" 알람을 삭제하시겠습니까?`)) return;
            try {
                const res = await fetch(
                    `${ALARMS_API}/alarms/${alarm.alarms_id}`,
                    {
                        method: "DELETE",
                    }
                );
                if (!res.ok) throw new Error("삭제 실패");
                alarms = alarms.filter((a) => a.alarms_id !== alarm.alarms_id);
                renderAlarms();
            } catch (err) {
                console.error("알람 삭제 실패:", err);
                alert("알람 삭제에 실패했습니다.");
            }
        });

        li.appendChild(delBtn);
        alarmList.appendChild(li);

        // 알람 시간 예약
        scheduleAlarm(alarm);
    });
}

// DB에서 알람 조회
async function loadAlarms() {
    try {
        const res = await fetch(`${ALARMS_API}/alarms/courses/${COURSE_ID}`);
        if (!res.ok) throw new Error("알람 조회 실패");
        const data = await res.json();
        alarms = data;
        renderAlarms();
    } catch (err) {
        console.error(err);
        alarmList.innerHTML = "<li>알람을 불러올 수 없습니다.</li>";
    }
}

// 새로운 알람 등록
async function addAlarm() {
    const timeValue = alarmTimeInput.value;
    const messageValue = alarmMessageInput.value.trim();

    if (!timeValue || !messageValue) {
        alert("시간과 메시지를 모두 입력해주세요.");
        return;
    }

    try {
        const res = await fetch(`${ALARMS_API}/alarms`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                courses_id: COURSE_ID,
                message: messageValue,
                alarm_time: timeValue,
            }),
        });

        // 서버 응답을 한 번만 읽음
        const newAlarm = await res.json();

        if (!res.ok) {
            console.error(
                `서버 응답 에러: ${res.status} - ${
                    newAlarm.error || "알 수 없음"
                }`
            );
            return; // 실패해도 팝업은 안 뜨게
        }

        alarms.push(newAlarm);
        renderAlarms();
        alert("✅ 알람이 등록되었습니다!");

        // 입력 초기화
        alarmTimeInput.value = "";
        alarmMessageInput.value = "";
    } catch (err) {
        console.error(err);
    }
}

addAlarmBtn.addEventListener("click", addAlarm);

// 초기 로드
loadAlarms();
