// Shared behaviour for Paradise Events Co. + Puff Paradise Hookahs pages.
// Page config lives on the form: data-endpoint, data-ig, data-brand.
(() => {
  document.body.classList.remove("no-js");
  const yr = document.getElementById("yr");
  if (yr) yr.textContent = new Date().getFullYear();

  // ---- reveal on scroll ----
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
  }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
  document.querySelectorAll(".rise").forEach(el => io.observe(el));

  // ---- header, scroll rail, mobile dock ----
  const hdr = document.getElementById("hdr"), rail = document.querySelector(".rail"), dock = document.getElementById("dock");
  const formSection = document.querySelector("[data-form-section]");
  function onScroll() {
    const y = scrollY, max = document.documentElement.scrollHeight - innerHeight;
    hdr.classList.toggle("solid", y > 40);
    rail.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    if (dock && formSection) {
      const q = formSection.getBoundingClientRect();
      dock.classList.toggle("show", y > innerHeight * 0.6 && !(q.top < innerHeight && q.bottom > 0));
    }
  }
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // ---- party cart: "Add" buttons and packages fill the form's service boxes ----
  const form = document.getElementById("quote-form");
  if (!form) return;
  const boxes = [...form.querySelectorAll('input[name="services"]')];
  const box = v => boxes.find(b => b.value === v);
  const addBtns = [...document.querySelectorAll("[data-service]")];
  const addLabel = addBtns[0]?.textContent.trim() || "Add";

  function syncCart() {
    const n = boxes.filter(b => b.checked).length;
    addBtns.forEach(btn => {
      const on = !!box(btn.dataset.service)?.checked;
      btn.setAttribute("aria-pressed", on);
      btn.textContent = on ? "Added ✓" : addLabel;
    });
    document.querySelectorAll("[data-cart-count]").forEach(el => {
      el.textContent = n ? `(${n} added)` : "";
      el.hidden = !n;
    });
    renderUpsells();
  }
  addBtns.forEach(btn => btn.addEventListener("click", () => {
    const b = box(btn.dataset.service);
    if (b) b.checked = !b.checked;
    syncCart();
    pulse(document.querySelector(".dock .btn"));
  }));
  document.querySelectorAll("[data-package]").forEach(btn => btn.addEventListener("click", () => {
    boxes.forEach(b => (b.checked = false));
    btn.dataset.package.split("|").forEach(v => { const b = box(v); if (b) b.checked = true; });
    syncCart();
    goStep(0);
    formSection.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }));
  boxes.forEach(b => b.addEventListener("change", syncCart));
  function pulse(el) { if (!el) return; el.classList.remove("pulse"); void el.offsetWidth; el.classList.add("pulse"); }

  // ---- stepped form: small yeses first, contact details last ----
  const steps = [...form.querySelectorAll(".fstep")];
  const bar = form.querySelector(".fprog-bar"), label = form.querySelector(".fprog-label");
  const msg = document.getElementById("form-msg");
  let cur = 0;
  function goStep(i) {
    cur = i;
    steps.forEach((s, k) => { s.hidden = k !== i; });
    // starts a third full so the visitor is already on the way
    bar.style.transform = `scaleX(${(i + 1) / steps.length})`;
    label.textContent = `Step ${i + 1} of ${steps.length} · ${steps[i].dataset.title}`;
    msg.hidden = true;
    if (i < steps.length - 1) bumpPick = null;
    if (typeof renderUpsells === "function" && i === steps.length - 1) renderUpsells();
  }
  function missingIn(step) {
    return [...step.querySelectorAll("[required]")].filter(f =>
      f.type === "checkbox" ? !f.checked : f.type === "radio" ? !step.querySelector(`input[name="${f.name}"]:checked`) : !f.value.trim());
  }
  function fieldName(f) {
    if (f.dataset.label) return f.dataset.label;
    return (f.labels?.[0]?.firstChild?.textContent || f.name).trim();
  }
  function check(step) {
    const missing = missingIn(step);
    step.querySelectorAll("[required]").forEach(f => f.setAttribute("aria-invalid", missing.includes(f)));
    if (missing.length) {
      msg.hidden = false;
      msg.textContent = "Please complete: " + [...new Set(missing.map(fieldName))].join(", ") + ".";
      missing[0].focus();
      return false;
    }
    return true;
  }
  form.querySelectorAll("[data-next]").forEach(b => b.addEventListener("click", () => {
    if (check(steps[cur])) { goStep(cur + 1); steps[cur].querySelector("input, select, textarea")?.focus(); }
  }));
  form.querySelectorAll("[data-back]").forEach(b => b.addEventListener("click", () => goStep(cur - 1)));
  // tapping an occasion tile moves straight on when services are already picked
  form.querySelectorAll('.tiles input[type="radio"]').forEach(r => r.addEventListener("change", () => {
    form.querySelector(".tiles")?.setAttribute("aria-invalid", "false");
  }));
  // ---- upsells: "pairs well with" on step 2, one order bump on the last step ----
  const PAIRS = {
    "Rentals": ["Concession Machines", "Kids + snow cones = instant hit. Attendant & supplies included."],
    "Concession Machines": ["Rentals", "Add a bounce house to keep the kids busy all party."],
    "Mobile Bartending": ["360 Booth / Photo / Video", "Drinks + the 360° booth = the content everyone posts."],
    "360 Booth / Photo / Video": ["Mobile Bartending", "Add the bar so guests have a drink in hand on the platform."],
    "Hookah Catering": ["Mobile Bartending", "Hookah and a full bar, the complete grown-up lounge."],
    "Mobile Hookah Bar": ["Fruit Hookahs", "Upgrade to fresh fruit heads, the showpiece of the night."],
    "Hookah Rental": ["Fruit Hookahs", "Upgrade your rental to fresh fruit heads."],
    "Fruit Hookahs": ["Mobile Hookah Bar", "Let us run it. Full-service bar, you don't lift a finger."],
  };
  // bump candidates "service|headline|line;;service|headline|line" — first one not already picked wins
  const BUMPS = (form.dataset.bump || "").split(";;").filter(Boolean).map(x => x.split("|"));
  let bumpPick = null;
  const full = form.dataset.full ? form.dataset.full.split("|") : [];
  const pairsBox = form.querySelector("[data-pairs]"), bumpBox = form.querySelector("[data-bump-slot]");
  const short = v => v.replace(" / Photo / Video", "").replace("360 Booth", "360° Booth");
  const offer = (v, why, cta) =>
    `<div class="up"><div><span class="up-tag">Pairs well</span><b>${short(v)}</b><small>${why}</small></div>` +
    `<button class="btn btn-glass btn-sm" type="button" data-up="${v}">${cta}</button></div>`;
  function renderUpsells() {
    const picked = boxes.filter(b => b.checked).map(b => b.value);
    if (pairsBox) {
      const seen = new Set(), offers = [];
      picked.forEach(v => { const p = PAIRS[v]; if (p && box(p[0]) && !picked.includes(p[0]) && !seen.has(p[0])) { seen.add(p[0]); offers.push(offer(p[0], p[1], "+ Add")); } });
      let nudge = "";
      const have = full.filter(v => picked.includes(v)).length;
      if (full.length && have >= 2 && have < full.length) {
        const left = full.filter(v => !picked.includes(v));
        nudge = `<div class="up up-full"><div><span class="up-tag">Bundle</span><b>${left.length} away from The Full Paradise</b><small>One team, one contact for the whole day.</small></div>` +
                `<button class="btn btn-gold btn-sm" type="button" data-up="${left.join("|")}">Complete it</button></div>`;
      }
      pairsBox.innerHTML = nudge + offers.slice(0, 2).join("");
      pairsBox.hidden = !pairsBox.innerHTML;
    }
    if (bumpBox && BUMPS.length) {
      // lock the offer while the visitor is on the last step so ticking it doesn't swap it
      if (!bumpPick || steps[cur] !== steps[steps.length - 1]) bumpPick = BUMPS.find(([v]) => box(v) && !box(v).checked) || null;
      if (!bumpPick) { bumpBox.innerHTML = ""; return; }
      const [v, head, line] = bumpPick, on = !!box(v)?.checked;
      bumpBox.innerHTML = `<label class="bump${on ? " on" : ""}"><input type="checkbox" data-bump-box ${on ? "checked" : ""}>` +
        `<span><span class="up-tag">Recommended for your event</span><b>${head[0].toUpperCase() + head.slice(1)}</b><small>${line}</small></span>` +
        `<span class="bump-state">${on ? "✓ Added" : "+ Add"}</span></label>`;
      bumpBox.querySelector("[data-bump-box]").addEventListener("change", e => { box(v).checked = e.target.checked; syncCart(); });
    }
  }
  form.addEventListener("click", e => {
    const b = e.target.closest("[data-up]");
    if (!b) return;
    b.dataset.up.split("|").forEach(v => { const x = box(v); if (x) x.checked = true; });
    syncCart();
  });

  // clear the "please complete" note as soon as the step is complete
  ["input", "change"].forEach(t => form.addEventListener(t, () => {
    if (!msg.hidden && !missingIn(steps[cur]).length) msg.hidden = true;
  }));
  goStep(0);
  syncCart();

  const done = document.getElementById("form-done");
  done?.querySelector("[data-restart]")?.addEventListener("click", () => {
    done.hidden = true; form.hidden = false; goStep(0);
  });
  const ig = form.dataset.ig;
  const igLink = `<a href="${ig}" target="_blank" rel="noopener">Instagram</a>`;
  form.addEventListener("submit", async e => {
    e.preventDefault();
    if (cur < steps.length - 1) { form.querySelector("[data-next]:not([hidden])")?.click(); return; }
    for (let i = 0; i < steps.length; i++) if (!check(steps[i])) { goStep(i); check(steps[i]); return; }
    const data = new FormData(form);
    const services = data.getAll("services");
    const endpoint = form.dataset.endpoint;
    if (!endpoint) {
      // design preview: show the finished confirmation, clearly marked as not sent
      form.hidden = true;
      done.classList.add("demo");
      done.hidden = false;
      return;
    }
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ ...Object.fromEntries(data), services, brand: form.dataset.brand })
      });
      if (!res.ok) throw new Error(res.status);
      form.hidden = true;
      done.classList.remove("demo");
      done.hidden = false;
    } catch {
      msg.hidden = false;
      msg.innerHTML = `Something went wrong sending your request. Please DM us on ${igLink}.`;
    }
  });
})();
