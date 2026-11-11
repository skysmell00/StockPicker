/* ================================================================
   Stock Picker 배포 사이트 설정 — 새 버전을 낼 때 여기만 고치면 됩니다.
   ================================================================ */
window.SP_CONFIG = {
  version: "2.1.0",
  releaseDate: "2026-11-11",
  fileSize: "약 19MB",
  requirements: "Windows 10 / 11 (64비트) · 인터넷 연결",

  // 설치 파일: Supabase → Storage → 'releases' 버킷(비공개)에 올린 파일 이름 (배포가이드.md 4단계)
  //  승인된 회원이 로그인해야만 60초짜리 임시 링크로 내려받을 수 있습니다. (GitHub Releases 공개 링크는 쓰지 않습니다)
  storageBucket: "releases",
  downloadFile: "StockPicker-Setup-2.1.0.exe",

  // 로그인 · 회원 가입 · 인증키 요청서 (공개용 publishable 키 — 사이트에 넣어도 안전합니다. secret 키는 절대 금지)
  supabaseUrl: "https://pkroaimoxdeedxajewtr.supabase.co",
  supabaseKey: "sb_publishable_XmoIo7UTb-Nh8nQ9CtjeFA_fmWQr8GA",

  termsVersion: "1.0",          // 인증키 이용약관(license.txt) 버전
  memberTermsVersion: "1.0",    // 사이트 회원 이용약관(member_terms.txt) 버전
  // 후원 (토스) — 둘 다 비워 두면 사이트의 '후원' 메뉴와 섹션이 숨겨집니다.
  //  qrImage : 토스 앱에서 만든 '송금 받기 QR' 이미지를 site 폴더에 넣고 파일 이름을 적으세요. 예: "toss_qr.png"
  //  tossUrl : (있으면) QR을 휴대폰 카메라로 찍었을 때 나오는 https 주소. 버튼으로 표시됩니다.
  donation: {
    qrImage: "toss_qr.png",
    tossUrl: "",
    message: "Stock Picker는 개인 개발자가 시간을 들여 만들고 운영하는 프로그램입니다. 도움이 되셨다면 커피 한 잔 값으로 개발을 응원해 주세요. 후원금은 서버·도구 비용과 기능 개선에 쓰입니다."
  },

  developer: "Jongse Kim",
  contact: "skysmell00@gmail.com",

  // 공지 · 변경 내역 (최신이 위)
  notices: [
    { date: "2026-11-11", type: "업데이트", title: "Stock Picker 2.1.0 — 인증키 한 번 등록 · 자동 업데이트 · 의견 보내기",
      body: "로그인 창에는 이메일·비밀번호만 입력하고, 인증키는 로그인 후 한 번만 등록하면 같은 PC·같은 계정에서 자동 적용됩니다. 새 버전이 나오면 프로그램 안에서 바로 업데이트할 수 있고, [💬 의견 보내기]로 개발자에게 언제든 의견을 보낼 수 있습니다. (2.0.0 사용자는 이번 한 번만 사이트에서 2.1.0을 받아 설치해 주세요)" },
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
