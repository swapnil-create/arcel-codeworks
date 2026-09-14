(() => {
  "use strict";

  const projects = [
    { id: "vault", name: "ARCEL Vault", detail: "Private intelligence workspace", chats: 8, updated: "Today" },
    { id: "launch", name: "Launch System", detail: "Website, narrative, and releases", chats: 4, updated: "Yesterday" },
    { id: "field", name: "Field Notes", detail: "Research and product signals", chats: 3, updated: "Friday" }
  ];

  const recentChats = [
    "Refine project onboarding",
    "Review sync architecture",
    "Compare launch narratives",
    "Prepare release notes"
  ];

  const models = [
    { id: "claude", name: "Claude", maker: "Anthropic", selected: true },
    { id: "gpt", name: "GPT", maker: "OpenAI", selected: true },
    { id: "gemini", name: "Gemini", maker: "Google", selected: false }
  ];

  const state = {
    view: "home",
    mode: "Chat",
    currentModel: "Auto · Standard",
    activeProject: null,
    messages: [],
    busy: false,
    menu: null,
    selectedModels: new Set(models.filter(model => model.selected).map(model => model.id)),
    arenaResults: [],
    arenaBusy: false,
    arenaReveal: false
  };

  const app = document.querySelector("#app");
  const escapeHTML = value => String(value).replace(/[&<>'"]/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;"
  })[character]);

  const paths = {
    plus: '<path d="M12 5v14M5 12h14"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    chat: '<path d="M5 18.5A8 8 0 1 1 8.5 21L4 22l1-3.5Z"/>',
    folder: '<path d="M3 6h7l2 2h9v11H3z"/>',
    compare: '<rect x="3" y="5" width="7" height="14" rx="1"/><rect x="14" y="5" width="7" height="14" rx="1"/>',
    grid: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>',
    paperclip: '<path d="m20 11-8.7 8.7a6 6 0 0 1-8.5-8.5l9.5-9.5A4 4 0 0 1 18 7.4l-9.2 9.2a2 2 0 1 1-2.8-2.8l8.5-8.5"/>',
    arrow: '<path d="M5 12h14M14 7l5 5-5 5"/>',
    chevron: '<path d="m8 10 4 4 4-4"/>',
    more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    copy: '<rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
    refresh: '<path d="M20 7v5h-5M4 17v-5h5"/><path d="M6.1 8A7 7 0 0 1 18 6l2 6M18 16a7 7 0 0 1-12 2l-2-6"/>',
    vote: '<path d="M7 10v11H3V10h4Zm0 9h10a2 2 0 0 0 2-1.6l1-5A2 2 0 0 0 18 10h-5l1-4a2 2 0 0 0-2-2l-5 6"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>'
  };
  const icon = name => `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
  const ledGlyphs = {
    " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
    C: ["01110", "10000", "10000", "10000", "10000", "10000", "01110"],
    O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
    D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
    E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
    W: ["10001", "10001", "10001", "10101", "10101", "11011", "10001"],
    R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
    K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
    S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"]
  };

  function ledBoard() {
    const characters = " CODEWORKS";
    return `<span class="led-board" role="img" aria-label="Codeworks LED board">${[...characters].map(character => `<span class="led-glyph">${ledGlyphs[character].join("").split("").map(value => value === "1" ? '<img src="./assets/arcel-led-dot-green.svg" alt="">' : '<i></i>').join("")}</span>`).join("")}</span>`;
  }

  function sidebar() {
    return `<aside class="sidebar" aria-label="Navigation">
      <div class="brand">
        <img class="brand-logo" src="./assets/arcel-logo-figma.svg" alt="ARCEL">
        <span class="brand-divider" aria-hidden="true"></span>
        ${ledBoard()}
      </div>
      <button class="new-chat" data-action="new-chat">${icon("plus")}<span>New chat</span><kbd>⌘ K</kbd></button>
      <nav class="primary-nav">
        <button data-action="search">${icon("search")}<span>Search</span></button>
        <button class="${state.view === "projects" ? "active" : ""}" data-action="projects">${icon("folder")}<span>Projects</span></button>
        <button class="${state.view === "arena" ? "active" : ""}" data-action="arena">${icon("compare")}<span>Compare</span><b>Beta</b></button>
      </nav>
      <section class="sidebar-section">
        <p>Recent</p>
        ${recentChats.map(title => `<button data-action="open-chat" data-title="${escapeHTML(title)}"><span>${escapeHTML(title)}</span><i>${icon("more")}</i></button>`).join("")}
      </section>
      <section class="sidebar-section projects-shortcut">
        <p>Projects</p>
        ${projects.slice(0, 2).map(project => `<button data-action="open-project" data-project="${project.id}">${icon("folder")}<span>${escapeHTML(project.name)}</span></button>`).join("")}
      </section>
      <div class="account"><span>SM</span><div><strong>Swapnil</strong><small>ARCEL</small></div><button data-action="account">${icon("more")}</button></div>
    </aside>`;
  }

  function header() {
    const title = state.view === "arena" ? "Compare" : state.view === "projects" ? "Projects" : state.activeProject ? projects.find(project => project.id === state.activeProject)?.name : state.currentModel;
    return `<header class="topbar">
      <button class="mobile-menu" data-action="mobile-menu">${icon("grid")}</button>
      <button class="model-button" data-action="model-menu"><span>${escapeHTML(title)}</span>${state.view === "home" || state.view === "chat" ? icon("chevron") : ""}</button>
      <div class="top-actions"><button data-action="share">Share</button><button class="user-button" data-action="account">SM</button></div>
    </header>`;
  }

  function modeSelector() {
    return `<div class="mode-selector" role="group" aria-label="Response mode">
      ${["Chat", "Code"].map(mode => `<button class="${state.mode === mode ? "active" : ""}" data-action="mode" data-mode="${mode}">${mode}</button>`).join("")}
      <button disabled title="Real retrieval and citations are not connected yet">Research · soon</button>
    </div>`;
  }

  function composer({ compact = false, id = "main-prompt" } = {}) {
    return `<section class="composer ${compact ? "compact" : ""}">
      <textarea id="${id}" placeholder="Message ARCEL…" aria-label="Message ARCEL" ${state.busy ? "disabled" : ""}></textarea>
      <div class="composer-bar">
        <div><button class="icon-button" data-action="attach" aria-label="Attach files">${icon("paperclip")}</button>${modeSelector()}</div>
        <button class="send" data-action="send" data-input="${id}" aria-label="Send message" ${state.busy ? "disabled" : ""}>${state.busy ? '<span class="stop-square"></span>' : icon("arrow")}</button>
      </div>
    </section>`;
  }

  function homeView() {
    return `<main class="home-view">
      <div class="welcome">
        <img src="./assets/arcel-logo-figma.svg" alt="ARCEL" class="welcome-logo">
        <h1>What are we working on?</h1>
        <p>Build, research, review, or compare—start with a prompt.</p>
        ${composer()}
        <div class="suggestions">
          <button data-action="suggest" data-prompt="Build a clean onboarding flow for this product">Build a feature</button>
          <button disabled title="Real retrieval and citations are not connected yet">Research · soon</button>
          <button data-action="suggest" data-prompt="Review this code and identify the highest-risk issues">Review code</button>
          <button data-action="arena">Compare models</button>
        </div>
      </div>
    </main>`;
  }

  function chatView() {
    return `<main class="chat-view">
      <div class="thread">
        ${state.messages.map((message, index) => message.role === "user" ? userMessage(message) : assistantMessage(message, index)).join("")}
        ${state.busy ? thinkingMessage() : ""}
      </div>
      <div class="chat-composer">${composer({ compact: true, id: "chat-prompt" })}<p>ARCEL can make mistakes. Review important work.</p></div>
    </main>`;
  }

  function userMessage(message) {
    return `<article class="message user-message"><div>${escapeHTML(message.content)}</div></article>`;
  }

  function assistantMessage(message) {
    const sources = message.sources ? `<div class="source-list">${message.sources.map((source, index) => `<button><b>${index + 1}</b><span>${escapeHTML(source)}</span></button>`).join("")}</div>` : "";
    return `<article class="message assistant-message">
      <div class="assistant-mark"><img src="./assets/arcel-intelligence-hexagon.svg" alt=""></div>
      <div class="message-body"><p>${message.content}</p>${sources}<div class="message-actions"><button aria-label="Copy">${icon("copy")}</button><button aria-label="Try again">${icon("refresh")}</button></div></div>
    </article>`;
  }

  function thinkingMessage() {
    return `<article class="message assistant-message thinking"><div class="assistant-mark"><img src="./assets/arcel-intelligence-hexagon.svg" alt=""></div><div><span></span><span></span><span></span></div></article>`;
  }

  function projectsView() {
    return `<main class="library-view">
      <div class="library-head"><div><h1>Projects</h1><p>Keep related chats and files together.</p></div><button class="primary-button" data-action="new-project">${icon("plus")} New project</button></div>
      <label class="library-search">${icon("search")}<input data-project-search placeholder="Search projects"></label>
      <div class="project-list">
        ${projects.map(project => `<button class="project-card" data-action="open-project" data-project="${project.id}"><span class="folder-mark">${icon("folder")}</span><span><strong>${escapeHTML(project.name)}</strong><small>${escapeHTML(project.detail)}</small></span><span class="project-meta"><b>${project.chats} chats</b><small>${project.updated}</small></span>${icon("arrow")}</button>`).join("")}
      </div>
    </main>`;
  }

  function projectView() {
    const project = projects.find(item => item.id === state.activeProject);
    return `<main class="project-view">
      <div class="project-heading"><button data-action="projects">Projects</button><span>/</span><strong>${escapeHTML(project.name)}</strong></div>
      <section class="project-welcome"><span class="folder-mark large">${icon("folder")}</span><h1>${escapeHTML(project.name)}</h1><p>${escapeHTML(project.detail)}</p></section>
      <div class="project-recents"><p>Recent chats</p>${recentChats.slice(0, 3).map(title => `<button data-action="open-chat" data-title="${escapeHTML(title)}"><span>${icon("chat")}${escapeHTML(title)}</span><small>Updated recently</small></button>`).join("")}</div>
      <div class="project-composer">${composer({ id: "project-prompt" })}</div>
    </main>`;
  }

  function arenaView() {
    const selected = models.filter(model => state.selectedModels.has(model.id));
    return `<main class="arena-view">
      <div class="arena-heading"><div><span>Compare</span><h1>One prompt. Multiple perspectives.</h1><p>Run the same task across selected models, judge the strongest answer, or combine them.</p></div><button class="models-button" data-action="models">Models <b>${selected.length}</b>${icon("chevron")}</button></div>
      <section class="arena-prompt">
        <label for="arena-input">Your prompt</label>
        <textarea id="arena-input" placeholder="Ask every selected model the same question…"></textarea>
        <div><button class="primary-button" data-action="run-arena" ${state.arenaBusy ? "disabled" : ""}>${state.arenaBusy ? "Comparing…" : "Compare models"}${icon("arrow")}</button></div>
        <p class="feature-note">Choose a response manually. Evidence-based judging and synthesis are unavailable until runs, citations, and evaluation records are implemented.</p>
      </section>
      ${state.menu === "models" ? modelMenu() : ""}
      <section class="arena-grid">
        ${state.arenaResults.length ? state.arenaResults.map((result, index) => arenaCard(result, index)).join("") : emptyArena(selected)}
      </section>
    </main>`;
  }

  function emptyArena(selected) {
    return selected.map((model, index) => `<div class="arena-empty"><span>${String.fromCharCode(65 + index)}</span><p>${state.arenaReveal ? escapeHTML(model.name) : "Model hidden"}</p><small>Response will appear here</small></div>`).join("");
  }

  function arenaCard(result, index) {
    return `<article class="arena-card ${result.winner ? "winner" : ""}"><header><span>Response ${String.fromCharCode(65 + index)}</span><strong>${state.arenaReveal ? escapeHTML(result.model) : "Model hidden"}</strong>${result.winner ? "<b>Best answer</b>" : ""}</header><div><p>${escapeHTML(result.content)}</p></div><footer><span>${result.time}s</span><button data-action="vote-result" data-index="${index}">${icon("vote")} Choose</button></footer></article>`;
  }

  function modelMenu() {
    return `<div class="model-menu"><div><strong>Select models</strong><button data-action="close-menu">${icon("close")}</button></div>${models.map(model => `<button class="${state.selectedModels.has(model.id) ? "selected" : ""}" data-action="toggle-model" data-model="${model.id}"><span>${state.selectedModels.has(model.id) ? icon("check") : ""}</span><div><strong>${escapeHTML(model.name)}</strong><small>${escapeHTML(model.maker)}</small></div></button>`).join("")}</div>`;
  }

  function overlays() {
    if (state.menu !== "search" && state.menu !== "mobile") return "";
    if (state.menu === "mobile") return `<div class="mobile-overlay">${sidebar()}<button data-action="close-menu">${icon("close")}</button></div>`;
    return `<div class="search-overlay" data-action="close-menu"><section onclick="event.stopPropagation()"><label>${icon("search")}<input autofocus placeholder="Search chats and projects…"><kbd>Esc</kbd></label><p>Recent</p>${recentChats.map(title => `<button data-action="open-chat" data-title="${escapeHTML(title)}">${icon("chat")}<span>${escapeHTML(title)}</span></button>`).join("")}</section></div>`;
  }

  function modelSwitcher() {
    if (state.menu !== "model-switcher") return "";
    return `<div class="model-switcher">
      <p>Choose model</p>
      ${[
        { name: "Auto · Quick", tier: "fast", detail: "Prioritizes speed" },
        { name: "Auto · Standard", tier: "balanced", detail: "Balanced for everyday work" },
        { name: "Auto · Deep", tier: "deep", detail: "More time for complex work" }
      ].map(model => `<button class="${state.currentModel === model.name ? "active" : ""}" data-action="select-primary-model" data-model="${model.name}" data-tier="${model.tier}"><span><strong>${model.name}</strong><small>${model.detail}</small></span>${state.currentModel === model.name ? icon("check") : ""}</button>`).join("")}
    </div>`;
  }

  function render() {
    let content = homeView();
    if (state.view === "chat") content = chatView();
    if (state.view === "projects") content = projectsView();
    if (state.view === "project") content = projectView();
    if (state.view === "arena") content = arenaView();
    app.innerHTML = `<div class="app-shell">${sidebar()}<section class="workspace">${header()}${content}${modelSwitcher()}</section></div>${overlays()}`;
  }

  function tierForCurrentModel() {
    if (state.currentModel.endsWith("Quick")) return "fast";
    if (state.currentModel.endsWith("Deep")) return "deep";
    return "balanced";
  }

  async function requestCompletion({ messages, mode = "Chat", tier = "balanced", model = "arcel" }) {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, mode, tier, model })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "The model could not complete this request.");
    return payload;
  }

  async function startChat(prompt) {
    const value = prompt.trim();
    if (!value) return;
    state.view = "chat";
    state.messages.push({ role: "user", content: value });
    state.busy = true;
    render();
    try {
      const completion = await requestCompletion({
        messages: state.messages,
        mode: state.mode,
        tier: tierForCurrentModel()
      });
      state.messages.push({ role: "assistant", content: completion.content });
    } catch (error) {
      state.messages.push({ role: "assistant", content: `Unable to complete that request: ${error.message}` });
    } finally {
      state.busy = false;
      render();
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    }
  }

  async function runArena() {
    const input = document.querySelector("#arena-input");
    const prompt = input?.value.trim();
    if (!prompt || !state.selectedModels.size) return;
    state.arenaBusy = true;
    state.arenaResults = [];
    state.arenaReveal = false;
    render();
    try {
      const selected = models.filter(model => state.selectedModels.has(model.id));
      const results = await Promise.all(selected.map(async model => {
        const startedAt = performance.now();
        try {
          const completion = await requestCompletion({
            messages: [{ role: "user", content: prompt }],
            tier: "balanced",
            model: model.id
          });
          return { model: model.name, content: completion.content, time: ((performance.now() - startedAt) / 1000).toFixed(1), winner: false };
        } catch (error) {
          return { model: model.name, content: `This model could not respond: ${error.message}`, time: ((performance.now() - startedAt) / 1000).toFixed(1), winner: false };
        }
      }));
      state.arenaResults = results;
    } finally {
      state.arenaBusy = false;
      render();
    }
  }

  app.addEventListener("click", event => {
    const target = event.target.closest("[data-action]");
    if (!target) return;
    const { action } = target.dataset;
    if (action === "new-chat") { state.view = "home"; state.activeProject = null; state.messages = []; }
    if (action === "projects") state.view = "projects";
    if (action === "arena") { state.view = "arena"; state.menu = null; }
    if (action === "open-project") { state.activeProject = target.dataset.project; state.view = "project"; }
    if (action === "open-chat") { state.messages = [{ role: "user", content: target.dataset.title }, { role: "assistant", content: "This conversation is ready to continue." }]; state.view = "chat"; }
    if (action === "mode") state.mode = target.dataset.mode;
    if (action === "suggest") { startChat(target.dataset.prompt); return; }
    if (action === "send") { const input = document.querySelector(`#${target.dataset.input}`); startChat(input?.value || ""); return; }
    if (action === "search") state.menu = "search";
    if (action === "model-menu") state.menu = state.menu === "model-switcher" ? null : "model-switcher";
    if (action === "select-primary-model") { state.currentModel = target.dataset.model; state.menu = null; }
    if (action === "mobile-menu") state.menu = "mobile";
    if (action === "models") state.menu = state.menu === "models" ? null : "models";
    if (action === "close-menu") state.menu = null;
    if (action === "toggle-model") state.selectedModels.has(target.dataset.model) ? state.selectedModels.delete(target.dataset.model) : state.selectedModels.add(target.dataset.model);
    if (action === "run-arena") { runArena(); return; }
    if (action === "vote-result") { state.arenaResults.forEach((result, index) => result.winner = index === Number(target.dataset.index)); state.arenaReveal = true; }
    render();
  });

  window.addEventListener("keydown", event => {
    if (event.key === "Escape" && state.menu) { state.menu = null; render(); }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); state.view = "home"; state.messages = []; render(); }
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      const input = document.activeElement;
      if (input?.tagName === "TEXTAREA") input.id === "arena-input" ? runArena() : startChat(input.value);
    }
  });

  render();
})();
