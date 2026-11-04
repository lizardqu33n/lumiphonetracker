# Step 4: phone screens, edits and appearance

This checkpoint implements the seven-icon Home, six working information/settings
screens, and a clearly labelled Messages placeholder. Step 5 supplies actual
conversations, unread badges, arrival notices and reply drafting. Step 6 supplies
Helper AI. Neither step was implemented early.

## Documented host APIs

The frontend uses `ctx.ui.createFloatWidget` for the phone and
`ctx.ui.registerDrawerTab` for Open phone / Reset recovery. Widget resizing uses
`setSize`, `getPosition` and `moveTo`; cleanup calls `destroy`. Float widgets
require the new `ui_panels` permission. Drawer tabs do not.
See [UI placement](https://docs.lumiverse.chat/frontend-api/ui-placement/).

`ctx.dom.addStyle(css)` adds protected host chrome styles and returns a cleanup
function, as documented in [DOM helper](https://docs.lumiverse.chat/frontend-api/dom-helper/).
Ordinary DOM nodes mount into the documented widget root. Inside it, native
browser `attachShadow` isolates the custom-styled phone. This is a
[browser API](https://developer.mozilla.org/en-US/docs/Web/API/Element/attachShadow),
not an invented Lumiverse API. Its styles use standard style elements with
textContent. There are no authored inline style attributes.

Initial chat detection uses `getActiveChat().chatId` from official published
`lumiverse-spindle-types` 0.6.77, with the documented composer's state as fallback.
This helper is not separately described on the website. No selectors inspect
Lumiverse internals. Events and authenticated frontend/backend messages tie each
request to its originating chat.

## Data and edits

The frontend calls the existing chat-authorized store with the displayed revision.
Changed history or revision rejects a stale save. The backend generates edit
identities and anchors; it never trusts UI-supplied user identities or history
positions. Late saves still target their original chat, and responses for another
chat cannot enter the currently visible phone.

Edits replay after their source message, marked as user-confirmed and protected
by Step 3's evidence checks. Renaming a Contact updates Here now; renaming the
current Location updates Scene. Duplicate renames reject. Old names have
deletion records to prevent old AI entries from returning. Player name spelling
survives replay, and renaming a player retains private-field restrictions.
Presence is the sole source of Here now; Scene is the sole source of Current.
Notes retain user-added/edited/updated markers.

Tracker settings remain chat-scoped. Only custom CSS and dismissed explanations
are stored per authenticated user, in appearance.json through documented
`spindle.userStorage.getJson/setJson`. Updates are serialized per user and partial,
so saving CSS cannot erase a dismissal. Revisions prevent stale preference
responses from rolling back the local snapshot.

## Safe appearance recovery

All editable phone styling lives in src/styles.css, with the --lpt- defaults
on .lpt-root. Outer frame, launcher and app content are separate elements.
User CSS is limited to the phone's shadow tree. A clipped, paint-contained parent
bounds its painting independently of custom styles. The only Reset appearance
button and confirmation now live next to Open phone in the existing sidebar tab,
which is outside that tree and independent of successful floating placement.
Recovery controls use Lumiverse theme tokens directly and cannot be custom-styled.
The floating strip and in-editor Reset button were removed in v0.4.2.

The protected surface has explicit measured dimensions even when the host mount
root has auto height. A single instance-scoped numeric CSS rule mirrors the
bounds passed to widget.setSize; all appearance defaults remain in styles.css,
and no inline style attributes are used. See [the reproduction and fix](FIX-0.4.2.md).

Ordinary CSS, @media and @supports work. Imports, external images/fonts, escape
sequences and global at-rules are rejected. Incomplete syntax leaves the last
working style active; browsers may ignore individual unknown declarations.
Reset clears local CSS immediately, even if storage is unavailable. It never
deletes tracked information. Browser or host failure cannot be guaranteed
recoverable by extension code.

AI-generated text uses textContent, never raw HTML. No external assets, servers,
AI requests or keys are introduced. Host permissions and native browser behavior
need real-install verification; the local browser harness substitutes only those
host boundaries. See [TESTING.md](../TESTING.md).

## Icon source correction (0.4.1)

The first Step 4 icons were hand-written SVG drawings, not Lucide. The seven Home drawings are now replaced with the exact requested Lucide geometry, embedded in src/icons.ts and bundled into the frontend. No Lucide dependency or external icon assets are loaded; original launcher/back/close drawings remain. Attribution, source commit and the full upstream license ship with the extension.

The [shared-components documentation](https://docs.lumiverse.chat/frontend-api/shared-components/) describes supplying your own inline SVG (icon-svg / iconSvg) and some controls with built-in icons. It does not document a general API for obtaining a named host/Lucide icon. No host icon registry, internal import or guessed API is used.
