# Story strip and compact sidebar - 0.12.0

The phone displays a single read-only strip derived from the existing Scene
Time/Date cells. It sits in Home's header beside Close, and above app headers.
Only established values with effective switches on appear, joined with a middle
dot. Empty values do not get a dash, clock or invented day. Scene still edits
those same cells in its compact row. Removing Scene also hides its strip values;
adding it restores them. The macro/parser/data model is unchanged.

The existing Phone sidebar now has a three-action icon toolbar: Open phone,
Refresh tracker, Reset appearance. Each keeps an aria-label, a minimum 44px target,
hover/keyboard tooltip and a short caption in narrow drawers. Artwork is 32px.
The Helper Refresh tooltip includes the plain cost note; Main refresh still
rebuilds saved messages without a model request.

Only the content below the toolbar/results scrolls. The result line is normal
flow and collapses when empty; each action replaces the previous result and
clears after five seconds. The toolbar cannot overlay settings while scrolling.
Reset and its confirmation stay outside the phone's Shadow DOM/custom CSS and
do not depend on successful floating-widget mounting. Appearance reset/storage
failure behavior is preserved.

## Settings layout and scope

Only one outer section is open at once, with App Store initially open. The
section builder is key-based and has no five-section limit, so future Presets
and Prompt wording sections do not need a navigation redesign. They are NOT
implemented here.

- App Store: compact responsive grid, three columns from 300px, two below that,
  one below 220px. All nine app names and one Add/Remove control remain. No On
  phone pill. Descriptions are available as tooltips/accessibility descriptions;
  each phone app keeps its own description. This fits ordinary desktop drawers;
  very narrow/short ones can scroll.
- What to track: only added apps have groups. Native labeled checkbox chips
  preserve a real checked/unchecked shape, so color is not the only signal.
  Existing field switches and values are unchanged. No undocumented host chip
  component is used; no host component's private children are styled.
- Helper AI: the same Main/Helper choice, saved connection picker, recent-message
  count and cost note in a smaller layout. No new model requests or settings.
- Appearance: all my chats, with a collapsed Custom CSS editor inside. It still
  applies live, saves per requesting user, and cannot affect this sidebar.
- Advanced: the same four numeric settings in two columns. Tooltips explain each;
  the two safety switches retain visible hints and remain OFF in new chats.

Apps, switches, source and number settings remain shared chat settings. Personal
appearance, reads, notices and dismissals keep their existing user scope. No
backend/Spindle call was added; saves use the same trusted-user message path,
pinned chat and revision guards. Stale old controls cannot save into a new chat.

## Icons

Eight supplied PNGs are embedded unchanged in src/ui-icons.ts. All are 64x64:
open-phone, refresh, reset, apps, track, helper, look, advanced. Raw PNG total:
**46,981 bytes**. Embedded data-URI text total: **62,828 characters** (about
61.4 KiB); the source module is 63,161 bytes. Toolbar images display at 32px;
section images at 24px. Smooth scaling, no CDN/file request. Section art is
marked decorative because visible titles name the sections; toolbar buttons
keep their independent accessible action names.

## Documented placement and limits

[UI Placement](https://docs.lumiverse.chat/frontend-api/ui-placement/) documents
registerDrawerTab, headerTitle and the writable HTMLElement root. The extension
adds its own lpt-sidebar-mount class to THAT root and removes its own root padding;
it places the toolbar first. No host-private selector, parent-title mutation,
undocumented header slot or invented spacing API is used. The simulated host
includes a separate title and padded root to verify the flush placement.

The real host may have layout outside that root; there is no documented generic
API here for changing such outer spacing. Exact native title-bar/mobile drawer
placement still needs a real Lumiverse check. The toolbar is solid even if the
host fill is translucent: a documented theme fill supplies RGB with full alpha
where relative colors are supported, and a solid explicit fallback is used.
See TESTING.md for code/browser coverage and real-install limits.
