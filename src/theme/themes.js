// Manifold's colour themes, transcribed from the macOS app's source:
//   Sources/Manifold/UI/Palette.swift (the themes), Theme.swift, Tints.swift, Design.swift,
//   Flat.swift, Backdrop.swift, GridView.swift, and Sources/ManifoldCore/Daylight.swift.
//
// GENERATED — every colour below was resolved by compiling Palette.swift's own theme
// definitions against AppKit and reading each NSColor back in sRGB, in the light (aqua) and
// the dark (darkAqua) appearance; channels are round(c × 255), as Tints.hex does. The
// trailing comments are the Swift expressions the values came from.
//
// Colours: "#RRGGBB" when opaque, "rgba(r, g, b, a)" when not.
//   Shade.wash(l, d)  = black at alpha l in the light, white at alpha d in the dark.
//   Shade.grey(l, d)  = opaque greys NSColor(white:): channel = round(white × 255).
//   Shade(x)          = the same colour in both appearances.
//   NSColor(white:) reads back in sRGB with r = g = b = white (checked on macOS 27.2);
//   NSColor(calibratedHue:…) is Generic RGB (gamma 1.8) and does not: see calibratedHSB().
//   NSColor.systemRed/Orange/… ("system colour" below) are the system's dynamic colours, given
//   here as macOS 27.2 resolves them in each appearance; they differ on older systems (macOS 26
//   changed them) and with Increase Contrast. Only Paper and Classic use them: both themes'
//   kinds, and Paper's code.error / warning / hint, found.currentRing and dark code.highlighter.
//
// Roles keep their Swift names. A role that is nil in a theme is `null`, with what it falls
// back to in the comment. Palette.all also has claude, claudeWarm, claudeClassic and merino
// (not transcribed here); only those give chrome.bar / barFocused / barInk / menu,
// TintColors.band, diff.page or backdrop.tileEdge a value.
//
// Tints (ManifoldCore/Settings.swift, enum Tint): theme (the default — the theme's own
// accent/caret/textSelection at the top of each theme), system (NSColor.controlAccentColor /
// selectedTextBackgroundColor: the user's, not transcribable), then blue, orange, purple,
// pink, green, graphite (each theme's `tints`). A terminal's cursor and selection are its
// palette's under Tint.theme; under any other tint they are that tint's caret and
// textSelection (GhosttyRuntime.swift:61).

export const themes = {
  // MARK: Paper
  // Manifold's own: paper, greys, go.dev's code and GitHub's terminal palettes.
  paper: {
    id: "paper",
    name: "Paper", // Palette.title
    // Its own accent (Palette.accent, a TintColors): what Tint.theme uses.
    accent: { light: "#3373F2", dark: "#3373F2" },
    caret: { light: "#007AFF", dark: "#0A84FF" },
    textSelection: { light: "#CFE2FB", dark: "#264F78" },
    band: null, // nil → the accent, thin: alpha 0.16 light / 0.30 dark with the keyboard, 0.10 / 0.20 without (Tint.band(active:)) — see bandFor()
    accentText: { light: "#2D67DB", dark: "#6E97F5" }, // derived (Tints.accentText): the accent blended toward black (light) / white (dark) in 4% steps till 4.8:1 on chrome.panel
    accentFill: { light: "#316FEA", dark: "#316FEA" }, // derived (Tints.accentFill): the accent blended toward black in 4% steps till white reads on it at 4.5:1
    window: { light: "#FCFCFB", dark: "#1C1C1B" }, // Shade(terminal.light.background, terminal.dark.background): the window's ground, the bars', the gaps between tiles
    text: {
      primary: { light: "#212121", dark: "#E3E3E3" }, // .grey(0.13, 0.89)
      body: { light: "#212121", dark: "#DBDBDB" }, // .grey(0.13, 0.86)
      strong: { light: "#141414", dark: "#F7F7F7" }, // .grey(0.08, 0.97)
      secondary: { light: "#666666", dark: "#ADADAD" }, // .grey(0.40, 0.68)
      tertiary: { light: "#737373", dark: "#9E9E9E" }, // .grey(0.45, 0.62)
      readingBody: { light: "#202224", dark: "#DBDBDB" }, // Shade(NSColor(srgbRed: 0x20 / 255, green: 0x22 / 255, blue: 0x24 / 255, alpha: 1), NSColor(white: 0xdb / 255, alpha: 1))
      readingStrong: { light: "#202224", dark: "#F7F7F7" }, // Shade(NSColor(srgbRed: 0x20 / 255, green: 0x22 / 255, blue: 0x24 / 255, alpha: 1), NSColor(white: 0xf7 / 255, alpha: 1))
    },
    chrome: {
      hover: { light: "rgba(0, 0, 0, 0.055)", dark: "rgba(255, 255, 255, 0.07)" }, // .wash(0.055, 0.07)
      selected: { light: "#FFFFFF", dark: "rgba(255, 255, 255, 0.13)" }, // Shade(.white, NSColor(white: 1, alpha: 0.13))
      pressed: { light: "rgba(0, 0, 0, 0.11)", dark: "rgba(255, 255, 255, 0.14)" }, // .wash(0.11, 0.14)
      divider: { light: "rgba(0, 0, 0, 0.1)", dark: "rgba(255, 255, 255, 0.1)" }, // .wash(0.1, 0.1)
      panel: { light: "#FEFEFE", dark: "#2B2B2B" }, // .grey(0.995, 0.17)
      panelBorder: { light: "rgba(0, 0, 0, 0.12)", dark: "rgba(255, 255, 255, 0.14)" }, // .wash(0.12, 0.14)
      scrim: { light: "rgba(230, 230, 230, 0.35)", dark: "rgba(0, 0, 0, 0.3)" }, // Shade(NSColor(white: 0.9, alpha: 0.35), NSColor(white: 0, alpha: 0.3))
      cardBorder: { light: "rgba(0, 0, 0, 0.08)", dark: "rgba(255, 255, 255, 0.1)" }, // .wash(0.08, 0.1)
      handle: { light: "rgba(0, 0, 0, 0.22)", dark: "rgba(255, 255, 255, 0.25)" }, // .wash(0.22, 0.25)
      scrubberKnob: { light: "rgba(0, 0, 0, 0.14)", dark: "rgba(255, 255, 255, 0.18)" }, // .wash(0.14, 0.18)
      sheetEdge: { light: "rgba(0, 0, 0, 0.2)", dark: "rgba(255, 255, 255, 0.16)" }, // .wash(0.2, 0.16)
      sheetEdgeHovered: { light: "rgba(0, 0, 0, 0.34)", dark: "rgba(255, 255, 255, 0.34)" }, // .wash(0.34, 0.34)
      sheet: [ // { level in .grey(0.93 - CGFloat(level) * 0.045, 0.36 - CGFloat(level) * 0.05) } — levels 0…3 (the function goes on past them)
        { light: "#EDEDED", dark: "#5C5C5C" }, // level 0
        { light: "#E2E2E2", dark: "#4F4F4F" }, // level 1
        { light: "#D6D6D6", dark: "#424242" }, // level 2
        { light: "#CBCBCB", dark: "#363636" }, // level 3
      ],
      stack: { light: "#FEFEFE", dark: "#333333" }, // .grey(0.995, 0.2)
      dragPill: { light: "#FFFFFF", dark: "#4D4D4D" }, // Shade(NSColor(white: 1, alpha: 1), NSColor(white: 0.3, alpha: 1))
      linkBehind: [ // { depth in .grey(0.95 - CGFloat(depth) * 0.03, 0.16 - CGFloat(depth) * 0.015) } — depths 0…3 (the function goes on past them)
        { light: "#F2F2F2", dark: "#292929" }, // depth 0
        { light: "#EBEBEB", dark: "#252525" }, // depth 1
        { light: "#E3E3E3", dark: "#212121" }, // depth 2
        { light: "#DBDBDB", dark: "#1D1D1D" }, // depth 3
      ],
      well: { light: "rgba(0, 0, 0, 0.06)", dark: "rgba(255, 255, 255, 0.09)" }, // .wash(0.06, 0.09)
      pill: { light: "rgba(0, 0, 0, 0.07)", dark: "rgba(255, 255, 255, 0.1)" }, // .wash(0.07, 0.1)
      historyWash: { // ( from: Shade(NSColor(calibratedHue: 0.72, saturation: 0.18, brightness: 0.98, alpha: 1), NSColor(calibratedHue: 0.70, saturation: 0.35, brightness: 0.22, alpha: 1)), to: Shade(NSColor(calibratedHue: 0.07, saturation: 0.18, brightness: 1, alpha: 1), NSColor(calibratedHue: 0.06, saturation: 0.3, brightness: 0.2, alpha: 1))) — Generic RGB (calibrated), converted to sRGB
        from: { light: "#E3D8FB", dark: "#363248" },
        to: { light: "#FFEADA", dark: "#43372F" },
      },
      bar: null, // nil → chrome.panel (Theme.tileBar = bar ?? panel)
      barFocused: null, // nil → chrome.bar ?? chrome.panel, so chrome.panel (Theme.tileBarFocused)
      barInk: null, // nil → text.secondary (Theme.barInk = barInk ?? text.secondary)
      menu: null, // nil → clear: popovers and menus keep the system's frosted material (Theme.menuGround = menu ?? .clear)
    },
    status: {
      // StatusColors has these three. Design.swift's Status adds: running = the tint's accent (Tints.accent);
      // runningText = accentText (above, or the tint's); offline = text.secondary.
      done: { light: "#1A8038", dark: "#59CC73" }, // Shade(NSColor(srgbRed: 0.10, green: 0.50, blue: 0.22, alpha: 1), NSColor(srgbRed: 0.35, green: 0.80, blue: 0.45, alpha: 1))
      attention: { light: "#A86100", dark: "#F2B352" }, // Shade(NSColor(srgbRed: 0.66, green: 0.38, blue: 0.0, alpha: 1), NSColor(srgbRed: 0.95, green: 0.70, blue: 0.32, alpha: 1))
      failed: { light: "#C2261F", dark: "#FF6B61" }, // Shade(NSColor(srgbRed: 0.76, green: 0.15, blue: 0.12, alpha: 1), NSColor(srgbRed: 1.0, green: 0.42, blue: 0.38, alpha: 1))
    },
    kinds: {
      // Colours that tell kinds apart: a file's type (its symbol, DirectoryModel.swift:447–461), a link's (linked, embeds: NeighborhoodView.swift:276–277).
      git: { light: "#FF8D28", dark: "#FF9230" }, // Shade(.systemOrange) — system colour (macOS 27.2)
      swift: { light: "#FF8D28", dark: "#FF9230" }, // Shade(.systemOrange) — system colour (macOS 27.2)
      shell: { light: "#34C759", dark: "#30D158" }, // Shade(.systemGreen) — system colour (macOS 27.2)
      pdf: { light: "#FF383C", dark: "#FF4245" }, // Shade(.systemRed) — system colour (macOS 27.2)
      image: { light: "#CB30E0", dark: "#DB34F2" }, // Shade(.systemPurple) — system colour (macOS 27.2)
      data: { light: "#FFCC00", dark: "#FFD600" }, // Shade(.systemYellow) — system colour (macOS 27.2)
      patch: { light: "#34C759", dark: "#30D158" }, // Shade(.systemGreen) — system colour (macOS 27.2)
      archive: { light: "#AC7F5E", dark: "#B78A66" }, // Shade(.systemBrown) — system colour (macOS 27.2)
      media: { light: "#FF2D55", dark: "#FF375F" }, // Shade(.systemPink) — system colour (macOS 27.2)
      code: { light: "#0088FF", dark: "#0091FF" }, // Shade(.systemBlue) — system colour (macOS 27.2)
      linked: { light: "#CB30E0", dark: "#DB34F2" }, // Shade(.systemPurple) — system colour (macOS 27.2)
      embeds: { light: "#00C3D0", dark: "#00D2E0" }, // Shade(.systemTeal) — system colour (macOS 27.2)
    },
    links: { // gathered here from the roles that colour a link's faces (no group of this name in Swift)
      color: { light: "#007D9C", dark: "#50B7E0" }, // = code.link (LinkStyle.color: a link's letters, and its ⌘ glow)
      hover: { light: "rgba(0, 0, 0, 0.08)", dark: "rgba(255, 255, 255, 0.13)" }, // = code.linkHover (LinkStyle.hover: the band behind a link under the pointer)
      page: { light: "#007D9C", dark: "#50B7E0" }, // = page.link (links in the rendered Markdown page)
      capsuleFill: { light: "#FEFEFE", dark: "#2B2B2B" }, // = chrome.panel (LinkCapsule.fill)
      capsuleEdge: { light: "rgba(0, 0, 0, 0.12)", dark: "rgba(255, 255, 255, 0.14)" }, // = chrome.panelBorder (LinkCapsule.edge = EdgeColor.hairline), 0.5pt wide
      capsuleEdgeHovered: { light: "rgba(33, 33, 33, 0.3)", dark: "rgba(227, 227, 227, 0.3)" }, // text.primary.withAlphaComponent(0.3) (LinkBadge.swift:471)
      behind: [ // = chrome.linkBehind(depth): the capsule's faces behind the front one
        { light: "#F2F2F2", dark: "#292929" }, // depth 0 (not drawn: depth 0 is capsuleFill)
        { light: "#EBEBEB", dark: "#252525" }, // depth 1
        { light: "#E3E3E3", dark: "#212121" }, // depth 2
        { light: "#DBDBDB", dark: "#1D1D1D" }, // depth 3
      ],
      linked: { light: "#CB30E0", dark: "#DB34F2" }, // = kinds.linked
      embeds: { light: "#00C3D0", dark: "#00D2E0" }, // = kinds.embeds
    },
    code: {
      page: { light: "#F8F8F8", dark: "#2D2D2D" },
      text: { light: "#202224", dark: "#F0F1F2" },
      lineNumber: { light: "#999999", dark: "#848688" },
      lineHighlight: { light: "#FFF2B8", dark: "#52471F" }, // Shade(NSColor(srgbRed: 1, green: 0.95, blue: 0.72, alpha: 1), NSColor(srgbRed: 0.32, green: 0.28, blue: 0.12, alpha: 1))
      gutterText: { light: "#9E9E9E", dark: "#6B6B6B" }, // .grey(0.62, 0.42)
      use: { light: "rgba(0, 0, 0, 0.075)", dark: "rgba(255, 255, 255, 0.1)" }, // .wash(0.075, 0.1)
      match: { light: "rgba(255, 230, 128, 0.7)", dark: "rgba(128, 107, 26, 0.8)" }, // Shade(NSColor(srgbRed: 1, green: 0.9, blue: 0.5, alpha: 0.7), NSColor(srgbRed: 0.5, green: 0.42, blue: 0.1, alpha: 0.8))
      link: { light: "#007D9C", dark: "#50B7E0" }, // Shade(NSColor(srgbRed: 0, green: 0x7d / 255.0, blue: 0x9c / 255.0, alpha: 1), NSColor(srgbRed: 0x50 / 255.0, green: 0xb7 / 255.0, blue: 0xe0 / 255.0, alpha: 1))
      linkHover: { light: "rgba(0, 0, 0, 0.08)", dark: "rgba(255, 255, 255, 0.13)" }, // .wash(0.08, 0.13)
      added: { light: "#4DB866", dark: "#66CC80" }, // Shade(NSColor(srgbRed: 0.3, green: 0.72, blue: 0.4, alpha: 1), NSColor(srgbRed: 0.4, green: 0.8, blue: 0.5, alpha: 1))
      modified: { light: "#5999F2", dark: "#73A6FF" }, // Shade(NSColor(srgbRed: 0.35, green: 0.6, blue: 0.95, alpha: 1), NSColor(srgbRed: 0.45, green: 0.65, blue: 1, alpha: 1))
      deleted: { light: "#E65959", dark: "#FF7373" }, // Shade(NSColor(srgbRed: 0.9, green: 0.35, blue: 0.35, alpha: 1), NSColor(srgbRed: 1, green: 0.45, blue: 0.45, alpha: 1))
      pins: [
        { light: "rgba(51, 179, 179, 0.28)", dark: "rgba(64, 191, 191, 0.35)" }, // Shade(NSColor(srgbRed: 0.2, green: 0.7, blue: 0.7, alpha: 0.28), NSColor(srgbRed: 0.25, green: 0.75, blue: 0.75, alpha: 0.35))
        { light: "rgba(242, 179, 51, 0.32)", dark: "rgba(242, 184, 64, 0.35)" }, // Shade(NSColor(srgbRed: 0.95, green: 0.7, blue: 0.2, alpha: 0.32), NSColor(srgbRed: 0.95, green: 0.72, blue: 0.25, alpha: 0.35))
        { light: "rgba(153, 115, 242, 0.28)", dark: "rgba(166, 128, 255, 0.35)" }, // Shade(NSColor(srgbRed: 0.6, green: 0.45, blue: 0.95, alpha: 0.28), NSColor(srgbRed: 0.65, green: 0.5, blue: 1, alpha: 0.35))
        { light: "rgba(242, 102, 140, 0.26)", dark: "rgba(255, 115, 153, 0.33)" }, // Shade(NSColor(srgbRed: 0.95, green: 0.4, blue: 0.55, alpha: 0.26), NSColor(srgbRed: 1, green: 0.45, blue: 0.6, alpha: 0.33))
      ],
      error: { light: "#FF383C", dark: "#FF4245" }, // Shade(.systemRed) — system colour (macOS 27.2)
      warning: { light: "#FF8D28", dark: "#FF9230" }, // Shade(.systemOrange) — system colour (macOS 27.2)
      hint: { light: "rgba(0, 136, 255, 0.6)", dark: "rgba(0, 145, 255, 0.6)" }, // Shade(NSColor.systemBlue.withAlphaComponent(0.6)) — system colour (macOS 27.2). UNCERTAIN: withAlphaComponent freezes it as the appearance current when Palette.paper is first made has it, for both appearances after — rgba(0, 136, 255, 0.6) in both if that was the light, rgba(0, 145, 255, 0.6) in both if the dark; given here as each appearance's own
      changedOnDisk: { light: "#FFF7DB", dark: "#453D21" }, // Shade(NSColor(srgbRed: 1, green: 0.97, blue: 0.86, alpha: 1), NSColor(srgbRed: 0.27, green: 0.24, blue: 0.13, alpha: 1))
      highlighter: { light: "rgba(255, 219, 77, 0.55)", dark: "rgba(255, 214, 0, 0.32)" }, // Shade(NSColor(srgbRed: 1, green: 0.86, blue: 0.3, alpha: 0.55), NSColor.systemYellow.withAlphaComponent(0.32)) — system colour (macOS 27.2). UNCERTAIN (dark): frozen likewise — rgba(255, 214, 0, 0.32) if Palette.paper was first made in the dark (given here), rgba(255, 204, 0, 0.32) if in the light
    },
    diff: {
      added: { light: "#DBF5DE", dark: "#214229" }, // Shade(NSColor(srgbRed: 0.86, green: 0.96, blue: 0.87, alpha: 1), NSColor(srgbRed: 0.13, green: 0.26, blue: 0.16, alpha: 1))
      removed: { light: "#FCE0E0", dark: "#4D2424" }, // Shade(NSColor(srgbRed: 0.99, green: 0.88, blue: 0.88, alpha: 1), NSColor(srgbRed: 0.3, green: 0.14, blue: 0.14, alpha: 1))
      hunk: { light: "#E8F0FC", dark: "#263045" }, // Shade(NSColor(srgbRed: 0.91, green: 0.94, blue: 0.99, alpha: 1), NSColor(srgbRed: 0.15, green: 0.19, blue: 0.27, alpha: 1))
      found: { light: "#FFF299", dark: "#73661A" }, // Shade(NSColor(srgbRed: 1, green: 0.95, blue: 0.6, alpha: 1), NSColor(srgbRed: 0.45, green: 0.4, blue: 0.1, alpha: 1))
      current: { light: "#FFD94D", dark: "#B38C1A" }, // Shade(NSColor(srgbRed: 1, green: 0.85, blue: 0.3, alpha: 1), NSColor(srgbRed: 0.7, green: 0.55, blue: 0.1, alpha: 1))
      page: null, // nil → window (Theme.diffPage = diff.page ?? window)
    },
    found: {
      current: { light: "rgba(255, 158, 38, 0.55)", dark: "rgba(217, 128, 26, 0.6)" }, // Shade(NSColor(srgbRed: 1, green: 0.62, blue: 0.15, alpha: 0.55), NSColor(srgbRed: 0.85, green: 0.5, blue: 0.1, alpha: 0.6))
      currentRing: { light: "#FF8D28", dark: "#FF9230" }, // Shade(.systemOrange) — system colour (macOS 27.2)
      pdf: { light: "rgba(255, 214, 0, 0.8)", dark: "rgba(255, 214, 0, 0.8)" }, // Shade(NSColor(srgbRed: 1, green: 0.84, blue: 0, alpha: 0.8))
      pdfCurrent: { light: "rgba(51, 143, 255, 0.7)", dark: "rgba(51, 143, 255, 0.7)" }, // Shade(NSColor(srgbRed: 0.2, green: 0.56, blue: 1, alpha: 0.7))
    },
    chart: {
      one: { light: "#2A78D6", dark: "#3987E5" },
      two: { light: "#EB6834", dark: "#D95926" },
      three: { light: "#1BAF7A", dark: "#199E70" },
      track: { light: "rgba(0, 0, 0, 0.07)", dark: "rgba(255, 255, 255, 0.09)" }, // .wash(0.07, 0.09)
      surface: { light: "rgba(0, 0, 0, 0.025)", dark: "rgba(255, 255, 255, 0.035)" }, // .wash(0.025, 0.035)
      grid: { light: "rgba(0, 0, 0, 0.07)", dark: "rgba(255, 255, 255, 0.08)" }, // .wash(0.07, 0.08)
    },
    page: {
      // The preview's page (MarkdownPage), exported to CSS as --page-<role> (kebab-case).
      background: { light: "#FFFFFF", dark: "#202224" },
      text: { light: "#202224", dark: "#DBDBDB" },
      strong: { light: "#202224", dark: "#F7F7F7" },
      link: { light: "#007D9C", dark: "#50B7E0" },
      code: { light: "#F8F8F8", dark: "#2D2D2D" },
      codeText: { light: "#202224", dark: "#F0F1F2" },
      copy: { light: "#FFFFFF", dark: "#383838" },
      copyEdge: { light: "#E1E4E8", dark: "#4A4A4A" },
      copyText: { light: "#6E7781", dark: "#A8A8A8" },
      copyHoverEdge: { light: "#C8CCD1", dark: "#5A5A5A" },
      copyHoverText: { light: "#202224", dark: "#F0F1F2" },
      copyDone: { light: "#1A7F37", dark: "#56D364" },
      quote: { light: "#57606A", dark: "#9D9D98" },
      quoteRule: { light: "#D8DBE0", dark: "#444441" },
      rule: { light: "#E1E4E8", dark: "#3A3A38" },
      tableHead: { light: "#F6F6F4", dark: "#262625" },
      tableStripe: { light: "#F9F9F7", dark: "#212120" },
      struck: { light: "#6E7781", dark: "#8B8B86" },
      missing: { light: "#A40E26", dark: "#FF7B72" },
      diagramError: { light: "#A40E26", dark: "#A40E26" },
      selection: { light: "#CFE2FB", dark: "#264F78" },
      failed: { light: "#D6453D", dark: "#D6453D" },
      running: { light: "#2F8FDD", dark: "#2F8FDD" },
      attention: { light: "#D68A1D", dark: "#D68A1D" },
      linksUnderlined: false,
    },
    terminal: { // the sixteen only; 16–255 are xterm's cube and greys (TerminalPalette.xtermExtended)
      light: {
        background: "#fcfcfb",
        foreground: "#24292f",
        cursor: "#007aff",
        cursorText: null, // nil → Ghostty's choice
        selection: "#cfe2fb", // selectionBackground
        selectionForeground: "#1f2328",
        ansi: [
          "#24292f", "#cf222e", "#116329", "#4d2d00", "#0969da", "#8250df", "#1b7c83", "#6e7781",
          "#57606a", "#a40e26", "#1a7f37", "#633c01", "#218bff", "#a475f9", "#3192aa", "#8c959f",
        ],
      },
      dark: {
        background: "#1c1c1b",
        foreground: "#e3e3df",
        cursor: "#0a84ff",
        cursorText: null, // nil → Ghostty's choice
        selection: "#264f78", // selectionBackground
        selectionForeground: "#f0f0ee",
        ansi: [
          "#484f58", "#ff7b72", "#3fb950", "#d29922", "#58a6ff", "#bc8cff", "#39c5cf", "#b1bac4",
          "#6e7681", "#ffa198", "#56d364", "#e3b341", "#79c0ff", "#d2a8ff", "#56d4dd", "#f0f6fc",
        ],
      },
    },
    backdrop: { // stops are (hue, saturation, brightness) for NSColor(calibratedHue:…) — Generic RGB, see calibratedHSB()
      light: {
        stops: [[0.72, 0.28, 0.97], [0.95, 0.24, 0.99], [0.07, 0.28, 1], [0.12, 0.14, 1]],
        pool: { saturation: 0.18, brightness: 1 },
        tintPool: { saturation: 0.32, brightness: 1 }, // saturation × the tint accent's own (sRGB HSB) saturation
        stopsSRGB: ["#D3C2F9", "#FECDDB", "#FFDDC4", "#FFF7E2"], // derived: the stops in sRGB, unturned (turn = 0) and unlit (neutral cast)
      },
      dark: {
        stops: [[0.7, 0.4, 0.26], [0.92, 0.35, 0.24], [0.06, 0.35, 0.22], [0.08, 0.15, 0.12]],
        pool: { saturation: 0.5, brightness: 0.4 },
        tintPool: { saturation: 0.6, brightness: 0.45 }, // saturation × the tint accent's own (sRGB HSB) saturation
        stopsSRGB: ["#3C3654", "#4F3641", "#493930", "#292623"], // derived: the stops in sRGB, unturned (turn = 0) and unlit (neutral cast)
      },
      tileShadow: { color: "#000000", opacity: 0.1 }, // the default: (.black, 0.10) — in the light only (opacity 0 in the dark); radius 10, 4pt down (Elevation.tile)
      tileEdge: null, // nil → no hairline round a tile: the shadow alone, by day
    },
    tints: {
      blue: {
        accent: { light: "#3373F2", dark: "#3373F2" },
        caret: { light: "#007AFF", dark: "#0A84FF" },
        textSelection: { light: "#CFE2FB", dark: "#264F78" },
        band: null, // nil → the accent, thin: alpha 0.16 light / 0.30 dark with the keyboard, 0.10 / 0.20 without (Tint.band(active:)) — see bandFor()
        accentText: { light: "#2D67DB", dark: "#6E97F5" }, // derived (Tints.accentText): the accent blended toward black (light) / white (dark) in 4% steps till 4.8:1 on chrome.panel
        accentFill: { light: "#316FEA", dark: "#316FEA" }, // derived (Tints.accentFill): the accent blended toward black in 4% steps till white reads on it at 4.5:1
      },
      orange: {
        accent: { light: "#E36A00", dark: "#FC7E0F" },
        caret: { light: "#EB7300", dark: "#FF8A26" },
        textSelection: { light: "#FDE1C4", dark: "#6E3D12" },
        band: null, // nil → the accent, thin: alpha 0.16 light / 0.30 dark with the keyboard, 0.10 / 0.20 without (Tint.band(active:)) — see bandFor()
        accentText: { light: "#B65401", dark: "#FC7E0F" }, // derived (Tints.accentText): the accent blended toward black (light) / white (dark) in 4% steps till 4.8:1 on chrome.panel
        accentFill: { light: "#BE5801", dark: "#B95B08" }, // derived (Tints.accentFill): the accent blended toward black in 4% steps till white reads on it at 4.5:1
      },
      purple: {
        accent: { light: "#9550D6", dark: "#BF7AF0" },
        caret: { light: "#9550D6", dark: "#BF7AF0" }, // no caret given → the accent (TintColors.init: caret ?? accent)
        textSelection: { light: "#EADCF8", dark: "#4B2F68" },
        band: null, // nil → the accent, thin: alpha 0.16 light / 0.30 dark with the keyboard, 0.10 / 0.20 without (Tint.band(active:)) — see bandFor()
        accentText: { light: "#904DCF", dark: "#BF7AF0" }, // derived (Tints.accentText): the accent blended toward black (light) / white (dark) in 4% steps till 4.8:1 on chrome.panel
        accentFill: { light: "#9550D6", dark: "#925CB9" }, // derived (Tints.accentFill): the accent blended toward black in 4% steps till white reads on it at 4.5:1
      },
      pink: {
        accent: { light: "#DC3F78", dark: "#FF6B9C" },
        caret: { light: "#DC3F78", dark: "#FF6B9C" }, // no caret given → the accent (TintColors.init: caret ?? accent)
        textSelection: { light: "#FADAE6", dark: "#6B2B43" },
        band: null, // nil → the accent, thin: alpha 0.16 light / 0.30 dark with the keyboard, 0.10 / 0.20 without (Tint.band(active:)) — see bandFor()
        accentText: { light: "#C7386C", dark: "#FF6B9C" }, // derived (Tints.accentText): the accent blended toward black (light) / white (dark) in 4% steps till 4.8:1 on chrome.panel
        accentFill: { light: "#CE3A70", dark: "#BB4D71" }, // derived (Tints.accentFill): the accent blended toward black in 4% steps till white reads on it at 4.5:1
      },
      green: {
        accent: { light: "#2A9A4A", dark: "#3FCB68" },
        caret: { light: "#2A9A4A", dark: "#3FCB68" }, // no caret given → the accent (TintColors.init: caret ?? accent)
        textSelection: { light: "#D5EFDC", dark: "#25512F" },
        band: null, // nil → the accent, thin: alpha 0.16 light / 0.30 dark with the keyboard, 0.10 / 0.20 without (Tint.band(active:)) — see bandFor()
        accentText: { light: "#21803C", dark: "#3FCB68" }, // derived (Tints.accentText): the accent blended toward black (light) / white (dark) in 4% steps till 4.8:1 on chrome.panel
        accentFill: { light: "#23853F", dark: "#268642" }, // derived (Tints.accentFill): the accent blended toward black in 4% steps till white reads on it at 4.5:1
      },
      graphite: {
        accent: { light: "#6E6E73", dark: "#98989D" },
        caret: { light: "#48484D", dark: "#C7C7CC" },
        textSelection: { light: "#E1E1E4", dark: "#4A4A4E" },
        band: null, // nil → the accent, thin: alpha 0.16 light / 0.30 dark with the keyboard, 0.10 / 0.20 without (Tint.band(active:)) — see bandFor()
        accentText: { light: "#6E6E73", dark: "#98989D" }, // derived (Tints.accentText): the accent blended toward black (light) / white (dark) in 4% steps till 4.8:1 on chrome.panel
        accentFill: { light: "#6E6E73", dark: "#747478" }, // derived (Tints.accentFill): the accent blended toward black in 4% steps till white reads on it at 4.5:1
      },
    },
  },

  // MARK: Newsprint
  // Ink on newsprint. warm(v) = NSColor(srgbRed: v, green: v, blue: max(0, v - 0.008)); ink(l, d) = Shade.hex(l, d).
  // Locals: red = ink(0xB3402E, 0xE07258); green = ink(0x56763F, 0x84A672); ochre = ink(0x7D6316, 0xC2A24A); blue = ink(0x4F6D94, 0x7894BF); plum = ink(0x85607F, 0xA986A1); teal = ink(0x4D7F7C, 0x6FA39C)
  newsprint: {
    id: "newsprint",
    name: "Newsprint", // Palette.title
    // Its own accent (Palette.accent, a TintColors): what Tint.theme uses.
    accent: { light: "#B3402E", dark: "#E07258" }, // = red
    caret: { light: "#B3402E", dark: "#DB6650" },
    textSelection: { light: "#DDDDD6", dark: "#3A3A36" },
    band: null, // nil → the accent, thin: alpha 0.16 light / 0.30 dark with the keyboard, 0.10 / 0.20 without (Tint.band(active:)) — see bandFor()
    accentText: { light: "#B3402E", dark: "#E17860" }, // derived (Tints.accentText): the accent blended toward black (light) / white (dark) in 4% steps till 4.8:1 on chrome.panel
    accentFill: { light: "#B3402E", dark: "#B45A45" }, // derived (Tints.accentFill): the accent blended toward black in 4% steps till white reads on it at 4.5:1
    window: { light: "#F2F2F0", dark: "#1F1F1D" }, // Shade(terminal.light.background, terminal.dark.background): the window's ground, the bars', the gaps between tiles
    text: {
      primary: { light: "#333331", dark: "#D6D6D0" },
      body: { light: "#333331", dark: "#D0D0CA" },
      strong: { light: "#1F1F1D", dark: "#EFEFE9" },
      secondary: { light: "#66665F", dark: "#A3A39C" },
      tertiary: { light: "#707069", dark: "#96968F" },
      readingBody: { light: "#333331", dark: "#D6D6D0" },
      readingStrong: { light: "#1F1F1D", dark: "#EFEFE9" },
    },
    chrome: {
      hover: { light: "rgba(0, 0, 0, 0.055)", dark: "rgba(255, 255, 255, 0.07)" }, // .wash(0.055, 0.07)
      selected: { light: "#FBFBF9", dark: "rgba(255, 255, 255, 0.12)" }, // Shade(warm(0.985), NSColor(white: 1, alpha: 0.12))
      pressed: { light: "rgba(0, 0, 0, 0.11)", dark: "rgba(255, 255, 255, 0.14)" }, // .wash(0.11, 0.14)
      divider: { light: "rgba(0, 0, 0, 0.1)", dark: "rgba(255, 255, 255, 0.1)" }, // .wash(0.1, 0.1)
      panel: { light: "#F7F7F5", dark: "#2A2A27" },
      panelBorder: { light: "rgba(0, 0, 0, 0.12)", dark: "rgba(255, 255, 255, 0.14)" }, // .wash(0.12, 0.14)
      scrim: { light: "rgba(230, 230, 227, 0.35)", dark: "rgba(0, 0, 0, 0.3)" }, // Shade(NSColor(srgbRed: 0.9, green: 0.9, blue: 0.89, alpha: 0.35), NSColor(white: 0, alpha: 0.3))
      cardBorder: { light: "rgba(0, 0, 0, 0.08)", dark: "rgba(255, 255, 255, 0.1)" }, // .wash(0.08, 0.1)
      handle: { light: "rgba(0, 0, 0, 0.22)", dark: "rgba(255, 255, 255, 0.25)" }, // .wash(0.22, 0.25)
      scrubberKnob: { light: "rgba(0, 0, 0, 0.14)", dark: "rgba(255, 255, 255, 0.18)" }, // .wash(0.14, 0.18)
      sheetEdge: { light: "rgba(0, 0, 0, 0.2)", dark: "rgba(255, 255, 255, 0.16)" }, // .wash(0.2, 0.16)
      sheetEdgeHovered: { light: "rgba(0, 0, 0, 0.34)", dark: "rgba(255, 255, 255, 0.34)" }, // .wash(0.34, 0.34)
      sheet: [ // { level in Shade(warm(0.92 - CGFloat(level) * 0.045), warm(0.33 - CGFloat(level) * 0.045)) } — levels 0…3 (the function goes on past them)
        { light: "#EBEBE9", dark: "#545452" }, // level 0
        { light: "#DFDFDD", dark: "#494947" }, // level 1
        { light: "#D4D4D2", dark: "#3D3D3B" }, // level 2
        { light: "#C8C8C6", dark: "#323230" }, // level 3
      ],
      stack: { light: "#F7F7F5", dark: "#2E2E2B" },
      dragPill: { light: "#FBFBF9", dark: "#4A4A46" },
      linkBehind: [ // { depth in Shade(warm(0.94 - CGFloat(depth) * 0.03), warm(0.15 - CGFloat(depth) * 0.015)) } — depths 0…3 (the function goes on past them)
        { light: "#F0F0EE", dark: "#262624" }, // depth 0
        { light: "#E8E8E6", dark: "#222220" }, // depth 1
        { light: "#E0E0DE", dark: "#1F1F1D" }, // depth 2
        { light: "#D9D9D7", dark: "#1B1B19" }, // depth 3
      ],
      well: { light: "rgba(0, 0, 0, 0.06)", dark: "rgba(255, 255, 255, 0.09)" }, // .wash(0.06, 0.09)
      pill: { light: "rgba(0, 0, 0, 0.07)", dark: "rgba(255, 255, 255, 0.1)" }, // .wash(0.07, 0.1)
      historyWash: {
        from: { light: "#EDEDE8", dark: "#2A2A27" },
        to: { light: "#E8E2D6", dark: "#302B25" },
      },
      bar: null, // nil → chrome.panel (Theme.tileBar = bar ?? panel)
      barFocused: null, // nil → chrome.bar ?? chrome.panel, so chrome.panel (Theme.tileBarFocused)
      barInk: null, // nil → text.secondary (Theme.barInk = barInk ?? text.secondary)
      menu: null, // nil → clear: popovers and menus keep the system's frosted material (Theme.menuGround = menu ?? .clear)
    },
    status: {
      // StatusColors has these three. Design.swift's Status adds: running = the tint's accent (Tints.accent);
      // runningText = accentText (above, or the tint's); offline = text.secondary.
      done: { light: "#56763F", dark: "#84A672" }, // = green
      attention: { light: "#7D6316", dark: "#C2A24A" }, // = ochre
      failed: { light: "#B3402E", dark: "#E07258" }, // = red
    },
    kinds: {
      // Colours that tell kinds apart: a file's type (its symbol, DirectoryModel.swift:447–461), a link's (linked, embeds: NeighborhoodView.swift:276–277).
      git: { light: "#B8662A", dark: "#D98A4E" },
      swift: { light: "#B8662A", dark: "#D98A4E" },
      shell: { light: "#56763F", dark: "#84A672" }, // = green
      pdf: { light: "#B3402E", dark: "#E07258" }, // = red
      image: { light: "#85607F", dark: "#A986A1" }, // = plum
      data: { light: "#7D6316", dark: "#C2A24A" }, // = ochre
      patch: { light: "#56763F", dark: "#84A672" }, // = green
      archive: { light: "#7A6A55", dark: "#A8977E" },
      media: { light: "#A84A6A", dark: "#C77894" },
      code: { light: "#4F6D94", dark: "#7894BF" }, // = blue
      linked: { light: "#85607F", dark: "#A986A1" }, // = plum
      embeds: { light: "#4D7F7C", dark: "#6FA39C" }, // = teal
    },
    links: { // gathered here from the roles that colour a link's faces (no group of this name in Swift)
      color: { light: "#4F6D94", dark: "#7894BF" }, // = code.link (LinkStyle.color: a link's letters, and its ⌘ glow)
      hover: { light: "rgba(0, 0, 0, 0.08)", dark: "rgba(255, 255, 255, 0.13)" }, // = code.linkHover (LinkStyle.hover: the band behind a link under the pointer)
      page: { light: "#4F6D94", dark: "#7894BF" }, // = page.link (links in the rendered Markdown page)
      capsuleFill: { light: "#F7F7F5", dark: "#2A2A27" }, // = chrome.panel (LinkCapsule.fill)
      capsuleEdge: { light: "rgba(0, 0, 0, 0.12)", dark: "rgba(255, 255, 255, 0.14)" }, // = chrome.panelBorder (LinkCapsule.edge = EdgeColor.hairline), 0.5pt wide
      capsuleEdgeHovered: { light: "rgba(51, 51, 49, 0.3)", dark: "rgba(214, 214, 208, 0.3)" }, // text.primary.withAlphaComponent(0.3) (LinkBadge.swift:471)
      behind: [ // = chrome.linkBehind(depth): the capsule's faces behind the front one
        { light: "#F0F0EE", dark: "#262624" }, // depth 0 (not drawn: depth 0 is capsuleFill)
        { light: "#E8E8E6", dark: "#222220" }, // depth 1
        { light: "#E0E0DE", dark: "#1F1F1D" }, // depth 2
        { light: "#D9D9D7", dark: "#1B1B19" }, // depth 3
      ],
      linked: { light: "#85607F", dark: "#A986A1" }, // = kinds.linked
      embeds: { light: "#4D7F7C", dark: "#6FA39C" }, // = kinds.embeds
    },
    code: {
      page: { light: "#EEEEEA", dark: "#2A2A27" },
      text: { light: "#333331", dark: "#DEDED8" },
      lineNumber: { light: "#9A9A93", dark: "#7A7A73" },
      lineHighlight: { light: "#ECE9DA", dark: "#33322A" },
      gutterText: { light: "#9A9A93", dark: "#6E6E68" },
      use: { light: "rgba(0, 0, 0, 0.075)", dark: "rgba(255, 255, 255, 0.1)" }, // .wash(0.075, 0.1)
      match: { light: "rgba(224, 204, 122, 0.6)", dark: "rgba(140, 120, 51, 0.7)" }, // Shade(NSColor(srgbRed: 0.88, green: 0.8, blue: 0.48, alpha: 0.6), NSColor(srgbRed: 0.55, green: 0.47, blue: 0.2, alpha: 0.7))
      link: { light: "#4F6D94", dark: "#7894BF" }, // = blue
      linkHover: { light: "rgba(0, 0, 0, 0.08)", dark: "rgba(255, 255, 255, 0.13)" }, // .wash(0.08, 0.13)
      added: { light: "#5D7F52", dark: "#84A672" },
      modified: { light: "#4F6D94", dark: "#7894BF" }, // = blue
      deleted: { light: "#B3402E", dark: "#E07258" },
      pins: [
        { light: "rgba(77, 128, 125, 0.26)", dark: "rgba(112, 163, 156, 0.33)" }, // Shade(NSColor(srgbRed: 0.30, green: 0.50, blue: 0.49, alpha: 0.26), NSColor(srgbRed: 0.44, green: 0.64, blue: 0.61, alpha: 0.33))
        { light: "rgba(153, 120, 33, 0.28)", dark: "rgba(194, 163, 74, 0.33)" }, // Shade(NSColor(srgbRed: 0.60, green: 0.47, blue: 0.13, alpha: 0.28), NSColor(srgbRed: 0.76, green: 0.64, blue: 0.29, alpha: 0.33))
        { light: "rgba(133, 97, 128, 0.26)", dark: "rgba(168, 135, 161, 0.33)" }, // Shade(NSColor(srgbRed: 0.52, green: 0.38, blue: 0.50, alpha: 0.26), NSColor(srgbRed: 0.66, green: 0.53, blue: 0.63, alpha: 0.33))
        { light: "rgba(179, 64, 46, 0.22)", dark: "rgba(224, 115, 89, 0.3)" }, // Shade(NSColor(srgbRed: 0.70, green: 0.25, blue: 0.18, alpha: 0.22), NSColor(srgbRed: 0.88, green: 0.45, blue: 0.35, alpha: 0.3))
      ],
      error: { light: "#B3402E", dark: "#E07258" }, // = red
      warning: { light: "#7D6316", dark: "#C2A24A" }, // = ochre
      hint: { light: "rgba(79, 109, 148, 0.6)", dark: "rgba(120, 148, 191, 0.6)" }, // Shade(Theme.hex(0x4F6D94).withAlphaComponent(0.6), Theme.hex(0x7894BF).withAlphaComponent(0.6))
      changedOnDisk: { light: "#EEE8D5", dark: "#37332A" },
      highlighter: { light: "rgba(232, 209, 115, 0.5)", dark: "rgba(153, 128, 51, 0.45)" }, // Shade(NSColor(srgbRed: 0.91, green: 0.82, blue: 0.45, alpha: 0.5), NSColor(srgbRed: 0.6, green: 0.5, blue: 0.2, alpha: 0.45))
    },
    diff: {
      added: { light: "#DCE4D6", dark: "#2C3A28" },
      removed: { light: "#EFDAD5", dark: "#45292A" },
      hunk: { light: "#DDE2E9", dark: "#2B3340" },
      found: { light: "#EDE3BA", dark: "#4A4227" },
      current: { light: "#E2CE86", dark: "#6E5D25" },
      page: null, // nil → window (Theme.diffPage = diff.page ?? window)
    },
    found: {
      current: { light: "rgba(214, 148, 77, 0.5)", dark: "rgba(184, 115, 51, 0.55)" }, // Shade(NSColor(srgbRed: 0.84, green: 0.58, blue: 0.3, alpha: 0.5), NSColor(srgbRed: 0.72, green: 0.45, blue: 0.2, alpha: 0.55))
      currentRing: { light: "#B3402E", dark: "#E07258" }, // = red
      pdf: { light: "rgba(255, 214, 0, 0.8)", dark: "rgba(255, 214, 0, 0.8)" }, // Shade(NSColor(srgbRed: 1, green: 0.84, blue: 0, alpha: 0.8))
      pdfCurrent: { light: "rgba(51, 143, 255, 0.7)", dark: "rgba(51, 143, 255, 0.7)" }, // Shade(NSColor(srgbRed: 0.2, green: 0.56, blue: 1, alpha: 0.7))
    },
    chart: {
      one: { light: "#4F6D94", dark: "#7894BF" }, // = blue
      two: { light: "#B3402E", dark: "#DB6650" },
      three: { light: "#4D7F7C", dark: "#6FA39C" }, // = teal
      track: { light: "rgba(0, 0, 0, 0.07)", dark: "rgba(255, 255, 255, 0.09)" }, // .wash(0.07, 0.09)
      surface: { light: "rgba(0, 0, 0, 0.025)", dark: "rgba(255, 255, 255, 0.035)" }, // .wash(0.025, 0.035)
      grid: { light: "rgba(0, 0, 0, 0.07)", dark: "rgba(255, 255, 255, 0.08)" }, // .wash(0.07, 0.08)
    },
    page: {
      // The preview's page (MarkdownPage), exported to CSS as --page-<role> (kebab-case).
      background: { light: "#F7F7F4", dark: "#1F1F1D" },
      text: { light: "#333331", dark: "#D6D6D0" },
      strong: { light: "#1F1F1D", dark: "#EFEFE9" },
      link: { light: "#4F6D94", dark: "#7894BF" }, // = blue
      code: { light: "#EAEAE6", dark: "#2A2A27" },
      codeText: { light: "#333331", dark: "#DEDED8" },
      copy: { light: "#F7F7F4", dark: "#333330" },
      copyEdge: { light: "#D6D6CF", dark: "#48483F" },
      copyText: { light: "#707069", dark: "#A3A39C" },
      copyHoverEdge: { light: "#BDBDB5", dark: "#5A5A54" },
      copyHoverText: { light: "#333331", dark: "#EFEFE9" },
      copyDone: { light: "#56763F", dark: "#84A672" }, // = green
      quote: { light: "#66665F", dark: "#A3A39C" },
      quoteRule: { light: "#D6D6CF", dark: "#46463F" },
      rule: { light: "#DDDDD6", dark: "#3A3A36" },
      tableHead: { light: "#ECECE7", dark: "#282826" },
      tableStripe: { light: "#F0F0EC", dark: "#232321" },
      struck: { light: "#85857F", dark: "#8B8B85" },
      missing: { light: "#B3402E", dark: "#E07258" }, // = red
      diagramError: { light: "#B3402E", dark: "#E07258" }, // = red
      selection: { light: "#DDDDD6", dark: "#3A3A36" },
      failed: { light: "#B3402E", dark: "#E07258" }, // = red
      running: { light: "#4F6D94", dark: "#7894BF" }, // = blue
      attention: { light: "#7D6316", dark: "#C2A24A" }, // = ochre
      linksUnderlined: false,
    },
    terminal: { // the sixteen only; 16–255 are made from these as Ghostty's palette-generate does (TerminalPalette.generated, in CIELAB)
      light: {
        background: "#f2f2f0",
        foreground: "#333331",
        cursor: "#b3402e",
        cursorText: "#f2f2f0",
        selection: "#ddddd6", // selectionBackground
        selectionForeground: "#333331",
        ansi: [
          "#333331", "#b3402e", "#5d7f52", "#987921", "#4f6d94", "#85607f", "#4d7f7c", "#d5d5d0",
          "#78786f", "#cc4f3b", "#6f9562", "#af8e2c", "#6182ab", "#9b7494", "#5e9692", "#fdfdfb",
        ],
      },
      dark: {
        background: "#1f1f1d",
        foreground: "#d6d6d0",
        cursor: "#db6650",
        cursorText: "#1f1f1d",
        selection: "#3a3a36", // selectionBackground
        selectionForeground: "#ecece6",
        ansi: [
          "#4a4a46", "#db6650", "#84a672", "#c2a24a", "#7894bf", "#a986a1", "#6fa39c", "#c9c9c2",
          "#6e6e68", "#e8806a", "#9dbe8a", "#d6b862", "#93acd3", "#c09fb8", "#89bab3", "#f2f2f0",
        ],
      },
    },
    backdrop: { // stops are (hue, saturation, brightness) for NSColor(calibratedHue:…) — Generic RGB, see calibratedHSB()
      light: {
        stops: [[0.11, 0.11, 0.89], [0.07, 0.13, 0.85], [0.12, 0.1, 0.8], [0.14, 0.05, 0.92]],
        pool: { saturation: 0.1, brightness: 0.96 },
        tintPool: { saturation: 0.12, brightness: 0.96 }, // saturation × the tint accent's own (sRGB HSB) saturation
        stopsSRGB: ["#E9E1D4", "#E0D2C8", "#D6D0C4", "#EFEDE5"], // derived: the stops in sRGB, unturned (turn = 0) and unlit (neutral cast)
      },
      dark: {
        stops: [[0.1, 0.1, 0.19], [0.06, 0.13, 0.18], [0.11, 0.1, 0.15], [0.13, 0.05, 0.11]],
        pool: { saturation: 0.16, brightness: 0.25 },
        tintPool: { saturation: 0.22, brightness: 0.31 }, // saturation × the tint accent's own (sRGB HSB) saturation
        stopsSRGB: ["#3F3D39", "#3C3835", "#33312E", "#252523"], // derived: the stops in sRGB, unturned (turn = 0) and unlit (neutral cast)
      },
      tileShadow: { color: "#5A4630", opacity: 0.08 }, // (Theme.hex(0x5A4630), 0.08) — in the light only (opacity 0 in the dark); radius 10, 4pt down (Elevation.tile)
      tileEdge: null, // nil → no hairline round a tile: the shadow alone, by day
    },
    tints: {
      blue: {
        accent: { light: "#4F6D94", dark: "#7894BF" }, // = blue
        caret: { light: "#4F6D94", dark: "#7894BF" }, // no caret given → the accent (TintColors.init: caret ?? accent)
        textSelection: { light: "#D5DCE6", dark: "#343F4E" },
        band: null, // nil → the accent, thin: alpha 0.16 light / 0.30 dark with the keyboard, 0.10 / 0.20 without (Tint.band(active:)) — see bandFor()
        accentText: { light: "#4F6D94", dark: "#7E99C2" }, // derived (Tints.accentText): the accent blended toward black (light) / white (dark) in 4% steps till 4.8:1 on chrome.panel
        accentFill: { light: "#4F6D94", dark: "#5F7699" }, // derived (Tints.accentFill): the accent blended toward black in 4% steps till white reads on it at 4.5:1
      },
      orange: {
        accent: { light: "#B8662A", dark: "#D98A4E" },
        caret: { light: "#B8662A", dark: "#D98A4E" }, // no caret given → the accent (TintColors.init: caret ?? accent)
        textSelection: { light: "#EBDDCD", dark: "#4A3A2C" },
        band: null, // nil → the accent, thin: alpha 0.16 light / 0.30 dark with the keyboard, 0.10 / 0.20 without (Tint.band(active:)) — see bandFor()
        accentText: { light: "#A05823", dark: "#D98A4E" }, // derived (Tints.accentText): the accent blended toward black (light) / white (dark) in 4% steps till 4.8:1 on chrome.panel
        accentFill: { light: "#AC5F27", dark: "#9F6437" }, // derived (Tints.accentFill): the accent blended toward black in 4% steps till white reads on it at 4.5:1
      },
      purple: {
        accent: { light: "#85607F", dark: "#A986A1" }, // = plum
        caret: { light: "#85607F", dark: "#A986A1" }, // no caret given → the accent (TintColors.init: caret ?? accent)
        textSelection: { light: "#E3D9E1", dark: "#42363F" },
        band: null, // nil → the accent, thin: alpha 0.16 light / 0.30 dark with the keyboard, 0.10 / 0.20 without (Tint.band(active:)) — see bandFor()
        accentText: { light: "#85607F", dark: "#AD8BA5" }, // derived (Tints.accentText): the accent blended toward black (light) / white (dark) in 4% steps till 4.8:1 on chrome.panel
        accentFill: { light: "#85607F", dark: "#876A80" }, // derived (Tints.accentFill): the accent blended toward black in 4% steps till white reads on it at 4.5:1
      },
      pink: {
        accent: { light: "#A84A6A", dark: "#C77894" },
        caret: { light: "#A84A6A", dark: "#C77894" }, // no caret given → the accent (TintColors.init: caret ?? accent)
        textSelection: { light: "#EBD7DE", dark: "#4A3139" },
        band: null, // nil → the accent, thin: alpha 0.16 light / 0.30 dark with the keyboard, 0.10 / 0.20 without (Tint.band(active:)) — see bandFor()
        accentText: { light: "#A84A6A", dark: "#CC849D" }, // derived (Tints.accentText): the accent blended toward black (light) / white (dark) in 4% steps till 4.8:1 on chrome.panel
        accentFill: { light: "#A84A6A", dark: "#9F5F76" }, // derived (Tints.accentFill): the accent blended toward black in 4% steps till white reads on it at 4.5:1
      },
      green: {
        accent: { light: "#56763F", dark: "#84A672" }, // = green
        caret: { light: "#56763F", dark: "#84A672" }, // no caret given → the accent (TintColors.init: caret ?? accent)
        textSelection: { light: "#D7E0D1", dark: "#34402F" },
        band: null, // nil → the accent, thin: alpha 0.16 light / 0.30 dark with the keyboard, 0.10 / 0.20 without (Tint.band(active:)) — see bandFor()
        accentText: { light: "#56763F", dark: "#84A672" }, // derived (Tints.accentText): the accent blended toward black (light) / white (dark) in 4% steps till 4.8:1 on chrome.panel
        accentFill: { light: "#56763F", dark: "#5F7952" }, // derived (Tints.accentFill): the accent blended toward black in 4% steps till white reads on it at 4.5:1
      },
      graphite: {
        accent: { light: "#66665F", dark: "#A3A39C" },
        caret: { light: "#333331", dark: "#D6D6D0" },
        textSelection: { light: "#DDDDD6", dark: "#3A3A36" },
        band: null, // nil → the accent, thin: alpha 0.16 light / 0.30 dark with the keyboard, 0.10 / 0.20 without (Tint.band(active:)) — see bandFor()
        accentText: { light: "#66665F", dark: "#A3A39C" }, // derived (Tints.accentText): the accent blended toward black (light) / white (dark) in 4% steps till 4.8:1 on chrome.panel
        accentFill: { light: "#66665F", dark: "#777771" }, // derived (Tints.accentFill): the accent blended toward black in 4% steps till white reads on it at 4.5:1
      },
    },
  },

  // MARK: Classic
  // apex's Classic (acme's make in go.dev's hues), for a colour-blind reader: orange for red, blue for green.
  // Locals: go = Shade.hex(0x007D9C, 0x50B7E0); orange = Shade.hex(0xC85A00, 0xE07A2A); blue = Shade.hex(0x2A5DB0, 0x5E8EDB); ochre = Shade.hex(0x8F6B00, 0xFDDD00); fuchsia = Shade.hex(0xCE3262, 0xE0547A); selection = Shade.hex(0xF1E9A6, 0x4A4526)
  classic: {
    id: "classic",
    name: "Classic", // Palette.title
    // Its own accent (Palette.accent, a TintColors): what Tint.theme uses.
    accent: { light: "#007D9C", dark: "#50B7E0" }, // = go
    caret: { light: "#007D9C", dark: "#50B7E0" }, // no caret given → the accent (TintColors.init: caret ?? accent)
    textSelection: { light: "#F1E9A6", dark: "#4A4526" }, // = selection
    band: null, // nil → the accent, thin: alpha 0.16 light / 0.30 dark with the keyboard, 0.10 / 0.20 without (Tint.band(active:)) — see bandFor()
    accentText: { light: "#007997", dark: "#50B7E0" }, // derived (Tints.accentText): the accent blended toward black (light) / white (dark) in 4% steps till 4.8:1 on chrome.panel
    accentFill: { light: "#007D9C", dark: "#327894" }, // derived (Tints.accentFill): the accent blended toward black in 4% steps till white reads on it at 4.5:1
    window: { light: "#FCFCF2", dark: "#202224" }, // Shade(terminal.light.background, terminal.dark.background): the window's ground, the bars', the gaps between tiles
    text: {
      primary: { light: "#202224", dark: "#E6E6E6" },
      body: { light: "#202224", dark: "#DEDEDE" },
      strong: { light: "#000000", dark: "#F7F7F7" },
      secondary: { light: "#6E7072", dark: "#9A9C9E" },
      tertiary: { light: "#737577", dark: "#969899" },
      readingBody: { light: "#202224", dark: "#DBDBDB" },
      readingStrong: { light: "#202224", dark: "#F7F7F7" },
    },
    chrome: {
      hover: { light: "#F0F4F5", dark: "#333537" },
      selected: { light: "#FFFFFF", dark: "rgba(255, 255, 255, 0.12)" }, // Shade(.white, NSColor(white: 1, alpha: 0.12))
      pressed: { light: "rgba(0, 0, 0, 0.11)", dark: "rgba(255, 255, 255, 0.14)" }, // .wash(0.11, 0.14)
      divider: { light: "#D6DCDD", dark: "#3A3C3E" },
      panel: { light: "#FFFFFF", dark: "#2B2D2F" },
      panelBorder: { light: "#D6DCDD", dark: "#3A3C3E" },
      scrim: { light: "rgba(232, 240, 242, 0.35)", dark: "rgba(0, 0, 0, 0.3)" }, // Shade(NSColor(srgbRed: 0.91, green: 0.94, blue: 0.95, alpha: 0.35), NSColor(white: 0, alpha: 0.3))
      cardBorder: { light: "rgba(0, 0, 0, 0.08)", dark: "rgba(255, 255, 255, 0.1)" }, // .wash(0.08, 0.1)
      handle: { light: "#D4D4C4", dark: "#4A4C4E" },
      scrubberKnob: { light: "#D4D4C4", dark: "#4A4C4E" },
      sheetEdge: { light: "rgba(0, 0, 0, 0.2)", dark: "rgba(255, 255, 255, 0.16)" }, // .wash(0.2, 0.16)
      sheetEdgeHovered: { light: "rgba(0, 0, 0, 0.34)", dark: "rgba(255, 255, 255, 0.34)" }, // .wash(0.34, 0.34)
      sheet: [ // { level in Shade(NSColor(srgbRed: 0.90 - CGFloat(level) * 0.045, green: 0.94 - CGFloat(level) * 0.045, blue: 0.95 - CGFloat(level) * 0.04, alpha: 1), NSColor(srgbRed: 0.31 - CGFloat(level) * 0.045, green: 0.32 - CGFloat(level) * 0.045, blue: 0.33 - CGFloat(level) * 0.045, alpha: 1)) } — levels 0…3 (the function goes on past them)
        { light: "#E6F0F2", dark: "#4F5254" }, // level 0
        { light: "#DAE4E8", dark: "#444649" }, // level 1
        { light: "#CFD9DE", dark: "#383B3D" }, // level 2
        { light: "#C3CDD4", dark: "#2D2F32" }, // level 3
      ],
      stack: { light: "#F5F5EA", dark: "#26282A" },
      dragPill: { light: "#FFFFFF", dark: "#4A4C4E" },
      linkBehind: [ // { depth in Shade(NSColor(srgbRed: 0.92 - CGFloat(depth) * 0.03, green: 0.96 - CGFloat(depth) * 0.03, blue: 0.97 - CGFloat(depth) * 0.03, alpha: 1), NSColor(srgbRed: 0.17 - CGFloat(depth) * 0.015, green: 0.18 - CGFloat(depth) * 0.015, blue: 0.19 - CGFloat(depth) * 0.015, alpha: 1)) } — depths 0…3 (the function goes on past them)
        { light: "#EBF5F7", dark: "#2B2E30" }, // depth 0
        { light: "#E3EDF0", dark: "#282A2D" }, // depth 1
        { light: "#DBE5E8", dark: "#242629" }, // depth 2
        { light: "#D4DEE0", dark: "#202225" }, // depth 3
      ],
      well: { light: "rgba(0, 0, 0, 0.06)", dark: "rgba(255, 255, 255, 0.09)" }, // .wash(0.06, 0.09)
      pill: { light: "rgba(0, 0, 0, 0.07)", dark: "rgba(255, 255, 255, 0.1)" }, // .wash(0.07, 0.1)
      historyWash: {
        from: { light: "#EAF4F7", dark: "#1F3A44" },
        to: { light: "#F1E9C6", dark: "#3A3524" },
      },
      bar: null, // nil → chrome.panel (Theme.tileBar = bar ?? panel)
      barFocused: null, // nil → chrome.bar ?? chrome.panel, so chrome.panel (Theme.tileBarFocused)
      barInk: null, // nil → text.secondary (Theme.barInk = barInk ?? text.secondary)
      menu: null, // nil → clear: popovers and menus keep the system's frosted material (Theme.menuGround = menu ?? .clear)
    },
    status: {
      // StatusColors has these three. Design.swift's Status adds: running = the tint's accent (Tints.accent);
      // runningText = accentText (above, or the tint's); offline = text.secondary.
      done: { light: "#2A5DB0", dark: "#5E8EDB" }, // = blue
      attention: { light: "#8F6B00", dark: "#FDDD00" }, // = ochre
      failed: { light: "#CE3262", dark: "#E0547A" }, // = fuchsia
    },
    kinds: { // = Palette.paper.kinds
      // Colours that tell kinds apart: a file's type (its symbol, DirectoryModel.swift:447–461), a link's (linked, embeds: NeighborhoodView.swift:276–277).
      git: { light: "#FF8D28", dark: "#FF9230" }, // Shade(.systemOrange) — system colour (macOS 27.2)
      swift: { light: "#FF8D28", dark: "#FF9230" }, // Shade(.systemOrange) — system colour (macOS 27.2)
      shell: { light: "#34C759", dark: "#30D158" }, // Shade(.systemGreen) — system colour (macOS 27.2)
      pdf: { light: "#FF383C", dark: "#FF4245" }, // Shade(.systemRed) — system colour (macOS 27.2)
      image: { light: "#CB30E0", dark: "#DB34F2" }, // Shade(.systemPurple) — system colour (macOS 27.2)
      data: { light: "#FFCC00", dark: "#FFD600" }, // Shade(.systemYellow) — system colour (macOS 27.2)
      patch: { light: "#34C759", dark: "#30D158" }, // Shade(.systemGreen) — system colour (macOS 27.2)
      archive: { light: "#AC7F5E", dark: "#B78A66" }, // Shade(.systemBrown) — system colour (macOS 27.2)
      media: { light: "#FF2D55", dark: "#FF375F" }, // Shade(.systemPink) — system colour (macOS 27.2)
      code: { light: "#0088FF", dark: "#0091FF" }, // Shade(.systemBlue) — system colour (macOS 27.2)
      linked: { light: "#CB30E0", dark: "#DB34F2" }, // Shade(.systemPurple) — system colour (macOS 27.2)
      embeds: { light: "#00C3D0", dark: "#00D2E0" }, // Shade(.systemTeal) — system colour (macOS 27.2)
    },
    links: { // gathered here from the roles that colour a link's faces (no group of this name in Swift)
      color: { light: "#007D9C", dark: "#50B7E0" }, // = code.link (LinkStyle.color: a link's letters, and its ⌘ glow)
      hover: { light: "rgba(0, 0, 0, 0.08)", dark: "rgba(255, 255, 255, 0.13)" }, // = code.linkHover (LinkStyle.hover: the band behind a link under the pointer)
      page: { light: "#007D9C", dark: "#50B7E0" }, // = page.link (links in the rendered Markdown page)
      capsuleFill: { light: "#FFFFFF", dark: "#2B2D2F" }, // = chrome.panel (LinkCapsule.fill)
      capsuleEdge: { light: "#D6DCDD", dark: "#3A3C3E" }, // = chrome.panelBorder (LinkCapsule.edge = EdgeColor.hairline), 0.5pt wide
      capsuleEdgeHovered: { light: "rgba(32, 34, 36, 0.3)", dark: "rgba(230, 230, 230, 0.3)" }, // text.primary.withAlphaComponent(0.3) (LinkBadge.swift:471)
      behind: [ // = chrome.linkBehind(depth): the capsule's faces behind the front one
        { light: "#EBF5F7", dark: "#2B2E30" }, // depth 0 (not drawn: depth 0 is capsuleFill)
        { light: "#E3EDF0", dark: "#282A2D" }, // depth 1
        { light: "#DBE5E8", dark: "#242629" }, // depth 2
        { light: "#D4DEE0", dark: "#202225" }, // depth 3
      ],
      linked: { light: "#CB30E0", dark: "#DB34F2" }, // = kinds.linked
      embeds: { light: "#00C3D0", dark: "#00D2E0" }, // = kinds.embeds
    },
    code: {
      page: { light: "#FCFCF2", dark: "#202224" },
      text: { light: "#202224", dark: "#E6E6E6" },
      lineNumber: { light: "#8A8C8E", dark: "#6E7072" },
      lineHighlight: { light: "#F7F2CC", dark: "#2F2D22" },
      gutterText: { light: "#8A8C8E", dark: "#6E7072" },
      use: { light: "rgba(0, 0, 0, 0.075)", dark: "rgba(255, 255, 255, 0.1)" }, // .wash(0.075, 0.1)
      match: { light: "rgba(242, 222, 115, 0.65)", dark: "rgba(128, 112, 31, 0.75)" }, // Shade(NSColor(srgbRed: 0.95, green: 0.87, blue: 0.45, alpha: 0.65), NSColor(srgbRed: 0.5, green: 0.44, blue: 0.12, alpha: 0.75))
      link: { light: "#007D9C", dark: "#50B7E0" }, // = go
      linkHover: { light: "rgba(0, 0, 0, 0.08)", dark: "rgba(255, 255, 255, 0.13)" }, // .wash(0.08, 0.13)
      added: { light: "#2A5DB0", dark: "#5E8EDB" }, // = blue
      modified: { light: "#007D9C", dark: "#50B7E0" }, // = go
      deleted: { light: "#C85A00", dark: "#E07A2A" }, // = orange
      pins: [ // = Palette.paper.code.pins
        { light: "rgba(51, 179, 179, 0.28)", dark: "rgba(64, 191, 191, 0.35)" }, // Shade(NSColor(srgbRed: 0.2, green: 0.7, blue: 0.7, alpha: 0.28), NSColor(srgbRed: 0.25, green: 0.75, blue: 0.75, alpha: 0.35))
        { light: "rgba(242, 179, 51, 0.32)", dark: "rgba(242, 184, 64, 0.35)" }, // Shade(NSColor(srgbRed: 0.95, green: 0.7, blue: 0.2, alpha: 0.32), NSColor(srgbRed: 0.95, green: 0.72, blue: 0.25, alpha: 0.35))
        { light: "rgba(153, 115, 242, 0.28)", dark: "rgba(166, 128, 255, 0.35)" }, // Shade(NSColor(srgbRed: 0.6, green: 0.45, blue: 0.95, alpha: 0.28), NSColor(srgbRed: 0.65, green: 0.5, blue: 1, alpha: 0.35))
        { light: "rgba(242, 102, 140, 0.26)", dark: "rgba(255, 115, 153, 0.33)" }, // Shade(NSColor(srgbRed: 0.95, green: 0.4, blue: 0.55, alpha: 0.26), NSColor(srgbRed: 1, green: 0.45, blue: 0.6, alpha: 0.33))
      ],
      error: { light: "#CE3262", dark: "#E0547A" }, // = fuchsia
      warning: { light: "#C85A00", dark: "#E07A2A" }, // = orange
      hint: { light: "rgba(0, 125, 156, 0.6)", dark: "rgba(80, 183, 224, 0.6)" }, // Shade(Theme.hex(0x007D9C).withAlphaComponent(0.6), Theme.hex(0x50B7E0).withAlphaComponent(0.6))
      changedOnDisk: { light: "#F5EFCF", dark: "#332F20" },
      highlighter: { light: "rgba(242, 224, 102, 0.55)", dark: "rgba(153, 133, 38, 0.45)" }, // Shade(NSColor(srgbRed: 0.95, green: 0.88, blue: 0.4, alpha: 0.55), NSColor(srgbRed: 0.6, green: 0.52, blue: 0.15, alpha: 0.45))
    },
    diff: {
      added: { light: "#E1F3F8", dark: "#16323D" },
      removed: { light: "#FFF0DA", dark: "#3A2C1C" },
      hunk: { light: "#EAF4F7", dark: "#2B2D2F" },
      found: { light: "#F1E9A6", dark: "#4A4526" }, // = selection
      current: { light: "#E8D66A", dark: "#6E6326" },
      page: null, // nil → window (Theme.diffPage = diff.page ?? window)
    },
    found: {
      current: { light: "rgba(199, 89, 0, 0.45)", dark: "rgba(224, 122, 41, 0.55)" }, // Shade(NSColor(srgbRed: 0.78, green: 0.35, blue: 0, alpha: 0.45), NSColor(srgbRed: 0.88, green: 0.48, blue: 0.16, alpha: 0.55))
      currentRing: { light: "#C85A00", dark: "#E07A2A" }, // = orange
      pdf: { light: "rgba(255, 214, 0, 0.8)", dark: "rgba(255, 214, 0, 0.8)" }, // Shade(NSColor(srgbRed: 1, green: 0.84, blue: 0, alpha: 0.8))
      pdfCurrent: { light: "rgba(51, 143, 255, 0.7)", dark: "rgba(51, 143, 255, 0.7)" }, // Shade(NSColor(srgbRed: 0.2, green: 0.56, blue: 1, alpha: 0.7))
    },
    chart: {
      one: { light: "#2A5DB0", dark: "#5E8EDB" }, // = blue
      two: { light: "#C85A00", dark: "#E07A2A" }, // = orange
      three: { light: "#007D9C", dark: "#50B7E0" }, // = go
      track: { light: "rgba(0, 0, 0, 0.07)", dark: "rgba(255, 255, 255, 0.09)" }, // .wash(0.07, 0.09)
      surface: { light: "rgba(0, 0, 0, 0.025)", dark: "rgba(255, 255, 255, 0.035)" }, // .wash(0.025, 0.035)
      grid: { light: "rgba(0, 0, 0, 0.07)", dark: "rgba(255, 255, 255, 0.08)" }, // .wash(0.07, 0.08)
    },
    page: {
      // The preview's page (MarkdownPage), exported to CSS as --page-<role> (kebab-case).
      background: { light: "#FCFCF2", dark: "#202224" },
      text: { light: "#202224", dark: "#DBDBDB" },
      strong: { light: "#202224", dark: "#F7F7F7" },
      link: { light: "#007D9C", dark: "#50B7E0" }, // = go
      code: { light: "#F2F2E6", dark: "#2B2D2F" },
      codeText: { light: "#202224", dark: "#F0F1F2" },
      copy: { light: "#FFFFFF", dark: "#383A3C" },
      copyEdge: { light: "#D6DCDD", dark: "#4A4C4E" },
      copyText: { light: "#6E7072", dark: "#A8AAAC" },
      copyHoverEdge: { light: "#BCC4C6", dark: "#5A5C5E" },
      copyHoverText: { light: "#202224", dark: "#F0F1F2" },
      copyDone: { light: "#2A5DB0", dark: "#5E8EDB" }, // = blue
      quote: { light: "#6E7072", dark: "#9A9C9E" },
      quoteRule: { light: "#D6DCDD", dark: "#444648" },
      rule: { light: "#D6DCDD", dark: "#3A3C3E" },
      tableHead: { light: "#EAF4F7", dark: "#2B2D2F" },
      tableStripe: { light: "#F5F5EA", dark: "#242628" },
      struck: { light: "#6E7072", dark: "#8A8C8E" },
      missing: { light: "#CE3262", dark: "#E0547A" }, // = fuchsia
      diagramError: { light: "#CE3262", dark: "#E0547A" }, // = fuchsia
      selection: { light: "#F1E9A6", dark: "#4A4526" }, // = selection
      failed: { light: "#CE3262", dark: "#E0547A" }, // = fuchsia
      running: { light: "#007D9C", dark: "#50B7E0" }, // = go
      attention: { light: "#8F6B00", dark: "#FDDD00" }, // = ochre
      linksUnderlined: false,
    },
    terminal: { // the sixteen only; 16–255 are xterm's cube and greys (TerminalPalette.xtermExtended)
      light: {
        background: "#fcfcf2",
        foreground: "#202224",
        cursor: "#007d9c",
        cursorText: "#fcfcf2",
        selection: "#f1e9a6", // selectionBackground
        selectionForeground: "#202224",
        ansi: [
          "#24292f", "#b35900", "#0550ae", "#4d2d00", "#0969da", "#8250df", "#1b7c83", "#6e7781",
          "#57606a", "#8a4600", "#0969da", "#633c01", "#218bff", "#a475f9", "#3192aa", "#8c959f",
        ],
      },
      dark: {
        background: "#202224",
        foreground: "#e6e6e6",
        cursor: "#50b7e0",
        cursorText: "#202224",
        selection: "#4a4526", // selectionBackground
        selectionForeground: "#f7f7f7",
        ansi: [
          "#545d68", "#f69d50", "#539bf5", "#c69026", "#539bf5", "#b083f0", "#39c5cf", "#909dab",
          "#636e7b", "#ffbc6f", "#6cb6ff", "#daaa3f", "#6cb6ff", "#dcbdfb", "#56d4dd", "#cdd9e5",
        ],
      },
    },
    backdrop: { // stops are (hue, saturation, brightness) for NSColor(calibratedHue:…) — Generic RGB, see calibratedHSB()
      light: {
        stops: [[0.54, 0.17, 0.96], [0.52, 0.09, 0.98], [0.16, 0.13, 0.99], [0.15, 0.25, 0.98]],
        pool: { saturation: 0.2, brightness: 1 },
        tintPool: { saturation: 0.4, brightness: 1 }, // saturation × the tint accent's own (sRGB HSB) saturation
        stopsSRGB: ["#D4EFF7", "#E8F9FB", "#FDFBE2", "#FBF5C7"], // derived: the stops in sRGB, unturned (turn = 0) and unlit (neutral cast)
      },
      dark: {
        stops: [[0.55, 0.45, 0.27], [0.57, 0.32, 0.22], [0.14, 0.42, 0.23], [0.58, 0.15, 0.13]],
        pool: { saturation: 0.45, brightness: 0.33 },
        tintPool: { saturation: 0.65, brightness: 0.42 }, // saturation × the tint accent's own (sRGB HSB) saturation
        stopsSRGB: ["#314C57", "#324048", "#4B462D", "#25292C"], // derived: the stops in sRGB, unturned (turn = 0) and unlit (neutral cast)
      },
      tileShadow: { color: "#2B4650", opacity: 0.09 }, // (Theme.hex(0x2B4650), 0.09) — in the light only (opacity 0 in the dark); radius 10, 4pt down (Elevation.tile)
      tileEdge: null, // nil → no hairline round a tile: the shadow alone, by day
    },
    tints: { // = Palette.paper.tints
      blue: {
        accent: { light: "#3373F2", dark: "#3373F2" },
        caret: { light: "#007AFF", dark: "#0A84FF" },
        textSelection: { light: "#CFE2FB", dark: "#264F78" },
        band: null, // nil → the accent, thin: alpha 0.16 light / 0.30 dark with the keyboard, 0.10 / 0.20 without (Tint.band(active:)) — see bandFor()
        accentText: { light: "#2F6BE2", dark: "#6E97F5" }, // derived (Tints.accentText): the accent blended toward black (light) / white (dark) in 4% steps till 4.8:1 on chrome.panel
        accentFill: { light: "#316FEA", dark: "#316FEA" }, // derived (Tints.accentFill): the accent blended toward black in 4% steps till white reads on it at 4.5:1
      },
      orange: {
        accent: { light: "#E36A00", dark: "#FC7E0F" },
        caret: { light: "#EB7300", dark: "#FF8A26" },
        textSelection: { light: "#FDE1C4", dark: "#6E3D12" },
        band: null, // nil → the accent, thin: alpha 0.16 light / 0.30 dark with the keyboard, 0.10 / 0.20 without (Tint.band(active:)) — see bandFor()
        accentText: { light: "#B65401", dark: "#FC7E0F" }, // derived (Tints.accentText): the accent blended toward black (light) / white (dark) in 4% steps till 4.8:1 on chrome.panel
        accentFill: { light: "#BE5801", dark: "#B95B08" }, // derived (Tints.accentFill): the accent blended toward black in 4% steps till white reads on it at 4.5:1
      },
      purple: {
        accent: { light: "#9550D6", dark: "#BF7AF0" },
        caret: { light: "#9550D6", dark: "#BF7AF0" }, // no caret given → the accent (TintColors.init: caret ?? accent)
        textSelection: { light: "#EADCF8", dark: "#4B2F68" },
        band: null, // nil → the accent, thin: alpha 0.16 light / 0.30 dark with the keyboard, 0.10 / 0.20 without (Tint.band(active:)) — see bandFor()
        accentText: { light: "#904DCF", dark: "#C280F1" }, // derived (Tints.accentText): the accent blended toward black (light) / white (dark) in 4% steps till 4.8:1 on chrome.panel
        accentFill: { light: "#9550D6", dark: "#925CB9" }, // derived (Tints.accentFill): the accent blended toward black in 4% steps till white reads on it at 4.5:1
      },
      pink: {
        accent: { light: "#DC3F78", dark: "#FF6B9C" },
        caret: { light: "#DC3F78", dark: "#FF6B9C" }, // no caret given → the accent (TintColors.init: caret ?? accent)
        textSelection: { light: "#FADAE6", dark: "#6B2B43" },
        band: null, // nil → the accent, thin: alpha 0.16 light / 0.30 dark with the keyboard, 0.10 / 0.20 without (Tint.band(active:)) — see bandFor()
        accentText: { light: "#C7386C", dark: "#FF6B9C" }, // derived (Tints.accentText): the accent blended toward black (light) / white (dark) in 4% steps till 4.8:1 on chrome.panel
        accentFill: { light: "#CE3A70", dark: "#BB4D71" }, // derived (Tints.accentFill): the accent blended toward black in 4% steps till white reads on it at 4.5:1
      },
      green: {
        accent: { light: "#2A9A4A", dark: "#3FCB68" },
        caret: { light: "#2A9A4A", dark: "#3FCB68" }, // no caret given → the accent (TintColors.init: caret ?? accent)
        textSelection: { light: "#D5EFDC", dark: "#25512F" },
        band: null, // nil → the accent, thin: alpha 0.16 light / 0.30 dark with the keyboard, 0.10 / 0.20 without (Tint.band(active:)) — see bandFor()
        accentText: { light: "#21803C", dark: "#3FCB68" }, // derived (Tints.accentText): the accent blended toward black (light) / white (dark) in 4% steps till 4.8:1 on chrome.panel
        accentFill: { light: "#23853F", dark: "#268642" }, // derived (Tints.accentFill): the accent blended toward black in 4% steps till white reads on it at 4.5:1
      },
      graphite: {
        accent: { light: "#6E6E73", dark: "#98989D" },
        caret: { light: "#48484D", dark: "#C7C7CC" },
        textSelection: { light: "#E1E1E4", dark: "#4A4A4E" },
        band: null, // nil → the accent, thin: alpha 0.16 light / 0.30 dark with the keyboard, 0.10 / 0.20 without (Tint.band(active:)) — see bandFor()
        accentText: { light: "#6E6E73", dark: "#98989D" }, // derived (Tints.accentText): the accent blended toward black (light) / white (dark) in 4% steps till 4.8:1 on chrome.panel
        accentFill: { light: "#6E6E73", dark: "#747478" }, // derived (Tints.accentFill): the accent blended toward black in 4% steps till white reads on it at 4.5:1
      },
    },
  },

  // MARK: Financial Times
  // The Financial Times' (FT Origami's palette). NB the Swift id is "financial-times".
  // Locals: teal = Shade.hex(0x0D7680, 0x14BDCC); oxford = Shade.hex(0x0F5499, 0x87AACC); jade = Shade.hex(0x007A3D, 0x66CC99); mandarin = Shade.hex(0xA35214, 0xFF8833); crimson = Shade.hex(0xCC0000, 0xFF6666); claret = Shade.hex(0x990F3D, 0xD193A8); velvet = Shade.hex(0x593380, 0xAC99C0); wheat = Shade.hex(0xF2DFCE, 0x4D4845)
  financialTimes: {
    id: "financial-times",
    name: "Financial Times", // Palette.title
    // Its own accent (Palette.accent, a TintColors): what Tint.theme uses.
    accent: { light: "#0D7680", dark: "#14BDCC" }, // = teal
    caret: { light: "#33302E", dark: "#FFFFFF" },
    textSelection: { light: "#F2DFCE", dark: "#4D4845" }, // = wheat
    band: null, // nil → the accent, thin: alpha 0.16 light / 0.30 dark with the keyboard, 0.10 / 0.20 without (Tint.band(active:)) — see bandFor()
    accentText: { light: "#0D7680", dark: "#14BDCC" }, // derived (Tints.accentText): the accent blended toward black (light) / white (dark) in 4% steps till 4.8:1 on chrome.panel
    accentFill: { light: "#0D7680", dark: "#0A838E" }, // derived (Tints.accentFill): the accent blended toward black in 4% steps till white reads on it at 4.5:1
    window: { light: "#FFF1E5", dark: "#262A33" }, // Shade(terminal.light.background, terminal.dark.background): the window's ground, the bars', the gaps between tiles
    text: {
      primary: { light: "#33302E", dark: "#E9EAEB" },
      body: { light: "#33302E", dark: "#E9EAEB" },
      strong: { light: "#1A1817", dark: "#FFFFFF" },
      secondary: { light: "#66605C", dark: "#A8AAAD" },
      tertiary: { light: "#6F6964", dark: "#9A9CA0" },
      readingBody: { light: "#33302E", dark: "#E9EAEB" },
      readingStrong: { light: "#1A1817", dark: "#FFFFFF" },
    },
    chrome: {
      hover: { light: "rgba(0, 0, 0, 0.05)", dark: "rgba(255, 255, 255, 0.07)" }, // .wash(0.05, 0.07)
      selected: { light: "#FFFCFA", dark: "rgba(255, 255, 255, 0.12)" }, // Shade(Theme.hex(0xFFFCFA), NSColor(white: 1, alpha: 0.12))
      pressed: { light: "rgba(0, 0, 0, 0.1)", dark: "rgba(255, 255, 255, 0.14)" }, // .wash(0.1, 0.14)
      divider: { light: "#E6D9CE", dark: "#3D414A" },
      panel: { light: "#FFF7EF", dark: "#2D313A" },
      panelBorder: { light: "#E6D9CE", dark: "#3D414A" },
      scrim: { light: "rgba(242, 224, 207, 0.35)", dark: "rgba(0, 0, 0, 0.3)" }, // Shade(NSColor(srgbRed: 0.95, green: 0.88, blue: 0.81, alpha: 0.35), NSColor(white: 0, alpha: 0.3))
      cardBorder: { light: "rgba(0, 0, 0, 0.08)", dark: "rgba(255, 255, 255, 0.1)" }, // .wash(0.08, 0.1)
      handle: { light: "#CCC1B7", dark: "#4D515A" },
      scrubberKnob: { light: "#CCC1B7", dark: "#4D515A" },
      sheetEdge: { light: "rgba(0, 0, 0, 0.2)", dark: "rgba(255, 255, 255, 0.16)" }, // .wash(0.2, 0.16)
      sheetEdgeHovered: { light: "rgba(0, 0, 0, 0.34)", dark: "rgba(255, 255, 255, 0.34)" }, // .wash(0.34, 0.34)
      sheet: [ // { level in Shade(NSColor(srgbRed: 0.95 - CGFloat(level) * 0.045, green: 0.875 - CGFloat(level) * 0.045, blue: 0.81 - CGFloat(level) * 0.04, alpha: 1), NSColor(srgbRed: 0.27 - CGFloat(level) * 0.04, green: 0.29 - CGFloat(level) * 0.04, blue: 0.33 - CGFloat(level) * 0.045, alpha: 1)) } — levels 0…3 (the function goes on past them)
        { light: "#F2DFCF", dark: "#454A54" }, // level 0
        { light: "#E7D4C4", dark: "#3B4049" }, // level 1
        { light: "#DBC8BA", dark: "#30363D" }, // level 2
        { light: "#D0BDB0", dark: "#262B32" }, // level 3
      ],
      stack: { light: "#FFF7EF", dark: "#2A2E37" },
      dragPill: { light: "#FFFCFA", dark: "#4D515A" },
      linkBehind: [ // { depth in Shade(NSColor(srgbRed: 0.97 - CGFloat(depth) * 0.03, green: 0.91 - CGFloat(depth) * 0.03, blue: 0.86 - CGFloat(depth) * 0.03, alpha: 1), NSColor(srgbRed: 0.18 - CGFloat(depth) * 0.015, green: 0.19 - CGFloat(depth) * 0.015, blue: 0.23 - CGFloat(depth) * 0.015, alpha: 1)) } — depths 0…3 (the function goes on past them)
        { light: "#F7E8DB", dark: "#2E303B" }, // depth 0
        { light: "#F0E0D4", dark: "#2A2D37" }, // depth 1
        { light: "#E8D9CC", dark: "#262933" }, // depth 2
        { light: "#E0D1C4", dark: "#22252F" }, // depth 3
      ],
      well: { light: "rgba(0, 0, 0, 0.06)", dark: "rgba(255, 255, 255, 0.09)" }, // .wash(0.06, 0.09)
      pill: { light: "rgba(0, 0, 0, 0.07)", dark: "rgba(255, 255, 255, 0.1)" }, // .wash(0.07, 0.1)
      historyWash: {
        from: { light: "#E6EEF5", dark: "#1E2E44" },
        to: { light: "#FCE0CC", dark: "#3A2230" },
      },
      bar: null, // nil → chrome.panel (Theme.tileBar = bar ?? panel)
      barFocused: null, // nil → chrome.bar ?? chrome.panel, so chrome.panel (Theme.tileBarFocused)
      barInk: null, // nil → text.secondary (Theme.barInk = barInk ?? text.secondary)
      menu: null, // nil → clear: popovers and menus keep the system's frosted material (Theme.menuGround = menu ?? .clear)
    },
    status: {
      // StatusColors has these three. Design.swift's Status adds: running = the tint's accent (Tints.accent);
      // runningText = accentText (above, or the tint's); offline = text.secondary.
      done: { light: "#007A3D", dark: "#66CC99" }, // = jade
      attention: { light: "#A35214", dark: "#FF8833" }, // = mandarin
      failed: { light: "#CC0000", dark: "#FF6666" }, // = crimson
    },
    kinds: {
      // Colours that tell kinds apart: a file's type (its symbol, DirectoryModel.swift:447–461), a link's (linked, embeds: NeighborhoodView.swift:276–277).
      git: { light: "#A35214", dark: "#FF8833" }, // = mandarin
      swift: { light: "#A35214", dark: "#FF8833" }, // = mandarin
      shell: { light: "#007A3D", dark: "#66CC99" }, // = jade
      pdf: { light: "#CC0000", dark: "#FF6666" }, // = crimson
      image: { light: "#593380", dark: "#AC99C0" }, // = velvet
      data: { light: "#665F29", dark: "#FFEC1A" },
      patch: { light: "#007A3D", dark: "#66CC99" }, // = jade
      archive: { light: "#66605C", dark: "#A8AAAD" },
      media: { light: "#990F3D", dark: "#D193A8" }, // = claret
      code: { light: "#0F5499", dark: "#87AACC" }, // = oxford
      linked: { light: "#593380", dark: "#AC99C0" }, // = velvet
      embeds: { light: "#0D7680", dark: "#14BDCC" }, // = teal
    },
    links: { // gathered here from the roles that colour a link's faces (no group of this name in Swift)
      color: { light: "#0D7680", dark: "#14BDCC" }, // = code.link (LinkStyle.color: a link's letters, and its ⌘ glow)
      hover: { light: "rgba(0, 0, 0, 0.08)", dark: "rgba(255, 255, 255, 0.13)" }, // = code.linkHover (LinkStyle.hover: the band behind a link under the pointer)
      page: { light: "#0D7680", dark: "#14BDCC" }, // = page.link (links in the rendered Markdown page)
      capsuleFill: { light: "#FFF7EF", dark: "#2D313A" }, // = chrome.panel (LinkCapsule.fill)
      capsuleEdge: { light: "#E6D9CE", dark: "#3D414A" }, // = chrome.panelBorder (LinkCapsule.edge = EdgeColor.hairline), 0.5pt wide
      capsuleEdgeHovered: { light: "rgba(51, 48, 46, 0.3)", dark: "rgba(233, 234, 235, 0.3)" }, // text.primary.withAlphaComponent(0.3) (LinkBadge.swift:471)
      behind: [ // = chrome.linkBehind(depth): the capsule's faces behind the front one
        { light: "#F7E8DB", dark: "#2E303B" }, // depth 0 (not drawn: depth 0 is capsuleFill)
        { light: "#F0E0D4", dark: "#2A2D37" }, // depth 1
        { light: "#E8D9CC", dark: "#262933" }, // depth 2
        { light: "#E0D1C4", dark: "#22252F" }, // depth 3
      ],
      linked: { light: "#593380", dark: "#AC99C0" }, // = kinds.linked
      embeds: { light: "#0D7680", dark: "#14BDCC" }, // = kinds.embeds
    },
    code: {
      page: { light: "#FFF1E5", dark: "#262A33" },
      text: { light: "#33302E", dark: "#F2F2F2" },
      lineNumber: { light: "#999189", dark: "#7D8088" },
      lineHighlight: { light: "#F7E7DA", dark: "#2D313A" },
      gutterText: { light: "#999189", dark: "#6E717A" },
      use: { light: "rgba(0, 0, 0, 0.075)", dark: "rgba(255, 255, 255, 0.1)" }, // .wash(0.075, 0.1)
      match: { light: "rgba(255, 224, 102, 0.6)", dark: "rgba(153, 128, 26, 0.7)" }, // Shade(NSColor(srgbRed: 1, green: 0.88, blue: 0.4, alpha: 0.6), NSColor(srgbRed: 0.6, green: 0.5, blue: 0.1, alpha: 0.7))
      link: { light: "#0D7680", dark: "#14BDCC" }, // = teal
      linkHover: { light: "rgba(0, 0, 0, 0.08)", dark: "rgba(255, 255, 255, 0.13)" }, // .wash(0.08, 0.13)
      added: { light: "#00994D", dark: "#66CC99" },
      modified: { light: "#FF8833", dark: "#FF8833" },
      deleted: { light: "#CC0000", dark: "#FF6666" }, // = crimson
      pins: [
        { light: "rgba(13, 117, 128, 0.24)", dark: "rgba(20, 189, 204, 0.3)" }, // Shade(NSColor(srgbRed: 0.05, green: 0.46, blue: 0.50, alpha: 0.24), NSColor(srgbRed: 0.08, green: 0.74, blue: 0.80, alpha: 0.3))
        { light: "rgba(255, 135, 51, 0.3)", dark: "rgba(255, 135, 51, 0.33)" }, // Shade(NSColor(srgbRed: 1, green: 0.53, blue: 0.2, alpha: 0.3), NSColor(srgbRed: 1, green: 0.53, blue: 0.2, alpha: 0.33))
        { light: "rgba(89, 51, 128, 0.24)", dark: "rgba(171, 153, 191, 0.33)" }, // Shade(NSColor(srgbRed: 0.35, green: 0.2, blue: 0.5, alpha: 0.24), NSColor(srgbRed: 0.67, green: 0.6, blue: 0.75, alpha: 0.33))
        { light: "rgba(255, 128, 171, 0.3)", dark: "rgba(255, 128, 171, 0.33)" }, // Shade(NSColor(srgbRed: 1, green: 0.5, blue: 0.67, alpha: 0.3), NSColor(srgbRed: 1, green: 0.5, blue: 0.67, alpha: 0.33))
      ],
      error: { light: "#CC0000", dark: "#FF6666" }, // = crimson
      warning: { light: "#FF8833", dark: "#FF8833" },
      hint: { light: "rgba(13, 118, 128, 0.6)", dark: "rgba(20, 189, 204, 0.6)" }, // Shade(Theme.hex(0x0D7680).withAlphaComponent(0.6), Theme.hex(0x14BDCC).withAlphaComponent(0.6))
      changedOnDisk: { light: "#F2DFCE", dark: "#3A3633" },
      highlighter: { light: "rgba(255, 237, 26, 0.45)", dark: "rgba(179, 158, 26, 0.45)" }, // Shade(NSColor(srgbRed: 1, green: 0.93, blue: 0.1, alpha: 0.45), NSColor(srgbRed: 0.7, green: 0.62, blue: 0.1, alpha: 0.45))
    },
    diff: {
      added: { light: "#D7F0D1", dark: "#1E3D33" },
      removed: { light: "#FADBD0", dark: "#46262C" },
      hunk: { light: "#E6EEF5", dark: "#2D3646" },
      found: { light: "#FFF0A8", dark: "#4A4527" },
      current: { light: "#FFE066", dark: "#6E6326" },
      page: null, // nil → window (Theme.diffPage = diff.page ?? window)
    },
    found: {
      current: { light: "rgba(255, 135, 51, 0.45)", dark: "rgba(255, 135, 51, 0.5)" }, // Shade(NSColor(srgbRed: 1, green: 0.53, blue: 0.2, alpha: 0.45), NSColor(srgbRed: 1, green: 0.53, blue: 0.2, alpha: 0.5))
      currentRing: { light: "#FF8833", dark: "#FF8833" },
      pdf: { light: "rgba(255, 214, 0, 0.8)", dark: "rgba(255, 214, 0, 0.8)" }, // Shade(NSColor(srgbRed: 1, green: 0.84, blue: 0, alpha: 0.8))
      pdfCurrent: { light: "rgba(51, 143, 255, 0.7)", dark: "rgba(51, 143, 255, 0.7)" }, // Shade(NSColor(srgbRed: 0.2, green: 0.56, blue: 1, alpha: 0.7))
    },
    chart: {
      one: { light: "#0F5499", dark: "#87AACC" }, // = oxford
      two: { light: "#FF8833", dark: "#FF8833" },
      three: { light: "#0D7680", dark: "#14BDCC" }, // = teal
      track: { light: "rgba(0, 0, 0, 0.07)", dark: "rgba(255, 255, 255, 0.09)" }, // .wash(0.07, 0.09)
      surface: { light: "rgba(0, 0, 0, 0.025)", dark: "rgba(255, 255, 255, 0.035)" }, // .wash(0.025, 0.035)
      grid: { light: "rgba(0, 0, 0, 0.07)", dark: "rgba(255, 255, 255, 0.08)" }, // .wash(0.07, 0.08)
    },
    page: {
      // The preview's page (MarkdownPage), exported to CSS as --page-<role> (kebab-case).
      background: { light: "#FFF1E5", dark: "#262A33" },
      text: { light: "#33302E", dark: "#E9EAEB" },
      strong: { light: "#1A1817", dark: "#FFFFFF" },
      link: { light: "#0D7680", dark: "#14BDCC" }, // = teal
      code: { light: "#F2E5DA", dark: "#2D313A" },
      codeText: { light: "#33302E", dark: "#F2F2F2" },
      copy: { light: "#FFF7EF", dark: "#333740" },
      copyEdge: { light: "#E6D9CE", dark: "#4A4E57" },
      copyText: { light: "#66605C", dark: "#A8AAAD" },
      copyHoverEdge: { light: "#CCC1B7", dark: "#5A5E67" },
      copyHoverText: { light: "#33302E", dark: "#F2F2F2" },
      copyDone: { light: "#007A3D", dark: "#66CC99" }, // = jade
      quote: { light: "#4D4845", dark: "#A8AAAD" },
      quoteRule: { light: "#CCC1B7", dark: "#4A4E57" },
      rule: { light: "#E6D9CE", dark: "#3D414A" },
      tableHead: { light: "#F2E5DA", dark: "#2D313A" },
      tableStripe: { light: "#FAECE0", dark: "#21252D" },
      struck: { light: "#807973", dark: "#8B8D91" },
      missing: { light: "#CC0000", dark: "#FF6666" }, // = crimson
      diagramError: { light: "#CC0000", dark: "#FF6666" }, // = crimson
      selection: { light: "#F2DFCE", dark: "#4D4845" }, // = wheat
      failed: { light: "#CC0000", dark: "#FF6666" }, // = crimson
      running: { light: "#0D7680", dark: "#14BDCC" }, // = teal
      attention: { light: "#A35214", dark: "#FF8833" }, // = mandarin
      linksUnderlined: false,
    },
    terminal: { // the sixteen only; 16–255 are made from these as Ghostty's palette-generate does (TerminalPalette.generated, in CIELAB)
      light: {
        background: "#fff1e5",
        foreground: "#33302e",
        cursor: "#33302e",
        cursorText: "#fff1e5",
        selection: "#f2dfce", // selectionBackground
        selectionForeground: "#33302e",
        ansi: [
          "#262a33", "#990f3d", "#146f41", "#855330", "#0f5499", "#593380", "#136c74", "#66605c",
          "#4d4845", "#c40202", "#56672c", "#665f29", "#1a6886", "#855060", "#27686d", "#5c5958",
        ],
      },
      dark: {
        background: "#262a33",
        foreground: "#ffffff",
        cursor: "#ffffff",
        cursorText: "#262a33",
        selection: "#4d4845", // selectionBackground
        selectionForeground: "#ffffff",
        ansi: [
          "#a8aaad", "#d193a8", "#caeada", "#ff8833", "#87aacc", "#ac99c0", "#6eadb3", "#fff1e5",
          "#a6a4a2", "#e88c8c", "#d5eba9", "#ffec1a", "#26aee2", "#ff7faa", "#14bdcc", "#ffffff",
        ],
      },
    },
    backdrop: { // stops are (hue, saturation, brightness) for NSColor(calibratedHue:…) — Generic RGB, see calibratedHSB()
      light: {
        stops: [[0.07, 0.3, 0.93], [0.08, 0.18, 0.96], [0.075, 0.26, 0.84], [0.075, 0.12, 0.93]],
        pool: { saturation: 0.22, brightness: 0.98 },
        tintPool: { saturation: 0.35, brightness: 0.98 }, // saturation × the tint accent's own (sRGB HSB) saturation
        stopsSRGB: ["#F2CFB5", "#F7E4D3", "#DFC4AE", "#F1E4D9"], // derived: the stops in sRGB, unturned (turn = 0) and unlit (neutral cast)
      },
      dark: {
        stops: [[0.61, 0.32, 0.24], [0.6, 0.42, 0.22], [0.93, 0.35, 0.2], [0.61, 0.22, 0.14]],
        pool: { saturation: 0.4, brightness: 0.3 },
        tintPool: { saturation: 0.6, brightness: 0.4 }, // saturation × the tint accent's own (sRGB HSB) saturation
        stopsSRGB: ["#37404E", "#2B3848", "#432D36", "#252930"], // derived: the stops in sRGB, unturned (turn = 0) and unlit (neutral cast)
      },
      tileShadow: { color: "#4D3A2A", opacity: 0.09 }, // (Theme.hex(0x4D3A2A), 0.09) — in the light only (opacity 0 in the dark); radius 10, 4pt down (Elevation.tile)
      tileEdge: null, // nil → no hairline round a tile: the shadow alone, by day
    },
    tints: { // = Palette.paper.tints
      blue: {
        accent: { light: "#3373F2", dark: "#3373F2" },
        caret: { light: "#007AFF", dark: "#0A84FF" },
        textSelection: { light: "#CFE2FB", dark: "#264F78" },
        band: null, // nil → the accent, thin: alpha 0.16 light / 0.30 dark with the keyboard, 0.10 / 0.20 without (Tint.band(active:)) — see bandFor()
        accentText: { light: "#2D67DB", dark: "#769DF6" }, // derived (Tints.accentText): the accent blended toward black (light) / white (dark) in 4% steps till 4.8:1 on chrome.panel
        accentFill: { light: "#316FEA", dark: "#316FEA" }, // derived (Tints.accentFill): the accent blended toward black in 4% steps till white reads on it at 4.5:1
      },
      orange: {
        accent: { light: "#E36A00", dark: "#FC7E0F" },
        caret: { light: "#EB7300", dark: "#FF8A26" },
        textSelection: { light: "#FDE1C4", dark: "#6E3D12" },
        band: null, // nil → the accent, thin: alpha 0.16 light / 0.30 dark with the keyboard, 0.10 / 0.20 without (Tint.band(active:)) — see bandFor()
        accentText: { light: "#AE5001", dark: "#FC7E0F" }, // derived (Tints.accentText): the accent blended toward black (light) / white (dark) in 4% steps till 4.8:1 on chrome.panel
        accentFill: { light: "#BE5801", dark: "#B95B08" }, // derived (Tints.accentFill): the accent blended toward black in 4% steps till white reads on it at 4.5:1
      },
      purple: {
        accent: { light: "#9550D6", dark: "#BF7AF0" },
        caret: { light: "#9550D6", dark: "#BF7AF0" }, // no caret given → the accent (TintColors.init: caret ?? accent)
        textSelection: { light: "#EADCF8", dark: "#4B2F68" },
        band: null, // nil → the accent, thin: alpha 0.16 light / 0.30 dark with the keyboard, 0.10 / 0.20 without (Tint.band(active:)) — see bandFor()
        accentText: { light: "#8B4AC8", dark: "#C486F1" }, // derived (Tints.accentText): the accent blended toward black (light) / white (dark) in 4% steps till 4.8:1 on chrome.panel
        accentFill: { light: "#9550D6", dark: "#925CB9" }, // derived (Tints.accentFill): the accent blended toward black in 4% steps till white reads on it at 4.5:1
      },
      pink: {
        accent: { light: "#DC3F78", dark: "#FF6B9C" },
        caret: { light: "#DC3F78", dark: "#FF6B9C" }, // no caret given → the accent (TintColors.init: caret ?? accent)
        textSelection: { light: "#FADAE6", dark: "#6B2B43" },
        band: null, // nil → the accent, thin: alpha 0.16 light / 0.30 dark with the keyboard, 0.10 / 0.20 without (Tint.band(active:)) — see bandFor()
        accentText: { light: "#BF3668", dark: "#FF6B9C" }, // derived (Tints.accentText): the accent blended toward black (light) / white (dark) in 4% steps till 4.8:1 on chrome.panel
        accentFill: { light: "#CE3A70", dark: "#BB4D71" }, // derived (Tints.accentFill): the accent blended toward black in 4% steps till white reads on it at 4.5:1
      },
      green: {
        accent: { light: "#2A9A4A", dark: "#3FCB68" },
        caret: { light: "#2A9A4A", dark: "#3FCB68" }, // no caret given → the accent (TintColors.init: caret ?? accent)
        textSelection: { light: "#D5EFDC", dark: "#25512F" },
        band: null, // nil → the accent, thin: alpha 0.16 light / 0.30 dark with the keyboard, 0.10 / 0.20 without (Tint.band(active:)) — see bandFor()
        accentText: { light: "#207B3A", dark: "#3FCB68" }, // derived (Tints.accentText): the accent blended toward black (light) / white (dark) in 4% steps till 4.8:1 on chrome.panel
        accentFill: { light: "#23853F", dark: "#268642" }, // derived (Tints.accentFill): the accent blended toward black in 4% steps till white reads on it at 4.5:1
      },
      graphite: {
        accent: { light: "#6E6E73", dark: "#98989D" },
        caret: { light: "#48484D", dark: "#C7C7CC" },
        textSelection: { light: "#E1E1E4", dark: "#4A4A4E" },
        band: null, // nil → the accent, thin: alpha 0.16 light / 0.30 dark with the keyboard, 0.10 / 0.20 without (Tint.band(active:)) — see bandFor()
        accentText: { light: "#6A6A6F", dark: "#A1A1A5" }, // derived (Tints.accentText): the accent blended toward black (light) / white (dark) in 4% steps till 4.8:1 on chrome.panel
        accentFill: { light: "#6E6E73", dark: "#747478" }, // derived (Tints.accentFill): the accent blended toward black in 4% steps till white reads on it at 4.5:1
      },
    },
  },

};

// MARK: Tints' derived colours (Tints.swift, Design.swift)

/** "#RRGGBB" at an alpha, as NSColor.withAlphaComponent. */
export function withAlpha(hex, alpha) {
  const v = parseInt(hex.slice(1), 16);
  return `rgba(${(v >> 16) & 255}, ${(v >> 8) & 255}, ${v & 255}, ${alpha})`;
}

/** A theme's colours for a tint: "theme" (its own accent) or one of themes[t].tints. */
export function tintOf(themeKey, tint = "theme") {
  const t = themes[themeKey];
  return tint === "theme" ? t : t.tints[tint];
}

/** How a tint's accent is thinned for each mark (alpha of the accent). */
export const tintAlphas = {
  band: { light: 0.16, dark: 0.30 },          // Tint.band(active: true): a chosen row, the list has the keyboard
  bandInactive: { light: 0.10, dark: 0.20 },  // Tint.band(active: false)
  ownBandInactive: 0.6,                        // a theme's own band (TintColors.band, none here), inactive: its alpha × 0.6
  dropHighlight: 0.18,                         // Tints.dropHighlight
  mark: 0.85,                                  // Flat.mark
  edgeStrong: 0.75,                            // EdgeColor.accentStrong: the focus ring, a field with the keyboard
  edgeSoft: 0.45,                              // EdgeColor.accentSoft
  glowTowardWhite: { light: 0, dark: 0.4 },    // Tints.glow(dark:): the accent blended 40% toward white in the dark
};

/** A chosen row's band for a theme and tint: Tint.band(active:). */
export function bandFor(themeKey, tint = "theme", dark = false, active = true) {
  const c = tintOf(themeKey, tint), mode = dark ? "dark" : "light";
  if (c.band) { // a theme's own band (none of these four has one): inactive, its alpha × 0.6
    if (active) return c.band[mode];
    const m = c.band[mode].match(/^rgba\((\d+), (\d+), (\d+), ([\d.]+)\)$/);
    return m ? "rgba(" + [m[1], m[2], m[3], +(m[4] * tintAlphas.ownBandInactive).toFixed(4)].join(", ") + ")" : withAlpha(c.band[mode], tintAlphas.ownBandInactive);
  }
  return withAlpha(c.accent[mode], (active ? tintAlphas.band : tintAlphas.bandInactive)[mode]);
}

// MARK: Flat (Flat.swift), with Design.swift's measures it is made of

export const flat = {
  fieldHeight: 28,   // Flat.fieldHeight
  buttonHeight: 24,  // Flat.buttonHeight
  disabledAlpha: 0.4, // Flat.disabledAlpha: how far a control that can't be used is faded
  markWidth: 3,      // Flat.markWidth: the bar at a marked row's left edge, inset 5 top and bottom, ends rounded 1.5 (Radius.hair)
  // Flat.rowBand(r): r.insetBy(dx: 6, dy: 1), rounded Radius.control — a row's hover and selection.
  rowBand: { insetX: 6, insetY: 1, radius: 6 },
  // Flat.menuBand: a menu's chosen row, filled in the accent, rounded 7; its words white (Flat.onBand), what's beside them white at 0.75.
  menuBand: { radius: 7, fill: "accent", ink: "#FFFFFF", inkDim: "rgba(255, 255, 255, 0.75)" },
  // Where each colour comes from (per theme, resolved in flat.themes below):
  roles: {
    line: { of: "text.primary", alpha: 0.14 },    // Flat.line: a control's edge
    fill: { of: "text.primary", alpha: 0.025 },   // Flat.fill: a control's fill
    hovered: "chrome.hover",                      // Flat.hovered = Theme.hover
    pressed: "chrome.pressed",                    // Flat.pressed
    chosen: "the tint's band, see bandFor(theme, tint, dark, active)", // Flat.chosen(emphasized:) = Theme.selection / selectionInactive
    mark: { of: "accent", alpha: 0.85 },          // Flat.mark
    // Flat.ground(_:): a capsule control's ground — a button, a chip, a segment, a token.
    groundRest: { of: "text.primary", alpha: 0.06 },
    groundHover: "chrome.hover",
    groundPressed: "chrome.pressed",
    groundOn: { of: "text.primary", alpha: 0.15 },
    edgeControl: { of: "text.primary", alpha: 0.3 },        // EdgeColor.control: a checkbox's, a slider knob's edge
    edgeControlHovered: { of: "text.primary", alpha: 0.5 }, // EdgeColor.controlHovered
    edgeHairline: "chrome.panelBorder",                     // EdgeColor.hairline
    edgeSubtle: "chrome.cardBorder",                        // EdgeColor.subtle
    accentStrong: { of: "accent", alpha: 0.75 },            // EdgeColor.accentStrong
    accentSoft: { of: "accent", alpha: 0.45 },              // EdgeColor.accentSoft
    sliderTrack: { of: "text.primary", alpha: 0.12 },       // FlatSliderCell.drawBar
  },
  // FlatFieldBox: a hairline on a faint fill, in the accent while it has the keyboard.
  field: { height: 28, radius: 7 /* Radius.control + 1 */, lineWidth: 1, fill: "roles.fill", edge: "roles.line", edgeFocused: "roles.accentStrong", fontSize: 13 /* UIType.field */ },
  // FlatButton: a capsule (radius = height / 2), no line round it. normal: roles.ground*; primary: the tint's
  // accentFill, blended toward black by 0.1 under the pointer and 0.2 pressed; its words white.
  button: { height: 24, radius: 12, primaryHoverBlack: 0.1, primaryPressedBlack: 0.2, primaryInk: "#FFFFFF", fontSize: 12 /* UIType.body */, padX: 10 },
  // FlatSegments: each segment a capsule 24 high, 2 apart; the chosen on groundOn, the hovered on groundHover;
  // chosen words text.primary (weight medium), the rest text.secondary. The chosen band glides over Motion.base (0.16s), 1 - (1 - t)³.
  segments: { height: 24, gap: 2, padX: 9, symbolWidth: 28 },
  // FlatSliderCell: a 3pt track (roles.sliderTrack), filled in the accent to a 13pt knob: chrome.panel, 1pt roles.edgeControl.
  slider: { trackHeight: 3, knob: 13, radius: 1.5 },
  // FlatCheckboxCell: a 14pt box rounded 4 (Radius.inline), 7 before its title; off: roles.fill + 1pt roles.edgeControl; on: accentFill, a white tick.
  checkbox: { box: 14, gap: 7, radius: 4 },
  // Flat.float: a panel floating over the window — rounded Radius.surface, a 0.5pt hairline, one soft shadow.
  float: { radius: 10, borderWidth: 0.5, border: "chrome.panelBorder", background: "chrome.panel", shadow: "elevation.float" },
  // Flat.outline: a list set in a window — a 1pt roles.line round it, rounded Radius.control + 1.
  outline: { radius: 7, borderWidth: 1, border: "roles.line" },
  // Radius (Design.swift): a hairline's ends, a chip in text, a control, a surface (a tile, a card, a panel); a capsule is height / 2.
  radius: { hair: 1.5, inline: 4, control: 6, surface: 10 },
  // Elevation (Design.swift): black at `opacity`, blurred by `radius` points, `y` points below (AppKit's offsets are
  // negative-down: -1, -4, -3; positive here, as CSS). tile and float are set on layers (CALayer.shadowRadius, a
  // Gaussian's sigma — about a CSS box-shadow blur of 2 × radius); resting is drawn as an NSShadow (shadowBlurRadius).
  elevation: {
    resting: { color: "#000000", opacity: 0.18, radius: 3, x: 0, y: 1 },
    tile: { color: "#000000", opacity: 0.10, radius: 10, x: 0, y: 4 },   // colour and opacity replaced by the theme's backdrop.tileShadow; none in the dark
    float: { color: "#000000", opacity: 0.16, radius: 12, x: 0, y: 3 },  // Elevation.floatOpacity
  },
  // Pill (Design.swift): a count, an age — chrome.pill ground, text.secondary figures.
  pill: { height: 16, minWidth: 20, padX: 6, fontSize: 10.5, ground: "chrome.pill", ink: "text.secondary" },
  // Motion (Design.swift), seconds; curves as cubic-bezier control points.
  motion: {
    fast: 0.12, base: 0.16, spatial: 0.24, morph: 0.36, hoverIntent: 0.3, lingerAfterExit: 0.35,
    appear: "ease-out", disappear: "ease-in", flight: "ease-in-out",
    travel: [0.2, 0.9, 0.3, 1], settle: [0.2, 0.9, 0.3, 1.15],
  },
  // The roles above resolved for each theme, with its own accent (Tint.theme). For another tint use
  // bandFor() and withAlpha(tintOf(theme, tint).accent[mode], alpha).
  themes: {
    paper: {
      line: { light: "rgba(33, 33, 33, 0.14)", dark: "rgba(227, 227, 227, 0.14)" }, // text.primary @ 0.14
      fill: { light: "rgba(33, 33, 33, 0.025)", dark: "rgba(227, 227, 227, 0.025)" }, // text.primary @ 0.025
      hovered: { light: "rgba(0, 0, 0, 0.055)", dark: "rgba(255, 255, 255, 0.07)" }, // = chrome.hover
      pressed: { light: "rgba(0, 0, 0, 0.11)", dark: "rgba(255, 255, 255, 0.14)" }, // = chrome.pressed
      chosen: { light: "rgba(51, 115, 242, 0.16)", dark: "rgba(51, 115, 242, 0.3)" }, // accent @ 0.16 light / 0.30 dark (with the keyboard)
      chosenInactive: { light: "rgba(51, 115, 242, 0.1)", dark: "rgba(51, 115, 242, 0.2)" }, // accent @ 0.10 light / 0.20 dark
      mark: { light: "rgba(51, 115, 242, 0.85)", dark: "rgba(51, 115, 242, 0.85)" }, // accent @ 0.85
      groundRest: { light: "rgba(33, 33, 33, 0.06)", dark: "rgba(227, 227, 227, 0.06)" }, // text.primary @ 0.06
      groundHover: { light: "rgba(0, 0, 0, 0.055)", dark: "rgba(255, 255, 255, 0.07)" }, // = chrome.hover
      groundPressed: { light: "rgba(0, 0, 0, 0.11)", dark: "rgba(255, 255, 255, 0.14)" }, // = chrome.pressed
      groundOn: { light: "rgba(33, 33, 33, 0.15)", dark: "rgba(227, 227, 227, 0.15)" }, // text.primary @ 0.15
      edgeControl: { light: "rgba(33, 33, 33, 0.3)", dark: "rgba(227, 227, 227, 0.3)" }, // text.primary @ 0.3
      edgeControlHovered: { light: "rgba(33, 33, 33, 0.5)", dark: "rgba(227, 227, 227, 0.5)" }, // text.primary @ 0.5
      accentStrong: { light: "rgba(51, 115, 242, 0.75)", dark: "rgba(51, 115, 242, 0.75)" }, // accent @ 0.75
      accentSoft: { light: "rgba(51, 115, 242, 0.45)", dark: "rgba(51, 115, 242, 0.45)" }, // accent @ 0.45
      dropHighlight: { light: "rgba(51, 115, 242, 0.18)", dark: "rgba(51, 115, 242, 0.18)" }, // accent @ 0.18 (Tints.dropHighlight)
      sliderTrack: { light: "rgba(33, 33, 33, 0.12)", dark: "rgba(227, 227, 227, 0.12)" }, // text.primary @ 0.12
      primaryFill: { light: "#316FEA", dark: "#316FEA" }, // = accentFill
    },
    newsprint: {
      line: { light: "rgba(51, 51, 49, 0.14)", dark: "rgba(214, 214, 208, 0.14)" }, // text.primary @ 0.14
      fill: { light: "rgba(51, 51, 49, 0.025)", dark: "rgba(214, 214, 208, 0.025)" }, // text.primary @ 0.025
      hovered: { light: "rgba(0, 0, 0, 0.055)", dark: "rgba(255, 255, 255, 0.07)" }, // = chrome.hover
      pressed: { light: "rgba(0, 0, 0, 0.11)", dark: "rgba(255, 255, 255, 0.14)" }, // = chrome.pressed
      chosen: { light: "rgba(179, 64, 46, 0.16)", dark: "rgba(224, 114, 88, 0.3)" }, // accent @ 0.16 light / 0.30 dark (with the keyboard)
      chosenInactive: { light: "rgba(179, 64, 46, 0.1)", dark: "rgba(224, 114, 88, 0.2)" }, // accent @ 0.10 light / 0.20 dark
      mark: { light: "rgba(179, 64, 46, 0.85)", dark: "rgba(224, 114, 88, 0.85)" }, // accent @ 0.85
      groundRest: { light: "rgba(51, 51, 49, 0.06)", dark: "rgba(214, 214, 208, 0.06)" }, // text.primary @ 0.06
      groundHover: { light: "rgba(0, 0, 0, 0.055)", dark: "rgba(255, 255, 255, 0.07)" }, // = chrome.hover
      groundPressed: { light: "rgba(0, 0, 0, 0.11)", dark: "rgba(255, 255, 255, 0.14)" }, // = chrome.pressed
      groundOn: { light: "rgba(51, 51, 49, 0.15)", dark: "rgba(214, 214, 208, 0.15)" }, // text.primary @ 0.15
      edgeControl: { light: "rgba(51, 51, 49, 0.3)", dark: "rgba(214, 214, 208, 0.3)" }, // text.primary @ 0.3
      edgeControlHovered: { light: "rgba(51, 51, 49, 0.5)", dark: "rgba(214, 214, 208, 0.5)" }, // text.primary @ 0.5
      accentStrong: { light: "rgba(179, 64, 46, 0.75)", dark: "rgba(224, 114, 88, 0.75)" }, // accent @ 0.75
      accentSoft: { light: "rgba(179, 64, 46, 0.45)", dark: "rgba(224, 114, 88, 0.45)" }, // accent @ 0.45
      dropHighlight: { light: "rgba(179, 64, 46, 0.18)", dark: "rgba(224, 114, 88, 0.18)" }, // accent @ 0.18 (Tints.dropHighlight)
      sliderTrack: { light: "rgba(51, 51, 49, 0.12)", dark: "rgba(214, 214, 208, 0.12)" }, // text.primary @ 0.12
      primaryFill: { light: "#B3402E", dark: "#B45A45" }, // = accentFill
    },
    classic: {
      line: { light: "rgba(32, 34, 36, 0.14)", dark: "rgba(230, 230, 230, 0.14)" }, // text.primary @ 0.14
      fill: { light: "rgba(32, 34, 36, 0.025)", dark: "rgba(230, 230, 230, 0.025)" }, // text.primary @ 0.025
      hovered: { light: "#F0F4F5", dark: "#333537" }, // = chrome.hover
      pressed: { light: "rgba(0, 0, 0, 0.11)", dark: "rgba(255, 255, 255, 0.14)" }, // = chrome.pressed
      chosen: { light: "rgba(0, 125, 156, 0.16)", dark: "rgba(80, 183, 224, 0.3)" }, // accent @ 0.16 light / 0.30 dark (with the keyboard)
      chosenInactive: { light: "rgba(0, 125, 156, 0.1)", dark: "rgba(80, 183, 224, 0.2)" }, // accent @ 0.10 light / 0.20 dark
      mark: { light: "rgba(0, 125, 156, 0.85)", dark: "rgba(80, 183, 224, 0.85)" }, // accent @ 0.85
      groundRest: { light: "rgba(32, 34, 36, 0.06)", dark: "rgba(230, 230, 230, 0.06)" }, // text.primary @ 0.06
      groundHover: { light: "#F0F4F5", dark: "#333537" }, // = chrome.hover
      groundPressed: { light: "rgba(0, 0, 0, 0.11)", dark: "rgba(255, 255, 255, 0.14)" }, // = chrome.pressed
      groundOn: { light: "rgba(32, 34, 36, 0.15)", dark: "rgba(230, 230, 230, 0.15)" }, // text.primary @ 0.15
      edgeControl: { light: "rgba(32, 34, 36, 0.3)", dark: "rgba(230, 230, 230, 0.3)" }, // text.primary @ 0.3
      edgeControlHovered: { light: "rgba(32, 34, 36, 0.5)", dark: "rgba(230, 230, 230, 0.5)" }, // text.primary @ 0.5
      accentStrong: { light: "rgba(0, 125, 156, 0.75)", dark: "rgba(80, 183, 224, 0.75)" }, // accent @ 0.75
      accentSoft: { light: "rgba(0, 125, 156, 0.45)", dark: "rgba(80, 183, 224, 0.45)" }, // accent @ 0.45
      dropHighlight: { light: "rgba(0, 125, 156, 0.18)", dark: "rgba(80, 183, 224, 0.18)" }, // accent @ 0.18 (Tints.dropHighlight)
      sliderTrack: { light: "rgba(32, 34, 36, 0.12)", dark: "rgba(230, 230, 230, 0.12)" }, // text.primary @ 0.12
      primaryFill: { light: "#007D9C", dark: "#327894" }, // = accentFill
    },
    financialTimes: {
      line: { light: "rgba(51, 48, 46, 0.14)", dark: "rgba(233, 234, 235, 0.14)" }, // text.primary @ 0.14
      fill: { light: "rgba(51, 48, 46, 0.025)", dark: "rgba(233, 234, 235, 0.025)" }, // text.primary @ 0.025
      hovered: { light: "rgba(0, 0, 0, 0.05)", dark: "rgba(255, 255, 255, 0.07)" }, // = chrome.hover
      pressed: { light: "rgba(0, 0, 0, 0.1)", dark: "rgba(255, 255, 255, 0.14)" }, // = chrome.pressed
      chosen: { light: "rgba(13, 118, 128, 0.16)", dark: "rgba(20, 189, 204, 0.3)" }, // accent @ 0.16 light / 0.30 dark (with the keyboard)
      chosenInactive: { light: "rgba(13, 118, 128, 0.1)", dark: "rgba(20, 189, 204, 0.2)" }, // accent @ 0.10 light / 0.20 dark
      mark: { light: "rgba(13, 118, 128, 0.85)", dark: "rgba(20, 189, 204, 0.85)" }, // accent @ 0.85
      groundRest: { light: "rgba(51, 48, 46, 0.06)", dark: "rgba(233, 234, 235, 0.06)" }, // text.primary @ 0.06
      groundHover: { light: "rgba(0, 0, 0, 0.05)", dark: "rgba(255, 255, 255, 0.07)" }, // = chrome.hover
      groundPressed: { light: "rgba(0, 0, 0, 0.1)", dark: "rgba(255, 255, 255, 0.14)" }, // = chrome.pressed
      groundOn: { light: "rgba(51, 48, 46, 0.15)", dark: "rgba(233, 234, 235, 0.15)" }, // text.primary @ 0.15
      edgeControl: { light: "rgba(51, 48, 46, 0.3)", dark: "rgba(233, 234, 235, 0.3)" }, // text.primary @ 0.3
      edgeControlHovered: { light: "rgba(51, 48, 46, 0.5)", dark: "rgba(233, 234, 235, 0.5)" }, // text.primary @ 0.5
      accentStrong: { light: "rgba(13, 118, 128, 0.75)", dark: "rgba(20, 189, 204, 0.75)" }, // accent @ 0.75
      accentSoft: { light: "rgba(13, 118, 128, 0.45)", dark: "rgba(20, 189, 204, 0.45)" }, // accent @ 0.45
      dropHighlight: { light: "rgba(13, 118, 128, 0.18)", dark: "rgba(20, 189, 204, 0.18)" }, // accent @ 0.18 (Tints.dropHighlight)
      sliderTrack: { light: "rgba(51, 48, 46, 0.12)", dark: "rgba(233, 234, 235, 0.12)" }, // text.primary @ 0.12
      primaryFill: { light: "#0D7680", dark: "#0A838E" }, // = accentFill
    },
  },
};

// MARK: Daylight (ManifoldCore/Daylight.swift) and the backdrop it lights (Backdrop.swift)

export const daylight = {
  reference: 5500,   // Daylight.reference: the temperature the backdrop's colours were chosen under (K)
  strength: 0.18,    // Daylight.strength: how far toward the light's own colour a colour goes, at most
  neutral: { red: 1, green: 1, blue: 1, elevation: 90, kelvin: 5500 }, // Cast.neutral: no cast
  horizonKelvin: 2700,  // the sun at the horizon
  highKelvin: 6400,     // what a high sun tends to: 2700 + 3700 × (1 − e^(−elevation / 18))
  elevationScale: 18,
  nightKelvin: 7000,    // the sky's blue, from the end of civil twilight (−6°) on
  nightWeight: 0.5,     // …at half strength: the night's "dim cool blue"
  twilightEnd: -6,      // degrees; from 0° down to it, kelvin and weight ease by smoothstep
  relightEvery: 300,    // seconds between looks at the light (Backdrop.swift:70), and on wake
  relightFade: 4,       // seconds a change of light cross-fades over (Backdrop.swift:86)
  redrawFade: 0.6,      // seconds a change of theme or tint cross-fades over
  // Where: Daylight.place(for: TimeZone.current) — the zone's city in /usr/share/zoneinfo/zone.tab
  // (no asking for the Mac's location); failing that, latitude 40°, longitude = the zone's standard
  // offset in seconds / 240.
  fallbackLatitude: 40,
};

/** The sun's elevation above the horizon, in degrees (Daylight.elevation: NOAA's short form). */
export function elevation(date, latitudeDeg, longitudeDeg) {
  const rad = Math.PI / 180;
  // Days since J2000.0.
  const n = date.getTime() / 1000 / 86400 + 2440587.5 - 2451545.0;
  const g = (357.529 + 0.98560028 * n) * rad;
  const q = 280.459 + 0.98564736 * n;
  const lambda = (q + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * rad;
  const epsilon = (23.439 - 0.00000036 * n) * rad;
  const ra = Math.atan2(Math.cos(epsilon) * Math.sin(lambda), Math.cos(lambda));
  const decl = Math.asin(Math.sin(epsilon) * Math.sin(lambda));
  const gmst = (18.697374558 + 24.06570982441908 * n) * 15 * rad;
  const hour = gmst + longitudeDeg * rad - ra;
  const phi = latitudeDeg * rad;
  return Math.asin(Math.sin(phi) * Math.sin(decl) + Math.cos(phi) * Math.cos(decl) * Math.cos(hour)) / rad;
}

/**
 * The light's colour temperature with the sun at elevation `e`, and how much of it shows
 * (Daylight.light): low sun warm (2700 K at the horizon), high sun toward 6400 K; through civil
 * twilight (0° to −6°) the sky's blue takes over, and the night keeps it (7000 K), half as strong.
 */
export function light(e) {
  if (e >= 0) return { kelvin: 2700 + 3700 * (1 - Math.exp(-e / 18)), weight: 1 };
  const night = 7000.0;
  if (e <= -6) return { kelvin: night, weight: 0.5 };
  const t = -e / 6;
  const s = t * t * (3 - 2 * t);
  return { kelvin: 2700 + (night - 2700) * s, weight: 1 - 0.5 * s };
}

/**
 * A blackbody's colour at `kelvin`, in linear sRGB with Y = 1 (Daylight.rgb): the Planckian
 * locus (Krystek's fit, 1000–15000 K) in CIE 1960 UCS, to xy, to XYZ, to sRGB.
 */
export function kelvinRGB(kelvin) {
  const t = Math.min(15000, Math.max(1000, kelvin));
  const u = (0.860117757 + 1.54118254e-4 * t + 1.28641212e-7 * t * t) / (1 + 8.42420235e-4 * t + 7.08145163e-7 * t * t);
  const v = (0.317398726 + 4.22806245e-5 * t + 4.20481691e-8 * t * t) / (1 - 2.89741816e-5 * t + 1.61456053e-7 * t * t);
  const d = 2 * u - 8 * v + 4;
  const x = 3 * u / d, y = 2 * v / d;
  const X = x / y, Y = 1.0, Z = (1 - x - y) / y;
  return [
    Math.max(0, 3.2406 * X - 1.5372 * Y - 0.4986 * Z),
    Math.max(0, -0.9689 * X + 1.8758 * Y + 0.0415 * Z),
    Math.max(0, 0.0557 * X - 0.2040 * Y + 1.0570 * Z),
  ];
}

/**
 * The cast at `date` from a place (Daylight.cast): a multiplier for each LINEAR channel.
 * The light's colour over the reference's (5500 K), per channel, the brightest made 1 (so a
 * cast only ever takes light away); then mixed in by s = strength × weight:
 *   k = 1 − s + s × f.
 * By day s = 0.18; at night f is 7000 K's — red and green under blue — and s = 0.09: the
 * "dim cool blue" is nothing more than that, a faint cut of red and green.
 */
export function cast(date, latitudeDeg, longitudeDeg) {
  const e = elevation(date, latitudeDeg, longitudeDeg);
  const { kelvin: k, weight } = light(e);
  const c = kelvinRGB(k), r = kelvinRGB(daylight.reference);
  let f = [c[0] / r[0], c[1] / r[1], c[2] / r[2]];
  const top = Math.max(...f);
  f = f.map((x) => x / top);
  const s = daylight.strength * weight;
  return { red: 1 - s + s * f[0], green: 1 - s + s * f[1], blue: 1 - s + s * f[2], elevation: e, kelvin: k };
}

/**
 * How BackdropView applies a cast (BackdropView.lit, Backdrop.swift:100–105): each channel c of
 * a backdrop colour (0…1, gamma-encoded) → pow(pow(c, 2.2) × k, 1 / 2.2), k the cast's
 * multiplier for that channel; alpha kept. (A plain 2.2 gamma, not sRGB's curve.) Only the
 * backdrop's wash and pools are lit — no tile, text or chrome.
 */
export function lit([r, g, b], k = daylight.neutral) {
  const f = (v, m) => Math.pow(Math.pow(v, 2.2) * m, 1 / 2.2);
  return [f(r, k.red), f(g, k.green), f(b, k.blue)];
}

// Generic RGB → linear sRGB, fitted from AppKit on macOS 27.2 (NSColor(calibratedRed:…) of each
// primary read back in extended sRGB); Generic RGB's own curve is a plain gamma 1.8.
const GENERIC_RGB_TO_LINEAR_SRGB = [
  [1.025241, -0.026545, 0.001304],
  [0.019401, 0.948009, 0.032590],
  [-0.001762, -0.001435, 1.003197],
];

/**
 * NSColor(calibratedHue: h, saturation: s, brightness: b) as sRGB [r, g, b], 0…1 — what the
 * backdrop's stops and pools are. Checked against AppKit's own conversion: to 1e-6 a channel
 * for brightness above 0.05, within 0.006 nearer black (no backdrop colour is that dark).
 */
export function calibratedHSB(h, s, b) {
  const i = Math.floor(h * 6) % 6, f = h * 6 - Math.floor(h * 6);
  const p = b * (1 - s), q = b * (1 - s * f), t = b * (1 - s * (1 - f));
  const g = [[b, t, p], [q, b, p], [p, b, t], [p, q, b], [t, p, b], [b, p, q]][i].map((v) => Math.pow(v, 1.8));
  return GENERIC_RGB_TO_LINEAR_SRGB.map((row) => {
    const v = Math.min(1, Math.max(0, row[0] * g[0] + row[1] * g[1] + row[2] * g[2]));
    return v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
  });
}

/** [r, g, b] 0…1 as "#RRGGBB". */
export function toHex(rgb) {
  return "#" + rgb.map((v) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, "0")).join("").toUpperCase();
}

/**
 * The day's turn and pools (BackdropView.shade, Backdrop.swift:160–198): a generator seeded by
 * the day (UTC days since 1970) gives, in this order: the hue turn (±0.03), then for each of the
 * two pools the index (0…2) of the stop whose hue it takes (drawn for the first pool too, which
 * is the tint's and ignores it), its centre x, y (fractions of the view, y UP from the bottom)
 * and its radius (0.3…0.6 of the view's LONGER side).
 */
export function backdropDay(date = new Date()) {
  const mask = (1n << 64n) - 1n;
  const day = BigInt(Math.floor(date.getTime() / 1000 / 86400));
  let state = (day * 2654435761n + 97n) & mask;
  const next = () => {
    state = (state * 6364136223846793005n + 1442695040888963407n) & mask;
    return Number(state >> 11n) / 2 ** 53;
  };
  const turn = (next() - 0.5) * 0.06;
  const pools = [];
  for (let i = 0; i < 2; i++) {
    const stop = Math.floor(next() * 3);
    pools.push({ stop, x: next(), y: next(), r: 0.3 + 0.3 * next() });
  }
  return { turn, pools };
}

/**
 * The backdrop's colours for a theme: the wash's four stops and the two pools, turned by the
 * day and lit by the cast, as sRGB "#RRGGBB".
 *
 * Drawn (Backdrop.swift:33–45, 118–130, 197):
 *  - the wash: a linear gradient from the upper left corner to the lower right, stops at
 *    0, 0.4, 0.75, 1 (CSS: linear-gradient(to bottom right, c0 0%, c1 40%, c2 75%, c3 100%));
 *  - over it two radial pools, each a circle at (x, 1 − y) of radius r × max(width, height),
 *    from its colour at alpha 0.5 at the centre to alpha 0 at the edge;
 *    pool 0 is the tint's: calibratedHSB(tint accent's hue, tintPool.saturation × tint accent's
 *    saturation, tintPool.brightness), hue and saturation read from the accent in sRGB;
 *    pool 1 is the wash's: calibratedHSB(its stop's hue + turn, pool.saturation, pool.brightness).
 *  Each hue is (h + turn + 1) mod 1. Under the window's tiles and the sidebar.
 */
export function backdropColors(themeKey, { dark = false, tint = "theme", date = new Date(), cast: k = daylight.neutral } = {}) {
  const wash = themes[themeKey].backdrop[dark ? "dark" : "light"];
  const { turn, pools } = backdropDay(date);
  const turned = (h) => (h + turn + 1) % 1;
  const stops = wash.stops.map(([h, s, b]) => toHex(lit(calibratedHSB(turned(h), s, b), k)));
  const accent = tintOf(themeKey, tint).accent[dark ? "dark" : "light"];
  const [th, ts] = hueSaturation(accent);
  const colors = [
    calibratedHSB(th, wash.tintPool.saturation * ts, wash.tintPool.brightness),
    calibratedHSB(turned(wash.stops[pools[1].stop][0]), wash.pool.saturation, wash.pool.brightness),
  ];
  return {
    stops,
    locations: [0, 0.4, 0.75, 1],
    pools: pools.map((p, i) => ({ color: toHex(lit(colors[i], k)), alpha: [0.5, 0], x: p.x, y: 1 - p.y, radius: p.r })),
  };
}

/** A "#RRGGBB" colour's hue and saturation (HSB), 0…1, as NSColor.getHue reads them. */
function hueSaturation(hex) {
  const v = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(v >> 16) & 255, (v >> 8) & 255, v & 255].map((x) => x / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  if (d === 0) return [0, 0];
  const h = max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, d / max];
}

// MARK: The focus ring and a tile's card (GridView.swift)

export const focusRing = {
  // FocusRingView (GridView.swift:3225–3305): a CAShapeLayer over the focused tile's whole card
  // (its bar and its body; frame = the card's, :799–808), above everything, taking no clicks.
  lineWidth: 2,       // :3236 ring.lineWidth
  inset: 1,           // :3261 its path is the card's rect inset by 1, so the 2pt stroke's outer edge is the card's own edge
  outset: 0,          // nothing drawn outside the card at rest (the glow alone spreads past it)
  cornerRadius: 10,   // :3261 Radius.surface (Design.swift:24)
  fill: null,         // :3235 ring.fillColor = nil
  alpha: 0.75,        // :3243 EdgeColor.accentStrong = the tint's accent at 0.75 (Design.swift:139)
  // The colour for each theme with its own accent (Tint.theme); for another tint, withAlpha(tintOf(theme, tint).accent[mode], 0.75).
  color: {
    paper: { light: "rgba(51, 115, 242, 0.75)", dark: "rgba(51, 115, 242, 0.75)" },
    newsprint: { light: "rgba(179, 64, 46, 0.75)", dark: "rgba(224, 114, 88, 0.75)" },
    classic: { light: "rgba(0, 125, 156, 0.75)", dark: "rgba(80, 183, 224, 0.75)" },
    financialTimes: { light: "rgba(13, 118, 128, 0.75)", dark: "rgba(20, 189, 204, 0.75)" },
  },
  // Its glow: the ring's own shadow, in the ring's colour, unseen at rest.
  glow: { color: "the ring's (accent @ 0.75)", radius: 8, x: 0, y: 0, opacity: 0 }, // :3237–3239, :3244 (shadowRadius 8 ≈ a CSS blur of 16)
  // Arrived at (a link followed, a block gone to: markArrival, :1350–1360): the ring swells and glows and settles back.
  pulse: {
    duration: 0.6,                 // :3300
    keyTimes: [0, 0.3, 1],         // :3297
    lineWidth: [2, 5, 2],          // :3290
    glowOpacity: [0, 0.9, 0],      // :3292 shadowOpacity
    timing: ["ease-out", [0.2, 0.9, 0.3, 1.15]], // :3298 Motion.appear, then Motion.settle (it overshoots a little)
    keptWithReducedMotion: true,   // :3294 swelling isn't travel
  },
  // Moving with its tile, or to another: bounds, position and path together.
  glide: { duration: 0.24, timing: [0.2, 0.9, 0.3, 1] }, // :3282 GridView.glide (:110) = Motion.spatial; Motion.travel
  // A maximized tile has no ring; arrived at, it gets one for 0.6s, inset 8 from the grid's edges (:1352–1356).
  hiddenWhenMaximized: true,
};

/** A tile's card (GridView.swift:148–158): its bar at the top, its content beneath. Also focusRing.tile. */
export const tile = {
  barHeight: 30,      // :151 GridView.barHeight
  gap: 6,             // :152 GridView.gap: between tiles, and the column dividers' width
  inset: 8,           // :153 GridView.inset: round the grid
  cornerRadius: 10,   // Radius.surface: the card's (:1438); the body rounded at its bottom corners only (:181–183)
  summarizeBelow: 80, // :156 under this much content showing, its summary card stands in
  collapseBelow: 24,  // :158 under this, its bar alone
  travelsOver: 40,    // :958
  bar: "chrome.bar ?? chrome.panel",                // Theme.tileBar
  barFocused: "chrome.barFocused ?? chrome.bar ?? chrome.panel", // Theme.tileBarFocused
  barInk: "chrome.barInk ?? text.secondary",        // Theme.barInk
  // Its shadow (layoutShadows, :1411–1455): Elevation.tile's radius and offset, in the theme's
  // backdrop.tileShadow colour and opacity; in the light only (opacity 0 in the dark), none while a tile is maximized.
  shadow: { radius: 10, x: 0, y: 4, color: "backdrop.tileShadow.color", opacity: "backdrop.tileShadow.opacity", dark: 0 },
  // Its hairline (backdrop.tileEdge, nil in these four themes): 1pt stroked on the card's outline, the outer half seen (:1435–1436).
  edgeWidth: 1,
};
focusRing.tile = tile;
