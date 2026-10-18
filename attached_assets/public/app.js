const el = (id) => document.getElementById(id);

function setActiveTab(tabId) {
  document.querySelectorAll(".tab").forEach(btn => btn.classList.toggle("active", btn.dataset.tab === tabId));
  document.querySelectorAll(".tabpane").forEach(p => p.classList.toggle("active", p.id === tabId));
}

document.querySelectorAll(".tab").forEach(btn => {
  btn.addEventListener("click", () => setActiveTab(btn.dataset.tab));
});

el("btnLoadSample").addEventListener("click", () => {
  const sample = {
    jurisdiction: { state: "CA" },
    door: { is_accessible_route: true, is_interior: true, is_egress_required: true, is_fire_door: true, requires_panic: true, space_type: "classroom", location_zone: "interior" },
    electrical: { device_type: "maglock", fire_alarm_interface: false },
    reader: { height_aff: 44 },
    finish: { lock: "626", hinge: "652", plate: "630", closer: "689", exit_device: "689" }
  };
  el("openingInput").value = JSON.stringify(sample, null, 2);
});

el("fileInput").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const text = await file.text();
  el("openingInput").value = text;
});

async function runBOM() {
  setActiveTab("bom");
  el("btnRunBOM").disabled = true;
  try {
    const ctx = JSON.parse(el("openingInput").value || "{}");
    const res = await fetch("/bom", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(ctx) });
    const json = await res.json();
    renderBOM(json);
    el("rawJson").textContent = JSON.stringify(json, null, 2);
  } catch (e) {
    alert("BOM error: " + e.message);
  } finally {
    el("btnRunBOM").disabled = false;
  }
}

async function runQuote() {
  setActiveTab("quote");
  el("btnRunQuote").disabled = true;
  try {
    const body = {
      targetMarginPct: Number(el("margin").value || 35),
      taxRatePct: Number(el("tax").value || 0),
      shippingFlat: Number(el("shipping").value || 0),
    };
    const res = await fetch("/quote", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const json = await res.json();
    renderTotals(json.totals);
    el("quoteDownloads").innerHTML = `<a href="/output/quote.json" target="_blank">Download quote.json</a>`;
    el("rawJson").textContent = JSON.stringify(json, null, 2);
  } catch (e) {
    alert("Quote error: " + e.message);
  } finally {
    el("btnRunQuote").disabled = false;
  }
}

function renderBOM(bom) {
  const tbody = document.querySelector("#bomTable tbody");
  tbody.innerHTML = "";
  (bom.items || []).forEach(it => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${it.category||""}</td>
      <td>${it.description||""}</td>
      <td>${it.family||""}</td>
      <td>${it.bhma_function||""}</td>
      <td>${it.brand||""}</td>
      <td>${it.sku||""}</td>
      <td>${it.finish||""}</td>
      <td>${it.grade||""}</td>
      <td>${it.qty||1}</td>
      <td>${it.msrp||""}</td>
    `;
    tbody.appendChild(tr);
  });
  const dl = bom.downloads || {};
  const links = [];
  if (dl.json) links.push(`<a href="${dl.json}" target="_blank">bom.json</a>`);
  if (dl.csv) links.push(`<a href="${dl.csv}" target="_blank">bom.csv</a>`);
  if (dl.pdf) links.push(`<a href="${dl.pdf}" target="_blank">bom.pdf</a>`);
  document.getElementById("bomDownloads").innerHTML = links.length ? ("Downloads: " + links.join(" • ")) : "";
}

function renderTotals(t) {
  const elT = document.getElementById("totals");
  if (!t) { elT.textContent = "Run /quote to see totals"; return; }
  elT.innerHTML = `
    <div><strong>MSRP</strong><span>$${(t.msrp||0).toFixed(2)}</span></div>
    <div><strong>Est. Cost</strong><span>$${(t.costEstimate||0).toFixed(2)}</span></div>
    <div><strong>Sell</strong><span>$${(t.sell||0).toFixed(2)}</span></div>
    <div><strong>Margin</strong><span>${(t.marginPct||0).toFixed(1)}%</span></div>
    <div><strong>Tax</strong><span>$${(t.tax||0).toFixed(2)}</span></div>
    <div><strong>Shipping</strong><span>$${(t.shipping||0).toFixed(2)}</span></div>
    <div style="grid-column: span 3;"><strong>Grand Total</strong><span style="font-size:22px;">$${(t.grandTotal||0).toFixed(2)}</span></div>
  `;
}

el("btnRunBOM").addEventListener("click", runBOM);
el("btnRunQuote").addEventListener("click", runQuote);

// Load a sample automatically on first load
if (!el("openingInput").value) {
  el("btnLoadSample").click();
}