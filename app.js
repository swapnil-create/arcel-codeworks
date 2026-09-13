(() => {
  "use strict";

  const seededProjects = [
    {
      id: "vault",
      name: "ARCEL Vault",
      summary: "Private, offline-first artifact vault for high-stakes teams.",
      repository: "arcel/vault-ios",
      branch: "feature/project-intelligence",
      status: "In progress",
      updated: "6 min ago",
      activity: 98,
      instructions: "Keep the experience calm and privacy-first. Prefer native SwiftUI patterns. Explain trade-offs before changing persistence or security boundaries.",
      sources: ["AGENTS.md", "Product brief", "Privacy model", "Design tokens"],
      sessions: [
        { title: "Design project intelligence home", time: "6 min ago", status: "Building", detail: "Exploring the workspace shell and context rail." },
        { title: "Audit sync conflict architecture", time: "Yesterday", status: "Ready", detail: "Decision log and implementation paths prepared." }
      ],
      activityFeed: [
        { type: "Build", title: "Prepared workspace navigation", detail: "Updated project navigation proposal and identified three affected views.", time: "6 min ago" },
        { type: "Context", title: "Design tokens indexed", detail: "System colors, typography, and motion defaults are available to new sessions.", time: "42 min ago" },
        { type: "Review", title: "Sync architecture audit completed", detail: "No changes made; 4 implementation recommendations captured.", time: "Yesterday" }
      ],
      artifacts: [
        { name: "project-intelligence-brief.md", kind: "Brief", updated: "6 min ago" },
        { name: "sync-conflict-audit.md", kind: "Research", updated: "Yesterday" },
        { name: "vault-design-system.fig", kind: "Design", updated: "2 days ago" }
      ]
    },
    {
      id: "launch",
      name: "ARCEL Launch System",
      summary: "A reusable launch narrative, site, and conversion toolkit.",
      repository: "arcel/launch-system",
      branch: "main",
      status: "Review needed",
      updated: "2 hr ago",
      activity: 74,
      instructions: "Use direct editorial language. Preserve the ARCEL voice: precise, composed, and unusually useful.",
      sources: ["Brand narrative", "Launch brief", "Audience research"],
      sessions: [
        { title: "Refine platform positioning", time: "2 hr ago", status: "Review", detail: "Draft narrative is ready for a product decision." },
        { title: "Build customer proof section", time: "Friday", status: "Ready", detail: "Component variations and evidence hierarchy complete." }
      ],
      activityFeed: [
        { type: "Research", title: "Competitive language mapped", detail: "Eight positioning territories synthesized into a concise narrative matrix.", time: "2 hr ago" },
        { type: "Artifact", title: "Launch-page outline created", detail: "A structured outline is available in Artifacts.", time: "Friday" }
      ],
      artifacts: [
        { name: "positioning-matrix.md", kind: "Research", updated: "2 hr ago" },
        { name: "launch-page-outline.md", kind: "Outline", updated: "Friday" }
      ]
    },
    {
      id: "field",
      name: "Field Notes",
      summary: "A small editorial system for collecting product signals and decisions.",
      repository: "No repository connected",
      branch: "Project-only",
      status: "Planning",
      updated: "3 days ago",
      activity: 41,
      instructions: "Turn raw observations into decisions, not generic summaries. Protect participant anonymity.",
      sources: ["Interview notes", "Decision log"],
      sessions: [
        { title: "Draft research cadence", time: "3 days ago", status: "Ready", detail: "Initial operating rhythm proposed." }
      ],
      activityFeed: [
        { type: "Context", title: "Interview notes added", detail: "Twelve notes are available as project context.", time: "3 days ago" }
      ],
      artifacts: [
        { name: "research-cadence.md", kind: "Plan", updated: "3 days ago" }
      ]
    }
  ];

  const state = {
    projects: seededProjects,
    view: "projects",
    activeProjectId: "vault",
    activeTab: "sessions",
    search: "",
    sort: "activity",
    modal: null,
    attachmentMenu: false,
    composerMode: "Ask",
    depth: "Deep",
    busy: false,
    lastResult: null
  };

  const app = document.querySelector("#app");
  const icon = (symbol) => `<span aria-hidden="true">${symbol}</span>`;
  const escapeHTML = (value) => String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" })[character]);
  const project = () => state.projects.find((item) => item.id === state.activeProjectId);
  const activeNav = (id) => state.view === "projects" && id === "projects" ? ' aria-current="page"' : "";

  function navigation() {
    return `
      <aside class="sidebar" aria-label="Codeworks navigation" data-region="persistent-sidebar">
        <div class="stack">
          <div class="brand-lockup">
            <img class="arcel-wordmark" src="./assets/arcel-wordmark.svg" alt="ARCEL" />
            <span>CODEWORKS</span>
          </div>
          <button class="primary" data-action="new-session">${icon("+")} New session</button>
          <nav aria-label="Primary">
            <ul class="nav-list">
              <li><button data-action="global-search">${icon("⌕")} Search</button></li>
              <li><button data-action="go-projects"${activeNav("projects")}>${icon("▦")} Projects</button></li>
              <li><button data-action="sessions">${icon("◌")} Sessions</button></li>
              <li><button data-action="artifacts">${icon("◇")} Artifacts</button></li>
              <li><button data-action="automations">${icon("↻")} Automations</button></li>
              <li><button data-action="integrations">${icon("⊹")} Integrations</button></li>
            </ul>
          </nav>
          <section aria-labelledby="recent-heading">
            <p id="recent-heading" class="eyebrow">RECENT SESSIONS</p>
            <ul class="plain-list stack">
              <li><button class="ghost" data-action="open-project" data-project="vault">Project intelligence home</button></li>
              <li><button class="ghost" data-action="open-project" data-project="launch">Platform positioning</button></li>
              <li><button class="ghost" data-action="open-project" data-project="field">Research cadence</button></li>
            </ul>
          </section>
        </div>
      </aside>`;
  }

  function topbar() {
    const selected = project();
    return `<header class="topbar" data-region="topbar">
      <div class="row">
        <button class="secondary mobile-only icon-button" aria-label="Open navigation" data-action="open-mobile-nav">☰</button>
        <div><p class="eyebrow">${state.view === "projects" ? "WORKSPACES" : "PROJECT / " + escapeHTML(selected.name.toUpperCase())}</p><strong>${state.view === "projects" ? "Projects" : escapeHTML(selected.name)}</strong></div>
      </div>
      <div class="row"><button class="secondary" data-action="open-context">Context</button><button class="secondary" data-action="show-notifications">${icon("◉")} Updates</button><button class="ghost" data-action="account">SM</button></div>
    </header>`;
  }

  function projectsIndex() {
    const displayed = [...state.projects]
      .filter((item) => `${item.name} ${item.summary} ${item.repository}`.toLowerCase().includes(state.search.toLowerCase()))
      .sort((a, b) => state.sort === "name" ? a.name.localeCompare(b.name) : state.sort === "status" ? a.status.localeCompare(b.status) : b.activity - a.activity);
    return `<section class="page-main" aria-labelledby="projects-title" data-view="projects-index">
      <div class="split"><div><p class="eyebrow">DURABLE CONTEXT FOR CODEWORK</p><h1 id="projects-title">Projects</h1><p class="muted">Repository state, agent guidance, source context, and sessions in one place.</p></div><button class="primary" data-action="open-new-project">${icon("+")} New project</button></div>
      <div class="toolbar" aria-label="Project controls">
        <label class="grow"><span class="eyebrow">FIND A PROJECT</span><input type="search" data-input="search" value="${escapeHTML(state.search)}" placeholder="Search projects, repositories, or context…" aria-label="Search projects" /></label>
        <label><span class="eyebrow">SORT BY</span><select data-input="sort" aria-label="Sort projects"><option value="activity" ${state.sort === "activity" ? "selected" : ""}>Activity</option><option value="name" ${state.sort === "name" ? "selected" : ""}>Name</option><option value="status" ${state.sort === "status" ? "selected" : ""}>Status</option></select></label>
      </div>
      <p class="muted" aria-live="polite">${displayed.length} ${displayed.length === 1 ? "project" : "projects"} visible</p>
      <div class="project-grid" data-component="project-cards">
        ${displayed.map((item) => `<article class="project-card" data-project-card="${item.id}">
          <div class="split"><span class="status">${escapeHTML(item.status)}</span><button class="ghost icon-button" aria-label="More options for ${escapeHTML(item.name)}" data-action="project-menu" data-project="${item.id}">⋯</button></div>
          <h2><button class="ghost" data-action="open-project" data-project="${item.id}">${escapeHTML(item.name)}</button></h2>
          <p>${escapeHTML(item.summary)}</p>
          <p class="muted">${escapeHTML(item.repository)} · ${escapeHTML(item.branch)}</p>
          <div class="meta-row"><span>${item.sessions.length} sessions</span><span>Updated ${escapeHTML(item.updated)}</span></div>
          <div class="row"><button class="primary" data-action="open-project" data-project="${item.id}">Resume work</button><button class="secondary" data-action="open-context" data-project="${item.id}">Context</button></div>
        </article>`).join("") || `<div class="empty-state"><h2>No matching projects</h2><p>Try another project name, repository, or context source.</p></div>`}
      </div>
    </section>`;
  }

  function projectDetail() {
    const item = project();
    const tabs = ["sessions", "activity", "artifacts"];
    return `<section class="page-main" aria-labelledby="project-title" data-view="project-detail">
      <button class="ghost" data-action="go-projects">← All projects</button>
      <div class="split"><div><p class="eyebrow">${escapeHTML(item.repository)}</p><h1 id="project-title">${escapeHTML(item.name)}</h1><p class="muted">${escapeHTML(item.summary)}</p></div><div class="row"><span class="status">${escapeHTML(item.status)}</span><button class="secondary" data-action="open-context">Edit context</button><button class="ghost icon-button" data-action="project-menu" aria-label="Project options">⋯</button></div></div>
      <div class="tablist" role="tablist" aria-label="Project workspace views">
        ${tabs.map((tab) => `<button role="tab" id="tab-${tab}" aria-controls="panel-${tab}" aria-selected="${state.activeTab === tab}" tabindex="${state.activeTab === tab ? 0 : -1}" data-action="switch-tab" data-tab="${tab}">${tab[0].toUpperCase() + tab.slice(1)}${tab === "sessions" ? ` <span class="muted">${item.sessions.length}</span>` : ""}</button>`).join("")}
      </div>
      ${workspacePanel(item)}
      ${composer(item)}
    </section>`;
  }

  function workspacePanel(item) {
    if (state.activeTab === "sessions") {
      return `<section role="tabpanel" id="panel-sessions" aria-labelledby="tab-sessions" class="stack" data-panel="sessions">
        <div class="split"><div><h2>Sessions</h2><p class="muted">Focused work threads using this project’s context.</p></div><button class="secondary" data-action="new-session">${icon("+")} Start session</button></div>
        ${item.sessions.map((session) => `<article class="activity-item"><div class="split"><div><h3>${escapeHTML(session.title)}</h3><p>${escapeHTML(session.detail)}</p></div><span class="status">${escapeHTML(session.status)}</span></div><p class="muted">${escapeHTML(session.time)}</p></article>`).join("")}
        ${state.lastResult ? resultCard() : ""}
      </section>`;
    }
    if (state.activeTab === "activity") {
      return `<section role="tabpanel" id="panel-activity" aria-labelledby="tab-activity" class="stack" data-panel="activity"><div><h2>Activity</h2><p class="muted">An auditable stream of decisions, agent work, and context changes.</p></div>${item.activityFeed.map((entry) => `<article class="activity-item"><div class="split"><strong>${escapeHTML(entry.type)}</strong><span class="muted">${escapeHTML(entry.time)}</span></div><h3>${escapeHTML(entry.title)}</h3><p>${escapeHTML(entry.detail)}</p></article>`).join("")}</section>`;
    }
    return `<section role="tabpanel" id="panel-artifacts" aria-labelledby="tab-artifacts" class="stack" data-panel="artifacts"><div class="split"><div><h2>Artifacts</h2><p class="muted">Reusable outputs created in this project.</p></div><button class="secondary" data-action="attachment-menu">${icon("+")} Add source</button></div>${item.artifacts.map((artifact) => `<article class="activity-item"><div class="split"><div><h3>${escapeHTML(artifact.name)}</h3><p class="muted">${escapeHTML(artifact.kind)} · Updated ${escapeHTML(artifact.updated)}</p></div><button class="ghost" data-action="open-artifact">Open</button></div></article>`).join("")}</section>`;
  }

  function composer(item) {
    const modes = ["Ask", "Research", "Build", "Create"];
    const depths = ["Fast", "Deep", "Expert"];
    return `<section class="composer stack" aria-label="Project composer" data-component="composer">
      <div class="split"><div><strong>Work in ${escapeHTML(item.name)}</strong><p class="muted">Agent responses inherit this project’s instructions and approved sources.</p></div>${state.busy ? `<span class="status" role="status">Working…</span>` : ""}</div>
      <label><span class="eyebrow">TASK</span><textarea id="composer-input" placeholder="Describe the outcome, change, or question…" ${state.busy ? "disabled" : ""}></textarea></label>
      <div class="split"><div class="row" role="group" aria-label="Work mode">${modes.map((mode) => `<button class="${state.composerMode === mode ? "primary" : "secondary"}" data-action="set-mode" data-mode="${mode}" aria-pressed="${state.composerMode === mode}">${mode}</button>`).join("")}</div><div class="row"><button class="secondary" data-action="attachment-menu" aria-expanded="${state.attachmentMenu}">${icon("+")} Attach</button><select data-input="depth" aria-label="Reasoning depth">${depths.map((depth) => `<option ${state.depth === depth ? "selected" : ""}>${depth}</option>`).join("")}</select><button class="primary" data-action="send" ${state.busy ? "disabled" : ""}>${state.busy ? "Working…" : "Send"}</button></div></div>
      ${state.attachmentMenu ? attachmentMenu() : ""}
    </section>`;
  }

  function attachmentMenu() {
    return `<section class="context-card" aria-label="Add project context" data-component="attachment-menu"><p class="eyebrow">ADD TO THIS TASK</p><div class="row"><button class="secondary" data-action="attach" data-kind="Files">Upload files</button><button class="secondary" data-action="attach" data-kind="Repository">Reference repository</button><button class="secondary" data-action="attach" data-kind="GitHub issue">Import issue</button><button class="secondary" data-action="attach" data-kind="Screenshot">Add screenshot</button></div></section>`;
  }

  function contextRail() {
    const item = project();
    if (state.view === "projects") return `<aside class="context-rail" aria-label="Projects guide"><section class="context-card"><p class="eyebrow">HOW PROJECTS WORK</p><h2>Durable context, not another inbox.</h2><p>Keep source material, project instructions, repository state, and sessions together. Chats do the work; Projects make future work smarter.</p><button class="secondary" data-action="open-new-project">Create project</button></section></aside>`;
    return `<aside class="context-rail" aria-label="Project context" data-region="context-rail">
      <div class="split"><div><p class="eyebrow">PROJECT CONTEXT</p><h2>Ready for this session</h2></div><button class="ghost icon-button" aria-label="Edit project context" data-action="open-context">✎</button></div>
      <div class="stack">
        <section class="context-card"><p class="eyebrow">REPOSITORY</p><strong>${escapeHTML(item.repository)}</strong><p class="muted">${escapeHTML(item.branch)}</p><button class="ghost" data-action="change-branch">Change branch</button></section>
        <section class="context-card"><div class="split"><p class="eyebrow">INSTRUCTIONS</p><button class="ghost" data-action="open-context">Edit</button></div><p>${escapeHTML(item.instructions)}</p></section>
        <section class="context-card"><div class="split"><p class="eyebrow">SOURCES</p><button class="ghost" data-action="attachment-menu">+</button></div>${item.sources.map((source) => `<span class="source-chip">${escapeHTML(source)}</span>`).join("")}</section>
        <section class="context-card"><p class="eyebrow">AGENT CONTEXT</p><p><strong>${state.depth}</strong> reasoning · ${state.composerMode} mode</p><p class="muted">Project instructions → repository guidance → selected sources → task prompt</p></section>
      </div>
    </aside>`;
  }

  function resultCard() {
    const result = state.lastResult;
    return `<article class="activity-item" data-component="agent-result"><div class="split"><div><span class="status">${escapeHTML(result.mode)} complete</span><h3>${escapeHTML(result.title)}</h3></div><span class="muted">Just now</span></div><p>${escapeHTML(result.summary)}</p><div aria-label="Sources used">${result.sources.map((source) => `<span class="source-chip">${escapeHTML(source)}</span>`).join("")}</div></article>`;
  }

  function modal() {
    if (!state.modal) return "";
    if (state.modal === "new-project") return `<div class="modal-backdrop" role="presentation"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="new-project-title"><div class="split"><div><p class="eyebrow">NEW PROJECT</p><h2 id="new-project-title">Set durable context</h2></div><button class="ghost icon-button" data-action="close-modal" aria-label="Close">×</button></div><form class="stack" data-form="new-project"><label>What are you building?<input required name="name" placeholder="e.g. ARCEL Mobile Intelligence" /></label><label>What should the agent know?<textarea required name="summary" placeholder="Goal, constraints, audience, or definition of done…"></textarea></label><label>Repository or workspace<select name="repository"><option value="No repository connected">Project-only (no repository yet)</option><option value="arcel/new-mobile-intelligence">arcel/new-mobile-intelligence</option><option value="Connect later">Connect later</option></select></label><div class="row"><button class="primary" type="submit">Create project</button><button class="secondary" type="button" data-action="close-modal">Cancel</button></div></form></section></div>`;
    if (state.modal === "context") { const item = project(); return `<div class="modal-backdrop" role="presentation"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="context-title"><div class="split"><div><p class="eyebrow">PROJECT CONTEXT</p><h2 id="context-title">${escapeHTML(item.name)}</h2></div><button class="ghost icon-button" data-action="close-modal" aria-label="Close">×</button></div><form class="stack" data-form="context"><label>Repository<input name="repository" value="${escapeHTML(item.repository)}" /></label><label>Branch or working state<input name="branch" value="${escapeHTML(item.branch)}" /></label><label>Instructions for every session<textarea name="instructions">${escapeHTML(item.instructions)}</textarea></label><fieldset><legend class="eyebrow">ACTIVE CONTEXT</legend>${item.sources.map((source) => `<label class="row"><input type="checkbox" checked name="source" value="${escapeHTML(source)}" />${escapeHTML(source)}</label>`).join("")}</fieldset><div class="row"><button class="primary" type="submit">Save context</button><button class="secondary" type="button" data-action="close-modal">Cancel</button></div></form></section></div>`; }
    if (state.modal === "project-menu") return `<div class="modal-backdrop" role="presentation"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="menu-title"><div class="split"><h2 id="menu-title">Project actions</h2><button class="ghost icon-button" data-action="close-modal" aria-label="Close">×</button></div><div class="stack"><button class="secondary" data-action="open-context">Edit details & context</button><button class="secondary" data-action="archive-project">Archive project</button><button class="secondary" data-action="duplicate-project">Duplicate project</button><button class="secondary" data-action="close-modal">Cancel</button></div></section></div>`;
    return `<div class="modal-backdrop" role="presentation"><aside class="modal" role="dialog" aria-modal="true" aria-label="Mobile navigation">${navigation()}<button class="secondary" data-action="close-modal">Close navigation</button></aside></div>`;
  }

  function render() {
    app.innerHTML = `<div class="app-shell">${navigation()}<section class="workspace">${topbar()}<div class="workspace-grid">${state.view === "projects" ? projectsIndex() : projectDetail()}${contextRail()}</div></section></div>${modal()}`;
  }

  function openProject(id) {
    state.activeProjectId = id || state.activeProjectId;
    state.view = "detail";
    state.activeTab = "sessions";
    state.modal = null;
  }

  function addNewProject(form) {
    const data = new FormData(form);
    const id = `project-${Date.now()}`;
    state.projects.unshift({ id, name: data.get("name"), summary: data.get("summary"), repository: data.get("repository"), branch: data.get("repository") === "No repository connected" ? "Project-only" : "main", status: "Planning", updated: "Just now", activity: 100, instructions: "Add project instructions to guide every agent session.", sources: ["Project brief"], sessions: [], activityFeed: [{ type: "Project", title: "Project created", detail: "Ready to add repository context and start a focused session.", time: "Just now" }], artifacts: [] });
    openProject(id);
  }

  function sendTask() {
    const input = document.querySelector("#composer-input");
    const task = input?.value.trim();
    if (!task) { input?.focus(); return; }
    state.busy = true;
    state.lastResult = null;
    render();
    window.setTimeout(() => {
      const item = project();
      const title = state.composerMode === "Build" ? "Implementation plan and affected files identified" : state.composerMode === "Research" ? "Research brief prepared from project context" : state.composerMode === "Create" ? "First project artifact drafted" : "Context-aware response prepared";
      const summary = `${state.depth} pass on “${task}”. Used scoped project guidance and the current repository state; next actions are ready in the session.`;
      state.lastResult = { mode: state.composerMode, title, summary, sources: item.sources.slice(0, 3) };
      item.sessions.unshift({ title: task, time: "Just now", status: "Ready", detail: title });
      item.activityFeed.unshift({ type: state.composerMode, title, detail: "New session output is ready with attributed context sources.", time: "Just now" });
      item.updated = "Just now";
      item.activity = Math.min(100, item.activity + 4);
      state.busy = false;
      render();
    }, 850);
  }

  app.addEventListener("click", (event) => {
    const target = event.target.closest("[data-action]");
    if (!target) return;
    const { action, project: projectId, tab, mode, kind } = target.dataset;
    if (action === "go-projects") { state.view = "projects"; state.modal = null; }
    if (action === "open-project") openProject(projectId);
    if (action === "open-new-project") state.modal = "new-project";
    if (action === "open-context") { if (projectId) state.activeProjectId = projectId; state.modal = "context"; }
    if (action === "close-modal") state.modal = null;
    if (action === "open-mobile-nav") state.modal = "mobile-nav";
    if (action === "switch-tab") state.activeTab = tab;
    if (action === "set-mode") state.composerMode = mode;
    if (action === "attachment-menu") state.attachmentMenu = !state.attachmentMenu;
    if (action === "attach") { state.attachmentMenu = false; state.lastResult = { mode: "Context", title: `${kind} added to this task`, summary: `${kind} is scoped to the next run and can be saved into the project context afterward.`, sources: [kind] }; }
    if (action === "send") sendTask();
    if (action === "project-menu") { if (projectId) state.activeProjectId = projectId; state.modal = "project-menu"; }
    if (action === "archive-project") { const item = project(); item.status = "Archived"; state.modal = null; }
    if (action === "duplicate-project") { const item = project(); const copy = { ...item, id: `project-${Date.now()}`, name: `${item.name} copy`, status: "Planning", updated: "Just now", sessions: [], activityFeed: [{ type: "Project", title: "Project duplicated", detail: "Context copied; sessions remain separate.", time: "Just now" }], artifacts: [...item.artifacts] }; state.projects.unshift(copy); openProject(copy.id); }
    if (["new-session", "sessions", "artifacts", "global-search", "automations", "integrations", "show-notifications", "account", "change-branch", "open-artifact"].includes(action)) { state.lastResult = { mode: "Notice", title: "Prototype interaction", summary: `${target.textContent.trim() || action} is represented in this prototype’s interaction model.`, sources: ["ARCEL Codeworks prototype"] }; if (state.view === "projects") openProject(state.activeProjectId); }
    render();
  });

  app.addEventListener("input", (event) => {
    if (event.target.dataset.input === "search") { state.search = event.target.value; render(); document.querySelector('[data-input="search"]')?.focus(); }
  });

  app.addEventListener("change", (event) => {
    if (event.target.dataset.input === "sort") { state.sort = event.target.value; render(); }
    if (event.target.dataset.input === "depth") state.depth = event.target.value;
  });

  app.addEventListener("submit", (event) => {
    event.preventDefault();
    if (event.target.dataset.form === "new-project") addNewProject(event.target);
    if (event.target.dataset.form === "context") { const data = new FormData(event.target); const item = project(); item.repository = data.get("repository"); item.branch = data.get("branch"); item.instructions = data.get("instructions"); item.sources = data.getAll("source"); item.activityFeed.unshift({ type: "Context", title: "Project context updated", detail: "Repository guidance and selected sources will shape future sessions.", time: "Just now" }); state.modal = null; }
    render();
  });

  render();
})();
