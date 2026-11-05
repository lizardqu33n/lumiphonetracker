# Changelog

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
