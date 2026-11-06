# Emoji - Step E (0.13.0)

In a Messages reply, Choose emoji opens an opaque picker. Click a choice or use
arrows, Home/End and Enter/Space. Escape closes only the picker. Each choice has
its name as a tooltip/accessibility label. It inserts :name: at the cursor or
replaces the selection, within the existing 3,000-character reply limit.
Add to draft never sends or files a reply; it still makes an escaped draft tag
for the original chat. Incoming updates preserve the insertion cursor. The
picker is scrollable on small screens. No new setting or permission is needed.

Recognized codes become static embedded PNGs in phone display text (including
Messages previews/bubbles, Scene, Weather, Contacts and Notes). They use pixelated
scaling, not blur. Unknown names stay literal. Inputs, the CSS editor, copied
tags and drafts remain plain text. This is display-only: no HTML is interpreted,
no user-provided image URL is loaded, and stored text/AI continuity are not rewritten.
Email still rejects raw HTML/remote images; these fixed emoji are a display-only
exception, not incoming email image content.

## Art and transparency

All three sheets have RGBA alpha ranging from 0 to 255, with fully transparent
corners. Most painted pixels are slightly translucent (most commonly 253/255).
We preserve that result exactly; no background or alpha normalization is added.

The 4x3 sheet is 1448x1086: full cells are 362x362. The two 4x2 sheets are
1772x886: cells are 443x443. Cuts are row-major, with no face trimming/resizing.
The approved exception moves sleepy Z's three visible spill rows plus two faint
edge rows out of wink into five transparent rows above sleepy. Sleepy therefore
remains a full 362x362 cell with five padding rows (362x367); no Z pixels are lost.
All horns, halo and sparkles remain within their complete cells.

| Sheet | Names, row by row |
| --- | --- |
| pastel-emoji-4x3 | smile, laugh, sad, heart_eyes; wink, blush, angry, surprised; sleepy, heart, thumbs_up, sparkles |
| extra-pastel-emoji-4x2 | crying, pensive, content, pleading; happy_blush, sad_pleading, unamused, angel |
| final-pastel-emoji-4x2 | angry_devil, devil, happy_tear, kiss_blush; kiss_heart, tongue, sweat, cool |

Image totals: **2,818,584 PNG bytes / 3,758,768 embedded data-URI characters**
(about 3.6 MiB encoded). Assets are lossless full-size cells; they load from the
extension, never a CDN. Exact source hashes, alpha counts, cell bounds and output
pixel hashes are in EMOJI-ASSETS.json. build-emoji-assets.py regenerates the
module from the three original sheets; Pillow is needed only for that optional
asset task, not for installing or building the extension from its included source.

## Parsing and limits

Shortcodes contain only lowercase letters/underscores between colons. The
shorthand parser reads the FIRST colon as the field separator; later colons in
values remain ordinary text. Codes contain no pipes, line breaks or tag brackets.
Existing space-pipe-space separators and forbidden-value rules are unchanged.
Evidence quotes and saved message content are never processed by the image renderer.
Tests cover codes in weather, notes/contact values, literal text-tag pipes, unknown
codes and invalid pipe placement. phone_format and all macro files are unchanged;
there are no new emoji-writing instructions or macros in this step.

Code/browser tests are reported in TESTING.md. Native Lumiverse CSP, mobile/IME
cursor behavior and the final appearance on a real installation remain unverified.
