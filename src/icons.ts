/** Seven Lucide Home icons, vendored as geometry only; no icon runtime or asset requests.
 * Source commit: 1980e3d59b0fa1a2aeb566d5902b25ee98204001
 * License/attribution: THIRD-PARTY-NOTICES.md and licenses/LUCIDE-LICENSE.txt.
 */
export type IconNode = readonly [string, Readonly<Record<string, string>>];
export const HOME_ICONS: Readonly<Record<string, readonly IconNode[]>> = {
  "Scene": [
    [
      "path",
      {
        "d": "M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"
      }
    ],
    [
      "circle",
      {
        "cx": "12",
        "cy": "10",
        "r": "3"
      }
    ]
  ],
  "Weather": [
    [
      "path",
      {
        "d": "M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"
      }
    ],
    [
      "path",
      {
        "d": "M16 14v6"
      }
    ],
    [
      "path",
      {
        "d": "M8 14v6"
      }
    ],
    [
      "path",
      {
        "d": "M12 16v6"
      }
    ]
  ],
  "Locations": [
    [
      "path",
      {
        "d": "M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z"
      }
    ],
    [
      "path",
      {
        "d": "M15 5.764v15"
      }
    ],
    [
      "path",
      {
        "d": "M9 3.236v15"
      }
    ]
  ],
  "Notes": [
    [
      "path",
      {
        "d": "M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"
      }
    ],
    [
      "path",
      {
        "d": "M14 2v5a1 1 0 0 0 1 1h5"
      }
    ],
    [
      "path",
      {
        "d": "M10 9H8"
      }
    ],
    [
      "path",
      {
        "d": "M16 13H8"
      }
    ],
    [
      "path",
      {
        "d": "M16 17H8"
      }
    ]
  ],
  "Contacts": [
    [
      "path",
      {
        "d": "M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"
      }
    ],
    [
      "circle",
      {
        "cx": "12",
        "cy": "7",
        "r": "4"
      }
    ]
  ],
  "Messages": [
    [
      "path",
      {
        "d": "M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z"
      }
    ]
  ],
  "Settings": [
    [
      "path",
      {
        "d": "M10 5H3"
      }
    ],
    [
      "path",
      {
        "d": "M12 19H3"
      }
    ],
    [
      "path",
      {
        "d": "M14 3v4"
      }
    ],
    [
      "path",
      {
        "d": "M16 17v4"
      }
    ],
    [
      "path",
      {
        "d": "M21 12h-9"
      }
    ],
    [
      "path",
      {
        "d": "M21 19h-5"
      }
    ],
    [
      "path",
      {
        "d": "M21 5h-7"
      }
    ],
    [
      "path",
      {
        "d": "M8 10v4"
      }
    ],
    [
      "path",
      {
        "d": "M8 12H3"
      }
    ]
  ]
};
export const HOME_ICON_NAMES = {
  "Scene": "map-pin",
  "Weather": "cloud-rain",
  "Locations": "map",
  "Notes": "file-text",
  "Contacts": "user",
  "Messages": "message-square",
  "Settings": "sliders-horizontal"
} as const;
