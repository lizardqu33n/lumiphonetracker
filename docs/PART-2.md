# Part 2: Helper failures and Refresh tracker (0.8.0)

This checkpoint is limited to the accepted Part 2. There is no new screen,
setting, permission or paid request in Main AI mode. Keep {{phone_format}}.

## What changed

Settings has one Refresh tracker button in both modes. The old lpt-update-now
class is retained for custom CSS. Main AI rereads this chat's saved messages and
replays the journal, including user corrections and validated earlier Helper
entries, without a model call. It does not delete confirmed data or reinterpret
the whole story. Helper AI requests one extraction using the existing connection
picker and 1-10 message limit. Its cost note stays directly beside the button.
The short result is Refreshed or a failure category. Reply/update activity disables
it. Successful refresh clears an earlier Helper failure notice.

## Trusted identity and operator-scope audit

| Path | Supported identity/scope |
| --- | --- |
| Frontend requests | The backend uses only the second, host-supplied userId from onFrontendMessage. No payload user ID is trusted. |
| Saved connections | Authorize chats.get(chatId, userId) before listing; connections.list(userId) receives the same user. |
| Generation | generate.raw({type: raw, ..., userId, connection_id}) uses the selected user's saved connection. Only connection_id is stored, never credentials or model/profile details. |
| Completed replies | Backend on(event, (payload, userId)) supplies the identity; a missing ID cannot schedule paid work and logs permission missing. No active-user lookup or operator fallback is used. |
| Result journal | Every start/finish/notice authorizes the original chat/user. The pinned owner, connection, revision and saved source-message signatures must still match before saving. |
| Chat history/variables | chat.getMessages(chatId) and variables.chat.get/set(chatId, ...) have no documented userId argument in types 0.6.77. They remain behind chats.get(chatId, userId) authorization; their API is scoped by the explicit chat. No invented extra argument is added. |
| Player name | macros.resolve("{{user}}", {chatId, userId, commit:false}) remains explicitly scoped. |
| Read receipts | Same authorized chat snapshot; userStorage.getJson/setJson receive options.userId, with separate user/chat paths. Helper refresh does not mark messages read. |
| Legacy storage | userStorage.exists/read receive the trusted userId. Appearance/Reset continue to use per-user storage and are unchanged. |

Permission checks, hook registration and logging have no userId argument in the documented signatures; they do not select a user's stored data.

Connection listing and raw generation already passed userId in the prior version.
The audit did not reproduce the other user's exact live-provider failure, so
missing userId is not claimed as its cause. Changes close gaps: authorize before
listing even outside the frontend route; return real outcomes instead of an
unconditional success acknowledgment; classify failures; enforce a provider
response deadline even when cancellation is ignored; and drain a completed reply
queued immediately after a stop event. Two-user mocks now enforce operator IDs on
every relevant supported scoped call.

## Safe failure categories

Every server-side Helper failure warning has only this fixed prefix and category:

    Lumi Phone Tracker: Helper AI: provider error.

No exception text, story, field value, chat/user ID, connection name, model name
or credential is logged. The same category appears in the small phone notice.

| Category | Meaning |
| --- | --- |
| permission missing | Required permission, trusted identity or authorized chat is unavailable. |
| no connection | The saved connection is absent. Connection not found is shown and Main AI becomes the saved fallback. |
| provider error | A provider/host call failed without a more specific safe classification. |
| timeout | Connection listing exceeded 10 seconds or the model response exceeded 90 seconds, or a timeout was reported by the host. |
| empty reply | The returned content is blank. |
| invalid output | The response shape/format cannot be read safely. |
| validation rejected | Recognized data breaks the tracker rules, or the request became stale, cancelled or busy. |

Old data stays. A failure notice may advance the revision but cannot insert model
fields. No automatic retry loop runs. A later completed reply or explicit Refresh
is a separate attempt. Missing/untrusted identity cannot save a notice to a guessed
chat; only its category is logged. Aborting a paid request cannot guarantee a
provider refunds it. An ignored cancellation cannot apply a late response.

## Forgiving parsing without guessing

The common shorthand parser accepts bare lines, a complete phone-state block, or
one complete outer Markdown fence. Older JSON objects remain compatible. Valid
independent shorthand lines or known JSON fields survive a bad neighboring field;
old JSON arrays remain atomic. An explicit empty block/object is a successful
no-change result. Blank output is a failure. No partial JSON or fence is repaired,
no prose-wrapped block is extracted, and text tags/unknown JSON fields are rejected.
Placeholder, length, presence, player-card, enabled-item and exact newer-evidence
rules still apply. Forgiving syntax does not establish that a model's facts are true.

## API sources and limits

The developer docs and installed lumiverse-spindle-types 0.6.77 remain the API
sources: [generation](https://docs.lumiverse.chat/backend-api/generation/),
[frontend communication](https://docs.lumiverse.chat/backend-api/frontend-communication/),
[storage](https://docs.lumiverse.chat/backend-api/storage/) and
[frontend events](https://docs.lumiverse.chat/frontend-api/events/).
Frontend generation events disable Refresh in Main AI even when backend generation
permission is declined; backend checks known active generations before a refresh.
There is no documented synchronous composer isGenerating property used here.
Startup mid-stream can miss the start event; native event delivery/order and
backend permission behavior need a real-install check.

The earlier macro compatibility adapter is unchanged; its source-verified
host-environment identity fields are still not promised by the minimal pull DTO.
Council's built-in Sidecar service is not used. No new extension API is invented.

## Verification

135 code tests (854 assertions) and 119 browser checks pass. Tests include all
seven categories, no secret leakage, two separate operator users/connections,
user-scoped receipts, Main refresh with generation permission denied, complete
fences/partial valid fields, an uncancellable delayed provider, chat/revision
pinning, no retry, stream protection, opaque screens and protected Reset after
hostile CSS. Full report: [TESTING.md](../TESTING.md).

No real second user or real connection was used. Actual server permission grants,
authenticated event IDs, provider routing/errors/costs/cancellation, native stream
ordering and simultaneous tabs/processes remain unverified. The new categories
make the reported live failure diagnosable after updating; mocks cannot identify
which category that server will encounter. Stop here for review.
