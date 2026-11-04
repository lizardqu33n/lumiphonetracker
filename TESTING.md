# Verification report - 0.6.1

Checked November 4, 2026 (America/Chicago), using Bun 1.4.4, TypeScript 5.7.3, official lumiverse-spindle-types 0.6.77 and headless Microsoft Edge via Playwright 1.58.2. **This test environment did not have a real Lumiverse install or a real model connection. No paid model request was made.**

## Stylesheet update

The supplied stylesheet is copied byte-for-byte into src/styles.css. STYLING.md documents its 62 variables and 107 stable classes. The browser suite also exposed fractional-height rounding that clipped the closed-phone text notice; its measured height now rounds up. No navigation, tracker rules or class names changed.

## Passed in code

- 110 behavioral tests, 449 assertions, zero failures, across six test files.
- Typecheck; backend/frontend builds; manifest, entry/export and bundle/source checks; packaged source/built-file matching.
- Earlier parsing, independent valid-line acceptance, safe warning logs, partial-tag hiding, raw saved-tag retention, chronological replay, user edits, caps, notes, migration, macros, auth checks, chat isolation, swipes/regeneration/deletion and recent-tag/media transformations.
- Messages grouping, incoming-only unread receipts, recipient-aware outgoing records, read persistence, escaped draft tags, cancellation, exact-chat composer checks and no extension Send call.
- Helper defaults to Main AI; no model call in Main AI, with missing permission, for another user or with every extractable field disabled.
- Completion-only automation: no calls during tracked streaming; success requires a matching saved assistant row; duplicate events and a fresh scheduler after restart do not repeat an attempted generation. Stops/errors and raw-helper completions without saved messages do not trigger calls.
- Actual input contains only the last configured N cleaned rows plus compact enabled continuity and limits; all tracker/text tags are removed regardless of main-prompt retention. No full-chat or Messages dump is supplied. Only a connection ID is retained from profile data.
- Missing connection falls back to Main AI with Connection not found and no model call. Invalid JSON, markdown fences, forbidden keys/texts/Misc, invalid structures and provider errors keep old values and show Tracker update failed; no retry loop. Warning logs omit story/field values, profile/model names and provider error text.
- Pinned chat and revision: late results remain in their requesting chat, cannot overwrite later edits/history, and are discarded when Main AI is selected. Cancellation signals are sent. This cannot prove an already-started provider request was free.
- Separate helper result journal survives restart and rebuilds through the shared Scene/Weather/Contacts/Locations/Notes rules. Story edits/deletion/alternate swipes invalidate the affected result; edits only to stripped phone tags do not discard unrelated extracted story facts. Helper never writes story rows or texts. Player private fields are removed; null preserves old values.
- User-edited values need a newer exact evidence quote, not a quote from an older row. Literal older facts are prevented from replacing newer confirmed fields. These are conservative text checks, not semantic proof of canon.
- The actual backend is loaded with a mocked host. It checks user-scoped connections, the raw generation adapter, chat-authorized read receipts, zero default Main calls, explicit Helper Update now, and generation-hook registration. Unknown return data from the published raw API is checked for a content string.

## Passed in a browser with a mock host

96 checks exercise actual frontend, store, read service and Helper AI controller. Host placement, events, connections, provider response and composer are substitutes.

- All seven icons/navigation, explanation dismissal, Scene/Weather edits, Contacts/player restrictions, Locations, Notes, grouped switches, safe text rendering and CSS customization.
- Retained zero-height placement regression (old code observed at exactly 0 height), delayed mounting, late appearance responses, same-session Reset, failed storage/placement recovery and the single protected sidebar Reset/confirmation.
- Opaque backgrounds across Home and every app, frame/content/cards/sections under translucent theme fills, plus solid dark fallback without a theme fill.
- Real-data Messages workflow: multi-sender conversations, badges clearing only the opened conversation, optional known time, restart read persistence, new/closed-phone notices, draft/caret preservation, append-without-send, cancellation, explicit simulated user Send before filing, manual recipient tags, default AI-player-text rejection, unsupported/wrong-chat composer safety and stale-form refusal after switching.
- Helper AI source/connection choice, exact cost note, editable 1-10 message count, no request merely from choosing a mode/profile, explicit Update now, disabled updates during streaming, one request on completed saved reply, invalid-JSON notice/retained data/no retry, late source-chat saving, missing-profile fallback and visible Main AI selection without another call.
- Desktop, mobile-sized and short/keyboard-sized viewports; no browser errors. Home, Scene, Messages, recovery and Helper Settings screenshots were visually inspected. Test-only fixtures/screenshots are not in production bundles.

## Not verified without a real Lumiverse install and connection

- GitHub install/update/security scanning, native permissions and revocation/regrant, restart/disable/re-enable, real host placement/styles/transforms, desktop pop-outs and actual mobile/iOS WebViews.
- Native generation event ordering, saved-message timing, authenticated event user IDs, group/concurrent/background swipes, stopped partial replies and startup during an already-running stream. The scheduler uses documented events; it cannot observe a start event the host never delivered. Final content must match the selected saved assistant row or automatic extraction is skipped safely.
- Real saved connection listing/removal, chosen provider/model routing, cancellation/timeouts, model pricing/usage, real JSON compliance, once-per-reply behavior through the actual host and source-chat persistence after a live chat switch.
- No provider-specific schema mode is forced. JSON-only prompting plus strict validation is implemented; a real model may still return invalid data, which must be ignored. Model compliance with changed-only facts, exact chronology, story versus memory/lie, complete attire, no invented details/texts/player thoughts and newer-quote protection still needs live testing.
- Council settings were read in documentation only. The docs expose read-only Council configuration; they do not document an extension call to run its built-in Sidecar LLM. This extension uses its separate saved-connection picker.
- Actual composer append/focus/draft persistence, attachments, selections, user Send/edit/cancel behavior, saved user author metadata, user-tag interception/hiding and native streaming paint/cold-load behavior.
- Real macro resolution and trusted contexts, operator/multiplayer scope, long histories/pull timeouts, simultaneous processes/tabs, and interactions with other extensions. In-process queues do not prove distributed locking across multiple workers.
- Actual outgoing provider prompt stripping (default recent texts 3, trackers 0), configured retention, source markers and media preservation. Code tests verify transformations, not a final network payload. Helper input is tested separately to strip ALL phone tags.
- Human first-use clarity: a new person should identify each app within about five seconds. No human usability study was performed. Custom CSS can intentionally make the phone transparent or hide it; native recovery still needs a real-host check.

The earlier real-install v0.4.1 failure was user-reported. Its layout cause was reproduced locally and retained as a regression, but this environment has not validated 0.6.1 in that install. Publishing source to GitHub does not verify native installation or make a model request.

Earlier reports: [Step 5](docs/STEP-5-TESTING.md), [Step 4](docs/STEP-4-TESTING.md), [Step 3](docs/STEP-3-TESTING.md). Previous archives are preserved. All six build steps are delivered; work is paused for review.
