# Verification report - 0.8.1 (Launcher fit)

Checked November 4, 2026 (America/Chicago), using Bun 1.4.4, TypeScript 5.7.3, official lumiverse-spindle-types 0.6.77 and headless Microsoft Edge via Playwright 1.58.2. **No live Lumiverse session or real model connection was used. A local Lumiverse build and its user-docs were inspected; that is not live-host verification. No paid model request was made.**

## Launcher fit / transparency (0.8.1)

135 code tests (854 assertions) and 135 browser checks pass. The new PNG is
embedded unchanged as a data URI, with its real 88 x 128 dimensions and alpha.
Only src/styles.css and the launcher asset change production behavior; no handler,
host call, permission or navigation changes. The existing documented chromeless
widget already removes host chrome. The old visible box was our launcher CSS.

Default A keeps the 50 x 50 target, contained art about 34 x 50 and zero padding.
B is demonstrated as 38 x 55 art inside a 50 x 55 invisible target, retaining the
existing minimum width. Tests at 1x/2x check full-height image sizing, adequate
source pixels, object-fit containment, smooth rendering, transparency and no box
shadow in normal/hover states. Only the image receives drop-shadow. Tests check
an inside keyboard focus ring, click/Enter activation, badge stacking and complete
badge bounds, custom sizing/shadow variables, minimum target and no external
image requests. Screenshots compare dark/light test backgrounds and both fits.
Existing opaque-screen and hostile-CSS/sidebar Reset regressions still pass.

A browser check initially exposed intrinsic image dimensions expanding an auto
Grid row for the non-square PNG. Explicit bounded Grid tracks fix it; the image
box now stays within the tap target. The comparison preview is test-only and its
dashed guides never appear in the extension. No demo messages or badges are added.

**Not verified in a real install:** Lumiverse light-theme compositing, actual
mobile density/WebView scaling, host pointer dragging/snapping, native desktop
pop-out clipping and saved custom CSS from other users. The browser harness has
no real Lumiverse drag implementation. The protected placement is unchanged and
can clip large custom shadows at its edges; no host-private CSS is used to bypass
it. Light-background screenshots are not real Lumiverse light-theme verification.

## Part 2: Helper failures and Refresh tracker (0.8.0)

**135 code tests / 854 assertions; 119 browser checks pass.** Type checking,
reproducible built-file checks and manifest/package checks also pass.

- Strict operator mock runs the actual backend for two trusted users with separate
  saved connections, generation userId, chat-authorized journals and per-user/chat
  read receipts. Unauthorized refresh cannot list connections or call a model.
- Each of the seven fixed categories is asserted in the return value, server log
  and persisted notice, with no exception/story/model/profile data in the log.
- Main refresh rebuilds from saved messages with generation permission denied and
  zero provider calls. Helper refresh sends one request and returns its real result.
- Complete Markdown fences and valid neighboring shorthand/legacy JSON fields are
  accepted; incomplete structures, forbidden text output and invalid values stay
  rejected. Empty explicit updates remain valid no-ops.
- A provider ignoring cancellation is bounded by the deadline; its late result
  never lands. Stale revision/source history, source changes and chat switches
  preserve the prior protections. A stop/completion queue race has a regression.
- Browser tests check the single Refresh button in both modes, Refreshed/category
  results, cost note, disabled streaming, 1-10 messages, one completed-reply request,
  missing-connection fallback, opaque screens and hostile-CSS sidebar Reset.
  Existing launcher 1x/2x density, drafts, badges, editing and mobile regressions pass.

The reported live Helper failure was not observed directly. Earlier connection
and generation calls already carried userId; this is an audit/hardening and
failure-reporting fix, not proof that the live failure was an identity error.
See [PART-2.md](docs/PART-2.md) for the call audit, category meanings and API limits.

**Still unverified:** a real second user and saved connection; native operator
permissions and trusted event IDs; final provider routing, error shapes, costs and
cancellation; frontend/backend streaming order and startup mid-stream; actual
server prompt stripping, composer behavior, host mobile placement and concurrent
processes/tabs. No paid request was made. A local host build/source review and
strict mocks do not establish live-host behavior. No undocumented isGenerating
property or guessed user/chat fallback was added.

Historical checkpoints below retain their original scope; Part 2 is now complete.

## Launcher-only update (0.7.1)

The provided PNG is embedded byte-for-byte as a static data URI in src/launcher-icon.ts. The actual file is 256 x 256 RGBA, not 128 x 128. It is assigned through an ordinary img.src property; there is no HTML injection or external image request. Image alt is empty/aria-hidden because the native button is labelled Open phone. Normal image-rendering:auto and object-fit:contain are used, with no pixelated scaling.

Eighteen new browser checks run at deviceScaleFactor 1 and 2: decode/transparency, native resolution, about 40px artwork within the original 50px target at the original position, smooth scaling, decorative accessibility, badge layering, click and Enter activation, live custom-CSS sizing/shape/background, and no external image loading. The 1x/2x dark-theme screenshots, custom 2x view and overlaid-badge view were visually inspected. The badge used for the overlay test is a temporary test-only DOM fixture; no production unread badge behavior was added. Existing Home icons, read receipts and sidebar Reset are unchanged. No new variables or permissions.

Still not verified: the real host's mobile launcher size/placement, actual device/WebView resampling and OS density, real-user custom CSS, or how the art looks in the user's live Lumiverse install. Headless desktop Edge density emulation is not physical mobile-device verification. Part 2 was not included in that launcher checkpoint.

## Part 1: shorthand and compliance (0.7.0)

Main AI and Helper AI are asked for the same compact shorthand. It maps into the existing validated journal schema, preserving saved JSON blocks and earlier Helper journals. No new Spindle call, permission, identity source, UI setting or control is introduced. The strict operator-scoped backend mock and existing user/chat isolation tests still pass. Actual native server context remains subject to the earlier compatibility limit.

New tests cover every shorthand record; old JSON/data equivalence and long legacy values; independent valid-line acceptance; per-identity duplicate rejection; placeholders and empty attire; 12/19/14/6-word boundaries; malformed separators, quotes and inference; one-pass entity decoding; incomplete/multiple/oversized blocks; hiding; confirmed-presence admission; current-place deduplication; evidence and user edits; opt-in inference; same-source partial edits and alternate swipes; literal macro safety; Helper shorthand parsing and forbidden narration/texts. The default Helper fixture now returns shorthand, exercising request, validation, journal persistence and rebuild without a provider. Older JSON response fixtures remain as compatibility tests.

Length limits apply to NEW shorthand values. Legacy JSON keeps its character-based limits so old long facts remain readable. New compliance admission rules still apply on replay. Invalid shorthand records are atomic; valid records for other names still update. Legacy arrays remain atomic. Syntax diagnostics retain safe field names/line numbers/fixed reasons; no new phone notices are added.

Contacts: new AI records require confirmed Present membership. With Present off and no matching previously confirmed presence, they are not admitted. Mere prose mentions/offscreen names do not qualify. Existing absent contacts retain known values. This is a deterministic canonical-list check, not semantic proof of physical presence. The existing player card/manual contacts remain supported. Known old invalid placeholder updates are ignored rather than overwriting facts. A new Locations entry matching the current Scene location is skipped; existing named place records may update.

Key-item function, meaningful places, actual story establishment and changed-only model compliance remain prompt/model obligations; a line parser cannot prove those semantics. No balances or story figures are computed or adjusted. The user-docs review found no new API or macro-registration change; conflicts and build-version limits are recorded in [USER-DOCS-REVIEW.md](docs/USER-DOCS-REVIEW.md).

The same-data [TOKEN-REPORT.md](docs/TOKEN-REPORT.md) measures complete before/after strings, including whitespace: empty-chat phone_format 2,147 to 1,680 characters; populated 2,788 to 2,364; sample block 815 to 552. Tokens are only rough character-count/4 estimates, not model-tokenizer counts. Full outputs/sample blocks are bundled separately, never inserted into a chat.

**Historical Part 1 checkpoint:** Part 2 was not included. Existing Helper failure notices/categories, Update now button, scheduling, connection picker, user ID flow and read receipts are unchanged. Only its requested output format/parser changed for Part 1. The generic notice described that checkpoint; 0.8.0 now names failure categories.

## Stylesheet update

The supplied stylesheet is copied byte-for-byte into src/styles.css. STYLING.md documents its 62 variables and 107 stable classes. The browser suite also exposed fractional-height rounding that clipped the closed-phone text notice; its measured height now rounds up. No navigation, tracker rules or class names changed.

## Native preset-path fix (0.6.4)

The real-server report confirmed 0.6.3 and granted macro_interceptor permission, yet phone_format still logged no userId. Inspection of the official host at commit 45f8db563e1c314ed2aab227613b28eb5ea1084e found the missed dispatch path: prompt-assembly.service.ts evaluates native preset content with sourceOwner:"host"; MacroEvaluator.ts deliberately skips the macro interceptor for that owner. The registered pull macro is still called. Its RPC contains no top-level userId, but serializes the host-built environment, including env.extra.userId and env.chat.id. buildEnv populates that userId from its authenticated user context or the owning chat. This explains why granting the permission did not fix native preset entries.

The pull handler now accepts those exact host-supplied paths, or valid top-level IDs where a host supplies them. If top-level and environment IDs disagree, it returns empty before any read. Model/preset text, args, variable values, tag attributes, saved helper owner and foreground/active-chat state are never identity sources. Every actual operator-scoped API call still receives the resolved user, and the chat is authorized before reading. No global cache or write is introduced.

**Contract limit, stated plainly:** commit and optional top-level chatId are in the published minimal pull DTO. env.extra.userId and env.chat.id in pull RPCs are implementation fields verified in official host source, not promised by that minimal DTO or the prose macro page. This is a guarded compatibility adapter, not a new Spindle API. Hosts omitting both supported identity representations still get empty output and the same safe warning; generation continues. No exact payload from the user's running host was captured, and 0.6.4 has not yet been tested on it.

**Regression:** the new actual-backend test directly invokes the registered pull handler with the host-shaped preset payload, completely bypassing the macro interceptor. Before the fix it failed: expected tracker-writing instructions, received an empty string. After the fix it passes in both dry and normal commit modes under the strict operator mock. Additional checks cover an empty new chat, simultaneous users in different chats, unauthorized access, conflicting IDs and spoofed identity only in args/variables. No preview writes or provider calls occur. Previous template-hook tests remain, but are no longer used as evidence that native preset dispatch was tested.

There are no new permissions, screens, settings, stylesheet or tracker-format changes in 0.6.4. Keep {{phone_format}} as the preset entry. Existing safe empty reasons and optional prompt processing are unchanged.

Pinned primary-source evidence: [native preset assembly](https://github.com/prolix-oc/Lumiverse/blob/45f8db563e1c314ed2aab227613b28eb5ea1084e/src/services/prompt-assembly.service.ts), [interceptor bypass](https://github.com/prolix-oc/Lumiverse/blob/45f8db563e1c314ed2aab227613b28eb5ea1084e/src/macros/MacroEvaluator.ts), [pull RPC serialization](https://github.com/prolix-oc/Lumiverse/blob/45f8db563e1c314ed2aab227613b28eb5ea1084e/src/spindle/worker-host.ts), [environment construction](https://github.com/prolix-oc/Lumiverse/blob/45f8db563e1c314ed2aab227613b28eb5ea1084e/src/macros/MacroEnv.ts). Published contract: [macro docs](https://docs.lumiverse.chat/backend-api/macros/) and official lumiverse-spindle-types 0.6.77.

## Blank-format attempt (0.6.3, incomplete native-preset coverage)

**Cause:** 0.6.2 required top-level userId AND chatId on its pull macro context before it even called formatMacro. Missing either returned empty. The documented minimal pull DTO guarantees only commit and optional chatId, not top-level userId. Current official host source also constructs the pull payload without a top-level userId. That makes the no-userId guard a concrete explanation consistent with the reported multi-user blank; the exact payload of the user's installed version has not been captured. Missing chat is separately reproduced. Main AI, no stored facts and only SOME disabled items do not explain an empty format.

**Fix:** registerMacroInterceptor runs before macro parsing, with its documented userId and env snapshot. It replaces only the six owned phone macro tokens and leaves other macro names and caller dynamic overrides for native evaluation. env.chat.id is used only when it is a non-empty host-supplied value; the official MacroEnv builder confirms that layout, though the minimal type describes chat as a general record. No user ID is read from story/tag attributes, args, preset text, extra fields, saved helperOwner or global current-user state. The same path works with commit:false and commit:true and never saves during resolution. Calls still authorize the exact chat. A volatile result avoids cached values across changed settings; the only shared snapshot is local to one template invocation.

The new macro_interceptor permission is used only to resolve phone tokens using that per-evaluation context. Grant it on update. No UI, format, model calls or other settings were added. The original {{phone_format}} preset entry stays the same.

**Empty chat:** a valid new chat with no saved document and no messages still supplies default enabled writing instructions in Main AI. A saved settings-only document applies its switches with no need for tracked values. Continuity macros are empty until facts/texts exist. Tests also cover weather as the only enabled item. formatMacro's writing branch depends on settings, not on an accepted block or populated field; that behavior was already present and is now reachable via documented context.

**If context is truly absent:** there is no documented way to recover the exact evaluation's user/chat from a context-free pull invocation. The macro interceptor can use env.chat.id when the host supplies it. If it too lacks userId or chat, the result is empty and generation continues. chats.getActive(userId) is documented, but represents a persisted foreground selection; it can differ from a concurrent/background generation. It is deliberately not used as a substitute. A context handler also documents request chat/user on supported hosts, but no global handoff/cache or extra context_handler permission was added.

**One-line console warnings:** `Lumi Phone Tracker: phone_format empty: REASON.` Fixed reasons are `no userId`, `no chat`, `extension setting`, `all items off`, or `Helper AI mode`. Extension setting covers missing read/macro permission or an unavailable/unauthorized tracker read; it is not a new switch. A fully disabled extension cannot run and therefore cannot log. Helper AI alone does NOT blank phone_format: the existing no-state-block rule and enabled text instructions/continuity remain. Helper AI mode is logged only when its complete format result is actually empty (all applicable items also off). No story text, values, names, chat IDs or exception details appear in these warnings.

**Tests:** the old backend failed the new registration regression. The updated strict operator mock invokes the documented macro hook without any top-level pull chatId, checks explicit user IDs on all supported user-scoped calls, and supplies the exact evaluation chat in env. Both normal and dry modes produce writing instructions in an empty chat; no storage writes or provider calls occur. Concurrent users resolve only their own chats; unauthorized cross-user reads return empty. Tests cover absent user, absent chat, failed reads, partial switches, all-off, Helper behavior, permission denial, dynamic override precedence and all five fixed warning reasons. No chats.getActive call is made by macro resolution.

Sources: [macro contexts and dry resolves](https://docs.lumiverse.chat/backend-api/macros/), [documented macro interceptor](https://docs.lumiverse.chat/backend-api/macro-interceptor/), [generation context handlers](https://docs.lumiverse.chat/backend-api/context-handlers/), [active-chat semantics](https://docs.lumiverse.chat/backend-api/chats/), official lumiverse-spindle-types 0.6.77, and corroborating official [MacroEnv builder](https://github.com/prolix-oc/Lumiverse/blob/main/src/macros/MacroEnv.ts) / [pull payload construction](https://github.com/prolix-oc/Lumiverse/blob/main/src/spindle/worker-host.ts). Host source was consulted to confirm the cause/layout, not to introduce a new API.

## User-context fix and call audit (0.6.2, retained history)

The strict operator mock first failed with exactly **userId is required for operator-scoped extensions**, at backend.ts's player-name `macros.resolve` call reached through the prompt interceptor. After the fix, both Dry Run and normal interceptor invocations pass. The interceptor previously requested `required: true`, so the uncaught failure aborted generation. It is now optional, catches read/authorization failures and returns the original prompt unchanged. Missing chat/user does the same. Macro failures return empty. Warnings contain fixed explanations, not story text, field values or raw exceptions; even a logging failure is contained.

| Handler / call | Audit and fix |
| --- | --- |
| Pull macro -> PhoneStore -> `macros.resolve("{{user}}", options)` | Previously missing userId. The read path now takes explicit user context and passes `options.userId` with `commit:false`. Preview also authorizes the chat before reading it. |
| Prompt interceptor -> same read path | Uses `InterceptorContextDTO.userId` and `.chatId` from the host. Neither current frontend chat nor saved helper owner substitutes for identity. |
| Backend lifecycle events -> sync -> same read path | The typed optional second callback argument supplies userId; it now survives player resolution. Events without user context cannot start an extraction or sync. Generation started/stopped still maintain streaming state without storage calls. |
| Frontend tag handlers | Payload documents chatId/isUser/isStreaming but no userId. Handlers call only `ctx.sendToBackend`; the backend receives the authenticated second callback argument. No identity is copied from tag attributes or the payload. |
| Backend message-content processor | Has `ctx.userId`, but only performs a pure tag-hiding transform. Makes no storage, chat, macro or generation call. |
| `spindle.chats.get` / `getActive` | Already receive userId. Preview authorization now uses it too. |
| `spindle.chat.getMessages` | Takes chatId and optional message-read options, with no userId option in the published contract. No invented argument added; authorized chat identifies the read. |
| `spindle.variables.chat.get` / `set` | No userId parameter. Documentation says these derive the owner from the chat record. No local/global variable APIs are used. |
| Appearance and Reset: `userStorage.getJson` / `setJson` | Already pass options.userId from the authenticated frontend callback; no missing-ID defect found. Missing callback identity now drops the request without broadcasting. Reset's local same-session recovery is unchanged. |
| Read receipts: same userStorage calls | Storage was already scoped. Their preceding chat sync was affected by the player-resolution omission and is fixed. |
| Legacy `userStorage.exists` / `read` | Already pass the user ID positionally. No `spindle.storage` calls are used. |
| Helper `connections.list` / `generate.raw` | Already pass userId, including the raw request object. The later preview and shared player-resolution path lost it; both are fixed. Macro preview now checks only the invoking user's connection, never another saved helper owner's profile. |
| Registration, permissions, logging, capability declaration | Extension-local APIs; no userId parameter. Targeted `sendToFrontend` calls use the authenticated user; unscoped frontend requests are ignored. |

**Historical 0.6.2 limit, attempted in 0.6.3 and corrected for presets in 0.6.4:** the official minimal pull context does not guarantee userId. Returning empty was safe but left phone_format blank. Version 0.6.3 now uses the documented macro interceptor's userId and env.chat snapshot before native macro parsing. It requires macro_interceptor permission. The legacy pull function is only a fallback, still returning empty rather than inventing identity.

Regression coverage includes all six macro handlers; missing/null/blank context; unauthorized users; failed reads and failed logging; zero preview writes; exact original prompt pass-through; authenticated lifecycle sync; read receipts; appearance save/Reset; missing frontend identity despite a forged payload userId; manual and completion-triggered Helper requests. The mock requires explicit IDs for user-scoped API methods, but correctly does not invent IDs for chat-derived APIs. No model provider was called.

Sources: [macros](https://docs.lumiverse.chat/backend-api/macros/), [interceptors](https://docs.lumiverse.chat/backend-api/interceptors/), [variables](https://docs.lumiverse.chat/backend-api/variables/), [chat mutation](https://docs.lumiverse.chat/backend-api/chat-mutation/), [frontend communication](https://docs.lumiverse.chat/backend-api/frontend-communication/), [message tags](https://docs.lumiverse.chat/frontend-api/message-tags/), [macro interceptor](https://docs.lumiverse.chat/backend-api/macro-interceptor/), and the official lumiverse-spindle-types 0.6.77 API declarations (recommended by the TypeScript setup docs). The prose interceptor/events pages omit some identity details exposed by those declarations. No API signature was widened to invent an argument.

## Passed in code

- 127 behavioral tests, 750 assertions, zero failures, across seven test files.
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
- The actual backend is loaded with a strict operator-scoped mocked host. It checks user-scoped connections, the raw generation adapter, chat-authorized read receipts, zero default Main calls, explicit Helper Refresh tracker, and generation-hook registration. Unknown return data from the published raw API is checked for a content string.

## Passed in a browser with a mock host

119 checks exercise actual frontend, store, read service and Helper AI controller. Host placement, events, connections, provider response and composer are substitutes.

- Browser fixtures now establish Bea in an earlier shorthand scene before testing her absent card; an offscreen-only Ivo contact is not admitted. Older JSON rows remain in the same history, and no fixture data enters production bundles.
- All seven icons/navigation, explanation dismissal, Scene/Weather edits, Contacts/player restrictions, Locations, Notes, grouped switches, safe text rendering and CSS customization.
- Retained zero-height placement regression (old code observed at exactly 0 height), delayed mounting, late appearance responses, same-session Reset, failed storage/placement recovery and the single protected sidebar Reset/confirmation.
- Opaque backgrounds across Home and every app, frame/content/cards/sections under translucent theme fills, plus solid dark fallback without a theme fill.
- Real-data Messages workflow: multi-sender conversations, badges clearing only the opened conversation, optional known time, restart read persistence, new/closed-phone notices, draft/caret preservation, append-without-send, cancellation, explicit simulated user Send before filing, manual recipient tags, default AI-player-text rejection, unsupported/wrong-chat composer safety and stale-form refusal after switching.
- Helper AI source/connection choice, exact cost note, editable 1-10 message count, no request merely from choosing a mode/profile, explicit Refresh tracker, disabled updates during streaming, one request on completed saved reply, invalid-JSON notice/retained data/no retry, late source-chat saving, missing-profile fallback and visible Main AI selection without another call.
- Desktop, mobile-sized and short/keyboard-sized viewports; no browser errors. Home, Scene, Messages, recovery and Helper Settings screenshots were visually inspected. Test-only fixtures/screenshots are not in production bundles.

## Not verified without a real Lumiverse install and connection

- Real model compliance with shorthand, changed-only updates, evidence suffixes, short item names, word limits, scene presence and no ordinary-prop logging. No real second-user session or connection was used. Native streaming, saved-history rebuild, server macro context and final provider-prompt stripping still need live checks. Character/4 estimates are not actual provider billing/token measurements.

- Native preset Dry Run and normal generation after installing 0.6.4 on the reported server; whether its Lumiverse build serializes the pull environment as the inspected source does. The user confirmed 0.6.3 and its permission, not successful 0.6.4 behavior. Server/version/runtime-specific dispatch, live simultaneous users and final provider prompt contents still need verification.

- Repeating the reported failing Dry Run and normal generation on the user's install after updating. Grant/revoke/update handling for macro_interceptor; whether that host supplies userId and env.chat.id on the macro interceptor during the real preset Dry Run and all generation paths; no live payload was captured. Correct native placement of the resolved text, cache invalidation, nested/scoped macro composition and concurrent users need real-server verification. Host timeout/process isolation, optional-interceptor fallback and final provider prompt payload need real-host verification. The local strict mock proves the reported missing-ID call is fixed, not that native installation was tested.

- GitHub install/update/security scanning, native permissions and revocation/regrant, restart/disable/re-enable, real host placement/styles/transforms, desktop pop-outs and actual mobile/iOS WebViews.
- Native generation event ordering, saved-message timing, authenticated event user IDs, group/concurrent/background swipes, stopped partial replies and startup during an already-running stream. The scheduler uses documented events; it cannot observe a start event the host never delivered. Final content must match the selected saved assistant row or automatic extraction is skipped safely.
- Real saved connection listing/removal, chosen provider/model routing, cancellation/timeouts, model pricing/usage, real shorthand compliance, once-per-reply behavior through the actual host and source-chat persistence after a live chat switch.
- No provider-specific schema mode is forced. Shorthand-only prompting plus strict validation is implemented (older JSON responses remain a compatibility path); a real model may still return invalid data, which must be ignored. Model compliance with changed-only facts, exact chronology, story versus memory/lie, complete attire, no invented details/texts/player thoughts and newer-quote protection still needs live testing.
- Council settings were read in documentation only. The docs expose read-only Council configuration; they do not document an extension call to run its built-in Sidecar LLM. This extension uses its separate saved-connection picker.
- Actual composer append/focus/draft persistence, attachments, selections, user Send/edit/cancel behavior, saved user author metadata, user-tag interception/hiding and native streaming paint/cold-load behavior.
- Real macro resolution and trusted contexts, operator/multiplayer scope, long histories/pull timeouts, simultaneous processes/tabs, and interactions with other extensions. In-process queues do not prove distributed locking across multiple workers.
- Actual outgoing provider prompt stripping (default recent texts 3, trackers 0), configured retention, source markers and media preservation. Code tests verify transformations, not a final network payload. Helper input is tested separately to strip ALL phone tags.
- Human first-use clarity: a new person should identify each app within about five seconds. No human usability study was performed. Custom CSS can intentionally make the phone transparent or hide it; native recovery still needs a real-host check.

The earlier real-install v0.4.1 failure was user-reported. Its layout cause was reproduced locally and retained as a regression, but this environment has not validated 0.6.4 in that install. Publishing source to GitHub does not verify native installation or make a model request.

Earlier reports: [Step 5](docs/STEP-5-TESTING.md), [Step 4](docs/STEP-4-TESTING.md), [Step 3](docs/STEP-3-TESTING.md). Previous archives are preserved. All original build steps are delivered. Parts 1 and 2 are complete. Stop after Part 2 for review.
