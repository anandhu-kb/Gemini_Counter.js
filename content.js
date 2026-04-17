(function () {
  const MODELS = {
    "3.1 Deep Think": 1048576,
    "3.1 Pro (Thinking)": 1048576,
    "3 Flash (Fast)": 1048576,
    "2.5 Pro": 1048576,
  };
  const DEFAULT_LIMIT = 1000000;
  let popupOpen = false;
  let isDragging = false;
  let dragOffsetX = 0;
  let dragOffsetY = 0;
  let hasDragged = false;

  function createUI() {
    if (document.getElementById("gtc-bar-wrap")) return;

    let barWrap = document.createElement("div");
    barWrap.id = "gtc-bar-wrap";
    let bar = document.createElement("div");
    bar.id = "gtc-bar";
    barWrap.appendChild(bar);
    document.body.appendChild(barWrap);

    let label = document.createElement("div");
    label.id = "gtc-label";
    label.innerHTML =
      '<div class="label-top">' +
      '<span class="model-name"></span>' +
      '<span class="token-count"></span>' +
      '<span class="arrow">▼</span>' +
      "</div>" +
      '<div class="label-bar-bg"><div class="label-bar-fill"></div></div>';
    label.addEventListener("mousedown", onDragStart);
    label.addEventListener("click", function (e) {
      if (!hasDragged) togglePopup(e);
    });
    document.addEventListener("mousemove", onDragMove);
    document.addEventListener("mouseup", onDragEnd);
    document.body.appendChild(label);

    let overlay = document.createElement("div");
    overlay.id = "gtc-popup-overlay";
    overlay.addEventListener("click", closePopup);
    document.body.appendChild(overlay);

    let popup = document.createElement("div");
    popup.id = "gtc-popup";
    popup.innerHTML =
      '<div id="gtc-popup-header"><div class="popup-title">Token Usage</div><div class="popup-subtitle">Estimated via character count (chars ÷ 4)</div></div>' +
      '<div id="gtc-popup-gauge"></div>' +
      '<div id="gtc-popup-details"></div>' +
      '<div id="gtc-popup-models"><div class="models-title">All Models</div></div>';
    document.body.appendChild(popup);
  }

  function onDragStart(e) {
    if (e.target.closest("#gtc-popup")) return;
    let label = document.getElementById("gtc-label");
    if (!label) return;
    isDragging = true;
    hasDragged = false;
    let rect = label.getBoundingClientRect();
    dragOffsetX = e.clientX - rect.left;
    dragOffsetY = e.clientY - rect.top;
    label.style.cursor = "grabbing";
    label.style.transition = "none";
    e.preventDefault();
  }

  function onDragMove(e) {
    if (!isDragging) return;
    hasDragged = true;
    let label = document.getElementById("gtc-label");
    if (!label) return;
    let x = e.clientX - dragOffsetX;
    let y = e.clientY - dragOffsetY;
    let maxX = window.innerWidth - label.offsetWidth;
    let maxY = window.innerHeight - label.offsetHeight;
    x = Math.max(0, Math.min(x, maxX));
    y = Math.max(0, Math.min(y, maxY));
    label.style.left = x + "px";
    label.style.top = y + "px";
    label.style.right = "auto";

    let popup = document.getElementById("gtc-popup");
    if (popup && popupOpen) {
      popup.style.left = x + "px";
      popup.style.top = (y + label.offsetHeight + 4) + "px";
      popup.style.right = "auto";
    }
  }

  function onDragEnd() {
    if (!isDragging) return;
    isDragging = false;
    let label = document.getElementById("gtc-label");
    if (label) label.style.cursor = "grab";
    setTimeout(function () { hasDragged = false; }, 0);
  }

  function togglePopup(e) {
    e.stopPropagation();
    popupOpen = !popupOpen;
    let popup = document.getElementById("gtc-popup");
    let overlay = document.getElementById("gtc-popup-overlay");
    let label = document.getElementById("gtc-label");
    if (popupOpen) {
      if (label && popup) {
        let rect = label.getBoundingClientRect();
        popup.style.top = (rect.bottom + 4) + "px";
        popup.style.left = Math.max(0, rect.right - 360) + "px";
        popup.style.right = "auto";
      }
      popup.classList.add("open");
      overlay.classList.add("open");
      label.classList.add("open");
      updatePopup();
    } else {
      closePopup();
    }
  }

  function closePopup() {
    popupOpen = false;
    let popup = document.getElementById("gtc-popup");
    let overlay = document.getElementById("gtc-popup-overlay");
    let label = document.getElementById("gtc-label");
    if (popup) popup.classList.remove("open");
    if (overlay) overlay.classList.remove("open");
    if (label) label.classList.remove("open");
  }

  function detectModel() {
    let title = document.title.toLowerCase();
    for (let key in MODELS) {
      if (title.includes(key.toLowerCase())) {
        return { name: key, limit: MODELS[key] };
      }
    }

    let candidates = Array.from(document.querySelectorAll("span, div, button")).filter(el => {
      if (el.closest("#gtc-label") || el.closest("#gtc-popup")) return false;
      if (el.closest("message-content") || el.closest('[class*="response"]') || el.closest('[class*="query"]')) return false;
      
      let tag = el.tagName.toLowerCase();
      let text = (el.textContent || "").trim();
      let hasTextClass = el.className && typeof el.className === "string" && (
        el.className.includes("text") || el.className.includes("label") || el.className.includes("title") || el.className.includes("name") || el.className.includes("picker") || el.className.includes("button")
      );
      
      return text.length > 0 && text.length < 50 && (tag === "button" || hasTextClass || el.hasAttribute("role") || el.hasAttribute("data-test-id"));
    });

    let detectedModel = null;

    for (let el of candidates) {
      let clone = el.cloneNode(true);
      if (clone.querySelectorAll) {
        let icons = clone.querySelectorAll("mat-icon, .google-symbols, .material-icons");
        icons.forEach(function(icon) { icon.remove(); });
      }
      let txt = (clone.textContent || "").toLowerCase().replace(/\n/g, " ").trim();
      if (!txt) continue;
      
      if (txt === "fast" || txt === "gemini fast" || txt === "flash" || txt === "3 flash") {
        detectedModel = { name: "3 Flash (Fast)", limit: MODELS["3 Flash (Fast)"] };
        break;
      } else if (txt === "advanced" || txt === "gemini advanced" || txt === "pro" || txt === "thinking" || txt === "3.1 pro") {
        detectedModel = { name: "3.1 Pro (Thinking)", limit: MODELS["3.1 Pro (Thinking)"] };
        break;
      } else if (txt === "deep think") {
        detectedModel = { name: "3.1 Deep Think", limit: MODELS["3.1 Deep Think"] };
        break;
      }
      
      for (let key in MODELS) {
        if (txt.includes(key.toLowerCase()) || txt === key.toLowerCase()) {
          detectedModel = { name: key, limit: MODELS[key] };
          break;
        }
      }
      if (detectedModel) break;
    }

    if (detectedModel) return detectedModel;

    return { name: "Unknown", limit: DEFAULT_LIMIT };
  }

  function scrapeText() {
    let parts = [];
    let containers = document.querySelectorAll(
      'message-content, .message-content, [class*="response-container"], [class*="query-content"], [class*="model-response"], [data-message-id], .conversation-container, [role="article"]'
    );
    if (containers.length) {
      containers.forEach(function (c) {
        parts.push(c.innerText || "");
      });
    } else {
      let fallbacks = document.querySelectorAll(
        '[class*="message"], [class*="response"], [class*="query"], [class*="conversation"]'
      );
      if (fallbacks.length) {
        fallbacks.forEach(function (c) {
          parts.push(c.innerText || "");
        });
      } else {
        let main =
          document.querySelector("main") ||
          document.querySelector('[role="main"]');
        if (main) parts.push(main.innerText || "");
      }
    }
    return parts.join("\n");
  }

  function estimateTokens(text) {
    return Math.ceil(text.length / 4);
  }

  function formatNumber(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
    if (n >= 1000) return (n / 1000).toFixed(1) + "K";
    return n.toString();
  }

  function formatNumberFull(n) {
    return n.toLocaleString();
  }

  function updatePopup() {
    let gauge = document.getElementById("gtc-popup-gauge");
    let details = document.getElementById("gtc-popup-details");
    let modelsContainer = document.getElementById("gtc-popup-models");
    if (!gauge || !details || !modelsContainer) return;

    let model = detectModel();
    let text = scrapeText();
    let charCount = text.length;
    let used = estimateTokens(text);
    let remaining = Math.max(0, model.limit - used);
    let pct = Math.min(100, (used / model.limit) * 100);
    let colorClass = pct >= 90 ? "danger" : pct >= 70 ? "warn" : "";

    gauge.innerHTML =
      '<div class="gauge-model">' + model.name + '</div>' +
      '<div class="gauge-numbers">' +
      '<span class="gauge-used">' + formatNumberFull(used) + '</span>' +
      '<span class="gauge-sep"> / </span>' +
      '<span class="gauge-total">' + formatNumberFull(model.limit) + ' tokens</span>' +
      '</div>' +
      '<div class="gauge-bar-bg"><div class="gauge-bar-fill ' + colorClass + '" style="width:' + pct + '%"></div></div>' +
      '<div class="gauge-footer">' +
      '<span class="gauge-pct ' + colorClass + '">' + pct.toFixed(1) + '% used</span>' +
      '<span class="gauge-remaining">' + formatNumberFull(remaining) + ' remaining</span>' +
      '</div>';

    details.innerHTML =
      '<div class="detail-row"><span class="detail-label">Characters Scraped</span><span class="detail-value">' +
      formatNumberFull(charCount) +
      "</span></div>" +
      '<div class="detail-row"><span class="detail-label">Est. Tokens (chars ÷ 4)</span><span class="detail-value">' +
      formatNumberFull(used) +
      "</span></div>" +
      '<div class="detail-row"><span class="detail-label">Context Window</span><span class="detail-value">' +
      formatNumber(model.limit) +
      " tokens</span></div>";

    let cards = "";
    for (let key in MODELS) {
      let isActive = key === model.name;
      let modelPct = Math.min(100, (used / MODELS[key]) * 100);
      let modelColorClass = modelPct >= 90 ? "danger" : modelPct >= 70 ? "warn" : "";
      let modelRemaining = Math.max(0, MODELS[key] - used);
      cards +=
        '<div class="model-card' +
        (isActive ? " active" : "") +
        '">' +
        '<div class="mc-top"><div class="mc-left"><span class="mc-name">' +
        key +
        '</span><span class="mc-limit">' +
        formatNumberFull(MODELS[key]) +
        " tokens · " +
        (isActive
          ? formatNumberFull(modelRemaining) + " remaining"
          : formatNumberFull(modelRemaining) + " would remain") +
        '</span></div><div class="mc-right"><span class="mc-badge">Active</span><span class="mc-pct ' +
        modelColorClass +
        '">' +
        modelPct.toFixed(1) +
        "%</span></div></div>" +
        '<div class="mc-bar-bg"><div class="mc-bar-fill ' +
        modelColorClass +
        '" style="width:' +
        modelPct +
        '%"></div></div></div>';
    }

    modelsContainer.innerHTML =
      '<div class="models-title">All Models</div>' + cards;
  }

  function update() {
    createUI();
    let model = detectModel();
    let text = scrapeText();
    let used = estimateTokens(text);
    let remaining = Math.max(0, model.limit - used);
    let pct = Math.min(100, (used / model.limit) * 100);
    let colorClass = pct >= 90 ? "danger" : pct >= 70 ? "warn" : "";

    let bar = document.getElementById("gtc-bar");
    let label = document.getElementById("gtc-label");
    if (!bar || !label) return;

    bar.style.width = pct + "%";
    bar.className = pct >= 90 ? "danger" : pct >= 70 ? "warn" : "";

    let modelSpan = label.querySelector(".model-name");
    let tokenSpan = label.querySelector(".token-count");
    let labelBarFill = label.querySelector(".label-bar-fill");

    modelSpan.textContent = model.name + " · ";
    tokenSpan.textContent = formatNumber(used) + " / " + formatNumber(model.limit);
    tokenSpan.className =
      "token-count" + (pct >= 90 ? " danger" : pct >= 70 ? " warn" : "");

    if (labelBarFill) {
      labelBarFill.style.width = pct + "%";
      labelBarFill.className = "label-bar-fill" + (colorClass ? " " + colorClass : "");
    }

    label.classList.add("visible");

    if (popupOpen) updatePopup();
  }

  let debounceTimer;
  function debouncedUpdate() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(update, 300);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      update();
      new MutationObserver(debouncedUpdate).observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    });
  } else {
    update();
    new MutationObserver(debouncedUpdate).observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }
})();
