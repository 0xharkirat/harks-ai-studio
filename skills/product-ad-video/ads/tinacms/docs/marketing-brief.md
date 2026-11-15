# TinaCMS promo video: brand, messaging, ad rules, music

Researched 2026-10-18. Local source root: a clone of the `tinacms/tina.io` repo (called `TIO/` below). Every claim has a file path or URL. Things I could not verify are marked UNVERIFIED.

---

## 1. Brand identity

### 1.1 Colours (exact hex)

Source: `TIO/app/global.css` (`:root` block, "Tina Design Library") and `TIO/tailwind.config.js` (`theme.extend.colors`).

| Role | Token | Hex |
|---|---|---|
| Brand primary (Tina orange) | `--brand-primary` / `orange-500` | `#EC4815` |
| Orange hover / text | `--brand-primary-hover` / `orange-600` | `#D13F13` |
| Orange light | `--brand-primary-light` / `orange-200` | `#FFD3C1` |
| Orange contrast (dark) | `--brand-primary-contrast` / `orange-800` | `#7A230B` |
| Orange gradient | `--brand-primary-gradient-start` to `-end` | `#FF724B` to `#D13F13` |
| Orange scale | `orange-50..950` | `#FFF8F3 #FFEDE4 #FFD3C1 #FFAB8B #FF724B #EC4815 #D13F13 #A5310F #7A230B #4C1507 #2F0D04` |
| Brand secondary (blue) | `--brand-secondary` / `blue-500` | `#0084FF` |
| Blue hover | `blue-600` | `#0574E4` |
| Blue light | `blue-50` | `#DCEEFF` |
| Blue contrast | `--brand-secondary-contrast` / `blue-900` | `#1D2C6C` |
| Blue scale | `blue-50..950` | `#DCEEFF #B4DBFF #85C5FE #4EABFE #2296FE #0084FF #0574E4 #0D5DBD #144696 #1D2C6C #241748` (950) |
| Tertiary (seafoam / mint) | `--brand-tertiary` / `seafoam-500` | `#93E9BE` |
| Seafoam light / contrast | `seafoam-50` / `seafoam-900` | `#EEFDF9` / `#214C3D` |
| Seafoam scale | `seafoam-50..950` | `#EEFDF9 #E9FBF4 #C1F5EB #CFF5E6 #B4EFD9 #99E9CB #93E9BE #72C39B #529C7B #39745C #214C3D #122A21` |
| Deep navy (legacy section "blue") | `--color-blue` | `#241748` (light variant `#31215E`) |
| Near-black | `--color-black` | `#1C1B2E` |
| Page background | `--neutral-background` | `#F8FAFC` (text `#0F172A`, secondary text `#64748B`) |
| Site theme-color meta | `app/layout.tsx` | `#E6FAF8` |
| Selection highlight | `--color-seafoam-dark` on `--color-blue-light` | `#B4F4E0` on `#31215E` |
| Heading blue (legacy `.headingLarge`) | `app/global.css` | `#00255B` |

Page background blob (the soft teal to sky wash behind every page): inline SVG `bg-blob-bg` in `TIO/tailwind.config.js`. Horizontal gradient stops `#53E9DD` (0) , `#68D7E4` (0.34), `#59BFF2` (0.59), `#4BA8FF` (1), masked by a vertical alpha fade (0.45 at top to 0 at bottom) over white. Applied in `TIO/components/SiteLayout.tsx` (`blob-bg ... bg-blob-bg bg-[length:100%_100%] bg-top bg-fixed`).

Not brand: `TIO/public/logo.svg` is the X (Twitter) logo, not Tina.

### 1.2 Gradient styles

Source: `TIO/components/util/CurlyBracketFormatter.tsx`, `TIO/components/ui/Button.tsx`, grep of `bg-linear-to-*` in `TIO/components`.

- Hero emphasis text: text wrapped in `{curly braces}` in the CMS gets `bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent` (`#FF724B` to `#D13F13`). Homepage hero title is `{Sites,} Docs and Llamas. No Dramas`, so only "Sites," is orange gradient. (`TIO/content/main/home.json`)
- Most common heading gradients: `bg-linear-to-br from-orange-400 via-orange-500 to-orange-600` (9 uses) and `from-blue-600 via-blue-800 to-blue-1000` (`#0574E4` to `#144696` to `#0D5DBD`, 7 uses), both clipped to text.
- Primary button: `bg-linear-to-br from-orange-400 to-orange-600`, white text.
- Blue button: `bg-linear-to-br from-blue-300 via-blue-400 to-blue-600`.
- Seafoam button (default): `bg-linear-to-br from-seafoam-50 to-seafoam-150` with orange-600 text.
- Banner strip: `from-[rgba(216,251,248,0.6)] to-[rgba(215,233,255,0.6)]` (mint to pale blue, 60% alpha, `backdrop-blur-sm`).
- Official orange backdrop (media kit): diagonal orange gradient, light `~#EB6C41` top-left through `#EC4815` centre to `~#C73314` bottom-right, with three pill-shaped mint-to-blue dashes (the "divider"). File: `TIO/public/img/brand-assets/background-min.png` (1620x756). Colours eyeballed from the image, not from source tokens.
- Official light backdrop: very pale mint (top-left) to sky blue (top-right) fading to white. File: `TIO/public/img/brand-assets/logo-black-on-background-min.png`.

### 1.3 Buttons

Source: `TIO/components/ui/Button.tsx`, `TIO/components/blocks/CodeButton/CodeButton.tsx`.

- Shape: `square` = `rounded-md` (6px), `pill` = `rounded-full`. Homepage CTAs use `square`.
- Type: IBM Plex Sans SemiBold (`font-ibm-plex`), `font-medium`, sizes: large `px-8 py-[12px] text-lg`, medium `px-6 py-[10px] text-base`.
- Variants: `orange` (gradient above, white text), `blue`, `white`, `seafoam`, `black` (`text-white border-black bg-black`), `ghostOutline` (`text-gray-900 border-black bg-transparent`), `orangeWithBorder`.
- Motion: `transition duration-150 ease-out`, `hover:-translate-y-px hover:-translate-x-px`, `active:translate-y-px`, hover adds `shadow`.
- Terminal-style "code button" (the `npx` command): white 50% fill, 1px `brand-primary` (`#EC4815`) border, `rounded-md`, leading `>` glyph, command in `font-mono text-sm`, orange square copy-icon tab on the right (`bg-brand-primary`, white icon). Reuse this for the npx beat.
- Shadows are blue-tinted: `0 1px 3px 0 rgb(20 70 150 / 0.07)`, panel `rgba(0,132,255,0.07..0.1)`.
- Radius scale: 2, 4, 6, 8, 12, 16, 24px (`tailwind.config.js`).

### 1.4 Fonts

Official statement, `TIO/content/main/media.json` and https://tina.io/media: "The official fonts used in Tina.io and TinaCMS are IBM Plex Sans for headings, Inter for body text, and Roboto Mono for code blocks".

Actual code (`TIO/components/styles/fontImports.css`, `TIO/app/global.css`, `TIO/tailwind.config.js`; no `next/font` is used, all are local `@font-face` from `TIO/public/fonts/`):
- Headings: `IBMPlexSans-SemiBold` (600) and `IBMPlexSans-Medium` (500) as `font-ibm-plex` / `font-ibm-plex-medium`. Files: `TIO/public/fonts/IBMPlexSans-SemiBold.woff2`, `IBMPlexSans-Medium.woff2`, `IBMPlexSans-Regular.ttf`.
- Body: Inter 400, 400 italic, 500, 500 italic, 700 (`TIO/public/fonts/Inter-*.woff2`). Default `font-sans`.
- Update 2026-11-07: the tina.io CSS now loads IBM Plex Sans SemiBold (headings, -0.025em), Inter (body) and IBM Plex Mono (code). The video uses exactly these.
- Code: site CSS actually loads `SourceCodePro-Regular` (`font-source-code-pro`, `TIO/public/fonts/SourceCodePro-Regular.woff2`), while the media page says Roboto Mono. Mismatch. For the video use Roboto Mono (the published brand rule) or Source Code Pro (what the site renders). Pick one and stay consistent.
- Also on disk: `tuner-medium.woff2`, `tunerweb-bold/regular.woff` (legacy display font, not in the current config).
- Type scale: H1 `text-4xl md:text-5xl lg:text-6xl` (36/48/60px), block H2 `text-3xl md:text-4xl lg:text-5xl`, body `text-lg text-gray-600` (`TIO/components/styles/typography.ts`). Hero subtext uses `text-neutral-text-secondary` (`#64748B`).

### 1.5 Logo and mascot assets (usable files)

All paths under `public/` in the `tinacms/tina.io` repo. I rendered these to confirm what each looks like.

Logos (vector):
| File | What it is |
|---|---|
| `svg/tina-extended-logo.svg` | BEST for the ad: orange llama + "tinacms" (bold "tina", light "cms"), viewBox 1020x254, fill `#EC4815` |
| `svg/tinaio-logo.svg` | orange llama + "tina.io", viewBox 712x199, fill `#EC4815` |
| `svg/tina-logo.svg` | big orange llama + "Tina" (capital T, geometric), viewBox 447x190, fill `#EC4815` |
| `svg/tina-cloud-wordmark.svg` | orange "TinaCloud" wordmark (no llama), fill `#EC4815` |
| `svg/logos/tina.svg` | llama silhouette only, orange `#EC4815`, 448x621 |
| `svg/logos/tina-white.svg` | same llama silhouette in white, for dark or orange backgrounds |
| `svg/tina-icon.svg` | llama silhouette, `fill="inherit"` (CSS-recolourable), 49x68, has `<title>Tina</title><desc>A proud llama</desc>` |
| `svg/tina-wordmark.svg` | blocky "TINA" caps, `fill="inherit"`, 89x23 (used in the nav) |
| `svg/llamaPin.svg` | llama inside a map-pin shape, orange |
| `img/brand-assets/llama.svg` | llama silhouette, fills `#EB4A24` / `#EB4924` |
| `svg/hero-background.svg`, `hero-bg.svg`, `grad-glow.svg`, `blob-1..6.svg`, `blob-bg.svg`, `clouds-1/2.svg`, `header-bg.svg` | decorative backgrounds |

Official media-kit logo (as shown on tina.io/media): BLACK llama silhouette + "tinacms" (bold "tina", light "cms") on the pale mint-to-sky background. File: `img/brand-assets/logo-black-on-background-min.png` (2604x1300). The orange variants above are what the live site header and footer use. The full SVG+PNG kit is a download (not in the repo): see 1.7.

Raster logos: `logo-black.png` (2400x2453, black llama), `img/Favicon.png` (430x430), `favicon/favicon.ico`, `og/tina-og.png` (1921x1081), `tina-credly-badge.png` (680x680).

Tina the llama (character art, PNG with alpha unless noted):
| File | Pose |
|---|---|
| `ai-llamas/tina-character-sheet.png` | 1024x1024, RGB (no alpha). Official reference sheet: 4 expression heads on orange circles, front/side/back full body. White fluffy llama, orange t-shirt, black rolled trousers, orange sneakers |
| `ai-llamas/Relax-Llama.png` | 580x776, rocking chair, hands behind head (homepage hero) |
| `ai-llamas/Peek-Llama.png` | 1384x1394, peeking (homepage "Markdown is the Answer" block) |
| `ai-llamas/tina-llama-working-laptop-table.png` | 587x442, working at laptop (tinacms.json hero) |
| `ai-llamas/tina-enterprise-v2.png` | 651x552 |
| `ai-llamas/llama_roadmap.png` | 1254x1254 |
| `img/tina-llama/tina-llama-superhero.webp` | superhero pose |
| `img/flyingTina.png` | 400x371 flying |
| `img/brand-assets/Tina-Media-Fonts-hero.png` | 756x459 llama at a desk with books and pen |
| `svg/llama-mic.svg` | detailed vector llama with microphone |
| 3D models | `llama.fbx`, `llama-chunky.fbx`, `grey-llama.fbx`, `lowpoly-earth.fbx` in `public/` |

Flat vector scene kit used on the About page (`TIO/content/main/about.json`, lines 137-143): `img/brand-assets/grass.svg`, `creator.svg`, `developer.svg`, `visual-editor.svg`, `npx-command.svg`, `street-lamp.svg`, `llama.svg`. Good motion-graphics material (creator and developer figures, a visual-editor screen and an npx screen).

Customer logo SVGs (homepage logo grid): `svg/logos/*.svg` (Unity, Bunny Net, Protocol Labs, City of London, Devolver, Smashing, Roev, Supernova, Paradise Helicopters, NDC, SSW, Comedia, RRE, Shadow Lion, Locality Bank). Only use with permission; they are third-party marks.

### 1.6 Logo-usage rules

- tina.io has no published logo clear-space, minimum-size or misuse rules. Confirmed on https://tina.io/media: no guidelines, no hex codes. (`TIO/content/main/media.json`)
- Only explicit rule is for the mascot: "Use the provided character sheet as the exact character reference. Do not change colors, facial features, proportions, or style." It cites SSW Rule https://www.ssw.com.au/rules/consistent-ai-generated-characters. (`media.json`, https://tina.io/media)
- SSW video rules that govern a Tina-branded video: logo "DOG" watermark should be "semi-transparent... usually 50 % transparent white", consistent corner position, "Not obstruct the content" (https://www.ssw.com.au/rules/do-you-have-a-dog-aka-digital-on-screen-graphic-on-your-videos); outro "should have your logo and tagline" (https://www.ssw.com.au/rules/branded-video-intro-and-outro).
- Practical reading: use the supplied SVGs unaltered, recolour only to brand orange `#EC4815`, white or black, keep the llama pose and proportions, and do not redraw the llama.

### 1.7 Official downloads (tina.io/media, no 404)

Page https://tina.io/media (the URL `/brand-assets` is a 404). Title: "TinaCMS Logo and Brand Assets - Official Media Kit". SharePoint download links (from `TIO/content/main/media.json`, unverified that they still resolve, not downloaded):
- Full kit zip: https://tinaio.sharepoint.com/:u:/s/TinaMarketing/IQAdMdaH4n4-SZID34L4bFXZAb26XTimPBRwsoZfY1s4E1o?e=rUulCV&download=1
- Logo kit, SVG and PNG: https://tinaio.sharepoint.com/:u:/s/TinaMarketing/IQAuaGVZUPqMTLzZLhoqhI9PAarv2KqjRMfkDOXLPHVnOXs?e=RaYmxZ&download=1
- Backgrounds and dividers zip: https://tinaio.sharepoint.com/:u:/s/TinaMarketing/IQDt9HH0D60ORrrgIGc3V5v2AVHgZVMrhnFgR8UbSIuHrW0?e=fGFLpY&download=1

### 1.8 Visual language summary (for the motion designer)

Warm "Tina orange" `#EC4815` as the single hero accent against cool mint, sky and white; deep navy `#241748` for dark sections; blue tinted soft shadows; rounded 6 to 12px corners; IBM Plex Sans semibold headlines with one gradient-orange keyword; a friendly 3D-rendered llama in an orange tee as the character; terminal-style command pill for the CLI. Tone is playful ("No Dramas", llama puns).

---

## 2. Messaging (exact strings)

Sources: `TIO/content/main/home.json`, `TIO/content/main/tinacms.json`, `TIO/content/siteConfig.json`, `TIO/content/main/pricing.json`, live https://tina.io, https://tina.io/tinacms, https://github.com/tinacms/tinacms. The live homepage matches the local `home.json`.

### 2.1 Tagline and hero

- Page title (SEO): "TinaCMS – GitHub’s #1 Headless CMS, powered by an awesome Visual Editor for Markdown" (`home.json` seo.title; en dash is in the source)
- Homepage H1: "{Sites,} Docs and Llamas. No Dramas" (renders as "Sites, Docs and Llamas. No Dramas")
- Hero subtext: "Build stunning websites with TinaCMS visual editor, or create beautiful documentation with TinaDocs. Both powered by Git and built for developers who love great UX." (`home.json`; live page shows the first sentence)
- Announcement badge: "new" + "What we're planning for TinaCMS v4" (links `/blog/tinacms-v4-is-coming`, dated 2026-05-13, a plan not a release)
- Product page H1 (https://tina.io/tinacms): "The Git-powered CMS for Modern Teams"
- Product page subtext: "Edit content live, preview changes instantly, and keep everything version-controlled in your repository. TinaCMS gives developers full flexibility and editors a seamless, intuitive experience."
- Site meta description: "TinaCMS is a fully open-source headless CMS that supports Git" (`siteConfig.json`); seoDefaultTitle "TinaCMS – Headless CMS with GitHub & Markdown Support"
- GitHub repo About line: "TinaCMS is the leading open-source headless CMS that supports Markdown and Visual Editing. Your content is stored in your own GitHub repo 🦙 ❤️" (GitHub API `repos/tinacms/tinacms`)
- OG image alt: "Tina - The Markdown CMS" (`TIO/app/layout.tsx`)

### 2.2 Value props (exact copy)

- Section: eyebrow "STREAMLINE, ORGANIZE, SUCCEED", title "Your All-in-One Content Hub".
- TinaCMS card: "Visual Editor for Developers" / "An open-source, headless CMS with built-in Git version control. Edit content visually while maintaining full developer control."
- TinaDocs card: "Beautiful Documentation Made Simple" / "A complete documentation starter built on-top of TinaCMS. Create, edit and publish beautiful docs with zero configuration."
- Markdown block: title "{Markdown} is the Answer." subtitle "The question is irrelevant..." text begins "LLMs think in it. GEO runs on it. Your CMS should too." Tags: "LLM-Ready", "Git-Native", "Open Format". Body: TinaCMS "stores everything as Markdown in your Git repo, so your content stays clean, portable, and AI-friendly from the moment you publish."
- "Key Features" carousel (`tinacms.json`), exact headline and text:
  - Visual Editing: "See content changes in real-time as you edit"
  - Open Source: "Tina is licensed under Apache 2.0. It can be self-hosted or hosted on TinaCloud"
  - Develop Locally: "Easily set up and run TinaCMS locally to talk to your local filesystem"
  - 3rd Party Media: "Store Media assets in your repo or connect to S3, Cloudinary, DigitalOcean Spaces, etc. Or, use TinaCloud"
  - Build with Blocks: "Use pre-built templates or create custom components from scratch - you have full control to build your site how you want"
  - Markdown at Scale: "TinaCMS powers super-fast sites with 10,000+ pages using Markdown, the best language for your site content"
  - Git Integration: "Users can edit, save changes, and request approval from within the UI - while devs see the branches, commits, and pull requests in GitHub"
  - Easy Documentation: "Tina's docs run on TinaCMS - check it out!"
- Other feature blocks: "Avoid Mistakes with Editorial Workflow" ("review and manage content on different branches without dropping into GitHub or another IDE"); "Unbeatable UX" ("Editing content in Markdown, MDX, and JSON files doesn't need to feel clunky. TinaCMS supports a live preview that takes the UX to the next level"); "Tired of Lengthy Set-ups?" (2 min NPX video).
- Formats (GitHub README): "Tina is a headless content management system with support for Markdown, MDX, JSON, YAML, and more." Queries content through a GraphQL API.
- Frameworks on starter dropdown (home.json): Astro, Next.js, TinaDocs. Dedicated SEO pages exist for Next.js, Astro, Hugo, Jekyll, MDX, Markdown, Jamstack (`TIO/content/main/*-cms.json`).
- v4 line worth quoting (https://tina.io/blog/tinacms-v4-is-coming): content teams can "work with Git without needing to live in GitHub".
- AI: no shipped AI feature is advertised. Pricing lists "AI Features (Coming Soon)" on Team Plus, Business, Enterprise (`TIO/content/main/pricing.json`, local file, live page not re-checked). The AI angle on the homepage is "LLM-Ready" Markdown. Blog posts exist on vibe coding and AI blogging (`TIO/content/blog/vibe-blogging-with-tinacms.mdx`, `Supercharge-Your-Markdown-Blog-with-AI.mdx`).

### 2.3 CTAs and commands

- Command (copy button, exact): `npx create-tina-app@latest` (home.json `codeButton` label; GitHub README install command). Help text: "Need some help? Watch the video - see the CLI docs".
- Buttons: "Learn about TinaCMS", "Try the Editor" (https://demo.tina.io/admin#/~), "Learn about TinaDocs", "Try the Editor" (https://docsdemo.tina.io/admin/index.html#/~/docs), "Schedule Call", "Book a Demo".
- Quickstart: https://app.tina.io/quickstart. Docs: https://tina.io/docs.
- Closing CTA copy: "Talk to a Tina Expert" / "Evaluating Tina for your project? Book a 30-minute call with a TinaCMS Architect".
- Pricing hook (local `pricing.json`): "Start free with 2 users"; Free $0, Team $29, Team Plus $49, Business $299, Enterprise custom. Pricing page footer joke: "Skip the Drama, Chat with a Llama". Re-check live pricing before putting any number on screen.

### 2.4 Proof points

- GitHub: 13,835 stars, 765 forks, Apache-2.0 (GitHub API, queried 2026-10-18; github.com page shows "13.8k"). The star counter on tina.io rendered "0.0k" when fetched (client-side, likely not hydrated), so do not copy it from the site.
- "10,000+ pages using Markdown" (tinacms.json Key Features).
- Customer logos (15) on the homepage: Bunny Net, Unity, Protocol Labs, City of London, Devolver Digital, Smashing Magazine, Roev, Supernova, Paradise Helicopters, NDC Conferences, SSW, Comedia, RRE Ventures, Shadow Lion, Locality Bank (`home.json` logoGrid).
- Unity quote (tinacms.json `quote`): "Tina is transforming the way we do docs at Unity" (Anton Iancu, Product Engineering Manager for AI and Docs). Needs permission before reuse in a paid ad.
- Testimonials, exact strings (`home.json`), all public posts; get consent before paid use:
  - "I tried a dozen CMSs and I have to say, as an engineer, I like Tina the most." (Peter Rusin)
  - "Tina's in-context editor cannot be beaten, we’re all in on it." (Sean Pearce)
  - "TinaCMS is what I use and I love it!" (Cassidy, @cassidoo)
  - "I just built a complete blog structure for my upcoming project with TinaCMS in 2 minutes. And it worked perfectly on the first try" (Manu Coffin)
  - "Oh wow, I thought Sanity was good, but @tinacms is all I need." (Boko Colse)
  - "@tinacms is a dream come true." (rascode)
  - "Just tried out click-to-edit and it's really awesome... kinda feels like magic tbh." (Mravec)
- Footer attribution: TinaCMS is "actively developed by SSW, Australia's leading software consultants" (https://tina.io/tinacms).

### 2.5 Suggested on-screen strings (all quoted from the site, ready to lift)

"Sites, Docs and Llamas. No Dramas" | "Visual Editor for Developers" | "Open source. Apache 2.0" | "Your content lives in your Git repo" | "Markdown, MDX, JSON" | "See content changes in real-time as you edit" | "Works with Next.js, Astro, Hugo" | "`npx create-tina-app@latest`" | "Try the Editor" | "tina.io"

---

## 3. Video ad rules

### 3.1 Google ABCD (primary source)

Source: Google, "A playbook for building effective creative on YouTube" (ABCD), built with Ipsos, reviewed by Nielsen Neuro and Kantar. https://thinkwithgoogle.com/_qs/documents/8472/ABCD_Complete_V7b_HR_1.pdf (11 pages; I extracted the text). Data in it is from 2013-2018.

Fundamentals (p3-4):
- Emerging story arc beats the TV arc: "A strong cue followed by multiple peaks, unexpected shifts and brand cues throughout." "Start fast and keep an upbeat pace."
- Build for mobile: "tighter framing, faster pacing, large-type supers, brightness and contrast". 70% of global watch time is on mobile (Google internal, Apr-Jun 2018).
- Build for sound on: "music, dialogue, and sound effects". 95% of YouTube video is watched with sound on (Google internal, Sep 2018). Note this is YouTube only; LinkedIn and Meta feeds autoplay muted (3.2).

The four letters, with every concrete rule:
- Attract: (1) Frame: tight framing on the subject, product or person. (2) Pace: "two or more shots in the first five seconds" (positive for ad recall and consideration). (3) Humanize: if people appear, open with them, addressing the viewer directly if it fits. (4) Surprise: "stunning, delightful, unexpected, or otherwise memorable imagery" in the first 5 s (links to longer view time).
- Brand: (1) Introduce the product or brand "in the first five seconds". (2) Mention: on-screen people saying the brand beat voiceover. (3) Reinforce: for ad recall integrate the logo into the story or on the product; for consideration use "a super, text overlay, or persistent watermark". (4) Differentiate: "emblems, logos, spokespeople, characters, taglines, colors, and jingles" drive brand association.
- Connect: (1) Use functional and emotional levers together or apart. (2) Engage: "action, humor, or intrigue"; "Humor improves ad receptivity more than any other creative element" (Kantar). (3) Associate: make people core to the story.
- Direct: (1) Prompt: "Show offers and calls-to-action through text cards, simple animation or voiceover." (2) Inspire urgency (limited time or units). (3) Compel: "specific calls-to-action (for example, Visit site, Sign up, Buy now)".
- Google's tick list (p10): tight framing; 2+ shots in first 5 s; open with people if any; memorable imagery; brand or product in first 5 s; logo placement matched to the objective; unique brand visuals; functional and emotional message; make people core; prompt action via text cards or simple animation; specific CTA.
- Secondary caveat (search results, not the PDF): ads with the brand in the first 5 s have higher recall but may be skipped more. UNVERIFIED in the PDF.

YouTube ad formats (Google Ads help, https://support.google.com/google-ads/answer/2375464): skippable in-stream "No max length (<3 min recommended)"; non-skippable in-stream "15-60 seconds (depending on the campaign subtype)"; bumper "6 seconds (>=5 seconds minimum)"; Shorts "<60 seconds recommended". The page gives no aspect-ratio table.

### 3.2 LinkedIn and Meta

LinkedIn, official spec page https://www.linkedin.com/help/linkedin/answer/85306:
- Length: 3 s to 30 min; in-stream up to 90 s. LinkedIn recommends 15 to 30 s "so they qualify for all LinkedIn Feed and Audience Network placements". Under 30 s videos loop to 30 s.
- Ratios and sizes: 16:9 (1920x1080 or 1200x675 recommended), 1:1 (360x360 to 1920x1920), 4:5 (720x900 recommended, max 1080x1350), 9:16 (720x1280 recommended, max 1080x1920). LinkedIn recommends 4:5 as the vertical ratio.
- File: MP4, H.264 or VP8, 75 KB to 500 MB, AAC audio. The page says frame rate "Less than 30 FPS" (read literally, export 24 or 25 fps; confirm in Campaign Manager).
- Captions: SRT file, plain text only, no custom styling. Upload the file directly (no YouTube links).
- LinkedIn marketing page https://business.linkedin.com/marketing-solutions/native-advertising/video-ads: "LinkedIn Video Ads will autoplay in the feed with the sound muted by default." "captions are strongly recommended". Ratios 4:5, 9:16, 16:9, 1:1. The spec page also points to "most impactful content in the first 10 seconds" (as summarised by the fetch tool, wording not verified).

Meta:
- Feed video, https://www.facebook.com/business/ads-guide/video: 4:5, 1440x1800, MP4/MOV/GIF, 1 s to 241 min, 4 GB, H.264, stereo AAC 128 kbps+. "Video captions: Optional, but recommended". "Video sound: Optional, but recommended".
- Reels and Stories, https://www.facebook.com/business/ads-guide/update/image/instagram-reels: 9:16, 1440x2560, 1% tolerance, min width 500 px. Safe zone: keep "roughly 14% of the top, 35% of the bottom and 6% on each side of your asset free from text" (also keep logos and key elements out). This is the Instagram Reels image-ad spec page; Meta's help article on the unified Stories/Reels safe zone is https://www.facebook.com/business/help/980593475366490/ (page text did not load for me).
- Sound-off claims ("85% of Facebook video is watched muted", "47% of value in the first 3 s") come only from agency blogs. UNVERIFIED. Treat as directionally true.
- Safe-zone percentages differ across third-party blogs; use Meta's 14/35/6 above.

### 3.3 SSW Rules (ssw.com.au/rules)

No SSW rule exists on paid video ads, music-driven ads or LinkedIn video ads. Relevant video rules:
- Rules index: https://www.ssw.com.au/rules/rules-to-better-video-recording and https://www.ssw.com.au/rules/rules-to-better-video-post-production
- First 5 s: https://www.ssw.com.au/rules/make-first-5-seconds-appealing "Most viewers decide in the first 5 seconds whether to keep watching or scroll past." Match the promise, grab attention, build curiosity, no "welcome back" intros.
- Golden Moment: https://www.ssw.com.au/rules/golden-moment: teaser at the start, "Short - 25 seconds max", "High Energy... start with a bang!". But "Avoid using Golden Moments if your video is shorter than 2 minutes". Does not apply to a 15 to 30 s ad.
- Captions and text: https://www.ssw.com.au/rules-legacy/add-text-captions-to-videos/ "Stick to short, impactful phrases"; "clear, legible fonts with good contrast"; sync text with visuals; keep text off key visuals; have defined caption styles per video type; use brand colours, fonts, logos.
- Text duration: https://www.ssw.com.au/rules/post-production-do-you-give-enough-time-to-read-texts-in-your-videos: leave text "on screen long enough to be read at least 2 times" at 200 words per minute (about 3.3 words per second). A 10-word line needs about 6 s on screen. For a 15 to 30 s ad, keep each card to 3 to 6 words (about 2 s) or accept that it is a slogan, not reading text. This SSW rule conflicts with ad pacing, so apply it to important copy only (CTA, command).
- CTA: https://www.ssw.com.au/rules/production-do-you-add-a-call-to-action: one main action, short and clear, ideally no longer than 30 s, avoid "choice paralysis" (about 7 asks in the bad example).
- Branding: DOG watermark (semi-transparent, about 50% white, constant corner) and branded intro and outro with "logo and tagline" (URLs in 1.6).
- Short vertical: https://www.ssw.com.au/rules/edit-your-videos-for-tiktok: record vertical, crop to horizontal (1920x1080) and vertical (1080x1920) from one project; Stories 5 to 15 s most effective; shorts 15 to 60 s; use a UI overlay guide while editing and turn it off before export; "with captions, the sound no longer becomes a necessity".
- Export: https://www.ssw.com.au/rules/post-production-high-quality (HD or 4K by purpose, details not read).
- Music: https://www.ssw.com.au/rules/how-to-find-the-best-audio-track-for-your-video/ "you should never use any copyrighted work without permission"; unlicensed music "might be removed"; use licensed or royalty-free. SSW recommends Audio Network (recommended), Artlist, Audio Jungle (all paid). None of these three is CC0.
- Not for ads: https://www.ssw.com.au/rules/videos-youtube-friendly says "Short videos work well on Facebook and LinkedIn, not on YouTube" and aims for 8 to 15 min organic YouTube videos.

### 3.4 Rules that apply to a dev-tool ad with music and no voiceover

Numbered checklist for the designer. Each item is tagged with its source.

1. Hook in the first 5 s with 2 or more shots: not a logo sting, an image of the product value (ABCD Attract; SSW first-5-seconds).
2. Show the brand in the first 5 s: Tina llama and wordmark on frame 1 to 5, then keep a semi-transparent corner logo (ABCD Brand "Introduce", "Reinforce"; SSW DOG).
3. Use the llama as the "character" brand asset and `#EC4815` as the colour: ABCD names characters, colours, taglines and jingles as differentiators.
4. Design sound-off first, then score it. LinkedIn feed is muted by default and Meta recommends captions. Every beat must read from visuals and on-screen text alone; music is the bonus (LinkedIn, Meta, SSW "sound no longer a necessity"). For a YouTube-only cut, sound is on 95% of the time (ABCD p4).
5. No voiceover means no "Mention" rule; carry the brand through text cards and the logo (ABCD Direct allows "text cards, simple animation or voiceover").
6. Large, high-contrast text, tight framing, fast pace (ABCD mobile). Short phrases only (SSW captions). Keep important text 2 reads long (SSW), so write short lines.
7. Keep text, logo and CTA inside the safe area: for 9:16 keep about 14% top, 35% bottom, 6% sides clear (Meta). Build a 16:9 master with a title-safe margin and reframe, do not just crop.
8. One CTA: `npx create-tina-app@latest` in the terminal-style pill, then "tina.io" (ABCD "Compel": specific CTA; SSW one main action). Show it as a text card, not only at the very end: "brand cues throughout".
9. Lengths: ship 6 s (bumper, 5 to 6 s), 15 s, 30 s cut-downs. LinkedIn recommends 15 to 30 s; Reels and Stories 5 to 15 s is most effective (SSW); skippable YouTube has no hard max.
10. Ratios and exports: master 16:9 1920x1080 (LinkedIn and YouTube); 4:5 1080x1350 (LinkedIn and Meta feed; Meta recommends 1440x1800); 9:16 1080x1920 (Reels, Stories, Shorts; Meta 1440x2560); 1:1 optional. MP4, H.264, AAC audio, 24 or 25 fps to satisfy LinkedIn's "<30 FPS". Provide an SRT for LinkedIn captions (plain text only).
11. Surprise and humour: lean on the llama personality; ABCD says humour lifts receptivity most. Keep the site's playful tone ("No Dramas").
12. Do not use Unity or other customer quotes, logos or tweets in a paid ad without permission. Public posts are not a licence.
13. Check every number before display: stars (13.8k on 2026-10-18), "10,000+ pages", pricing, "AI Features (Coming Soon)".

---

## 4. Royalty-free music for a commercial ad

Bottom line: FreePD is the CC0 source named in the brief, but it closed permanently in 2025. Its files are still on the Wayback Machine. Pixabay and Mixkit are the two live fallbacks with plain commercial, no-attribution terms. YouTube Audio Library is the only one that promises no Content ID claims but its ad scope is unclear. The CC0 label does not remove Content ID risk.

### 4.1 Source comparison

| Source | Licence | Attribution | Paid ad use | Content ID risk | Evidence |
|---|---|---|---|---|---|
| FreePD (closed 2025, Wayback only) | CC0 1.0. Site footer: "100% Free Music - Free for Commercial Use, Free Of Royalties, Free Of Attribution, Creative Commons 0 ... copyright free to the extent that the law allows" | None | Yes. FAQ (mirror README): "Can I use this music in an ad?" Yes | Low but not zero. Kevin MacLeod's catalogue has had false third-party claims (user reports, UNVERIFIED) | https://freepd.com/ (closure notice, "permanently closed", 2008-2025); Wayback page below; mirror https://a.ocv.me/pub/stuff/music/freepd/README.md |
| Pixabay Music | Pixabay Content License (not CC0) | Not required ("You do not need to credit Pixabay or the contributor") | Commercial use allowed. FAQ: usable in "commercial video projects, including promotional materials, as long as the music is part of a larger creative work and not distributed as a standalone file". Ads not named explicitly | Real. FAQ: "Some contributors upload their tracks to Pixabay for free use but also register them with Content ID." Dispute with the downloaded licence summary | https://pixabay.com/service/license-summary/ , https://pixabay.com/service/terms/ , https://pixabay.com/service/faq/ |
| Mixkit (Envato) Stock Music Free License | Mixkit licence | "No attribution required" | "online ads" listed as allowed. Not allowed for CDs, DVDs, video games, TV and radio broadcasts (secondary source quoting Mixkit music page) | UNVERIFIED: not addressed in the text I could read. Licence modal text did not load | https://mixkit.co/llm-info/ , https://mixkit.co/free-stock-music/ , https://mixkit.co/license/ |
| YouTube Audio Library | Standard Audio Library licence, plus per-track CC BY | Standard: none. CC BY tracks: must credit in description | Page says "copyright-safe" and monetisable on YouTube. Silent on ads and on use outside YouTube. Third-party guides say the standard licence is YouTube-only. Treat as YouTube-only | Lowest: "won't be claimed by a rights holder" through Content ID | https://support.google.com/youtube/answer/3376882 (the studio page https://www.youtube.com/audiolibrary/music returned 404 for me) |
| Free Music Archive | Per-track CC licences (mix of CC BY, CC BY-NC, some CC0) | Depends on track | Only if CC0 or CC BY (credit) and not NC | Depends on artist | https://freemusicarchive.org/about (site active, run by Tribe of Noise; no CC0 filter confirmed, UNVERIFIED) |
| Kevin MacLeod, Incompetech | CC BY 4.0 (credit required) or paid no-credit licence from $30 | Required unless paid | Allowed with credit | Known false claims | https://en.wikipedia.org/wiki/Kevin_MacLeod_(composer) . Note: the same tracks on FreePD were published as CC0. |

Other notes:
- Pixabay, general terms: no clause on Content ID or registration in the licence text itself. It bans standalone resale, bulk copying and ML scraping (https://pixabay.com/service/terms/).
- SSW Rules prefer paid libraries: Audio Network (recommended), Artlist, Audio Jungle (https://www.ssw.com.au/rules/how-to-find-the-best-audio-track-for-your-video/). If the ad gets real spend, a paid licence with a certificate is the lowest-risk path.
- CC0 is a licence waiver by the rights holder. It does not cover performer or third-party rights in a recording (secondary source, https://www.soundstripe.com/blogs/creative-commons-music).

### 4.2 CC0 tracks (FreePD, Wayback snapshot 2025-03-06) for upbeat electronic or corporate tech

The live `https://freepd.com/music/...mp3` URLs now return 404 (checked with `curl -I`). The files are in the Internet Archive snapshot dated 2025-03-06 (timestamp `20250306130302`). I confirmed `HTTP 200` and the byte sizes with HEAD requests. I did NOT download them.

Licence page for these: archived catalogue page https://web.archive.org/web/20250306130302/https://freepd.com/electronic.php (footer: "FreePD.com - 100% Free Music - Free for Commercial Use, Free Of Royalties, Free Of Attribution, Creative Commons 0"). FreePD's own FAQ and licence pages are not archived, so the FAQ text comes from the mirror README https://a.ocv.me/pub/stuff/music/freepd/README.md. Save a copy of the snapshot page as licence evidence for any claim dispute.

All three are by Kevin MacLeod, listed on the Electronic page unless noted:

1. Arpent, 2:42, 6,486,643 bytes. Catalogue note: "Upbeat, uplifting and inspiring. Technology and innovation." Best brief match.
   https://web.archive.org/web/20250306130302im_/https://freepd.com/music/Arpent.mp3
2. Goodnightmare, 4:00, 7,684,215 bytes. "Upbeat, driving and cool. Simple synths with heavy bass, perfect for explainers!"
   https://web.archive.org/web/20250306130302im_/https://freepd.com/music/Goodnightmare.mp3
3. Beat One, 3:00, 5,835,821 bytes. "Upbeat, drum and bass styled track. Minimalistic and cool. Modern and dark." (darker mood)
   https://web.archive.org/web/20250306130302im_/https://freepd.com/music/Beat%20One.mp3

Also available:
- City Sunshine, 3:05, 7,402,093 bytes, from the Upbeat page: "Not your average corporate piece! The occasionally off-beat bass..." (I matched the description to the title by page order, moderate confidence.) https://web.archive.org/web/20250306130302im_/https://freepd.com/music/City%20Sunshine.mp3
- Backbeat, 0:46, 1,922,353 bytes: "Upbeat, heavy hitting beat with bass synth." Short, fits a 15 s cut. https://web.archive.org/web/20250306130302im_/https://freepd.com/music/Backbeat.mp3
- Category pages (Wayback): `.../freepd.com/upbeat.php`, `electronic.php`, `scoring.php`, `misc.php`.

Risks to flag before use in a paid ad:
- The `im_` URLs return a 302 then the file. Use `curl -L`.
- FreePD no longer exists as a licensor of record. The CC0 dedication was made by the site and composer at the time, and the snapshot is your proof.
- MacLeod's catalogue is a frequent target of third-party Content ID claims (user reports only). Run the final export through YouTube's checks (upload as private or unlisted) before spending on ads.
- 15 and 30 s cuts need a loop or edit of a 2.7 to 4 min track. CC0 allows that.

### 4.3 Recommended order

1. Arpent or Goodnightmare from the Wayback FreePD files (CC0, no attribution, ads allowed).
2. A Mixkit Stock Music Free track if a more modern electronic sound is needed (it names "online ads" and "no attribution"). Re-read the licence modal on mixkit.co before use.
3. Pixabay Music if the vibe fits better, saving the licence summary for disputes.
4. YouTube Audio Library only for a YouTube-only publish.
5. Paid Audio Network, Artlist or Audio Jungle if the ad budget is meaningful (SSW preference).

---

## 5. Gaps and flags

- tina.io has no logo clear-space or misuse rules. Official kit is on SharePoint, not in the repo. I did not download it.
- Brand font mismatch: media page says Roboto Mono for code, code ships Source Code Pro.
- Live star counter on tina.io shows "0.0k" in the fetch. Use the GitHub number, re-check the day you render.
- Local `pricing.json` was not diffed against the live pricing page.
- Meta text-overlay help article body did not load; safe-zone numbers are from the Ads Guide Reels spec page.
- Mixkit licence modal text did not load; terms come from `llm-info` and secondary sources.
- All Content ID risk statements for MacLeod tracks are user reports, not verified.
