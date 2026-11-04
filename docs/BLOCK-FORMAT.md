# Step 3 compact block and JSON contract

The preset needs only `{{phone_format}}`. It generates instructions matching the
chat's enabled fields and includes compact continuity. Do not keep the earlier
manual Step 2 snippet alongside it. Examples below illustrate syntax only;
they are not demo data inserted into a chat.

Main AI appends one `<phone-state>` block, one changed `key=JSON` line per field.
An empty block means no change. Omit unknown/unchanged keys; null means no
update, never deletion. No code fences, raw HTML or literal angle brackets in
values. Values stay single-line JSON; quotes use JSON escaping.

| Key | JSON value |
| --- | --- |
| location | `{"name":"exact place","wider":["building","city","province if known"]}`; a plain string is also accepted. |
| time / date | Established string. Tracked only in Scene. |
| present | Full current list of established names. |
| weather | Established weather string; no date/time duplication or forecasts. |
| contacts | New/changed named records with only changed enabled fields. |
| locations | New/changed meaningful places: name, optional description/relation. |
| people / items / rules / plots | New/changed named note records; never the entire log. |

Contacts fields: `name`, `roles` (ordered string array), `physical`, `mood`,
`position`, `attire` (`{"worn":["complete current items"],"removed":["recent items"]}`),
`thoughts`. The player can have only physical/position/attire. Absent characters
keep known values. Unknown crowds/passing mentions are excluded. Thoughts
are NPC-only and default OFF. Position and attire replace the FULL current field.

Contact/place names are at most 100 characters. Ordinary text fields are at
most 500 characters; note detail/context at most 240. A block is bounded to
64,000 characters. Each top-level line is validated independently. Invalid or
unknown lines are dropped while valid lines still apply. All occurrences of a
duplicated field are rejected together. Arrays/objects stay atomic: one bad
Contacts record rejects the contacts line, not just that record. Incomplete,
multiple, nested or oversized blocks remain rejected as a whole.

For a malformed edit to the SAME saved message and swipe, a rejected field
retains its last valid contribution. An invalid field on a new message makes
no update, leaving the prior history's value intact. Unrecognizable misspelled
keys cannot be matched back to an intended field; the extension does not guess.

## Replacing a user-edited field

```text
<phone-state>
location={"value":"Road","evidence":"They leave Home for the Road."}
contacts=[{"name":"Ada","position":{"value":"beside the gate","evidence":"Ada moves beside the gate."}}]
</phone-state>
```

Only fields edited by the user require evidence. Ordinary AI-populated fields
can accept later story-established changes without a quote. The evidence for
replacing a user-edited field must be an exact quote from this reply's visible narration, later
than the correction, naming the changed value/item. For removal-only attire,
name the removed item. Unrelated quotes or bare repeated old values cannot
replace a user-edited value. This validates text and source order, not semantic truth;
flashbacks, lies and paraphrases still require human/model judgment. See STEP-3.md.

With inference explicitly enabled, an EMPTY contact field can use
`{"value":"one concrete value","inferred":true}`. It is marked inferred and
then retained until narration changes it. Default OFF. No alternatives or hedges.
This does not permit invented places, notes or texts.

## Notes: never replace the whole log

Each section receives an array of changed records:
`{"name":"entry","detail":"short value","context":"short source/holder/trigger"}`.
Only plots may add `"resolved":true`. Names match case-insensitively. New/changed
entries only, no AI deletes, no `misc` block key. People need a clear reason to
return; Items a specific story function; Rules an explicit firm restriction;
Plots a concretely set-up future event with named parties/stakes. Misc is user-only.

Existing updates work at capacity. New entries are dropped with a persistent
notice, never used to delete another note. Resolved plots do not count toward
the section cap. The default per-section cap is 10; its data setting accepts
3–30. Lowering it preserves already admitted notes.

## Actual incoming/outgoing texts

```text
<phone-text from="Character" to="known recipient" time="known story time">Actual text</phone-text>
```

`from` is required; `to` and `time` are optional. Use entity escapes for tag
characters. Bodies are plain text, at most 3,000 characters and 12 per reply.
Text content appears only here, not repeated in story prose. A short arrival
line is optional. Never invent a text event.

A saved user-role row may contain an outgoing text only when `from` matches
that row's real author name. A user tag cannot create an NPC message or tracker
update. AI-authored texts attributed to the player are discarded by default;
the explicit player-text setting enables them. Known player names come from
the documented native user macro and saved user-role authors, not a claimed
`from` attribute. Ambiguous AI texts are rejected when player identity is unknown.

Step 5 reply controls append an escaped <phone-text from="player" to="recipient"> tag to the existing composer draft. They never send or file it. Only a saved sent user row (with matching real author) files it, including manually typed tags. Recipient survives rebuilding; unknown times are omitted. See [Step 5](STEP-5.md).

## Storage and prompt history

Saved tags remain untouched. Schema-2 data is stored separately in chat-scoped
extension variables, with its chat ID, source identities, edit ledger and revision.
Old Step 2 files remain intact. Legacy untyped notes/details are retained in
Misc for review without guessing categories or sending them to the AI by default.

Default main-prompt retention: text tags in the last 3 chat messages; tracker
blocks in the last 0. Both are editable in Advanced. Only validated authored text records can survive retention. Helper AI input separately strips ALL tags. Its JSON follows this same expanded field schema; no text or Misc output is allowed. See [Step 6](STEP-6.md).

In Helper AI mode the main model writes no phone-state block. It still writes each actual text in phone-text when Messages is on. The same {{phone_format}} preset line handles both modes.
