# Lightweight tracking and diagnostics

## Choose prompt macros at installation

GitHub installation: `main` keeps macros; the `testing` branch selects no prompt macros by default. Use Lumiverse's branch selector and keep that branch selected for updates.

The normal package keeps all phone macros. The optional `-no-prompt-macros.tar.gz` package uses `dist/backend-no-macros.js` and never registers native phone macros or a macro interceptor, even after permissions change. The operator selects one package for this extension instance; this is not a per-chat or per-user switch. Change the package files/manifest and disable/re-enable the extension to change builds; do not uninstall, because uninstall deletes extension storage. GitHub updates restore the normal manifest, so reapply the alternate manifest afterward if desired. Both use the same extension ID and saved data. Do not install both as separate extensions.

In the alternate build, remove `{{phone_*}}` macros from presets: expansion is unavailable. The phone, manual edits, saved-tag tracking, read receipts and explicit setup wizard remain available. To ask for tags, copy literal writing instructions from the Phone sidebar wording Preview or the block-format guide into your preset; manually keep those instructions in step with app switches. Old-tag prompt cleanup remains registered. It does not register a template macro hook.

The local Lumiverse source at `src/services/prompt-assembly-worker-client.ts` gates its prompt worker on non-built-in macro registrations and the macro-interceptor chain. This build removes Phone Tracker's contribution to those two conditions. Other extensions, host configuration or future host changes can still select the main-process path. No undocumented unregister/restart API is used.

API sources: [Macros](https://docs.lumiverse.chat/backend-api/macros/), [Macro interceptor](https://docs.lumiverse.chat/backend-api/macro-interceptor/). They describe registration but do not promise which internal process assembles a prompt.

## Rebuilds and refreshes

Every authoritative rebuild reads current saved messages and fingerprints each message's ID, chat, index, role, author, selected swipe, selected-swipe date and content. Ordered fingerprints, current stored tracker, requesting user, player identity, card names and legacy data determine reuse. Edits, removed/replaced messages, reordering and swipes invalidate reuse. There is no timer-only correctness cache.

SHA-256 receives bounded string chunks rather than a serialized whole-chat proof. Cache size is counted without constructing a JSON string or byte buffer. Read-only rebuilds share an internal result; mutation paths and public full-document callers receive isolated ownership. The single replay cache remains capped at 2 MiB. String storage RPCs still require serialization when actually saving.

Queued duplicate reads combine. Arrivals during a first active read share one fresh follow-up; arrivals during that follow-up may share it until a trusted mutation notification or queued write provides a barrier. Trusted notifications invalidate started reuse; notifications that arrive before the next read starts combine. Manual refresh always reads current history when it starts. UI responses clone only the small projection, leaving journals, helper history and legacy data inside the backend. Every recipient is authorized again before receiving a combined result. Different users do not share request batches.

Read-only settings checks authorize and read saved settings without joining the history queue. They can observe either side of a concurrent committed write, carry that revision, and never write. Mutation/save operations remain serialized and enforce revisions. The host still returns the complete stored tracker string when reading its chat variable; the extension cannot avoid that host allocation through this API.

## Counters

The server console emits `Lumi Phone Tracker: performance` followed by fixed operation labels and numeric counters:

| Counter | Meaning |
| --- | --- |
| `durationMs` | Elapsed operation time, including queue wait for queued operations. |
| `historyMessages` | Messages returned for a validated history read; zero when none was requested. |
| `historyBytes` | UTF-8 content bytes returned by that read, not the host's total RPC envelope. |
| `rebuildCount` | Total full replays in this backend worker since startup. |
| `pendingRefreshes` | Refresh/read callers currently waiting in this worker. |
| `snapshotBytes` | JSON UTF-8 bytes in the UI projection before read receipts/envelope. |
| `cacheHit` | Whether a freshly validated build reused replay output. |
| `failed` | Whether the queued operation rejected. |

Counters never contain chat/user/message IDs, message contents, field values, portrait data, API keys, headers, model names or arbitrary exception text. Logger failure does not fail tracking. Existing error categories remain separate. Logs measure Phone Tracker's activity, not Lumiverse's total RAM, host RPC allocations, process recovery or provider behavior.

## Local synthetic comparison

One run per size, 20 concurrent refreshes, identical story fixtures and Bun 1.4.4 on Windows. Both versions combined the initial burst into one history read. Each row contained about 2.3 KB of synthetic story text. These are observations, not production guarantees.

| Messages | 0.21.0 duration | 0.21.1 duration | 0.21.0 observed RSS increase | 0.21.1 observed RSS increase |
| --- | --- | --- | --- | --- |
| 100 | 39 ms | 29 ms | 23.2 MiB | 20.6 MiB |
| 500 | 123 ms | 89 ms | 35.0 MiB | 33.6 MiB |
| 1,000 | 218 ms | 119 ms | 39.4 MiB | 35.7 MiB |

At 1,000 messages, retained JS heap growth after collection was about 5.4 MiB versus 3.5 MiB. RSS sampling can miss short peaks and includes runtime allocator behavior; it is not a heap profile. The benchmark runs the extension store locally and does not exercise Lumiverse history RPC allocation or its main process. Reproduce with `bun scripts/benchmark-lightweight.ts src/phone-store.ts 1000`.

The browser simulator uses exact canonical input strings instead of native Bun hashing; actual backend unit tests and the benchmark use native SHA-256. This adapter is confined to the isolated test host.
