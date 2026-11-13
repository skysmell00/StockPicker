/* Stock Picker 배포 사이트 동작 (회원제)
   - 회원 가입(Supabase Auth: 실명·이메일·비밀번호·휴대폰·약관 동의 필수) → 운영자 승인(Stock Picker Controller)
   - 승인된 회원만 로그인해 설치 파일 다운로드(비공개 저장소의 60초 임시 링크)
   - 인증키 신청은 프로그램 로그인 창에서, 인증키는 가입 이메일로 발송 */
(function () {
  const C = window.SP_CONFIG || {};
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  const NAME = /^[가-힣A-Za-z][가-힣A-Za-z ]{0,38}[가-힣A-Za-z]$/;
  const PHONE = /^01[0-9]{8,9}$/;
  // 비밀번호: 8~12자, 영문 대문자 + 소문자 + 숫자 + 특수기호
  const PW_RULES = {
    len: (p) => p.length >= 8 && p.length <= 12, upper: (p) => /[A-Z]/.test(p), lower: (p) => /[a-z]/.test(p),
    digit: (p) => /[0-9]/.test(p), special: (p) => /[^A-Za-z0-9]/.test(p) && !/\s/.test(p)
  };
  const PW_LABEL = { len: "8~12자", upper: "영문 대문자", lower: "영문 소문자", digit: "숫자", special: "특수기호" };
  const show = (id, text, ok) => { const m = $(id); if (m) { m.textContent = text || ""; m.className = "msg " + (ok ? "ok" : "err"); } };
  const hide = (el, yes) => { if (el) el.hidden = !!yes; };

  // ---- 버전 정보 ----
  if ($("hero-badge")) $("hero-badge").textContent = `Windows 프로그램 · v${C.version || "-"}`;
  if ($("dl-version")) {
    $("dl-version").textContent = C.version || "-";
    $("dl-date").textContent = C.releaseDate || "-";
    $("dl-size").textContent = C.fileSize || "-";
    $("dl-req").textContent = C.requirements || "-";
  }

  // ---- 서버(Supabase) 연결 ----
  const sb = (window.supabase && C.supabaseUrl && C.supabaseKey)
    ? window.supabase.createClient(C.supabaseUrl.replace(/\/+$/, ""), C.supabaseKey,
                                   { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
    : null;

  // Supabase 영어 오류 → 한국어
  function korean(err) {
    const t = String((err && (err.message || err.error_description)) || err || "");
    if (/invalid login credentials/i.test(t)) return "이메일 또는 비밀번호가 맞지 않습니다.";
    if (/already registered|already exists/i.test(t)) return "이미 가입된 이메일입니다. 로그인하세요. (비밀번호를 잊었다면 '비밀번호를 잊으셨나요?')";
    if (/email not confirmed/i.test(t)) return "이메일 확인이 필요합니다. 받은 메일의 확인 링크를 누른 뒤 로그인하세요.";
    if (/password/i.test(t) && /(at least|short|weak|contain|character)/i.test(t)) return "가입이 거절되었습니다. 비밀번호는 8~12자, 영문 대문자·소문자·숫자·특수기호를 모두 넣어야 합니다.";
    if (/rate limit|too many/i.test(t)) return "요청이 너무 많습니다. 잠시 후 다시 시도하세요.";
    if (/필수 항목 누락/.test(t)) return "가입이 거절되었습니다. " + t.replace(/^.*?(필수 항목 누락)/, "$1");
    if (/database error saving new user/i.test(t)) return "가입이 거절되었습니다. 실명·휴대폰 번호·약관 동의 등 필수 항목을 확인하세요.";
    if (/same.*password|different from the old/i.test(t)) return "이전과 다른 비밀번호를 입력하세요.";
    if (/failed to fetch|network/i.test(t)) return "서버에 연결하지 못했습니다. 인터넷 연결을 확인하세요.";
    if (/object not found|not found/i.test(t)) return "설치 파일을 찾을 수 없습니다. 개발자에게 문의해 주세요.";
    return t || "처리하지 못했습니다. 잠시 후 다시 시도하세요.";
  }

  const APPROVAL = { pending: ["승인 대기", "wait"], approved: ["승인 완료", "ok"], rejected: ["승인 거절", "bad"] };
  const ROLE = { general: "일반 회원", premium: "프리미엄 회원", monitor: "모니터 회원", admin: "관리자 (모든 기능)" };
  let me = null;           // my_member() 결과
  let recovering = false;  // 비밀번호 재설정 링크로 들어옴

  function setView(view) {
    hide($("acct-loading"), view !== "loading");
    hide($("acct-out"), view !== "out");
    hide($("acct-in"), view !== "in");
    hide($("reset-form"), view !== "reset");
    const nav = $("nav-account");
    if (nav) nav.textContent = view === "in" && me ? `👤 ${me.name}님` : "로그인 · 회원 가입";
    if ($("acct-title")) $("acct-title").textContent = view === "in" ? "내 정보 · 인증키" : "회원 가입 · 로그인";
  }

  function renderDownload() {
    const locked = $("dl-locked"), open = $("dl-open");
    if (!locked) return;
    let title = "🔒 회원 전용", text = "로그인한 승인 회원만 내려받을 수 있습니다.", btn = "로그인 · 회원 가입", canDl = false;
    if (me) {
      if (me.status === "suspended") { title = "⛔ 이용 정지"; text = "이용이 제한된 회원입니다. 개발자에게 문의하세요."; btn = "내 정보 보기"; }
      else if (me.approval === "pending") { title = "⏳ 승인 대기 중"; text = "운영자가 가입을 승인하면 내려받을 수 있습니다."; btn = "내 정보 보기"; }
      else if (me.approval === "rejected") { title = "가입 승인 거절"; text = "가입이 승인되지 않았습니다. 개발자에게 문의하세요."; btn = "내 정보 보기"; }
      else canDl = !!me.can_download;
    }
    hide(locked, canDl); hide(open, !canDl);
    $("dl-lock-title").textContent = title; $("dl-lock-text").textContent = text; $("dl-lock-btn").textContent = btn;
  }

  function renderMe() {
    if (!me) return;
    $("me-name").textContent = me.name || "-";
    $("me-email").textContent = me.email || "-";
    const ap = me.status === "suspended" ? ["이용 정지", "bad"] : me.status === "withdrawn" ? ["탈퇴", "bad"]
             : (APPROVAL[me.approval] || [me.approval, ""]);
    const pill = $("me-approval"); pill.textContent = ap[0]; pill.className = "pill " + ap[1];
    const approved = me.approval === "approved" && me.status === "active";
    $("me-role").textContent = approved ? (ROLE[me.role] || "-") : "-";
    $("me-period").textContent = !approved ? "-" : (me.role === "monitor" || me.is_admin) ? "기간 제한 없음"
                               : me.subscription_end ? `${me.subscription_end} 까지` : "-";
    $("me-note").textContent = me.approval === "pending" ? "가입 신청이 접수되었습니다. 운영자가 확인 후 승인하면 설치 파일 다운로드와 인증키 요청서 제출이 가능합니다."
      : me.approval === "rejected" ? "가입이 승인되지 않았습니다. 궁금한 점은 " + (C.contact || "개발자") + " 로 문의하세요." : "";

    // 인증키 안내 상태
    const gs = $("guide-state");
    let g = "";
    if (me.is_admin) {
      $("me-note").innerHTML = '관리자 계정입니다. <a href="admin.html">관리자 페이지 열기 →</a>';
      g = "🛡 관리자 계정은 인증키가 필요 없습니다. Stock Picker에서 이 이메일(또는 아이디 admin)로 로그인하면 바로 사용할 수 있습니다.";
    } else if (!approved) g = "회원 가입이 승인되면 설치 파일을 받고 인증키를 신청할 수 있습니다.";
    else if (me.request_status === "pending") g = "⏳ 인증키 신청을 확인하고 있습니다. 부여되면 가입 이메일로 보내 드립니다.";
    else if (me.has_key && me.role !== "general") g = "✔ 인증키가 발급되어 있습니다. 가입 이메일로 받은 인증키로 로그인하세요.";
    else if (me.has_key) g = "사용 기간이 끝났습니다. 프로그램 로그인 창의 [인증키 신청]으로 연장을 신청하세요.";
    gs.textContent = g; hide(gs, !g);
  }

  async function loadMe() {
    if (!sb) { setView("out"); show("login-msg", "로그인 서버가 아직 준비되지 않았습니다.", false); return; }
    const { data: { session } } = await sb.auth.getSession();
    if (recovering) { setView("reset"); return; }
    if (!session) { me = null; setView("out"); renderDownload(); return; }
    const { data, error } = await sb.rpc("my_member");
    if (error || !data || !data.ok) {
      me = null; setView("out"); renderDownload();
      show("login-msg", error ? korean(error) : (data && data.message) || "회원 정보를 불러오지 못했습니다.", false);
      return;
    }
    me = data; setView("in"); renderMe(); renderDownload();
  }

  // ---- 로그인 ----
  const loginForm = $("login-form");
  if (loginForm) loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = $("login-email").value.trim(), pw = $("login-pw").value;
    if (!EMAIL.test(email)) return show("login-msg", "이메일 주소를 확인하세요.", false);
    if (!pw) return show("login-msg", "비밀번호를 입력하세요.", false);
    if (!sb) return show("login-msg", "로그인 서버가 아직 준비되지 않았습니다.", false);
    $("login-btn").disabled = true; show("login-msg", "로그인하는 중...", true);
    const { error } = await sb.auth.signInWithPassword({ email, password: pw });
    $("login-btn").disabled = false;
    if (error) return show("login-msg", korean(error), false);
    show("login-msg", "", true); loginForm.reset();
    await loadMe();
  });

  // ---- 비밀번호 찾기 ----
  const forgot = $("forgot-link");
  if (forgot) forgot.addEventListener("click", async (e) => {
    e.preventDefault();
    const email = $("login-email").value.trim();
    if (!EMAIL.test(email)) return show("login-msg", "위 이메일 칸에 가입한 이메일을 입력한 뒤 다시 누르세요.", false);
    if (!sb) return;
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
    if (error) return show("login-msg", korean(error), false);
    show("login-msg", "비밀번호 재설정 메일을 보냈습니다. 메일의 링크를 누르면 이 사이트에서 새 비밀번호를 정할 수 있습니다.", true);
  });

  // ---- 회원 가입 신청 ----
  const joinForm = $("join-form");
  if (joinForm) joinForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = $("join-name").value.trim(), email = $("join-email").value.trim();
    const pw = $("join-pw").value, pw2 = $("join-pw2").value;
    const phone = $("join-phone").value.replace(/[^0-9]/g, "");
    const missing = [];
    if (!NAME.test(name)) missing.push("실명(한글 또는 영문 2자 이상)");
    if (!EMAIL.test(email)) missing.push("이메일");
    const bad = Object.keys(PW_RULES).filter((r) => !PW_RULES[r](pw));
    if (bad.length) missing.push("비밀번호 규칙(" + bad.map((r) => PW_LABEL[r]).join(", ") + ")");
    else if (pw !== pw2) missing.push("비밀번호 확인 일치");
    if (!PHONE.test(phone)) missing.push("휴대폰 번호");
    if (!$("join-agree-terms").checked) missing.push("회원 이용약관 동의");
    if (!$("join-agree-privacy").checked) missing.push("개인정보 수집·이용 동의");
    if (missing.length) return show("join-msg", "가입이 거절되었습니다. 다음 필수 항목을 확인하세요: " + missing.join(" · "), false);
    if (!sb) return show("join-msg", "가입 서버가 아직 준비되지 않았습니다.", false);
    $("join-btn").disabled = true; show("join-msg", "가입 신청하는 중...", true);
    const { data, error } = await sb.auth.signUp({
      email, password: pw,
      options: { data: { name, phone, terms_version: C.memberTermsVersion || "1.0" },
                 emailRedirectTo: location.origin + location.pathname }
    });
    $("join-btn").disabled = false;
    if (error) return show("join-msg", korean(error), false);
    if (data && data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0)
      return show("join-msg", "이미 가입된 이메일입니다. 로그인하세요.", false);
    joinForm.reset();
    if (data && data.session) {
      await loadMe();
      show("me-msg", "회원 가입 신청이 접수되었습니다. 운영자 승인을 기다려 주세요.", true);
    } else {
      show("join-msg", "가입 신청이 접수되었습니다. 받은 메일의 확인 링크를 누른 뒤 로그인하세요. 운영자 승인 후 이용할 수 있습니다.", true);
    }
  });

  // ---- 로그아웃 ----
  const logout = $("logout-btn");
  if (logout) logout.addEventListener("click", async () => {
    if (sb) await sb.auth.signOut();
    me = null; setView("out"); renderDownload();
  });

  // ---- 비밀번호 규칙 표시 ----
  const pwIn = $("join-pw"), rules = $("pw-rules");
  if (pwIn && rules) pwIn.addEventListener("input", () => {
    rules.querySelectorAll("li").forEach((li) => li.classList.toggle("ok", PW_RULES[li.dataset.r](pwIn.value)));
  });

  // ---- 비밀번호 재설정 ----
  const resetForm = $("reset-form");
  if (resetForm) resetForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const pw = $("reset-pw").value, pw2 = $("reset-pw2").value;
    const bad = Object.keys(PW_RULES).filter((r) => !PW_RULES[r](pw));
    if (bad.length) return show("reset-msg", "비밀번호 규칙을 확인하세요: " + bad.map((r) => PW_LABEL[r]).join(", "), false);
    if (pw !== pw2) return show("reset-msg", "비밀번호 확인이 일치하지 않습니다.", false);
    $("reset-btn").disabled = true;
    const { error } = await sb.auth.updateUser({ password: pw });
    $("reset-btn").disabled = false;
    if (error) return show("reset-msg", korean(error), false);
    recovering = false; resetForm.reset();
    history.replaceState(null, "", location.pathname + "#account");
    await loadMe();
    show("me-msg", "비밀번호를 바꿨습니다.", true);
  });

  // ---- 다운로드: 승인 회원 + 약관 동의 → 60초 임시 링크 ----
  const agree = $("dl-agree"), dlBtn = $("dl-btn");
  if (agree && dlBtn) {
    agree.addEventListener("change", () => { dlBtn.disabled = !agree.checked; show("dl-msg", "", false); });
    dlBtn.addEventListener("click", async () => {
      if (!agree.checked || !sb) return;
      dlBtn.disabled = true; show("dl-msg", "다운로드 링크를 만드는 중...", true);
      const { data, error } = await sb.storage.from(C.storageBucket || "releases")
        .createSignedUrl(C.downloadFile, 60, { download: true });
      dlBtn.disabled = false;
      if (error || !data || !data.signedUrl) return show("dl-msg", error ? korean(error) : "다운로드 링크를 만들지 못했습니다.", false);
      show("dl-msg", "다운로드를 시작합니다.", true);
      window.location.href = data.signedUrl;
    });
  }

  // ---- 시작 ----
  if (document.getElementById("account")) {
    setView("loading");
    if (/type=recovery/.test(location.hash)) recovering = true;
    if (sb) sb.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") { recovering = true; setView("reset"); }
      else if (event === "SIGNED_OUT") { me = null; setView("out"); renderDownload(); }
    });
    loadMe().catch((err) => { setView("out"); show("login-msg", korean(err), false); });
    renderDownload();
  }

  // ---- 공지 ----
  const list = $("notice-list");
  if (list) {
    renderDonation();
    const items = C.notices || [];
    list.innerHTML = items.length ? items.map((n) => `
      <article class="notice">
        <time>${esc(n.date)}</time>
        <span class="tag ${esc(n.type)}">${esc(n.type)}</span>
        <div><h3>${esc(n.title)}</h3><p>${esc(n.body)}</p></div>
      </article>`).join("") : `<p class="sec-lead">등록된 공지가 없습니다.</p>`;
  }

  // ---- 이용약관 페이지: license.txt 를 읽어 보기 좋게 표시 ----
  const doc = $("terms-body");
  if (doc) {
    fetch(doc.dataset.src || "license.txt").then((r) => r.text()).then((text) => {
      const lines = text.replace(/^﻿/, "").replace(/\r\n/g, "\n").split("\n");
      let html = "", inList = false, head = 0;
      const closeList = () => { if (inList) { html += "</ul>"; inList = false; } };
      lines.forEach((raw, i) => {
        const s = raw.trim();
        if (i < 4) { if (s) html += i === 0 ? "" : `<p class="meta-line">${esc(s)}</p>`; return; }
        if (!s) { closeList(); return; }
        if (/^\[.+\]$/.test(s)) {
          closeList(); head++;
          const id = s.includes("개인정보") ? "privacy" : "terms";
          html += `<h2 id="${id}">${esc(s.slice(1, -1))}</h2>`;
        } else if (/^제\d+조/.test(s) || s === "부칙") {
          closeList(); html += `<h3>${esc(s)}</h3>`;
        } else if (/^- /.test(s)) {
          if (!inList) { html += "<ul>"; inList = true; }
          html += `<li>${esc(s.slice(2))}</li>`;
        } else {
          closeList();
          html += s.includes("★") ? `<p class="imp">${esc(s.replace("★ ", ""))}</p>` : `<p>${esc(raw)}</p>`;
        }
      });
      closeList();
      doc.innerHTML = html;
      if (location.hash) { const t = document.querySelector(location.hash); if (t) t.scrollIntoView(); }
    }).catch(() => { doc.innerHTML = "<p>약관을 불러오지 못했습니다. 약관 파일(.txt)을 확인하세요.</p>"; });
  }

  // ---------------- 후원 (config.js 의 donation.qrImage 또는 tossUrl 이 있을 때만 표시) ----------------
  function renderDonation() {
    const d = C.donation || {};
    if (!$("donate")) return;
    const url = String(d.tossUrl || "").trim();
    const qr = String(d.qrImage || "").trim();
    const okUrl = /^https:\/\/([\w-]+\.)*toss\.(me|im)(\/[^\s"'<>]*)?$/i.test(url);     // 토스 주소만
    const okQr = /^[\w.\-\/]+\.(png|jpe?g|gif|webp|svg)$/i.test(qr) && !qr.includes("..");
    if (!okUrl && !okQr) return;
    $("donate-msg").textContent = d.message || "";
    if (okQr) { $("donate-qr").src = qr; $("donate-qr-box").hidden = false; }
    if (okUrl) { $("donate-toss").href = url; $("donate-toss").hidden = false; }
    $("donate").hidden = false;
    $("nav-donate").hidden = false;
  }
})();
