"use strict";

window.STORE_API = localStorage.getItem("STORE_API") ||
  (location.port === "60142" ? "" : "http://100.89.1.4:60142");

const STAGES = ["Prep", "Build", "Sign", "Submit", "Review", "Release"];

/* ── API helpers ── */

async function apiGet(path) {
  const res = await fetch(window.STORE_API + path);
  if (!res.ok) throw new Error("GET " + path + " → " + res.status);
  return res.json();
}

async function apiPatch(appId, body) {
  const res = await fetch(window.STORE_API + "/api/apps/" + appId, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("PATCH " + appId + " → " + res.status);
  return res.json();
}

async function apiPostStage(appId, stage) {
  const res = await fetch(window.STORE_API + "/api/apps/" + appId + "/stage", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ stage: stage }),
  });
  if (!res.ok) throw new Error("POST stage " + appId + " → " + res.status);
  return res.json();
}

/* ── Debounce ── */

function debounce(fn, ms) {
  var timer;
  return function () {
    var ctx = this, args = arguments;
    clearTimeout(timer);
    timer = setTimeout(function () { fn.apply(ctx, args); }, ms);
  };
}

/* ── Polling ── */

function startPoll(fn, interval) {
  fn();
  return setInterval(fn, interval || 2500);
}

/* ── QA badge class ── */

function qaBadgeClass(qa) {
  if (!qa) return "badge-pending";
  var q = qa.toUpperCase();
  if (q === "GO") return "badge-go";
  if (q === "NO-GO") return "badge-nogo";
  if (q === "SKIPPED") return "badge-skipped";
  return "badge-pending";
}

/* ── Relative time ── */

function relTime(iso) {
  if (!iso) return "—";
  var d = new Date(iso);
  var now = Date.now();
  var diff = Math.floor((now - d.getTime()) / 1000);
  if (diff < 10) return "just now";
  if (diff < 60) return diff + "s ago";
  if (diff < 3600) return Math.floor(diff / 60) + "m ago";
  if (diff < 86400) return Math.floor(diff / 3600) + "h ago";
  return d.toLocaleDateString();
}

/* ── Stage stepper HTML ── */

function renderStepper(currentStage, appId) {
  var idx = STAGES.indexOf(currentStage);
  if (idx === -1) idx = -1; // Skipped or unknown: none active

  var html = '<div class="stepper" role="group" aria-label="Deployment stages">';
  for (var i = 0; i < STAGES.length; i++) {
    var state;
    if (idx === -1) state = "upcoming";
    else if (i < idx) state = "done";
    else if (i === idx) state = "current";
    else state = "upcoming";

    var lineBefore = (i > 0) ? '<span class="stepper-line-before' + (state === "done" || state === "current" ? " stepper-line-done" : "") + '"></span>' : "";
    var lineAfter = (i < STAGES.length - 1) ? '<span class="stepper-line-after' + (state === "done" ? " stepper-line-done" : "") + '"></span>' : "";

    var dotContent;
    if (state === "done") {
      dotContent = '<svg class="stepper-check" viewBox="0 0 16 16"><path d="M3.5 8.5L6.5 11.5L12.5 5"/></svg>';
    } else {
      dotContent = (i + 1);
    }

    html += '<button type="button" class="stepper-step stepper-step-' + state + '" data-stage="' + STAGES[i] + '" title="Set stage to ' + STAGES[i] + '">'
      + '<div class="stepper-dot-row">' + lineBefore + '<span class="stepper-dot">' + dotContent + '</span>' + lineAfter + '</div>'
      + '<span class="stepper-label">' + STAGES[i] + '</span>'
      + '</button>';
  }
  html += '</div>';
  return html;
}

/* ── QA segmented control HTML ── */

function renderQAControl(currentQA) {
  var options = ["Pending", "GO", "NO-GO"];
  var html = '<div class="segmented-control" role="radiogroup" aria-label="Release QA">';
  for (var i = 0; i < options.length; i++) {
    var active = (currentQA === options[i]) ? " is-active" : "";
    html += '<button type="button" class="segmented-btn' + active + '" data-value="' + options[i] + '" role="radio" aria-checked="' + (active ? "true" : "false") + '">' + options[i] + '</button>';
  }
  html += '</div>';
  return html;
}

/* ── Settings modal ── */

function showSettings() {
  if (document.getElementById("settings-overlay")) return;
  var current = localStorage.getItem("STORE_API") || "";
  var div = document.createElement("div");
  div.id = "settings-overlay";
  div.className = "settings-overlay";
  div.innerHTML = '<div class="settings-modal">'
    + '<h3>API Settings</h3>'
    + '<label for="api-url-input">Store API Base URL</label>'
    + '<input type="text" id="api-url-input" placeholder="http://100.89.1.4:60142 (leave empty for same-origin)" value="' + current.replace(/"/g, '&quot;') + '">'
    + '<p style="font-size:12px;color:var(--text-tertiary);margin:0 0 16px;">Leave empty when served from the API host (port 60142).</p>'
    + '<div class="settings-actions">'
    + '<button type="button" class="settings-cancel" onclick="closeSettings()">Cancel</button>'
    + '<button type="button" class="settings-save" onclick="saveSettings()">Save</button>'
    + '</div></div>';
  div.addEventListener("click", function (e) { if (e.target === div) closeSettings(); });
  document.body.appendChild(div);
}

function closeSettings() {
  var el = document.getElementById("settings-overlay");
  if (el) el.remove();
}

function saveSettings() {
  var val = document.getElementById("api-url-input").value.trim();
  if (val) {
    localStorage.setItem("STORE_API", val);
    window.STORE_API = val;
  } else {
    localStorage.removeItem("STORE_API");
    window.STORE_API = location.port === "60142" ? "" : "http://100.89.1.4:60142";
  }
  closeSettings();
  location.reload();
}

/* ── Save indicator flash ── */

function flashSave(el) {
  el.className = "save-indicator is-saving";
  el.textContent = "Saving…";
  setTimeout(function () {
    el.className = "save-indicator is-saved";
    el.textContent = "Saved";
    setTimeout(function () {
      el.className = "save-indicator";
      el.textContent = "";
    }, 1500);
  }, 300);
}

/* ── Store row icons ── */

function storeIcon(name) {
  if (!name) return "";
  var n = name.toLowerCase();
  if (n.indexOf("google") !== -1 || n.indexOf("play") !== -1) return "▶️";
  if (n.indexOf("apple") !== -1 || n.indexOf("app store") !== -1) return "🍎";
  if (n.indexOf("windows") !== -1) return "🪟";
  return "📦";
}
