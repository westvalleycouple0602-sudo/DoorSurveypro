
const formatMoney = (cents) => {
  const dollars = cents / 100;
  return dollars.toLocaleString(undefined, { style: "currency", currency: "USD" });
};

const tiersEl = document.querySelector("#tiers");
const addonsEl = document.querySelector("#addons");
const toggle = document.querySelector("#billing-toggle");
const yearEl = document.querySelector("#year");
yearEl.textContent = new Date().getFullYear();

let catalog = null;
let interval = "monthly"; // default

const TIERS = [
  {
    key: "starter",
    name: "Starter / Solo",
    blurb: "For independent sales associates & consultants.",
    features: [
      "Up to 5 active projects",
      "Mobile data collection",
      "Barcode scans (10/day)",
      "Basic reports & exports",
      "Email support"
    ],
    cta: "Start free trial",
    popular: false
  },
  {
    key: "pro",
    name: "Professional / Team",
    blurb: "For small to mid-size distributors and GC teams.",
    features: [
      "Unlimited projects",
      "Cloud sync & collaboration",
      "Manufacturer auto‑docs & scans",
      "Live distributor pricing quotes",
      "Templates (PDF/CSV), calendar sync",
      "Priority support"
    ],
    cta: "Start free trial",
    popular: true
  },
  {
    key: "enterprise",
    name: "Enterprise / Integration",
    blurb: "For large distributors, nationals, and manufacturers.",
    features: [
      "Admin & role permissions",
      "API access (ERP/Jira/Confluence)",
      "Advanced analytics & reporting",
      "CRM sync (HubSpot/Salesforce)",
      "AI audits & diagnostics",
      "Dedicated success manager"
    ],
    cta: "Talk to sales",
    popular: false
  }
];

const ADDONS = [
  { key: "manufacturerDb", name: "Manufacturer Database Access", blurb: "Extended barcode & hardware data." },
  { key: "aiDiagnostics", name: "Advanced Analytics / AI Diagnostics", blurb: "Track app health & UX signals." },
  { key: "offlineSyncPack", name: "Offline Sync Expansion", blurb: "Add 5 more field devices to a plan." }
];

async function loadCatalog() {
  const res = await fetch("/api/catalog");
  const json = await res.json();
  if (json.ok) {
    catalog = json.catalog;
    render();
  }
}

function priceFor(key) {
  if (!catalog) return 0;
  return catalog[interval][key];
}

function renderTiers() {
  tiersEl.innerHTML = "";
  TIERS.forEach(tier => {
    const price = priceFor(tier.key);
    const pretty = formatMoney(price) + (interval === "annual" ? " /yr" : " /mo");

    const card = document.createElement("div");
    card.className = "bg-white rounded-2xl shadow-sm p-6 flex flex-col border border-gray-100 relative";

    if (tier.popular) {
      const badge = document.createElement("div");
      badge.className = "absolute -top-3 right-4 bg-green-600 text-white text-xs font-semibold px-2 py-1 rounded-full";
      badge.textContent = "Most popular";
      card.appendChild(badge);
    }

    const title = document.createElement("h4");
    title.className = "text-xl font-bold";
    title.textContent = tier.name;

    const blurb = document.createElement("p");
    blurb.className = "text-gray-600 mt-1";
    blurb.textContent = tier.blurb;

    const priceEl = document.createElement("div");
    priceEl.className = "mt-4 text-3xl font-extrabold";
    priceEl.textContent = pretty;

    const trial = document.createElement("p");
    trial.className = "text-sm text-gray-500";
    trial.textContent = `Includes ${catalog.trialDays}-day free trial`;

    const ul = document.createElement("ul");
    ul.className = "mt-4 space-y-2 text-gray-700";
    tier.features.forEach(f => {
      const li = document.createElement("li");
      const bullet = document.createElement("span");
      bullet.className = "inline-block w-2 h-2 rounded-full bg-green-600 mr-2 align-middle";
      const text = document.createTextNode(f);
      li.appendChild(bullet);
      li.appendChild(text);
      ul.appendChild(li);
    });

    const btn = document.createElement("button");
    btn.className = "mt-6 w-full py-3 rounded-xl font-semibold shadow-sm hover:shadow transition " + (tier.key === "enterprise" ? "bg-gray-900 text-white" : "bg-green-600 text-white");
    btn.textContent = tier.cta;
    btn.addEventListener("click", () => {
      if (tier.key === "enterprise") {
        window.location.href = "mailto:sales@doorsurveypro.example?subject=Enterprise%20Inquiry";
      } else {
        createCheckout(tier.key);
      }
    });

    card.appendChild(title);
    card.appendChild(blurb);
    card.appendChild(priceEl);
    card.appendChild(trial);
    card.appendChild(ul);
    card.appendChild(btn);

    tiersEl.appendChild(card);
  });
}

function renderAddons() {
  addonsEl.innerHTML = "";
  ADDONS.forEach(add => {
    const card = document.createElement("label");
    card.className = "bg-white rounded-2xl shadow-sm p-4 border border-gray-100 flex items-start gap-3 cursor-pointer";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "mt-1";
    checkbox.dataset.key = add.key;

    const info = document.createElement("div");
    const title = document.createElement("div");
    title.className = "font-semibold";
    title.textContent = add.name;

    const price = document.createElement("div");
    price.className = "text-sm text-gray-600";
    price.textContent = `${formatMoney(catalog.addons[add.key])} / ${interval === "annual" ? "yr" : "mo"}`;

    const blurb = document.createElement("div");
    blurb.className = "text-sm text-gray-600";
    blurb.textContent = add.blurb;

    info.appendChild(title);
    info.appendChild(price);
    info.appendChild(blurb);

    card.appendChild(checkbox);
    card.appendChild(info);

    addonsEl.appendChild(card);
  });
}

function selectedAddons() {
  return Array.from(addonsEl.querySelectorAll("input[type='checkbox']:checked")).map(c => c.dataset.key);
}

async function createCheckout(planKey) {
  const email = ""; // Optionally capture an email in your UI
  const addons = selectedAddons();

  const res = await fetch("/api/create-checkout-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan: planKey, interval, addons, email })
  });
  const json = await res.json();
  if (json.ok && json.checkoutUrl) {
    window.location.href = json.checkoutUrl;
  } else {
    alert(json.error || "Failed to start checkout");
  }
}

function render() {
  renderTiers();
  renderAddons();
}

toggle.addEventListener("change", () => {
  interval = toggle.checked ? "annual" : "monthly";
  render();
});

loadCatalog();
