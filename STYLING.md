# Style your phone

Open **Settings > Advanced > Custom CSS**, paste a rule, and see it immediately. It saves after a short pause. Your appearance follows your user account across chats. Reset removes styling only; saved story information stays.

If your rules hide the phone, use the single **Reset appearance** button next to **Open phone** in the Phone sidebar entry. The **Appearance reset.** confirmation stays in that tab. Reset clears styles and reopens the phone immediately, without refreshing. There is no Reset strip under the floating phone and no extra Reset button in the editor. Sidebar recovery is outside the phone's Shadow DOM and uses Lumiverse's theme directly, so phone rules cannot style it. The protected clipping/layout wrappers below also cannot be restyled from the editor. Every editable color, font, corner, gap and size comes from a --lpt- variable on one .lpt-root.

Use the three examples below without changing anything else. You can combine their properties in one rule. Defaults live in one readable source file: [src/styles.css](src/styles.css). No authored inline styles are used. Outer frame, launcher and app content are independent elements.

## Variables

Change these inside `.lpt-root { ... }`. Size values such as 400px include a unit; column counts, weights and opacity do not. Theme-derived defaults automatically follow Lumiverse. Screen bounds still limit preferred sizes.

| Variable | Default | What it changes |
| --- | --- | --- |
| `--lpt-phone-bg` | Solid `#19171f`, or opaque theme fill | Outer phone frame background. |
| `--lpt-screen-bg` | Solid `#19171f`, or opaque theme fill | Home, every app, header and scrolling area behind cards. |
| `--lpt-card-bg` | Solid `#24212d`, or opaque theme/subtle mix | Slightly different background for cards, sections and text notices. |
| `--lpt-text` | `var(--lumiverse-text, CanvasText)` | Main text color. |
| `--lpt-muted` | `var(--lumiverse-text-muted, GrayText)` | Secondary text color. |
| `--lpt-fill` | `var(--lpt-screen-bg)` | Normal controls/background, following the opaque screen. |
| `--lpt-subtle` | `var(--lpt-card-bg)` | Buttons and secondary surfaces, following opaque cards. |
| `--lpt-accent` | `var(--lumiverse-accent, Highlight)` | Highlights and selected controls. |
| `--lpt-accent-text` | `var(--lumiverse-accent-fg, HighlightText)` | Text on accent-colored buttons. |
| `--lpt-border` | `var(--lumiverse-border, ButtonBorder)` | Normal border color. |
| `--lpt-hover-border` | `var(--lumiverse-border-hover, ButtonBorder)` | Hovered button border color. |
| `--lpt-radius` | `var(--lumiverse-radius, 10px)` | Small corners, following Lumiverse. |
| `--lpt-frame-radius` | `calc(var(--lpt-radius) * 3)` | Outer phone/window corners. |
| `--lpt-font` | `inherit` | Font family, inherited from Lumiverse. |
| `--lpt-font-size` | `14px` | Normal text size. |
| `--lpt-small-font-size` | `12px` | Labels, descriptions and markers. |
| `--lpt-title-size` | `21px` | App heading size. |
| `--lpt-location-size` | `26px` | Large Scene location text. |
| `--lpt-weight` | `450` | Normal text weight. |
| `--lpt-strong-weight` | `650` | Heading and emphasized text weight. |
| `--lpt-line-height` | `1.5` | Line spacing multiplier. |
| `--lpt-space` | `8px` | Base spacing unit; other gaps are multiples. |
| `--lpt-width` | `350px` | Preferred open-phone width, clamped to screen. |
| `--lpt-height` | `590px` | Preferred open-phone height, clamped to screen. |
| `--lpt-launcher-size` | `48px` | Closed floating button size. |
| `--lpt-icon-size` | `24px` | Icon artwork size. |
| `--lpt-icon-stroke-size` | `2px` | Icon line thickness. |
| `--lpt-control-size` | `38px` | Minimum button/input height. |
| `--lpt-border-size` | `1px` | Normal border thickness. |
| `--lpt-frame-border-size` | `3px` | Outer frame border thickness. |
| `--lpt-shadow` | `0 10px 38px color-mix(in srgb, var(--lpt-text) 13%, transparent)` | Frame and launcher shadow. |
| `--lpt-icon-fill` | `color-mix(in srgb, var(--lpt-accent) 10%, var(--lpt-fill))` | Home icon background. |
| `--lpt-focus-size` | `2px` | Keyboard focus outline thickness and offset. |
| `--lpt-opacity-disabled` | `.55` | Disabled control opacity. |
| `--lpt-grid-columns` | `3` | Home icon columns. |
| `--lpt-max-label-width` | `18rem` | Maximum Settings label width. |

## Stable classes

These names are styling hooks, not extra settings or screens. App wrappers carry the same names on every visit. `.lpt-root[data-open="true"]` selects the open phone; Notes sections have `data-section="people"`, `items`, `rules`, `plots`, or `misc`. Home buttons have `data-app="Scene"` and the other exact app labels. The usual `[open]` selector targets expanded cards/sections.

| Class | What it is |
| --- | --- |
| `.lpt-helper-settings` | Tracker source group in the existing Settings app. |
| `.lpt-helper-source` | Main AI / Helper AI selector. |
| `.lpt-helper-connection` | Saved-connection picker, shown for Helper AI. |
| `.lpt-update-now` | Explicit Helper AI update button; disabled while busy. |
| `.lpt-option` | Theme-colored native picker option. |
| `.lpt-add-draft` | Add to draft button; never sends a message. |
| `.lpt-conversation` | Expandable sender conversation, with data-conversation holding the normalized recipient/sender key. |
| `.lpt-incoming` | Incoming text message modifier. |
| `.lpt-manual-tag` | Read-only escaped tag for manual copy when composer drafting is unsupported. |
| `.lpt-outgoing` | Outgoing text message modifier; only saved sent texts appear. |
| `.lpt-reply` | Inline conversation reply form. |
| `.lpt-reply-input` | Unsent reply text box. |
| `.lpt-reply-status` | Draft success, unavailable or wrong-chat explanation. |
| `.lpt-text-body` | Actual plain text content, with line breaks preserved. |
| `.lpt-text-list` | Chronological messages within a sender conversation. |
| `.lpt-text-message` | One text with sender, body and optional established time. |
| `.lpt-text-notice` | Brief new-text notice, including when the phone is closed. |
| `.lpt-text-sender` | Saved sender name; outgoing texts also say You. |
| `.lpt-text-time` | Story-supplied text timestamp; absent if unknown. |
| `.lpt-unread-badge` | Unread number on Messages, each conversation and Contact Open texts. |
| `.lpt-absent` | Collapsed Not here now contact group. |
| `.lpt-actions` | Inline row of action buttons. |
| `.lpt-add` | Add contact, place or note button. |
| `.lpt-advanced` | Collapsed Advanced settings. |
| `.lpt-app-button` | A labelled Home app button. |
| `.lpt-app-icon` | Background around a Home icon. |
| `.lpt-app-label` | Text below a Home icon. |
| `.lpt-back` | Back to Home button. |
| `.lpt-button` | General Edit button. |
| `.lpt-cancel` | Cancel an edit or deletion. |
| `.lpt-card` | Shared expandable card frame. |
| `.lpt-card-body` | Expanded card contents. |
| `.lpt-card-subtitle` | Roles, presence or last-seen line. |
| `.lpt-card-title` | Contact or place name. |
| `.lpt-close` | Close phone button. |
| `.lpt-contact` | One character card. |
| `.lpt-contacts` | Contacts app content. |
| `.lpt-content` | Scrollable app area, separate from the outer frame. |
| `.lpt-counter` | Notes section count and limit. |
| `.lpt-css-editor` | Live custom CSS text box. |
| `.lpt-custom-css` | Collapsed Custom CSS section. |
| `.lpt-delete` | Delete button and its inline confirmation. |
| `.lpt-description` | Dismissible one-line app explanation. |
| `.lpt-description-text` | Explanation text. |
| `.lpt-dismiss` | Dismiss explanation or saved-data notice. |
| `.lpt-empty` | Honest empty/off/no-chat explanation. |
| `.lpt-error` | Save or CSS error line. |
| `.lpt-field` | Tappable Scene, Weather or Contact field. |
| `.lpt-field-label` | Short field label. |
| `.lpt-field-value` | Field contents. |
| `.lpt-form` | Inline add/edit form. |
| `.lpt-frame` | Outer phone frame, independent of app content. |
| `.lpt-header` | App heading with back and close buttons. |
| `.lpt-heading` | Current app title. |
| `.lpt-help` | Short form/settings help. |
| `.lpt-home` | Home icon grid. |
| `.lpt-icon` | SVG icon artwork. |
| `.lpt-icon-path` | Line shapes within the SVG icon. |
| `.lpt-input` | Single-line text input. |
| `.lpt-island` | Protected host-side holder of the shadow root (not custom-styled). |
| `.lpt-label` | Form input label. |
| `.lpt-launcher` | Closed floating phone button. |
| `.lpt-location` | Large exact-location field in Scene. |
| `.lpt-locations` | Locations app content. |
| `.lpt-marker` | Edited, inferred, user-added, Updated or Current marker. |
| `.lpt-messages` | Actual Messages app content. |
| `.lpt-note` | One expandable Notes card. |
| `.lpt-note-full` | Full note text after expansion. |
| `.lpt-note-line` | Single terse note summary, ellipsis if needed. |
| `.lpt-note-section` | One of five Notes sections. |
| `.lpt-notes` | Notes app content. |
| `.lpt-notice` | Dismissible capacity notice. |
| `.lpt-notice-text` | Capacity notice contents. |
| `.lpt-number` | Advanced whole-number input. |
| `.lpt-open-texts` | Contact button opening that sender in Messages, with its unread badge. |
| `.lpt-place` | One saved Location card. |
| `.lpt-place-description` | Expanded Location description or relation. |
| `.lpt-present-list` | Names-only Here now list. |
| `.lpt-present-name` | One Here now name. |
| `.lpt-recovery-actions` | Protected sidebar row with Open phone and the single Reset appearance button. |
| `.lpt-recovery-button` | Protected Reset/Open button outside custom styling. |
| `.lpt-recovery-panel` | Protected Phone sidebar recovery entry. |
| `.lpt-recovery-status` | Protected reset/load status text. |
| `.lpt-resolved` | Collapsed resolved plots group. |
| `.lpt-root` | Single customizable root containing all --lpt- defaults. |
| `.lpt-save` | Save edit button. |
| `.lpt-scene` | Scene app content. |
| `.lpt-section` | Shared spacing for a group. |
| `.lpt-section-body` | Expanded Notes section content. |
| `.lpt-section-header` | Notes heading, counter and Add row. |
| `.lpt-section-title` | Group heading text. |
| `.lpt-setting` | One grouped Settings row. |
| `.lpt-setting-description` | One-line switch/number explanation. |
| `.lpt-setting-label` | Short setting name. |
| `.lpt-setting-text` | Setting label and description together. |
| `.lpt-settings` | Settings app content. |
| `.lpt-settings-group` | One app's group of switches. |
| `.lpt-size-probe` | Invisible preferred-size measurement; normally leave alone. |
| `.lpt-speaker` | Small decorative phone speaker. |
| `.lpt-status` | Non-blocking save status. |
| `.lpt-summary` | Expandable card or section heading. |
| `.lpt-textarea` | Multi-line edit field. |
| `.lpt-toggle` | On/off checkbox. |
| `.lpt-transport` | Protected host layout wrapper (not custom-styled). |
| `.lpt-viewport` | Protected clipping boundary (not custom-styled). |
| `.lpt-weather` | Weather app content. |
| `.lpt-wider` | Wider location or removed-attire secondary line. |

## Copy-paste examples

Change the accent color:

```css
.lpt-root {
  --lpt-accent: #78c6b2;
  --lpt-accent-text: #102521;
}
```

Make the phone bigger:

```css
.lpt-root {
  --lpt-width: 390px;
  --lpt-height: 700px;
}
```

Give it a desktop-window look:

```css
.lpt-root {
  --lpt-width: 640px;
  --lpt-height: 480px;
  --lpt-frame-radius: 10px;
  --lpt-frame-border-size: 1px;
}
.lpt-speaker { display: none; }
```

Ordinary rules, @media and @supports are supported. Keep styles local: no imports, linked images, downloaded fonts, CSS escape sequences or other at-rules. Unfinished braces/quotes/comments and unsupported constructs show a short error and leave the last working style in place. Browsers may silently ignore an unknown property; fix or remove that line if it does nothing. Rules can make the phone unusable, but the protected Reset remains available. Reset clears the local view even if saving is temporarily unavailable; try again if it says the reset was not saved.

Messages hooks below are implemented in Step 5. Conversations expand in the same screen; no extra app or nested navigation was added.

The seven Home icons use the requested [Lucide designs](THIRD-PARTY-NOTICES.md), embedded locally. They inherit currentColor through .lpt-icon-path, so --lpt-accent or a .lpt-app-icon color rule recolors them. The launcher, back and close controls remain the original small drawings; only seven Lucide designs are bundled.

The protected phone wrapper receives explicit numeric placement bounds, independent of the host root's height. This prevents a zero-height host mount from hiding the phone. Defaults and visual styling remain in styles.css; only the measured placement dimensions are emitted into an instance-scoped rule. Custom CSS cannot change that wrapper or escape its clipped painting area. Reset is still usable if creating the floating phone fails. See [the v0.4.2 fix report](docs/FIX-0.4.2.md) for tested cases and real-host limits.

## Solid background defaults

The new phone/screen/card variables are colors on the existing .lpt-root. The documented Lumiverse sources are --lumiverse-fill and --lumiverse-fill-subtle. When the browser supports relative colors, translucent theme fills are composited over explicit dark fallbacks and flattened to alpha 1. Without that support, the solid dark defaults apply. Cards and sections use a slightly different opaque shade. This changes colors only; frame shape, sizes, spacing, icon sources and the protected sidebar Reset are unchanged.

You can set --lpt-phone-bg, --lpt-screen-bg and --lpt-card-bg to your own solid colors. Your custom CSS may deliberately make them transparent again; the extension does not override your design. Existing --lpt-fill and --lpt-subtle now follow the screen/card colors. All appearance defaults remain in src/styles.css.

Helper AI adds only the source, connection, recent-message count and Update now controls in Settings. They reuse the same opaque colors and existing spacing variables. Protected sidebar recovery and the phone frame are unchanged; no new visual redesign is included.
