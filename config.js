/* ================================================================
   Stock Picker 배포 사이트 설정 — 새 버전을 낼 때 여기만 고치면 됩니다.
   ================================================================ */
window.SP_CONFIG = {
  version: "1.0.0",
  releaseDate: "2026-11-10",
  fileSize: "약 17MB",
  requirements: "Windows 10 / 11 (64비트) · 인터넷 연결",

  // GitHub Releases 에 올린 설치 파일 주소 (배포가이드.md 4단계)
  // 형식: https://github.com/<GitHub 아이디>/stockpicker/releases/download/v1.0.0/StockPicker-Setup-1.0.0.exe
  downloadUrl: "https://github.com/skysmell00/StockPicker/releases/download/v1.0.0/StockPicker-Setup-1.0.0.exe",
  portableUrl: "https://github.com/skysmell00/StockPicker/releases/download/v1.0.0/StockPicker-1.0.0-portable.zip",

  // 회원 가입 · 인증키 신청 접수용 (공개용 publishable 키 — 사이트에 넣어도 안전합니다. secret 키는 절대 금지)
  supabaseUrl: "https://pkroaimoxdeedxajewtr.supabase.co",
  supabaseKey: "sb_publishable_XmoIo7UTb-Nh8nQ9CtjeFA_fmWQr8GA",

  termsVersion: "1.0",          // 인증키 이용약관(license.txt) 버전
  memberTermsVersion: "1.0",    // 사이트 회원 이용약관(member_terms.txt) 버전
  developer: "Jongse Kim",
  contact: "skysmell00@gmail.com",

  // 공지 · 변경 내역 (최신이 위)
  notices: [
    { date: "2026-11-10", type: "안내", title: "회원 가입 방식 안내",
      body: "회원 가입을 신청하면 운영자가 확인 후 승인합니다. 승인된 회원은 인증키 사용을 신청할 수 있으며, 인증키는 현재 무료로 부여됩니다." },
    { date: "2026-11-10", type: "출시", title: "Stock Picker 1.0.0 출시",
      body: "업종·테마별 추천 TOP 5, 단기 투자 factor 점수, DART 공시 분석, 국내·미국 장 상태와 실시간 지수, 즐겨찾기를 제공합니다." },
    { date: "2026-11-10", type: "약관", title: "이용약관 및 개인정보 처리 안내 v1.0 제정",
      body: "인증키 1개는 동시에 1대의 PC에서만 사용할 수 있으며, 무단 배포·사용·수정을 금지합니다." }
  ]
};
