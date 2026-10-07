# Upload pack

Reached when the user says "test pass" for a PBI whose done video is rendered.
The user uploads in the browser; you build everything they paste, then post the Done once they send the link.
Run commands from the video's `project` folder unless a step says otherwise.
The formats come from SSW rules: `where-to-upload-work-related-videos`, `optimize-videos-for-youtube`, `add-sections-time-and-links-on-video-description`, `hashtags-in-video-description`, `video-thumbnails`, `zz-files`, `close-pbis-with-context`, `include-links-in-dones`.

## 1. Find the video and its links

Pick the `videos/NN-*` folder for this PBI; when two could match, ask which.
Read its `script.json`, its final `.mp4`, and `youtube.txt` if one exists.
Collect the issue, PR, and live page URLs with `gh issue view` and `gh pr view`.
The version is `v1`, or one more than the last when `youtube.txt` already records a `URL:`; that case is a new version of a published video.
Read `youtube.channel` and `youtube.category` from the config `scripts/config-path.sh` prints.

Done when you hold the `.mp4` path, every link, the version, and the channel.

## 2. Chapters

```sh
dart ../../../scripts/chapters.dart
```

It prints one `m:ss Label` line per scene, timed from `src/layout.json`.
Rename each label to what the viewer sees there ("Step 3: Create an API key", not "Key").
YouTube shows chapters only with three or more entries of 10 s or longer; merge a short scene into its neighbour by deleting its line, and keep `0:00` first.
A video too short for three such chapters keeps its lines anyway, since they still link as timestamps.

Done when every line starts at a real scene start and reads as a viewer-facing title.

## 3. Write `youtube.txt`

Write it next to the `.mp4`, in this shape:

```text
TITLE
<keyword-first title> | <speaker.person>

DESCRIPTION
<what changed and why it matters: 100-200 words, up to two short paragraphs, main topic first>

Chapters
<chapter lines from step 2>

Links
Issue: <https URL>
PR: <https URL>
Live: <https URL>

<1-3 hashtags>

Voice: AI clone of <speaker.person> (ElevenLabs <model_id>). Script, edit and render: Claude Code + Remotion. Music and sound effects: ElevenLabs.

<version> - <speaker.person_first> / Claude Code

TAGS
<3-5 tags: the main keyword and close variations>

UPLOAD SETTINGS
Channel: <youtube.channel>
Visibility: Unlisted
Audience: No, it's not made for kids
Altered or synthetic content: Yes
Category: <youtube.category>
Playlists: none public
Thumbnail: auto-generated
Captions: check the auto captions once processing finishes
```

- Title: about 60 characters, the keyword the viewer would search first, no clickbait; "Done Videos with ElevenLabs & Claude Code | Hark Singh" is the house style.
- Description: write it in the speaker's voice from `speaker.voice_profile`, drafting with the `ai-tells` skill when it is installed.
- Links: full `https://` URLs, at the bottom; leave out any the PBI does not have.
- Hashtags: the product's own, such as `#sswrules` for SSW Rules.
- For a new version, add an `OLD VIDEO` block after `UPLOAD SETTINGS`: the old URL, its title prefixed with `zz`, `New version: <new URL>` as its first description line, Unlisted, removed from every playlist.

Done when no `<placeholder>` is left and the title fits in about 60 characters.

## 4. Hand over

Give the user the title and description as two copyable code blocks, then the settings list.
Open the file and the upload page:

```sh
open -R "<path to .mp4>"
open https://studio.youtube.com
```

Done when the user has the file, the text, and the settings in front of them.

## 5. Close the loop

When the user sends the video URL:

1. Add `URL: <url>` and the version to the end of `youtube.txt`.
2. Post the Done on the issue with `gh issue comment`, with no footer:

   ```text
   Done - For more details, see <video URL>

   PR: <PR URL>
   Live: <live URL>
   ```

3. For a new version, fill `<new URL>` in the `OLD VIDEO` block and remind the user to apply it to the old video.

Done when the issue shows the Done comment and `youtube.txt` records the URL.
