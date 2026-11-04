# Step 5 verification

Checked November 4, 2026 (America/Chicago), using Bun 1.4.4, TypeScript 5.7.3, official lumiverse-spindle-types 0.6.77 and headless Edge via Playwright 1.58.2. The test environment has no real Lumiverse installation or provider connection. The earlier real-install v0.4.1 failure was user-reported; its 0.4.2 regression remains in the suite.

## Passed in code

- 98 behavioral tests, 351 assertions, zero failures, across five test files.
- Typecheck, backend/frontend builds, manifest/entry/export checks and bundle/source matching.
- All earlier parser, streaming-fragment hiding, malformed-line logging, chronological replay, swipes/regeneration, deletion, edits, macros, settings, chat isolation, stale revision/history, authorship, retention/media, migration, caps and manual-edit protections.
- Step 5: per-sender grouping, recipient-aware outgoing grouping, no guessing for missing recipients, incoming-only unread counts, read status per user/chat and across restart, changed-body/swipe receipts becoming unread, observed-only marking, parallel marks preserving other conversations and invalid read-state rejection.
- Safe escaped draft tags round-trip literal angle brackets, names, recipients, ampersands, quotes and newlines. The bridge appends at end, preserves existing prose, focuses, never calls send, refuses wrong/unmounted composer, and offers a manual tag when unsupported. Focus failure after insertion still reports success rather than inviting a duplicate.
- Only saved authored user tags file outgoing replies; deleting the source removes them. AI-written player tags remain excluded by default. A saved recipient survives replay.
- Named user-message serialization/replay uses the same field order, avoiding a false changed-history error on later Settings saves.
- The actual backend module is loaded with mocked host APIs: chat authorization for read receipts, receipt response routing, per-user appearance and required hook registration. An unauthorized user cannot mark another chat read.

## Passed in a browser with a substituted Lumiverse host

83 checks exercise the actual frontend, store and read-receipt service. Placement, communication, permissions, persistence boundaries and the composer are substitutes; a simulated user Send writes a saved user row. The extension never calls Send.

- Existing seven icons/navigation, explanation dismissal, Scene/Weather edits, Contacts/player privacy, Locations and Notes, grouped settings, safe rendering, CSS recovery and delayed-save chat isolation.
- Retained 0.4.2 regressions: auto-height host root, delayed zero-size mounting, reset before stale appearance delivery, reset with failed storage, failed placement/recreation, sidebar-only recovery and confirmation. The old code was observed failing the auto-height case at height 0; the new code passes it.
- Opaque pixel alpha for Home and every app, frame, content, cards and sections even under translucent theme fills; explicit dark fallback when the theme background is absent.
- New actual-text arrival notice, two sender conversations in group roleplay, opening one clearing only its badge, optional established story time and no invented time, read status surviving extension reload, no old-history arrival announcements.
- Incoming updates preserve a reply and its caret. Add to draft preserves existing narration and escapes the recipient/body. No outgoing record appears before Send; cancellation files nothing. A simulated sent user row then appears as outgoing. A manually typed tag goes to its saved recipient instead of the currently open conversation.
- Default OFF ignores AI-authored player tags. Wrong-chat composer refuses writes and preserves the reply. Unsupported composer exposes a manual tag without changing normal input. A stale detached form cannot draft into another chat.
- Messages OFF hides badges, conversations and replies. A closed phone still shows a brief notice that fits its protected placement.
- Desktop, mobile-sized and short/keyboard-sized viewports; no browser errors. Generated Home, Scene, Messages and recovery screenshots were visually inspected. Fixtures/screenshots are test-only and are not bundled into production code.

## Still requires a real Lumiverse install

- Install/update/security scanning, permission revoke/regrant, startup/disable/re-enable, native widget placement/dragging, actual root sizing/styles/transforms, sidebar recovery, desktop native pop-outs and real mobile/iOS WebViews.
- Actual theme variables and browser support on users' devices. Unsupported relative-color math uses explicit solid dark fallbacks. Custom CSS can intentionally undo opacity.
- Real composer appending/focus, draft persistence, existing attachments and selections, user editing/cancelling and actual Send behavior, group mentions/multiplayer rules. The code does not send; mocks cannot prove native composer behavior.
- Native user-name resolution and saved author metadata, persona changes, user-typed tags in both message roles, real streaming paint, cold-load gating, swipe/regeneration/deletion events and interactions with other extensions. Ambiguous/missing authorship is conservatively rejected.
- Read-receipt persistence with real authenticated users; simultaneous clients/processes. In-process queues do not prove distributed concurrency behavior.
- Actual macros and trusted context, dry previews, very long histories and pull timeouts. Human first-use clarity: a new person should identify each of the seven apps in about five seconds; no human study was performed.
- Real provider-bound prompt stripping, default recent texts 3 / trackers 0, changed limits, source IDs/index markers and image/media preservation. Code transformation tests do not inspect a final provider request.
- Model compliance with changes-only blocks, narration/canon, exact attire and concrete values, no invented texts/player thoughts, and quoted protection of user edits. Textual quote checks cannot prove semantic truth.

## Deferred to Step 6

Helper AI is not implemented or tested: connection listing/removal/fallback, explicit selection/cost note, once-per-completed-reply calls, last 1-10 cleaned messages plus compact tracker, JSON validation, source-chat/revision pinning, failures without retries and Update now all need Step 6 plus a real install and real connection. No generation permission, API keys or paid requests were used.

Earlier reports: [Step 4](docs/STEP-4-TESTING.md), [Step 3](docs/STEP-3-TESTING.md). Prior archives remain unchanged. Step 5 checkpoint is paused for review; Step 6 has not started.
