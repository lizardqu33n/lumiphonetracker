# Step 4 verification

Checked November 4, 2026 (America/Chicago), using Bun 1.4.4, TypeScript 5.7.3, official lumiverse-spindle-types 0.6.77 and headless Microsoft Edge via Playwright 1.58.2. **No real Lumiverse install or provider connection was available to this test environment.** The user reported v0.4.1 failing in a real install; v0.4.2 is verified locally, not yet in that install.

## Passed in code

- 89 behavioral tests, 304 assertions, zero failures, across four test files.
- Type checking; backend/browser builds; manifest, entries and frontend export; built files matching source; source/bundle packaging.
- Existing parsing, independent valid-line acceptance, safe invalid-line logging, incomplete-tag hiding, chronological replay, swipes/regeneration, malformed-block retention, authored texts, macros, disabled-item filtering, recent history trimming and media preservation.
- Chat/user isolation, restart replay, revision/history conflicts, denied ownership, migration, caps, resolved plots, user-edited quote protection and no AI deletion.
- New Step 4 cases: per-user appearance storage, serialized partial preference changes, dismissal persistence, Reset retaining dismissals, invalid preference rejection, Contact/Location/Note renames, case-insensitive duplicate rejection, current/presence linkage, player spelling and private-field restrictions after renaming.

One old minimal fake-DOM test was replaced by actual browser UI coverage rather than counted twice. The actual backend module is loaded with a mocked host for registration/wiring checks. Storage and authorization tests use substitutes, not the Lumiverse database. Legacy Step 2 tests remain regression tests; the active store is schema 2.

## Passed in a browser with a mock Lumiverse host

54 automated checks exercise the actual frontend and actual data store. Only Lumiverse placement, permissions, events, communication and persistence boundaries are substituted.

- Exactly seven labelled Home icons, one-level app navigation, app explanations and dismissal across reload.
- Scene location/wider places, names-only presence, time correction/persistence/marker and no duplicated weather.
- Contacts present/absent grouping, ordered roles, physical correction, player restrictions, user addition/rename and Open texts leading to the honest Step 5 placeholder.
- Current Location derived from Scene, adding a place; five Notes sections, user-added Misc/Send to AI, confirmation deletion and invalid-note rejection without replacing data.
- Weather correction and marker; disabling Weather hides the data.
- Live CSS, saved user preferences, dimensions resizing the native-placement substitute, malformed rules keeping the UI usable, network-loading CSS rejected, no authored inline styles.
- Universal display:none plus fixed positioning, enormous dimensions and extreme z-index cannot hide/cover the sidebar Reset; Reset restores and saves default appearance. No Reset strip or duplicate in-editor Reset remains.
- Entity-like text stays literal, no image element or HTML event handler is created.
- Empty chats contain no fixture information; a delayed save targets the original chat after a chat switch and cannot appear in the new chat.
- Desktop 1100x850, mobile-sized 390x844 and short 390x420 viewports; phone remains within the screen; no browser errors.

Visually inspected the generated Home and Scene screenshots. The restrained colors are inherited from the test host's theme, not fixed production colors. Screenshots and seeded story data live only in the test harness; no sample contacts, texts or places ship in production bundles. Screenshots remain local in .test-artifacts and are not in the release archive.

## Still requires a real Lumiverse install

- GitHub installation, security scanning, startup, disable/re-enable, native floating placement/dragging, drawer recovery and permission revoke/regrant behavior.
- Real theme changes, host typography/scaling, mobile browsers/iOS touch scrolling, soft keyboard behavior and accessibility with assistive tools. A resized desktop browser is not a real phone.
- Actual preset macro resolution, trusted chat context, dry preview, user/persona changes, group/multiplayer chats, ownership and persistence across host restarts.
- Live streaming paint and cold-load hiding; edits/deletes, swipes/regeneration and event timing in the actual message renderer, including tags typed in user messages.
- Actual provider-bound prompt stripping: recent text/tracker settings, source IDs/index markers, preservation of images/media and interaction with other extensions. Code tests verify the transformation, not the final network payload.
- Simultaneous clients/tabs, very long histories and the host's macro timeout. Local serialized tests do not prove distributed concurrency behavior.
- Human first-use check: someone who has never seen it should explain what each of the seven labelled apps does in about five seconds. No human usability study was performed.
- Native CSS isolation/clipping and protected Reset in the real host. The browser harness verifies this in Edge with a substituted placement root; the host may apply additional transforms or wrappers.
- Model compliance with changes-only blocks, story canon, complete attire, physical versus emotional condition, concrete values and no invented player thoughts or texts.

Evidence quotes are conservative textual checks. They cannot prove that a statement is current canon rather than a memory, lie or hypothetical. Ordinary AI-filled fields can change without quotes; user-edited fields require the newer matching quote. Hiding cannot be guaranteed if the extension is disabled, required hooks are bypassed or the host fallback expires.

## Deferred features, not tested as working

Step 5: real conversation lists, per-conversation unread clearing/badges, arrival notices, group text behavior and composer reply drafting/cancellation/preservation. Messages intentionally displays a placeholder; no demo texts are supplied.

Step 6: Helper AI connection listing/removal/fallback, explicit selection and cost note, once-per-completed-reply calls, last 1-10 cleaned messages plus compact tracker, structured output/JSON validation, failures without retries, Update now, and source-chat/revision pinning. These need the later implementation plus a real Lumiverse install and real connection. No generation permission, API keys or paid AI requests were used.

Earlier detailed baseline report: [Step 3 verification](docs/STEP-3-TESTING.md). Checkpoint archives from Steps 1-3 remain unchanged.

## Icon correction 0.4.1

Replaced the original hand-written Home SVGs with the seven requested Lucide icons from a pinned official repository commit. Geometry and upstream license are recorded in THIRD-PARTY-NOTICES.md. Browser checks include all seven SVGs inheriting currentColor. Typecheck, build/package checks and the 89-test baseline pass. No icon package, CDN or external SVG asset is loaded. Native host icon access is not claimed; the docs expose SVG input slots, not a general named-icon lookup API.

## Invisible-phone regression and sidebar Reset (0.4.2)

Before the fix, the new auto-height host-root regression failed with a measured viewport height of exactly 0. It passes after giving the protected phone surface its own definite dimensions. This is a reproduced explanation consistent with the report, not direct inspection of the real host DOM.

Additional browser cases pass: delayed initially detached/zero-size mounting, Reset before the saved appearance arrives, stale hidden-phone CSS not returning after Reset, restoring saved hidden appearance without a refresh, failed CSS storage still restoring the current view, retrying failed floating-widget creation in the same session, sidebar-only confirmation and no duplicate/floating Reset. The existing 89 code tests/304 assertions remain unchanged and passing.

The sidebar recovery screenshot was visually inspected. Real Lumiverse placement, its actual styles/transforms, native pop-outs, permission behavior and mobile WebViews still require verification in a real installation. This test environment made no provider request and cannot verify real prompt stripping or the future Helper AI. Step 5 has not started. [Detailed fix report](docs/FIX-0.4.2.md).
