// src/shared.ts
var EXTENSION_NAME = "Lumi Phone Tracker";
var TRACKER_TAG = "phone-state";
var TEXT_TAG = "phone-text";
var DEFAULT_ITEMS = Object.freeze({
  location: true,
  time: true,
  present: true,
  details: true,
  weather: true,
  notes: true,
  messages: true
});
function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

// src/model.ts
var SCENE_KEYS = ["location", "time", "date", "present"];
var CONTACT_KEYS = ["roles", "physical", "mood", "position", "attire", "thoughts"];
var SECTIONS = ["people", "items", "rules", "plots", "misc"];
var SWITCHES = [
  ...SCENE_KEYS.map((k) => `scene.${k}`),
  ...CONTACT_KEYS.map((k) => `contacts.${k}`),
  ...SECTIONS.map((k) => `notes.${k}`),
  "locations",
  "weather",
  "messages"
];
var normalize = (name) => name.normalize("NFKC").trim().toLocaleLowerCase("en-US").split(" ").filter(Boolean).join(" ");

// src/preferences.ts
var APPS = ["Scene", "Weather", "Locations", "Notes", "Contacts", "Messages", "Settings"];
var defaultPreferences = () => ({ revision: 0, css: "", dismissed: [] });
function readPreferences(value) {
  if (!isRecord(value) || typeof value.css !== "string" || value.css.length > 32000 || !Number.isSafeInteger(value.revision) || !Array.isArray(value.dismissed) || value.dismissed.some((a) => !APPS.includes(a)))
    throw new Error("Invalid appearance preferences");
  return { revision: value.revision, css: value.css, dismissed: [...new Set(value.dismissed)] };
}

// src/custom-css.ts
function prepareCustomCSS(text) {
  if (text.length > 32000)
    throw new Error("Keep custom CSS under 32,000 characters.");
  if (text.includes("\\"))
    throw new Error("CSS escape sequences are not supported.");
  let stripped = "";
  let quote = "";
  let depth = 0;
  let comment = false;
  for (let i = 0;i < text.length; i++) {
    const c = text[i];
    const n = text[i + 1];
    if (comment) {
      if (c === "*" && n === "/") {
        comment = false;
        i++;
      }
      continue;
    }
    if (!quote && c === "/" && n === "*") {
      comment = true;
      i++;
      continue;
    }
    stripped += c;
    if (quote) {
      if (c === quote)
        quote = "";
      continue;
    }
    if (c === '"' || c === "'")
      quote = c;
    else if (c === "{")
      depth++;
    else if (c === "}" && --depth < 0)
      throw new Error("Check the CSS braces.");
  }
  if (quote || comment || depth)
    throw new Error("Finish the CSS rule, quote, or comment.");
  const lower = stripped.toLowerCase();
  if (["url(", "@import", "@font-face", "://", "image-set(", "@property", "@namespace"].some((t) => lower.includes(t))) {
    throw new Error("Use local styles only; imports, links, and font downloads are not supported.");
  }
  const sheet = new CSSStyleSheet;
  sheet.replaceSync(text);
  const check = (rules) => {
    for (const rule of Array.from(rules)) {
      if (rule.type === CSSRule.STYLE_RULE) {
        if (rule.selectorText.includes("::slotted"))
          throw new Error("Style phone elements only.");
      } else if (rule.type === CSSRule.MEDIA_RULE || rule.type === CSSRule.SUPPORTS_RULE)
        check(rule.cssRules);
      else
        throw new Error("Use ordinary CSS rules, @media, or @supports.");
    }
  };
  check(sheet.cssRules);
  if (stripped.trim() && !sheet.cssRules.length)
    throw new Error("No usable CSS rules were found.");
  return Array.from(sheet.cssRules).map((r) => r.cssText).join(`
`);
}

// src/icons.ts
var HOME_ICONS = {
  Scene: [
    [
      "path",
      {
        d: "M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"
      }
    ],
    [
      "circle",
      {
        cx: "12",
        cy: "10",
        r: "3"
      }
    ]
  ],
  Weather: [
    [
      "path",
      {
        d: "M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"
      }
    ],
    [
      "path",
      {
        d: "M16 14v6"
      }
    ],
    [
      "path",
      {
        d: "M8 14v6"
      }
    ],
    [
      "path",
      {
        d: "M12 16v6"
      }
    ]
  ],
  Locations: [
    [
      "path",
      {
        d: "M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z"
      }
    ],
    [
      "path",
      {
        d: "M15 5.764v15"
      }
    ],
    [
      "path",
      {
        d: "M9 3.236v15"
      }
    ]
  ],
  Notes: [
    [
      "path",
      {
        d: "M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"
      }
    ],
    [
      "path",
      {
        d: "M14 2v5a1 1 0 0 0 1 1h5"
      }
    ],
    [
      "path",
      {
        d: "M10 9H8"
      }
    ],
    [
      "path",
      {
        d: "M16 13H8"
      }
    ],
    [
      "path",
      {
        d: "M16 17H8"
      }
    ]
  ],
  Contacts: [
    [
      "path",
      {
        d: "M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"
      }
    ],
    [
      "circle",
      {
        cx: "12",
        cy: "7",
        r: "4"
      }
    ]
  ],
  Messages: [
    [
      "path",
      {
        d: "M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z"
      }
    ]
  ],
  Settings: [
    [
      "path",
      {
        d: "M10 5H3"
      }
    ],
    [
      "path",
      {
        d: "M12 19H3"
      }
    ],
    [
      "path",
      {
        d: "M14 3v4"
      }
    ],
    [
      "path",
      {
        d: "M16 17v4"
      }
    ],
    [
      "path",
      {
        d: "M21 12h-9"
      }
    ],
    [
      "path",
      {
        d: "M21 19h-5"
      }
    ],
    [
      "path",
      {
        d: "M21 5h-7"
      }
    ],
    [
      "path",
      {
        d: "M8 10v4"
      }
    ],
    [
      "path",
      {
        d: "M8 12H3"
      }
    ]
  ]
};

// src/schema.ts
var short = (v, max = 500) => typeof v === "string" && v.length <= max && !["\x00", `
`, "\r", "<"].some((c) => v.includes(c));

// src/messages.ts
var emptyReads = () => ({ revision: 0, seen: {} });
var receipt = (m) => JSON.stringify([m.from, m.to ?? null, m.time ?? null, m.text]);
var isUnread = (m, reads) => m.direction === "incoming" && reads.seen[m.id] !== receipt(m);
var threadKey = (m) => m.direction === "incoming" ? normalize(m.from) : m.to ? normalize(m.to) : "";
function conversations(messages, reads) {
  const groups = new Map;
  for (const m of messages) {
    const key = threadKey(m);
    const group = groups.get(key) ?? { key, name: m.direction === "incoming" ? m.from : m.to ?? "Your texts", messages: [], unread: 0 };
    group.messages.push(m);
    if (isUnread(m, reads))
      group.unread++;
    groups.set(key, group);
  }
  return [...groups.values()];
}
var escape = (text) => text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
function replyTag(from, to, text) {
  if (!short(from, 100) || !from.trim() || !short(to, 100) || !to.trim())
    throw new Error("Your character's name or the recipient is unavailable. Reopen this chat.");
  if (!text.trim() || text.trim().length > 3000 || text.includes("\x00"))
    throw new Error("Write a reply of up to 3,000 characters.");
  return `<phone-text from="${escape(from.trim())}" to="${escape(to.trim())}">${escape(text.trim())}</phone-text>`;
}
function addReplyDraft(ctx, chatId, from, to, text) {
  const tag = replyTag(from, to, text);
  if (!ctx.composer || !((ctx.host?.capabilities?.["composer-v1"] ?? 0) >= 1))
    return { manual: true, tag };
  const state = ctx.composer.getState();
  if (!state.mounted || state.chatId !== chatId)
    throw new Error("The chat input changed. Open the original chat before adding this reply.");
  ctx.composer.insertText(`${state.text && !state.text.endsWith(`
`) ? `
` : ""}${tag}`, { at: "end" });
  try {
    const after = ctx.composer.getState();
    if (after.mounted && after.chatId === chatId)
      ctx.composer.focus();
  } catch {}
  return { manual: false, tag };
}

// src/phone-view.ts
var DESCRIPTIONS = {
  Scene: "Where the story is happening right now.",
  Weather: "Only the weather the story has established.",
  Locations: "Places that matter in this story.",
  Notes: "People, items, rules, and plans worth remembering.",
  Contacts: "What the story has established about each character.",
  Messages: "Texts actually sent in the story.",
  Settings: "Choose what the phone shows and what the AI keeps track of."
};
var FIELD_NAMES = {
  location: "Location",
  time: "Time",
  date: "Date",
  present: "Here now",
  roles: "Roles",
  physical: "Physical status",
  mood: "Mood",
  position: "Position",
  attire: "Attire",
  thoughts: "Inner thoughts"
};
var SECTION_NAMES = { people: "People to remember", items: "Key items", rules: "Rules", plots: "Pending plots", misc: "Misc" };
var SECTION_FIELDS = {
  people: ["Name", "Role or affiliation", "Why they will return / last known status"],
  items: ["Item", "Holder or location", "Story function"],
  rules: ["Subject", "Explicit rule", "Source or context"],
  plots: ["What is pending", "Who is involved", "Trigger or deadline"],
  misc: ["Label", "Value or note", ""]
};
var CONTROL_PATHS = {
  Phone: ["M7 2h10v20H7Z", "M10 18h4"],
  Back: ["m14 5-7 7 7 7"],
  Close: ["m6 6 12 12M18 6 6 18"]
};
function el(tag, cls, text) {
  const node = document.createElement(tag);
  node.className = cls;
  if (text !== undefined)
    node.textContent = text;
  return node;
}
function icon(name) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "lpt-icon");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  const nodes = HOME_ICONS[name] ?? (CONTROL_PATHS[name] ?? CONTROL_PATHS.Phone).map((d) => ["path", { d }]);
  for (const [tag, attrs] of nodes) {
    const shape = document.createElementNS("http://www.w3.org/2000/svg", tag);
    shape.setAttribute("class", "lpt-icon-path");
    for (const [key, value] of Object.entries(attrs))
      shape.setAttribute(key, value);
    svg.append(shape);
  }
  return svg;
}
function button(label, cls, fn) {
  const b = el("button", cls, label);
  b.type = "button";
  b.addEventListener("click", fn);
  return b;
}
var lines = (text) => text.split(`
`).map((s) => s.trim()).filter(Boolean);
var valueText = (cell) => {
  if (!cell)
    return "";
  const v = cell.value;
  return typeof v === "string" ? v : Array.isArray(v) ? v.join(`
`) : ("name" in v) ? v.name : v.worn.join(`
`);
};
var marked = (cell) => cell?.by === "user" ? "edited by you" : cell?.inferred ? "inferred" : "";

class PhoneView {
  mount;
  customStyle;
  actions;
  root = el("div", "lpt-root");
  launcher = button("", "lpt-launcher", () => this.open());
  frame = el("section", "lpt-frame");
  content = el("main", "lpt-content");
  heading = el("h1", "lpt-heading");
  back = button("", "lpt-back", () => this.navigate("Home"));
  error = el("p", "lpt-error");
  status = el("p", "lpt-status");
  doc = null;
  prefs = defaultPreferences();
  app = "Home";
  openState = false;
  editing = false;
  busy = false;
  cssTimer;
  observer;
  selectedText = null;
  probe = el("div", "lpt-size-probe");
  reads = emptyReads();
  pendingReads = new Set;
  chatEpoch = 0;
  replyDrafts = new Map;
  manualDrafts = new Map;
  textNotice = el("p", "lpt-text-notice");
  noticeTimer;
  connectionsInfo = { available: false, choices: [], note: "Loading connections…" };
  helperChoice = false;
  helperBusy = false;
  constructor(mount, customStyle, actions) {
    this.mount = mount;
    this.customStyle = customStyle;
    this.actions = actions;
    this.launcher.setAttribute("aria-label", "Open Lumi Phone Tracker");
    this.launcher.append(icon("Phone"));
    this.back.setAttribute("aria-label", "Back to Home");
    this.back.append(icon("Back"));
    const close = button("", "lpt-close", () => this.close());
    close.setAttribute("aria-label", "Close phone");
    close.append(icon("Close"));
    const header = el("header", "lpt-header");
    header.append(this.back, this.heading, close);
    const speaker = el("div", "lpt-speaker");
    speaker.setAttribute("aria-hidden", "true");
    this.textNotice.setAttribute("role", "status");
    this.textNotice.setAttribute("aria-live", "polite");
    this.textNotice.hidden = true;
    this.frame.setAttribute("aria-label", "Lumi Phone Tracker");
    this.frame.append(speaker, header, this.textNotice, this.content);
    this.probe.setAttribute("aria-hidden", "true");
    this.root.append(this.launcher, this.frame, this.probe);
    mount.append(this.root);
    this.root.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        this.close();
      }
    });
    this.observer = new ResizeObserver(() => this.measure());
    this.observer.observe(this.root);
    this.observer.observe(this.probe);
    this.observer.observe(this.launcher);
    this.render();
    this.setOpen(false);
  }
  receive(doc, reads) {
    const changedChat = doc?.chatId !== this.doc?.chatId;
    if (this.doc?.settings.source === "helper" && doc?.settings.source === "main")
      this.helperChoice = false;
    const previous = new Set(this.doc?.state.messages.filter((m) => m.direction === "incoming").map((m) => JSON.stringify([m.id, receipt(m)])) ?? []);
    const arrived = !changedChat && this.doc && doc?.settings.enabled.messages ? doc.state.messages.filter((m) => m.direction === "incoming" && !previous.has(JSON.stringify([m.id, receipt(m)]))) : [];
    this.doc = doc;
    if (changedChat) {
      this.chatEpoch++;
      this.pendingReads.clear();
      this.reads = reads ?? emptyReads();
      this.replyDrafts.clear();
      this.manualDrafts.clear();
      this.clearTextNotice();
      this.editing = false;
      this.app = "Home";
      this.selectedText = null;
      this.helperChoice = false;
      this.helperBusy = false;
      if (doc)
        this.loadConnections();
    } else if (reads && reads.revision >= this.reads.revision)
      this.reads = reads;
    if (!doc?.settings.enabled.messages)
      this.clearTextNotice();
    else if (arrived.length)
      this.showTextNotice(arrived.length === 1 ? `New text from ${arrived[0].from}` : `${arrived.length} new texts`);
    if (!this.editing || changedChat)
      this.render();
    else
      this.refreshBadges();
    this.markVisibleConversation();
  }
  receiveReads(reads) {
    if (reads.revision >= this.reads.revision) {
      this.reads = reads;
      this.refreshBadges();
    }
  }
  receiveHelperBusy(busy) {
    this.helperBusy = busy;
    const button2 = this.root.querySelector(".lpt-update-now");
    if (button2) {
      button2.disabled = busy;
      button2.textContent = busy ? "Please wait…" : "Update now";
    }
  }
  async loadConnections() {
    const epoch = this.chatEpoch;
    try {
      const info = await this.actions.connections();
      if (epoch !== this.chatEpoch)
        return;
      this.connectionsInfo = info;
    } catch {
      if (epoch !== this.chatEpoch)
        return;
      this.connectionsInfo = { available: false, choices: [], note: "Connections are unavailable. Main AI still works." };
    }
    if (this.app === "Settings" && !this.editing && !this.busy)
      this.render();
  }
  receivePreferences(prefs) {
    if (prefs.revision >= this.prefs.revision)
      this.prefs = prefs;
  }
  setError(message) {
    this.error.textContent = message;
  }
  setStatus(message) {
    this.status.textContent = message;
  }
  fit() {
    this.measure();
  }
  applyCSS(text) {
    const css = prepareCustomCSS(text);
    this.customStyle.textContent = css;
    requestAnimationFrame(() => this.measure());
    return css;
  }
  resetCSS() {
    clearTimeout(this.cssTimer);
    this.customStyle.textContent = "";
    this.prefs = { ...this.prefs, css: "" };
    const editor = this.root.querySelector(".lpt-css-editor");
    if (editor)
      editor.value = "";
    this.setOpen(true);
    requestAnimationFrame(() => this.measure());
  }
  open(app) {
    if (app)
      this.navigate(app);
    this.setOpen(true);
    this.back.hidden ? this.frame.querySelector(".lpt-app-button, .lpt-close")?.focus() : this.back.focus();
  }
  close() {
    this.setOpen(false);
    this.launcher.focus();
  }
  destroy() {
    clearTimeout(this.cssTimer);
    clearTimeout(this.noticeTimer);
    this.chatEpoch++;
    this.observer.disconnect();
    this.root.remove();
  }
  setOpen(open) {
    this.openState = open;
    this.root.dataset.open = String(open);
    this.frame.hidden = !open;
    this.launcher.hidden = open;
    if (open)
      this.frame.insertBefore(this.textNotice, this.content);
    else
      this.root.insertBefore(this.textNotice, this.frame);
    this.measure();
    this.markVisibleConversation();
  }
  measure() {
    const node = this.openState || !this.textNotice.hidden ? this.probe : this.launcher;
    const computed = getComputedStyle(node);
    const width = node.offsetWidth || Number.parseFloat(computed.width);
    const height = node.offsetHeight || Number.parseFloat(computed.height);
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0)
      return;
    const closedHeight = this.textNotice.hidden ? height : Math.max(48, this.root.offsetHeight);
    this.actions.size(Math.max(48, width), Math.max(48, this.openState ? height : closedHeight), this.openState);
  }
  navigate(app) {
    this.app = app;
    this.editing = false;
    this.render();
    this.content.scrollTop = 0;
    if (app === "Settings")
      this.loadConnections();
  }
  render() {
    const focused = this.mount instanceof ShadowRoot ? this.mount.activeElement : document.activeElement;
    const replyFocus = focused instanceof HTMLTextAreaElement && focused.classList.contains("lpt-reply-input") ? {
      key: focused.closest(".lpt-conversation")?.dataset.conversation,
      start: focused.selectionStart,
      end: focused.selectionEnd
    } : null;
    this.content.replaceChildren();
    this.error.textContent = "";
    this.status.textContent = "";
    this.heading.textContent = this.app === "Home" ? "Lumi Phone Tracker" : this.app;
    this.back.hidden = this.app === "Home";
    if (this.app === "Home") {
      const home = el("div", "lpt-home");
      for (const app of APPS) {
        const b = button("", "lpt-app-button", () => this.navigate(app));
        b.dataset.app = app;
        const image = el("span", "lpt-app-icon");
        image.append(icon(app));
        b.append(image, el("span", "lpt-app-label", app));
        if (app === "Messages")
          image.append(this.unreadBadge("*"));
        home.append(b);
      }
      this.content.append(home);
      if (!this.doc)
        this.content.append(el("p", "lpt-empty", "Open a chat to start keeping track of your story."));
    } else {
      if (!this.prefs.dismissed.includes(this.app))
        this.description(this.app);
      if (!this.doc && this.app !== "Settings")
        this.empty("Open a chat first. Each chat keeps its own story information.");
      else if (this.app === "Scene")
        this.scene();
      else if (this.app === "Weather")
        this.weather();
      else if (this.app === "Contacts")
        this.contacts();
      else if (this.app === "Locations")
        this.locations();
      else if (this.app === "Notes")
        this.notes();
      else if (this.app === "Messages")
        this.messages();
      else
        this.settings();
    }
    if (this.doc)
      for (const text of this.doc.state.notices) {
        const notice = el("div", "lpt-notice");
        notice.append(el("span", "lpt-notice-text", text), button("Dismiss", "lpt-dismiss", () => {
          this.change({ dismissNotice: text });
        }));
        const helperGroup = this.app === "Settings" && ["Tracker update failed", "Connection not found"].includes(text) ? this.content.querySelector(".lpt-helper-settings") : null;
        if (helperGroup)
          helperGroup.insertBefore(notice, helperGroup.children.item(1));
        else
          this.content.append(notice);
      }
    this.error.setAttribute("role", "alert");
    this.status.setAttribute("aria-live", "polite");
    this.content.append(this.error, this.status);
    this.refreshBadges();
    if (replyFocus) {
      const card = Array.from(this.content.querySelectorAll(".lpt-conversation")).find((c) => c.dataset.conversation === replyFocus.key);
      const input = card?.querySelector(".lpt-reply-input");
      if (input) {
        input.focus();
        input.setSelectionRange(replyFocus.start, replyFocus.end);
      }
    }
    requestAnimationFrame(() => this.measure());
  }
  description(app) {
    const row = el("div", "lpt-description");
    const dismiss = button("×", "lpt-dismiss", () => {
      row.remove();
      this.actions.preferences({ dismiss: app }).then((p) => {
        this.receivePreferences(p);
      }).catch(() => this.setError("That explanation could not be hidden for next time."));
    });
    dismiss.setAttribute("aria-label", `Hide ${app} explanation`);
    row.append(el("p", "lpt-description-text", DESCRIPTIONS[app]), dismiss);
    this.content.append(row);
  }
  empty(text, parent = this.content) {
    parent.append(el("p", "lpt-empty", text));
  }
  enabled(key) {
    return this.doc?.settings.enabled[key] === true;
  }
  async change(change, revision = this.doc?.revision ?? -1) {
    if (!this.doc || this.busy)
      return;
    this.busy = true;
    this.setStatus("Saving…");
    const controls = this.root.querySelectorAll(".lpt-setting input, .lpt-helper-source, .lpt-helper-connection, .lpt-form input, .lpt-form textarea, .lpt-form button, .lpt-add, .lpt-field, .lpt-delete");
    controls.forEach((control) => {
      control.disabled = true;
    });
    try {
      const doc = await this.actions.update(change, revision);
      this.editing = false;
      this.doc = doc;
      if (isRecord(change.settings) && change.settings.source === "helper" && doc.settings.source === "main")
        this.helperChoice = false;
      this.render();
      this.setStatus("Saved.");
    } catch (e) {
      this.setStatus("");
      this.setError(e instanceof Error ? e.message : "Could not save. Your changes are still here.");
    } finally {
      this.busy = false;
      controls.forEach((control) => {
        control.disabled = false;
      });
    }
  }
  form(parent, fields, save) {
    if (this.editing)
      return;
    this.editing = true;
    const revision = this.doc?.revision ?? -1;
    const form = el("form", "lpt-form");
    const controls = new Map;
    for (const f of fields) {
      const label = el("label", "lpt-label", f.label);
      const input = f.multiline ? el("textarea", "lpt-textarea") : el("input", f.check ? "lpt-toggle" : "lpt-input");
      if (input instanceof HTMLInputElement)
        input.type = f.check ? "checkbox" : "text";
      if (f.check && input instanceof HTMLInputElement)
        input.checked = f.value === "true";
      else
        input.value = f.value;
      input.required = f.required === true;
      input.maxLength = f.max ?? 500;
      input.name = f.key;
      controls.set(f.key, input);
      label.append(input);
      form.append(label);
    }
    const actions = el("div", "lpt-actions");
    const submit = el("button", "lpt-save", "Save");
    submit.type = "submit";
    actions.append(submit, button("Cancel", "lpt-cancel", () => {
      this.editing = false;
      this.render();
    }));
    form.append(actions);
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const values = {};
      for (const [key, input] of controls)
        values[key] = input instanceof HTMLInputElement && input.type === "checkbox" ? input.checked : input.value.trim();
      this.change(save(values), revision);
    });
    parent.append(form);
    controls.values().next().value?.focus();
  }
  field(parent, key, cell, target, contact) {
    const name = FIELD_NAMES[key] ?? "Weather";
    const b = button("", `lpt-field${key === "location" ? " lpt-location" : ""}`, () => {
      const value = cell?.value;
      const fields = key === "location" ? [
        { key: "value", label: "Exact location", value: valueText(cell), required: true, max: 100 },
        { key: "wider", label: "Wider places, one per line (only if known)", value: value && typeof value === "object" && "wider" in value ? value.wider.join(`
`) : "", multiline: true }
      ] : key === "attire" ? [
        { key: "worn", label: "Currently worn — one item per line", value: value && typeof value === "object" && "worn" in value ? value.worn.join(`
`) : "", multiline: true, max: 4000 },
        { key: "removed", label: "Recently removed — one item per line", value: value && typeof value === "object" && "removed" in value ? value.removed.join(`
`) : "", multiline: true, max: 4000 }
      ] : [{ key: "value", label: `${name}${["present", "roles"].includes(key) ? " — one name or role per line" : ""}`, value: valueText(cell), multiline: ["present", "roles", "position", "physical"].includes(key), max: ["present", "roles"].includes(key) ? 4000 : 500 }];
      this.form(parent, fields, (values) => {
        const value = key === "location" ? { name: values.value, wider: lines(String(values.wider)) } : key === "attire" ? { worn: lines(String(values.worn)), removed: lines(String(values.removed)) } : ["present", "roles"].includes(key) ? lines(String(values.value)) : values.value;
        return { edit: { target, ...contact ? { name: contact.name, value: { [key]: value } } : { field: key, value } } };
      });
    });
    b.setAttribute("aria-label", `Edit ${name}${contact ? ` for ${contact.name}` : ""}`);
    b.append(el("span", "lpt-field-label", name));
    if (key === "present" && Array.isArray(cell?.value)) {
      const list = el("ul", "lpt-present-list");
      for (const name of cell.value)
        list.append(el("li", "lpt-present-name", name));
      if (cell.value.length)
        b.append(list);
      else
        b.append(el("span", "lpt-field-value", "No one listed."));
    } else {
      let text = valueText(cell) || "Not established yet. Tap to add.";
      if (key === "roles" && Array.isArray(cell?.value))
        text = cell.value.join(" / ") || "No roles listed.";
      b.append(el("span", "lpt-field-value", text));
      const v = cell?.value;
      if (key === "location" && v && typeof v === "object" && "wider" in v && v.wider.length)
        b.append(el("span", "lpt-wider", v.wider.join(" · ")));
      if (key === "attire" && v && typeof v === "object" && "removed" in v)
        b.append(el("span", "lpt-wider", `Removed: ${v.removed.join(" / ") || "none listed"}`));
    }
    if (marked(cell))
      b.append(el("span", "lpt-marker", marked(cell)));
    parent.append(b);
  }
  scene() {
    const section = el("section", "lpt-scene");
    for (const key of SCENE_KEYS)
      if (this.enabled(`scene.${key}`))
        this.field(section, key, this.doc.state.scene[key], "scene");
    if (!section.children.length)
      this.empty("Scene fields are off. Turn them on in Settings.", section);
    this.content.append(section);
  }
  weather() {
    const section = el("section", "lpt-weather");
    if (this.enabled("weather"))
      this.field(section, "weather", this.doc.state.weather, "weather");
    else
      this.empty("Weather is off. Turn it on in Settings.", section);
    this.content.append(section);
  }
  deleteAction(parent, edit) {
    const b = button("Delete", "lpt-delete", () => {
      const row = el("div", "lpt-actions");
      row.append(el("span", "lpt-help", "Delete this entry?"), button("Delete", "lpt-delete", () => {
        this.change({ edit: { ...edit, remove: true } });
      }), button("Cancel", "lpt-cancel", () => row.remove()));
      b.replaceWith(row);
    });
    parent.append(b);
  }
  contacts() {
    const section = el("section", "lpt-contacts");
    this.content.append(section);
    const enabledFields = CONTACT_KEYS.filter((k) => this.enabled(`contacts.${k}`));
    if (!enabledFields.length) {
      this.empty("Contact fields are off. Turn them on in Settings.", section);
      return;
    }
    section.append(button("+ Add contact", "lpt-add", () => this.contactForm(section)));
    const v = this.doc.state.scene.present?.value;
    const present = new Set((Array.isArray(v) ? v : []).map(normalize));
    const contacts = this.doc.state.contacts;
    for (const c of contacts.filter((c) => present.has(normalize(c.name))))
      this.contactCard(section, c, true);
    const absent = contacts.filter((c) => !present.has(normalize(c.name)));
    if (absent.length) {
      const group = el("details", "lpt-absent lpt-section");
      group.append(el("summary", "lpt-summary", `Not here now (${absent.length})`));
      for (const c of absent)
        this.contactCard(group, c, false);
      section.append(group);
    }
    if (!contacts.length)
      this.empty("No contacts yet. Named characters appear when the story establishes them.", section);
  }
  contactCard(parent, c, here) {
    const card = el("details", "lpt-card lpt-contact");
    const summary = el("summary", "lpt-summary");
    summary.append(el("span", "lpt-card-title", c.name), ...c.player ? [el("span", "lpt-marker", "You")] : []);
    if (c.editedByUser)
      summary.append(el("span", "lpt-marker", "edited by you"));
    if (!c.player && this.enabled("contacts.roles") && Array.isArray(c.fields.roles?.value) && c.fields.roles.value.length)
      summary.append(el("span", "lpt-card-subtitle", c.fields.roles.value.join(" / ")));
    summary.append(el("span", "lpt-card-subtitle", here ? "Here now" : `Last seen: ${c.lastSeen ?? "not established"}`));
    const body = el("div", "lpt-card-body");
    for (const key of CONTACT_KEYS)
      if (this.enabled(`contacts.${key}`) && (!c.player || ["physical", "position", "attire"].includes(key)))
        this.field(body, key, c.fields[key], "contact", c);
    const actions = el("div", "lpt-actions");
    const openTexts = button("Open texts", "lpt-open-texts", () => {
      this.selectedText = normalize(c.name);
      this.navigate("Messages");
      this.markVisibleConversation();
    });
    openTexts.append(this.unreadBadge(normalize(c.name)));
    actions.append(button("Edit name", "lpt-button", () => this.contactForm(body, c)), openTexts);
    this.deleteAction(actions, { target: "contact", name: c.name });
    body.append(actions);
    card.append(summary, body);
    parent.append(card);
  }
  contactForm(parent, contact) {
    if (!contact && this.doc.state.contacts.length >= 30) {
      this.setError("Contacts is full (30/30). Delete a contact to make room.");
      return;
    }
    this.form(parent, [{ key: "name", label: "Name", value: contact?.name ?? "", required: true, max: 100 }], (v) => ({ edit: {
      target: "contact",
      name: contact?.name ?? String(v.name),
      ...contact && v.name !== contact.name ? { rename: String(v.name) } : {},
      value: {}
    } }));
  }
  locations() {
    const section = el("section", "lpt-locations");
    this.content.append(section);
    if (!this.enabled("locations")) {
      this.empty("Locations is off. Turn it on in Settings.", section);
      return;
    }
    section.append(button("+ Add place", "lpt-add", () => this.locationForm(section)));
    const current = this.doc.state.scene.location?.value;
    const currentName = current && typeof current === "object" && "name" in current ? current.name : "";
    const places = this.doc.state.locations;
    for (const place of places) {
      const card = el("details", "lpt-card lpt-place");
      const summary = el("summary", "lpt-summary");
      summary.append(el("span", "lpt-card-title", place.name));
      if (this.enabled("scene.location") && normalize(place.name) === normalize(currentName))
        summary.append(el("span", "lpt-marker", "Current"));
      if (place.by === "user")
        summary.append(el("span", "lpt-marker", "edited by you"));
      const body = el("div", "lpt-card-body");
      body.append(el("p", "lpt-place-description", place.description || "No description established yet."));
      if (place.relation)
        body.append(el("p", "lpt-help", place.relation));
      const actions = el("div", "lpt-actions");
      actions.append(button("Edit", "lpt-button", () => this.locationForm(body, place)));
      this.deleteAction(actions, { target: "location", name: place.name });
      body.append(actions);
      card.append(summary, body);
      section.append(card);
    }
    if (!places.length)
      this.empty("No places yet. This fills in when the story establishes a meaningful place.", section);
  }
  locationForm(parent, place) {
    if (!place && this.doc.state.locations.length >= 30) {
      this.setError("Locations is full (30/30). Delete a place to make room.");
      return;
    }
    this.form(parent, [
      { key: "name", label: "Place name", value: place?.name ?? "", required: true, max: 100 },
      { key: "description", label: "Short description", value: place?.description ?? "", multiline: true },
      { key: "relation", label: "How it relates to another place (optional)", value: place?.relation ?? "" }
    ], (v) => ({ edit: { target: "location", name: place?.name ?? String(v.name), ...place && v.name !== place.name ? { rename: String(v.name) } : {}, value: { description: v.description, relation: v.relation } } }));
  }
  notes() {
    const section = el("section", "lpt-notes");
    this.content.append(section);
    let shown = false;
    for (const key of SECTIONS) {
      if (!this.enabled(`notes.${key}`))
        continue;
      shown = true;
      const group = el("details", "lpt-section lpt-note-section");
      group.dataset.section = key;
      const summary = el("summary", "lpt-summary lpt-section-header");
      const count = this.doc.state.notes[key].filter((n) => !n.resolved).length;
      summary.append(el("span", "lpt-section-title", SECTION_NAMES[key]), el("span", "lpt-counter", `${count}/${this.doc.settings.notesPerSection}`));
      const add = button("+ Add", "lpt-add", () => {
        group.open = true;
        this.noteForm(body, key);
      });
      add.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
      summary.append(add);
      const body = el("div", "lpt-section-body");
      group.append(summary, body);
      const notes = this.doc.state.notes[key];
      for (const note of notes.filter((n) => !n.resolved))
        this.noteCard(body, key, note);
      if (!notes.filter((n) => !n.resolved).length)
        this.empty(`No ${SECTION_NAMES[key].toLocaleLowerCase()} yet. Add one, or let the story establish it.`, body);
      const resolved = notes.filter((n) => n.resolved);
      if (resolved.length) {
        const old = el("details", "lpt-resolved");
        old.append(el("summary", "lpt-summary", `Resolved (${resolved.length})`));
        for (const note of resolved)
          this.noteCard(old, key, note);
        body.append(old);
      }
      section.append(group);
    }
    if (!shown)
      this.empty("All Notes sections are off. Turn one on in Settings.", section);
  }
  noteCard(parent, key, note) {
    const card = el("details", "lpt-card lpt-note");
    const summary = el("summary", "lpt-summary");
    summary.append(el("span", "lpt-note-line", [note.name, note.detail, note.context].filter(Boolean).join(" | ")));
    if (note.addedByUser)
      summary.append(el("span", "lpt-marker", "added by you"));
    if (note.by === "user" && (!note.addedByUser || note.updated))
      summary.append(el("span", "lpt-marker", "edited by you"));
    if (note.updated)
      summary.append(el("span", "lpt-marker", "Updated"));
    const body = el("div", "lpt-card-body");
    body.append(el("p", "lpt-note-full", [note.name, note.detail, note.context].filter(Boolean).join(" | ")));
    const actions = el("div", "lpt-actions");
    actions.append(button("Edit", "lpt-button", () => this.noteForm(body, key, note)));
    this.deleteAction(actions, { target: "note", section: key, name: note.name });
    body.append(actions);
    card.append(summary, body);
    parent.append(card);
  }
  noteForm(parent, key, note) {
    if (!note && this.doc.state.notes[key].filter((n) => !n.resolved).length >= this.doc.settings.notesPerSection) {
      this.setError("This section is full. Delete a note to make room.");
      return;
    }
    const labels = SECTION_FIELDS[key];
    const fields = [
      { key: "name", label: labels[0], value: note?.name ?? "", required: true, max: 100 },
      { key: "detail", label: labels[1], value: note?.detail ?? "", multiline: true, max: 240 }
    ];
    if (labels[2])
      fields.push({ key: "context", label: labels[2], value: note?.context ?? "", max: 240 });
    if (key === "plots")
      fields.push({ key: "resolved", label: "Resolved", value: String(note?.resolved ?? false), check: true });
    if (key === "misc")
      fields.push({ key: "sendToAI", label: "Send to AI", value: String(note?.sendToAI ?? false), check: true });
    this.form(parent, fields, (v) => ({ edit: {
      target: "note",
      section: key,
      name: note?.name ?? String(v.name),
      ...note && v.name !== note.name ? { rename: String(v.name) } : {},
      value: {
        detail: v.detail,
        context: v.context ?? "",
        ...key === "plots" ? { resolved: v.resolved } : {},
        ...key === "misc" ? { sendToAI: v.sendToAI } : {}
      }
    } }));
  }
  messages() {
    const section = el("section", "lpt-messages");
    this.content.append(section);
    if (!this.enabled("messages")) {
      this.empty("Messages is off. Turn it on in Settings.", section);
      return;
    }
    const threads = conversations(this.doc.state.messages, this.reads);
    if (this.selectedText !== null && !threads.some((t) => t.key === this.selectedText)) {
      const contact = this.doc.state.contacts.find((c) => normalize(c.name) === this.selectedText);
      if (contact)
        threads.push({ key: normalize(contact.name), name: contact.name, messages: [], unread: 0 });
    }
    if (!threads.length)
      this.empty("No texts yet. Texts actually sent in the story appear here, grouped by sender.", section);
    for (const thread of threads)
      this.conversation(section, thread);
  }
  conversation(parent, thread) {
    const chatId = this.doc.chatId;
    const card = el("details", "lpt-card lpt-conversation");
    card.dataset.conversation = thread.key;
    const summary = el("summary", "lpt-summary");
    summary.append(el("span", "lpt-card-title", thread.name), this.unreadBadge(thread.key));
    if (!thread.key)
      summary.append(el("span", "lpt-card-subtitle", "Recipient not stated"));
    const body = el("div", "lpt-card-body");
    const list = el("div", "lpt-text-list");
    for (const message of thread.messages) {
      const item = el("article", `lpt-text-message${message.direction === "outgoing" ? " lpt-outgoing" : " lpt-incoming"}`);
      item.append(el("p", "lpt-text-sender", `${message.direction === "outgoing" ? "You · " : ""}${message.from}`), el("p", "lpt-text-body", message.text));
      if (message.time)
        item.append(el("span", "lpt-text-time", message.time));
      list.append(item);
    }
    if (!thread.messages.length)
      this.empty("No texts sent here yet. Your reply will appear only after you send it from the chat input.", list);
    body.append(list);
    if (thread.key) {
      const form = el("form", "lpt-reply");
      const label = el("label", "lpt-label", `Reply to ${thread.name}`);
      const input = el("textarea", "lpt-textarea lpt-reply-input");
      input.maxLength = 3000;
      input.required = true;
      input.value = this.replyDrafts.get(thread.key) ?? "";
      input.addEventListener("input", () => {
        if (this.doc?.chatId === chatId)
          this.replyDrafts.set(thread.key, input.value);
      });
      label.append(input);
      const add = el("button", "lpt-button lpt-add-draft", "Add to draft");
      add.type = "submit";
      const status = el("p", "lpt-reply-status lpt-help");
      status.setAttribute("aria-live", "polite");
      const fallback = el("textarea", "lpt-textarea lpt-manual-tag");
      fallback.readOnly = true;
      fallback.setAttribute("aria-label", "Text tag to copy into the chat input");
      fallback.value = this.manualDrafts.get(thread.key) ?? "";
      fallback.hidden = !fallback.value;
      if (fallback.value)
        status.textContent = "Drafting is unavailable here. Copy this tag into the chat input, then review and send it yourself.";
      form.append(label, add, el("p", "lpt-help", "Adds to the chat input for you to review. It does not send."), status, fallback);
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        try {
          const result = this.actions.draft(chatId, thread.name, input.value);
          if (result.manual) {
            this.manualDrafts.set(thread.key, result.tag);
            fallback.value = result.tag;
            fallback.hidden = false;
            status.textContent = "Drafting is unavailable here. Copy this tag into the chat input, then review and send it yourself.";
            fallback.select();
          } else {
            this.replyDrafts.delete(thread.key);
            this.manualDrafts.delete(thread.key);
            input.value = "";
            fallback.value = "";
            fallback.hidden = true;
            status.textContent = "Added to the chat draft. Review it there and send it yourself.";
          }
        } catch (error) {
          status.textContent = error instanceof Error ? error.message : "Could not add to the draft. Your reply is still here.";
        }
      });
      body.append(form);
    }
    card.append(summary, body);
    parent.append(card);
    card.open = this.selectedText === thread.key;
    card.addEventListener("toggle", () => {
      if (card.open) {
        this.selectedText = thread.key;
        for (const other of Array.from(this.content.querySelectorAll(".lpt-conversation")))
          if (other !== card)
            other.open = false;
        this.markVisibleConversation();
      } else if (this.selectedText === thread.key)
        this.selectedText = null;
    });
  }
  unreadBadge(key) {
    const badge = el("span", "lpt-unread-badge");
    badge.dataset.unreadFor = key;
    badge.hidden = true;
    return badge;
  }
  refreshBadges() {
    const counts = new Map(conversations(this.doc?.state.messages ?? [], this.reads).map((t) => [t.key, t.unread]));
    for (const badge of Array.from(this.root.querySelectorAll(".lpt-unread-badge"))) {
      const count = !this.enabled("messages") ? 0 : badge.dataset.unreadFor === "*" ? [...counts.values()].reduce((a, b) => a + b, 0) : counts.get(badge.dataset.unreadFor ?? "") ?? 0;
      badge.hidden = !count;
      badge.textContent = String(count);
      badge.setAttribute("aria-label", `${count} unread texts`);
    }
  }
  markVisibleConversation() {
    if (!this.doc || !this.openState || this.app !== "Messages" || this.selectedText === null || !this.enabled("messages") || document.visibilityState === "hidden")
      return;
    const visibleCard = Array.from(this.content.querySelectorAll(".lpt-conversation")).find((c) => c.open && c.dataset.conversation === this.selectedText);
    if (!visibleCard || !this.frame.getClientRects().length)
      return;
    const observed = this.doc.state.messages.filter((m) => threadKey(m) === this.selectedText && isUnread(m, this.reads)).map((m) => ({ id: m.id, receipt: receipt(m) }));
    if (!observed.length)
      return;
    const chatId = this.doc.chatId;
    const epoch = this.chatEpoch;
    const key = this.selectedText;
    const pendingKey = JSON.stringify([chatId, key, observed]);
    if (this.pendingReads.has(pendingKey))
      return;
    this.pendingReads.add(pendingKey);
    this.actions.markRead(chatId, key, observed).then((value) => {
      if (epoch === this.chatEpoch && this.doc?.chatId === chatId)
        this.receiveReads(value);
    }).catch(() => {
      if (epoch === this.chatEpoch && this.doc?.chatId === chatId)
        this.setError("Read status could not be saved. Reopen this conversation to try again.");
    }).finally(() => this.pendingReads.delete(pendingKey));
  }
  clearTextNotice() {
    clearTimeout(this.noticeTimer);
    this.textNotice.textContent = "";
    this.textNotice.hidden = true;
    this.root.dataset.notice = "false";
  }
  showTextNotice(text) {
    this.clearTextNotice();
    this.textNotice.textContent = text;
    this.textNotice.hidden = false;
    this.root.dataset.notice = "true";
    this.noticeTimer = setTimeout(() => {
      this.clearTextNotice();
      this.measure();
    }, 5000);
    requestAnimationFrame(() => this.measure());
  }
  settings() {
    const section = el("section", "lpt-settings");
    this.content.append(section);
    if (this.doc) {
      this.helperSettings(section);
      const groups = [
        ["Scene", [["scene.location", "Location", "Exact place and known wider places."], ["scene.time", "Time", "The established story time."], ["scene.date", "Date", "The established story date."], ["scene.present", "Who is present", "Everyone here now, by name."]]],
        ["Weather", [["weather", "Weather", "Only weather established by the story."]]],
        ["Locations", [["locations", "Locations", "Meaningful places and their known details."]]],
        ["Contacts", CONTACT_KEYS.map((k) => [`contacts.${k}`, FIELD_NAMES[k], { roles: "Ordered roles or affiliations.", physical: "Observable body condition, not emotions.", mood: "Established mood, NPCs only.", position: "Facing and position relative to others.", attire: "Complete worn items and recently removed items.", thoughts: "One short private line, NPCs only." }[k]])],
        ["Notes", SECTIONS.map((k) => [`notes.${k}`, SECTION_NAMES[k], { people: "People with a clear reason to return.", items: "Items with a specific story function.", rules: "Explicit principles or restrictions.", plots: "Concrete promises, meetings, and pending events.", misc: "Your own notes; you choose what the AI sees." }[k]])],
        ["Messages", [["messages", "Messages", "Texts actually sent in the story."]]]
      ];
      for (const [title, switches] of groups) {
        const group = el("section", "lpt-settings-group lpt-section");
        group.append(el("h2", "lpt-section-title", title));
        for (const [key, label, description] of switches)
          this.toggle(group, label, description, this.enabled(key), (value) => ({ enabled: { [key]: value } }));
        if (title === "Contacts")
          this.toggle(group, "Let the AI fill in missing details", "Off by default. New inferred contact values are marked.", this.doc.settings.inferMissing, (inferMissing) => ({ inferMissing }));
        if (title === "Messages")
          this.toggle(group, "Let the AI write texts for my character", "Off by default. Your own sent texts still count.", this.doc.settings.aiPlayerTexts, (aiPlayerTexts) => ({ aiPlayerTexts }));
        section.append(group);
      }
    } else
      this.empty("Open a chat to change what is tracked. Appearance can still be reset here.", section);
    const advanced = el("details", "lpt-advanced");
    advanced.append(el("summary", "lpt-summary", "Advanced"));
    if (this.doc) {
      this.number(advanced, "Recent messages to keep texts from", "Older text tags are left out of the AI's history.", "keepTexts", 1);
      this.number(advanced, "Keep tracker blocks in the last N messages", "0 sends continuity through the phone summaries only.", "keepTrackers", 0);
      this.number(advanced, "Notes per section", "Existing notes stay when you lower the limit.", "notesPerSection", 3, 30);
      this.number(advanced, "Log lines sent to the AI", "The phone still shows every note.", "logLines", 1);
    }
    const cssGroup = el("details", "lpt-custom-css");
    cssGroup.append(el("summary", "lpt-summary", "Custom CSS"));
    const label = el("label", "lpt-label", "Custom CSS");
    const input = el("textarea", "lpt-css-editor");
    input.value = this.prefs.css;
    input.maxLength = 32000;
    input.spellcheck = false;
    label.append(input);
    cssGroup.append(label, el("p", "lpt-help", "Changes apply while you type. To restore the default look, use Reset appearance in the Phone sidebar entry."));
    input.addEventListener("input", () => {
      clearTimeout(this.cssTimer);
      try {
        this.applyCSS(input.value);
        this.setError("");
        this.cssTimer = setTimeout(() => {
          this.actions.preferences({ css: input.value }).then((p) => {
            this.receivePreferences(p);
            this.setStatus("Appearance saved.");
          }).catch(() => this.setError("Appearance could not be saved. Try again."));
        }, 400);
      } catch (e) {
        this.setError(e instanceof Error ? e.message : "That CSS could not be applied.");
      }
    });
    advanced.append(cssGroup);
    section.append(advanced);
  }
  helperSettings(parent) {
    const group = el("section", "lpt-section lpt-helper-settings");
    group.append(el("h2", "lpt-section-title", "Tracker source"));
    const sourceLabel = el("label", "lpt-label", "Who updates the tracker");
    const source = el("select", "lpt-input lpt-helper-source");
    for (const [value, label] of [["main", "Main AI"], ["helper", "Helper AI"]]) {
      const option = el("option", "lpt-option", label);
      option.value = value;
      source.append(option);
    }
    source.value = this.doc.settings.source === "helper" || this.helperChoice ? "helper" : "main";
    source.addEventListener("change", () => {
      this.helperChoice = source.value === "helper";
      if (source.value === "main")
        this.change({ settings: { source: "main" } });
      else if (this.doc.settings.connection_id && this.connectionsInfo.available)
        this.change({ settings: { source: "helper" } });
      else
        this.render();
    });
    sourceLabel.append(source);
    group.append(sourceLabel);
    group.append(el("p", "lpt-help", "Main AI uses your normal reply. Helper AI makes a separate request."));
    if (source.value === "helper") {
      group.append(el("p", "lpt-help", "Requests may cost money depending on the model chosen."));
      const label = el("label", "lpt-label", "Connection");
      const select = el("select", "lpt-input lpt-helper-connection");
      const empty = el("option", "lpt-option", "Choose a connection");
      empty.value = "";
      select.append(empty);
      for (const choice of this.connectionsInfo.choices) {
        const option = el("option", "lpt-option", choice.label);
        option.value = choice.id;
        select.append(option);
      }
      select.value = this.doc.settings.connection_id ?? "";
      select.disabled = !this.connectionsInfo.available;
      select.addEventListener("change", () => {
        if (select.value)
          this.change({ settings: { source: "helper", connection_id: select.value } });
      });
      label.append(select);
      group.append(label);
      if (this.connectionsInfo.note)
        group.append(el("p", "lpt-help", this.connectionsInfo.note));
      if (this.doc.settings.source !== "helper")
        group.append(el("p", "lpt-help", "Choose a connection to turn Helper AI on."));
      this.number(group, "Messages to read", "Only these recent messages and the compact tracker are sent.", "helperMessages", 1, 10);
      if (this.doc.settings.source === "helper") {
        const update = button(this.helperBusy ? "Please wait…" : "Update now", "lpt-button lpt-update-now", () => {
          const epoch = this.chatEpoch;
          update.disabled = true;
          this.actions.updateNow().catch(() => {
            if (epoch === this.chatEpoch)
              this.setError("Tracker update failed");
          }).finally(() => {
            if (epoch === this.chatEpoch)
              update.disabled = this.helperBusy;
          });
        });
        update.disabled = this.helperBusy;
        group.append(update);
      }
    }
    parent.append(group);
  }
  toggle(parent, name, description, checked, update) {
    const row = el("label", "lpt-setting");
    const text = el("span", "lpt-setting-text");
    text.append(el("span", "lpt-setting-label", name), el("span", "lpt-setting-description", description));
    const input = el("input", "lpt-toggle");
    input.type = "checkbox";
    input.checked = checked;
    input.addEventListener("change", () => {
      this.change({ settings: update(input.checked) });
    });
    row.append(text, input);
    parent.append(row);
  }
  number(parent, title, description, key, min, max) {
    const row = el("label", "lpt-setting");
    const text = el("span", "lpt-setting-text");
    text.append(el("span", "lpt-setting-label", title), el("span", "lpt-setting-description", description));
    const input = el("input", "lpt-number");
    input.type = "number";
    input.min = String(min);
    input.step = "1";
    if (max !== undefined)
      input.max = String(max);
    input.value = String(this.doc.settings[key]);
    input.addEventListener("change", () => {
      if (input.reportValidity())
        this.change({ settings: { [key]: Number(input.value) } });
    });
    row.append(text, input);
    parent.append(row);
  }
}

// src/styles.css
var styles_default = `/* All phone defaults live on this one root. Theme tokens are documented by Lumiverse. */
.lpt-root {
  --lpt-text: var(--lumiverse-text, CanvasText);
  --lpt-muted: var(--lumiverse-text-muted, GrayText);
  --lpt-phone-bg: #19171f;
  --lpt-screen-bg: #19171f;
  --lpt-card-bg: #24212d;
  --lpt-fill: var(--lpt-screen-bg);
  --lpt-subtle: var(--lpt-card-bg);
  --lpt-accent: var(--lumiverse-accent, Highlight);
  --lpt-accent-text: var(--lumiverse-accent-fg, HighlightText);
  --lpt-border: var(--lumiverse-border, ButtonBorder);
  --lpt-hover-border: var(--lumiverse-border-hover, ButtonBorder);
  --lpt-radius: var(--lumiverse-radius, 10px);
  --lpt-frame-radius: calc(var(--lpt-radius) * 3);
  --lpt-font: inherit;
  --lpt-font-size: 14px;
  --lpt-small-font-size: 12px;
  --lpt-title-size: 21px;
  --lpt-location-size: 26px;
  --lpt-weight: 450;
  --lpt-strong-weight: 650;
  --lpt-line-height: 1.5;
  --lpt-space: 8px;
  --lpt-width: 350px;
  --lpt-height: 590px;
  --lpt-launcher-size: 48px;
  --lpt-icon-size: 24px;
  --lpt-icon-stroke-size: 2px;
  --lpt-control-size: 38px;
  --lpt-border-size: 1px;
  --lpt-frame-border-size: 3px;
  --lpt-shadow: 0 10px 38px color-mix(in srgb, var(--lpt-text) 13%, transparent);
  --lpt-icon-fill: color-mix(in srgb, var(--lpt-accent) 10%, var(--lpt-fill));
  --lpt-focus-size: 2px;
  --lpt-opacity-disabled: .55;
  --lpt-grid-columns: 3;
  --lpt-max-label-width: 18rem;
  color: var(--lpt-text); font-family: var(--lpt-font); font-size: var(--lpt-font-size);
  line-height: var(--lpt-line-height); font-weight: var(--lpt-weight);
  box-sizing: border-box; width: fit-content; max-width: 100%;
}
/* Composite translucent theme fills over explicit dark defaults, with alpha 1.
   Older browsers retain the solid defaults. All editable tokens stay on lpt-root. */
@supports (color: rgb(from red calc(r * alpha + 25 * (1 - alpha)) g b / 1)) {
  .lpt-root {
    --lpt-phone-bg: rgb(from var(--lumiverse-fill, #19171f) calc(r * alpha + 25 * (1 - alpha)) calc(g * alpha + 23 * (1 - alpha)) calc(b * alpha + 31 * (1 - alpha)) / 1);
    --lpt-screen-bg: var(--lpt-phone-bg);
    --lpt-card-bg: color-mix(in srgb, rgb(from var(--lumiverse-fill-subtle, #24212d) calc(r * alpha + 36 * (1 - alpha)) calc(g * alpha + 33 * (1 - alpha)) calc(b * alpha + 45 * (1 - alpha)) / 1) 92%, rgb(from var(--lumiverse-text, #ece9f1) r g b / 1) 8%);
  }
}
.lpt-frame, .lpt-root[data-open="true"] { background-color: var(--lpt-phone-bg); }
.lpt-content, .lpt-header, .lpt-home, .lpt-scene, .lpt-weather, .lpt-locations,
.lpt-notes, .lpt-contacts, .lpt-messages, .lpt-settings { background-color: var(--lpt-screen-bg); }
.lpt-card, .lpt-section { background-color: var(--lpt-card-bg); }
.lpt-root *, .lpt-root *::before, .lpt-root *::after { box-sizing: border-box; }
.lpt-root[data-open="true"] { width: 100%; height: 100%; }
.lpt-root[data-open="false"][data-notice="true"] { width: 100%; }
.lpt-app-icon { position: relative; }
.lpt-unread-badge { display: inline-block; min-width: calc(var(--lpt-space) * 2.5); padding: 0 calc(var(--lpt-space) / 2); margin-left: var(--lpt-space); border-radius: var(--lpt-radius); color: var(--lpt-accent-text); background: var(--lpt-accent); font-size: var(--lpt-small-font-size); text-align: center; }
.lpt-app-icon > .lpt-unread-badge { position: absolute; top: calc(var(--lpt-space) / -2); right: calc(var(--lpt-space) / -2); }
.lpt-text-notice { flex-shrink: 0; margin: var(--lpt-space); padding: var(--lpt-space); border: var(--lpt-border-size) solid var(--lpt-border); border-radius: var(--lpt-radius); color: var(--lpt-text); background: var(--lpt-card-bg); font-size: var(--lpt-small-font-size); overflow-wrap: anywhere; }
.lpt-text-message { margin: var(--lpt-space) 0; padding: var(--lpt-space); background: var(--lpt-screen-bg); border: var(--lpt-border-size) solid var(--lpt-border); border-radius: var(--lpt-radius); overflow-wrap: anywhere; }
.lpt-outgoing { border-color: var(--lpt-accent); }
.lpt-text-sender { font-size: var(--lpt-small-font-size); font-weight: var(--lpt-strong-weight); margin: 0; }
.lpt-text-body { white-space: pre-wrap; margin: calc(var(--lpt-space) / 2) 0; }
.lpt-text-time { color: var(--lpt-muted); font-size: var(--lpt-small-font-size); }
.lpt-reply { display: grid; gap: var(--lpt-space); margin-top: var(--lpt-space); }
.lpt-reply-status { margin: 0; }
.lpt-reply-status:empty { display: none; }
.lpt-size-probe { visibility: hidden; pointer-events: none; position: fixed; width: var(--lpt-width); height: var(--lpt-height); max-width: calc(100vw - var(--lpt-space) * 4); max-height: calc(100dvh - var(--lpt-space) * 12); }
.lpt-root [hidden] { display: none !important; }
.lpt-root button, .lpt-root input, .lpt-root textarea, .lpt-root select { font: inherit; color: inherit; }
.lpt-option { color: var(--lpt-text); background: var(--lpt-screen-bg); }
.lpt-root button { cursor: pointer; }
.lpt-root button:disabled { opacity: var(--lpt-opacity-disabled); cursor: default; }
.lpt-root :focus-visible { outline: var(--lpt-focus-size) solid var(--lpt-accent); outline-offset: var(--lpt-focus-size); }
.lpt-launcher { display: grid; place-items: center; width: var(--lpt-launcher-size); height: var(--lpt-launcher-size); border-radius: var(--lpt-radius); background: var(--lpt-fill); color: var(--lpt-accent); border: var(--lpt-border-size) solid var(--lpt-border); box-shadow: var(--lpt-shadow); }
.lpt-icon { width: var(--lpt-icon-size); height: var(--lpt-icon-size); flex-shrink: 0; }
.lpt-icon-path { fill: none; stroke: currentColor; stroke-width: var(--lpt-icon-stroke-size); stroke-linecap: round; stroke-linejoin: round; }
.lpt-frame { width: 100%; height: 100%; max-width: 100%; max-height: 100%; background: var(--lpt-phone-bg); border: var(--lpt-frame-border-size) solid var(--lpt-border); border-radius: var(--lpt-frame-radius); box-shadow: var(--lpt-shadow); display: flex; flex-direction: column; overflow: hidden; }
.lpt-speaker { width: calc(var(--lpt-space) * 4); height: calc(var(--lpt-border-size) * 3); margin: var(--lpt-space) auto 0; background: var(--lpt-border); border-radius: var(--lpt-radius); flex-shrink: 0; }
.lpt-header { display: flex; gap: var(--lpt-space); align-items: center; padding: var(--lpt-space) calc(var(--lpt-space) * 2); flex-shrink: 0; }
.lpt-heading { margin: 0; flex: 1; font-size: var(--lpt-title-size); font-weight: var(--lpt-strong-weight); }
.lpt-back, .lpt-close, .lpt-dismiss { display: grid; place-items: center; padding: calc(var(--lpt-space) / 2); min-width: var(--lpt-control-size); min-height: var(--lpt-control-size); background: transparent; border: 0; border-radius: var(--lpt-radius); color: var(--lpt-muted); }
.lpt-content { flex: 1; min-height: 0; overflow: auto; overscroll-behavior: contain; padding: var(--lpt-space) calc(var(--lpt-space) * 2) calc(var(--lpt-space) * 3); }
.lpt-home { display: grid; grid-template-columns: repeat(var(--lpt-grid-columns), minmax(0, 1fr)); gap: calc(var(--lpt-space) * 2) var(--lpt-space); padding-top: calc(var(--lpt-space) * 2); }
.lpt-app-button { display: flex; flex-direction: column; align-items: center; gap: var(--lpt-space); padding: var(--lpt-space) 0; border: 0; background: transparent; border-radius: var(--lpt-radius); min-width: 0; }
.lpt-app-icon { display: grid; place-items: center; width: calc(var(--lpt-icon-size) * 2.3); height: calc(var(--lpt-icon-size) * 2.3); background: var(--lpt-icon-fill); border: var(--lpt-border-size) solid var(--lpt-border); color: var(--lpt-accent); border-radius: calc(var(--lpt-radius) * 1.5); }
.lpt-app-label { font-size: var(--lpt-small-font-size); font-weight: var(--lpt-strong-weight); }
.lpt-description { display: flex; align-items: start; gap: var(--lpt-space); margin-bottom: calc(var(--lpt-space) * 2); color: var(--lpt-muted); font-size: var(--lpt-small-font-size); }
.lpt-description-text { flex: 1; margin: 0; padding-top: var(--lpt-space); }
.lpt-empty, .lpt-help, .lpt-status { color: var(--lpt-muted); font-size: var(--lpt-small-font-size); line-height: var(--lpt-line-height); }
.lpt-empty { padding: calc(var(--lpt-space) * 2) 0; margin: 0; }
.lpt-status { margin: 0; }
.lpt-field { display: block; text-align: left; width: 100%; border: 0; border-bottom: var(--lpt-border-size) solid var(--lpt-border); background: transparent; padding: calc(var(--lpt-space) * 1.5) 0; overflow-wrap: anywhere; }
.lpt-field-label { display: block; font-size: var(--lpt-small-font-size); color: var(--lpt-muted); }
.lpt-field-value { display: block; white-space: pre-wrap; }
.lpt-location .lpt-field-value { font-size: var(--lpt-location-size); font-weight: var(--lpt-strong-weight); }
.lpt-wider { display: block; color: var(--lpt-muted); font-size: var(--lpt-small-font-size); }
.lpt-present-list { padding-left: calc(var(--lpt-space) * 2.5); margin: var(--lpt-space) 0; }
.lpt-marker { display: inline-block; color: var(--lpt-accent); font-size: var(--lpt-small-font-size); margin-right: var(--lpt-space); }
.lpt-card { border: var(--lpt-border-size) solid var(--lpt-border); border-radius: var(--lpt-radius); margin: var(--lpt-space) 0; padding: 0 var(--lpt-space); overflow-wrap: anywhere; }
.lpt-summary { cursor: pointer; padding: calc(var(--lpt-space) * 1.25) 0; }
.lpt-card-title { font-weight: var(--lpt-strong-weight); }
.lpt-card-subtitle { display: block; font-size: var(--lpt-small-font-size); color: var(--lpt-muted); }
.lpt-card-body { padding-bottom: var(--lpt-space); }
.lpt-section { margin-bottom: calc(var(--lpt-space) * 2); }
.lpt-section-title { font-size: var(--lpt-font-size); font-weight: var(--lpt-strong-weight); margin: 0; }
.lpt-section-header { display: flex; align-items: center; gap: var(--lpt-space); justify-content: space-between; }
.lpt-counter { color: var(--lpt-muted); font-size: var(--lpt-small-font-size); }
.lpt-note-line { display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.lpt-button, .lpt-add, .lpt-save, .lpt-cancel, .lpt-delete, .lpt-open-texts { min-height: var(--lpt-control-size); border: var(--lpt-border-size) solid var(--lpt-border); background: var(--lpt-subtle); padding: calc(var(--lpt-space) / 2) var(--lpt-space); border-radius: var(--lpt-radius); }
.lpt-save { background: var(--lpt-accent); color: var(--lpt-accent-text); border-color: var(--lpt-accent); }
.lpt-button:hover, .lpt-add:hover, .lpt-cancel:hover, .lpt-delete:hover, .lpt-open-texts:hover { border-color: var(--lpt-hover-border); }
.lpt-actions { display: flex; flex-wrap: wrap; gap: var(--lpt-space); margin: var(--lpt-space) 0; }
.lpt-form { display: grid; gap: var(--lpt-space); margin: var(--lpt-space) 0; padding: var(--lpt-space); border: var(--lpt-border-size) solid var(--lpt-accent); border-radius: var(--lpt-radius); }
.lpt-label { display: grid; gap: calc(var(--lpt-space) / 2); font-size: var(--lpt-small-font-size); }
.lpt-input, .lpt-textarea, .lpt-number, .lpt-css-editor { width: 100%; border: var(--lpt-border-size) solid var(--lpt-border); background: var(--lpt-fill); border-radius: var(--lpt-radius); padding: var(--lpt-space); min-height: var(--lpt-control-size); }
.lpt-textarea { min-height: calc(var(--lpt-control-size) * 2); resize: vertical; }
.lpt-css-editor { min-height: calc(var(--lpt-control-size) * 4); resize: vertical; }
.lpt-setting { display: flex; gap: var(--lpt-space); justify-content: space-between; align-items: center; padding: var(--lpt-space) 0; border-bottom: var(--lpt-border-size) solid var(--lpt-border); }
.lpt-setting-text { display: grid; gap: calc(var(--lpt-space) / 2); max-width: var(--lpt-max-label-width); }
.lpt-setting-label { font-weight: var(--lpt-strong-weight); font-size: var(--lpt-small-font-size); }
.lpt-setting-description { font-size: var(--lpt-small-font-size); color: var(--lpt-muted); }
.lpt-toggle { accent-color: var(--lpt-accent); width: calc(var(--lpt-space) * 2.5); height: calc(var(--lpt-space) * 2.5); flex-shrink: 0; }
.lpt-number { width: calc(var(--lpt-space) * 9); }
.lpt-notice, .lpt-error { border: var(--lpt-border-size) solid var(--lpt-accent); border-radius: var(--lpt-radius); padding: var(--lpt-space); margin: var(--lpt-space) 0; font-size: var(--lpt-small-font-size); }
.lpt-notice { display: flex; align-items: start; gap: var(--lpt-space); }
.lpt-notice-text { flex: 1; }
.lpt-error:empty, .lpt-status:empty { display: none; }
.lpt-advanced { border-top: var(--lpt-border-size) solid var(--lpt-border); padding-top: var(--lpt-space); }
/* Host-owned recovery surface: outside the phone shadow tree and never custom-styled. */
.lpt-transport { display: flex; flex-direction: column; height: 48px; width: 48px; overflow: hidden; }
.lpt-viewport { flex: 1; min-height: 0; width: 100%; overflow: clip; contain: layout paint size; position: relative; }
.lpt-island { display: block; width: 100%; height: 100%; }
.lpt-recovery-actions { display: flex; gap: .5em; }
.lpt-recovery-actions .lpt-recovery-button { flex: 1; min-width: 0; white-space: normal; }
.lpt-recovery-button { font: inherit; color: inherit; min-height: 2em; padding: .2em .7em; background: var(--lumiverse-fill-subtle, Canvas); border: 1px solid var(--lumiverse-border, ButtonBorder); border-radius: var(--lumiverse-radius, 10px); cursor: pointer; }
.lpt-recovery-status { font: inherit; color: var(--lumiverse-text-muted, GrayText); }
.lpt-recovery-panel { padding: 1em; display: grid; gap: .75em; color: var(--lumiverse-text, CanvasText); font: inherit; }
`;

// src/message-reads.ts
function readState(value) {
  if (!isRecord(value) || !Number.isSafeInteger(value.revision) || Number(value.revision) < 0 || !isRecord(value.seen) || Object.entries(value.seen).some(([k, v]) => k.length > 2000 || typeof v !== "string" || v.length > 20000))
    throw new Error("Invalid read history");
  return { revision: Number(value.revision), seen: { ...value.seen } };
}

// src/frontend.ts
function setup(ctx) {
  const disposers = [];
  let disposed = false;
  let activeChat = null;
  let epoch = 0;
  let pendingSync = "";
  let current = null;
  let reads = emptyReads();
  let preferences = defaultPreferences();
  let view = null;
  let widget = null;
  let lastSize = "";
  let widgetLoad = null;
  let widgetResize = null;
  let widgetWasConnected = false;
  let openRequested = false;
  let appearanceEpoch = 0;
  const updates = new Map;
  const prefsRequests = new Map;
  const readRequests = new Map;
  const helperRequests = new Map;
  const removeHostStyle = ctx.dom.addStyle(styles_default);
  disposers.push(removeHostStyle);
  const sendSync = () => {
    pendingSync = crypto.randomUUID();
    ctx.sendToBackend({ type: "phone_sync", requestId: pendingSync, ...activeChat ? { chatId: activeChat } : {} });
  };
  for (const tagName of [TRACKER_TAG, TEXT_TAG])
    disposers.push(ctx.messages.registerTagInterceptor({ tagName, removeFromMessage: true }, (payload) => {
      if (disposed || payload.isStreaming !== false || !payload.chatId || !payload.messageId || payload.chatId !== activeChat)
        return;
      if (payload.isUser === false || tagName === TEXT_TAG && payload.isUser === true)
        sendSync();
    }));
  const prefsChange = (change) => {
    const requestId = crypto.randomUUID();
    if (change?.css !== undefined) {
      appearanceEpoch++;
      preferences = { ...preferences, css: change.css };
    }
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        prefsRequests.delete(requestId);
        reject(new Error("Appearance could not be saved. Try again."));
      }, 15000);
      prefsRequests.set(requestId, { appearanceEpoch, resolve, reject, timer });
      ctx.sendToBackend({ type: change ? "phone_preferences_update" : "phone_preferences", requestId, ...change ? { change } : {} });
    });
  };
  const update = (change, revision) => {
    if (!activeChat || !current)
      return Promise.reject(new Error("Open a chat first."));
    const requestId = crypto.randomUUID();
    const chatId = activeChat;
    const originEpoch = epoch;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        updates.delete(requestId);
        reject(new Error("Saving took too long. Reopen this chat and check before trying again."));
      }, 15000);
      updates.set(requestId, { chatId, epoch: originEpoch, resolve, reject, timer });
      ctx.sendToBackend({ type: "phone_update", requestId, chatId, revision, ...change });
    });
  };
  const markRead = (chatId, key, observed) => {
    if (disposed || chatId !== activeChat)
      return Promise.reject(new Error("The chat changed."));
    const requestId = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        readRequests.delete(requestId);
        reject(new Error("Read status could not be saved."));
      }, 15000);
      readRequests.set(requestId, { chatId, epoch, resolve, reject, timer });
      ctx.sendToBackend({ type: "phone_mark_read", requestId, chatId, key, observed });
    });
  };
  const requestHelper = (type) => {
    if (!activeChat || disposed)
      return Promise.reject(new Error("Open a chat first."));
    if (type === "phone_helper_now" && current?.settings.source !== "helper")
      return Promise.reject(new Error("Choose Helper AI first."));
    const chatId = activeChat, requestId = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        helperRequests.delete(requestId);
        reject(new Error("Tracker update failed"));
      }, type === "phone_helper_now" ? 105000 : 15000);
      helperRequests.set(requestId, { chatId, epoch, resolve, reject, timer });
      ctx.sendToBackend({ type, chatId, requestId });
    });
  };
  const reset = () => {
    const saving = prefsChange({ css: "" });
    const originalView = view;
    openRequested = true;
    lastSize = "";
    view?.resetCSS();
    view?.open();
    recoveryStatus.textContent = "Resetting…";
    ensureWidget().then(() => {
      if (view !== originalView)
        view?.resetCSS();
      view?.open();
    });
    saving.then(() => {
      recoveryStatus.textContent = "Appearance reset.";
    }).catch(() => {
      recoveryStatus.textContent = "Reset for now. Could not save; try again.";
    });
  };
  const tab = ctx.ui.registerDrawerTab({
    id: "phone",
    title: EXTENSION_NAME,
    shortName: "Phone",
    headerTitle: EXTENSION_NAME,
    description: "Open your story phone or reset its appearance",
    keywords: ["phone", "tracker", "reset"]
  });
  const panel = document.createElement("section");
  panel.className = "lpt-recovery-panel";
  const help = document.createElement("p");
  help.className = "lpt-recovery-status";
  help.textContent = "Your story phone. Appearance controls here stay usable even if custom CSS hides the phone.";
  const open = document.createElement("button");
  open.className = "lpt-recovery-button";
  open.type = "button";
  open.textContent = "Open phone";
  open.addEventListener("click", () => {
    openRequested = true;
    ensureWidget().then(() => {
      view?.open();
      if (!view)
        help.textContent = "Allow floating panels in Extensions, then open the phone again.";
    });
  });
  const resetButton = document.createElement("button");
  resetButton.className = "lpt-recovery-button";
  resetButton.type = "button";
  resetButton.textContent = "Reset appearance";
  resetButton.addEventListener("click", reset);
  const recoveryActions = document.createElement("div");
  recoveryActions.className = "lpt-recovery-actions";
  recoveryActions.append(open, resetButton);
  const recoveryStatus = document.createElement("p");
  recoveryStatus.className = "lpt-recovery-status";
  recoveryStatus.setAttribute("aria-live", "polite");
  panel.append(help, recoveryActions, recoveryStatus);
  tab.root.append(panel);
  disposers.push(() => tab.destroy());
  disposers.push(tab.onActivate(() => {
    ensureWidget();
  }));
  async function ensureWidget() {
    if (disposed)
      return;
    if (widgetLoad)
      return widgetLoad;
    const task = mountWidget();
    widgetLoad = task;
    try {
      await task;
    } finally {
      if (widgetLoad === task)
        widgetLoad = null;
    }
  }
  async function mountWidget() {
    try {
      const granted = await ctx.permissions.getGranted();
      if (disposed)
        return;
      if (!granted.includes("ui_panels")) {
        widgetResize?.disconnect();
        widgetResize = null;
        view?.destroy();
        view = null;
        widget?.destroy();
        widget = null;
        help.textContent = "Allow floating panels in Extensions to open the phone. Reset appearance is still available here.";
        return;
      }
      if (widget && widgetWasConnected && !widget.root.isConnected) {
        widgetResize?.disconnect();
        view?.destroy();
        view = null;
        widget.destroy();
        widget = null;
      }
      if (widget && view) {
        lastSize = "";
        view.fit();
        return;
      }
      widget?.destroy();
      widget = null;
      lastSize = "";
      widget = ctx.ui.createFloatWidget({ width: 48, height: 48, initialPosition: { x: 24, y: 110 }, chromeless: true, tooltip: "Lumi Phone Tracker", snapToEdge: true });
      const transport = document.createElement("div");
      transport.className = "lpt-transport";
      const placementId = crypto.randomUUID();
      transport.dataset.lptPlacement = placementId;
      const placementStyle = document.createElement("style");
      const viewport = document.createElement("div");
      viewport.className = "lpt-viewport";
      const island = document.createElement("div");
      island.className = "lpt-island";
      const shadow = island.attachShadow({ mode: "open" });
      const base = document.createElement("style");
      base.textContent = styles_default;
      const custom = document.createElement("style");
      shadow.append(base, custom);
      viewport.append(island);
      transport.append(viewport);
      widget.root.append(placementStyle, transport);
      view = new PhoneView(shadow, custom, {
        update,
        preferences: prefsChange,
        markRead,
        connections: async () => await requestHelper("phone_connections"),
        updateNow: async () => {
          await requestHelper("phone_helper_now");
        },
        draft: (chatId, to, text) => {
          if (disposed || activeChat !== chatId || current?.chatId !== chatId || !current.settings.enabled.messages)
            throw new Error("The chat changed. Reopen the original conversation.");
          return addReplyDraft(ctx, chatId, current.currentPlayer ?? "", to, text);
        },
        size: (width, height) => {
          if (!widget || disposed)
            return;
          const vw = window.visualViewport?.width ?? window.innerWidth;
          const vh = window.visualViewport?.height ?? window.innerHeight;
          const w = Math.round(Math.max(48, Math.min(width, vw - 24)));
          const h = Math.round(Math.max(48, Math.min(height, vh - 24)));
          const size = `${w}/${h}`;
          if (lastSize !== size) {
            lastSize = size;
            placementStyle.textContent = `[data-lpt-placement="${placementId}"] { width: ${w}px; height: ${h}px; }`;
            widget.setSize(w, h);
            const pos = widget.getPosition();
            widget.moveTo(Math.max(12, Math.min(pos.x, vw - w - 12)), Math.max(12, Math.min(pos.y, vh - h - 12)));
          }
        }
      });
      view.receivePreferences(preferences);
      view.receive(current, reads);
      try {
        view.applyCSS(preferences.css);
      } catch {
        help.textContent = "Saved custom CSS could not be applied. The default appearance is in use; Reset clears it.";
      }
      widgetWasConnected = widget.root.isConnected;
      widgetResize?.disconnect();
      widgetResize = new ResizeObserver(() => {
        if (widget?.root.isConnected)
          widgetWasConnected = true;
        view?.fit();
      });
      widgetResize.observe(widget.root);
      if (openRequested)
        view.open();
      requestAnimationFrame(() => {
        if (!disposed)
          view?.fit();
      });
    } catch {
      widgetResize?.disconnect();
      widgetResize = null;
      view?.destroy();
      view = null;
      widget?.destroy();
      widget = null;
      help.textContent = "The phone could not open. Check extension permissions and try again.";
    }
  }
  disposers.push(ctx.onBackendMessage((payload) => {
    if (disposed || !isRecord(payload))
      return;
    if (payload.type === "phone_helper_changed") {
      if (activeChat && payload.chatId === activeChat)
        sendSync();
      return;
    }
    if (typeof payload.requestId !== "string")
      return;
    const helperRequest = helperRequests.get(payload.requestId);
    if (helperRequest) {
      if (!["phone_connections_result", "phone_helper_now_result", "phone_helper_error"].includes(String(payload.type)))
        return;
      clearTimeout(helperRequest.timer);
      helperRequests.delete(payload.requestId);
      if (helperRequest.epoch !== epoch || helperRequest.chatId !== activeChat || payload.chatId !== activeChat) {
        helperRequest.reject(new Error("The chat changed."));
        return;
      }
      if (payload.type === "phone_helper_error") {
        helperRequest.reject(new Error("Tracker update failed"));
        return;
      }
      helperRequest.resolve(payload.info);
      return;
    }
    const readRequest = readRequests.get(payload.requestId);
    if (readRequest) {
      if (!["phone_reads_result", "phone_reads_error"].includes(String(payload.type)))
        return;
      clearTimeout(readRequest.timer);
      readRequests.delete(payload.requestId);
      if (readRequest.chatId !== activeChat || readRequest.epoch !== epoch || payload.chatId !== activeChat) {
        readRequest.reject(new Error("The chat changed."));
        return;
      }
      try {
        if (payload.type === "phone_reads_error")
          throw new Error("Read status could not be saved.");
        const value = readState(payload.reads);
        if (value.revision >= reads.revision)
          reads = value;
        readRequest.resolve(reads);
      } catch {
        readRequest.reject(new Error("Read status could not be saved."));
      }
      return;
    }
    const preferenceRequest = prefsRequests.get(payload.requestId);
    if (preferenceRequest) {
      if (!["phone_preferences_result", "phone_preferences_error"].includes(String(payload.type)))
        return;
      clearTimeout(preferenceRequest.timer);
      prefsRequests.delete(payload.requestId);
      if (payload.type === "phone_preferences_error")
        preferenceRequest.reject(new Error(String(payload.message)));
      else {
        try {
          const prefs = readPreferences(payload.preferences);
          if (preferenceRequest.appearanceEpoch === appearanceEpoch && prefs.revision >= preferences.revision) {
            preferences = prefs;
            view?.receivePreferences(prefs);
          }
          preferenceRequest.resolve(prefs);
        } catch {
          preferenceRequest.reject(new Error("Appearance could not be loaded."));
        }
      }
      return;
    }
    const edit = updates.get(payload.requestId);
    if (edit) {
      if (!["phone_snapshot", "phone_error"].includes(String(payload.type)))
        return;
      clearTimeout(edit.timer);
      updates.delete(payload.requestId);
      if (edit.epoch !== epoch || edit.chatId !== activeChat) {
        edit.reject(new Error("The chat changed. Check the original chat before editing again."));
        return;
      }
      if (payload.type === "phone_error") {
        edit.reject(new Error(String(payload.message)));
        return;
      }
      if (payload.chatId !== activeChat || !isRecord(payload.snapshot) || payload.snapshot.chatId !== activeChat) {
        edit.reject(new Error("The chat changed."));
        return;
      }
      current = payload.snapshot;
      try {
        const value = readState(payload.reads);
        if (value.revision >= reads.revision)
          reads = value;
      } catch {}
      view?.receiveReads(reads);
      view?.receiveHelperBusy(payload.helperBusy === true);
      edit.resolve(current);
      return;
    }
    if (payload.requestId !== pendingSync)
      return;
    if (payload.type === "phone_error") {
      view?.setError(String(payload.message));
      return;
    }
    if (payload.type !== "phone_snapshot")
      return;
    if (activeChat && payload.chatId !== activeChat)
      return;
    activeChat = typeof payload.chatId === "string" ? payload.chatId : null;
    current = isRecord(payload.snapshot) && payload.snapshot.chatId === activeChat ? payload.snapshot : null;
    try {
      const value = readState(payload.reads);
      if (value.revision >= reads.revision)
        reads = value;
    } catch {}
    view?.receive(current, reads);
    view?.receiveHelperBusy(payload.helperBusy === true);
  }));
  const switchChat = (chatId) => {
    epoch++;
    pendingSync = "";
    activeChat = chatId;
    current = null;
    reads = emptyReads();
    view?.receive(null, reads);
    for (const [id, p] of readRequests) {
      clearTimeout(p.timer);
      p.reject(new Error("The chat changed."));
      readRequests.delete(id);
    }
    for (const [id, p] of updates) {
      clearTimeout(p.timer);
      p.reject(new Error("The chat changed. Your original chat keeps its saved changes."));
      updates.delete(id);
    }
    for (const [id, p] of helperRequests) {
      clearTimeout(p.timer);
      p.reject(new Error("The chat changed."));
      helperRequests.delete(id);
    }
    if (chatId)
      sendSync();
  };
  disposers.push(ctx.events.on("CHAT_SWITCHED", (payload) => {
    if (isRecord(payload))
      switchChat(typeof payload.chatId === "string" ? payload.chatId : null);
  }));
  for (const event of ["MESSAGE_SENT", "MESSAGE_EDITED", "MESSAGE_DELETED", "MESSAGE_SWIPED", "SWIPE_EDITED", "CHAT_CHANGED"])
    disposers.push(ctx.events.on(event, (payload) => {
      if (isRecord(payload) && activeChat && payload.chatId === activeChat)
        sendSync();
    }));
  const fit = () => view?.fit();
  window.addEventListener("resize", fit);
  window.visualViewport?.addEventListener("resize", fit);
  disposers.push(() => {
    window.removeEventListener("resize", fit);
    window.visualViewport?.removeEventListener("resize", fit);
  });
  const detected = typeof ctx.getActiveChat === "function" ? ctx.getActiveChat().chatId : ctx.composer?.getState().chatId;
  if (detected)
    activeChat = detected;
  sendSync();
  const initialAppearanceEpoch = appearanceEpoch;
  prefsChange().then((p) => {
    if (disposed || initialAppearanceEpoch !== appearanceEpoch || p.revision < preferences.revision)
      return;
    preferences = p;
    view?.receivePreferences(p);
    try {
      view?.applyCSS(p.css);
    } catch {
      help.textContent = "Saved custom CSS could not be applied. Reset appearance to clear it.";
    }
  }).catch(() => {
    help.textContent = "Appearance could not be loaded. Default styles are in use.";
  });
  ensureWidget();
  return () => {
    disposed = true;
    epoch++;
    widgetResize?.disconnect();
    view?.destroy();
    widget?.destroy();
    for (const p of updates.values()) {
      clearTimeout(p.timer);
      p.reject(new Error("The phone closed before saving completed. Check the chat before trying again."));
    }
    for (const p of prefsRequests.values()) {
      clearTimeout(p.timer);
      p.reject(new Error("The phone closed."));
    }
    for (const p of readRequests.values()) {
      clearTimeout(p.timer);
      p.reject(new Error("The phone closed."));
    }
    for (const p of helperRequests.values()) {
      clearTimeout(p.timer);
      p.reject(new Error("The phone closed."));
    }
    updates.clear();
    prefsRequests.clear();
    readRequests.clear();
    helperRequests.clear();
    disposers.forEach((fn) => fn());
  };
}
export {
  setup
};
