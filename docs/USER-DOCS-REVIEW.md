# Local Lumiverse user-docs review

Read on November 4, 2026, before resuming Part 1. Sources are the local build at
`C:/Users/pekoy/coding.shit/Lumiverse`, not a substitute extension API specification.

## What the guides say

- `user-docs/docs/customization/macros.md` and `presets/macros-reference.md` use
  `{{macro_name}}`, with `::` or spaces for arguments. Preset content blocks,
  eligible chat messages and activated world-book content resolve macros during
  prompt assembly. Our six lowercase `phone_*` names do not collide with a listed
  built-in. Keep the preset entry **{{phone_format}}**; no rename or new argument
  is needed for phone_scene, phone_weather, phone_notes, phone_locations or
  phone_messages.
- `presets/execution-order.md` describes a shared per-assembly environment,
  ordered block processing and depth-first, left-to-right expansion. Disabled
  blocks are skipped; only selected conditional branches resolve. Character,
  persona and chat fields are snapshots, while variable side effects flow to
  later reads. Our handlers remain read-only during resolution.
- `chatting/messages-and-swipes.md` describes Dry Run as full prompt assembly,
  including macros, without a model call. The developer docs add the extension
  contract: `commit:false` for non-committing resolution. Instructions therefore
  must not be suppressed merely because a call is a Dry Run.
- `{{user}}` is a persona/display name, not an authenticated server user ID.
  `{{chatId}}` describes the current chat. Multiplayer `players`/`playerCount`
  describe human room participants, not confirmed story-scene presence. The
  guides do not document an extension callback userId or make the observed
  pull-RPC `env.extra.userId` field a guaranteed API. Existing guarded identity
  handling and chat authorization remain necessary.
- Local variables (`.`) are transient; chat variables (`@`) persist per chat;
  global variables (`$`) are per-user across chats. We do not use global macro
  state to carry one chat's tracker into another.
- JSON macros keep macro-looking strings inert. Our plain-text extension output
  still needs its existing brace protection; switching to shorthand does not
  justify executing AI-written native macros. Native `time`/`date` are clock
  values and cannot replace story-established time/date.

## Math, without new features

The reference lists `calc` (aliases `math`, `evaluate`), `min`, `max`, `clamp`,
`abs`, `floor`, `ceil`, `round` and `mod`. Arithmetic supports `+ - * / %`,
parentheses, unary minus and decimals; the guide says division by zero returns
0. It also lists list `count`, `sum`, `avg`, `listMin` and `listMax`.

These could format an existing count or limit in a preset, but the extension
already calculates its own caps/counts in code. No native math macro is added.
No bank balance, transaction or other story figure is calculated or adjusted;
only an explicitly stated figure could be recorded by a supported tracker field.

## Differences and conflicts

1. The execution guide still lists five passes and depth 20; the user macro
   reference and developer macro docs instead describe a work budget permitting
   finite chains beyond 1000 levels. Those claims conflict. We do not adopt the
   older limits as an extension contract.
2. The execution guide's blanket "No Result Caching" wording is broader than the
   developer API, which explicitly supports pushed cached values and a
   dependency/volatile-aware display cache. These concern different execution
   paths. Our handlers retain volatile output and avoid a shared pushed cache.
3. The user macro reference treats `no`/`off` as false, while the execution guide's
   shorter false-value list omits them. No new conditional behavior is inferred
   from this inconsistency; extension switches are actual validated booleans.
4. Developer docs allow a function pull handler. Our pinned types package,
   `lumiverse-spindle-types` 0.6.77, still declares `handler:string` and a minimal
   invocation type with commit and optional chatId. Our existing narrow type
   adapter follows the documented function API; user docs do not resolve that
   type mismatch or the missing guaranteed user identity.

No user-guide example authorizes a new extension API, permission or feature.
Developer docs and published API types remain the API authority; observed host
compatibility fields remain explicitly identified as implementation details.

## Version and effect on this task

No explicit guide release/version stamp was found in user-docs. The enclosing
backend package says **1.2.5**. The local checkout reports commit **9199177b** and
local modifications; that is build metadata, not a guarantee that every guide
page describes one exact release.

The findings require no change to Part 1's scope. Keep the macro names, guards,
read-only Dry Run behavior and literal-data protection. Add no calculations or
new features. Part 2 remains unstarted.
