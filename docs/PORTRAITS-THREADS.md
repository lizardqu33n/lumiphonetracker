# Compact views, text threads and portraits - 0.11.0

This checkpoint implements the first requested step only. The time/date top strip,
sidebar toolbar/accordion and eight supplied sidebar PNGs are left for the next
checkpoint. No sidebar default CSS or launcher asset changes in this step.

Scene keeps Location first. Time and Date share a row; Here now stays names.
Contacts are flat portrait rows with inline expandable details, roles, presence
and the existing You/player-field protections.

Messages lists one row per direct conversation or explicitly named group, newest
first, with a portrait, name, one-line ellipsis preview, known time and personal
unread badge. Opening shows a thread, marks only that conversation read and
starts at the bottom. Incoming is left; outgoing is right. Sender names appear
only in groups; consecutive messages from one sender have tighter spacing.
Story Scene dates, when established at the message's position in history, make
solid date separators. No device date, clock or guessed date parsing is used.
If Scene Date is off, these date labels are hidden too. A date learned later
cannot be retroactively assigned to an old message without evidence.

The composer is part of the thread's bottom layout, with the message list alone
scrolling. The input grows from one to four lines. Add to draft never sends or
files a reply until a named user actually sends the tag. The existing escaped
tag, composer capability, exact-chat and player-writing checks remain. The small
drafting explanation has its own personal, persistent dismissal. Viewport resize
is handled with the ordinary browser visualViewport API; native keyboard behavior
still needs mobile testing. Reading older messages does not force a jump to new ones.

## Custom portraits

Contact edit includes Change portrait and Remove. Press Save to apply the name and portrait together; Cancel keeps the previous portrait. Browser code checks real PNG,
JPEG or WebP bytes and declared MIME, rejects GIF/SVG and animated PNG/WebP,
checks the 5 MB input limit before decoding, and limits decoded dimensions to
32 million pixels. It center-crops and redraws to 128 x 128, then encodes WebP at
bounded quality steps (PNG fallback on browsers that lack WebP export). This strips
original metadata. Output must be at most 20 KiB; otherwise the upload is rejected.

The server independently checks data-URI form, bytes/type, dimensions, per-image
size, chat authorization and expected revision. Stored custom portraits live in
the existing chat document, keyed to the contact's exact case-insensitive name;
rename moves that data, case-only rename preserves it, and explicit Remove clears
it. Everyone authorized in that chat shares it. The aggregate cap is **512 KiB
of encoded data-URI characters per chat**, including all custom portraits. A full
cap rejects the new upload and keeps existing portraits. No automatic eviction.

All rendering uses a plain img with validated raster data only, plus an initial
fallback. There are no external image URLs, HTML strings, SVGs, CSS image loads,
new server uploads or API keys. A decode/load failure shows the initial. Palette
selection is deterministic from the name and uses documented lpt CSS tokens.
Portraits are not part of tracker-writing, continuity or Helper input.

## Card/persona API findings

Sources: [Characters](https://docs.lumiverse.chat/backend-api/characters/),
[Images](https://docs.lumiverse.chat/backend-api/images/),
[Personas](https://docs.lumiverse.chat/backend-api/personas/),
[Chats](https://docs.lumiverse.chat/backend-api/chats/),
[Permissions](https://docs.lumiverse.chat/getting-started/permissions/) and
[DOM helper](https://docs.lumiverse.chat/frontend-api/dom-helper/), cross-checked
against official lumiverse-spindle-types 0.6.77. The live Personas page returned
502 during research; the local Lumiverse developer-docs copy supplies its
getActive and image_id contract. Local docs include newer is_narrator fields
missing from the installed types; this extension does not use them.

- The authorized ChatDTO exposes character_id. characters.get(id,userId) returns
  the main card's name/image_id; images.readBinary(imageId,userId) provides bytes.
  The typed avatar_url is not used: no URL is reconstructed or loaded.
- personas.getActive(userId) is the requesting user's active persona. Use its
  image only if its name exactly matches that request's confirmed player name.
  Never list/search other users' personas or infer a chat-specific override.
- Optional runtime grants are characters+images or personas+images. Without
  them, or if an older host lacks an API, initials/custom portraits still work.
  Docs do not define a separate optional_permissions manifest property, so grants
  are declared normally but are never required by the phone's startup path.
- The ordinary chat DTO has no documented group-member enumeration. The unrelated
  Council API is not a source of roleplay group members. No host-private metadata,
  selectors or guessed member IDs are used. Main-card matches get the card image;
  other group NPCs need a custom portrait or initial. Explicit group conversations
  themselves use a name-colored initial, not a guessed participant portrait.
- Portrait source replies target only the trusted requesting user and pinned chat.
  Persona bytes stay in that frontend's memory, never the shared chat document.
  UI epoch guards reject a response after a chat switch; Refresh reloads sources.
- Docs describe authenticated image URLs and strict sandbox CSP, but no universal
  CSP escape for host DOM images. This extension uses its existing Shadow DOM UI,
  data URIs and no fetch/CDN. A CSP/image failure falls back to initials. Native
  host CSP and mobile WebViews cannot be established by local browser mocks.

Custom portrait wins, then the matching card for NPCs or own persona for the
player, then initial. Match full names case-insensitively, never nicknames or
substrings. Duplicate candidate names do not choose an arbitrary card.

## Group tags

As explicitly approved, phone-text may have group="Established group name".
Only actual named player group texts use it. Existing recipient/player checks
still apply: a group does not authorize NPC-to-NPC texts. Replies preserve the
group attribute as escaped text in the draft. Unlabelled senders stay in separate
direct conversations. See BLOCK-FORMAT.md.

## Verification limits

TESTING.md records the exact code/browser totals. No real server, second-user
login, real card/persona image permission grant, provider or mobile keyboard was
used. Group membership lookup, authenticated URL rendering and native CSP/mobile
keyboard positioning are not claimed to work beyond the documented/data-only
fallbacks above. The toolbar/title strip/icons are deliberately not part of this step.
