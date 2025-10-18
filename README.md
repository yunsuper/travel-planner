# travel-planner
A web application built with the Kakao Map API featuring alarms, memos, saved routes with polylines, and marker clustering.

## 주요 기능
1. 지도 기반 장소 검색
2. 선택된 여러개의 장소를 한번에 코스로 저장
3. 폴리라인 버튼 -> 저장된 코스를 연결
4. 마커, 클리스터링 버튼 -> 저장된 코스의 장소들을 마커 표시/숨기기, 플리스터링 표시/숨기기
5. 검색창으로 정확한 장소명 입력으로 장소를 선택할 수도 있고, 맵을 클릭해서 선택할 수도 있음
6. 알람 사운드와 함께 알람 기능. 확인 누르면 사운드 종료
7. 알람 기능에 간단한 메모(2000자)기능 포함
8. 카카오맵 API 연동

## Features
1. Map-based place search
2. Save multiple selected places as a single course
3. Polyline button – Connects saved course locations with lines
4. Marker / Clustering button – Show or hide markers of saved course locations, and toggle clustering view
5. Flexible selection – Choose a place either by typing its exact name in the search bar or by clicking directly on the map
6. Alarm feature – Plays an alert sound; stops when the user confirms
7. Memo function – Add short notes (up to 2000 characters) along with the alarm
8. Integrated with the Kakao Map API


## Tech Stack | 기술 스택
Frontend / 프론트엔드
HTML5, CSS3, JavaScript (ES6+) – 기본 웹 UI 구성 및 동적 기능 구현
Kakao Map API – 지도 표시, 장소 검색, 마커·폴리라인·클러스터링 기능 구현

Backend / 백엔드
Node.js (Express) – API 서버 및 데이터 처리
MariaDB (or MySQL) – 사용자 데이터, 저장된 코스, 메모 저장

Tools / 개발 도구
Git & GitHub – 버전 관리 및 협업
Visual Studio Code – 개발 환경
Postman – API 테스트
Ngrok – 로컬 서버 외부 공개 및 테스트


### This is my first personal project, developed with the assistance of AI (ChatGPT) for idea refinement, coding.
