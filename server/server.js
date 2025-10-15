const express = require("express");
const path = require("path");
const helmet = require("helmet");
const app = express();
app.use(express.json());

// dotenv 모듈
const dotenv = require("dotenv");
dotenv.config();

app.listen(process.env.PORT);

// CSP 설정
app.use(
    helmet.contentSecurityPolicy({
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: [
                "'self'",
                "'unsafe-eval'",
                "https://dapi.kakao.com",
                "https://t1.daumcdn.net",
                "http://t1.daumcdn.net",
            ],
            scriptSrcElem: [
                "'self'",
                "https://dapi.kakao.com",
                "https://t1.daumcdn.net",
                "http://t1.daumcdn.net",
            ],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: [
                "'self'",
                "data:",
                "https://t1.daumcdn.net",
                "https://ssl.pstatic.net",
                "http://t1.daumcdn.net",
                "http://mts.daumcdn.net",
                "https://map.daumcdn.net",
                "https://map.kakao.com",
                "https://s1.daumcdn.net",
            ],
            connectSrc: [
                "'self'",
                "http://localhost:3000",
                "https://dapi.kakao.com", 
            ],
        },
    })
);


app.use("/places", require("../routes/places"));
app.use("/courses", require("../routes/courses"));
app.use("/course_places", require("../routes/course_places"));
app.use("/schedules", require("../routes/schedules"));
app.use("/alarms", require("../routes/alarms"));

// 정적 파일 
app.use(express.static(path.join(__dirname, "public"), { maxAge: 0 }));

// index.html 전송
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../index.html"));
});

app.get("/api/config", (req, res) => { 
    res.json({
        apiBaseUrl: `http://localhost:${process.env.PORT}`,
        kakaoMapApiKey: process.env.KAKAO_MAP_API_KEY,
    });
});

const fs = require("fs");
console.log(path.join(__dirname, "..", "index.html"));
console.log(fs.existsSync(path.join(__dirname, "..", "index.html")));


