# Step 3: implemented data and macros

This checkpoint includes no phone screens, edit controls, Messages view/reply
box, badges, custom-CSS editor or Helper AI calls. Those remain Steps 4–6.
The temporary sidebar tab still only reports synchronization status.

## Documented host integration

The extension registers six real function handlers through
[`spindle.registerMacro`](https://docs.lumiverse.chat/backend-api/macros/):
`phone_format`, `phone_scene`, `phone_weather`, `phone_locations`, `phone_notes`,
`phone_messages`. No Contacts macro. They are volatile pull handlers; no values
are ever pushed with `updateMacroValue`. Missing/invalid chat context or failed
loads return empty output rather than another chat's snapshot.

The published types expose host-trusted `MacroInvocationContextDTO.chatId`.
The website describes the generation-time execution context and pull method
but does not spell out that chatId member in its example. The implementation
uses the published typed member, not a guessed `env` path or active-chat lookup.
The same types still declare `MacroDefinitionDTO.handler` as string, while the
website explicitly supports functions. A narrow local type adapter allows the
documented function form. No string handler, eval, or custom execution API is used.

[`spindle.variables.chat`](https://docs.lumiverse.chat/backend-api/variables/)
holds schema-2 data under `lpt_phone_v2`. The docs say chat-variable methods
derive ownership from the chat record. This permits chat-specific macro reads
without guessing a user ID from a macro environment. Macro loads always read
the specified chat and replay its current saved history; they never write, even
when `commit` is true. This also supports non-committing previews. Host-side
authorization remains essential and still requires real-install verification.

Player identity uses the documented native `{{user}}` via
`spindle.macros.resolve('{{user}}', {chatId, commit:false})` plus the author
names of saved user-role rows.
No personas permission is added. When identity cannot be resolved and no
user-author name is known, ambiguous AI texts are discarded. A typed user tag
requires its `from` to match that saved user row's author; an AI tag claiming
a player name is rejected unless the explicit setting is on. Identical names
cannot distinguish two fictional people; the player classification wins
conservatively. Persona/name changes and multiplayer need live testing.

The existing [pre-generation interceptor](https://docs.lumiverse.chat/backend-api/interceptors/)
now applies three independent history settings: recent text tags (default 3),
recent tracker blocks (default 0), and later Helper AI input messages (Step 6,
default 3 and bounded 1–10). The first two never alter saved source. Only texts
admitted by authorship validation can survive recent-text retention. Turns
without a source ID can use the documented source index. If neither exists,
text tags are removed conservatively. Non-history preset/system instructions
and media are left intact. Required interception is used where advertised.

## Data model

`model.ts` defines settings, confirmed/inferred cells, source identity, named
Contacts/Locations, five note sections, authored texts, notices, revisions and
user edit records. `schema.ts` validates the same changed-field JSON shape for
main blocks and future Helper AI results. `engine.ts` replays selected saved
variants in chronological order, with user operations anchored after the story
row visible when the user edited. Settings edits use revision checks, and
new story history invalidates a stale edit request.

Names merge by normalized case/whitespace; fuzzy names/aliases are never guessed.
Contact/place limits are 30. Notes cap new admissions per section, excluding
resolved plots; existing admitted notes survive lowering a limit. Rejected
old additions remain rejected rather than silently filling a later gap. Notices
persist until dismissed. AI updates cannot delete, replace a whole note log,
or write Misc. User deletion records prevent old replayed data resurrecting it.

Present status is derived from Scene's name list; current place is derived from
Scene location. There are no second writable flags. The player's contact permits
only physical status, position and attire. Existing inferred values stay marked
and survive switching inference off; that switch controls new inferences.

The validated backend `phone_update` protocol is ready for Step 4 controls:
explicit chat ID, last revision, partial settings, or one edit. The server stamps
the edit ID/anchor from saved history instead of trusting UI claims. No screen
is provided for these actions in Step 3. Custom CSS remains per-user work for
Step 4, separate from these per-chat tracker settings.

## Confirmed corrections: actual enforcement and its limits

Only user-edited fields require quote evidence. Ordinary AI-populated Contacts,
Scene and Weather fields accept later story-established changes without quotes.
User-edited cells keep their value unless
a later source supplies an exact quote present in that reply's visible prose.
The quote must also name the changed value/item (or removed item for a removal).
User-edited place and note changes similarly need a later matching quote naming
changed text; plot-status changes also need an explicit status word. This is
conservative: paraphrases may fail and keep the previous confirmed value.

This is textual/provenance validation, NOT proof of narrative meaning. Code
cannot determine with certainty whether an apparent change is a flashback,
counterfactual, lying dialogue, or genuinely new canon. It also cannot prove
that physical-status prose contains no emotion, or that every worn item was
listed. Prompts state those rules; validation catches malformed data, missing
evidence, simple alternatives/hedges and compact numeric ranges. A real model
and human review are still needed to assess semantic fidelity. No background
model or extra paid request is introduced to make those decisions.

## Migration

The original Step 2 per-user file is read only during an authenticated sync,
validated, and preserved verbatim in schema-2 `legacy`. Its old file and both
earlier handoff archives remain untouched. Old simple Scene/Weather fields are
understood from saved source. Untyped old notes/scene details become retained
Misc entries named Earlier note N, with their original text, not falsely marked
user-added and not sent to AI without user opt-in. Their categories are not
guessed. A first macro read before frontend migration can still replay saved
source but cannot recover a last-good malformed-edit fallback stored only in
the old per-user file. Open the chat once to complete migration.

Macro output stays compact: present contacts only with an adaptive field-text
budget; current plus up to three places; Rules-first/open-plots-first log cap
default 20; at most six recent text summaries, each shortened. Misc requires
Send to AI, all switches filter output, and braces in saved story data are
neutralized so they cannot become new native macro commands.

## Step 3 revision 0.3.1: independent lines

A malformed top-level key=JSON line no longer discards unrelated valid lines.
Arrays/objects remain a single unit, duplicate field lines are all rejected,
and structural block errors still reject the block. Same-source invalid fields
retain their last valid contribution. The Helper AI JSON validator remains
strict; Helper AI execution and its final failure policy are still Step 6.

Tradeoff: partial acceptance can temporarily mix a new location with an old
presence list if the presence line is malformed. Whole-block rejection avoids
that mixed snapshot but also loses unrelated correct updates. No code can infer
whether two separately valid lines are semantically inseparable. This revision
prefers retaining useful validated data while preserving user-edit protections.

## Invalid-line diagnostics

Revision 0.3.2 logs skipped tracker data through documented `spindle.log.warn`.
Check the Lumiverse server console/log output for
`[Spindle:lumi_phone_tracker]` and `skipped invalid tracker data`.
A warning includes chat ID, message ID, swipe index, line number inside the
tracker body, recognized field name, and a fixed reason (invalid JSON, invalid
value/structure, duplicate/conflicting field, missing separator, unknown/forbidden
field, or a structural block error). Unknown field names are redacted.

Story prose, character text, field values and raw exception messages are not
logged. Up to 20 issues are listed per warning, with a count for any additional
issues. Unchanged repeated reads are deduplicated in a bounded 1,000-message
runtime cache. A changed/corrected message, cache eviction or extension restart
can cause another warning. This is diagnostic output, not a permanent audit
file: retention and access depend on how Lumiverse's server logs are managed.
There is no documented dedicated extension-log viewer assumed here.

No new phone screen, toast, badge or notice is added for invalid lines. Existing
capacity notices are unrelated. Live appearance in Lumiverse server logs remains
to be verified on a real installation.

Source: https://docs.lumiverse.chat/backend-api/logging/
