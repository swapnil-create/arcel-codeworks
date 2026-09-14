(() => {
  "use strict";

  const projects = [
    { id: "launch", name: "Launch notes", detail: "3 chats · UI only", chats: ["Onboarding outline", "Tone pass", "(empty — UI only)"], available: true },
    { id: "compare", name: "Compare drafts", detail: "Empty · UI only", chats: [], available: true },
    { id: "research", name: "Research later", detail: "Unavailable until retrieval", chats: [], available: false }
  ];

  const intelligenceOptions = [
    { id: "auto", name: "Auto", detail: "Routes by task · Recommended" },
    { id: "balanced", name: "Balanced", detail: "Named mid-tier" },
    { id: "deep", name: "Deep", detail: "Named high-reasoning" },
    { id: "image", name: "Image", detail: "Not configured", disabled: true }
  ];

  const effortTiers = [
    { id: "fast", name: "Quick", tier: "fast" },
    { id: "balanced", name: "Standard", tier: "balanced" },
    { id: "deep", name: "Deep", tier: "deep" }
  ];

  const arenaModels = [
    { id: "arcel", name: "ARCEL", available: true },
    { id: "claude", name: "Claude", available: true },
    { id: "gpt", name: "GPT", available: true },
    { id: "gemini", name: "Gemini", available: true }
  ];

  const state = {
    view: "home",
    mode: "Chat",
    intelligence: "auto",
    effort: "balanced",
    activeProject: null,
    messages: [],
    busy: false,
    streamStarted: false,
    menu: null,
    menuExit: false,
    selectedModels: new Set(arenaModels.filter(model => model.available).map(model => model.id)),
    arenaResults: [],
    arenaBusy: false,
    arenaReveal: false,
    generationError: null,
    arenaError: null,
    auth: { configured: false, providers: [], user: null },
    authLoading: true,
    authNotice: null,
    drafts: { "main-prompt": "", "chat-prompt": "", "project-prompt": "", "arena-input": "" },
    paletteQuery: "",
    paletteIndex: 0,
    toasts: [],
    threadNote: null,
    compact: false
  };

  const app = document.querySelector("#app");
  let toastTimer = 0;
  let lastMenu = null;
  let closeTimer = 0;
  let activeAbort = null;
  let liveTextFrame = 0;
  let pendingLiveText = "";

  const escapeHTML = value => String(value).replace(/[&<>'"]/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;"
  })[character]);

  const paths = {
    plus: '<path d="M12 5v14M5 12h14"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    chat: '<path d="M5 18.5A8 8 0 1 1 8.5 21L4 22l1-3.5Z"/>',
    folder: '<path d="M3 6h7l2 2h9v11H3z"/>',
    compare: '<rect x="3" y="5" width="7" height="14" rx="1"/><rect x="14" y="5" width="7" height="14" rx="1"/>',
    library: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>',
    tasks: '<path d="M9 6h12M9 12h12M9 18h12"/><path d="M4 6h.01M4 12h.01M4 18h.01"/>',
    paperclip: '<path d="m20 11-8.7 8.7a6 6 0 0 1-8.5-8.5l9.5-9.5A4 4 0 0 1 18 7.4l-9.2 9.2a2 2 0 1 1-2.8-2.8l8.5-8.5"/>',
    chevron: '<path d="m8 10 4 4 4-4"/>',
    more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    back: '<path d="M15 6 9 12l6 6"/>'
  };
  const icon = name => `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;

  function compactNow() {
    return window.matchMedia("(max-width: 760px)").matches;
  }

  function modelLabel() {
    const intelligence = intelligenceOptions.find(item => item.id === state.intelligence);
    const effort = effortTiers.find(item => item.id === state.effort);
    return `${intelligence?.name || "Auto"} · ${effort?.name || "Standard"}`;
  }

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

  function visibleCtas(error) {
    const all = Array.isArray(error.ctas) && error.ctas.length ? error.ctas : [
      { action: "sign-in", label: "Sign in" },
      { action: "open-settings", label: "Open settings" },
      { action: "view-existing-work", label: "View existing work" }
    ];
    if (error.code === "AUTH_REQUIRED" || error.code === "AUTH_NOT_CONFIGURED") {
      return all.filter(cta => cta.action === "sign-in" || cta.action === "view-existing-work");
    }
    if (error.code === "OPENROUTER_NOT_CONFIGURED") {
      return all.filter(cta => cta.action === "open-settings" || cta.action === "view-existing-work");
    }
    if (error.code === "QUOTA_EXHAUSTED") {
      return all.filter(cta => cta.action === "view-existing-work").slice(0, 1);
    }
    return all;
  }

  function bannerActions(error) {
    return `<div class="run-banner-actions">${visibleCtas(error).map((cta, index) => `<button type="button" class="${index === 0 ? "primary-button" : "ghost-button"}" data-action="${escapeHTML(cta.action)}">${escapeHTML(cta.label)}</button>`).join("")}</div>`;
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
    }, 4000);
  }

  function toastRegion() {
    if (!state.toasts.length) return "";
    return `<div class="toast-region" role="status" aria-live="polite">${state.toasts.map(toast => `<div class="toast" data-tone="${escapeHTML(toast.tone)}"><p>${escapeHTML(toast.message)}</p><button type="button" class="btn-icon" data-action="dismiss-toast" data-toast="${toast.id}" aria-label="Dismiss">${icon("close")}</button></div>`).join("")}</div>`;
  }

  function settingsBody() {
    const user = state.auth.user;
    const providers = state.auth.providers || [];
    if (user) {
      return `<p class="sheet-status">Signed in</p>
        <p>Signed in as <strong>${escapeHTML(user.name || user.email || user.sub)}</strong> via ${escapeHTML(providerLabel(user.provider))}.</p>
        <div class="auth-actions"><button type="button" class="ghost-button" data-action="sign-out">Sign out</button></div>
        <p class="feature-note">Sign-out clears the session cookie. It does not delete chats — this prototype still has no durable store.</p>`;
    }
    const oauth = state.auth.configured && providers.length
      ? `<div class="auth-actions">${providers.length === 1
        ? `<button type="button" class="primary-button" data-action="sign-in">Sign in with OAuth</button>`
        : providers.map(provider => `<a class="primary-button" href="/api/auth/login?provider=${escapeHTML(provider.id)}">Sign in with ${escapeHTML(provider.label)}</a>`).join("")}</div>`
      : `<div class="auth-actions"><button type="button" class="primary-button" data-action="sign-in">Sign in with OAuth</button></div>`;
    return `<p class="sheet-status">Signed out</p>
      ${oauth}
      <p class="feature-note">Generation stays blocked until a real session exists. No fake “Signed in as …” chip.</p>`;
  }

  function settingsOverlay() {
    return `<div class="sheet-overlay${state.compact ? " sheet-bottom" : ""}${state.menuExit ? " is-exiting" : ""}" data-action="close-menu"><section class="settings-sheet" data-dialog onclick="event.stopPropagation()" role="dialog" aria-labelledby="settings-title" aria-modal="true">
      ${state.compact ? '<div class="sheet-handle" aria-hidden="true"></div>' : ""}
      <header><h2 id="settings-title">Account</h2><button type="button" class="btn-icon" data-action="close-menu" aria-label="Close">${icon("close")}</button></header>
      <div class="sheet-section sheet-lead">${settingsBody()}</div>
      <div class="sheet-section">
        <h3>Workspace</h3>
        <p>API / provider status: not configured</p>
        <p class="feature-note feature-note-flush">OpenRouter key never shown in UI. Errors surface as banners.</p>
        <div class="auth-actions"><button type="button" class="ghost-button" data-action="open-settings">Open settings</button></div>
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

  function brandLockup(compact = false) {
    return `<div class="brand${compact ? " brand-compact" : ""}">
      <img class="brand-logo" src="./assets/arcel-logo-figma.svg" width="64" height="20" alt="ARCEL">
      <span class="brand-divider" aria-hidden="true"></span>
      ${compact ? '<span class="brand-cw">CW</span>' : ledBoard()}
    </div>`;
  }

  function authGate() {
    const ready = state.auth.configured && (state.auth.providers || []).length === 1;
    const provider = state.auth.providers?.[0]?.label || "Google";
    const description = state.authLoading
      ? "Checking your workspace…"
      : ready
        ? "Sign in with your ARCEL Intelligence account to continue."
        : "Sign-in is being configured. Please contact your workspace administrator.";
    const action = ready
      ? `<button class="primary-button auth-gate-button" type="button" data-action="sign-in">Continue with ${escapeHTML(provider)}</button>`
      : "";
    const notice = state.authNotice
      ? `<p class="auth-gate-notice" role="alert">${escapeHTML(state.authNotice)}</p>`
      : "";
    return `<main class="auth-gate" aria-labelledby="auth-title">
      <div class="auth-gate-brand">${brandLockup()}</div>
      <section class="auth-gate-panel">
        <p class="auth-gate-kicker">ARCEL Intelligence</p>
        <h1 id="auth-title">Welcome to Codeworks.</h1>
        <p>${escapeHTML(description)}</p>
        ${action}
        ${notice}
      </section>
    </main>`;
  }

  function sidebar() {
    const nav = [
      { action: "search", label: "Search", icon: "search", view: null },
      { action: "library", label: "Library", icon: "library", view: "library", stub: true },
      { action: "tasks", label: "Tasks", icon: "tasks", view: "tasks", stub: true },
      { action: "projects", label: "Projects", icon: "folder", view: "projects" },
      { action: "arena", label: "Compare", icon: "compare", view: "arena" }
    ];
    return `<aside class="sidebar" aria-label="Navigation">
      ${brandLockup()}
      <button class="new-chat" data-action="new-chat"><span>New chat</span><kbd>⌘K</kbd></button>
      <nav class="primary-nav">
        ${nav.map(item => `<button class="${item.view && (state.view === item.view || (item.view === "projects" && state.view === "project")) ? "active" : ""}" data-action="${item.action}">${icon(item.icon)}<span>${item.label}</span></button>`).join("")}
      </nav>
      <p class="sidebar-honesty">Projects/history = UI states until persistence ships.</p>
      <div class="account${state.auth.user ? "" : " unsigned"}" data-action="open-settings">
        ${state.auth.user ? `<span>${escapeHTML(initials(state.auth.user))}</span>` : ""}
        <div>
          <strong>${state.auth.user ? escapeHTML(state.auth.user.name || state.auth.user.email || "Signed in") : "Sign in"}</strong>
          <small>${state.auth.user ? escapeHTML(providerLabel(state.auth.user.provider)) : (state.auth.configured ? "Required for generation" : "Not configured")}</small>
        </div>
      </div>
    </aside>`;
  }

  function headerContext() {
    if (state.view === "chat" && state.busy) return "Streaming…";
    if (state.view === "home") return "Your AI workspace";
    if (state.view === "arena") return "Manual choose only — no Judge Best / Combine";
    if (state.view === "library") return "UI-only";
    if (state.view === "tasks") return "UI-only";
    return "";
  }

  function headerTitle() {
    if (state.view === "arena") return "Prompt Arena";
    if (state.view === "projects") return "Projects";
    if (state.view === "project") return projects.find(project => project.id === state.activeProject)?.name || "Project";
    if (state.view === "library") return "Library";
    if (state.view === "tasks") return "Tasks";
    if (state.view === "chat" || state.view === "home") return modelLabel();
    return "ARCEL";
  }

  function header() {
    const canSwitchModel = state.view === "home" || state.view === "chat" || state.view === "project";
    const context = headerContext();
    if (state.compact) {
      const backViews = new Set(["projects", "project", "arena", "library", "tasks", "chat"]);
      const left = backViews.has(state.view)
        ? `<button class="btn-icon mobile-back" data-action="${state.view === "project" ? "projects" : "new-chat"}" aria-label="Back">${icon("back")}</button>`
        : `<button class="mobile-menu btn-icon" data-action="mobile-menu" aria-label="Open navigation">${icon("menu")}</button>`;
      const center = state.view === "home"
        ? brandLockup(true)
        : `<p class="mobile-title">${escapeHTML(state.view === "arena" ? "Arena" : headerTitle())}</p>`;
      const right = state.view === "arena"
        ? `<span class="manual-chip">Manual</span>`
        : state.view === "projects"
          ? `<button type="button" class="btn-ghost mobile-plus" data-action="new-project" aria-label="New project">+</button>`
          : `<button class="user-button${state.auth.user ? "" : " unsigned"}" data-action="open-settings" aria-label="${state.auth.user ? "Account" : "Sign in"}">${state.auth.user ? escapeHTML(initials(state.auth.user)) : "Sign in"}</button>`;
      return `<header class="topbar topbar-mobile">${left}${center}${right}</header>`;
    }
    return `<header class="topbar">
      <button class="model-button" type="button" ${canSwitchModel ? `data-action="model-menu" aria-haspopup="dialog" aria-expanded="${state.menu === "model-switcher"}"` : ""}><span>${escapeHTML(headerTitle())}</span>${canSwitchModel ? icon("chevron") : ""}</button>
      <div class="top-actions">
        ${context ? `<p class="topbar-context${state.view === "chat" && state.busy ? " is-live" : ""}">${escapeHTML(context)}</p>` : ""}
        <button class="user-button${state.auth.user ? "" : " unsigned"}" data-action="open-settings" aria-label="${state.auth.user ? "Account" : "Sign in"}">${state.auth.user ? escapeHTML(initials(state.auth.user)) : "Sign in"}</button>
      </div>
    </header>`;
  }

  function composer({ id = "main-prompt", placeholder, attach = true, modelChip = true } = {}) {
    const value = escapeHTML(state.drafts[id] || "");
    const research = "Research · Unavailable";
    const text = placeholder || (state.compact ? "Ask anything…" : "Ask anything — no project or expertise required.");
    const sendLabel = state.busy ? "Stop" : "Send";
    return `<section class="composer input-group">
      <textarea id="${id}" placeholder="${escapeHTML(text)}" aria-label="${escapeHTML(text)}" ${state.busy ? "disabled" : ""}>${value}</textarea>
      <div class="composer-bar">
        <div class="composer-chips">
          ${attach && !state.compact ? `<button type="button" class="chip" data-action="attach">Attach</button>` : ""}
          <button type="button" class="chip chip-unavailable" disabled title="Real retrieval and citations are not connected yet">${escapeHTML(research)}</button>
        </div>
        <div class="composer-send">
          ${modelChip && !state.compact ? `<button type="button" class="chip chip-model" data-action="model-menu">${escapeHTML(modelLabel())}</button>` : ""}
          <button type="button" class="send${state.busy ? " is-loading" : ""}" data-action="${state.busy ? "stop" : "send"}" data-input="${id}">${sendLabel}</button>
        </div>
      </div>
    </section>`;
  }

  function homeView() {
    const dataState = state.generationError ? state.generationError.state : "empty";
    return `<main class="home-view" data-screen="home" data-state="${dataState}">
      <div class="welcome">
        <h1>What do you want to get done?</h1>
        ${composer()}
        ${runBanner(state.generationError)}
        ${state.compact ? "" : `<div class="suggestions">
          <button type="button" data-action="suggest" data-prompt="Explain a concept from first principles, with a short example.">Explain a concept</button>
          <button type="button" data-action="suggest" data-prompt="Draft a calm project update for a general-purpose AI workspace. No invented metrics.">Draft a project update</button>
          <button type="button" data-action="arena">Open Compare</button>
        </div>
        <p class="home-note">Examples fill/send a real prompt — never seeded fake history. Research chip unavailable.</p>`}
        ${state.compact ? `<p class="home-note">Research chip disabled until retrieval ships.</p>` : ""}
        ${generationGateNote()}
      </div>
    </main>`;
  }

  function chatView() {
    const dataState = state.busy ? "loading" : state.generationError ? state.generationError.state : state.messages.length ? "completed" : "empty";
    return `<main class="chat-view" data-screen="chat" data-state="${dataState}">
      <div class="thread">
        ${state.messages.map(message => message.role === "user" ? userMessage(message) : assistantMessage(message)).join("")}
        ${state.threadNote ? `<p class="feature-note">${escapeHTML(state.threadNote)}</p>` : ""}
        ${state.busy && !state.streamStarted ? thinkingMessage() : ""}
        ${!state.busy ? runBanner(state.generationError) : ""}
      </div>
      <div class="chat-composer">${composer({ id: "chat-prompt" })}${generationGateNote()}<p>ARCEL can make mistakes. Review important work.</p></div>
    </main>`;
  }

  function userMessage(message) {
    return `<article class="message user-message"><span class="message-role">You</span><p>${escapeHTML(message.content)}</p></article>`;
  }

  function assistantMessage(message) {
    return `<article class="message assistant-message"${message.streaming ? ' data-live-response="true"' : ""}>
      <span class="message-role">Codeworks</span>
      <p class="stream-content"${message.streaming ? ' aria-live="polite"' : ""}>${escapeHTML(message.content)}</p>
      <p class="source-note">${message.streaming ? "Generating live…" : "Sources hidden — Research retrieval not configured."}</p>
      ${messageActions(Boolean(message.streaming))}
    </article>`;
  }

  function thinkingMessage() {
    return `<article class="message assistant-message thinking" aria-live="polite" aria-label="Generating">
      <span class="message-role">Codeworks</span>
      <div class="skeleton-stack">
        <span class="skeleton skeleton-line"></span>
        <span class="skeleton skeleton-line mid"></span>
        <span class="skeleton skeleton-line short"></span>
      </div>
      <p class="source-note">Sources hidden — Research retrieval not configured.</p>
      ${messageActions(true)}
    </article>`;
  }

  function messageActions(streaming) {
    return `<div class="message-actions">
      <button type="button" class="chip" data-action="copy" ${streaming ? "disabled" : ""}>Copy</button>
      <button type="button" class="chip" data-action="retry" ${streaming ? "disabled" : ""}>Retry</button>
      <button type="button" class="chip" data-action="details">Details</button>
      <button type="button" class="chip" data-action="stop" ${streaming ? "" : "disabled"}>Stop</button>
    </div>`;
  }

  function stubView({ screen, title, copy }) {
    return `<main class="library-view" data-screen="${screen}" data-state="empty">
      <div class="library-head"><div><h1>${escapeHTML(title)}</h1><p>${escapeHTML(copy)}</p></div></div>
      <div class="empty-state"><strong>UI-only</strong><p>Labeled chrome only. Nothing is stored or retrieved.</p></div>
    </main>`;
  }

  function projectsView() {
    return `<main class="library-view" data-screen="projects" data-state="empty">
      <div class="library-head"><div><h1>Projects</h1><p>${state.compact ? "UI organization only — nothing persists yet." : "UI organization only — chats/files are not persisted yet. Moving a chat will confirm instructions/visibility when real."}</p></div>${state.compact ? "" : `<button type="button" class="primary-button" data-action="new-project">New project</button>`}</div>
      <div class="project-list">
        ${projects.map(project => `<button type="button" class="project-card${project.available ? "" : " is-unavailable"}" data-action="${project.available ? "open-project" : "unavailable-project"}" data-project="${project.id}"><strong>${escapeHTML(project.name)}</strong><small>${escapeHTML(state.compact && project.id === "launch" ? "3 chats · UI" : state.compact && project.id === "compare" ? "Empty" : state.compact ? "Unavailable" : project.detail)}</small></button>`).join("")}
      </div>
    </main>`;
  }

  function projectView() {
    const project = projects.find(item => item.id === state.activeProject);
    if (!project) return projectsView();
    const chats = project.chats.length ? project.chats : ["(empty — UI only)"];
    return `<main class="project-view" data-screen="project" data-state="empty">
      <p class="project-heading"><button type="button" data-action="projects">Projects</button><span>/</span><strong>${escapeHTML(project.name)}</strong></p>
      <h1>${escapeHTML(project.name)}</h1>
      <aside class="ui-only-banner"><strong>UI state only</strong><p>No durable files or chat history yet. Composer works for ephemeral prompts; nothing is saved to this project.</p></aside>
      <div class="project-split">
        <section>
          <h2>Chats in project</h2>
          ${chats.map(title => `<button type="button" data-action="open-chat" data-title="${escapeHTML(title === "(empty — UI only)" ? "" : title)}" ${title === "(empty — UI only)" ? "disabled" : ""}>${escapeHTML(title)}</button>`).join("")}
        </section>
        <section>
          <h2>Composer</h2>
          ${composer({ id: "project-prompt", placeholder: "Continue in this project context (ephemeral until persistence).", attach: false, modelChip: false })}
          ${generationGateNote()}
        </section>
      </div>
    </main>`;
  }

  function arenaView() {
    const selected = arenaModels.filter(model => model.available && state.selectedModels.has(model.id));
    return `<main class="arena-view" data-screen="arena" data-state="${state.arenaBusy ? "loading" : state.arenaError ? state.arenaError.state : state.arenaResults.length ? "completed" : "empty"}">
      <div class="arena-heading"><h1>Prompt Arena</h1><p>Manual choose only — no Judge Best / Combine</p></div>
      <section class="arena-prompt input-group">
        <label for="arena-input">Shared prompt</label>
        <textarea id="arena-input" placeholder="Write a calm product update for a general-purpose AI workspace launch.">${escapeHTML(state.drafts["arena-input"] || "")}</textarea>
        <div class="arena-run"><button type="button" class="primary-button" data-action="run-arena" ${state.arenaBusy ? "disabled" : ""}>${state.arenaBusy ? "Running…" : "Run compare"}</button></div>
        ${runBanner(state.arenaError)}
        ${generationGateNote()}
      </section>
      <div class="arena-models" role="group" aria-label="Models">
        ${arenaModels.map(model => model.available
          ? `<button type="button" class="chip${state.selectedModels.has(model.id) ? " chip-model" : ""}" data-action="toggle-model" data-model="${model.id}">${escapeHTML(model.name)}${state.selectedModels.has(model.id) ? " ✓" : ""}</button>`
          : `<button type="button" class="chip chip-unavailable" disabled>Image · Unavailable</button>`).join("")}
      </div>
      <section class="arena-grid">
        ${state.arenaBusy ? arenaSkeletons(selected) : state.arenaResults.length ? state.arenaResults.map((result, index) => arenaCard(result, index)).join("") : emptyArena(selected)}
      </section>
      <p class="arena-foot">${state.compact ? "No Judge Best / Combine on mobile either." : "One failure does not erase others. Cost includes every attempt. No auto-judge."}</p>
    </main>`;
  }

  function arenaSkeletons(selected) {
    return selected.map(model => `<article class="arena-card" aria-hidden="true"><header><strong>${escapeHTML(model.name)}</strong><span>Running…</span></header><div class="skeleton-stack"><span class="skeleton skeleton-line"></span><span class="skeleton skeleton-line mid"></span><span class="skeleton skeleton-line short"></span></div></article>`).join("");
  }

  function emptyArena(selected) {
    if (!selected.length) {
      return `<div class="empty-state"><strong>Select at least one model</strong><p>Compare stays manual. There is no judge or combine step.</p></div>`;
    }
    return selected.map(model => `<article class="arena-empty"><strong>${escapeHTML(model.name)}</strong><small>Empty until a real run completes</small></article>`).join("");
  }

  function arenaCard(result, index) {
    const choose = result.winner
      ? `<button type="button" class="primary-button" data-action="vote-result" data-index="${index}">Selected</button>`
      : `<button type="button" class="ghost-button" data-action="vote-result" data-index="${index}">${state.compact ? "Choose" : "Choose this"}</button>`;
    if (result.failure) {
      return `<article class="arena-card arena-card-error" data-state="${escapeHTML(result.failure.state)}" data-error-code="${escapeHTML(result.failure.code)}"><header><strong>${escapeHTML(result.model)}</strong><span>Failed</span></header><div>${runBanner(result.failure)}</div><footer>${choose}</footer></article>`;
    }
    return `<article class="arena-card${result.winner ? " winner" : ""}"><header><strong>${escapeHTML(result.model)}</strong><span>${state.compact ? "Done" : "Completed"}</span></header><div><p>${escapeHTML(result.content)}</p></div><footer>${choose}</footer></article>`;
  }

  function paletteEntries() {
    const query = state.paletteQuery.trim().toLowerCase();
    const commands = [
      { id: "cmd-new", action: "new-chat", label: "New chat", hint: "Create" },
      { id: "cmd-arena", action: "arena", label: "Open Compare", hint: "Arena" },
      { id: "cmd-projects", action: "projects", label: "Go to Projects", hint: "Navigate · UI state" },
      { id: "cmd-settings", action: "open-settings", label: "Sign in / Settings", hint: "Account" }
    ];
    return commands.filter(item => !query || item.label.toLowerCase().includes(query) || item.hint.toLowerCase().includes(query));
  }

  function commandPalette() {
    const commands = paletteEntries();
    if (state.paletteIndex >= commands.length) state.paletteIndex = 0;
    const activeId = commands[state.paletteIndex]?.id;
    return `<div class="search-overlay${state.menuExit ? " is-exiting" : ""}" data-action="close-menu"><section class="palette" data-dialog onclick="event.stopPropagation()" role="dialog" aria-labelledby="palette-title" aria-modal="true">
      <h2 id="palette-title" class="sr-only">Command palette</h2>
      <label><kbd>⌘K</kbd><input id="palette-input" data-autofocus value="${escapeHTML(state.paletteQuery)}" placeholder="Search chats, projects, commands…" aria-label="Filter command palette"></label>
      <p class="feature-note palette-note">Search is UI-only. This list is local commands, not a connected index.</p>
      ${commands.length ? commands.map(item => `<button type="button" class="palette-item${item.id === activeId ? " active" : ""}" data-action="${item.action}" data-palette-id="${item.id}"><strong>${escapeHTML(item.label)}</strong><small>${escapeHTML(item.hint)}</small></button>`).join("") : `<div class="palette-empty">No matching items in this local list.</div>`}
    </section></div>`;
  }

  function mobileNavSheet() {
    return `<div class="sheet-overlay sheet-bottom${state.menuExit ? " is-exiting" : ""}" data-action="close-menu"><section class="nav-sheet" data-dialog onclick="event.stopPropagation()" role="dialog" aria-labelledby="nav-title" aria-modal="true">
      <div class="sheet-handle" aria-hidden="true"></div>
      <h2 id="nav-title">Menu</h2>
      <button type="button" data-action="new-chat">New chat</button>
      <button type="button" data-action="projects">Projects · UI only</button>
      <button type="button" data-action="arena">Compare · Manual</button>
      <button type="button" data-action="search">Search · UI only</button>
      <button type="button" data-action="open-settings">Sign in / Settings</button>
      <p class="feature-note">Slide up 220ms ease-out. Escape/backdrop dismiss. Focus trap while open.</p>
    </section></div>`;
  }

  function modelSwitcher() {
    if (state.menu !== "model-switcher") return "";
    const rows = intelligenceOptions.map(option => {
      const selected = !option.disabled && state.intelligence === option.id;
      return `<button type="button" class="model-row${selected ? " selected" : ""}${option.disabled ? " is-unavailable" : ""}" ${option.disabled ? "disabled" : `data-action="select-intelligence" data-model="${option.id}"`}><strong>${escapeHTML(option.name)}${selected ? "  ✓" : ""}</strong><small>${escapeHTML(state.compact && option.id === "auto" ? "Recommended" : state.compact && option.id === "balanced" ? "Named" : state.compact && option.id === "image" ? "Unavailable" : option.detail)}</small></button>`;
    });
    return `<div class="sheet-overlay${state.compact ? " sheet-bottom" : ""}${state.menuExit ? " is-exiting" : ""}" data-action="close-menu"><section class="model-sheet" data-dialog onclick="event.stopPropagation()" role="dialog" aria-labelledby="model-title" aria-modal="true">
      ${state.compact ? '<div class="sheet-handle" aria-hidden="true"></div>' : ""}
      <h2 id="model-title">${state.compact ? "Model & effort" : "Model"}</h2>
      ${state.compact ? "" : `<p class="feature-note">Task / intelligence / effort stay separate (PRD §28).</p>`}
      ${rows.join("")}
      ${state.compact ? "" : "<p class=\"effort-label\">Effort</p>"}
      <div class="effort-pills">${effortTiers.map(tier => `<button type="button" class="chip${state.effort === tier.id ? " chip-model" : ""}" data-action="select-effort" data-tier="${tier.id}">${escapeHTML(tier.name)}${state.effort === tier.id ? " ✓" : ""}</button>`).join("")}</div>
      ${state.compact ? "" : `<p class="feature-note">Unavailable models stay visible and disabled — never hidden.</p>`}
    </section></div>`;
  }

  function overlays() {
    if (state.menu === "settings") return settingsOverlay();
    if (state.menu === "search") return commandPalette();
    if (state.menu === "mobile") return mobileNavSheet();
    if (state.menu === "model-switcher") return modelSwitcher();
    return "";
  }

  function captureDrafts() {
    ["main-prompt", "chat-prompt", "project-prompt", "arena-input"].forEach(id => {
      const node = document.getElementById(id);
      if (node) state.drafts[id] = node.value;
    });
    const palette = document.getElementById("palette-input");
    if (palette) state.paletteQuery = palette.value;
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
    state.compact = compactNow();
    const active = document.activeElement;
    restoreFocus.activeId = active?.id || "";
    restoreFocus.selection = typeof active?.selectionStart === "number" ? active.selectionStart : null;

    if (state.authLoading || !state.auth.user) {
      app.innerHTML = authGate();
      restoreFocus();
      return;
    }

    let content = homeView();
    if (state.view === "chat") content = chatView();
    if (state.view === "projects") content = projectsView();
    if (state.view === "project") content = projectView();
    if (state.view === "arena") content = arenaView();
    if (state.view === "library") content = stubView({ screen: "library", title: "Library", copy: "UI-only. Files and retrieval are not connected yet." });
    if (state.view === "tasks") content = stubView({ screen: "tasks", title: "Tasks", copy: "UI-only. Background tasks are not connected yet." });
    const overlayOpen = Boolean(state.menu);
    app.innerHTML = `<div class="app-shell"${overlayOpen ? ' inert aria-hidden="true"' : ""}>${sidebar()}<section class="workspace" id="workspace" tabindex="-1">${header()}${content}</section></div>${overlays()}${toastRegion()}`;
    restoreFocus();
  }

  function closeMenu() {
    if (!state.menu || state.menuExit) {
      state.menu = null;
      state.menuExit = false;
      render();
      return;
    }
    state.menuExit = true;
    render();
    window.clearTimeout(closeTimer);
    const ms = state.menu === "search" ? 120 : state.compact || state.menu === "settings" || state.menu === "mobile" || state.menu === "model-switcher" ? 180 : 120;
    const closing = state.menu;
    closeTimer = window.setTimeout(() => {
      if (state.menu === closing) state.menu = null;
      state.menuExit = false;
      render();
    }, ms);
  }

  function openMenu(name) {
    window.clearTimeout(closeTimer);
    state.menuExit = false;
    state.menu = name;
  }

  function tierForCurrentModel() {
    return effortTiers.find(item => item.id === state.effort)?.tier || "balanced";
  }

  async function requestCompletion({ messages, mode = "Chat", tier = "balanced", model = "arcel", onDelta = null }) {
    activeAbort = new AbortController();
    let response;
    try {
      response = await fetch("/api/chat", {
        method: "POST",
        credentials: "include",
        signal: activeAbort.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages, mode, tier, model, stream: true })
      });
    } catch (error) {
      if (error?.name === "AbortError") throw { aborted: true };
      throw classifyFailure({ code: "NETWORK", error: "The browser could not reach the chat API." });
    }
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw classifyFailure({
        status: response.status,
        code: payload.code,
        error: payload.error,
        request_id: payload.request_id
      });
    }
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/event-stream")) {
      const payload = await response.json().catch(() => ({}));
      if (!payload.content) throw classifyFailure({ code: "EMPTY_COMPLETION", error: "The model returned no content." });
      return payload;
    }

    const reader = response.body?.getReader?.();
    if (!reader) throw classifyFailure({ code: "OPENROUTER_UNREACHABLE", error: "The live response could not be read." });
    const decoder = new TextDecoder();
    let buffer = "";
    let content = "";
    let donePayload = null;
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
      const events = buffer.split("\n\n");
      buffer = done ? "" : events.pop();
      for (const event of events) {
        const line = event.split("\n").find(item => item.startsWith("data:"));
        if (!line) continue;
        let payload;
        try { payload = JSON.parse(line.slice(5).trim()); } catch { continue; }
        if (payload.type === "delta" && typeof payload.delta === "string") {
          content += payload.delta;
          onDelta?.(payload.delta, content);
        }
        if (payload.type === "error") throw classifyFailure({ code: payload.code, error: payload.error });
        if (payload.type === "done") donePayload = payload;
      }
      if (done) break;
    }
    if (!content) throw classifyFailure({ code: "EMPTY_COMPLETION", error: "The model returned no content." });
    return { content, usage: donePayload?.usage || null, provider: donePayload?.provider || null };
  }

  function asGenerationError(error) {
    if (error?.aborted) return null;
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

  function stopGeneration() {
    if (activeAbort) activeAbort.abort();
  }

  // Streaming used to call render() for every provider token. That rebuilt the
  // complete shell (including the composer) and caused visible stutter. Keep
  // state current, but paint only the response node at most once per frame.
  function paintLiveResponse(content) {
    pendingLiveText = content;
    if (liveTextFrame) return;
    liveTextFrame = window.requestAnimationFrame(() => {
      const target = document.querySelector('[data-live-response="true"] .stream-content');
      if (target) target.textContent = pendingLiveText;
      liveTextFrame = 0;
    });
  }

  function clearLiveResponsePaint() {
    if (liveTextFrame) window.cancelAnimationFrame(liveTextFrame);
    liveTextFrame = 0;
    pendingLiveText = "";
  }

  async function startChat(prompt) {
    const value = prompt.trim();
    if (!value) return;
    state.view = "chat";
    state.generationError = null;
    state.threadNote = null;
    state.messages.push({ role: "user", content: value });
    state.busy = true;
    state.streamStarted = false;
    clearComposerDrafts();
    render();
    let streamingMessage = null;
    try {
      const completion = await requestCompletion({
        messages: state.messages,
        mode: state.mode,
        tier: tierForCurrentModel(),
        onDelta: (_delta, content) => {
          if (!streamingMessage) {
            streamingMessage = { role: "assistant", content, streaming: true };
            state.messages.push(streamingMessage);
            state.streamStarted = true;
            render();
            return;
          }
          streamingMessage.content = content;
          paintLiveResponse(content);
        }
      });
      if (streamingMessage) {
        streamingMessage.content = completion.content;
        delete streamingMessage.streaming;
      } else {
        state.messages.push({ role: "assistant", content: completion.content });
      }
    } catch (error) {
      if (streamingMessage) state.messages = state.messages.filter(message => message !== streamingMessage);
      const classified = asGenerationError(error);
      if (classified) state.generationError = classified;
    } finally {
      clearLiveResponsePaint();
      state.busy = false;
      state.streamStarted = false;
      render();
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    }
  }

  async function retryChat() {
    if (state.busy || !state.messages.length) return;
    state.generationError = null;
    state.busy = true;
    state.streamStarted = false;
    render();
    let streamingMessage = null;
    try {
      const completion = await requestCompletion({
        messages: state.messages,
        mode: state.mode,
        tier: tierForCurrentModel(),
        onDelta: (_delta, content) => {
          if (!streamingMessage) {
            streamingMessage = { role: "assistant", content, streaming: true };
            state.messages.push(streamingMessage);
            state.streamStarted = true;
            render();
            return;
          }
          streamingMessage.content = content;
          paintLiveResponse(content);
        }
      });
      if (streamingMessage) {
        streamingMessage.content = completion.content;
        delete streamingMessage.streaming;
      } else {
        state.messages.push({ role: "assistant", content: completion.content });
      }
    } catch (error) {
      if (streamingMessage) state.messages = state.messages.filter(message => message !== streamingMessage);
      const classified = asGenerationError(error);
      if (classified) state.generationError = classified;
    } finally {
      clearLiveResponsePaint();
      state.busy = false;
      state.streamStarted = false;
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
      const selected = arenaModels.filter(model => model.available && state.selectedModels.has(model.id));
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
          if (error?.aborted) return { model: model.name, failure: classifyFailure({ code: "UNKNOWN", error: "Run stopped." }), time: ((performance.now() - startedAt) / 1000).toFixed(1), winner: false };
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
    const text = target.closest(".assistant-message")?.querySelector("p")?.textContent || "";
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
    if (action === "new-chat") { state.view = "home"; state.activeProject = null; state.messages = []; state.generationError = null; state.arenaError = null; state.threadNote = null; state.menu = null; state.menuExit = false; clearComposerDrafts(); }
    if (action === "projects") { state.view = "projects"; state.menu = null; state.menuExit = false; }
    if (action === "library") { state.view = "library"; state.menu = null; state.menuExit = false; }
    if (action === "tasks") { state.view = "tasks"; state.menu = null; state.menuExit = false; }
    if (action === "arena") { state.view = "arena"; state.menu = null; state.menuExit = false; }
    if (action === "open-project") { state.activeProject = target.dataset.project; state.view = "project"; state.menu = null; state.menuExit = false; }
    if (action === "unavailable-project") { pushToast("Unavailable until retrieval."); return; }
    if (action === "open-chat") {
      const title = target.dataset.title;
      if (!title) return;
      state.messages = [{ role: "user", content: title }];
      state.generationError = null;
      state.threadNote = "Seeded title only — there is no stored transcript. Conversations are not persisted.";
      state.view = "chat";
      state.menu = null;
      state.menuExit = false;
    }
    if (action === "suggest") { startChat(target.dataset.prompt); return; }
    if (action === "send") { const input = document.querySelector(`#${target.dataset.input}`); startChat(input?.value || ""); return; }
    if (action === "stop") { stopGeneration(); return; }
    if (action === "search") { openMenu("search"); state.paletteQuery = ""; state.paletteIndex = 0; }
    if (action === "account" || action === "open-settings") openMenu("settings");
    if (action === "sign-in") { beginSignIn(); return; }
    if (action === "sign-out") { signOut(); return; }
    if (action === "view-existing-work") { openMenu("search"); state.paletteQuery = ""; state.paletteIndex = 0; }
    if (action === "model-menu") {
      if (state.menu === "model-switcher") { closeMenu(); return; }
      openMenu("model-switcher");
    }
    if (action === "select-intelligence") { state.intelligence = target.dataset.model; }
    if (action === "select-effort") { state.effort = target.dataset.tier; }
    if (action === "mobile-menu") openMenu("mobile");
    if (action === "close-menu") { closeMenu(); return; }
    if (action === "toggle-model") state.selectedModels.has(target.dataset.model) ? state.selectedModels.delete(target.dataset.model) : state.selectedModels.add(target.dataset.model);
    if (action === "run-arena") { runArena(); return; }
    if (action === "vote-result") { state.arenaResults.forEach((result, index) => result.winner = index === Number(target.dataset.index)); state.arenaReveal = true; }
    if (action === "attach") { pushToast("Uploads aren’t connected yet. Nothing was attached."); return; }
    if (action === "new-project") { pushToast("Projects are a visual stub. Nothing is created or saved."); return; }
    if (action === "copy") { copyMessage(target); return; }
    if (action === "retry") { retryChat(); return; }
    if (action === "details") {
      const id = state.generationError?.request_id;
      pushToast(id ? `Request ${id}` : "No run details. Sources hidden — Research retrieval not configured.");
      return;
    }
    if (action === "dismiss-toast") { state.toasts = state.toasts.filter(toast => String(toast.id) !== target.dataset.toast); }
    render();
  });

  app.addEventListener("input", event => {
    if (event.target.id === "palette-input") {
      state.paletteQuery = event.target.value;
      state.paletteIndex = 0;
      render();
    }
  });

  window.addEventListener("resize", () => {
    const next = compactNow();
    if (next !== state.compact) render();
  });

  window.addEventListener("keydown", event => {
    if (event.key === "Escape" && (state.menu || state.toasts.length)) {
      if (state.menu) { closeMenu(); return; }
      state.toasts = [];
      render();
      return;
    }
    if ((event.metaKey || event.ctrlKey) && (event.key === "/" || event.key.toLowerCase() === "k")) {
      event.preventDefault();
      openMenu("search");
      state.paletteQuery = "";
      state.paletteIndex = 0;
      render();
      return;
    }
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      const input = document.activeElement;
      if (input?.tagName === "TEXTAREA") input.id === "arena-input" ? runArena() : startChat(input.value);
      return;
    }
    if (state.menu === "search") {
      const commands = paletteEntries();
      if (event.key === "ArrowDown") {
        event.preventDefault();
        state.paletteIndex = (state.paletteIndex + 1) % Math.max(commands.length, 1);
        render();
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        state.paletteIndex = (state.paletteIndex - 1 + Math.max(commands.length, 1)) % Math.max(commands.length, 1);
        render();
      }
      if (event.key === "Enter" && document.activeElement?.id === "palette-input") {
        event.preventDefault();
        const item = commands[state.paletteIndex];
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
    openMenu("settings");
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
    } finally {
      state.authLoading = false;
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
    state.menuExit = false;
    render();
  }

  async function boot() {
    const params = new URLSearchParams(window.location.search);
    const authError = params.get("auth_error");
    await loadSession();
    if (authError) {
      state.authNotice = authErrorMessage(authError);
      history.replaceState({}, "", window.location.pathname || "/");
    }
    render();
  }

  render();
  boot();
})();
