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

  const effortTiers = [
    { name: "Auto · Quick", tier: "fast", detail: "Prioritizes speed" },
    { name: "Auto · Standard", tier: "balanced", detail: "Balanced for everyday work" },
    { name: "Auto · Deep", tier: "deep", detail: "More time for complex work" }
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
    arenaReveal: false,
    generationError: null,
    arenaError: null,
    auth: { configured: false, providers: [], user: null },
    drafts: { "main-prompt": "", "chat-prompt": "", "project-prompt": "", "arena-input": "" },
    paletteQuery: "",
    paletteIndex: 0,
    projectQuery: "",
    toasts: [],
    threadNote: null
  };

  const app = document.querySelector("#app");
  let toastTimer = 0;
  let lastMenu = null;

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

  function classifyFailure(input) {
    if (globalThis.ArcelGenerationErrors?.classifyGenerationFailure) {
      return globalThis.ArcelGenerationErrors.classifyGenerationFailure(input);
    }
    return {
      code: input.code || "UNKNOWN",
      title: "Request failed",
      message: input.error || "The model could not complete this request.",
      state: "failed",
      taxonomy: "provider_unavailable",
      retryable: true,
      request_id: input.request_id || null,
      ctas: globalThis.ArcelGenerationErrors?.GATE_CTAS || [
        { action: "sign-in", label: "Sign in" },
        { action: "open-settings", label: "Open settings" },
        { action: "view-existing-work", label: "View existing work" }
      ]
    };
  }

  function bannerActions(error) {
    const ctas = Array.isArray(error.ctas) && error.ctas.length ? error.ctas : [
      { action: "sign-in", label: "Sign in" },
      { action: "open-settings", label: "Open settings" },
      { action: "view-existing-work", label: "View existing work" }
    ];
    return `<div class="run-banner-actions">${ctas.map((cta, index) => `<button type="button" class="${index === 0 ? "primary-button" : "ghost-button"}" data-action="${escapeHTML(cta.action)}">${escapeHTML(cta.label)}</button>`).join("")}</div>`;
  }

  function runBanner(error) {
    if (!error) return "";
    const retry = error.retryable ? "Safe to retry." : "Retrying will not bypass this gate.";
    const request = error.request_id ? `<small>Request ${escapeHTML(error.request_id)}</small>` : "";
    return `<aside class="run-banner" role="alert" data-state="${escapeHTML(error.state)}" data-error-code="${escapeHTML(error.code)}" data-taxonomy="${escapeHTML(error.taxonomy)}">
      <strong>${escapeHTML(error.title)}</strong>
      <p>${escapeHTML(error.message)}</p>
      ${request}
      <small>${retry} This is not an assistant message.</small>
      ${bannerActions(error)}
    </aside>`;
  }

  function initials(user) {
    const source = String(user?.name || user?.email || user?.sub || "?").trim();
    const parts = source.split(/[\s@._:-]+/).filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return source.slice(0, 2).toUpperCase() || "?";
  }

  function providerLabel(id) {
    const match = (state.auth.providers || []).find(provider => provider.id === id);
    if (match) return match.label;
    if (id === "github") return "GitHub";
    if (id === "google") return "Google";
    return id || "Signed in";
  }

  function pushToast(message, tone = "info") {
    const id = Date.now() + Math.random();
    state.toasts = [{ id, message, tone }, ...state.toasts].slice(0, 3);
    render();
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      state.toasts = [];
      render();
    }, 3600);
  }

  function toastRegion() {
    if (!state.toasts.length) return "";
    return `<div class="toast-region" role="status" aria-live="polite">${state.toasts.map(toast => `<div class="toast" data-tone="${escapeHTML(toast.tone)}"><p>${escapeHTML(toast.message)}</p><button type="button" class="btn-icon" data-action="dismiss-toast" data-toast="${toast.id}" aria-label="Dismiss">${icon("close")}</button></div>`).join("")}</div>`;
  }

  function settingsOverlay() {
    const user = state.auth.user;
    const providers = state.auth.providers || [];
    let body;
    if (user) {
      body = `<p>Signed in as <strong>${escapeHTML(user.name || user.email || user.sub)}</strong> via ${escapeHTML(providerLabel(user.provider))}.</p>
        <div class="auth-actions"><button type="button" class="ghost-button" data-action="sign-out">Sign out</button></div>
        <p class="feature-note">Sign-out clears the session cookie. It does not delete chats — this prototype still has no durable store.</p>`;
    } else if (state.auth.configured && providers.length) {
      body = `<p>Sign in to generate. The server derives your identity from a signed session cookie, not from a name typed in the UI.</p>
        <div class="auth-actions">${providers.map(provider => `<a class="primary-button" href="/api/auth/login?provider=${escapeHTML(provider.id)}">Sign in with ${escapeHTML(provider.label)}</a>`).join("")}</div>
        <p class="feature-note">Opening settings does not fake a session or spend a provider key.</p>`;
    } else {
      body = `<p>Sign-in is not configured on this deployment. Set <code>AUTH_SECRET</code> and a GitHub or Google OAuth app on Vercel (see AUTH.md).</p>
        <p class="feature-note">This screen cannot invent credentials. Generation stays blocked with AUTH_REQUIRED until a real session exists.</p>`;
    }
    return `<div class="sheet-overlay" data-action="close-menu"><section data-dialog onclick="event.stopPropagation()" role="dialog" aria-labelledby="settings-title" aria-modal="true">
      <header><h2 id="settings-title">Settings</h2><button type="button" class="btn-icon" data-action="close-menu" aria-label="Close">${icon("close")}</button></header>
      <div class="sheet-section sheet-lead">
        <h3>Account</h3>
        ${body}
      </div>
      <div class="sheet-section">
        <h3>Preferences</h3>
        <p>Instructions, tone, language, timezone, theme, and Enter-to-send are not connected yet. Nothing here is saved.</p>
      </div>
      <div class="sheet-section">
        <h3>Generation</h3>
        <p class="feature-note feature-note-flush">Research, uploads, billing, and durable history are unavailable. Auth and API failures appear as banners, not assistant messages.</p>
      </div>
    </section></div>`;
  }

  function generationGateNote() {
    if (state.auth.user) {
      return `<p class="generation-gate">Signed in. Generation still needs a server-side OpenRouter key. Failures appear as banners, not as answers.</p>`;
    }
    if (state.auth.configured) {
      return `<p class="generation-gate">Sign in to generate. Unauthenticated requests cannot spend the provider key. API and auth errors appear as banners, not as answers.</p>`;
    }
    return `<p class="generation-gate">Public generation stays off until a signed-in session exists. API and auth errors appear as banners, not as answers.</p>`;
  }

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
    return `<span class="led-board" role="img" aria-label="Codeworks LED board">${[...characters].map(character => `<span class="led-glyph">${ledGlyphs[character].join("").split("").map(value => value === "1" ? '<img src="./assets/arcel-led-dot-green.svg" width="14" height="12" alt="">' : '<i></i>').join("")}</span>`).join("")}</span>`;
  }

  function sidebar() {
    return `<aside class="sidebar" aria-label="Navigation">
      <div class="brand">
        <img class="brand-logo" src="./assets/arcel-logo-figma.svg" width="64" height="20" alt="ARCEL">
        <span class="brand-divider" aria-hidden="true"></span>
        ${ledBoard()}
      </div>
      <button class="new-chat" data-action="new-chat">${icon("plus")}<span>New chat</span><kbd>⌘ K</kbd></button>
      <nav class="primary-nav">
        <button data-action="search" aria-haspopup="dialog">${icon("search")}<span>Search</span><kbd>⌘/</kbd></button>
        <button class="${state.view === "projects" || state.view === "project" ? "active" : ""}" data-action="projects">${icon("folder")}<span>Projects</span></button>
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
      <div class="account${state.auth.user ? "" : " unsigned"}" data-action="open-settings">
        ${state.auth.user ? `<span>${escapeHTML(initials(state.auth.user))}</span>` : ""}
        <div>
          <strong>${state.auth.user ? escapeHTML(state.auth.user.name || state.auth.user.email || "Signed in") : "Sign in"}</strong>
          <small>${state.auth.user ? escapeHTML(providerLabel(state.auth.user.provider)) : (state.auth.configured ? "Required for generation" : "Not configured")}</small>
        </div>
        <button type="button" data-action="open-settings" aria-label="${state.auth.user ? "Account" : "Sign in"}">${icon("more")}</button>
      </div>
    </aside>`;
  }

  function header() {
    const canSwitchModel = state.view === "home" || state.view === "chat";
    const title = state.view === "arena" ? "Compare" : state.view === "projects" ? "Projects" : state.view === "project" ? projects.find(project => project.id === state.activeProject)?.name : state.currentModel;
    return `<header class="topbar">
      <button class="mobile-menu btn-icon" data-action="mobile-menu" aria-label="Open navigation">${icon("grid")}</button>
      <button class="model-button" type="button" ${canSwitchModel ? `data-action="model-menu" aria-haspopup="menu" aria-expanded="${state.menu === "model-switcher"}"` : ""}><span>${escapeHTML(title || "ARCEL")}</span>${canSwitchModel ? icon("chevron") : ""}</button>
      <div class="top-actions"><button type="button" class="ghost-button" data-action="share">Share</button><button class="user-button${state.auth.user ? "" : " unsigned"}" data-action="open-settings" aria-label="${state.auth.user ? "Account" : "Sign in"}">${state.auth.user ? escapeHTML(initials(state.auth.user)) : "Sign in"}</button></div>
    </header>`;
  }

  function modeSelector() {
    return `<div class="mode-selector" role="group" aria-label="Response mode">
      ${["Chat", "Code"].map(mode => `<button type="button" class="${state.mode === mode ? "active" : ""}" data-action="mode" data-mode="${mode}" aria-pressed="${state.mode === mode}">${mode}</button>`).join("")}
      <button type="button" disabled title="Real retrieval and citations are not connected yet">Research · soon</button>
    </div>`;
  }

  function composer({ compact = false, id = "main-prompt" } = {}) {
    const value = escapeHTML(state.drafts[id] || "");
    return `<section class="composer input-group ${compact ? "compact" : ""}">
      <textarea id="${id}" placeholder="Message ARCEL…" aria-label="Message ARCEL" ${state.busy ? "disabled" : ""}>${value}</textarea>
      <div class="composer-bar">
        <div><button type="button" class="icon-button btn-icon" data-action="attach" aria-label="Attach files">${icon("paperclip")}</button>${modeSelector()}</div>
        <button type="button" class="send${state.busy ? " is-loading" : ""}" data-action="send" data-input="${id}" aria-label="${state.busy ? "Generating" : "Send message"}" ${state.busy ? "disabled" : ""}>${state.busy ? '<span class="stop-square"></span>' : icon("arrow")}</button>
      </div>
    </section>`;
  }

  function homeView() {
    const dataState = state.generationError ? state.generationError.state : "empty";
    return `<main class="home-view" data-screen="home" data-state="${dataState}">
      <div class="welcome">
        <img src="./assets/arcel-logo-figma.svg" alt="ARCEL" class="welcome-logo" width="168" height="53">
        <h1>What are we working on?</h1>
        <p>Ask, write, or compare — start from the composer.</p>
        ${composer()}
        ${runBanner(state.generationError)}
        ${generationGateNote()}
        <div class="suggestions">
          <button type="button" data-action="suggest" data-prompt="Build a clean onboarding flow for this product">Build a feature</button>
          <button type="button" disabled title="Real retrieval and citations are not connected yet">Research · soon</button>
          <button type="button" data-action="suggest" data-prompt="Review this code and identify the highest-risk issues">Review code</button>
          <button type="button" data-action="arena">Compare models</button>
        </div>
      </div>
    </main>`;
  }

  function chatView() {
    const dataState = state.busy ? "loading" : state.generationError ? state.generationError.state : state.messages.length ? "completed" : "empty";
    return `<main class="chat-view" data-screen="chat" data-state="${dataState}">
      <div class="thread">
        ${state.messages.map((message, index) => message.role === "user" ? userMessage(message) : assistantMessage(message, index)).join("")}
        ${state.threadNote ? `<p class="feature-note">${escapeHTML(state.threadNote)}</p>` : ""}
        ${state.busy ? thinkingMessage() : ""}
        ${!state.busy ? runBanner(state.generationError) : ""}
      </div>
      <div class="chat-composer">${composer({ compact: true, id: "chat-prompt" })}${generationGateNote()}<p>ARCEL can make mistakes. Review important work.</p></div>
    </main>`;
  }

  function userMessage(message) {
    return `<article class="message user-message"><div>${escapeHTML(message.content)}</div></article>`;
  }

  function assistantMessage(message) {
    const sources = message.sources ? `<div class="source-list">${message.sources.map((source, index) => `<button type="button"><b>${index + 1}</b><span>${escapeHTML(source)}</span></button>`).join("")}</div>` : "";
    return `<article class="message assistant-message">
      <div class="assistant-mark"><img src="./assets/arcel-intelligence-hexagon.svg" width="18" height="16" alt=""></div>
      <div class="message-body"><p>${escapeHTML(message.content)}</p>${sources}<div class="message-actions"><button type="button" data-action="copy" aria-label="Copy">${icon("copy")}</button><button type="button" data-action="retry" aria-label="Try again">${icon("refresh")}</button></div></div>
    </article>`;
  }

  function thinkingMessage() {
    return `<article class="message assistant-message thinking" aria-live="polite" aria-label="Generating">
      <div class="assistant-mark"><img src="./assets/arcel-intelligence-hexagon.svg" width="18" height="16" alt=""></div>
      <div class="skeleton-stack">
        <span class="skeleton skeleton-line"></span>
        <span class="skeleton skeleton-line mid"></span>
        <span class="skeleton skeleton-line short"></span>
      </div>
    </article>`;
  }

  function visibleProjects() {
    const query = state.projectQuery.trim().toLowerCase();
    if (!query) return projects;
    return projects.filter(project => `${project.name} ${project.detail}`.toLowerCase().includes(query));
  }

  function projectsView() {
    const list = visibleProjects();
    return `<main class="library-view" data-screen="projects" data-state="empty">
      <div class="library-head"><div><h1>Projects</h1><p>Keep related chats and files together. This library is a visual stub — nothing is saved.</p></div><button type="button" class="primary-button" data-action="new-project">${icon("plus")} New project</button></div>
      <label class="library-search">${icon("search")}<input data-project-search placeholder="Filter these placeholder cards" value="${escapeHTML(state.projectQuery)}" aria-label="Filter placeholder projects"></label>
      <div class="project-list">
        ${list.length ? list.map(project => `<button type="button" class="project-card" data-action="open-project" data-project="${project.id}"><span class="folder-mark">${icon("folder")}</span><span><strong>${escapeHTML(project.name)}</strong><small>${escapeHTML(project.detail)}</small></span><span class="project-meta"><b>${project.chats} chats</b><small>${project.updated}</small></span>${icon("arrow")}</button>`).join("") : `<div class="empty-state"><strong>No matching cards</strong><p>This filter only looks at the three placeholder projects. Search is not connected.</p></div>`}
      </div>
    </main>`;
  }

  function projectView() {
    const project = projects.find(item => item.id === state.activeProject);
    return `<main class="project-view" data-screen="project" data-state="empty">
      <div class="project-heading"><button type="button" data-action="projects">Projects</button><span>/</span><strong>${escapeHTML(project.name)}</strong></div>
      <section class="project-welcome"><span class="folder-mark large">${icon("folder")}</span><h1>${escapeHTML(project.name)}</h1><p>${escapeHTML(project.detail)}</p><p class="feature-note">Project workspaces are not persisted. Opening a card does not create files or membership.</p></section>
      <div class="project-recents"><p>Seeded titles</p>${recentChats.slice(0, 3).map(title => `<button type="button" data-action="open-chat" data-title="${escapeHTML(title)}"><span>${icon("chat")}${escapeHTML(title)}</span><small>Label only</small></button>`).join("")}</div>
      <div class="project-composer">${composer({ id: "project-prompt" })}${generationGateNote()}</div>
    </main>`;
  }

  function arenaView() {
    const selected = models.filter(model => state.selectedModels.has(model.id));
    return `<main class="arena-view" data-screen="arena" data-state="${state.arenaBusy ? "loading" : state.arenaError ? state.arenaError.state : state.arenaResults.length ? "completed" : "empty"}">
      <div class="arena-heading"><div><span>Compare</span><h1>One prompt. Multiple perspectives.</h1><p>Run the same task across selected models. Choose a response yourself — judging and synthesis are not implemented.</p></div><button type="button" class="models-button" data-action="models" aria-haspopup="menu" aria-expanded="${state.menu === "models"}">Models <b>${selected.length}</b>${icon("chevron")}</button></div>
      <section class="arena-prompt input-group">
        <label for="arena-input">Your prompt</label>
        <textarea id="arena-input" placeholder="Ask every selected model the same question…">${escapeHTML(state.drafts["arena-input"] || "")}</textarea>
        <div><button type="button" class="primary-button" data-action="run-arena" ${state.arenaBusy ? "disabled" : ""}>${state.arenaBusy ? "Comparing…" : "Compare models"}${icon("arrow")}</button></div>
        <p class="feature-note">Choose a response manually. Evidence-based judging and synthesis are unavailable until runs, citations, and evaluation records are implemented.</p>
        ${runBanner(state.arenaError)}
        ${generationGateNote()}
      </section>
      ${state.menu === "models" ? modelMenu() : ""}
      <section class="arena-grid">
        ${state.arenaBusy ? arenaSkeletons(selected) : state.arenaResults.length ? state.arenaResults.map((result, index) => arenaCard(result, index)).join("") : emptyArena(selected)}
      </section>
    </main>`;
  }

  function arenaSkeletons(selected) {
    return selected.map((model, index) => `<article class="arena-card" aria-hidden="true"><header><span>Response ${String.fromCharCode(65 + index)}</span><strong>Model hidden</strong></header><div class="skeleton-stack"><span class="skeleton skeleton-line"></span><span class="skeleton skeleton-line mid"></span><span class="skeleton skeleton-line short"></span></div><footer><span>Running…</span></footer></article>`).join("");
  }

  function emptyArena(selected) {
    if (!selected.length) {
      return `<div class="empty-state"><strong>Select at least one model</strong><p>Compare stays manual. There is no judge or combine step.</p></div>`;
    }
    return selected.map((model, index) => `<div class="arena-empty"><span>${String.fromCharCode(65 + index)}</span><p>${state.arenaReveal ? escapeHTML(model.name) : "Model hidden"}</p><small>Response will appear here</small></div>`).join("");
  }

  function arenaCard(result, index) {
    if (result.failure) {
      return `<article class="arena-card arena-card-error" data-state="${escapeHTML(result.failure.state)}" data-error-code="${escapeHTML(result.failure.code)}"><header><span>Response ${String.fromCharCode(65 + index)}</span><strong>${state.arenaReveal ? escapeHTML(result.model) : "Model hidden"}</strong></header><div>${runBanner(result.failure)}</div><footer><span>${result.time}s</span></footer></article>`;
    }
    return `<article class="arena-card ${result.winner ? "winner" : ""}"><header><span>Response ${String.fromCharCode(65 + index)}</span><strong>${state.arenaReveal ? escapeHTML(result.model) : "Model hidden"}</strong>${result.winner ? "<b>Chosen</b>" : ""}</header><div><p>${escapeHTML(result.content)}</p></div><footer><span>${result.time}s</span><button type="button" data-action="vote-result" data-index="${index}">${icon("vote")} Choose</button></footer></article>`;
  }

  function modelMenu() {
    return `<div class="model-menu menu" role="menu" data-dialog><div><strong>Select models</strong><button type="button" class="btn-icon" data-action="close-menu" aria-label="Close">${icon("close")}</button></div>${models.map(model => `<button type="button" role="menuitemcheckbox" aria-checked="${state.selectedModels.has(model.id)}" class="${state.selectedModels.has(model.id) ? "selected" : ""}" data-action="toggle-model" data-model="${model.id}"><span>${state.selectedModels.has(model.id) ? icon("check") : ""}</span><div><strong>${escapeHTML(model.name)}</strong><small>${escapeHTML(model.maker)}</small></div></button>`).join("")}<p class="feature-note menu-note">These names are prototype slots, not a verified catalog.</p></div>`;
  }

  function paletteEntries() {
    const query = state.paletteQuery.trim().toLowerCase();
    const commands = [
      { id: "cmd-new", action: "new-chat", label: "New chat", hint: "Blank composer", icon: "plus" },
      { id: "cmd-projects", action: "projects", label: "Projects", hint: "Visual stub — nothing is saved", icon: "folder" },
      { id: "cmd-arena", action: "arena", label: "Compare", hint: "Manual choose only", icon: "compare" },
      { id: "cmd-settings", action: "open-settings", label: state.auth.user ? "Settings" : "Sign in", hint: "Account sheet", icon: "more" }
    ];
    const recents = recentChats.map((title, index) => ({
      id: `recent-${index}`,
      action: "open-chat",
      title,
      label: title,
      hint: "Seeded label — no stored transcript",
      icon: "chat"
    }));
    const match = item => !query || item.label.toLowerCase().includes(query) || (item.hint || "").toLowerCase().includes(query);
    return { commands: commands.filter(match), recents: recents.filter(match) };
  }

  function commandPalette() {
    const { commands, recents } = paletteEntries();
    const flat = [...commands, ...recents];
    if (state.paletteIndex >= flat.length) state.paletteIndex = 0;
    const activeId = flat[state.paletteIndex]?.id;
    const itemButton = item => `<button type="button" class="palette-item${item.id === activeId ? " active" : ""}" data-action="${item.action}" ${item.title ? `data-title="${escapeHTML(item.title)}"` : ""} data-palette-id="${item.id}">${icon(item.icon)}<span><strong>${escapeHTML(item.label)}</strong><small>${escapeHTML(item.hint)}</small></span></button>`;
    return `<div class="search-overlay" data-action="close-menu"><section data-dialog onclick="event.stopPropagation()" role="dialog" aria-labelledby="palette-title" aria-modal="true">
      <h2 id="palette-title" class="sr-only">Command palette</h2>
      <label>${icon("search")}<input id="palette-input" data-autofocus value="${escapeHTML(state.paletteQuery)}" placeholder="Filter commands and seeded titles…" aria-label="Filter command palette"><kbd>Esc</kbd></label>
      <p class="feature-note palette-note">Search isn’t connected. This list is local commands plus seeded titles.</p>
      ${commands.length ? `<p>Commands</p>${commands.map(itemButton).join("")}` : ""}
      ${recents.length ? `<p>Seeded recents</p>${recents.map(itemButton).join("")}` : ""}
      ${!flat.length ? `<div class="palette-empty">No matching items in this local list.</div>` : ""}
    </section></div>`;
  }

  function overlays() {
    if (state.menu === "settings") return settingsOverlay();
    if (state.menu === "search") return commandPalette();
    if (state.menu === "mobile") return `<div class="mobile-overlay" data-action="close-menu">${sidebar()}<button type="button" class="sidebar-dismiss" data-action="close-menu" aria-label="Close navigation">${icon("close")}</button></div>`;
    return "";
  }

  function modelSwitcher() {
    if (state.menu !== "model-switcher") return "";
    return `<div class="model-switcher menu" role="menu" data-dialog>
      <p>Intelligence</p>
      <button type="button" class="active" role="menuitem"><span><strong>Auto</strong><small>Routes to third-party models. Auto is not an ARCEL-trained foundation model.</small></span>${icon("check")}</button>
      <p>Effort</p>
      ${effortTiers.map(model => `<button type="button" role="menuitemradio" aria-checked="${state.currentModel === model.name}" class="${state.currentModel === model.name ? "active" : ""}" data-action="select-primary-model" data-model="${model.name}" data-tier="${model.tier}"><span><strong>${model.name}</strong><small>${model.detail}</small></span>${state.currentModel === model.name ? icon("check") : ""}</button>`).join("")}
    </div>`;
  }

  function captureDrafts() {
    ["main-prompt", "chat-prompt", "project-prompt", "arena-input"].forEach(id => {
      const node = document.getElementById(id);
      if (node) state.drafts[id] = node.value;
    });
    const palette = document.getElementById("palette-input");
    if (palette) state.paletteQuery = palette.value;
    const projectSearch = document.querySelector("[data-project-search]");
    if (projectSearch) state.projectQuery = projectSearch.value;
  }

  function restoreFocus() {
    const activeId = restoreFocus.activeId;
    const selection = restoreFocus.selection;
    if (activeId) {
      const node = document.getElementById(activeId);
      if (node) {
        node.focus({ preventScroll: true });
        if (typeof selection === "number" && node.setSelectionRange) {
          try { node.setSelectionRange(selection, selection); } catch { /* not a text field */ }
        }
        return;
      }
    }
    if (state.menu && state.menu !== lastMenu) {
      const dialog = app.querySelector("[data-dialog]");
      const target = dialog?.querySelector("[data-autofocus]") || dialog?.querySelector("input, button, textarea, a[href]");
      target?.focus({ preventScroll: true });
    }
    lastMenu = state.menu;
  }

  function render() {
    captureDrafts();
    const active = document.activeElement;
    restoreFocus.activeId = active?.id || "";
    restoreFocus.selection = typeof active?.selectionStart === "number" ? active.selectionStart : null;

    let content = homeView();
    if (state.view === "chat") content = chatView();
    if (state.view === "projects") content = projectsView();
    if (state.view === "project") content = projectView();
    if (state.view === "arena") content = arenaView();
    const overlayOpen = Boolean(state.menu && state.menu !== "model-switcher" && state.menu !== "models");
    app.innerHTML = `<div class="app-shell"${overlayOpen ? ' inert aria-hidden="true"' : ""}>${sidebar()}<section class="workspace" id="workspace" tabindex="-1">${header()}${content}${modelSwitcher()}</section></div>${overlays()}${toastRegion()}`;
    restoreFocus();
  }

  function tierForCurrentModel() {
    if (state.currentModel.endsWith("Quick")) return "fast";
    if (state.currentModel.endsWith("Deep")) return "deep";
    return "balanced";
  }

  async function requestCompletion({ messages, mode = "Chat", tier = "balanced", model = "arcel" }) {
    let response;
    try {
      response = await fetch("/api/chat", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages, mode, tier, model })
      });
    } catch (error) {
      throw classifyFailure({ code: "NETWORK", error: "The browser could not reach the chat API." });
    }
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw classifyFailure({
        status: response.status,
        code: payload.code,
        error: payload.error,
        request_id: payload.request_id
      });
    }
    return payload;
  }

  function asGenerationError(error) {
    if (error && error.code && error.state) return error;
    return classifyFailure({ error: error?.message || "The model could not complete this request." });
  }

  function sharedGateCodes(results) {
    const failures = results.filter(result => result.failure);
    if (!results.length || failures.length !== results.length) return null;
    const codes = new Set(failures.map(result => result.failure.code));
    if (codes.size !== 1) return null;
    const code = [...codes][0];
    return ["AUTH_REQUIRED", "OPENROUTER_NOT_CONFIGURED", "NETWORK", "API_UNAVAILABLE"].includes(code) ? code : null;
  }

  function clearComposerDrafts() {
    state.drafts["main-prompt"] = "";
    state.drafts["chat-prompt"] = "";
    state.drafts["project-prompt"] = "";
  }

  async function startChat(prompt) {
    const value = prompt.trim();
    if (!value) return;
    state.view = "chat";
    state.generationError = null;
    state.threadNote = null;
    state.messages.push({ role: "user", content: value });
    state.busy = true;
    clearComposerDrafts();
    render();
    try {
      const completion = await requestCompletion({
        messages: state.messages,
        mode: state.mode,
        tier: tierForCurrentModel()
      });
      state.messages.push({ role: "assistant", content: completion.content });
    } catch (error) {
      state.generationError = asGenerationError(error);
    } finally {
      state.busy = false;
      render();
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    }
  }

  async function retryChat() {
    if (state.busy || !state.messages.length) return;
    state.generationError = null;
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
      state.generationError = asGenerationError(error);
    } finally {
      state.busy = false;
      render();
    }
  }

  async function runArena() {
    captureDrafts();
    const prompt = (state.drafts["arena-input"] || "").trim();
    if (!prompt || !state.selectedModels.size) return;
    state.arenaBusy = true;
    state.arenaResults = [];
    state.arenaReveal = false;
    state.arenaError = null;
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
          return { model: model.name, failure: asGenerationError(error), time: ((performance.now() - startedAt) / 1000).toFixed(1), winner: false };
        }
      }));
      if (sharedGateCodes(results)) {
        state.arenaError = results[0].failure;
        state.arenaResults = [];
      } else {
        state.arenaResults = results;
      }
    } finally {
      state.arenaBusy = false;
      render();
    }
  }

  function copyMessage(target) {
    const text = target.closest(".message-body")?.querySelector("p")?.textContent || "";
    if (!text) return;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => pushToast("Copied to clipboard.")).catch(() => pushToast("Could not copy.", "danger"));
    } else {
      pushToast("Clipboard is not available in this browser.", "danger");
    }
  }

  function focusables(root) {
    return [...(root?.querySelectorAll("a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex='-1'])") || [])];
  }

  app.addEventListener("click", event => {
    const target = event.target.closest("[data-action]");
    if (!target) return;
    const { action } = target.dataset;
    if (action === "new-chat") { state.view = "home"; state.activeProject = null; state.messages = []; state.generationError = null; state.arenaError = null; state.threadNote = null; state.menu = null; clearComposerDrafts(); }
    if (action === "projects") { state.view = "projects"; state.menu = null; }
    if (action === "arena") { state.view = "arena"; state.menu = null; }
    if (action === "open-project") { state.activeProject = target.dataset.project; state.view = "project"; state.menu = null; }
    if (action === "open-chat") {
      state.messages = [{ role: "user", content: target.dataset.title }];
      state.generationError = null;
      state.threadNote = "Seeded title only — there is no stored transcript. Conversations are not persisted.";
      state.view = "chat";
      state.menu = null;
    }
    if (action === "mode") state.mode = target.dataset.mode;
    if (action === "suggest") { startChat(target.dataset.prompt); return; }
    if (action === "send") { const input = document.querySelector(`#${target.dataset.input}`); startChat(input?.value || ""); return; }
    if (action === "search") { state.menu = "search"; state.paletteQuery = ""; state.paletteIndex = 0; }
    if (action === "account" || action === "open-settings") state.menu = "settings";
    if (action === "sign-in") { beginSignIn(); return; }
    if (action === "sign-out") { signOut(); return; }
    if (action === "view-existing-work") { state.menu = "search"; state.paletteQuery = ""; state.paletteIndex = 0; }
    if (action === "model-menu") state.menu = state.menu === "model-switcher" ? null : "model-switcher";
    if (action === "select-primary-model") { state.currentModel = target.dataset.model; state.menu = null; }
    if (action === "mobile-menu") state.menu = "mobile";
    if (action === "models") state.menu = state.menu === "models" ? null : "models";
    if (action === "close-menu") state.menu = null;
    if (action === "toggle-model") state.selectedModels.has(target.dataset.model) ? state.selectedModels.delete(target.dataset.model) : state.selectedModels.add(target.dataset.model);
    if (action === "run-arena") { runArena(); return; }
    if (action === "vote-result") { state.arenaResults.forEach((result, index) => result.winner = index === Number(target.dataset.index)); state.arenaReveal = true; }
    if (action === "attach") { pushToast("Uploads aren’t connected yet. Nothing was attached."); return; }
    if (action === "share") { pushToast("Sharing isn’t available yet."); return; }
    if (action === "new-project") { pushToast("Projects are a visual stub. Nothing is created or saved."); return; }
    if (action === "copy") { copyMessage(target); return; }
    if (action === "retry") { retryChat(); return; }
    if (action === "dismiss-toast") { state.toasts = state.toasts.filter(toast => String(toast.id) !== target.dataset.toast); }
    render();
  });

  app.addEventListener("input", event => {
    if (event.target.id === "palette-input") {
      state.paletteQuery = event.target.value;
      state.paletteIndex = 0;
      render();
    }
    if (event.target.matches("[data-project-search]")) {
      state.projectQuery = event.target.value;
      render();
    }
  });

  window.addEventListener("keydown", event => {
    if (event.key === "Escape" && (state.menu || state.toasts.length)) {
      state.menu = null;
      state.toasts = [];
      render();
      return;
    }
    if ((event.metaKey || event.ctrlKey) && event.key === "/") {
      event.preventDefault();
      state.menu = "search";
      state.paletteQuery = "";
      state.paletteIndex = 0;
      render();
      return;
    }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      state.view = "home";
      state.messages = [];
      state.generationError = null;
      state.arenaError = null;
      state.threadNote = null;
      state.menu = null;
      clearComposerDrafts();
      render();
      return;
    }
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      const input = document.activeElement;
      if (input?.tagName === "TEXTAREA") input.id === "arena-input" ? runArena() : startChat(input.value);
      return;
    }
    if (state.menu === "search") {
      const { commands, recents } = paletteEntries();
      const flat = [...commands, ...recents];
      if (event.key === "ArrowDown") {
        event.preventDefault();
        state.paletteIndex = (state.paletteIndex + 1) % Math.max(flat.length, 1);
        render();
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        state.paletteIndex = (state.paletteIndex - 1 + Math.max(flat.length, 1)) % Math.max(flat.length, 1);
        render();
      }
      if (event.key === "Enter" && document.activeElement?.id === "palette-input") {
        event.preventDefault();
        const item = flat[state.paletteIndex];
        if (!item) return;
        const button = app.querySelector(`[data-palette-id="${item.id}"]`);
        button?.click();
      }
    }
    const dialog = app.querySelector("[data-dialog]");
    if (dialog && event.key === "Tab") {
      const nodes = focusables(dialog);
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  function authErrorMessage(code) {
    const messages = {
      not_configured: "Sign-in is not configured on this deployment. AUTH_SECRET and an OAuth provider are required.",
      unsupported_provider: "That sign-in provider is not configured.",
      missing_origin: "AUTH_URL is required so the OAuth callback cannot be guessed from the Host header.",
      state_mismatch: "Sign-in could not be verified (OAuth state mismatch). Nothing was granted.",
      callback_failed: "Sign-in did not complete. No session was created.",
      provider_error: "The identity provider rejected sign-in. No session was created."
    };
    return messages[code] || "Sign-in did not complete. No session was created.";
  }

  function beginSignIn() {
    const providers = state.auth.providers || [];
    if (state.auth.configured && providers.length === 1) {
      window.location.assign(`/api/auth/login?provider=${encodeURIComponent(providers[0].id)}`);
      return;
    }
    state.menu = "settings";
    render();
  }

  async function loadSession() {
    try {
      const response = await fetch("/api/auth/session", { credentials: "include" });
      if (!response.ok) {
        state.auth = { configured: false, providers: [], user: null };
        return;
      }
      const payload = await response.json().catch(() => ({}));
      state.auth = {
        configured: Boolean(payload.configured),
        providers: Array.isArray(payload.providers) ? payload.providers : [],
        user: payload.user && payload.user.sub ? payload.user : null
      };
    } catch {
      state.auth = { configured: false, providers: [], user: null };
    }
  }

  async function signOut() {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {
      /* still clear local view */
    }
    state.auth = { ...state.auth, user: null };
    state.menu = null;
    render();
  }

  async function boot() {
    const params = new URLSearchParams(window.location.search);
    const authError = params.get("auth_error");
    await loadSession();
    if (authError) {
      state.generationError = classifyFailure({
        code: authError === "not_configured" ? "AUTH_NOT_CONFIGURED" : "AUTH_REQUIRED",
        error: authErrorMessage(authError)
      });
      state.menu = "settings";
      history.replaceState({}, "", window.location.pathname || "/");
    }
    render();
  }

  render();
  boot();
})();
