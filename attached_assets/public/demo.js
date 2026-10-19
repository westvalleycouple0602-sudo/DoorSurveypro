// Wire up the form to the validator
const $ = (id) => document.getElementById(id);
const tbody = document.querySelector("#results tbody");
const summary = document.getElementById("summary");

document.getElementById("btn").addEventListener("click", async () => {
  const p = {
    country: $("country").value === "CA" ? "CA" : "US",
    accessible_route: $("accessible").checked,
    egress_required: $("egress").checked,
    door: {
      type: $("dtype").value, operation: $("op").value,
      fire_rating_minutes: Number($("fr").value) || 0,
      has_breakout: $("dtype").value !== "swing" ? true : undefined,
      adjacent_swing_door_present: $("dtype").value === "revolving" ? true : undefined,
      power_fail_safe_open: $("op").value === "automatic"
    },
    occupant_load: Number($("occ").value) || 0,
    measurements: {
      clear_opening_in: Number($("co").value) || 0,
      clear_height_in: Number($("ch").value) || 0,
      threshold_height_in: Number($("th").value) || 0,
      hardware_height_in: Number($("hh").value) || 0,
      gaps_in: { top: Number($("g_top").value), latch: Number($("g_latch").value), hinge: Number($("g_hinge").value), meeting_stiles: Number($("g_meet").value), bottom: Number($("g_bot").value) },
      maneuvering: { pull_side: { latch_side_in: Number($("m_pl").value), perpendicular_depth_in: Number($("m_pd").value) }, push_side: { latch_side_in: Number($("m_ul").value), perpendicular_depth_in: Number($("m_ud").value) } }
    },
    config: { measurement_uncertainty_in: 0.12 }
  };

  const res = window.DoorScanValidator.validate(p);

  // Render
  summary.textContent = JSON.stringify(res.summary, null, 2);
  tbody.innerHTML = "";
  for (const r of res.results) {
    const tr = document.createElement("tr");
    const status = r.passed ? "info" : (r.severity === "WARN" ? "warn" : "fail");
    tr.innerHTML = `<td>${r.code}</td><td class="${status}">${r.passed ? "PASS" : r.severity}</td><td>${r.message}</td>`;
    tbody.appendChild(tr);
  }

  // Also POST to the API validator to compare (optional)
  try {
    const api = await fetch("/validate/validate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) }).then(r => r.json());
    console.log("API validator summary:", api.summary);
  } catch(e) {
    console.warn("API validator not reachable yet", e);
  }
});
