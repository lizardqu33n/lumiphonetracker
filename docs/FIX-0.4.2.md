# Step 4 v0.4.2: invisible phone and sidebar recovery

## Cause in plain words

The phone was asking to fill the height of a box whose height might not be set.
Its clipping wrapper also prevented the phone from giving that box a height.
That left a phone area zero pixels tall, while the separate Reset strip could
still display. Clearing colors and custom CSS could not repair that layout.

The old browser harness gave the mount root an explicit height, hiding the bug.
A new harness placement gives only the outer host wrapper dimensions, leaving
the extension's inner mount auto-height. v0.4.1 fails that browser regression
with an observed phone viewport height of exactly 0. The corrected code passes.
This reproduces the reported kind of failure, but the user's actual host DOM
has not been inspected; additional host-specific causes remain possible.

## Fix

The extension's protected surface now has definite dimensions independent of
the host root's percentage-height behavior. Its initial fallback is 48 by 48;
the open size still comes from the existing custom CSS variables and screen
limits. Numeric measured bounds are written to a single instance-scoped CSS
rule alongside the mount, then to documented widget.setSize. No inline style
attributes, new permissions, host-private selectors or invented APIs are used.
Default appearance rules remain in src/styles.css.

Measurements use untransformed layout dimensions, with computed dimensions as
a fallback while the mount is detached. A native ResizeObserver watches the
host root, and sizing is checked after the next browser layout. This handles
delayed mounting without assuming the container already has a usable size.
Concurrent Open/Reset requests share initialization. Partially failed mounts
are cleaned up and can be recreated by Reset in the same session.

Reset clears local CSS and its pending save timer immediately, marks the phone
open, reapplies its dimensions and retries creation if needed. It does not wait
for storage. A late initial preference response is ignored after a newer reset,
so old hidden-phone CSS cannot return. Failed persistence keeps the restored
phone usable and reports the failure in the sidebar; a later restart may still
load the old CSS until a reset saves successfully.

## One recovery location

The floating Reset strip has been removed. The editor remains under Settings >
Advanced > Custom CSS, but has no second Reset button. The single Reset appearance
button sits next to Open phone in the extension's existing sidebar tab, with
its Appearance reset. confirmation there. No controls, screens or settings were
added beyond that relocation.

The sidebar is outside the phone's Shadow DOM. User styles are inserted only
inside that tree, and the phone is clipped to its protected placement bounds.
Even fixed positioning, very large dimensions and high z-index in phone CSS
cannot style or paint outside those bounds to cover the sidebar. The sidebar
does not depend on successful floating-widget creation.

## Verification and limits

Browser regression first failed against v0.4.1 (viewport height 0), then passed
after the change. The full browser suite includes auto-height and delayed mounts,
late old preference delivery, saved CSS hiding the phone, Reset with failed
storage, creation failure/retry, no floating/duplicate Reset, sidebar confirmation,
hostile custom CSS, desktop/mobile-sized/short viewports and existing UI coverage.

The tests use actual frontend/store code in Edge with a substituted Lumiverse
host. They do not verify the fix inside the user's real Lumiverse installation,
its actual placement CSS/transforms, native pop-outs or real mobile WebViews.
Provider prompt stripping and Helper AI likewise remain unverified in a real
host/connection. Step 5 has not started. See [TESTING.md](../TESTING.md).
