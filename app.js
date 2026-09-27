"use strict";

(function () {
  var detail = document.getElementById("detail");
  var sidebarList = document.querySelector(".sidebar-list");
  var selected = null;
  var appsData = {};
  var pollTimer = null;

  function init() {
    document.querySelectorAll(".sidebar-row[data-id]").forEach(function (row) {
      row.addEventListener("click", function () {
        var id = row.getAttribute("data-id");
        if (id === "process") {
          selectProcess();
        } else {
          selectApp(id);
        }
      });
    });

    startPoll(fetchApps, 2500);
    selectApp("shell");
  }

  function fetchApps() {
    apiGet("/api/apps").then(function (data) {
      if (data.apps) {
        data.apps.forEach(function (app) { appsData[app.id] = app; });
        updateSidebar();
        if (selected && selected !== "process" && appsData[selected]) {
          renderDetail(appsData[selected]);
        }
      }
    }).catch(function () { /* silent poll failure */ });
  }

  function updateSidebar() {
    document.querySelectorAll(".sidebar-row[data-id]").forEach(function (row) {
      var id = row.getAttribute("data-id");
      var app = appsData[id];
      if (!app) return;
      var subtitle = row.querySelector(".row-subtitle");
      if (subtitle) subtitle.textContent = app.stage + " · " + (app.qa || "Pending");
      var badge = row.querySelector(".row-badge");
      if (badge) {
        badge.textContent = app.qa || app.stage;
        badge.className = "row-badge " + qaBadgeClass(app.qa);
      }
      var prio = row.querySelector(".row-priority");
      if (prio) prio.textContent = app.priority || "";
    });
  }

  function selectApp(id) {
    selected = id;
    document.querySelectorAll(".sidebar-row").forEach(function (r) {
      r.classList.toggle("is-selected", r.getAttribute("data-id") === id);
      r.setAttribute("aria-selected", r.getAttribute("data-id") === id ? "true" : "false");
    });
    if (appsData[id]) {
      renderDetail(appsData[id]);
    } else {
      detail.innerHTML = '<div class="detail-empty"><span class="detail-empty-icon">...</span><span class="detail-empty-text">Loading…</span></div>';
    }
  }

  function selectProcess() {
    selected = "process";
    document.querySelectorAll(".sidebar-row").forEach(function (r) {
      r.classList.toggle("is-selected", r.getAttribute("data-id") === "process");
    });
    renderProcess();
  }

  function renderDetail(app) {
    if (selected !== app.id) return;

    var focusedField = document.activeElement ? document.activeElement.getAttribute("data-field") : null;

    var html = '<div class="app-header">'
      + '<div class="app-header-row">'
      + '<span class="app-icon">' + (app.icon || "") + '</span>'
      + '<h2 class="app-name">' + esc(app.name) + '</h2>'
      + '</div>'
      + '<div class="app-meta">'
      + '<span class="row-badge badge-stage">' + esc(app.stage) + '</span>'
      + '<span class="row-badge ' + qaBadgeClass(app.qa) + '">' + esc(app.qa || "Pending") + '</span>'
      + (app.priority ? '<span class="row-badge badge-skipped">' + esc(app.priority) + '</span>' : '')
      + '<span style="margin-left:auto" class="updated-at">Updated ' + relTime(app.updated_at) + '</span>'
      + '</div>'
      + '</div>';

    html += '<div class="stepper-section"><h3>Deployment Stage</h3>'
      + renderStepper(app.stage, app.id)
      + '</div>';

    html += '<div class="card"><h3>Release QA</h3>'
      + '<div class="card-row">'
      + '<span class="card-label">QA Status</span>'
      + renderQAControl(app.qa)
      + '</div></div>';

    html += '<div class="card"><h3>Details</h3>'
      + fieldRow("next_needed", "Next Needed", app.next_needed, focusedField, app.id)
      + fieldRow("blockers", "Blockers", app.blockers, focusedField, app.id)
      + fieldRow("notes", "Notes", app.notes, focusedField, app.id, true)
      + '</div>';

    if (app.store_rows && app.store_rows.length) {
      html += '<div class="card"><h3>Store Targets</h3><div class="store-rows">';
      app.store_rows.forEach(function (sr) {
        html += '<div class="store-row">'
          + '<span class="store-row-icon">' + storeIcon(sr.store) + '</span>'
          + '<span class="store-row-name">' + esc(sr.store) + '</span>'
          + '<span class="store-row-status">' + esc(sr.status || "—") + '</span>'
          + '</div>';
      });
      html += '</div></div>';
    }

    html += '<div style="text-align:center;padding:8px 0;">'
      + '<a href="apps/' + app.id + '.html" style="font-size:13px;color:var(--accent);font-weight:600;">Open dedicated page →</a>'
      + '</div>';

    detail.innerHTML = html;
    bindDetailEvents(app.id);
  }

  function fieldRow(field, label, value, focusedField, appId, isTextarea) {
    var tag = isTextarea ? "textarea" : "input";
    var val = value || "";
    var html = '<div class="card-row">'
      + '<div style="display:flex;align-items:center;justify-content:space-between;">'
      + '<span class="card-label">' + label + '</span>'
      + '<span class="save-indicator" id="save-' + field + '"></span>'
      + '</div>';
    if (focusedField === field) {
      html += '<' + tag + ' class="field-input" data-field="' + field + '"'
        + (isTextarea ? '>' + esc(val) + '</textarea>' : ' type="text" value="' + esc(val).replace(/"/g, '&quot;') + '">');
    } else {
      html += '<' + tag + ' class="field-input" data-field="' + field + '"'
        + (isTextarea ? '>' + esc(val) + '</textarea>' : ' type="text" value="' + esc(val).replace(/"/g, '&quot;') + '">');
    }
    html += '</div>';
    return html;
  }

  function bindDetailEvents(appId) {
    detail.querySelectorAll(".stepper-step").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var stage = btn.getAttribute("data-stage");
        apiPostStage(appId, stage).then(function () { fetchApps(); });
      });
    });

    detail.querySelectorAll(".segmented-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var val = btn.getAttribute("data-value");
        apiPatch(appId, { qa: val }).then(function () { fetchApps(); });
      });
    });

    detail.querySelectorAll(".field-input").forEach(function (inp) {
      var field = inp.getAttribute("data-field");
      var save = debounce(function () {
        var indicator = document.getElementById("save-" + field);
        if (indicator) flashSave(indicator);
        var body = {};
        body[field] = inp.value;
        apiPatch(appId, body);
      }, 400);

      inp.addEventListener("input", save);
      inp.addEventListener("blur", function () {
        var body = {};
        body[field] = inp.value;
        apiPatch(appId, body);
      });
    });
  }

  function renderProcess() {
    var stages = [
      { name: "Prep", desc: "Metadata, screenshots, descriptions, privacy policy, content ratings" },
      { name: "Build", desc: "Release build with correct signing configuration" },
      { name: "Sign", desc: "Code signing (Android keystore / iOS distribution certificate)" },
      { name: "Submit", desc: "Upload binary + store listing to Google Play / App Store Connect" },
      { name: "Review", desc: "Store review period — monitor for rejection feedback" },
      { name: "Release", desc: "Approved — release to production track / App Store" },
    ];

    var html = '<div class="app-header"><div class="app-header-row">'
      + '<span class="app-icon">📋</span>'
      + '<h2 class="app-name">Process</h2></div>'
      + '<div class="app-meta">6-stage deployment pipeline &amp; checklists</div></div>';

    html += '<div class="card"><h3>Pipeline Stages</h3><ol class="process-stages">';
    stages.forEach(function (s, i) {
      html += '<li class="process-stage">'
        + '<span class="process-num">' + (i + 1) + '</span>'
        + '<div><h4>' + s.name + '</h4><p>' + s.desc + '</p></div></li>';
    });
    html += '</ol></div>';

    html += '<div class="card"><h3>Prep Checklist</h3>'
      + '<ul style="margin:0;padding-left:1.25rem;color:var(--text-secondary);font-size:14px;line-height:1.8;">'
      + '<li>App name, short &amp; full description finalized</li>'
      + '<li>Screenshots for all required device sizes</li>'
      + '<li>Feature graphic / promotional images</li>'
      + '<li>Privacy policy URL live and correct</li>'
      + '<li>Content rating questionnaire completed</li>'
      + '<li>Store listing category &amp; tags selected</li>'
      + '<li>Contact email &amp; support URL set</li>'
      + '</ul></div>';

    html += '<div class="card"><h3>Release QA Gate</h3>'
      + '<p style="margin:0;font-size:14px;color:var(--text-secondary);line-height:1.6;">'
      + 'Release QA owns the <strong>GO / NO-GO</strong> decision. '
      + 'An app cannot advance past Submit without QA sign-off. '
      + 'NO-GO blocks the pipeline until resolved.</p></div>';

    detail.innerHTML = html;
  }

  function esc(s) {
    if (!s) return "";
    var d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  document.addEventListener("DOMContentLoaded", init);
})();
