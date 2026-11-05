# Tracker shorthand and old JSON compatibility

The preset still needs only **{{phone_format}}**. It supplies enabled writing
instructions plus short continuity for the authorized user/chat. A new Main AI
chat needs no saved facts to receive instructions. No Lumiverse regex scripts.

```text
<phone-state>
loc: Exact place | wider; wider
time: 12:10 AM
date: established date
weather: established weather
present: Name; Name
c: Name | roles=role; role | phys=physical state | mood=mood | pos=position | worn=item; item | off=item; item | thoughts=thought
p: Place name | description | relation
people: Name | detail | context
items: Name | detail | context
rules: Name | detail | context
plots: Name | detail | context
done: Plot name
</phone-state>
```

This is a syntax example, never demo data inserted into the phone.
**Write ONLY changed fields.** One record per line; fields use exactly ` | `,
list items use `; `. Omit unknown/unchanged fields. An empty block means no change.
No additional short-code legend is introduced.

## Values and limits

- Values cannot contain ` | `, line breaks, `<` or NUL. Reword; no code fences.
  HTML entities decode once before validation; encoding `<` does not bypass it.
- Location wider places, trailing place/note fields and unchanged contact fields
  may be omitted. Match records by case-insensitive name. A genuinely empty list
  may be blank; blank is not a substitute for unknown information.
- Mood, position, physical: at most **12 whitespace-separated words**. Place
  description: **19** (under 20). Note detail: **14** (under 15). Attire: short
  item names, at most **6 words per item**. Evidence is excluded from word counts.
  Existing character limits also apply: names 100, ordinary text 500, note
  detail/context 240; evidence 800; whole block 64,000.
- Attire changes require BOTH worn/off lists, keeping complete confirmed items.
  A known empty list may be blank; both lists cannot be empty. Partial attire or
  placeholder items reject that contact record.
- Exact placeholder values are rejected case-insensitively: Absent, N/A, NA,
  none, unknown, unspecified, not known, not applicable, not stated, not specified,
  unavailable, offscreen, off-screen, not present, null, undefined, TBD, ?, dash
  markers. Empty scalar values are rejected. Words inside a meaningful sentence
  are not treated as placeholders. Rejected updates leave old values unchanged,
  including when replaying old JSON updates.

## Admission and story rules

New AI contacts require their names in confirmed Present; a narrative mention
alone is insufficient. Existing absent contacts retain known data. If Present is
off and no matching saved presence exists, a new AI contact is not admitted.
The extension does not use server or multiplayer participants as story presence.
The existing player card and manual contacts keep their protections. Player AI
fields are physical/position/attire only; never player roles, mood or thoughts.

New place records matching the current Scene location are skipped to avoid a
second copy. Existing place records can still receive established updates.
Meaningful places only; no passing mentions. Notes update by name, never AI
remove. People need a concrete reason to return; rules need explicit restrictions;
plots need concrete plans/promises. `done` resolves an existing plot. Key items
need a specific story function (key, evidence, MacGuffin); ordinary props such as
a lighter are not logged merely because they are used.

Code enforces syntax, lengths, placeholders, confirmed-list admission and the
current-place duplicate rule. Whether prose truly establishes facts, an item's
story function or a meaningful place still needs model/human judgment.

## Evidence and inference

Only replacements of user-edited fields need a suffix quoting a NEWER visible
story change exactly. Other AI-filled fields need no quote:

```text
c: Ada | pos=beside the gate ~ "Ada moves beside the gate."
loc: Road | Town ~ "They move to the Road."
plots: Meet Ivo | Meet at dusk | New agreement ~ "Meet Ivo at dusk under our new agreement."
```

For contacts, suffix the individual field. An attire quote can follow worn or
off; conflicting quotes reject the record. Place/note quotes go at record end.
The quoted suffix uses JSON string escaping for quotes/backslashes; tracker
fields themselves are not JSON. A quote cannot contain forbidden delimiters or
line breaks. If no safe exact excerpt fits, omit the update, never reword evidence.
` ~ ` is reserved for suffixes; avoid it in values/evidence excerpts.

Inference stays opt-in, empty CONTACT fields only, with one concrete value:

```text
c: Ada | phys=scarred left hand ~ inferred
```

Inference cannot replace a populated value or invent places, notes, texts or
player thoughts. Evidence checks are conservative literal/source-order checks,
not semantic proof against flashbacks, lies or speculation.

## Validation, edits and swipes

Each shorthand record is atomic. A bad field rejects that line, while valid
records for other identities still apply. Duplicate scalar fields or duplicate
records for the same normalized name are all rejected. A plots update and done
for the same plot conflict too. Unknown keys are dropped safely.

On an edit to the SAME saved message/swipe, an identifiable rejected record keeps
its last valid contribution without replacing valid neighbors. Invalid records
on a new message leave earlier history intact. Misspelled keys/unrecognizable
identities cannot be mapped back by guessing. A different swipe never inherits
a rejected record from the old swipe. Incomplete, multiple, nested or oversized
blocks remain safely ignored and hidden.

## Old saved blocks and Helper AI

Old `key=JSON` lines still parse, including arrays, evidence/inferred wrappers,
complete attire objects and null meaning no update. Their original character
limits remain, so long historical values do not become unreadable because of
new shorthand word limits. Old arrays remain atomic. Use ONE format per block;
do not mix old lines into shorthand. The new placeholder/presence/duplicate-place
admission rules apply on replay. Saved story text is never rewritten.

Helper AI is asked for the same shorthand and uses the same parser. It may return
a state block or bare lines. Valid lines survive bad ones; an empty state block
means no change. Its journal stays in the existing validated internal schema,
so old journals rebuild. Earlier raw JSON Helper replies remain accepted for
compatibility but are no longer requested. Helper output containing narration or
text tags is rejected; the helper never creates texts.

Texts keep the separate tag and existing authorship/draft rules:

```text
<phone-text from="Name" to="known recipient" time="known time">escaped text</phone-text>
```

Omit unknown optional attributes. Content appears only in Messages. User scoping,
recent-text retention, hiding, prompt stripping and player-text defaults are
unchanged. Part 2 failure categories and Refresh tracker are NOT implemented.
