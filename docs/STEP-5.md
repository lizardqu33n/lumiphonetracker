# Step 5: Messages and solid backgrounds

Version 0.5.0 completes Step 5 only. Helper AI, connection choices and generation
permission remain deferred to Step 6. No extra AI requests or servers were added.

## What the phone does

Messages shows actual saved text tags, grouped by sender, with sender name, text
and story time only when supplied. Expand a conversation on the same screen;
the back button still returns Home. A Contact's Open texts button opens its
conversation, including an honest empty conversation for starting a first reply.
No texts, contacts or conversations are fabricated as demo content.

Incoming texts add unread counts to the Messages Home icon, conversation and
Contact's Open texts button. Opening a visible conversation clears that sender's
count after read status saves. Other senders remain unread; outgoing texts never
add counts. Newly saved incoming texts display a five-second arrival notice,
including while the phone is closed. Loading old history does not announce it
again. Turning Messages off hides its conversations, replies, badges and notices,
and the existing macros/format instructions omit Messages.

Lumiverse group roleplay supports multiple character senders without assuming one
NPC. Each sender keeps its own conversation. An outgoing tag's optional `to`
places it with that recipient. A saved outgoing text with no recipient appears
under Your texts / Recipient not stated, without guessing who received it; that
group cannot offer a reply target. No new group-room metadata or group-creation
controls were invented.

## Drafting uses the documented composer

The [composer API](https://docs.lumiverse.chat/frontend-api/composer/) supports
free synchronous `getState`, `insertText(text, { at: 'end' })` and `focus`.
The extension checks both the optional API and `composer-v1`, requires the input
to be mounted for the exact originating chat, then appends a line break and an
escaped text tag. Existing prose/attachments are left to the host. It never calls
send or creates a chat message. The player name comes from the resolved native
user identity for that chat, not a guessed name or historical conversation label.

The user reviews, edits or cancels the normal draft and sends it themselves.
Only the resulting saved user row can file an outgoing text. Its from attribute
must match that saved row's real author. Manually typed tags follow the same rule;
AI-written player texts still require the explicit setting, default OFF.
Draft-time tags encode ampersands, angle brackets and quotes once. Their decoded
bodies render through textContent. Time is omitted instead of inventing a device
timestamp. Recipient survives replay in the saved to attribute.

If drafting is unsupported, Add to draft shows the escaped tag in a read-only
box for manual copying into the normal chat input. If a supported composer is
unmounted or belongs to another chat, writing is refused and the reply stays.
A stale detached reply form retains its original chat ID and cannot write into
a newly selected chat. Incoming updates preserve the current reply and caret;
unsent phone reply boxes are temporary and are cleared when switching chats.
Drafts already added to the normal composer follow Lumiverse's own draft saving.

The [tag API](https://docs.lumiverse.chat/frontend-api/message-tags/) explicitly
supports user-written tags and provides isUser. Both tag registrations retain
removeFromMessage: true. Backend replay accepts user text tags but does not take
user tracker blocks as AI state. Render-time hiding leaves saved tags intact.
Real user-message rendering still requires a native-host test.

## Read status and rebuilding

Read receipts are separate from story data and macros. They use documented
[per-user storage](https://docs.lumiverse.chat/backend-api/storage/), in a
chat-ID-encoded path under message-reads. Each records the saved message identity
and exact from/to/time/body signature. Opening Ada cannot clear Bea; changing a
body or selecting a different swipe no longer matches the earlier receipt.
Deleted/regenerated texts disappear when current history is replayed. Repeated
render callbacks cannot duplicate a text or repeatedly announce the same data.

The backend authorizes the chat and validates every observed receipt against
the current saved snapshot. A new arrival or changed body racing with a read
request is not blindly marked read. Updates serialize per user/chat; responses
are pinned to that chat and frontend switch epoch. Failed read saves retain
unread counts and show a short existing error line, with no retry loop.

Sending named user rows also exposed a pre-existing field-order mismatch between
source serialization and replay. It falsely reported changed history when saving
Settings after a user text. Both now use the same order; a regression covers it.

## Opaque backgrounds, no redesign

[Lumiverse documents](https://docs.lumiverse.chat/frontend-api/dom-helper/)
--lumiverse-fill and --lumiverse-fill-subtle as background tokens. The new
--lpt-phone-bg, --lpt-screen-bg and --lpt-card-bg live on the existing .lpt-root.
Dark fallbacks are #19171f and #24212d. Where relative-color calculations are
supported, translucent theme fills are composited over those solid fallbacks
and output with alpha 1. Older browsers use the solid dark defaults.

Frame, Home, header, scrolling content, each app and card/section surfaces have
solid backgrounds. Cards/sections use a slightly different solid shade. Existing
structure, classes, dimensions, spacing and icons are retained; only colors
change outside the new Messages features. Custom CSS may override these colors,
including intentionally making them transparent. Protected sidebar Reset is
unchanged. [STYLING.md](../STYLING.md) lists all variables and new class hooks.

## Verification limits

The browser harness uses actual extension code with a substituted host, including
a fake composer and an explicit simulated user Send. No real user message or AI
request was sent by the tests. Actual installation, user author metadata, native
composer behavior/group mentions, tag hiding, read persistence and real themes
need checking in Lumiverse. Provider prompt stripping and Helper AI remain
unverified with a real connection. See [TESTING.md](../TESTING.md).
