/* =====================================================================
   Stock Picker 휴대폰 관리 페이지 (admin.html)
   · 관리자 계정(admins 표) + OTP 2단계 인증을 마친 경우에만 서버 함수(admin_*)가 동작합니다.
   · secret 키는 쓰지 않습니다. 공개용 publishable 키 + 로그인 세션만 사용.
   ===================================================================== */
(function () {
  "use strict";
  const C = window.SP_CONFIG || {};
  const $ = (id) => document.getElementById(id);
  const sb = (window.supabase && C.supabaseUrl && C.supabaseKey)
    ? window.supabase.createClient(C.supabaseUrl.replace(/\/+$/, ""), C.supabaseKey,
                                   { auth: { persistSession: true, autoRefreshToken: true, storageKey: "sp-admin-auth" } })
    : null;
  const SITE = new URL("./", location.href).href;
  let BRIEF = "";          // 테마 브리핑 주소 (Controller에서 저장 → admin_settings.briefing_url)
  const DEV = C.developer || "Jongse Kim";
  const CONTACT = C.contact || "";
  let DATA = null;
  let mfaFactorId = null;

  // ---------------- 공통 ----------------
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function show(view) {
    ["v-login", "v-mfa", "v-app"].forEach((v) => { $(v).hidden = v !== view; });
    $("tabs").hidden = view !== "v-app";
    $("btn-logout").hidden = view === "v-login";
  }
  function msg(el, text, kind) { el.textContent = text || ""; el.className = "msg" + (kind ? " " + kind : ""); }
  function korean(e) {
    const t = String((e && (e.message || e.error_description)) || e || "");
    if (/invalid login credentials/i.test(t)) return "이메일 또는 비밀번호가 맞지 않습니다.";
    if (/invalid totp|invalid code|expired/i.test(t)) return "OTP 숫자가 맞지 않거나 시간이 지났습니다. 앱의 새 숫자를 넣어 보세요.";
    if (/failed to fetch|network/i.test(t)) return "서버에 연결할 수 없습니다. 인터넷 연결을 확인하세요.";
    return t || "알 수 없는 오류";
  }
  function fmtDate(s) { return s ? String(s).slice(0, 10) : "-"; }
  function fmtTime(s) {
    if (!s) return "-";
    const d = new Date(s);
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }
  function mailto(to, subject, body) {
    return `mailto:${encodeURIComponent(to || "")}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }
  async function rpc(name, args) {
    const { data, error } = await sb.rpc(name, args || {});
    if (error) throw error;
    return data;
  }
  const ROLE = { general: "일반", premium: "프리미엄", monitor: "모니터" };
  const APPROVAL = { pending: "승인 대기", approved: "승인", rejected: "반려" };

  // ---------------- 안내 메일 문구 (Controller와 같은 내용) ----------------
  function approvalMail(m) {
    return ["[Stock Picker] 회원 가입이 승인되었습니다",
      `${m.name}님, 안녕하세요.\n\nStock Picker 회원 가입이 승인되었습니다.\n\n[다음 단계]\n` +
      `1. 사이트(${SITE})에 로그인해 설치 파일을 내려받아 설치합니다.\n` +
      "2. Stock Picker를 실행하고 사이트 회원 이메일 · 비밀번호로 로그인합니다.\n" +
      "   로그인 후 열리는 [인증키 등록] 창의 [인증키 신청]을 누르고, 인증키 이용약관에 동의한 뒤 신청하세요.\n" +
      "3. 관리자가 확인 후 이 이메일 주소로 인증키를 보내 드립니다.\n" +
      briefingSection() + "\n" +
      `문의: ${DEV} (${CONTACT})`];
  }
  function briefingSection() {
    return ["", "[회원 전용 웹앱 · 테마 브리핑]",
      "관심 업종 · 테마를 고르면 AI 증시 전망, 기사 분위기, 주요 재료, 최신 기사를 한 화면에서 보여 주는 웹앱입니다.",
      "PC 브라우저와 휴대폰(안드로이드 · 아이폰) 모두에서 쓸 수 있습니다.",
      "  접속 주소 : " + (BRIEF || "운영자가 별도로 안내해 드립니다."),
      "  로그인 : Stock Picker 사이트 회원 이메일 · 비밀번호",
      "  이용 대상 : 프리미엄 · 모니터 회원 (인증키를 받으면 이용 가능)",
      "  휴대폰에서 앱처럼 쓰기 : 안드로이드 크롬 메뉴(⋮) → [홈 화면에 추가],",
      "                           아이폰 사파리 공유 버튼 → [홈 화면에 추가]",
      "※ 접속 주소는 회원 전용입니다. 다른 사람과 공유하지 마세요.", ""].join("\n");
  }
  function keyMail(r, months) {
    const monitor = r.role === "monitor";
    let head = "Stock Picker 사용을 위한 인증키를 보내드립니다.";
    if (r.new_key) head = "Stock Picker 인증키를 발급해 드립니다.";
    else if (months) head = `인증키 사용 기간을 ${months}개월 연장했습니다. 같은 인증키를 그대로 사용하시면 됩니다.`;
    if (monitor) head += "\n모니터 회원으로 지정되어 사용 기간 제한 없이 이용하실 수 있습니다.";
    const period = monitor || !r.end ? "무기한" : `${r.end}까지`;
    return ["[Stock Picker] 인증키 안내", [
      "[Stock Picker 인증키 안내]", "", `${r.name}님, 안녕하세요.`, head, "",
      `  인증키 : ${r.key}`, `  사용 기한 : ${period}`, "", "[사용 방법]",
      `1. 사이트에 로그인해 설치 파일을 내려받아 설치합니다: ${SITE}`,
      "2. Stock Picker를 실행하고 사이트 회원 이메일 · 비밀번호로 로그인합니다.",
      "3. 로그인 후 열리는 [인증키 등록] 창(또는 설정 → 인증키 등록 · 변경)에 위 인증키를 입력합니다.",
      "   (처음 한 번은 이용약관 동의 화면이 나옵니다. 인증키는 대소문자를 구분하지 않습니다)",
      "   한 번 등록하면 같은 PC에서 같은 계정으로 로그인할 때는 다시 입력하지 않아도 됩니다.", "",
      "[유의 사항]", "• 인증키 1개는 동시에 1대의 PC에서만 사용할 수 있습니다.",
      "  같은 인증키가 2대 이상의 PC에서 동시에 실행되면 즉시 사용이 정지됩니다.",
      "• 프로그램과 인증키를 다른 사람에게 공유·양도하거나 무단으로 복제·배포하는 것을 금지합니다.",
      "• 인터넷에 연결된 상태에서만 사용할 수 있습니다.", briefingSection(), `문의: ${DEV} (${CONTACT})`].join("\n")];
  }
  function replyMail(f) {
    const quote = String(f.message || "").split("\n").slice(0, 20).map((l) => "> " + l).join("\n");
    return [`[Stock Picker] 보내 주신 의견(${f.category || "의견"})에 대한 답변`,
      `${f.name || ""}님, 안녕하세요.\nStock Picker에 의견을 보내 주셔서 감사합니다.\n\n\n\n` +
      `----- 보내 주신 의견 (${fmtTime(f.created_at)}) -----\n${quote}\n\n문의: ${DEV} (${CONTACT})`];
  }

  // ---------------- 아래에서 올라오는 창 ----------------
  function sheet(html) {
    $("sheet-body").innerHTML = html;
    $("sheet").hidden = false;
  }
  function closeSheet() { $("sheet").hidden = true; $("sheet-body").innerHTML = ""; }
  $("sheet").addEventListener("click", (e) => { if (e.target.id === "sheet") closeSheet(); });

  function mailSheet(title, to, subject, body, note, onSent) {
    sheet(`<h3>${esc(title)}</h3>${note ? `<div class="msg ok">${esc(note)}</div>` : ""}
      <div class="meta">받는 사람: ${esc(to)}</div><label>제목</label><input id="ms-sub" value="${esc(subject)}">
      <label>본문</label><pre id="ms-body">${esc(body)}</pre>
      <a class="btn full" id="ms-send" href="#">✉ 메일 앱으로 보내기</a>
      <button class="btn ghost full" id="ms-copy">본문 복사</button>
      <button class="btn ghost full" id="ms-close">닫기</button>`);
    $("ms-send").addEventListener("click", (e) => {
      e.preventDefault();
      location.href = mailto(to, $("ms-sub").value, body);
      if (onSent) onSent();
    });
    $("ms-copy").addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(body); $("ms-copy").textContent = "✔ 복사했습니다"; } catch (e) { /* 무시 */ }
    });
    $("ms-close").addEventListener("click", closeSheet);
  }

  // ---------------- 로그인 · OTP ----------------
  async function route() {
    if (!sb) { show("v-login"); msg($("l-msg"), "config.js 의 Supabase 설정이 없습니다.", "err"); return; }
    const { data } = await sb.auth.getSession();
    if (!data.session) { show("v-login"); return; }
    $("who").textContent = data.session.user.email + " · 관리자 전용";
    let st;
    try { st = (await rpc("admin_whoami")).state; } catch (e) { show("v-login"); msg($("l-msg"), korean(e), "err"); return; }
    if (st === "not_admin" || st === "anon") {
      await sb.auth.signOut();
      show("v-login");
      msg($("l-msg"), "관리자로 등록된 계정이 아닙니다. (Supabase에서 admins 표에 등록해야 합니다)", "err");
      return;
    }
    if (st === "need_mfa") { await startMfa(); return; }
    show("v-app");
    await load();
  }

  $("l-btn").addEventListener("click", async () => {
    const email = $("l-email").value.trim(), pw = $("l-pw").value;
    if (!email || !pw) { msg($("l-msg"), "이메일과 비밀번호를 입력하세요.", "err"); return; }
    $("l-btn").disabled = true; msg($("l-msg"), "로그인하는 중...");
    const { error } = await sb.auth.signInWithPassword({ email, password: pw });
    $("l-btn").disabled = false;
    if (error) { msg($("l-msg"), korean(error), "err"); return; }
    $("l-pw").value = "";
    msg($("l-msg"), "");
    await route();
  });
  $("l-pw").addEventListener("keydown", (e) => { if (e.key === "Enter") $("l-btn").click(); });

  async function startMfa() {
    show("v-mfa");
    msg($("m-msg"), "");
    $("m-code").value = "";
    const { data, error } = await sb.auth.mfa.listFactors();
    if (error) { msg($("m-msg"), korean(error), "err"); return; }
    const verified = (data.totp || []).filter((f) => f.status === "verified");
    if (verified.length) {
      mfaFactorId = verified[0].id;
      $("m-title").textContent = "OTP 인증";
      $("m-enroll").hidden = true;
      msg($("m-msg"), "OTP 앱에 나온 6자리 숫자를 입력하세요.");
    } else {
      for (const f of (data.all || [])) {       // 등록하다 만 것은 지우고 새로
        if (f.factor_type === "totp" && f.status !== "verified") await sb.auth.mfa.unenroll({ factorId: f.id });
      }
      const en = await sb.auth.mfa.enroll({ factorType: "totp", friendlyName: "Stock Picker 관리" });
      if (en.error) { msg($("m-msg"), korean(en.error), "err"); return; }
      mfaFactorId = en.data.id;
      $("m-title").textContent = "OTP 등록 (처음 한 번)";
      $("m-qr").src = en.data.totp.qr_code;
      $("m-secret").textContent = en.data.totp.secret;
      $("m-enroll").hidden = false;
    }
    setTimeout(() => $("m-code").focus(), 50);
  }
  $("m-btn").addEventListener("click", async () => {
    const code = $("m-code").value.replace(/\D/g, "");
    if (code.length !== 6) { msg($("m-msg"), "6자리 숫자를 입력하세요.", "err"); return; }
    $("m-btn").disabled = true; msg($("m-msg"), "확인하는 중...");
    const { error } = await sb.auth.mfa.challengeAndVerify({ factorId: mfaFactorId, code });
    $("m-btn").disabled = false;
    if (error) { msg($("m-msg"), korean(error), "err"); return; }
    await route();
  });
  $("m-code").addEventListener("keydown", (e) => { if (e.key === "Enter") $("m-btn").click(); });
  $("btn-logout").addEventListener("click", async () => { await sb.auth.signOut(); DATA = null; show("v-login"); });

  // ---------------- 데이터 ----------------
  async function load() {
    $("btn-reload").disabled = true;
    try {
      DATA = await rpc("admin_overview");
    } catch (e) {
      $("btn-reload").disabled = false;
      if (/2단계|OTP/.test(e.message || "")) { await startMfa(); return; }
      alert("불러오지 못했습니다: " + korean(e));
      return;
    }
    $("btn-reload").disabled = false;
    $("loaded-at").textContent = "  " + fmtTime(new Date().toISOString()) + " 기준";
    render();
  }
  $("btn-reload").addEventListener("click", load);

  function render() {
    const d = DATA;
    const nfb = d.feedback.filter((f) => f.status === "new").length;
    $("s-pm").textContent = d.pending_members.length;
    $("s-pr").textContent = d.pending_requests.length;
    $("s-fb").textContent = nfb;
    $("s-ex").textContent = d.expiring;
    const nh = d.pending_members.length + d.pending_requests.length;
    $("b-home").hidden = !nh; $("b-home").textContent = nh;
    $("b-fb").hidden = !nfb; $("b-fb").textContent = nfb;

    $("list-pm").innerHTML = d.pending_members.length ? d.pending_members.map((m) => `
      <div class="item"><div class="name">${esc(m.name)} <span class="chip pending">승인 대기</span></div>
        <div class="meta">${esc(m.email)} · ${esc(m.phone || "-")}<br>신청 ${fmtTime(m.joined_at)}
          ${m.has_account ? "" : " · <b style='color:#C2410C'>사이트 계정 없음</b>"}</div>
        <button class="btn good small" data-act="approve" data-id="${m.id}">✔ 승인</button>
        <button class="btn danger small" data-act="reject" data-id="${m.id}">반려</button></div>`).join("")
      : '<div class="empty">대기 중인 가입 신청이 없습니다.</div>';

    $("list-pr").innerHTML = d.pending_requests.length ? d.pending_requests.map((r) => `
      <div class="item"><div class="name">${esc(r.name)} ${roleChip(r)}</div>
        <div class="meta">${esc(r.email)} · 신청 ${fmtTime(r.created_at)}<br>
          현재 인증키: ${r.current_key ? esc(r.current_key) : "없음 → 새로 발급"} · 기한 ${fmtDate(r.subscription_end)}
          ${r.memo ? `<br>메모: ${esc(r.memo)}` : ""}
          ${r.approval !== "approved" || r.status !== "active" ? "<br><b style='color:#C2410C'>승인된 정상 회원이 아닙니다</b>" : ""}</div>
        <button class="btn small" data-act="grant" data-id="${r.member_id}" data-req="${r.id}">🔑 인증키 부여</button>
        <button class="btn danger small" data-act="reqreject" data-req="${r.id}">반려</button></div>`).join("")
      : '<div class="empty">대기 중인 인증키 신청이 없습니다.</div>';

    renderMembers();
    $("list-fb").innerHTML = d.feedback.length ? d.feedback.map((f) => `
      <div class="item"><div class="name">${esc(f.category)} ${f.status === "new" ? '<span class="chip new">새 의견</span>'
        : f.status === "done" ? '<span class="chip">처리 완료</span>' : '<span class="chip">확인함</span>'}
        ${f.replied_at ? '<span class="chip">답장함</span>' : ""}</div>
        <div class="meta">${esc(f.name)} · ${esc(f.email)} · v${esc(f.app_version || "-")} · ${fmtTime(f.created_at)}</div>
        <pre>${esc(f.message)}</pre>
        <button class="btn small" data-act="reply" data-id="${f.id}">✉ 답장</button>
        ${f.status === "new" ? `<button class="btn ghost small" data-act="fbread" data-id="${f.id}">확인함</button>` : ""}
        ${f.status !== "done" ? `<button class="btn ghost small" data-act="fbdone" data-id="${f.id}">✔ 처리 완료</button>` : ""}
      </div>`).join("") : '<div class="empty">받은 의견이 없습니다.</div>';

    BRIEF = (d.settings || {}).briefing_url || "";
    $("set-topic").value = (d.settings || {}).ntfy_topic || "";
    $("set-email").value = (d.settings || {}).notify_email || "";
  }

  function roleChip(m) {
    const role = m.is_monitor ? "monitor" : (m.role || "general");
    return `<span class="chip ${role}">${ROLE[role] || role}</span>`;
  }

  function renderMembers() {
    const q = $("mem-q").value.trim().toLowerCase();
    const rows = DATA.members.filter((m) => !q || [m.name, m.email, m.phone].join(" ").toLowerCase().includes(q));
    $("list-mem").innerHTML = rows.length ? rows.slice(0, 100).map((m) => `
      <div class="item" data-act="member" data-id="${m.id}"><div class="name">${esc(m.name)} ${roleChip(m)}
        ${m.approval !== "approved" ? `<span class="chip pending">${APPROVAL[m.approval] || m.approval}</span>` : ""}
        ${m.status !== "active" ? '<span class="chip new">이용 정지</span>' : ""}</div>
        <div class="meta">${esc(m.email)} · ${esc(m.phone || "-")}<br>인증키 ${m.key ? esc(m.key) : "없음"}
          · 기한 ${m.is_monitor ? "기간 무관" : fmtDate(m.subscription_end)}</div></div>`).join("")
      : '<div class="empty">회원이 없습니다.</div>';
  }
  $("mem-q").addEventListener("input", renderMembers);

  function member(id) { return DATA.members.find((m) => String(m.id) === String(id)) ||
    DATA.pending_members.find((m) => String(m.id) === String(id)); }

  // ---------------- 작업 ----------------
  async function act(name, args, okText) {
    try {
      const r = await rpc(name, args);
      if (r && r.ok === false) { alert(r.message || "처리하지 못했습니다."); return null; }
      if (okText) toast(okText);
      return r;
    } catch (e) {
      alert(korean(e));
      return null;
    }
  }
  function toast(t) {
    const el = document.createElement("div");
    el.textContent = t;
    el.style.cssText = "position:fixed;left:50%;bottom:90px;transform:translateX(-50%);background:#0F172A;color:#fff;" +
      "padding:10px 16px;border-radius:20px;font-size:13px;z-index:20";
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2200);
  }

  function grantSheet(m, requestId) {
    const monitor = !!m.is_monitor;
    sheet(`<h3>🔑 인증키 부여 · 기간 연장</h3>
      <div class="meta">${esc(m.name)} &lt;${esc(m.email)}&gt;<br>현재: ${ROLE[monitor ? "monitor" : m.role] || "-"} · 기한
        ${monitor ? "기간 무관" : fmtDate(m.subscription_end)} · 인증키 ${(m.key || m.current_key) ? "있음(그대로 사용, 기한만 연장)" : "없음 → 새로 발급"}</div>
      <label>사용 기간</label>
      <div class="months">${[1, 3, 6, 12].map((n) => `<button data-m="${n}" class="${n === 1 ? "on" : ""}">${n}개월</button>`).join("")}</div>
      ${monitor ? '<div class="months"><button data-m="0" style="grid-column:span 4">기간 추가 없음 (모니터)</button></div>' : ""}
      <div class="msg">남은 기간이 있으면 마지막 날 다음 날부터 이어서 늘어납니다.</div>
      <button class="btn full" id="g-ok">부여하기</button><button class="btn ghost full" id="g-cancel">취소</button>`);
    let months = 1;
    $("sheet-body").querySelectorAll("[data-m]").forEach((b) => b.addEventListener("click", () => {
      months = Number(b.dataset.m);
      $("sheet-body").querySelectorAll("[data-m]").forEach((x) => x.classList.toggle("on", x === b));
    }));
    $("g-cancel").addEventListener("click", closeSheet);
    $("g-ok").addEventListener("click", async () => {
      $("g-ok").disabled = true;
      const r = await act("admin_grant", { p_member_id: Number(m.id), p_months: months,
                                           p_request_id: requestId ? Number(requestId) : null });
      if (!r) { $("g-ok").disabled = false; return; }
      const [s, b] = keyMail(r, months);
      mailSheet("인증키를 부여했습니다", r.email, s, b,
                `${r.new_key ? "새 인증키 발급" : "기간 연장"} · ${r.role === "monitor" ? "기간 무관" : r.end + "까지"}`);
      load();
    });
  }

  function memberSheet(m) {
    const role = m.is_monitor ? "monitor" : m.role;
    sheet(`<h3>${esc(m.name)} ${roleChip(m)}</h3>
      <div class="meta">${esc(m.email)} · ${esc(m.phone || "-")}<br>가입 ${fmtTime(m.joined_at)} · ${APPROVAL[m.approval] || m.approval}
        · ${m.status === "active" ? "정상" : "이용 정지"}<br>인증키 ${m.key ? `<b>${esc(m.key)}</b>` : "없음"} · 기한
        ${m.is_monitor ? "기간 무관" : fmtDate(m.subscription_end)}${m.admin_memo ? `<br>메모: ${esc(m.admin_memo)}` : ""}</div>
      ${m.approval !== "approved" ? `<button class="btn good full" data-s="approve">✔ 가입 승인</button>` : ""}
      ${m.approval === "approved" && m.status === "active" ? `<button class="btn full" data-s="grant">🔑 인증키 부여 · 기간 연장</button>
        <button class="btn ghost full" data-s="${m.is_monitor ? "monitor_off" : "monitor_on"}">${m.is_monitor ? "모니터 해제" : "◆ 모니터 지정 (기간 무관)"}</button>` : ""}
      ${m.key ? `<button class="btn ghost full" data-s="resend">✉ 인증키 안내 메일 다시 보내기</button>` : ""}
      <button class="btn ghost full" data-s="close">닫기</button>`);
    $("sheet-body").querySelectorAll("[data-s]").forEach((b) => b.addEventListener("click", async () => {
      const s = b.dataset.s;
      if (s === "close") return closeSheet();
      if (s === "grant") return grantSheet(m, null);
      if (s === "approve") return approve(m);
      if (s === "resend") {
        const [sub, body] = keyMail({ name: m.name, key: m.key, end: m.subscription_end, role }, 0);
        return mailSheet("인증키 안내 메일", m.email, sub, body);
      }
      if (s === "monitor_on" || s === "monitor_off") {
        if (!confirm(s === "monitor_on" ? `${m.name}님을 모니터 회원으로 지정할까요? (사용 기간과 상관없이 사용 가능)`
                                        : `${m.name}님의 모니터 지정을 해제할까요? (남은 기간이 없으면 일반 회원)`)) return;
        const r = await act("admin_member_action", { p_member_id: Number(m.id), p_action: s },
                            s === "monitor_on" ? "모니터로 지정했습니다" : "모니터 지정을 해제했습니다");
        if (!r) return;
        if (r.grant && r.grant.key) {
          const [sub, body] = keyMail(r.grant, 0);
          mailSheet("모니터로 지정했습니다", r.email, sub, body, r.grant.new_key ? "새 인증키 발급" : "기존 인증키 · 기간 무관");
        } else closeSheet();
        load();
      }
    }));
  }

  async function approve(m) {
    if (!confirm(`${m.name} <${m.email}>\n\n회원 가입을 승인할까요?`)) return;
    const r = await act("admin_member_action", { p_member_id: Number(m.id), p_action: "approve" }, "가입을 승인했습니다");
    if (!r) return;
    const [s, b] = approvalMail(m);
    mailSheet("가입을 승인했습니다", m.email, s, b, "승인 안내 메일을 보내 주세요.");
    load();
  }

  document.body.addEventListener("click", async (e) => {
    const el = e.target.closest("[data-act]");
    if (!el || !DATA) return;
    const a = el.dataset.act, id = el.dataset.id;
    if (a === "approve") return approve(member(id) || DATA.pending_members.find((m) => String(m.id) === id));
    if (a === "reject") {
      const m = DATA.pending_members.find((x) => String(x.id) === id);
      if (!confirm(`${m.name} <${m.email}>\n\n가입을 반려할까요?`)) return;
      if (await act("admin_member_action", { p_member_id: Number(id), p_action: "reject" }, "가입을 반려했습니다")) load();
      return;
    }
    if (a === "grant") {
      const r = DATA.pending_requests.find((x) => String(x.id) === el.dataset.req);
      const m = member(id) || { id, name: r.name, email: r.email, role: r.role, is_monitor: r.is_monitor,
                                subscription_end: r.subscription_end, current_key: r.current_key };
      return grantSheet(Object.assign({}, m, { current_key: r.current_key }), el.dataset.req);
    }
    if (a === "reqreject") {
      const r = DATA.pending_requests.find((x) => String(x.id) === el.dataset.req);
      if (!confirm(`${r.name}님의 인증키 신청을 반려할까요?`)) return;
      if (await act("admin_reject_request", { p_request_id: Number(el.dataset.req) }, "신청을 반려했습니다")) load();
      return;
    }
    if (a === "member") return memberSheet(member(id));
    if (a === "reply") {
      const f = DATA.feedback.find((x) => String(x.id) === id);
      const [s, b] = replyMail(f);
      return mailSheet("의견 답장", f.email, s, b, "", async () => {
        await act("admin_feedback_set", { p_id: Number(id), p_status: "done", p_replied: true });
        load();
      });
    }
    if (a === "fbread" || a === "fbdone") {
      if (await act("admin_feedback_set", { p_id: Number(id), p_status: a === "fbread" ? "read" : "done", p_replied: false })) load();
    }
  });

  // ---------------- 알림 설정 ----------------
  $("btn-copy-topic").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText($("set-topic").value); toast("주제를 복사했습니다"); } catch (e) { /* 무시 */ }
  });
  $("btn-new-topic").addEventListener("click", async () => {
    if (!confirm("새 주제로 바꿀까요? 예전 주제를 구독한 기기는 알림을 더 받지 않습니다.")) return;
    const t = "stockpicker-" + Array.from(crypto.getRandomValues(new Uint8Array(12)))
      .map((b) => b.toString(16).padStart(2, "0")).join("");
    if (await act("admin_set_setting", { p_key: "ntfy_topic", p_value: t }, "새 주제로 바꿨습니다")) load();
  });
  $("btn-save-email").addEventListener("click", async () => {
    if (await act("admin_set_setting", { p_key: "notify_email", p_value: $("set-email").value.trim() }, "저장했습니다")) load();
  });

  // ---------------- 탭 ----------------
  $("tabs").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-t]");
    if (!b) return;
    document.querySelectorAll("#tabs button").forEach((x) => x.classList.toggle("on", x === b));
    ["home", "members", "feedback", "settings"].forEach((t) => { $("t-" + t).hidden = t !== b.dataset.t; });
    window.scrollTo(0, 0);
  });

  document.addEventListener("visibilitychange", () => {     // 다시 열면 자동 새로 고침
    if (!document.hidden && DATA && !$("v-app").hidden) load();
  });

  route();
})();
