# Current app artwork (0.10.0)

The nine app images supplied by the user are embedded unchanged in src/app-icons.ts as PNG data URIs. No external files or downloads are used. Bitmap colors remain as drawn; they do not inherit currentColor. The separate flip-phone launcher PNG is unchanged.

The original Lucide geometry below remains attributed as legacy bundled code. It is no longer the displayed Home/App Store artwork. The Back/Close controls retain their original small DOM SVG drawings.

# Bundled icon attribution

The seven Home icons are from [Lucide](https://github.com/lucide-icons/lucide), commit `1980e3d59b0fa1a2aeb566d5902b25ee98204001`. Their geometry is embedded in src/icons.ts and the built frontend; no SVG files, icon package, CDN or runtime download is needed. The Phone launcher, Back and Close controls retain the extension's original small SVG drawings; no other Lucide icons are bundled.

| App | Lucide source |
| --- | --- |
| Scene | [map-pin](https://github.com/lucide-icons/lucide/blob/1980e3d59b0fa1a2aeb566d5902b25ee98204001/icons/map-pin.svg) |
| Weather | [cloud-rain](https://github.com/lucide-icons/lucide/blob/1980e3d59b0fa1a2aeb566d5902b25ee98204001/icons/cloud-rain.svg) |
| Locations | [map](https://github.com/lucide-icons/lucide/blob/1980e3d59b0fa1a2aeb566d5902b25ee98204001/icons/map.svg) |
| Notes | [file-text](https://github.com/lucide-icons/lucide/blob/1980e3d59b0fa1a2aeb566d5902b25ee98204001/icons/file-text.svg) |
| Contacts | [user](https://github.com/lucide-icons/lucide/blob/1980e3d59b0fa1a2aeb566d5902b25ee98204001/icons/user.svg) |
| Messages | [message-square](https://github.com/lucide-icons/lucide/blob/1980e3d59b0fa1a2aeb566d5902b25ee98204001/icons/message-square.svg) |
| Settings | [sliders-horizontal](https://github.com/lucide-icons/lucide/blob/1980e3d59b0fa1a2aeb566d5902b25ee98204001/icons/sliders-horizontal.svg) |

The upstream license is preserved in [licenses/LUCIDE-LICENSE.txt](licenses/LUCIDE-LICENSE.txt). SVG elements are created with the browser DOM, with no raw HTML injection. Stroke color remains currentColor, with thickness controlled by --lpt-icon-stroke-size.
