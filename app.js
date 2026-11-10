/* Stock Picker 배포 사이트 동작 */
(function () {
  const C = window.SP_CONFIG || {};
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // ---- 버전 정보 ----
  if ($("hero-badge")) $("hero-badge").textContent = `Windows 프로그램 · v${C.version || "-"}`;
  if ($("dl-version")) {
    $("dl-version").textContent = C.version || "-";
    $("dl-date").textContent = C.releaseDate || "-";
    $("dl-size").textContent = C.fileSize || "-";
    $("dl-req").textContent = C.requirements || "-";
  }

  // ---- 다운로드: 약관 동의 후에만 ----
  const agree = $("dl-agree"), dlBtn = $("dl-btn");
  if (agree && dlBtn) {
    agree.addEventListener("change", () => { dlBtn.disabled = !agree.checked; $("dl-msg").textContent = ""; });
    dlBtn.addEventListener("click", () => {
      if (!agree.checked) return;
      if (!C.downloadUrl) {
        $("dl-msg").textContent = "다운로드 링크가 아직 준비되지 않았습니다. 잠시 후 다시 시도해 주세요.";
        return;
      }
      window.location.href = C.downloadUrl;
    });
    if (C.portableUrl) {
      $("dl-portable").innerHTML = `설치 없이 쓰려면 <a href="${esc(C.portableUrl)}" id="pt-link">압축 파일(portable)</a>을 받으세요. 약관 동의가 필요합니다.`;
      $("pt-link").addEventListener("click", (e) => { if (!agree.checked) { e.preventDefault(); $("dl-msg").textContent = "이용약관에 먼저 동의해 주세요."; } });
    }
  }

  // ---- 서버 호출(공개 publishable 키로 정해진 함수만 호출 가능) ----
  async function rpc(fn, args) {
    const r = await fetch(C.supabaseUrl.replace(/\/+$/, "") + "/rest/v1/rpc/" + fn, {
      method: "POST",
      headers: { "apikey": C.supabaseKey, "Content-Type": "application/json" },
      body: JSON.stringify(args)
    });
    const data = await r.json().catch(() => ({}));
    return { ok: r.ok && data.ok, message: data.message };
  }
  const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

  function bindForm(id, prefix, validate, call, okText) {
    const form = $(id);
    if (!form) return;
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const msg = $(prefix + "-msg"), btn = $(prefix + "-btn");
      const show = (text, ok) => { msg.textContent = text; msg.className = "msg " + (ok ? "ok" : "err"); };
      const bad = validate();
      if (bad) return show(bad, false);
      if (!C.supabaseUrl || !C.supabaseKey) return show("신청 접수가 아직 준비되지 않았습니다.", false);
      btn.disabled = true; show("접수하는 중...", true);
      try {
        const res = await call();
        if (res.ok) { show(res.message || okText, true); form.reset(); }
        else show(res.message || "접수하지 못했습니다. 잠시 후 다시 시도하거나 이메일로 문의해 주세요.", false);
      } catch (err) {
        show("서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.", false);
      } finally { btn.disabled = false; }
    });
  }

  // ---- ① 회원 가입 신청 ----
  bindForm("join-form", "join", () => {
    const phone = $("join-phone").value.replace(/[^0-9]/g, "");
    if (!$("join-name").value.trim()) return "이름을 입력하세요.";
    if (!EMAIL.test($("join-email").value.trim())) return "이메일 주소를 확인하세요.";
    if (phone && !/^01[0-9]{8,9}$/.test(phone)) return "휴대폰 번호를 확인하세요. (선택 항목이라 비워도 됩니다)";
    if (!$("join-agree-terms").checked) return "사이트 회원 이용약관에 동의해야 가입할 수 있습니다.";
    if (!$("join-agree-privacy").checked) return "개인정보 수집·이용에 동의해야 가입할 수 있습니다.";
    return "";
  }, () => rpc("member_signup", {
    p_name: $("join-name").value.trim(), p_email: $("join-email").value.trim(),
    p_phone: $("join-phone").value.trim(), p_terms_version: C.memberTermsVersion || "1.0"
  }), "회원 가입 신청이 접수되었습니다.");

  // ---- ② 인증키 사용 신청 ----
  bindForm("req-form", "req", () => {
    if (!EMAIL.test($("req-email").value.trim())) return "가입한 이메일 주소를 입력하세요.";
    if (!$("req-agree").checked) return "인증키 이용약관에 동의해야 신청할 수 있습니다.";
    return "";
  }, () => rpc("submit_key_request", {
    p_email: $("req-email").value.trim(), p_terms_version: C.termsVersion || "1.0",
    p_memo: $("req-memo").value.trim()
  }), "인증키 사용 신청이 접수되었습니다.");

  // ---- 공지 ----
  const list = $("notice-list");
  if (list) {
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
})();
