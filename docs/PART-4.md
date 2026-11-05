# Part 4: Calls, Email and Bank (0.10.0)

These three optional built-in apps start not added in new AND existing chats.
App Store now has nine rows, using the nine supplied PNGs embedded unchanged.
Remove hides an app and suppresses its instructions/continuity without deleting
its data. Add restores it. The launcher PNG, sidebar layout, protected Reset,
one-level navigation and opaque phone surfaces are preserved.

## Final scope clarification

This follows the user's FINAL clarification, replacing the earlier temporary
choice to make only new apps private. All story entries, tracker switches,
App Store state and limits stay shared on the authorized chat. There is one
story journal and no per-user story fork. Any user whom the host authorizes for
that chat can edit these settings/data. No owner-only data/settings check is added.

Read/unread state (including missed calls and emails), transient arrival notices,
CSS, appearance and dismissed hints/descriptions are personal. Receipts use the
existing per-user/per-chat userStorage service with trusted userId. Email
continuity pulls that user's unread state; it never uses another user's receipts.
If receipts are unavailable, only email continuity is omitted and a safe fixed
warning is logged; writing instructions/core continuity still work.

There is currently no saved-settings-presets or editable prompt-wording feature
in this extension. Part 4 does not add one or write the user's Lumiverse presets.
The preset entry remains {{phone_format}}. Future personal wording/preset
features must keep the scope the user specified.

## Screens and limits

| App | What appears | Cap | Tracking switches |
| --- | --- | --- | --- |
| Calls | Newest-recorded-first log; Incoming, Outgoing or Missed; known time. Exact contact-name matches use the contact's display spelling. | 30 | Calls log |
| Email | Sender/subject/time rows; inline expansion reads a plain-text body. | 30 | Email records |
| Bank | Up to 3 accounts with last stated balance/as-of; shared recent transaction list, newest recorded first. | 3 accounts / 20 transactions | Balance, Transactions separately |

All three have dismissible descriptions, helpful empty states and Add/Edit/Delete
record controls. These only change tracker records; there is no dialing, phone
connection, email compose/send/reply, clickable body URL, image/HTML rendering or
bank connection. Calls' direction editor uses plain Incoming/Outgoing/Missed
choices. The existing entry editor cannot bypass player-writing restrictions.

Full apps drop NEW AI entries, keep old entries, and show the existing kind of
dismissible full notice. No oldest-item eviction occurs. Deletions and edits keep
tombstones so repeated old records do not silently return. Exact duplicate
records are not logged twice. Without stable IDs in the requested shorthand,
identical caller/direction/time or description/amount/time records cannot be
proved distinct and are treated as repeats; users can explicitly add/correct a
record. No device time is invented. Ordering is source/record order, not guessed
calendar interpretation of fictional time strings.

Missed calls get a personal Home badge, cleared when Calls opens. Incoming
emails get Home and row unread labels, cleared individually when opened. Both
reuse the existing arrival-notice surface. Initial history load is silent;
notices are personal frontend state. Outgoing records do not create unread badges.

## Protocol, authorship and amounts

See [BLOCK-FORMAT.md](BLOCK-FORMAT.md) for exact syntax and limits. Calls, bank and
tx lines join the existing phone-state block; emails use phone-email tags in
both main-AI and user messages. Saved tags remain unchanged; render interception
hides them. The outgoing prompt strips email tags, while the older configurable
text-tag history window stays unchanged. Helper input strips ALL phone tags.

The renamed shared switch is Let the AI write texts, calls and emails for my
character, still OFF by default. Code checks known player names and named user
message authors, not merely prompt wording. While off, AI emails from known
players and unsupported player calls are rejected. User emails require from to
match that saved user message's author. User call records or a later exact quote
of a simple whole first-person player call statement can establish an outgoing
call. Negations, intentions and mismatched targets are rejected. Complex or
ambiguous natural language is not guessed; users can supply an explicit record.
Unrecognized aliases/addresses cannot be semantically identified by a name-only
tracker, so the model must use the exact known player name and obey the rule.
No address-book or identity-resolution API is invented.

Manual Add/Edit is a record editor, not a communication composer. A new player
outgoing record also needs the permitted player-writing setting or an already
sent player record; editing an existing established outgoing record is allowed.
The backend overrides client permission stamps. Earlier authorized manual entries
remain valid when the switch is later turned off.

Bank values are literal strings, never parsed into money, summed, converted or
adjusted. Validation requires one stated numeric figure; written-out numbers
and formulas are ignored rather than converted. New balance proofs require the
literal account name/figure in newer recent visible story prose or a user's own
structured record. A user-edited balance additionally needs the exact newer
quote. Older figures inside a Helper window cannot roll back a newer balance.
Previously proved balances survive an incomplete/malformed same-source block;
that fallback cannot certify a figure which was never established.

A transaction without a newly stated balance keeps the old balance and labels
it Last stated with its known as-of time. The requested tx syntax has NO account
field, so transactions remain a chat-level list beneath balances; none is assigned
to an account by guesswork. Figures found only inside stripped tags are safely
ignored by the proof check. Model extraction still has to distinguish real story
facts from speculation/memories; literal validation cannot prove every semantic
claim. This needs live-model testing, not a claim of perfect natural-language
understanding.

## Main AI, Helper and continuity

Main AI writes email/text tags in both modes. Helper may extract calls and bank
figures but its parser rejects ANY text/email output. Main AI writes call/bank
state lines only in Main AI mode. Valid independent shorthand lines survive bad
neighbors. Existing JSON state/journal records still rebuild. Regeneration,
alternate swipes, deleted sources and malformed edits preserve the earlier
source/revision safeguards; new activities also have stable source IDs and
last-good fallback.

Continuity is short: last 3 calls; sender/subject of last 3 unread emails for the
requesting user; up to 3 balances/as-of values and the last 2 transactions. Bodies
are never returned in email continuity. New macros phone_calls, phone_email and
phone_bank use the existing documented registration/pull-context path. Only
added/enabled apps emit writing instructions or summaries.

## API evidence and permissions

No new permission or external service is added. The extension reuses documented
custom message-tag interception with removeFromMessage:true, the existing render
processor/prompt interceptor, chat-scoped variables and userStorage. There is no
new Spindle calls/email/bank API. These are fictional story records.

All operator-scoped reads/writes/receipts use the trusted callback or macro
userId. Chat history/variable methods still have their documented chat-only
signatures, preceded by chats.get(chatId,userId) authorization. No invented extra
argument or participant/owner API is used. The existing Helper connection credential scope is unchanged: a member cannot use another user's private provider profile, and can select their own saved connection. This is credential isolation, not an owner-only story/settings permission.

Native host authorization must really
permit both users to access the shared chat; the docs checked here do not define
a membership-grant API to bypass a denial. Shared storage is authoritative; UI
refresh depends on host chat-event delivery or the next sync/Refresh. No claim of
instant cross-user UI notification is made.

Sources: [message tags](https://docs.lumiverse.chat/frontend-api/message-tags/),
[storage](https://docs.lumiverse.chat/backend-api/storage/),
[variables](https://docs.lumiverse.chat/backend-api/variables/),
[macros](https://docs.lumiverse.chat/backend-api/macros/) and installed official
types 0.6.77. The earlier source-verified native preset context adapter and its
minimal-DTO limitation are unchanged.

## Testing and remaining limits

**164 code tests (1060 assertions) and 171 browser checks pass.** See TESTING.md for the full report. Tests use actual extension code with mock host
identity enforcement: two authorized users in one chat share entries/settings,
with independent receipts/unread-email macros; a separate chat/user gets neither
entries nor receipts. Cases cover defaults, Add/Remove retention, editing,
authorship rejection and bypass attempts, caps/full notices, placeholders,
quote/amount checks, malformed streaming blocks, swipes, Helper exclusions,
plain-text email bodies, PNG loading, unread clearing and opaque screens.

No live second user, real shared-chat authorization, real connection/provider,
actual final network prompt, host tag painting/cold load, native mobile drawer,
WebView scaling, cross-user event routing or distributed multi-worker races were
tested. Code and browser mocks do not establish those real-install behaviors.
No paid request, call, email or bank operation was made. Stop after Part 4.
