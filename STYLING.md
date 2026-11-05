# Style your phone

Version 0.6.1 uses the supplied stylesheet as the default look: a notch and home bar, individual app tints, solid cards, message bubbles and pill switches. Class names, navigation and tracker behavior are unchanged.

Open **sidebar > Phone > Appearance > Custom CSS** to override the defaults live. Your saved custom CSS still overrides a new default after an update; it is not deleted automatically. To see the new default alone, use **Reset appearance** at the top of the Phone sidebar in the Phone sidebar tab.

That single Reset and its confirmation stay outside the phone's Shadow DOM. Custom phone CSS cannot style them or escape the protected clipping area. Reset clears only appearance and reopens the phone without a page refresh, even after hostile CSS. It never deletes story data. If saving fails, the current view is restored and the sidebar tells you to try saving again.

All default rules are in [src/styles.css](src/styles.css). All declared --lpt- variables live on the same .lpt-root element. Some small decorative details are fixed CSS values; use the stable class selectors below to change those. There are no inline style attributes, external fonts, icon downloads or CDN requests. The frame, launcher and app content remain separate.

Version 0.8.1 embeds the new tight-cropped 88 x 128 transparent PNG unchanged. The default is **A: a transparent 50 x 50 launcher**, with artwork about 34 x 50, centered and touching top and bottom. It keeps its proportions, with no cropping, stretching or inner padding. Side space is required by the taller artwork's shape. Smooth scaling is used. Only the image has a soft drop shadow; the box has no background, border or box shadow, even on hover. PNG colors stay as drawn; the app PNGs retain their original colors.

The visible box in earlier versions came from `.lpt-launcher` in our stylesheet. Lumiverse's documented [chromeless float widget](https://docs.lumiverse.chat/frontend-api/ui-placement/#spindlefloatwidgetoptions) is already enabled and removes host background/border/shadow. No host-private selector or new API is used. Native desktop window behavior still needs a real-host check.

**B: taller artwork** is also possible with the CSS below. The art is about 38 x 55. Its invisible tap target stays 50 x 55: making the actual target only 38 pixels wide would shrink the existing tap area. There is no extra setting or control.

```css
.lpt-root { --lpt-launcher-size: 50px; }
.lpt-launcher { height: 55px; }
```

`.lpt-launcher-image` is the stable artwork class. The native button keeps the **Open phone** label, keyboard activation and a visible focus ring inside its bounds, so placement clipping cannot cut the ring off. The direct `.lpt-unread-badge` stays above the image and inside the target. Existing dragging and sidebar Reset protection are unchanged. The existing protected placement still clips to its own bounds; a large custom shadow can be cut off at those edges. Increasing shadow blur does not enlarge the tap area. Open phone screens, frame and cards remain opaque.

## Optional apps and PNG artwork (0.10.0)

The nine supplied 128 x 128 app PNGs are embedded in src/app-icons.ts. Home and
App Store use the same images, contained with normal smooth scaling and no
external loading. Home artwork defaults to 44px through --lpt-app-image-size;
sidebar artwork uses its own 22px rule in sidebar.css. PNG colors do not inherit
currentColor; the general accent variable still recolors labels, badges and
other controls. The separate launcher art/fit is unchanged.

Calls, Email and Bank reuse the existing opaque screen/card variables. They have
no separate color theme. Record editors reuse the existing form/edit/delete
classes. Calls has no dialing action; Email has no compose, send or reply action.
All email body/subject content is literal text, including URL-looking text.

| Class | What it is |
| --- | --- |
| `.lpt-app-image` | Embedded app PNG on Home or in App Store. |
| `.lpt-activity` | Shared opaque optional-app screen container. |
| `.lpt-calls` | Calls screen. |
| `.lpt-call` | One call record card. |
| `.lpt-muted` | Optional known time/recipient metadata text in the new apps. |
| `.lpt-call-direction` | Incoming, Outgoing or Missed label. |
| `.lpt-email.lpt-activity` | Email inbox screen. |
| `.lpt-email.lpt-card` | Expandable stored email card. |
| `.lpt-email-summary` | Sender/subject/time row that opens the email. |
| `.lpt-email-from` | Literal sender name or address. |
| `.lpt-email-subject` | Literal subject. |
| `.lpt-email-body` | Plain body text with preserved line breaks and no links/HTML. |
| `.lpt-email-unread` | Personal unread label on one email. |
| `.lpt-bank` | Bank screen. |
| `.lpt-bank-account` | Account and its last stated balance. |
| `.lpt-bank-balance` | Balance or Last stated amount, without calculation. |
| `.lpt-bank-time` | Known as-of time. |
| `.lpt-bank-transaction` | One recent transaction card. |
| `.lpt-transaction-amount` | Literal transaction amount. |

The existing `.lpt-unread-badge` also shows personal missed-call and email counts.
No new navigation tabs or Settings screen are added. New App Store entries start
removed; removed data stays saved. Shared story data/settings and personal
receipts/appearance/dismissals follow [PART-4.md](docs/PART-4.md).

## Sidebar settings (0.9.0)

All settings are now in the existing **Phone** sidebar. Only App Store opens by
default. The scope is visible in each section heading. The phone keeps story
screens, editing, replies and dismissible descriptions, plus `.lpt-home-hint`.
Home has only added apps; it has no Settings or App Store icon.

Sidebar rules live in [src/sidebar.css](src/sidebar.css), outside the phone's
Shadow DOM. The phone CSS editor cannot style the sidebar, its controls or Reset.
Do not put sidebar rules in that editor; it intentionally changes only the phone.
The sidebar follows host theme variables, and uses Lumiverse's shared switches
when available. Shared switches own their internal classes; use their documented
host options rather than styling private children. General shared buttons are
not documented, so these buttons are native elements with small themed styles.

| Sidebar class | What it is |
| --- | --- |
| `.lpt-sidebar` | Host sidebar root, with vertical scrolling and no phone style variables. |
| `.lpt-sidebar-settings` | Chat label and the five collapsible sections. |
| `.lpt-recovery-actions` | Sticky Open / Refresh / Reset area. |
| `.lpt-recovery-action` | One top button and its own short result. |
| `.lpt-recovery-button` | Top action button. |
| `.lpt-recovery-status` | Short confirmation or recovery explanation. |
| `.lpt-refresh-result` | Refresh result, kept with the top Refresh button. |
| `.lpt-side-chat` | Name of the chat these settings affect, or the no-chat message. |
| `.lpt-side-section` | Collapsible section. |
| `.lpt-side-summary` | Section title and visible scope label. |
| `.lpt-side-apps` | App Store, the only section expanded initially. |
| `.lpt-side-tracking` | Grouped field switches for this chat. |
| `.lpt-side-source` | Main AI / Helper AI controls for this chat. |
| `.lpt-side-appearance` | User-wide live phone CSS editor. |
| `.lpt-side-advanced` | Existing numeric settings and two optional AI switches. |
| `.lpt-store-row` | Built-in app row, identified by data-store-app. |
| `.lpt-store-icon` | Static bundled Lucide app icon, using currentColor. |
| `.lpt-store-name` | App's plain name. |
| `.lpt-store-added` | On phone label. |
| `.lpt-store-button` | Add or Remove button. |
| `.lpt-side-group` | Group of tracking switches for one app. |
| `.lpt-side-legend` | App name above its switches. |
| `.lpt-side-setting` | One switch or numeric setting, identified by data-setting. |
| `.lpt-side-label` | Label and short explanation. |
| `.lpt-side-title` | Short setting name. |
| `.lpt-side-help` | One-sentence explanation. |
| `.lpt-side-switch` | Mount target for the documented shared switch. |
| `.lpt-side-checkbox` | Native checkbox fallback for older hosts. |
| `.lpt-side-number` | Existing bounded whole-number input. |
| `.lpt-helper-source` | Moved Main AI / Helper AI picker. |
| `.lpt-helper-connection` | Moved saved-connection picker. |
| `.lpt-sidebar-css` | Moved live phone CSS text area. |
| `.lpt-side-status` | Save result or CSS validation message. |

The old `.lpt-settings`, `.lpt-settings-group`, `.lpt-setting*`, `.lpt-toggle`,
`.lpt-number`, `.lpt-advanced`, `.lpt-custom-css`, `.lpt-css-editor` and
`.lpt-helper-settings` entries below are legacy stylesheet hooks; there is no
phone Settings screen using them. `.lpt-update-now` remains the Refresh button's
compatibility class, now in the sidebar. The standard phone editor, card, form
and button classes still apply to story controls inside the phone.

## Variables

Set these inside `.lpt-root { ... }`. Sizes need units such as px; counts, weights and opacity do not. The table lists base defaults. Theme-derived replacements and narrow-screen adjustments are explained below it.

| Variable | Base default | What it changes |
| --- | --- | --- |
| `--lpt-phone-bg` | `#121017` | Opaque outer phone frame; dark fallback, composited theme fill when supported. |
| `--lpt-screen-bg` | `#15131c` | Opaque Home/app/header/scroll area behind cards. |
| `--lpt-card-bg` | `#1f1c29` | Slightly different solid card and section background. |
| `--lpt-elevated-bg` | `#292536` | Raised surfaces, hover fills and incoming bubbles with theme support. |
| `--lpt-fill` | `var(--lpt-screen-bg)` | Compatibility background token following the screen color. |
| `--lpt-subtle` | `var(--lpt-card-bg)` | Compatibility secondary token following the card color. |
| `--lpt-text` | `var(--lumiverse-text, #f0edf6)` | Main text color. |
| `--lpt-muted` | `var(--lumiverse-text-muted, #9b95aa)` | Secondary text color. |
| `--lpt-accent` | `var(--lumiverse-accent, #a485f7)` | Highlights and selected controls. |
| `--lpt-accent-text` | `var(--lumiverse-accent-fg, #120f1d)` | Text on accent-colored buttons. |
| `--lpt-border` | `#2d293b` | Normal borders; theme-derived when relative colors are supported. |
| `--lpt-hover-border` | `#47405c` | Hover borders; theme-derived when relative colors are supported. |
| `--lpt-frame-edge` | `#353047` | Phone frame edge and inset highlight. |
| `--lpt-notch-bg` | `#09080c` | Top notch pill background. |
| `--lpt-notch-width` | `76px` | Top notch pill width. |
| `--lpt-notch-height` | `18px` | Top notch pill height. |
| `--lpt-home-bar-width` | `112px` | Bottom decorative home bar width. |
| `--lpt-home-bar-height` | `4px` | Bottom decorative home bar thickness. |
| `--lpt-home-bar-color` | `#3f3952` | Bottom decorative home bar color. |
| `--lpt-tint-scene` | `#b494ff` | Scene Home icon color and tinted tile fill. |
| `--lpt-tint-weather` | `#72bdf5` | Weather Home icon color and tinted tile fill. |
| `--lpt-tint-locations` | `#66d4a5` | Locations Home icon color and tinted tile fill. |
| `--lpt-tint-notes` | `#f0bf6c` | Notes Home icon color and tinted tile fill. |
| `--lpt-tint-contacts` | `#f08ca6` | Contacts Home icon color and tinted tile fill. |
| `--lpt-tint-messages` | `#8ea2ff` | Messages Home icon color and tinted tile fill. |
| `--lpt-tint-settings` | `#b0a9c4` | Settings Home icon color and tinted tile fill. |
| `--lpt-bubble-in-bg` | `#272333` | Incoming message bubble background. |
| `--lpt-bubble-out-bg` | `#362859` | Outgoing message bubble background. |
| `--lpt-bubble-out-border` | `#5a4294` | Outgoing message bubble border. |
| `--lpt-bubble-radius` | `18px` | Message bubble corner radius; lower sender-side corner is smaller. |
| `--lpt-toggle-width` | `42px` | Pill switch width. |
| `--lpt-toggle-height` | `24px` | Pill switch height and thumb size basis. |
| `--lpt-toggle-thumb` | `#ffffff` | Checked switch thumb color. |
| `--lpt-radius` | `var(--lumiverse-radius, 12px)` | Small corners, following Lumiverse. |
| `--lpt-card-radius` | `16px` | Cards, forms, notices and section corners. |
| `--lpt-icon-radius` | `20px` | Home icon tile corners. |
| `--lpt-frame-radius` | `40px` | Outer phone/window corners. |
| `--lpt-space` | `8px` | Base spacing unit; other gaps are multiples. |
| `--lpt-font` | `inherit` | Font family, inherited from Lumiverse. |
| `--lpt-font-size` | `14px` | Normal text size. |
| `--lpt-small-font-size` | `12px` | Labels, descriptions and markers. |
| `--lpt-title-size` | `18px` | App heading size. |
| `--lpt-location-size` | `24px` | Large Scene location text. |
| `--lpt-weight` | `450` | Normal text weight. |
| `--lpt-strong-weight` | `650` | Heading and emphasized text weight. |
| `--lpt-line-height` | `1.45` | Line spacing multiplier. |
| `--lpt-width` | `356px` | Preferred open-phone width, clamped to screen. |
| `--lpt-height` | `620px` | Preferred open-phone height, clamped to screen. |
| `--lpt-launcher-size` | `50px` | Square launcher size; image fills its height with contained proportions. |
| `--lpt-launcher-min-size` | `50px` | Minimum width and height, preserving the original tap target. Avoid lowering below 44px. |
| `--lpt-launcher-shadow-color` | `rgba(0, 0, 0, 0.55)` | Soft shadow color behind the PNG only. |
| `--lpt-launcher-shadow-blur` | `2px` | Image shadow softness; large values may be clipped at placement edges. |
| `--lpt-launcher-shadow-y` | `1px` | Image shadow vertical offset. |
| `--lpt-app-image-size` | `44px` | Contained Home app PNG size; sidebar has an independent 22px host style. |
| `--lpt-icon-size` | `26px` | Icon artwork size. |
| `--lpt-app-tile-size` | `64px` | Home icon tile width and height; separate from SVG artwork size. |
| `--lpt-icon-stroke-size` | `2px` | Icon line thickness. |
| `--lpt-control-size` | `38px` | Minimum button/input height. |
| `--lpt-border-size` | `1px` | Normal border thickness. |
| `--lpt-frame-border-size` | `2px` | Outer frame border thickness. |
| `--lpt-focus-size` | `2px` | Keyboard focus outline thickness and offset. |
| `--lpt-opacity-disabled` | `0.5` | Disabled control opacity. |
| `--lpt-grid-columns` | `3` | Home icon columns. |
| `--lpt-max-label-width` | `17rem` | Legacy phone settings label width; sidebar does not use this token. |
| `--lpt-shadow` | `Three-layer shadow; see styles.css` | Layered outer phone shadow and inset frame highlight; does not affect launcher. |
| `--lpt-icon-fill` | `color-mix(in srgb, var(--lpt-accent) 16%, var(--lpt-card-bg))` | Fallback tile fill; per-app tint rules take priority on Home. |
| `--lpt-transition` | `150ms cubic-bezier(0.22, 1, 0.36, 1)` | Hover, press and switch animation timing. |

The documented Lumiverse sources are --lumiverse-fill, --lumiverse-fill-subtle, text, muted text, accent, accent foreground and radius. When relative-color calculations are supported, translucent fills are composited over the dark phone/screen/card bases with final alpha 1. Elevated surfaces, borders, frame edge and bubble colors are also derived. Without that browser support, the explicit dark base colors apply. Custom CSS may deliberately override them, including making them transparent.

At screen widths of **420px or less**, defaults change to frame radius 28px, app tile size 58px, title size 17px and location size 21px; content padding and grid gaps also tighten. Preferred phone dimensions still clamp to the screen. Home now flows only added apps through the grid; no fixed seventh tile is centered.

## Stable classes

These remain the existing UI hooks, not extra screens or settings. `.lpt-root[data-open="true"]` selects the open phone. Home buttons have `data-app="Scene"` and the other exact app names. Notes sections have `data-section="people"`, `items`, `rules`, `plots` or `misc`. `[open]` selects expanded details. The frame notch and home bar are decorative pseudo-elements, not new controls.

| Class | What it is |
| --- | --- |
| `.lpt-absent` | Collapsed Not here now contact group. |
| `.lpt-actions` | Inline row of action buttons. |
| `.lpt-add` | Add contact, place or note button. |
| `.lpt-add-draft` | Add to draft button; never sends a message. |
| `.lpt-advanced` | Collapsed Advanced settings. |
| `.lpt-app-button` | A labelled Home app button. |
| `.lpt-app-icon` | Tinted Home tile with currentColor SVG artwork; each app has its own tint variable. |
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
| `.lpt-conversation` | Expandable sender conversation, with data-conversation holding the normalized recipient/sender key. |
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
| `.lpt-frame` | Outer phone frame; ::before draws the notch and ::after draws the home bar. |
| `.lpt-header` | App heading with back and close buttons. |
| `.lpt-heading` | Current app title. |
| `.lpt-help` | Short form/settings help. |
| `.lpt-helper-connection` | Saved-connection picker, shown for Helper AI. |
| `.lpt-helper-settings` | Tracker source group in the existing Settings app. |
| `.lpt-helper-source` | Main AI / Helper AI selector. |
| `.lpt-home-hint` | Persistent dismissible Home hint directing users to the Phone sidebar. |
| `.lpt-home` | Home icon grid. |
| `.lpt-icon` | SVG icon artwork. |
| `.lpt-icon-path` | Line shapes within the SVG icon. |
| `.lpt-incoming` | Left-aligned incoming message bubble. |
| `.lpt-input` | Single-line text input. |
| `.lpt-island` | Protected host-side holder of the shadow root (not custom-styled). |
| `.lpt-label` | Form input label. |
| `.lpt-launcher` | Transparent native launcher button; minimum 50px target, inside focus ring and overlaid badges. |
| `.lpt-launcher-image` | Embedded 88 x 128 PNG; contained proportions, image-only drop shadow, smooth scaling and no pointer interception. |
| `.lpt-location` | Large exact-location field in Scene. |
| `.lpt-locations` | Locations app content. |
| `.lpt-manual-tag` | Read-only escaped tag for manual copy when composer drafting is unsupported. |
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
| `.lpt-option` | Theme-colored native picker option. |
| `.lpt-outgoing` | Right-aligned outgoing message bubble. |
| `.lpt-place` | One saved Location card. |
| `.lpt-place-description` | Expanded Location description or relation. |
| `.lpt-present-list` | Names-only Here now list, displayed as small name pills. |
| `.lpt-present-name` | One name pill in Here now. |
| `.lpt-recovery-actions` | Protected sidebar row with Open phone and the single Reset appearance button. |
| `.lpt-recovery-button` | Protected Reset/Open button outside custom styling. |
| `.lpt-recovery-panel` | Protected Phone sidebar recovery entry. |
| `.lpt-recovery-status` | Protected reset/load status text. |
| `.lpt-reply` | Inline conversation reply form. |
| `.lpt-reply-input` | Unsent reply text box. |
| `.lpt-reply-status` | Draft success, unavailable or wrong-chat explanation. |
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
| `.lpt-speaker` | Original speaker element, kept for compatibility but hidden by this design. |
| `.lpt-status` | Non-blocking save status. |
| `.lpt-summary` | Expandable card or section heading. |
| `.lpt-text-body` | Actual plain text content, with line breaks preserved. |
| `.lpt-text-list` | Chronological messages within a sender conversation. |
| `.lpt-text-message` | One text with sender, body and optional established time. |
| `.lpt-text-notice` | Brief new-text notice, including when the phone is closed. |
| `.lpt-text-sender` | Saved sender name; outgoing texts also say You. |
| `.lpt-text-time` | Story-supplied text timestamp; absent if unknown. |
| `.lpt-textarea` | Multi-line edit field. |
| `.lpt-toggle` | Native checkbox styled as a pill switch; its checked behavior is unchanged. |
| `.lpt-transport` | Protected host layout wrapper (not custom-styled). |
| `.lpt-unread-badge` | Unread number on Messages, each conversation and Contact Open texts. |
| `.lpt-update-now` | Refresh tracker button in both modes; existing class kept, disabled while busy. |
| `.lpt-refresh-result` | Short refresh result: Refreshed or a safe failure category. |
| `.lpt-viewport` | Protected clipping boundary (not custom-styled). |
| `.lpt-weather` | Weather app content. |
| `.lpt-wider` | Wider location or removed-attire secondary line. |

## Copy-paste examples

Change the main accent and the Messages Home tint:

```css
.lpt-root {
  --lpt-accent: #78c6b2;
  --lpt-accent-text: #102521;
  --lpt-tint-messages: #78c6b2;
}
```

App tints are independent. Change their --lpt-tint- variables to recolor other Home icons; --lpt-accent alone controls general accents, buttons and badges. Legacy Lucide geometry remains attributed; current Home/App Store art uses the supplied PNGs. [Icon attribution](THIRD-PARTY-NOTICES.md).

Make the phone bigger:

```css
.lpt-root {
  --lpt-width: 390px;
  --lpt-height: 700px;
}
```

Give it a desktop-window look and hide the decorative hardware:

```css
.lpt-root {
  --lpt-width: 640px;
  --lpt-height: 480px;
  --lpt-frame-radius: 10px;
  --lpt-frame-border-size: 1px;
}
.lpt-frame::before,
.lpt-frame::after { display: none; }
```

Ordinary rules, @media and @supports work. Imports, linked images, font downloads, CSS escape sequences and other at-rules are rejected. An unfinished rule leaves the last working style active and shows a short error. Browsers may silently ignore an unknown property. The protected sidebar Reset stays available if your rules hide the phone.

The protected wrapper receives explicit measured placement bounds independently of the host root's height. Only those numeric bounds are emitted into an instance-scoped rule; appearance defaults stay in styles.css. The original speaker element remains hidden for compatibility. Existing recovery behavior and the zero-height-mount fix are retained. [Recovery details](docs/FIX-0.4.2.md).
