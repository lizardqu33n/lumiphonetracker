# Saved-message workflow - 0.19.0 local candidate

Normal tracking uses the structured tags written by the main story model. There is no automatic Helper AI / Custom connection extractor. The only model-dispatch path in the built backend is the setup wizard's explicit Run setup action.

## Normal flow

1. Lumiverse saves a message and sends the documented MESSAGE_SENT event with its ChatMessageDTO and trusted userId.
2. The backend authorizes that user for that chat. It parses the new saved message using the existing shorthand/JSON and text/email parsers. Partial streaming tokens are not subscribed to.
3. A checkpoint identifies the previous saved source. For a normal append, validated current state is updated from that one new message. Identical delivery of the latest saved source is ignored. No history request or model call is needed for this path.
4. UI snapshots and macros read saved current state. They do not replay the entire history on every read. Requesting-user persona projection still protects player fields and user/chat authorization stays in place.
5. Display-only tag hiding remains separate. Saved tags stay in the original messages so Refresh can rebuild them.

Startup/opening a chat first performs an authoritative rebuild. Worker restarts and bounded cache eviction revalidate history rather than trusting an indefinitely old checkpoint. The first headless macro evaluation may also need a read-only rebuild until the chat is initialized. Normal appends afterwards need no history fetch. A bounded 128-chat readiness index and the existing one-entry replay memo are used; no full chat history is retained as a new persistent runtime cache.

## Safe rebuild cases

Edits, deletion, swipes, regeneration, insertion/gaps, changed personas, contact merges/renames/deletions, manually edited activity records, and old message formats may require the established full rebuild. Ordinary field edits, locks and setup additions can use the lighter append path. Archived Helper results are preserved as story data and do not cause requests. Refresh tracker explicitly rebuilds the selected saved messages and is always free of model calls.

A checkpoint retains one previous user message for existing call/bank authorship/evidence checks, plus the latest source ID/index/hash. It is backend-only and not included in UI snapshots or macros. Existing full journals and saved messages are not deleted. Long journals still cost validation/copying/serialization, so this does not claim constant cost regardless of chat size. Correctness depends on documented saved-message/mutation events; missing events cannot be detected without a rebuild. Refresh and restart/open revalidation are retained for that reason.

## Setup wizard only

The Connections/Tracker source section and Helper message-count/source options are removed. Setup wizard now contains Setup connection, populated from the requesting user's saved Lumiverse connections. Store only connection_id; no API keys are requested. A stale ID says Connection not found. A missing selection asks the user to choose one; no default connection is guessed.

Selecting a connection, loading choices, reviewing input, previewing data or pressing Refresh never dispatches a model request. Run setup makes the explicit request using that connection and trusted userId. Known character/message/request counts appear first. Preview and explicit Save confirmation, source-only extraction, user-edit protection, safe provider errors, partial/finish-reason rejection, and per-user/chat request pinning remain.

Old source/helperMessages/helperOwner fields and Helper wording/journals are retained for compatibility. They cannot enable a generator through the normal backend or UI. Old Helper wording remains stored but is not selectable or executed. Runtime snapshots and main phone_format output use Main AI tag-writing rules. The legacy HelperAI source is retained for historical compatibility tests; it is not imported into the production backend or frontend. The built backend has one generate.raw dispatch location, in SetupWizard.run.

The existing generation permission is now for the wizard's explicit model request. Normal saved-message tracking does not subscribe to backend generation events or need a secondary connection. No new permission/API/server/key was added. Documented events and installed types were checked against the local Lumiverse developer docs and source; no guessed event payload fields are used for indexing or authorship. Missing/incomplete event payloads take the safe rebuild path.

## Verification and limits

314 code tests and 48 focused browser checks passed. New tests compare append results with complete replay for scene/contact/note updates, texts, calls, bank figures, malformed blocks, old Helper data, ordinary user edits, restart, duplication, source replacement, persona changes and user isolation. Browser checks cover the absence of automatic-source controls, wizard connection selection, zero calls before Run, one request on Run, preview without saving, explicit confirmation, drafting/read receipts, protected Reset and existing layout checks.

Synthetic workload: 1,000 initial messages required one bootstrap history read; 20 subsequent saved replies and 40 cached view/prompt reads required zero additional history reads. Run scripts/benchmark-workflow.ts to reproduce. This measures request counts, not the real server's heap or recovery behavior.

No real Lumiverse install, live provider, real multi-user/mobile server or main-process heap was profiled. The reported memory-pressure stall is not proven resolved. This build is authorized for publication and real-server testing.
