# Plates: real TinaCMS UI captures

Plates are screenshots of the real TinaCMS visual editor, taken from a demo site that runs on this machine.
The motion designers crop, zoom and animate them.
Each plate has a boxes file that gives the position of the key elements.

## What is here

| path | what |
|---|---|
| `site/` | The demo site. A Next.js app on the official `tina-nextjs-starter`, with the content of a fictional product called Fieldnote. |
| `capture/` | The capture scripts (Node and Playwright). |
| `out/` | The plates, boxes files, sequences and `manifest.json`. |
| `out/contact.jpg` | A contact sheet of every plate and of the first, middle and last frame of every sequence. |

## The demo site

I used the Next.js starter (`npx create-tina-app@latest site --template tina-nextjs-starter`) and not the Astro starter in `northwind-traders`.
I ran both in the visual editor and compared the screenshots.

- The Next.js starter has a page of blocks (callout, hero, stats, features, testimonial, CTA). Its hero shows a large product image in a frame. It looks like a real product landing page.
- The Astro starter looks good in dark mode. But its hero is a small mascot image, and it carries "Tina + Astro" branding in every block. It would need a full rewrite to look like a customer site.
- `northwind-traders` is the stock Astro starter, not a fictional brand site. I did not edit it.

Only content and media files changed. The starter code is the same, with these exceptions in `site/public/blocks/*.png`: they are the thumbnails in the Add block picker, and I redrew them from the demo site (`capture/assets/gen-block-previews.mjs`).
I moved the starter's author, post and testimonial images (they show real people) out of `site/public/uploads`. I renamed and rewrote the starter's posts, authors and tags in `site/content`.

All demo content is fictional. There are no real brands in it.
All images are drawn from scratch by `capture/assets/gen-images.mjs`, so they are free to use.

| content | files |
|---|---|
| Home page: callout, hero, stats, features, 6 testimonials, CTA | `site/content/pages/home.mdx` |
| About page | `site/content/pages/about.mdx` |
| 5 blog posts. The main one, `introducing-fieldnote-3`, has headings, bold, a list, an image, a quote and a code block | `site/content/posts/*.mdx` |
| Authors, tags, header and footer | `site/content/authors`, `tags`, `global` |
| 11 images in the media root, plus the `authors`, `posts` and `testimonials` folders | `site/public/uploads/` |

`home.mdx` is saved in the format that Tina writes. This keeps the before and after diff small (`out/code-file.diff` shows one changed line).

## Run the site

```bash
cd plates/site
pnpm install
pnpm dev          # Next.js on http://localhost:3000, Tina admin on http://localhost:3000/admin/index.html
```

Tina runs in local mode. It needs no TinaCloud credentials.
Tina 3.14.0 and CLI 3.0.0 are pinned on purpose: with tinacms 3.14.4 the rich-text toolbar crashes (`Cannot read properties of undefined (reading 'api')`).
Do not run `pnpm update tinacms`.

## Run a capture

Needs Node 22 and pnpm. The dev server must run on port 3000.

```bash
cd plates/capture
pnpm install
npx playwright install chromium     # once; playwright is pinned to 1.64.0
node capture.mjs                    # every group, about 3.5 min (3 min 30 s)
node capture.mjs hero hovers        # only some groups
node contact.mjs                    # rebuild out/contact.jpg
node webp.mjs                       # make the web copies again (capture.mjs does this at its end)
node readme-tables.mjs              # rewrite the plate tables of this README from out/manifest.json
```

Groups, in run order:

| group | plates |
|---|---|
| `public` | `site-home`, `site-home-full` |
| `hero` | `admin-home`, `admin-home-clean`, `admin-hover-hero`, `admin-hero-form`, `seq-type-headline`, `admin-hero-typed`, `admin-saved`, `code-file-*`, `seq-type-tagline`, `admin-tagline-typed` |
| `hovers` | `admin-hover-callout`, `-tagline`, `-cta-buttons`, `-hero-image` |
| `after` | The same views once the headline reads "Edit your site. Visually.": `admin-home-after`, `admin-hover-*-after`, `admin-hero-form-after` (click the tagline). |
| `blocks` | `admin-blocks-list`, `admin-add-block`, `admin-reorder-0..3`, `seq-reorder` |
| `media` | `admin-media-manager`, `admin-image-before`, `seq-media`, `admin-media-select`, `admin-image-after` |
| `rich` | `admin-rich-text`, `seq-type-body`, `admin-rich-text-typed` |
| `lists` | `admin-collections`, `admin-documents`, `admin-documents-pages` |
| `files` | `tina-config.ts` and two more schema files |
| `normalize` | One-off. Not in the default run. Makes Tina re-save `home.mdx` in its own format. Run it again after you edit `home.mdx` by hand. |

The `hero` group saves `home.mdx`. The script restores the content files after each group, and waits until Tina serves the original content again. So a plate shows the original headline, with these exceptions that start from the edited headline on purpose:

- `seq-type-tagline` and `admin-tagline-typed` (they chain after `seq-type-headline`).
- Every `*-after` plate (the `after` group writes the new headline into `home.mdx`, as if it was saved).
- `admin-image-before`, `seq-media` and `admin-image-after`, `admin-media-select` (the film shows them right after the headline is typed). `admin-media-manager` keeps the original headline.

## Files and conventions

- Viewport 1920x1080, light theme, `deviceScaleFactor` 2. Every master PNG is 3840x2160. `site-home-full.png` is 3840x7188.
- Each `<name>.png` has a web copy `<name>.webp` (2880 px wide, quality 92) and `<name>.boxes.json`.
- A sequence folder has `NNNN.png`, `NNNN.webp` and `NNNN.boxes.json` for every frame, a `frames.json` with the text at each frame, and a light copy in `<dir>-1x/NNNN.png` (1920x1080, same frame numbers, no web copy). The boxes of a 1x frame are the same as the 2x frame, because boxes are in CSS pixels.
- `manifest.json` lists every plate (size, boxes file, web copy, description), every sequence and the extra files.
- The page has no loading spinner, no dev overlay and no cookie banner. Fonts and images are loaded, and each plate waits 500 ms or more before it is shot. The mouse cursor and the text caret never show (headless Chromium does not draw them, and the script hides the caret).
- Dev badges are hidden (the Next.js badge, and the breakpoint badge of the starter).

### Boxes file

```json
{ "viewport": {"w": 1920, "h": 1080}, "image": {"w": 3840, "h": 2160}, "scale": 2,
  "boxes": { "sidebar": {"x": 0, "y": 0, "w": 440, "h": 1080, "text": "..."}, "blockItems": [ ... ] } }
```

- Values are CSS pixels in the 1920x1080 viewport. Multiply by `scale` to get PNG pixels.
- A box in the preview iframe already includes the iframe offset (440, 0).
- A key with an array value (`blockItems`, `formInputs`, `fileTiles`) lists several boxes.
- Common keys on admin plates: `sidebar`, `preview`, `menuButton`, `localModeBadge`, `breadcrumb`, `saveButton`, `resetButton`.
- Editor plates add: `blockItems`, `addBlockButton`, `previewHeadline`, `previewTagline`, `previewActions`, `previewHeroImage`, `previewHeroBlock`, `previewCallout`.
- Hero form plates add: `headlineField`, `taglineField`, `backgroundField`, `imageRow` (the "Image" row that opens the image sub-form), `formLabels`, `formInputs`. The image form has `imageField`, `altTextField`, `videoUrlField`.
- Hover plates add `hoveredElement` (the deepest highlighted element) and `hoveredElements` (the block and the field).
- `admin-saved` adds `toast`. `admin-rich-text*` adds `bodyEditor`, `toolbar`, `toolbarButtons`, `previewBody`. Media plates add `modal`, `fileTiles`, `folderTiles`, `uploadButton`, `searchInput`, and `hoveredTile`, `insertButton`, `detailsPanel` in the picker.
- `site-home` boxes are in page coordinates. They have no sidebar or preview keys.

<!-- plates:start -->
## Plates

| plate | size | shows |
|---|---|---|
| `admin-add-block` | 3840x2160 | The Add block picker open in the sidebar: search field and template cards with preview images (Hero, Callout, Features, ...). |
| `admin-blocks-list` | 3840x2160 | Sidebar block list (Sections) with the Stats row hovered: drag handle, edit and delete icons. |
| `admin-collections` | 3840x2160 | Main menu open: the list of CMS collections (Pages, Blog Posts, Authors, Tags), Site (Global, Media Manager) and Dashboard entries. |
| `admin-documents` | 3840x2160 | Document list of the Blog Posts collection: title, file path, filename, extension and template per document. |
| `admin-documents-pages` | 3840x2160 | Document list of the Pages collection (home and about). |
| `admin-hero-form` | 3840x2160 | After clicking the hero headline: sidebar shows the Hero block form with the Headline field focused. Mouse still over the headline. |
| `admin-hero-form-after` | 3840x2160 | Hero form open after clicking the TAGLINE in the preview, tagline field focused. The headline already reads "Edit your site. Visually.". Mouse still over the tagline. |
| `admin-hero-typed` | 3840x2160 | Same view as the typing sequence after the last character: sidebar field and preview both show the new headline. |
| `admin-home` | 3840x2160 | Visual editor on the homepage. Sidebar at top level, list of blocks visible. Tina dashed outlines show on editable fields. |
| `admin-home-after` | 3840x2160 | Same as admin-home, but the hero headline already reads "Edit your site. Visually." (saved). Top-level block list, no hover. |
| `admin-home-clean` | 3840x2160 | Same view as admin-home with Tina outlines in the preview removed (clean backdrop). |
| `admin-hover-callout` | 3840x2160 | Mouse over the callout pill in the preview: Tina highlight on the callout text. |
| `admin-hover-callout-after` | 3840x2160 | Mouse over the callout pill, headline already edited. |
| `admin-hover-cta-buttons` | 3840x2160 | Mouse over the "Start free" hero button: Tina highlight on the button. |
| `admin-hover-hero` | 3840x2160 | Mouse hovering the hero headline in the preview: Tina click-to-edit outline and highlight on the headline. |
| `admin-hover-hero-after` | 3840x2160 | Mouse over the hero headline, which already reads "Edit your site. Visually.". |
| `admin-hover-hero-image` | 3840x2160 | Mouse over the hero image (the product screenshot): Tina highlight on the image block. |
| `admin-hover-hero-image-after` | 3840x2160 | Mouse over the hero image, headline already edited. |
| `admin-hover-tagline` | 3840x2160 | Mouse over the hero tagline: Tina highlight on the tagline. |
| `admin-hover-tagline-after` | 3840x2160 | Mouse over the hero tagline, headline already edited. |
| `admin-image-after` | 3840x2160 | After picking orchid.jpg from the media manager: the Image Source field and the preview both show the new hero image. |
| `admin-image-before` | 3840x2160 | Hero block, Image group open: Image Source field shows the current hero image (workspace screenshot). The preview shows the same image. |
| `admin-media-manager` | 3840x2160 | Media manager open: three folders and 11 images in a grid, with Refresh, New Folder and Upload buttons and a search field. |
| `admin-media-select` | 3840x2160 | Media picker with orchid.jpg selected: details panel with URL and the Insert, Rename and Delete buttons. |
| `admin-reorder-0` | 3840x2160 | Reorder, step 1 of 4: pointer on the Stats row drag handle, order unchanged. |
| `admin-reorder-1` | 3840x2160 | Reorder, step 2 of 4: the Stats row is lifted and following the pointer. |
| `admin-reorder-2` | 3840x2160 | Reorder, step 3 of 4: Stats row halfway up, other rows slide down to make room. |
| `admin-reorder-3` | 3840x2160 | Reorder, step 4 of 4: dropped. Stats is now first in the list and the preview shows it at the top of the page. Save is enabled (unsaved change). |
| `admin-rich-text` | 3840x2160 | Blog post open in the visual editor. The Body rich-text editor in the sidebar has focus, with its toolbar (paragraph style, link, image, strikethrough, quote, lists, bold, more). |
| `admin-rich-text-typed` | 3840x2160 | Rich-text editor after typing the sentence: sidebar editor and preview paragraph both show it. |
| `admin-saved` | 3840x2160 | State right after Save: Tina saved the document to the local file (toast / saved state). |
| `admin-tagline-typed` | 3840x2160 | Same view as the tagline sequence after the last frame: headline and tagline both show the new text. |
| `site-home` | 3840x2160 | Public Fieldnote homepage, top of page (viewport). |
| `site-home-full` | 3840x7188 | Public Fieldnote homepage, full page (boxes are in page coordinates). |

## Sequences

| folder | frames | size | shows |
|---|---|---|---|
| `seq-media/` | 4 | 3840x2160 | Picking a different hero image: media manager open, hover, selected, inserted (4 frames). |
| `seq-reorder/` | 14 | 3840x2160 | Dragging the Stats block row from third to first place in the sidebar block list. Frame 0 = lifted, last frame = dropped with the preview updated. |
| `seq-type-body/` | 32 | 3840x2160 | Typing "Every edit shows up instantly." at the end of the first paragraph in the rich-text Body editor. The preview paragraph updates live. |
| `seq-type-headline/` | 26 | 3840x2160 | Typing "Edit your site. Visually." into the hero Headline field. Frame 0 = old headline selected, frame N = N characters typed. The preview updates live (word fade-in disabled so frames are crisp). |
| `seq-type-tagline/` | 27 | 3840x2160 | Typing "Your content stays in Git. Your team edits it live." into the hero Tagline field, 2 characters per frame. Frame 0 = old tagline selected. The headline already reads "Edit your site. Visually." so this chains after seq-type-headline. |
<!-- plates:end -->

## Other files

| file | what |
|---|---|
| `out/code-file-before.md` | `site/content/pages/home.mdx` before the headline edit. |
| `out/code-file-after.md` | The same file after the edit and Save. |
| `out/code-file.diff` | Unified diff of the two (one changed line). |
| `out/tina-config.ts` | `site/tina/config.tsx`, the TinaCMS config. |
| `out/tina-collection-page.ts` | The Pages collection schema, with the block templates. |
| `out/tina-hero-block.tsx` | The hero block: component and Tina template (schema). |
| `out/contact.jpg` | Contact sheet. |

## Things to know

- Every admin plate shows the orange "You are in local mode" badge. It is real Tina UI. Crop it out if you do not want it.
- The preview shows Tina dashed outlines on every editable field. `admin-home-clean` has the same view without them.
- In the starter, a word that you re-type in the hero headline stays invisible in the preview (its `TextEffect` fade-in does not run again). The script turns the fade off in the preview during the typing sequences, so the frames are crisp. Frames in the other plates are at rest, so they are not affected.
- The "new Tina release" line of the main menu and the "search is not configured" notice of the document list are hidden, because they depend on the day and on TinaCloud.
- The media picker (`seq-media`, `admin-media-select`) is real Tina UI. Its title bar sits at the top edge of the window.
- Not captured: a lower block hover (the Stats block is below the first viewport), dark theme, and mobile layout.
