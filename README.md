# travel-planner (v1.1.0)

A web application built with the Kakao Map API featuring alarms, memos, saved routes with polylines, and marker clustering.

지도 기반 장소·코스 관리와 알람 기능을 제공하는 개인 사이드 프로젝트입니다. 아이디어 정리와 코드 작성에 ChatGPT의 도움을 받았습니다.

---

## ✨ 주요 기능 (Key Features)

- **지도 기반 장소 검색** → Kakao Map API로 검색/좌표 선택 모두 지원
- **코스 저장** → 선택한 여러 장소를 한 번에 코스로 저장 및 재조회
- **폴리라인 표시** → 저장된 코스를 선으로 연결해 한눈에 동선을 파악
- **마커 & 클러스터링 토글** → 마커를 표시/숨기고 클러스터링으로 정리
- **유연한 장소 선택** → 검색창에서 정확한 장소명 입력 또는 지도 클릭으로 지정
- **알람 기능** → 알람 등록·삭제가 DB와 동기화, 알림음 재생 후 확인 시 종료
- **알람 메모** → 알람 메시지에 2000자 내 메모 입력 가능
- **BigInt/시간대 대응** → MariaDB BigInt 직렬화, ISO 시간 처리 보완

---

## 🛠️ Tech Stack | 기술 스택

### Frontend

- HTML5 / CSS3 / JavaScript (ES6+)
- Kakao Map API (지도, 검색, 마커, 폴리라인, 클러스터링)

### Backend

- Node.js (Express 5)
- MariaDB (또는 MySQL2) with `mariadb`
- Express Validator / Helmet / dotenv

### Tools

- Git & GitHub
- Visual Studio Code
- `mysql2` 콘솔로 CRUD 검증
- Ngrok (외부 접근 테스트)

### 🙌 Acknowledgements
Kakao Map API 팀
MariaDB / Express 오픈 소스 생태계
ChatGPT (OpenAI) – 아이디어 정리와 코드 보조

🖼️ Screenshots

<img width="813" height="871" alt="스크린샷 2025-10-18 오후 9 17 35" src="https://github.com/user-attachments/assets/25c54ba8-03a0-469e-a841-84e3fc219184" />

<img width="813" height="673" alt="스크린샷 2025-10-18 오후 9 18 14" src="https://github.com/user-attachments/assets/75051640-a027-4468-bfa5-0b1c928921f5" />

<img width="470" height="338" alt="스크린샷 2025-10-18 오후 9 25 21" src="https://github.com/user-attachments/assets/b4748588-3a95-4911-be49-fe566a8f042c" />

<img width="750" height="407" alt="스크린샷 2025-10-18 오후 9 26 16" src="https://github.com/user-attachments/assets/24ba5dd0-1555-4dfc-acba-870cfa686af8" />

