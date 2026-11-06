# Names and CSS uploads — 0.15.0

The source section is called **Connections**. Its choices are **Main AI** and
**Custom connection**. The latter uses the same existing saved-connection picker,
read count, cost note and optional generation permission. No extra request or
connection is created by this rename. Prompt wording uses the same name.

**Settings profiles** replaces Presets. Default/Minimal and all saved profiles,
field scopes, apply confirmation and protections are unchanged. This avoids mixing
up tracker settings profiles with Lumiverse's model presets. Your model preset
still needs only `{{phone_format}}` once.

Appearance > Upload CSS files has two native file pickers: Phone styles (styles.css)
and Sidebar styles (sidebar.css). Any `.css` filename is accepted for the chosen
target. Files must be valid UTF-8 plain text, up to 256 KB each. Phone and sidebar
styles are independent, personal to the authenticated user, and shared across that
user's chats. Existing phone CSS migrates unchanged; a missing sidebar file means
the default. File paths and original names are not stored, only CSS contents.

CSS is checked before application and saving. Invalid files leave the previous
styles in place. Imports, URLs and downloads are prohibited, including escaped
resource names. Standard rules, nested selectors, media/supports/container rules
are accepted. Styling uses existing documented ctx.dom.addStyle, plus standard
browser CSSOM and CSS @scope; no invented Spindle API or new permission.
https://docs.lumiverse.chat/frontend-api/dom-helper/#ctxdomaddstylecss

Phone CSS remains in its existing Shadow DOM. Sidebar CSS is scoped to settings
content, not the toolbar. A non-customizable parent clips paint and fixed-position
content below the toolbar. Root aliases in full sidebar files provide variables
and visual styling; outer toolbar/drawer layout is protected. Reset is always
outside both styling areas, clears both immediately and reopens the phone. It can
recover a failed phone placement or hidden settings. Reset cancels pending file reads,
so a late upload cannot bring old styling back after reset.

Files are saved through the existing userStorage appearance path with trusted userId.
Old saved profiles/wording/keys/classes remain compatible. No story data, prompt
format, AI behavior, player permissions or connection selection changes.

Code and local-browser checks are in TESTING.md. Real Lumiverse CSP/placement,
mobile native file picking and a real multi-user server remain unverified here.
A browser lacking native CSS scope support rejects only the sidebar override;
the default sidebar and protected Reset keep working.
