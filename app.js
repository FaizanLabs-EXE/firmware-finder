(() => {
  "use strict";
  const CFG = window.FIRMWAREVAULT_CONFIG || {};
  const API = String(CFG.GAS_URL || "").trim();
  const $ = id => document.getElementById(id);
  const state = { results: [], query: "" };

  function configured() {
    return API && !API.includes("PASTE_YOUR_");
  }
  function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  }
  function jsonp(params, timeout = 20000) {
    return new Promise((resolve, reject) => {
      if (!configured()) return reject(new Error("Apps Script URL is not configured."));
      const cb = "__fv_" + Date.now() + "_" + Math.random().toString(36).slice(2);
      const script = document.createElement("script");
      let timer;
      window[cb] = data => { cleanup(); resolve(data); };
      function cleanup(){ clearTimeout(timer); delete window[cb]; script.remove(); }
      script.onerror = () => { cleanup(); reject(new Error("Apps Script request failed.")); };
      const query = new URLSearchParams({...params, callback: cb});
      script.src = API + (API.includes("?") ? "&" : "?") + query.toString();
      document.head.appendChild(script);
      timer = setTimeout(() => { cleanup(); reject(new Error("Request timed out.")); }, timeout);
    });
  }

  function setStatus(title, detail, icon="⌁") {
    $("status").innerHTML = `<div class="status-icon">${icon}</div><div><b>${esc(title)}</b><span>${esc(detail)}</span></div>`;
  }
  function inferPlatform(name, url) {
    const s = (name+" "+url).toLowerCase();
    if (/lumia|windows phone|surface|microsoft/.test(s)) return "Windows";
    if (/iphone|ipad|ios|ipsw/.test(s)) return "iOS";
    if (/router|openwrt|mikrotik|tplink/.test(s)) return "Router/IoT";
    if (/android|samsung|xiaomi|redmi|oneplus|pixel|oppo|vivo|realme/.test(s)) return "Android";
    return "Other";
  }
  function renderResults(results) {
    state.results = results || [];
    $("results").innerHTML = "";
    $("sortSelect").disabled = !state.results.length;
    $("copyAllBtn").disabled = !state.results.length;
    if (!state.results.length) {
      setStatus("No public matches found", "Try the exact model code, a shorter model token, or submit a known direct link.", "∅");
      return;
    }
    setStatus(`${state.results.length} public match${state.results.length===1?"":"es"} found`, "Only public/direct-link candidates are shown. Open the original source before flashing.", "✓");
    const tpl = $("resultTemplate");
    state.results.forEach((r, i) => {
      const card = tpl.content.cloneNode(true);
      card.querySelector(".source-pill").textContent = r.source || "Public";
      card.querySelector(".score").textContent = `${r.score ?? 0}% match`;
      card.querySelector(".result-name").textContent = r.name || r.title || "Firmware file";
      card.querySelector(".result-meta").textContent = [r.brand, r.model, r.version, r.size].filter(Boolean).join(" • ");
      const tags = card.querySelector(".tags");
      [r.fileType || inferPlatform(r.name || "", r.url || ""), r.region, r.build, r.verified ? "community verified" : "public link"].filter(Boolean).forEach(t => {
        const s = document.createElement("span"); s.className="tag"; s.textContent=t; tags.appendChild(s);
      });
      const dl = card.querySelector(".download"); dl.href = r.url || "#";
      const source = card.querySelector(".source-link"); source.href = r.sourceUrl || r.url || "#";
      const copy = card.querySelector(".copy");
      copy.addEventListener("click", async () => {
        try { await navigator.clipboard.writeText(r.url); copy.textContent="Copied ✓"; setTimeout(()=>copy.textContent="Copy",1300); }
        catch { prompt("Copy this URL:", r.url); }
      });
      $("results").appendChild(card);
    });
  }
  function normalizeSort(arr, mode) {
    return [...arr].sort((a,b) => {
      if(mode==="newest") return String(b.date||"").localeCompare(String(a.date||""));
      if(mode==="size") return (b.sizeBytes||0)-(a.sizeBytes||0);
      if(mode==="source") return String(a.source||"").localeCompare(String(b.source||""));
      return (b.score||0)-(a.score||0);
    });
  }

  async function search() {
    const brand = $("brand").value.trim();
    const model = $("model").value.trim();
    const platform = $("platform").value;
    if (!model) return;
    state.query = [brand, model].filter(Boolean).join(" ");
    $("resultsTitle").textContent = `Searching ${state.query}`;
    setStatus("Scanning public indexes…", "Querying archive, GitHub and community sources.", "◌");
    $("results").innerHTML = "";
    try {
      const data = await jsonp({action:"search", brand, model, platform});
      if (!data || !data.ok) throw new Error(data?.error || "Search failed");
      $("resultsTitle").textContent = `${data.total || 0} results for ${state.query}`;
      renderResults(data.results || []);
      $("sourceCount").textContent = data.sources?.length || 3;
    } catch (e) {
      setStatus("Search backend not connected", e.message + " Open config.js and paste your Apps Script /exec URL.", "!");
      $("resultsTitle").textContent = "Backend setup required";
    }
  }

  $("searchForm").addEventListener("submit", e => { e.preventDefault(); search(); });
  $("sortSelect").addEventListener("change", e => renderResults(normalizeSort(state.results, e.target.value)));
  $("copyAllBtn").addEventListener("click", async () => {
    const text = state.results.map(r=>r.url).filter(Boolean).join("\n");
    try { await navigator.clipboard.writeText(text); $("copyAllBtn").textContent="Copied ✓"; setTimeout(()=>$("copyAllBtn").textContent="Copy links",1300); }
    catch { prompt("Copy links:", text); }
  });
  document.querySelectorAll("[data-example]").forEach(b => b.addEventListener("click", () => {
    const [brand,model] = b.dataset.example.split("|"); $("brand").value=brand; $("model").value=model; $("search").scrollIntoView({behavior:"smooth"}); search();
  }));
  $("themeBtn").addEventListener("click", () => document.body.classList.toggle("light"));

  $("submitForm").addEventListener("submit", async e => {
    e.preventDefault();
    const out = $("submitStatus"); out.textContent = "Submitting…";
    const url = $("sUrl").value.trim();
    if (!/^https?:\/\//i.test(url)) { out.textContent="Use a public HTTP(S) URL."; return; }
    try {
      const data = await jsonp({
        action:"submit", brand:$("sBrand").value.trim(), model:$("sModel").value.trim(),
        name:$("sName").value.trim(), url, version:$("sVersion").value.trim(),
        sha256:$("sHash").value.trim(), notes:$("sNotes").value.trim()
      });
      if (!data.ok) throw new Error(data.error || "Submission failed");
      out.textContent = "Submitted ✓ It is now queued/indexed for public search.";
      e.target.reset();
    } catch (err) { out.textContent = err.message; }
  });
})();
