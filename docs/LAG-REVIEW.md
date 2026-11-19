# Lag review and per-chat activation - 0.18.14

Reviewed November 19, 2026 against 0.18.13. The findings below are code-level costs, not proof of the real server RAM cause. The sections below record the original review. The combined update implements the four primary fixes and the safe indexing/transport improvements, as described in the final section.

## Highest priority: mixed read requests still bypass batching

src/phone-store.ts readOperation keys pending work by operation kind and requires that operation to remain the latest serialization tail. A preview between sync requests prevents them sharing work. Backend story hooks, frontend snapshots, native macros, portrait loading and connection loading all use these paths. Same-kind bursts are bounded well; mixed bursts are not.

Synthetic reproduction with the first history request deliberately held open: 21 same-kind requests caused 2 history reads (one running and one follow-up). Alternating sync/preview caused 21 history reads. These are controlled queue workloads, not an observed count per real generation. The replay memo avoids some replay, but each build still fetches history, resolves identity/card data and hashes full inputs. A slow host can therefore accumulate redundant queued work.

Recommended next fix: a shared read scheduler with mutation barriers and one dirty follow-up. Preserve user authorization, chat isolation and fresh-history checks. Never reuse a snapshot across edits or swipes merely because a timer has not expired.

## Full internal journals cross the UI boundary

src/backend.ts sends snapshot directly from store.sync/update. That includes accepted, edits, Helper evidence and journals which the phone generally does not display. src/frontend.ts retains the snapshot and passes it to both views. The 1,000-message synthetic fixture has a 194,925-byte full document; a rough projection of its display/settings fields is 1,521 bytes. The projection is an illustration, not a verified replacement schema. Portrait-heavy or text-heavy chats differ.

Recommended next fix: define and test a deliberate UI snapshot type, leaving replay journals in backend storage. This reduces copying/serialization/transport without deleting history or user data.

## Unchanged and hidden views are rebuilt

src/frontend.ts applies every snapshot to Sidebar.receive and PhoneView.receive. Sidebar.render replaces its root contents and rebuilds collapsed sections. SetupView.receive also rebuilds its controls. PhoneView.receive redraws its current app even while the phone is closed, except while editing. Portrait construction base64-decodes and validates the same stored image again during those redraws.

This creates avoidable DOM, image validation and layout work. It can also disturb focused sidebar inputs. No infinite animation loop was found. Cost depends on data and device; no real mobile timing was measured.

Recommended next fix: separate story/settings/read/appearance changes; skip unchanged renders, defer hidden app content, retain stable controls and cache validation only for bounded immutable portrait data.

## Chat opening starts work for collapsed features

Sidebar.receive loads connections on a chat change even in Main AI mode with its section closed. The backend connection handler does a preview, then HelperAI.connections does a sync before listing profiles. Personal controls and portrait loading each add their own preview. These independent paths can repeat full history reads on opening a chat. Read receipts also call store.sync before validating an observed receipt, and Main-mode Refresh traverses multiple preview/sync paths.

Recommended next fix: lazy-load the connection list and portraits when needed, authorize with the cheapest safe documented existing checks, and remove repeated replay inside one operation. Missing connection fallback and exact-chat protections must remain.

## Smaller remaining scaling costs

- src/retention.ts uses repeated unique.includes/indexOf while indexing prompt history, then searches admitted texts for each text tag. Large prompts can still do quadratic work despite the engine replay improvement. Use maps/sets and pre-index admitted texts while preserving source metadata and split content behavior.
- src/messages.ts sorts conversations with full-list lastIndexOf inside the comparator. Message threads render every saved bubble. src/message-reads.ts stores full text-bearing receipt strings and returns all seen receipts on sync. Long text histories increase transport and browser work. Index once; consider rendering a bounded visible window without deleting saved messages. Any receipt compaction needs compatibility tests.
- Embedded artwork/fonts make the current frontend bundle about 7.3 MB before transport compression. This is mainly a startup/parse cost, not evidence of a failed-generation leak. Keep the supplied art and typography; do not redesign them to address the higher-priority history traffic.

## Implemented: opt in per chat

Home has Turn on for this chat and Turn off for this chat. The setting is shared on the chat, outside settings profiles. Existing schema-2 journals and legacy tracker storage remain on. Chats with no saved tracker start off. Turning off preserves the stored state, journal, edits, portraits and settings; turning on replays the current selected saved messages without making a model call. When turned back on, established tags saved while off may be imported during that rebuild.

Off chats skip history fetch/replay, player macro expansion, card-name loading, continuity/writing macros, automatic extraction and portrait/connection loading. Refresh is disabled and setup cannot run. A late Helper result cannot save across the revision change. Cheap authorization/saved-state checks and global render-only tag hiding remain necessary. Prompt interception passes through unchanged while off; old saved tags are still hidden visually. Other users see the shared switch when they next synchronize. There is no new cross-user notification API or polling loop.

Appearance and protected toolbar/Reset remain available. No Lumiverse API was added or guessed; the feature uses the existing authorized chat storage, UI and event paths.

## Verification

289 code tests pass, including new-chat zero-history/zero-model behavior, migration, shared activation with separate chats, preserved story data, stale revisions, unauthorized users, profiles excluding activation, Helper late-result rejection and setup refusal. The actual backend mock also checks empty macros, unchanged prompt interception and continued render hiding while off.

29 focused browser checks pass, including on/off Home behavior, preserved stored values, no refresh burst from 1,000 failed generation notifications, activation without a model call and protected Reset while off. Existing full browser-suite limitations remain in TESTING.md.

No real Lumiverse main-process heap, real mobile/device timing, two real users/tabs or live model connection was profiled. This review does not establish that every lag source or the real RAM-growth symptom is resolved. The queue reproduction scripts/results are local under .test-artifacts/lag-review*.ts and .test-artifacts/lag-review*.json; fixtures are synthetic and no private story values are logged.

## Combined update for publication

Implemented the four primary recommendations: mixed reads share a queued snapshot across preview/sync kinds (one fresh follow-up for a running read, with edit/user barriers); a typed PhoneSnapshot allowlist excludes internal journals; unchanged/closed views avoid rebuilding app/settings controls; connections and portraits load when needed. Helper-mode connection validation still runs where required. Main-mode connection/profile/portrait authorization no longer replays history. Metadata-only Helper notices preserve the stored story state.

Also removed redundant backend generation-status refresh notifications (the frontend already receives documented generation lifecycle events), indexed retention admission/source order and conversation recency, filtered stale personal receipts from transport only, and bounded portrait validation reuse. Contact rename events are included as a minimal UI projection so phone/email matching remains equivalent. Preview-only operations never write; a sync in a shared batch is the explicit authorized writer.

Measured on the same synthetic 1,000-message fixture: 21 mixed requests now use 2 history reads rather than 21. The actual typed UI snapshot is 1,539 bytes versus a 194,925-byte internal document. Run scripts/benchmark-refresh.ts to reproduce the current build. Counts, not private content, are printed. These are not real host RAM measurements.

295 code tests and 40 focused browser checks pass. Browser regressions cover stable controls/focus, deferred closed-screen updates, one lazy profile/portrait request, preserved drafts, escaped Add to draft without sending, and outgoing bubbles after the user sends. The per-chat activation checks remain included.

The supplied fonts/artwork stay bundled. Saved messages, journals and personal receipt history are not deleted. Very long message threads still render their stored bubbles when opened, and truly sequential reads still validate fresh authoritative history; this update does not claim constant-cost operation regardless of chat length. No guessed Lumiverse API, timing-only cache, new permission, background model, or permanent retention cap was introduced. Real-server RAM, live provider behavior and actual multi-user/mobile timing remain unverified.
