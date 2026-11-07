# Changelog

## 0.17.0 - Wizard duplicate review and edit controls

- Wizard review now shows known source-character, message and request counts only;
  removed token counting and all wizard price wording.
- Review matching first/full names with Merge or Keep both. Added confirmed contact
  merging, aliases, retained originals and rebuild support for existing duplicates.
- New setup contacts show Added by setup wizard without a user-edit lock. Legacy
  provenance is not guessed; old labels/protections remain.
- Optional local fake 555-01xx/email filling, OFF by default, with editable domain
  and made-up labels. Keeps real/edited values and explicit blanks.
- Optional AI replacement of user-edited fields, OFF by default, with a warning,
  exact newer-story evidence, per-field hard locks and Restore my version.
- Shared chat scopes and trusted-user calls remain; profiles exclude the new safety
  switches/domain. No new APIs, permissions, tabs, macros or tag syntax.


## 0.16.2 - Pass the model to raw generation

- Setup now sends the reviewed model together with the saved connection ID and
  trusted user ID. Raw generation uses the connection for credentials but does not
  inherit its model in the local Lumiverse 1.2.5 implementation.
- Corrected the same missing-model request in background Custom connection tracking.
- Setup request failures now show and log safe categories. Keep saved data, explicit
  Run/Save, no automatic retries, and all user/chat and player protections.
- Mock providers now reject missing models, reproducing the old generic failure.
  No changes to phone layout, macros, tag syntax, permissions or connection settings.


## 0.16.1 - Sidebar setup and connection fix

- Moved Setup wizard from Home to a collapsed sidebar section, outside phone CSS.
- Added field-by-field import switches for nine Contacts fields, five Notes sections
  and Locations; Scene stays excluded. Preview and explicit saving remain required.
- Main AI setup now uses the requesting user's documented default connection,
  rather than requiring an unrelated saved Custom connection. Recheck before Run.
- Connection name/model separator is now ASCII " - ", fixing the mis-encoded dot.
- Keep user edits, player restrictions, trusted user IDs, free token review and
  protected Reset. Macros, permission list and story-tag formats are unchanged.


## 0.16.0 - Contacts pages and setup wizard

- Contacts now use A-Z rows, round portraits and full pages with context-aware Back,
  role chips, confirmed address/details fields and Edit-only confirmed deletion.
- Exact card/persona name matching establishes Main; first-name matches remain
  review hints. User tags lock. Addresses match without guessing duplicates.
- Added compact NPC continuity and protected wording: AI/background tracking cannot
  create or change confirmed contact metadata. Old contacts and read receipts remain.
- Setup wizard reads documented card/persona/lorebooks, reviews token cost for the
  existing connection, then shows a preview. Explicit save keeps edits/tombstones
  and checks the requesting chat/revision; no automatic retries or paid requests.
- Added world_books permission for the optional wizard and seven supplied embedded
  icons (656,860 PNG bytes). Profiles no longer shares Advanced's icon.


## 0.15.0 - Clearer names and CSS file uploads

- Source controls now say Connections / Custom connection; Presets is Settings
  profiles. Existing data, connections, profiles and wording remain compatible.
- Appearance uses separate styles.css and sidebar.css uploads instead of a text
  box, up to 256 KB each, personal across the user's chats.
- Sidebar CSS is confined below the toolbar. Reset clears both uploaded styles
  immediately, retains story data and remains outside hostile styling.
- Added upload validation, scoped-storage and browser recovery tests. No new
  permission or AI/prompt behavior change.


## 0.14.0 - Settings presets and editable prompt wording

- Personal presets in the sidebar: read-only Default/Minimal, save, rename, delete
  and confirmed apply to only the open chat. Story data and excluded settings stay.
- Separate personal Main AI/Helper AI wording selections, with a protected generated
  syntax placeholder, app-scoped prose, locked Helper safety and free exact Preview.
- Limits: 20 presets; 10 custom wordings total; 40-character names; 4,000-character
  wording. Trusted-user storage, safe fallback warnings and stale-chat guards.
- Added scoped mock/browser checks and guides. No new permission or preset macro.


## 0.13.0 - Step E: emoji picker

- Embed 28 lossless full-grid emoji cells in the supplied row order. Preserve original transparency, horns, halo and sparkles; apply the approved sleepy-Z spill correction with five transparent padding rows (three visible plus two faint edge rows). No background added.
- Add a keyboard-accessible, opaque Messages emoji picker. Insert literal :name: at the cursor or over a selection; Add to draft still never sends. Preserve the cursor during incoming updates and reject detached old-chat actions.
- Render known shortcodes as safe static images in phone display text, with sharp pixel scaling. Unknown names, editing values and stored data stay literal. No HTML injection or external images.
- Keep phone_format, all macro code, shorthand parsing and permissions unchanged. Colons inside values remain data; existing pipe rules still apply.
- Added emoji image data: 2,818,584 PNG bytes / 3,758,768 data-URI characters (about 3.6 MiB embedded). Add pixel/alpha integrity, parser and browser regressions; update the guides and built frontend.

## 0.12.0 - Story strip and compact sidebar

- Replace Home's title with a slim read-only story Time/Date strip; show the same saved values on every app, honoring the existing Scene switches and membership. Unknown/disabled values stay blank; no device clock. Scene still edits the same fields.
- Use three protected sidebar icon actions: Open, Refresh, Reset, with 44px targets, keyboard/hover tooltips, narrow text labels and short results that clear after five seconds. Separate scrolling content prevents toolbar overlap. Main Refresh stays free; Helper tooltip and section retain the cost note.
- Add a single-open accordion with decorative icons. App Store starts open, uses a compact nine-app grid and one Add/Remove control per app. Remove the redundant On phone pill.
- Show native checked-state tracking chips only for added apps. Compact Helper controls, collapse the CSS editor inside Appearance, and use two columns for Advanced numbers while retaining both safety hints and OFF defaults. No setting scope or saved data changes.
- Embed the eight supplied 64-square PNGs unchanged: 46,981 raw bytes, 62,828 data-URI characters (about 61.4 KiB encoded). Show toolbar art at 32px and section art at 24px, with smooth scaling and no external loading.
- Use only the documented drawer root and ordinary DOM/CSS. No new API, permission, settings, tab or app. Protected Reset, portraits, drafts, unread state and opaque phone surfaces remain.

## 0.11.0 - Compact story views, text threads and portraits

- Put Scene Time and Date in one compact row; flatten Contact rows with portraits, roles and presence labels, keeping player protections and inline details.
- Replace expanded conversation cards with a newest-first Messages list and a text-thread view: previews, portraits, side-aligned bubbles, explicit group senders, tight consecutive grouping and established story-date separators.
- Dock a growing one-to-four-line composer with Add to draft, never Send. Keep drafts, exact-chat checks, per-conversation reads, player-only recipients and a personal dismissible drafting hint.
- Add optional group tags for explicitly established player group texts. Untagged direct conversations stay separate; never infer membership.
- Add raster-only custom portraits, center-cropped/re-encoded in the browser to 128 square, up to 20 KB each and 512 KB encoded per chat. Keep them shared, editable/removable and outside AI prompts.
- Read main-card and requesting-user persona image bytes only with optional characters/personas/images grants. Use initials without permission, on errors or unmatched names. Ordinary group-member enumeration is not documented; those NPCs use custom portraits or initials.
- Preserve protected Reset and opaque surfaces. The phone top strip, sidebar toolbar/accordion and eight supplied sidebar icons are deferred to the next step.

## 0.10.2 - Only the player's phone texts

- Tell the AI in one short sentence to tag only texts to the player, plus actual player-sent texts when enabled. NPC-to-NPC texts stay in narration without tags.
- Enforce incoming recipients during every rebuild: absent recipient means player; explicit recipient must match a confirmed player name. Reject non-player and ambiguous/group targets without guessing. Preserve sent user replies and player-writing protection.
- Refresh removes old NPC-to-NPC records from Messages; saved source stays unchanged. Incorrect tags remain hidden and produce a deduplicated, value-free server warning. No new screen, setting, permission or CSS change.
- Add code/browser coverage and update install/format/testing guides and built files.

## 0.10.1 - Call sources, repeat counts and supplied default theme

- Keep identical calls from different source messages; rereading one source stays idempotent. Selected swipes and regeneration replace that message's calls. Call edits/deletions are source-scoped.
- Add optional x1 through x20 counts, default 1, with a Repeat count editor. Show Missed x3 once, with one unread record. Reject bad counts independently.
- Require verified source IDs and exact story quotes for new Helper calls. Repeated Helper runs cannot re-log the same source call. Preserve older saved IDs, receipts, corrections and cap admissions on migration.
- Bundle the supplied styles(1).css and sidebar.css as the default theme, with no custom CSS length limit involved. Keep existing behavior, transparent launcher, opaque screens and the protected sidebar Reset. Saved custom CSS still overrides defaults.
- Update format/styling/testing guides and built files. No new permission or model call.

## 0.10.0 - Part 4 only

- Add optional Calls, Email and Bank, off by default in new/existing chats, with built-in Add/Remove, switches, editable records, caps and retained data.
- Add call/bank/transaction shorthand, hidden email tags, personal missed-call/email badges and short macro continuity. Helper extracts calls/bank only; main AI handles email/text tags in both modes.
- Enforce player-writing OFF in code, including record-editor bypass attempts. Bank stores exact stated figures and never computes a balance. User edits and source/swipe changes retain protections.
- Keep all story data, App Store state and tracker switches on the chat. Personal receipts, notices, CSS and dismissals use the trusted user scope; test two authorized users in one chat and separate chats.
- Embed the supplied nine PNG app images unchanged, with no external loading. Preserve the separate launcher and protected sidebar Reset.
- Update format/install/styling/testing guides. No new permission, dialing, email sending, bank connection, owner-only data rule or preset rewrite.

## 0.9.0 - Part 3 only

- Move all settings into the existing Phone sidebar. Open, Refresh and Reset stay at the top with short results. Only App Store starts expanded; each section names its scope.
- Add built-in App Store rows for the six current apps. Removing hides an app and suppresses its AI output/instructions without losing data or field choices; adding restores it. Migrate old membership from existing switches.
- Remove the phone Settings screen. Home shows only added apps, plus the requested persistent dismissible hint and empty state. Story editing, replies, descriptions, opaque screens and launcher behavior stay in the phone.
- Use the documented shared switch where available and host-themed sidebar styles. Guard saves and old controls across chat switches, display the authorized chat name, and retain current storage scopes.
- Add migration, per-user/chat, no-chat, stale-save, narrow-sidebar and recovery regressions. No new permission or optional Calls/Email/Bank features. Native host/mobile/shared-switch rendering and real multi-user behavior still need testing.

## 0.8.1 - Launcher fit only

- Embed the new tight-cropped 88 x 128 PNG unchanged. Default to a square 50px launcher with art touching top/bottom, centered with its original proportions.
- Remove launcher background, border, box shadow and inner padding, including hover. Keep an image-only drop shadow with editable color/blur/offset variables.
- Preserve the minimum tap target, label, activation, drag setup and badge placement. Keep keyboard focus inside the protected clipping bounds. Open phone surfaces remain opaque.
- Document the taller-art CSS option with its 50 x 55 invisible tap target. Test smooth 1x/2x scaling, light/dark backgrounds, focus, badges, custom CSS and sidebar Reset. Real-host mobile/light-theme/drag appearance remains unverified.

## 0.8.0 - Part 2 only

- Refresh tracker replaces Update now in Settings in both modes. Main AI rebuilds from saved messages without a model request; Helper AI makes one explicit update. Streaming disables it.
- Helper failures now name one of seven safe categories in the phone and server log. Old tracker data stays; no retry loop. Missing connections still fall back to Main AI.
- Authorize the chat before listing connections. Retain trusted user IDs on connection, generation and per-user receipt calls; validate the pinned chat/revision before saving a result.
- Accept complete outer code fences and independent valid fields with the common parser. Keep strict text, evidence, player-card and placeholder rules. Bound ignored provider cancellation and close a completed-reply queue race.
- Added two-user/operator-scope, failure-category, timeout, parsing and browser regressions. No new permission, screen or setting. Live second-user/provider behavior remains unverified.

## 0.7.1 - Launcher icon only

- Embedded the supplied flip-phone PNG as a static data URI with smooth scaling.
- Preserved the launcher dimensions, placement, native click/keyboard behavior and existing unread behavior; used the requested Open phone label.
- Documented the artwork class and checked 1x/2x density, custom CSS and badge layering. No new variables, permissions or Part 2 work.

## 0.7.0 - Part 1 only

- Added compact line-based shorthand, exact evidence and inferred suffixes, word limits and independent valid-record acceptance. Old saved JSON blocks and Helper journals still rebuild.
- Main AI and Helper AI now receive the same shorthand rules; texts keep their separate tag.
- Reject placeholders/empty attire, require confirmed presence for new AI contacts, avoid duplicating the current place, and tighten key-item instructions.
- Added parser tests, a same-data token report and a local user-docs review. No new APIs, permissions or UI controls. Part 2 remains pending.

## 0.6.4

- Fixed the actual native preset path, which bypasses macro interceptors. The pull handler reads the host-supplied env.extra.userId and env.chat.id, with agreement checks against top-level IDs. These compatibility fields are verified in host source, not guaranteed by the minimal pull DTO.
- Added a regression that bypasses the macro interceptor and reproduces the v0.6.3 blank before the fix.
- Kept user scoping, safe empty warnings, permissions, UI, stylesheet and tracker format unchanged.

## 0.6.3

- Fixed blank phone macros when the legacy pull handler lacks top-level user/chat context. Uses the documented macro interceptor and its per-evaluation identity/environment; adds the macro_interceptor permission.
- Added fixed, one-line empty-format reasons in the server log. No story text or field values.
- Confirmed fresh Main AI chats emit enabled writing instructions without stored continuity. No active-chat guessing, cross-user cache, new UI or format changes.

## 0.6.2

- Fixed the missing user ID in player-name resolution used by tracker reads, including Helper AI and events.
- Tracker macros return empty when trusted identity/chat is unavailable. Prompt processing failures leave the prompt unchanged; the interceptor is optional.
- Added a strict operator-scoped mock that reproduces the reported error and checks scoped reads, appearance/Reset, read receipts and Helper AI.
- No UI, stylesheet, permissions or tracker-format changes.

## 0.6.1

- Replaced the default stylesheet with the user-supplied CSS: phone notch/home bar, individual app tints, message bubbles and pill switches.
- Kept existing classes, behavior, opaque screens and protected sidebar Reset.
- Rounded the closed-phone notice height up so fractional typography cannot clip it.
- Updated the styling reference and rebuilt the extension; reran browser recovery/opacity checks.

## 0.6.0

- Added optional Helper AI with a saved-connection picker, recent-message count, cost note and Update now. Main AI stays the default.
- Added generation permission for the helper feature. No API keys or external server.
- Added completion-only scheduling, duplicate-attempt protection, pinned results and safe failure notices/logs.
- Helper updates survive restart and rebuild with their source messages; changed/deleted/swiped sources invalidate them.
- Kept user edits, player privacy, all app switches, Messages and protected sidebar Reset.
- Updated the install guide, exact preset line, styling guide and honest test report.

## 0.5.0

- Added real Messages, unread badges, arrival notices and safe Add to draft replies. Added solid theme-based phone backgrounds.

## 0.4.2 / 0.4.1 / 0.4.0

- Fixed invisible zero-height phone mounts; moved Reset into the sidebar. Bundled seven Lucide Home icons. Added phone screens, editing, grouped Settings and custom CSS.

## Steps 1-3

- Added the project, saved-tag capture/hiding, per-chat rebuilding, macros, authorship checks and prompt-history trimming.
