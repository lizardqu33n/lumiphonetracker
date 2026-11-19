# Local history-work investigation

Measured November 18, 2026. Production and GitHub were not changed for these experiments. The working source and built files contain an unpublished combined candidate. The installed version was not inspected directly. The baseline is the local v0.18.12 source from this workspace.

## Workload and method

All message content was synthetic. Each fixture had alternating user/assistant messages of about 736 characters, with a compact tracker block on assistant replies. Runs used 100, 500 and 1,000 messages. The same input and prior document were used for each variant. Each replay figure is the median of three local Bun runs. Each isolated variant started from the same baseline, with just its named change applied. The final combined candidate was measured afterward. These are local timings, not a statistical benchmark or a live-server heap profile.

No story text or field values were logged. All payload metrics are byte counts. History byte counts total JSON bytes of the returned synthetic history, not all backend/frontend traffic.

## Isolated replay changes

| Messages | Baseline ms | Running previous-user reference ms | Avoid discarded-state clone ms |
| --- | --- | --- | --- |
| 100 | 12.19 | 10.81 | 10.08 |
| 500 | 19.14 | 16.23 | 15.95 |
| 1000 | 40.80 | 29.68 | 35.83 |

The repeated reverse/search is algorithmically quadratic, but these measurements do not establish that it dominates the whole replay at 1,000 messages. Parsing and allocation still cost time. The clone change avoids copying the prior derived state and accepted journal that replay immediately discards. It preserves the journal as read-only input. No saved information is removed. Full synthetic replay output hashes matched in every variant.

## History work at 1,000 messages

| Workload | Baseline reads / returned bytes / ms | Isolated change reads / returned bytes / ms |
| --- | --- | --- |
| 20 Main AI completion hooks | 20 / 17,245,620 / 823.53 | 0 / 0 / 21.94 |
| 100 concurrent sync requests | 100 / 86,228,100 / 4576.06 | 1 / 862,281 / 548.94 |

The source gate authorizes the user and reads the saved settings before any history work. Main AI performs no Helper history preview and no Helper completion notification. It still reads and parses the saved document to obtain authoritative settings. No model connection was used.

Read combining is scoped to operation, trusted user and chat. Only identical requests still queued behind the same serialization tail can share a build. A request arriving during an active build can schedule a later build. A queued mutation breaks sharing. Each caller receives an independent document copy. Pending batch state is released on success and failure. This avoids stale cross-user data and mutation-order changes. Per-caller output copies and frontend snapshot traffic still exist.

These requests model concurrent callers in one backend store. They are not measurements of one versus two real browser tabs. Actual native generation, swipe and edit event frequencies were not measured.

## Native macros and prompt interception

The macro benchmark invokes the registered native handlers with trusted user/chat context. The interceptor-only test uses the same preview and prompt trimming functions as the handler. It does not exercise real host dispatch. Counts were the same at all three history sizes.

| Workload | Baseline reads | Queued-read combining |
| --- | --- | --- |
| no_macros | 0 | 0 |
| phone_format | 1 | 1 |
| full_parallel | 9 | 1 |
| full_serial | 9 | 9 |
| interceptor_only | 1 | 1 |

Sequential native macro calls still each rebuild history. Prompt interception remains another read when it runs separately. No persistent cross-request history cache was introduced, because a stale snapshot could break swipes, edits, identity restrictions and prompt stripping. The real host macro invocation order is unverified.

## Display processor isolation

The test compares transformTags in display mode with returning the identical input untouched. This bypass exists only in the benchmark, not in production or the candidate display hook. Stored messages were not edited.

| Input type | Characters | Processor ms | Bypass ms |
| --- | --- | --- | --- |
| ordinary | 100,000 | 0.351 | 0.000 |
| many_tags | 100,000 | 4.381 | 0.000 |
| incomplete | 100,000 | 0.086 | 0.000 |
| ordinary | 1,000,000 | 13.206 | 0.000 |
| many_tags | 1,000,000 | 23.569 | 0.000 |
| incomplete | 1,000,000 | 0.657 | 0.000 |
| ordinary | 5,000,000 | 15.844 | 0.000 |
| many_tags | 5,000,000 | 159.810 | 0.000 |
| incomplete | 5,000,000 | 3.627 | 0.000 |

Large tag-dense input is measurably expensive. The baseline 5 MB case took about 160 ms. This does not reproduce the logged host timeout or establish its configured deadline. Main-process overload and serialization may also affect the real hook. The scanner is unchanged pending a representative slow-message test.

## Document and process memory

| Messages | History bytes | Document bytes | Accepted bytes | Legacy bytes | Helper entries bytes |
| --- | --- | --- | --- |
| 100 | 86,031 | 95,975 | 94,331 | 4 | 2 |
| 500 | 431,031 | 474,175 | 472,531 | 4 | 2 |
| 1000 | 862,281 | 946,925 | 945,281 | 4 | 2 |

The accepted journal accounts for almost all of this synthetic document. The fixture has no legacy payload or Helper entries, so those columns cannot characterize old real chats. The candidate does not purge, truncate or change journal contents.

The JSON results also record local Bun heap deltas and RSS around replay, including after explicit garbage collection. They describe the test process with input/output documents still referenced. They do not measure a leak, peak memory or Lumiverse main-process RAM, and should not be interpreted as evidence that live server memory has been fixed.

## Verification and files

277 code tests and type checking pass. New tests cover the Main AI gate, same-user batches, independent returned objects, edit barriers, failed-read cleanup and user/chat authorization. The prior tests cover swipes, regeneration and data protections.

- .test-artifacts/history-bench.ts and history-*.json contain history, replay, byte-count and tag results.
- .test-artifacts/macro-bench.ts and macros-*.json contain native macro and interceptor counts.
- .test-artifacts/history-candidates contains the single-change source variants.
- .test-artifacts/history-before.log records the two new regression failures on the baseline.
- .test-artifacts/history-code.log records the passing local test run.

Real copied chats, real main-process heap profiling, actual one/two-tab traffic, provider behavior, the logged display-processor timeout and real macro dispatch remain to be tested.

## Completed 0.18.13 update

The current source extends the isolated experiments above. It is the v0.18.13 update authorized for publication and server testing. The previous candidate discussion is historical.

### Implemented fixes

- Identical queued reads coalesce across backend callers, with serialization barriers for edits and separate trusted user/chat keys.
- Main AI routing reads only authorized stored settings before Helper preparation. It sends no unnecessary Helper completion refresh.
- Replay uses a running prior-user reference, message-ID lookups, parsed-message reuse and per-replay Helper source-signature reuse.
- Replay does not clone the old state or accepted array that it replaces. Internal accepted entries retain their compatibility string field but no longer duplicate full story prose. Original saved messages remain authoritative and are unchanged.
- A one-entry replay memo stores at most 2 MiB of serialized document data. Every lookup first re-reads and hashes the full current active history, saved tracker, trusted identity, persona, card names and legacy input. It never reuses a snapshot based only on elapsed time or a chat timestamp. The limit is serialized payload size, not a measurement of JS object overhead.
- On hosts advertising chat-lean-messages-v1, the history reader requests light active-swipe data without extra metadata. The capability and flags are in the installed official lumiverse-spindle-types 0.6.77. The public docs page could not be retrieved during this pass and the local Lumiverse checkout does not advertise this newer capability. Older hosts use the existing getMessages call. Real lean-host behavior remains unverified.
- The display processor returns ordinary messages immediately, streams tag spans instead of retaining a complete span array, bounds header reuse to 128 short headers per call and avoids repeated substring lowercasing. Unicode case expansion no longer corrupts tag offsets.
- Helper preparation and provider waiting share the request deadline. Timed-out preparation cannot dispatch a late model call. The extension cannot cancel host history APIs that have no documented signal parameter.

### Current combined measurements

| Messages | Baseline replay ms | Candidate replay ms | Baseline document bytes | Candidate document bytes |
| --- | --- | --- | --- |
| 100 | 12.19 | 2.88 | 95,975 | 20,775 |
| 500 | 19.14 | 11.14 | 474,175 | 98,175 |
| 1000 | 40.80 | 16.60 | 946,925 | 194,925 |

The message fixture and tracked facts are the same. Document hashes differ because unused internal prose is intentionally compacted. Compatibility tests verify old prose-bearing journals rebuild to the same tracked results and saved messages remain unchanged. These local timing samples are not host RAM measurements.

| 1,000-message workload | History reads | Distinct replay snapshots | Time ms |
| --- | --- | --- | --- |
| no_macros | 0 | 0 | 0.00 |
| phone_format | 1 | 1 | 52.34 |
| full_parallel | 1 | 1 | 79.14 |
| full_serial | 9 | 1 | 139.23 |
| interceptor_only | 1 | 1 | 41.55 |

Serial macros still fetch fresh history for safe invalidation, but matching inputs reuse one verified replay result. A real host dispatch sequence and two real tabs still need profiling. Lean reads reduce unused payload only on hosts that support them.

### Display processor, same input and forced output byte encoding

| Input | Characters | Previous ms | Candidate ms |
| --- | --- | --- | --- |
| ordinary | 100,000 | 1.056 | 0.008 |
| many_tags | 100,000 | 3.975 | 1.579 |
| incomplete | 100,000 | 0.077 | 0.078 |
| ordinary | 1,000,000 | 12.226 | 0.071 |
| many_tags | 1,000,000 | 46.438 | 22.004 |
| incomplete | 1,000,000 | 0.580 | 0.649 |
| ordinary | 5,000,000 | 23.528 | 0.359 |
| many_tags | 5,000,000 | 251.248 | 122.002 |
| incomplete | 5,000,000 | 3.594 | 2.905 |

The scanner also matched the previous implementation across 5,000 deterministic mixed valid, malformed, incomplete and Unicode inputs, apart from the separately tested Unicode offset correction. No stored message or production display processor was disabled. These timing samples include output UTF-8 encoding and should not be mixed directly with the earlier raw-return baseline. Large tag-dense messages still cost measurable time.

### Verification and remaining deployment checks

283 code tests pass, covering mutation-safe batching, authoritative cache invalidation, swipes, persona/user separation, oversized cache rejection, old journal compatibility, optional lean reads, Unicode tag handling, failure cleanup and timeout during blocked preparation. All 23 focused browser regressions passed against the final candidate.

The build is authorized for publication and real-server testing. Real copied chats, Lumiverse main-process RAM, actual multi-tab traffic, provider cancellation behavior and the recorded processor timeout still require a real host. Legacy and Helper entry information needed for continuity/evidence is preserved. No tracked data or attempt history is purged.

Reproducible current workloads are included as scripts/benchmark-history.ts, scripts/benchmark-macros.ts and scripts/benchmark-tags.ts. They use synthetic content and print only counts, timings, byte sizes and hashes. Run them with Bun from the project directory. The historical baseline JSON remains in .test-artifacts.
