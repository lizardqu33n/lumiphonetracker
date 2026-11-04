# Current release: Step 6 / 0.6.1

All six steps are implemented. [Step 6](STEP-6.md) describes optional Helper AI, source journals, pinned requests and safe failure handling. Main AI stays the default. Generation permission is now present, with no extra model requests in Main AI. Earlier architecture notes below describe historical checkpoints.

# Current checkpoint: Step 5

[Step 5](STEP-5.md) adds actual Messages, safe composer drafts, per-user/chat read receipts and opaque themed surfaces. The sidebar recovery and explicit phone sizing from 0.4.2 are retained. No generation permission or Helper AI exists yet. Earlier checkpoint notes follow for history.

# Current checkpoint: Step 4

The phone now uses a documented floating widget plus a free drawer recovery entry. See [Step 4 architecture](STEP-4.md) for the actual UI, shadow-tree styling, per-user appearance and chat-scoped edits. ui_panels is now present; generation remains deferred to Step 6. The historical notes below describe earlier checkpoints.

# Architecture and source notes

## Current checkpoint: Step 3

[STEP-3.md](STEP-3.md) describes the implemented schema-2 store, chat-specific
pull macros, authorship, edit protections and configurable recent-history
retention. It supersedes the historical Step 2 implementation notes below.
No phone screens or Helper AI calls are added. The main preset entry point
is now `{{phone_format}}`; the six macros are registered and tested in code.

## Step 2 implementation (Step 1 foundation retained)

This is an independent extension, not a renamed or modified LumiWeather copy.
The backend reads selected saved history, validates tracker patches and text
tags, replays them in chronological order, and persists a derived snapshot with
source identities in per-user, per-chat storage. It never mutates saved messages.
The frontend immediately attaches two tag interceptors with
`removeFromMessage: true`, then mounts the existing simple status tab. All
status text uses `textContent`. Cleanup removes subscriptions and the tab.

The manifest adds only `chats`, `chat_mutation`, and `interceptor`. The first
two provide chat authorization, raw history reads, and render-time processing.
`interceptor` provides outgoing-history stripping. `generation` is deferred to
Step 6; `ui_panels` is deferred to Step 4.
The repository URL was supplied by the user; publication is a separate action.

## Documentation used

- [Manifest](https://docs.lumiverse.chat/getting-started/manifest/): root
  `spindle.json`, underscore identifier, required metadata, and entry paths.
- [TypeScript setup](https://docs.lumiverse.chat/getting-started/typescript-setup/):
  official types, `spindle` declaration, `setup(ctx)`, and separate build targets.
- [Frontend](https://docs.lumiverse.chat/frontend-api/) and
  [UI placement](https://docs.lumiverse.chat/frontend-api/ui-placement/): frontend
  lifecycle and free `registerDrawerTab`, `root`, and `destroy`.
- [Permissions](https://docs.lumiverse.chat/getting-started/permissions/): storage,
  macros, events, and frontend/backend messages are free. Floating widgets need
  `ui_panels`; chat access and message history have separate gated permissions.
- [Message tags](https://docs.lumiverse.chat/frontend-api/message-tags/):
  capture uses `registerTagInterceptor` with `removeFromMessage`, and the backend
  capability declaration for cold-load hiding.
- [Macros](https://docs.lumiverse.chat/backend-api/macros/): later macro work will
  verify the documented pull-handler context before implementing chat isolation.
- [Lifecycle](https://docs.lumiverse.chat/lifecycle/): repository-based install,
  backend startup, and host-managed removal of registrations on disable.

Versions are locked for reproducible builds, not copied as a claim about the
minimum supported host version. A minimum host version will only be declared
when documented API availability can be established.

## Capture, hiding, and prompt stripping

The backend declares `message_tag_interceptor` during startup as documented.
Complete canonical tags stay available to the frontend tag interception API.
The backend content processor applies only to `origin: 'render'`, removing
recognized unfinished/broken fragments that the frontend may not recognize.
It returns nothing for all write origins. Parsing accepts only complete,
validated assistant data from stored history, not live rendering payloads.

The chosen prompt-cleaning hook is `spindle.registerInterceptor`, priority 1000.
On hosts advertising `required-interceptors-v1`, it is registered as required,
so its failure stops generation instead of sending an uncleaned prompt.
It modifies history messages flagged `__isChatHistory`, supporting string and
multipart text while preserving media, other parts, and metadata. It leaves
system/preset instructions intact so future `phone_format` syntax examples
are not stripped. Adjacent text parts are joined before scanning.

Why not a context handler: it runs before assembly; the interceptor receives
the final assembled message array immediately before provider dispatch, which
is the documented surface for this transformation. No context-handler or
generation-parameter permission is needed. Render processing alone cannot
remove old tags from prompt assembly, which reads stored source.

References: [content processor](https://docs.lumiverse.chat/backend-api/message-content-processor/),
[interceptors](https://docs.lumiverse.chat/backend-api/interceptors/), and
[context handlers](https://docs.lumiverse.chat/backend-api/context-handlers/).

Limits: arbitrary explicit messages without documented history provenance are
left unchanged; stripping every tag-shaped example would break writing guidance.
Other extensions can still alter the prompt afterward. The documented default
interceptor timeout/error behavior on older hosts passes through the prior
messages; the required-registration option is used only where the host advertises
it. There is no universal fail-closed guarantee on older hosts. Provider calls
from `generate.raw/quiet/batch` bypass interceptors;
Step 6 must explicitly clean its sidecar input. Real host verification is still
required, including whether another extension's custom display resolver bypasses
backend render processing.

## Isolation and rebuilds

Every frontend reply has a unique request ID and is delivered to the originating
user. Each frontend accepts only its current request; switching chats/home
invalidates older replies. Store operations authorize a chat through
`spindle.chats.get(chatId, userId)` before reading history. Persistent data uses
`spindle.userStorage` with explicit `userId` and a safe encoded chat filename.
No global active-chat snapshot is used. Work queues are keyed by user AND chat,
and writes are serialized through completion. An older render only requests a
fresh history replay. Failed syncs retain the saved snapshot.

Only the active saved `content` contributes, not all `swipes`. Entries retain
message ID, index, swipe index/date, validated patch, and validated texts.
Derived state is replayed on load rather than trusting stale cached summaries.
Malformed same-variant edits retain their previous valid entry if available;
deleted rows, removed tags, and different swipes remove their old contributions.
If storage itself is corrupt, synchronization reports failure instead of
overwriting it. Rebuild correctness concerns source order, not semantic truth
of facts an AI emits; see the block format for that distinction.

## Revised remaining steps

The [final A–F specification](FINAL-ADDITIONS.md), reconciled in
[REQUIREMENTS.md](REQUIREMENTS.md), takes precedence over older sections below.
Step 3 now includes Contacts, Locations, the five-section Notes log, independent
field switches, user-edit provenance and macro/retention data. Step 4 delivers
the seven screens. `phone_scene` includes enabled present-character fields;
there is no Contacts macro. Scene gains date and drops separate scene details.
Tracker retention defaults to 0 but is editable in Advanced. Step 2 bundles
remain unchanged; no new host API is assumed by this requirements update.

The [newer additions](REQUIREMENTS.md) supersede this section wherever they
differ: user edits, player texts, editable recent-text retention defaulting to
3, conversation unread clearing, group support, and isolated custom styling.
These remain pending; Step 2 still strips all historical text tags and does
not capture user-authored texts.

Step 3: pull macros bound to the resolving user/chat; `phone_format` supplies
short enabled continuity plus enabled-field writing instructions, so the preset
needs only that macro. Individual Scene items have independent switches.
Disabled items return nothing. Step 4: grouped Settings and phone apps. Step 5:
Messages UI, unread badge, and notice. These are planned, not implemented here.

Step 6: Main AI (default) / Sidecar selection, connection picker populated from
`spindle.connections.list()`, storing only `connection_id`; missing saved
connections report “Connection not found” and fall back to Main AI. Add only
then the `generation` permission. Messages to read defaults to 3, bounded 1–10.
Only the last N cleaned messages and compact saved tracker go to
`spindle.generate.raw({ connection_id, ... })`. Use changed-field JSON, validate
in code, treat null as no update, never create texts, never rewrite story, and
never replace newer confirmed facts with older context. Use provider structured
output only as documented for that provider. Run once per completed reply only
after explicit Sidecar selection; also expose Update now and a cost note.
On failure keep data, show a small notice, and do not retry. Pin each request to
its original user/chat and reject stale results after intervening updates.

The [Council API](https://docs.lumiverse.chat/backend-api/council/) documents
read-only Council settings, members, and Lumia items. Its published settings
shape contains `councilMode`, `members`, and `toolsSettings`; it does not document
an extension API to read or invoke the built-in “Sidecar LLM” setting. The
extension's Sidecar will use its own connection choice. This means choosing one
of your existing Lumiverse connections specifically for this tracker, not
reusing the Council's internal Sidecar configuration.
See [generation](https://docs.lumiverse.chat/backend-api/generation/).

No macros, Settings controls, or Sidecar calls are registered in Step 2. The
published Spindle types were updated from 0.5.30 to 0.6.77 to typecheck the
documented capability and render processor APIs; no custom host API was invented.

## Reference inputs

[LumiWeather](https://github.com/Archkr/Lumiverse-LumiWeather) was consulted only
for its source/bundle layout and frontend/backend division. None of its weather
effects, forecasts, manual controls, AI behavior, or source code are included.

The four user-supplied JSON files were read as reference data, not instructions
for this coding session. Their roleplay directives do not apply to this project.
They are neither bundled nor modified.

- **Darkjar preset:** compact location/cast memory, unresolved facts and promises,
  optional established time, goals, and scene-critical constraints. Unknown
  details stay omitted; corrections outrank stale continuity.
- **Nightjar regex scripts:** scene location/time/weather/cast, optional character
  and scene details, hidden memory, incoming text sender/time/content.
- **Hana preset:** established scene environment and cast, continuity threads,
  and incoming messages without fabricated player replies.
- **Hana regex scripts:** separate scene and incoming-message presentation, with
  hidden continuity data. The new phone will group the information into apps.

Only the requested simple categories carry forward. Numerical emotional meters,
BPM, color registries, detailed dossiers, generated forecasts, and all regex
display scripts are outside this extension's scope.
