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
compatibility but are no longer requested. One complete outer Markdown code fence
(json, text, plaintext, phone-state, or no language) is accepted. No missing
brackets/quotes are guessed and no prose-wrapped block is extracted. Valid
legacy JSON fields survive a bad known field, while unknown top-level fields
or text tags reject the response. An empty reply is a failure; an explicit empty
block or {} is a valid no-change result. The helper never creates texts.

Texts keep the separate tag and existing authorship/draft rules:

```text
<phone-text from="Name" to="known recipient" time="known time">escaped text</phone-text>
```

Omit unknown optional attributes. Content appears only in Messages. User scoping,
recent-text retention, hiding, prompt stripping and player-text defaults are
unchanged. Part 2 failure categories and Refresh tracker are documented in
[PART-2.md](PART-2.md).


## Part 4: optional Calls, Email and Bank

These instructions appear only when the app is added and its switch is on.
Calls and Bank are in the same phone-state block as the earlier shorthand.
Write only NEW log entries. Bank uses the account name to update its last stated
balance, never by calculating from transactions. Omit an unstated time entirely.

```text
<phone-state>
call: Ada | missed | Evening | x3
bank: Main | $500 | Evening
tx: Rent | -$10 | Night
</phone-state>
```

The exact tokens in the direction slot are in, out, missed. Name/number,
account, balance, amount and time are at most 100 characters each. Transaction
descriptions are at most 240 characters and 14 words. Values cannot contain
" | ", line breaks, NUL or "<"; reword. Placeholder values are rejected, with
Unknown caller as an explicit allowed caller name. Amounts must contain one
numeric figure; formulas or written-out number conversions are not performed.
Valid independent lines survive malformed neighbors. Old JSON remains readable;
the compatible internal JSON fields are calls, bank and transactions arrays.

```text
<phone-email from="Ada" to="Player" subject="Meeting" time="Evening">Meet at dusk.</phone-email>
```

from and subject are required; to and time are optional. Body must be nonempty
and at most 1500 characters; sender/recipient/time at most 100, subject 200.
Escape &, <, > and attribute quotes. Body and decoded subject render as plain
text only. Never use raw HTML inside the tag. Incomplete/malformed tags are
hidden and safely ignored. Saved source tags remain for rebuilding. Email tags
are stripped from outgoing history, including recent ones; continuity never
returns body text. Existing text-tag retention is unchanged. Helper input strips
ALL three tag kinds and Helper output containing texts/emails is rejected.

Player-writing OFF rejects AI emails from a player and outgoing player calls.
A named user's own sent email tag is outgoing only when from matches its saved
author. A named user's own call record is accepted. A later AI outgoing call may
use the existing exact-quote suffix only when it matches the whole latest player
message and the parser can confirm a simple affirmative I call/called/dial/phone/
ring Name statement. Negations, intentions, mismatched targets and complex
unverified phrasing are rejected. Never invent a player action or reply. Turning
ON the existing setting permits actual AI-authored player communications.

Only the last 3 calls, sender/subject of the last 3 personal unread emails, and
up to 3 balances plus the last 2 transactions are returned in continuity.
phone_calls, phone_email and phone_bank use the same documented pull macro API
and trusted context as the older phone macros. Keep the preset entry unchanged:

```text
{{phone_format}}
```

Bank updates need the literal account name and figure in newer recent story
prose (or the user's own structured record). A user-edited balance additionally
needs the exact newer quote using the existing ~ "quote" suffix. Figures that
exist only in stripped tags or need interpretation are ignored safely. The
format has no transaction account field, so transactions stay in a shared list;
the extension never guesses an account. See PART-4.md for limits and provenance.

## Call sources and repeat counts (0.10.1)

`call: Ada | missed | 3 PM | x3` records one call-log row, shown as **Missed x3**.
Time and count are optional. Without a time use `call: Ada | missed | x3`.
Without a count it means 1. The count must be exactly x1 through x20: no
fractions, signs, placeholders, empty slots or other spellings. A bad count drops
that line only; independent valid lines still apply. Legacy JSON uses a numeric
`count` property, with the same whole-number limits. Users can edit Repeat count.

Call identity is source message ID + normalized caller + direction + stated time.
Count and swipe are excluded. Two identical calls from different messages are
two records. Identical lines reread from one source add nothing. Rebuild reads
only selected swipes; regeneration replaces that source's contribution. Edits
and deletions apply to that record, not every later call from the same caller.
Do not repeat old calls in new blocks: write only NEW calls. Multiple identical
calls established in one message use one row with its stated repeat count.
One missed-call record contributes one unread item and arrival, regardless of count.

New Helper calls use the same line parser with an internal attribution suffix:

```text
call: Ada | missed | 3 PM | x3 ~ {"source":"message-id","quote":"Ada has three missed calls at 3 PM."}
```

The extension supplies actual recent message IDs beside stripped story text.
The Helper must copy the ID of the message establishing the call and an exact
quote. Code checks source membership, unchanged source, literal quote, caller,
call wording, stated time and explicit repeat count; unverified calls are dropped.
Outgoing player calls still require the player-writing permission or the existing
strict affirmative player-message proof. Attributed calls keep that source's
identity even when a later reply triggered extraction. This is internal request
data, not a new Lumiverse API or additional preset line.

Old saved Helper journals without attribution retain their old source anchor so
updating does not delete existing records; the extension cannot reliably recover
an unstated historical source. New Helper output must provide verified attribution.
Legacy ordinal/swipe IDs are migrated using the saved validated source journal.
Existing cap slots, source corrections/deletions and unchanged read receipts are
preserved; a changed displayed count becomes unread like any other correction.

`{{phone_format}}` already includes Calls, Email and Bank continuity. Separate
macros are optional alternatives; using both repeats the same continuity.

## Text recipients: the player's own phone (0.10.2)

Use phone-text only for actual texts sent **to the player**, or actual outgoing
player texts when player-writing is ON. Texts between NPCs stay in narration
without tags. The format macro includes one short routing sentence. Email and
call behavior are unchanged.

- Assistant text from a non-player: omit `to` to mean the player, or set it to
  the exact confirmed player name (case/outer spacing is normalized).
- A named non-player recipient is rejected. Unrecognized names and group labels
  such as `Ada; Player` are also rejected, rather than guessed. Contacts and
  assistant character names never establish who the player is.
- When player identity is unknown, only omitted `to` is unambiguous. The extension
  does not invent aliases such as You/Player from untrusted story text.
- A sent user tag still requires `from` to match that saved user message's author;
  it may address another character and is outgoing. Assistant player-sent tags
  still require the player-writing switch. No player reply is fabricated.

Every rebuild applies this rule, including Refresh tracker and restart; cached
NPC-to-NPC entries disappear without rewriting saved story messages. Malformed
same-source fallback is filtered too. Personal old receipts may remain stored
but cannot display or revive a rejected text or change another user's reads.

Display behavior stays unchanged: canonical tags are hidden by the documented
frontend removeFromMessage interceptor; incomplete/broken tags are withheld by
the existing render processor. Rejected content therefore appears in neither
Messages nor story. No raw tag or HTML is exposed, and no fallback narration is
invented. Correctly generated NPC-to-NPC text is normal narration with no tag.
The server logs `Lumi Phone Tracker: text tag ignored: recipient is not a confirmed player.`
once per unchanged source, using the existing bounded warning deduplication;
no story text, names, recipients or field values enter that warning.

## Explicit group texts (0.11.0)

The optional attribute group="Established group name" puts actual texts from
several senders in one named thread. Use it only when the story establishes that
player group and the text is actually sent to the player (or actually by the
player with the usual permission). Never infer group membership. Example:

```text
<phone-text from="Ada" to="Player" group="Crew" time="8 PM">Meet at the gate.</phone-text>
```

Names are bounded to 100 characters and escaped like other attributes. Group
never bypasses recipient filtering. A sent reply preserves group in the draft.
Short Messages continuity includes the explicit group name as text. Without group, conversations still group by sender/recipient. No automatic
merging from similar names or surrounding group roleplay. Only established Scene
dates at each message's history position become thread date separators; no new
AI date field, device date or guessed time conversion is added. Portrait bytes
are UI data only and never enter this block, continuity macros or Helper input.
