# YakShaver: marketing brief for the anthem ad

Facts for the 76 s ad film, checked on 2026-11-15.
Each fact has a source.
The full fact sheet from 2026-10-28 is `~/Movies/ssw-product-films/brands/yakshaver/docs/brief.md`.
This file keeps only what the film uses, and the facts that changed since then.

Source short names:

- **GUIDE**: YakShaver Brand Guide V6, https://yakshaver.ai/YakShaver/YakShaver-Brand-Guide-V6.pdf (16 pages).
- **SITE**: https://yakshaver.ai, its CSS `_next/static/css/802e537ca03e355a.css`, and the site repo `SSWConsulting/SSW.Products` (`content/pages/YakShaver/home.json`).
- **MEDIA**: https://yakshaver.ai/media (kit updated 2026-10-22).
- **DESKTOP**: `SSWConsulting/SSW.YakShaver.Desktop` at `3a1cd10` (2026-09-18), public, AGPL-3.0-only.
- **DEMO**: https://demo.yakshaver.ai, the public "Report an issue" widget (`portal.yakshaver.ai/widget/r/...?demo=1`).

## Colours

| use | hex | source |
|---|---|---|
| accent (Brand Red) | `#CC4141` | GUIDE "Color"; SITE `--color-ssw-red` |
| charcoal | `#333333` | GUIDE; the light-background logos |
| stone (secondary text) | `#797979` | GUIDE; SITE `text-[#797979]` |
| ash | `#AAAAAA` | GUIDE |
| page background (dark) | `#222222` | SITE `--color-gray-light`, `body.bg-gray-light` |
| cards (dark) | `#131313` | SITE `bg-[#131313]` |
| other greys | `#1F1F1F`, `#141414`, `#363636`, `#0E0E0E` | SITE CSS |
| YakShaver gradient | `#F6983D` > `#CC4141` > `#AF33E4` > `#4648FF` | GUIDE "YakShaver Gradient". Rule: 1/3 of the screen or less |
| hero word gradient | `#E34F4F` 30% > `#D699FB` 80% > `#FF778E` | SITE hero H1 rotating word |
| "done" green | Tailwind green-300/400 | DESKTOP `Cloud360LiveView.tsx` "Processing complete" |

GUIDE page 13 labels the gradient end stop `#4648FF`, but its swatch renders near-black. The film uses `#4648FF` only as a soft wash blob.

## Fonts

- Inter, the only brand font. GUIDE "Typography": "Inter. Our official typeface". MEDIA: "The official font used in YakShaver is Inter".
- SITE serves Inter with `next/font/google` at 400, 600 and 700. The film uses the Inter 4.001 variable TTF (SIL OFL 1.1), `assets/fonts/InterVariable.ttf`.
- GUIDE heading scale: H1 700, H2 to H6 600.
- SITE serves no monospace font. Code panels use IBM Plex Mono (OFL 1.1).

## Logo and mascot

- Logo: the V2 lockups from MEDIA, with no `< >` brackets. GUIDE V6 and the SITE nav use this form.
  - `assets/brand/horizontal-light.svg` (MEDIA `YakShaver-Horinzontal-V2.svg`, red + `#333333`) on light.
  - `assets/brand/horizontal-dark.svg` (MEDIA `YakShaver-Horizontal-Color-Darkmode-V2.svg`, red + white) on dark.
  - Vertical: `vertical-light.svg`, `vertical-dark.svg`, `vertical-white.svg` (MEDIA V2).
  - Icons: `icon-red.svg`, `icon-white.svg`, `icon-charcoal.svg` (byte-identical to SITE and DESKTOP).
- Logo rules (GUIDE): clear space equal to the height of the "Y"; no shadow, no stretch, no retyping, no recolouring, no low-contrast background.
- Mascot: **Jack the Yak** (GUIDE page 16, MEDIA). A 3D brown yak in a red T-shirt and black trousers. The sheet has 4 reaction heads: a big smile, thinking (hoof on chin), surprised, and a smug smile.
  - File: `assets/jack/character-sheet.png` (MEDIA `yakshaver-jack-character-sheet-v2.png`).
  - GUIDE and MEDIA allow new images of Jack from the sheet, with this prompt: "Use the provided character sheet as the exact character reference. Do not change colors, facial features, proportions, or style."
  - Other site art: `assets/jack/sad-yak-site.png` (a sad yak at a laptop, SITE `public/YakShaver/sad-yak.png`), `assets/jack/surprised-laptop.jpg` (MEDIA).

## Message strings

| string | source |
|---|---|
| "Make the perfect {PBI \| task \| ticket \| email} in seconds" | SITE hero H1 |
| "Stop wasting time writing bug reports manually." | SITE hero byline |
| "See it" / "Shave it" / "Solve it" | SITE "How YakShaver works" step labels; GUIDE merch and stage |
| "an AI agent to help you trim the fluff and get straight to the point" | SITE `/about` |
| "tackling the small, tedious tasks that stand between you and real progress" | GUIDE "Introduction" (what "yak shaving" means) |
| "so developers can stay focused on what really matters" | GUIDE "Introduction" |
| "anyone in your organization can report issues" | SITE pricing copy |
| "Try it now" (links to demo.yakshaver.ai) | SITE hero button |
| "Powered by SSW" | SITE home bento |
| page title "YakShaver - AI tool to quickly create perfect PBIs, tasks, and bug reports in GitHub, Azure DevOps, Jira and more" | SITE `<title>`, changed since 2026-10-28 |

Say "in seconds", as the site does. Keep "30 seconds" off screen: only repo descriptions and a video title use it.

## How the product works (DESKTOP code, SITE docs)

1. **See it.** The reporter records the screen and talks: in the desktop app, YakShaver Anywhere (browser), Teams, Snagit, or the DEMO widget ("Record with camera", "Upload a video").
2. **Shave it.** The workflow stages, in order (DESKTOP `WorkflowProgressPanel.tsx`): Uploading Video, Downloading Video, Converting Audio, Transcribing, Optimizing Transcript, Analyzing Transcript, Selecting Prompt, Executing Task, Updating Metadata. "Executing Task" is the AI agent calling the backlog through MCP.
3. **Solve it.** The work item lands in the backlog (DESKTOP `backend/constants/prompts.ts`):
   - a title with the template emoji: `🐛 Login button does not respond to clicks`;
   - the label "YakShaver";
   - the first 3 lines: `Cc: <members>`, `Hi <members>`, `[🟥 Watch the video (42 sec)](<link>)`;
   - a bug: `### Pain`, `### Acceptance Criteria`, `### Reproduce Steps`;
   - a feature: `### Pain`, `### Suggested Solution`, `### Acceptance Criteria`, `### Tasks`.
4. The DESKTOP app shows a burst of scissors confetti when the agent creates the issue (`cloud360/ScissorsConfetti.tsx`).

YakShaver transcribes what the person says. It does not read the screen (SITE docs `giving-context.mdx`). Show speech turning into text.

## Destinations (what works today)

| destination | status | source |
|---|---|---|
| GitHub | works | SITE home, docs |
| Azure DevOps | works | SITE home, docs |
| Email | works (since v0.91.0) | SITE blog 2026-09-28 |
| Zendesk | works in YakShaver Anywhere (v0.96.0, 2026-10-19) | SITE blog `updates-october-2026-month-to-date` |
| Jira Cloud | works in YakShaver Anywhere, through Atlassian's MCP server | SITE docs `connect-jira-cloud` |

The SITE `/roadmap` still lists Jira and Zendesk as "In Progress". The film names only GitHub, Azure DevOps and email.

## Proof points (2026-11-15)

| claim | value | source |
|---|---|---|
| yaks shaved | 5,766 | `GET https://yakshaver.ai/api/leaderboard` returns `{"totalShaves":5766}`; SITE home counter "Yaks Shaved" |
| free plan | Starter: free, 15 shaves per month | SITE `/pricing` |
| free apps | the desktop app (Windows, Mac) and the Teams extension are free | SITE `/install` |
| releases | portal v0.96.8 (2026-11-13) | `SSWConsulting/SSW.YakShaver` releases |
| GitHub stars | Desktop 8, SSW.YakShaver 7 | `gh api`. Too low to show |

Check the shave count again on the day of the master.

## Do not claim

- "Open source" for YakShaver: the service repo is private. Only the desktop app is AGPL.
- A user count, a named customer, a certificate, or "enterprise-grade".
- That the AI sees or reads the screen.
- A time number ("30 seconds", "90%"). Say "in seconds".
- Jira or Zendesk on screen (Anywhere only, and the roadmap disagrees).
- A native phone app.
- Real staff names on demo cards. Use roles, and the Northwind365 demo site.

## Ad platform rules

From the TinaCMS brief (`../tinacms/docs/marketing-brief.md`), unchanged:

- Google ABCD: the brand inside 5 s, the brand and the call to action on screen. The film has no voice, so the sonic logo is the audio brand.
- Meta Reels safe zone: top 14%, bottom 35%, sides 6% (third-party guides).
- LinkedIn: under 30 fps; check the current spec before upload.
- SSW rule "Audio - Do you use sound effects to capture your audience's attention?": pops on pop-ups, clicks on milestones only.

## Decisions from Hark (2026-11-15)

- The reporter audience is "everyone else": "Built for Developers. And everyone else."
- The real UI comes from the DEMO widget and YakShaver Anywhere.
- The end-card button says "Try it now".
- The 2 people are 3D cartoon characters in Jack's style.

## The demo site (Hark, 2026-11-15)

The bug in the film lives on **northwind365.com**, SSW's public demo site for its Clean Architecture template (repo `SSWConsulting/Northwind365.Website`, last change 2024-11-28).
It has 2 real defects on 2026-11-15, so the demo needs no fake bug:

1. In "Where can I learn more about Clean Architecture?", the ".NET Template" button is solid red, but "Rules", "Training" and "Resources" are outlined, with underlined text.
2. The footer says "© Copyright 2024".

The recording shows both, and the narration asks for both fixes.
The shave goes to a private demo repo, so it makes no issue in an SSW repo.
