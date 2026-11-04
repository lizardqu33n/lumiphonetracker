# Step 6: optional Helper AI

Main AI remains the default for each new chat. Helper AI runs only after the user
chooses it and a saved connection. No API keys are requested, exposed or stored.
Settings adds only the source choice, connection picker, Messages to read
(default 3, range 1-10) and Update now. The cost note says:
“Requests may cost money depending on the model chosen.”

## Documented host calls

The implementation uses [generation and connections](https://docs.lumiverse.chat/backend-api/generation/):
connections.list(userId), generate.raw with connection_id/userId, and the
generation lifecycle events. These require the new generation permission.
Raw generation bypasses normal prompt assembly and interceptors; the extension
supplies a system instruction and a single bounded data message. The official
types require type: raw and return unknown, so the adapter supplies that type
and checks the returned content string. No API was invented.

JSON-only output is requested in the prompt and strictly parsed/validated in
code. No provider-specific structured-output option is assumed: documented
Gemini, OpenAI and Anthropic options differ, and a saved compatible endpoint may
not support a particular schema mode. No tools, quiet generation, preset assembly,
Council invocation, chat writes or external helper server are used.

[Council](https://docs.lumiverse.chat/backend-api/council/) exposes read-only
settings/members. It does not document invoking its built-in Sidecar LLM as an
extension service. This extension therefore has its own saved-connection picker;
it does not reuse or change the Council setting.

## Timing, cost and isolation

Only a successful GENERATION_ENDED with a saved assistant message is eligible.
Errors, stops, raw-helper completions without a saved message, user rows,
unselected swipes and mismatched content do not trigger extraction. Started/stopped
events track active streaming. Manual updates are refused while a reply or an
update is running. Concurrent completed replies queue until active streaming ends.

An attempt ID is stored before dispatch, so repeating an event or restarting the
worker does not charge for that event again. Failures are not retried. New replies
and explicit Update now are separate attempts. If all extractable items are off,
there is no model call. Main AI mode and missing permission make no helper call.

The saved source choice is per chat. Automatic work also checks the authenticated
user who enabled it, so another viewer cannot silently use that person's saved
connection. Only connection_id is stored from the profile; name/model labels are
temporary picker data. Connections are checked before dispatch. Missing connection
shows Connection not found and saves Main AI as the fallback. Read-only macros
also use Main AI instructions if a helper connection/permission is unavailable.

The chat, user, revision, connection and source messages are pinned before a call.
The result saves only to that chat. A changed revision, edit, mode or history
discards it. Changing settings aborts an older request through the documented
AbortSignal; a 90-second limit also aborts. Switching back to Main AI prevents
new requests, but a request already started may still be charged by the provider.
Switching chats alone does not cancel a valid result for the original chat.

## Input and validation

Only the last N saved story rows (user/assistant) are sent, with ALL phone-state
and phone-text tags removed regardless of the main-prompt retention settings.
The other data is the enabled compact tracker, player identity and note limits.
There is no Messages content or whole-chat dump. A very large bounded input is
rejected before dispatch rather than silently sending an oversized payload.

System instructions require extraction of explicit story facts, changed fields
only, null for unknown/no update, no story rewriting, invented texts, player
replies, deletions or Misc entries. The helper is not asked to guess unstated
details. Source text and stored values are data, not instructions. Contacts and
Locations use the expanded accepted schema; player private fields are removed.

The whole output must be a valid JSON object in the existing schema. Markdown
fences, extra/forbidden keys and invalid values discard it safely. Disabled fields
are dropped; null preserves old data. User-edited fields need an exact quote from
a newer supplied row naming the changed value. Quotes from older rows do not
unlock them. Literal older facts cannot replace a newer confirmed field. General
semantic truth remains a model-compliance limitation; text matching cannot prove
that prose is current canon rather than a memory or lie.

Results live in a separate per-chat source journal, never inserted into story
messages. The normal chronological replay and manual-edit/cap rules apply.
Deleting, changing or switching the source swipe invalidates its helper result;
later confirmed information wins. The journal survives extension restart and is
not included in macros. Invalid/failing requests keep previous tracker values,
show Tracker update failed, and log fixed reason codes and chat ID only—no
story text, field values, provider errors, profile labels or secrets.

## Verification

Code tests exercise the actual scheduler/store/backend adapter. Browser tests use
a fake saved-connection list and model response, never a paid connection. The
real host's completion ordering, authorization, saved swipes, cancellation,
provider output/costs, model compliance, prompt stripping and Council behavior
still require a real Lumiverse install and connection. See [TESTING.md](../TESTING.md).
