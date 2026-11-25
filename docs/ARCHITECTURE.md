# Architecture

Version 0.19.2 uses the main story model's saved tags for normal tracking. A separate model runs only when the user explicitly runs the setup wizard. See [the saved-message workflow](SIMPLE-WORKFLOW.md) and [the format reference](BLOCK-FORMAT.md).

## Data and identity

Story data, tracker switches and the App Store selection belong to the chat. Read receipts, arrival state, appearance, settings profiles, prompt wording and dismissed hints belong to the requesting user. Backend handlers use trusted host identity and authorize chat access. Missing identity never falls back to another user or a guessed chat.

`PhoneStore` persists a schema-2 document in a chat variable, retaining validated source contributions, manual edits, user protections and compatibility data. Older saved formats remain readable. Per-chat queues serialize mutations inside this extension instance. Each read or update still checks access for the requesting user.

## Saved messages and rebuilds

Trusted saved-message events supply the selected message. Ordinary contiguous new messages can use the checkpoint append path. A bounded readiness index allows current-state reads after authoritative initialization. Edits, swipes, deletions, source gaps, identity changes and complex manual history can require a full rebuild. Refresh tracker explicitly rebuilds without calling a model.

Tags stay in saved messages so data can be rebuilt. Documented tag interceptors and the render-time message-content processor hide them from displayed prose. The outgoing prompt interceptor separately handles prompt retention. Partial or malformed data does not become an unchecked update. See [prompt cleanup safeguards](INTERCEPTOR-TIMEOUT.md) for budgets and limits.

## Macros

The user's preset needs only `{{phone_format}}`. It combines enabled writing instructions and compact continuity. Disabled apps and fields contribute no instructions or continuity. Separate continuity macros remain available.

Native preset assembly may bypass a macro interceptor. Pull handlers use trusted invocation context, including the host-built compatibility fields `env.extra.userId` and `env.chat.id` when present, checking agreement with top-level IDs. These fields were verified against host source but are not guaranteed by the minimal older DTO. If context is unavailable, handlers return empty safely and log a fixed reason. They do not guess the active chat.

## Editing and conflicts

Updates carry the revision originally shown. The backend rejects a stale revision or a changed accepted-story contribution. A detected story-drift conflict invalidates readiness so a subsequent open rebuilds rather than reusing a stale saved view.

The frontend requests a fresh snapshot after an edit conflict and preserves open form input. Save to latest is an explicit user action, not an automatic retry. Contacts and Notes submit modified fields; Locations retain untouched values from the refreshed document. The checks remain in place for changes that happen before another save. This is not automatic same-field conflict resolution.

## Frontend and styling

Phone snapshots use chat ID, document revision and current-player identity to skip duplicate state/portrait serialization. Personal receipts have their own revision and still update on that fast path. A changed identity or revision uses the full display comparison.

The frontend mounts a floating phone and a separate sidebar. Phone custom CSS is isolated from the protected sidebar toolbar and Reset. Theme defaults, variables and stable classes are described in [STYLING.md](../STYLING.md). Phone surfaces stay opaque and AI text is rendered safely.

Messages reply drafting uses the documented composer interface and never invokes Send. User texts are filed only after they are actually sent. Read state remains personal even when story entries are shared.

Frontend request and element IDs use the documented host UUID helper when advertised; direct browser crypto.randomUUID calls are prohibited. The compatibility wrapper is in `src/ui-id.ts`.

## Setup wizard

Only explicit Run setup dispatches a model request through the selected saved connection. Preview and confirmation precede saving, user edits stay protected, and a late result remains tied to its requesting chat and revision. No API key is collected. Legacy Helper data is retained for compatibility, but automatic Helper extraction is not wired into production.

## Failure handling and performance limits

Failure logs include fixed operation, event, outcome and category labels. They distinguish revision mismatch, accepted-state drift, host failures, validation failures and failed frontend notification after a completed tracker operation. No arbitrary exception text, story values, private headers or user/chat IDs enter this logger. Unknown errors remain unclassified.

Normal tracking makes no secondary model request. Cached reads and append processing reduce history work, but growing journals still require validation, copying and serialization. Fallback rebuilding still reads history. Accepted-history conflict detection checks length/tail first, then compares canonical entries without whole-journal strings; it still checks earlier entries. Embedded emoji/contact/weather PNGs are resized at build-maintenance time, not during runtime or by a remote service. Fonts remain embedded. Local tests do not prove the real server's memory-pressure problem is resolved. See [TESTING.md](../TESTING.md) for measured coverage and limitations.
