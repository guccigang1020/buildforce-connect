# Lucide → MUI Material Icons migration recipe

Replace ALL `lucide-react` imports/usages in your assigned files with
`@mui/icons-material` equivalents. @mui/material and @mui/icons-material are
installed. The MUI ThemeProvider is already wired.

## Rules
1. Import style: `import AddIcon from "@mui/icons-material/Add";` (one default
   import per icon — NOT the barrel import).
2. Sizing: Tailwind `h-* w-*` classes DO NOT size MUI SvgIcons reliably
   (emotion's `width/height: 1em` wins). Convert size classes to the `sx` prop:
   h-3→12, h-3.5→14, h-4→16, h-5→20, h-6→24, h-7→28, h-8→32.
   `<Plus className="h-4 w-4 text-primary" />` →
   `<AddIcon sx={{ fontSize: 16 }} className="text-primary" />`
   (color/margin/positioning classes STAY in className — currentColor works.)
3. Spinners: `<Loader2 className="h-4 w-4 animate-spin" />` →
   `<CircularProgress size={16} color="inherit" />` with
   `import CircularProgress from "@mui/material/CircularProgress";`
4. Keep `shrink-0`, `mt-0.5`, `me-1`, absolute-positioning classes in className.
5. RTL arrows: ArrowLeft→ArrowBack, ArrowRight→ArrowForward (visual direction
   preserved; do not flip).
6. After your files are done: remove the lucide import lines; `npx tsc --noEmit`
   must pass; screenshot your main pages via `node scripts/shot.mjs <path> <name> 1440`
   (+ `--login` where needed, creds below), LOOK at them (Read tool) and fix
   anything broken (giant icons = you missed a size conversion).

## Common mapping (choose the closest Material icon for anything not listed)
Plus→Add · X→Close · Search→Search · Check→Check · CheckCircle2→CheckCircle ·
Trophy→EmojiEvents · Coins→Paid · Lock→Lock · AlertTriangle→WarningAmber ·
AlertCircle→ErrorOutline · TrendingUp/Down→same names · Award→WorkspacePremium ·
Phone→Phone · Mail→MailOutline · Users→Group · User→Person · Clock→Schedule ·
MapPin→Place · Calendar→CalendarMonth · Building2→Apartment ·
ShieldCheck→VerifiedUser · HardHat→Engineering · Briefcase→Work ·
FileText→Description · Eye→Visibility · Send→Send · LogOut→Logout · Menu→Menu ·
LayoutDashboard→Dashboard · FolderOpen→FolderOpen · ClipboardList→Assignment ·
Receipt→ReceiptLong · Star→Star · Zap→Bolt · BadgeCheck→Verified · Gavel→Gavel ·
Hammer→Construction · ArrowLeft→ArrowBack · ArrowRight→ArrowForward ·
Inbox→Inbox · Camera→PhotoCamera · Sparkles→AutoAwesome · Globe2→Public ·
Trash2→Delete · FileCheck2→FactCheck · FileX2→HighlightOff ·
ExternalLink→OpenInNew · Activity→ShowChart · Headphones→SupportAgent ·
MessageCircle→ChatBubbleOutline · FileBarChart→Assessment ·
PaintRoller→FormatPaint · Wrench→Build · Layers→Layers ·
Flame→LocalFireDepartment · Smile→SentimentSatisfied · KeyRound→VpnKey ·
ClipboardCheck→AssignmentTurnedIn · TrendingDown→TrendingDown

## Logins for screenshots
contractor.demo@buildforce.dev / corp.demo@buildforce.dev (Demo2026!) ·
admin@buildforce.dev (BuildForce-Admin-2026!). Dev server runs on :8080 — do
NOT restart it. Do NOT git commit.
