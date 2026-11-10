/* ================================================================
   Stock Picker 배포 사이트 설정 — 새 버전을 낼 때 여기만 고치면 됩니다.
   ================================================================ */
window.SP_CONFIG = {
  version: "2.0.0",
  releaseDate: "2026-11-10",
  fileSize: "약 17MB",
  requirements: "Windows 10 / 11 (64비트) · 인터넷 연결",

  // 설치 파일: Supabase → Storage → 'releases' 버킷(비공개)에 올린 파일 이름 (배포가이드.md 4단계)
  //  승인된 회원이 로그인해야만 60초짜리 임시 링크로 내려받을 수 있습니다. (GitHub Releases 공개 링크는 쓰지 않습니다)
  storageBucket: "releases",
  downloadFile: "StockPicker-Setup-2.0.0.exe",

  // 로그인 · 회원 가입 · 인증키 요청서 (공개용 publishable 키 — 사이트에 넣어도 안전합니다. secret 키는 절대 금지)
  supabaseUrl: "https://pkroaimoxdeedxajewtr.supabase.co",
  supabaseKey: "sb_publishable_XmoIo7UTb-Nh8nQ9CtjeFA_fmWQr8GA",

  termsVersion: "1.0",          // 인증키 이용약관(license.txt) 버전
  memberTermsVersion: "1.0",    // 사이트 회원 이용약관(member_terms.txt) 버전
  developer: "Jongse Kim",
  contact: "skysmell00@gmail.com",

  // 공지 · 변경 내역 (최신이 위)
  notices: [
    { date: "2026-11-10", type: "안내", title: "회원제 운영 안내",
      body: "사이트에서 회원 가입(실명·이메일·비밀번호·휴대폰·약관 동의 필수)을 신청하면 운영자가 확인 후 승인하고 이메일로 알려 드립니다. 승인된 회원만 설치 파일을 내려받을 수 있습니다." },
    { date: "2026-11-10", type: "업데이트", title: "Stock Picker 2.0.0 — 회원 로그인",
      body: "프로그램을 실행하면 로그인 창에서 사이트 회원 이메일·비밀번호와 인증키를 입력합니다. 인증키가 없으면 로그인 창 아래 [인증키 신청]에서 약관에 동의하고 신청하세요. 인증키는 가입 이메일로 보내 드립니다." },
    { date: "2026-11-10", type: "출시", title: "Stock Picker 1.0.0 출시",
      body: "업종·테마별 추천 TOP 5, 단기 투자 factor 점수, DART 공시 분석, 국내·미국 장 상태와 실시간 지수, 즐겨찾기를 제공합니다." },
    { date: "2026-11-10", type: "약관", title: "이용약관 및 개인정보 처리 안내 v1.0 제정",
      body: "인증키 1개는 동시에 1대의 PC에서만 사용할 수 있으며, 무단 배포·사용·수정을 금지합니다." }
  ]
};
