# Pre-generation interceptor timeout - local 0.18.15 candidate

The supplied log says Interceptor timed out (10s) in interceptor-pipeline.ts:155. This identifies pre-generation prompt interception, not the message-content processor. It does not identify the root cause of the server memory pressure or prove Phone Tracker caused it. No real server memory profile is available here.

In 0.18.14 the callback always waited for store.preview before looking at the prompt. That operation can fetch full history, resolve persona/card data, serialize/hash the history and replay the tracker. It could also wait behind other store operations. The callback did not honor cancellation. The registration value 1000 is priority, not milliseconds.

## Local changes

- Untagged history returns immediately with zero host reads. Phone syntax in preset/system entries alone does not trigger tracker history work.
- Tracker/email stripping reads only authorized chat settings, not history. Old text tags outside the recent-text window and texts in a removed/disabled Messages app also skip replay.
- Recent text tags retain the existing saved-source admission check. This path still needs history replay; the change does not weaken NPC/player restrictions or guess identity. Split text parts and actual chat-history metadata keep their previous meaning.
- The callback honors the worker-local context.signal and, when provided, interceptorDeadlineAt. Both exist in the installed official types. Older contexts without these fields use the local fallback budget.
- A 1,500 ms local budget returns the original prompt unchanged. Callback failure, cancellation, expired context and busy admission also pass through. This follows the existing generation-must-continue rule. No stored message is changed. Passing through may leave hidden tags in the outgoing prompt for that one request; visual hiding is separate and remains intact.
- Duplicate jobs for the same trusted user/chat are not queued, and at most four cleanup jobs with unresolved host work are admitted globally. Timed-out jobs retain their admission slot until the actual host request settles, so repeated calls do not create unbounded late requests. There is no automatic retry.
- Cancellation is checked before queued prompt/settings work and between history, persona, card and hashing stages. Late history after cancellation cannot start persona/card/replay work. Other consumers keep their existing batching semantics.
- Tag existence checks stream spans without collecting bodies. Logs contain fixed reasons only, never story text, field values, keys or private headers.

## Limits

The chat history API has no documented AbortSignal argument. An already-dispatched host read cannot be forcibly cancelled by this extension. The local budget is cooperative: memory pressure, synchronous work or a stalled event loop can delay timers. It cannot prevent the host from allocating/serializing the interceptor input before the worker is called. This is a safer failure path, not a proven cure for the server stall.

Source checks used the local Lumiverse developer docs backend-api/interceptors.md and message-content-processor.md, installed lumiverse-spindle-types, and the local host interceptor pipeline/worker cancellation implementation. No new host API, permission or private selector was added. The running server's exact build and memory behavior have not been verified.

## Verification

304 code tests and 40 focused browser checks pass, including nine targeted tests plus actual-backend assertions. Covered: no-tag zero reads; tracker/email zero history; recent/old texts; disabled apps; split text parts; missing identity; off chats; deadlines; host cancellation; bounded duplicate/global work; late reads skipping later work; slot release after actual completion; failed storage and broken logging passing through. Existing text admission, per-user/chat isolation and saved-data tests remain passing.

This candidate remains local and has not been pushed. No real host/provider/heap test was performed. Record the actual server memory trend and exact timeout category when testing; do not treat synthetic timing as a server diagnosis.
