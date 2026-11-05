# Changelog

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
