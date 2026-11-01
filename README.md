# harks-ai-studio

A Claude Code plugin that makes narrated SSW done videos in your own voice clone.

You say "make a done video for <PBI link>".
The skill reads the issue, the PR, and the commits, and writes a script in the [SSW done video](https://www.ssw.com.au/rules/done-video) order.
It voices the script, takes real screenshots with cursor clicks, adds subtitles, and renders a 1080p video with Remotion.

Watch one: [Done Videos with ElevenLabs & Claude Code](https://youtu.be/H5bpsZGg4Co) (3:24), made entirely by this skill.
The write-up with copy-paste prompts: [harksingh.com/posts/harks-ai-voice-clone](https://harksingh.com/posts/harks-ai-voice-clone).

## Install

In Claude Code:

```text
/plugin marketplace add 0xharkirat/harks-ai-studio
/plugin install harks-ai-studio@harks-ai-studio
```

Then install the tools it calls:

```sh
brew install ffmpeg node pnpm dart uv pipx yt-dlp && pipx install openai-whisper
```

Put your ElevenLabs key in a file that never reaches git or your shell history:

```sh
open -e ~/.zshrc.local     # add: export ELEVENLABS_API_KEY="..."
echo '[ -f ~/.zshrc.local ] && source ~/.zshrc.local' >> ~/.zshrc
```

The [studio reference](skills/done-video/README.md#install) has the optional parts: the voice-check venv, the local draft voice, and the talking cartoon.

To change the scripts, clone the repo instead of the plugin install, and link the skill folder:

```sh
git clone https://github.com/0xharkirat/harks-ai-studio ~/harks-ai-studio
ln -s ~/harks-ai-studio/skills/done-video ~/.claude/skills/done-video
```

### Requirements

- macOS, with [Claude Code](https://claude.com/claude-code).
- An [ElevenLabs](https://elevenlabs.io) plan with Instant Voice Cloning (Starter or above), for the final voice only.
- For the free local draft voice: an Apple Silicon Mac and about 6 GB of disk.
- Node 22, pnpm, Dart 3, Python 3.11 or later through `uv`, ffmpeg, Whisper, and `yt-dlp`.
- A few minutes of public video of you talking alone, with no music.

### Dart and Python

I write the scripts in Dart because I am a Flutter developer.
The local voice and a few helpers are Python.

If you do not use Dart, you have 2 choices:

- Install it: `brew install dart`. It is 1 command, and the scripts then run as they are.
- Ask your agent to do each Dart step in Python. It reads the `.dart` script and does the same work.

The skill asks you which on the first run when it cannot find `dart`.

## Usage

In any Claude Code session:

```text
make a done video for https://github.com/<owner>/<repo>/pull/123
```

The skill follows [`SKILL.md`](skills/done-video/SKILL.md): it gathers the PBI, writes and voices the script, captures the screenshots, renders, and delivers.

When you finish testing the PBI, say `test pass`.
The skill writes the YouTube title, description, chapters, and settings next to the video.

## Two voices: a free draft, then your ElevenLabs clone

**This plugin uses ElevenLabs credits**, but only once per video.
It works in 2 tiers:

| | Draft | Final |
|---|---|---|
| Voice | A local AI voice on your Mac | Your ElevenLabs voice clone |
| Cost | No credits | About 1 ElevenLabs credit per character |
| Use | Every edit: the script, the visuals, the timing | 1 pass, after you say the draft is good |

This is how I work: I make the draft and do all the edit rounds in the local voice.
When the draft is right, I ask Claude to switch to my ElevenLabs voice and render the final.

The switch prints the credit estimate first and calls nothing.
ElevenLabs bills only from the next voicing run.

Today the local clone uses my voice.
Until you set up a local clone of yours, your drafts use the macOS `say` voice.
They are still free, and they never fall back to ElevenLabs.

## Your voice is not included

No voice clips ship with this plugin.
A cloned voice is a person's likeness, so you clone your own.

1. Copy [`config.example.json`](skills/done-video/config.example.json) to `~/.config/done-video/config.json`.
2. List a few minutes of your own clean, solo, public videos, and point `voice_sources` at that list.
3. Run `scripts/fetch-voice.sh`, then `scripts/clone-voice.sh`, from the studio.

Clone only your own voice, or one you have permission to use.
The narrator always says it is your AI, so nobody takes the clone for you.

## Where your videos go

A plugin update replaces the plugin folder.
So on the first run, a plugin install copies the studio to `~/done-video-studio`, and your videos go in `~/done-video-studio/videos/`.
Set `DONE_VIDEO_STUDIO` to use another folder.
Later updates copy only the changed scripts, and they never touch your videos, venvs, or models.

A git clone is its own studio: the videos go in `skills/done-video/videos/`.

## Reference

- [Studio reference](skills/done-video/README.md): voices, subtitles, Shorts, the puppet, components, and assets.
- [Local voice](skills/done-video/local-voice/README.md): the local draft voice and how to set it up.
- [Upload pack](skills/done-video/UPLOAD.md): what `test pass` writes for YouTube.

## Contributing

Open an issue or a pull request at [0xharkirat/harks-ai-studio](https://github.com/0xharkirat/harks-ai-studio).

## License

Code: [MIT](LICENSE), Harkirat Singh.
I made the music and sound effects in `skills/done-video/assets/` with ElevenLabs on a paid plan.
Check the ElevenLabs terms before you use them elsewhere.
