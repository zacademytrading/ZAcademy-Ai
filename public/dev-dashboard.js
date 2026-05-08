/**
 * ZENIX Real Developer Dashboard
 * Single-file self-contained script for mobile & desktop debugging.
 * Activate via URL: ?dev=zenix_debug or Keyboard: Ctrl+Shift+D
 */

(function () {
  // --- CONFIGURATION ---
  const CONFIG = {
    triggerQuery: "dev=zenix_debug",
    triggerKey: { ctrl: true, shift: true, key: "D" },
    maxLogs: 100,
    maxNetworkLogs: 50,
  };

  // --- STATE ---
  const state = {
    isActive: false,
    isExpanded: false,
    logs: { errors: [], network: [], history: [] },
    fps: 0,
    fpsFrames: 0,
    fpsLastTime: performance.now(),
    drag: { isDragging: false, startY: 0, startTop: 100 },
  };

  // --- INITIALIZATION CHECK ---
  function checkActivation() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has("dev") && urlParams.get("dev") === "zenix_debug") {
      activateDashboard();
    }
  }

  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey === CONFIG.triggerKey.ctrl && e.shiftKey === CONFIG.triggerKey.shift && e.key.toUpperCase() === CONFIG.triggerKey.key) {
      e.preventDefault();
      activateDashboard();
    }
  });

  function activateDashboard() {
    if (state.isActive) return;
    state.isActive = true;
    injectCSS();
    createUI();
    startObservers();
    requestAnimationFrame(measureFPS);
  }

  // --- OBSERVERS & MONKEY PATCHES ---
  function startObservers() {
    // 1. Errors & Promise Rejections
    const originalOnError = window.onerror;
    window.onerror = function (msg, url, line, col, error) {
      logError("WindowError", msg, \`\${url}:\${line}:\${col}\`);
      if (originalOnError) return originalOnError.apply(this, arguments);
      return false;
    };

    const originalOnUnhandled = window.onunhandledrejection;
    window.addEventListener("unhandledrejection", (event) => {
      logError("PromiseRejection", event.reason?.message || event.reason || "Unknown", event.reason?.stack || "");
      if (originalOnUnhandled) return originalOnUnhandled.apply(this, arguments);
    });

    const originalConsoleError = console.error;
    console.error = function (...args) {
      logError("ConsoleError", args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(" "), "");
      originalConsoleError.apply(console, args);
    };

    // 2. Network (Fetch Monkey Patch)
    const originalFetch = window.fetch;
    window.fetch = async function (...args) {
      const startTime = performance.now();
      const url = typeof args[0] === 'string' ? args[0] : (args[0]?.url || 'unknown');
      const method = args[1]?.method || 'GET';
      
      try {
        const response = await originalFetch.apply(this, args);
        const clone = response.clone();
        const duration = Math.round(performance.now() - startTime);
        
        clone.text().then(text => {
          logNetwork(method, url, response.status, duration, text.substring(0, 200) + (text.length > 200 ? '...' : ''));
        }).catch(() => {
          logNetwork(method, url, response.status, duration, "Binary/Non-text response");
        });
        
        return response;
      } catch (err) {
        const duration = Math.round(performance.now() - startTime);
        logNetwork(method, url, "ERROR", duration, err.message);
        throw err;
      }
    };

    // 3. Navigation History (PushState/ReplaceState/PopState)
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = function (...args) {
      logHistory("pushState", args[2] || window.location.href);
      return originalPushState.apply(this, args);
    };
    
    history.replaceState = function (...args) {
      logHistory("replaceState", args[2] || window.location.href);
      return originalReplaceState.apply(this, args);
    };

    window.addEventListener("popstate", (e) => {
      logHistory("popstate (Back/Forward)", window.location.href);
    });

    // Initial load history
    logHistory("initialLoad", window.location.href);
  }

  // --- LOGGERS ---
  function logError(type, message, stack) {
    state.logs.errors.unshift({ time: new Date().toLocaleTimeString(), type, message, stack });
    if (state.logs.errors.length > CONFIG.maxLogs) state.logs.errors.pop();
    updateUI("errors");
  }

  function logNetwork(method, url, status, duration, response) {
    state.logs.network.unshift({ time: new Date().toLocaleTimeString(), method, url, status, duration, response });
    if (state.logs.network.length > CONFIG.maxNetworkLogs) state.logs.network.pop();
    updateUI("network");
  }

  function logHistory(action, url) {
    state.logs.history.unshift({ time: new Date().toLocaleTimeString(), action, url });
    if (state.logs.history.length > 50) state.logs.history.pop();
    updateUI("history");
  }

  function measureFPS(now) {
    state.fpsFrames++;
    if (now - state.fpsLastTime >= 1000) {
      state.fps = state.fpsFrames;
      state.fpsFrames = 0;
      state.fpsLastTime = now;
      updateUI("perf");
    }
    requestAnimationFrame(measureFPS);
  }

  // --- UI CREATION ---
  function injectCSS() {
    const style = document.createElement("style");
    style.textContent = \`
      #zenix-dev-board {
        position: fixed;
        right: 10px;
        top: 50px;
        width: 320px;
        max-width: calc(100vw - 20px);
        background: rgba(15, 15, 15, 0.95);
        border: 1px solid #7c3aed;
        border-radius: 12px;
        color: #fff;
        font-family: monospace;
        z-index: 999999;
        box-shadow: 0 10px 25px rgba(0,0,0,0.5);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        transition: height 0.3s, transform 0.3s;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        pointer-events: auto;
      }
      #zenix-dev-board.collapsed {
        height: 44px !important;
        width: 140px;
        cursor: pointer;
      }
      #zenix-dev-board.collapsed .zdb-content { display: none; }
      
      .zdb-header {
        height: 44px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 15px;
        background: #7c3aed;
        font-weight: bold;
        font-size: 14px;
        cursor: move;
        touch-action: none; /* For dragging */
      }
      
      .zdb-header button {
        background: transparent;
        border: none;
        color: white;
        font-size: 18px;
        line-height: 1;
        cursor: pointer;
        padding: 5px;
        min-width: 44px;
        min-height: 44px;
        touch-action: manipulation;
      }

      .zdb-content {
        flex: 1;
        overflow-y: auto;
        padding: 10px;
        font-size: 12px;
        height: 400px;
        max-height: 60vh;
        overscroll-behavior: contain;
      }

      .zdb-tabs { display: flex; gap: 5px; margin-bottom: 10px; overflow-x: auto; padding-bottom: 5px; }
      .zdb-tab {
        background: #27272a; border: 1px solid #3f3f46; color: #a1a1aa;
        padding: 5px 10px; border-radius: 4px; cursor: pointer;
        min-height: 36px; white-space: nowrap; touch-action: manipulation;
      }
      .zdb-tab.active { background: #7c3aed; color: #fff; border-color: #a78bfa; }

      .zdb-panel { display: none; }
      .zdb-panel.active { display: block; }

      .zdb-log-item { background: #18181b; padding: 8px; margin-bottom: 8px; border-radius: 4px; border-left: 3px solid #52525b; word-break: break-all; }
      .zdb-log-item.error { border-left-color: #ef4444; }
      .zdb-log-item.network-err { border-left-color: #f59e0b; }
      .zdb-time { color: #a1a1aa; font-size: 10px; margin-bottom: 4px; }
      .zdb-stack { color: #f87171; font-size: 10px; margin-top: 4px; white-space: pre-wrap; }

      .zdb-btn {
        background: #3f3f46; border: none; color: white; padding: 8px 12px;
        border-radius: 6px; margin: 4px 0; width: 100%; cursor: pointer;
        min-height: 44px; touch-action: manipulation;
      }
      .zdb-btn.danger { background: #991b1b; }
      .zdb-btn:active { background: #7c3aed; }
      
      /* Utilities */
      .text-xs { font-size: 10px; }
      .text-green { color: #4ade80; }
      .mb-2 { margin-bottom: 8px; }
    \`;
    document.head.appendChild(style);
  }

  function createUI() {
    const board = document.createElement("div");
    board.id = "zenix-dev-board";
    board.className = "collapsed";
    
    board.innerHTML = \`
      <div class="zdb-header" id="zdb-drag-handle">
        <span id="zdb-title">⚙️ Dev ZENIX</span>
        <button id="zdb-toggle-btn">▼</button>
      </div>
      <div class="zdb-content">
        <div class="zdb-tabs">
          <button class="zdb-tab active" data-target="panel-errors">Err</button>
          <button class="zdb-tab" data-target="panel-network">Net</button>
          <button class="zdb-tab" data-target="panel-perf">Perf</button>
          <button class="zdb-tab" data-target="panel-history">Hist</button>
          <button class="zdb-tab" data-target="panel-actions">Acts</button>
        </div>

        <div id="panel-errors" class="zdb-panel active"></div>
        <div id="panel-network" class="zdb-panel"></div>
        
        <div id="panel-perf" class="zdb-panel">
          <div class="zdb-log-item">
            <div class="mb-2">FPS: <span id="zdb-fps" class="text-green">0</span></div>
            <div class="mb-2">Memory: <span id="zdb-mem">N/A</span></div>
            <div>Uptime: <span id="zdb-uptime">0</span>s</div>
          </div>
          <div class="zdb-log-item">
            <strong>Local Storage</strong>
            <pre id="zdb-ls" class="text-xs mt-2" style="max-height: 100px; overflow: auto;"></pre>
          </div>
        </div>

        <div id="panel-history" class="zdb-panel"></div>

        <div id="panel-actions" class="zdb-panel">
          <button class="zdb-btn" id="btn-back">⬅ Force History Back</button>
          <button class="zdb-btn" id="btn-clear-ls">Clear LocalStorage</button>
          <button class="zdb-btn danger" id="btn-throw">Throw Test Error</button>
          <button class="zdb-btn" id="btn-reload">Hard Reload</button>
        </div>
      </div>
    \`;

    document.body.appendChild(board);
    bindEvents(board);
  }

  function bindEvents(board) {
    const header = document.getElementById("zdb-drag-handle");
    const toggleBtn = document.getElementById("zdb-toggle-btn");
    const title = document.getElementById("zdb-title");

    // Toggle Collapse
    const togglePanel = (e) => {
      e.stopPropagation();
      state.isExpanded = !state.isExpanded;
      board.className = state.isExpanded ? "" : "collapsed";
      toggleBtn.innerText = state.isExpanded ? "▲" : "▼";
      title.innerText = state.isExpanded ? "⚙️ ZENIX Dev Dashboard" : "⚙️ Dev ZENIX";
      if (state.isExpanded) updateUI("all");
    };

    toggleBtn.addEventListener("click", togglePanel);
    title.addEventListener("click", togglePanel); // Easy touch on mobile

    // Tabs
    document.querySelectorAll(".zdb-tab").forEach(tab => {
      tab.addEventListener("click", (e) => {
        document.querySelectorAll(".zdb-tab").forEach(t => t.classList.remove("active"));
        document.querySelectorAll(".zdb-panel").forEach(p => p.classList.remove("active"));
        e.target.classList.add("active");
        document.getElementById(e.target.dataset.target).classList.add("active");
      });
    });

    // Actions
    document.getElementById("btn-back").addEventListener("click", () => window.history.back());
    document.getElementById("btn-clear-ls").addEventListener("click", () => { localStorage.clear(); alert("LocalStorage Cleared!"); });
    document.getElementById("btn-throw").addEventListener("click", () => { throw new Error("Test Error from Zenix Dev Dashboard"); });
    document.getElementById("btn-reload").addEventListener("click", () => window.location.reload(true));

    // Dragging Logic (Y-axis only to prevent mobile side-swipe issues)
    header.addEventListener("touchstart", dragStart, { passive: false });
    header.addEventListener("touchmove", drag, { passive: false });
    header.addEventListener("touchend", dragEnd);
    header.addEventListener("mousedown", dragStart);
    document.addEventListener("mousemove", drag);
    document.addEventListener("mouseup", dragEnd);

    function dragStart(e) {
      if (e.target === toggleBtn || e.target === title && state.isExpanded === false) return;
      state.drag.isDragging = true;
      state.drag.startY = e.type === "touchstart" ? e.touches[0].clientY : e.clientY;
      state.drag.startTop = parseInt(window.getComputedStyle(board).top, 10);
    }

    function drag(e) {
      if (!state.drag.isDragging) return;
      e.preventDefault();
      const y = e.type === "touchmove" ? e.touches[0].clientY : e.clientY;
      const dy = y - state.drag.startY;
      let newTop = state.drag.startTop + dy;
      if (newTop < 0) newTop = 0;
      if (newTop > window.innerHeight - 50) newTop = window.innerHeight - 50;
      board.style.top = newTop + "px";
    }

    function dragEnd() {
      state.drag.isDragging = false;
    }
  }

  // --- UI UPDATER ---
  function updateUI(target) {
    if (!state.isActive || !state.isExpanded) return;

    if (target === "errors" || target === "all") {
      const panel = document.getElementById("panel-errors");
      panel.innerHTML = state.logs.errors.length ? state.logs.errors.map(err => \`
        <div class="zdb-log-item error">
          <div class="zdb-time">\${err.time} | \${err.type}</div>
          <strong>\${err.message}</strong>
          <div class="zdb-stack">\${err.stack}</div>
        </div>
      \`).join("") : "<div class='text-xs text-green'>No errors caught. You are good!</div>";
    }

    if (target === "network" || target === "all") {
      const panel = document.getElementById("panel-network");
      panel.innerHTML = state.logs.network.length ? state.logs.network.map(net => \`
        <div class="zdb-log-item \${net.status >= 400 || net.status === 'ERROR' ? 'network-err' : ''}">
          <div class="zdb-time">\${net.time} | \${net.duration}ms</div>
          <strong>[\${net.status}] \${net.method}</strong> \${net.url.split('?')[0].substring(0, 40)}...
          <div class="text-xs mt-2" style="color:#a1a1aa">\${net.response}</div>
        </div>
      \`).join("") : "<div class='text-xs'>No network activity yet.</div>";
    }

    if (target === "history" || target === "all") {
      const panel = document.getElementById("panel-history");
      panel.innerHTML = state.logs.history.length ? state.logs.history.map(h => \`
        <div class="zdb-log-item">
          <div class="zdb-time">\${h.time} | \${h.action}</div>
          <div class="text-xs">\${h.url.replace(window.location.origin, '')}</div>
        </div>
      \`).join("") : "<div class='text-xs'>No history yet.</div>";
    }

    if (target === "perf" || target === "all") {
      document.getElementById("zdb-fps").innerText = state.fps;
      document.getElementById("zdb-uptime").innerText = Math.round(performance.now() / 1000);
      
      if (performance.memory) {
        const memMB = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
        const limitMB = Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024);
        document.getElementById("zdb-mem").innerText = \`\${memMB}MB / \${limitMB}MB\`;
      }
      
      try {
        const ls = { ...localStorage };
        document.getElementById("zdb-ls").innerText = JSON.stringify(ls, null, 2);
      } catch(e) {
        document.getElementById("zdb-ls").innerText = "Storage Access Denied";
      }
    }
  }

  // --- BOOTSTRAP ---
  checkActivation();

})();
