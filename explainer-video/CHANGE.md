# Change video

A change video walks a reviewer through 1 code change: a commit, a git range, or a PR diff.
Follow [`SKILL.md`](SKILL.md), but use steps 1 and 3 below, and add the code scene below to step 5.
`$STUDIO/examples/04-tts-provider-change/` is a finished change video, for commit `ddb49c2` of the studio.

## 1. Read the change

- A commit: `git show <sha>`.
  A range: `git log --stat A..B`, then `git diff A B`.
  A PR: `gh pr view <n>`, `gh pr diff <n>`, and `gh pr view <n> --comments`.
- Read the code around each hunk, so you know what the system did before the change.
- When an explain-diff page exists for the same change, read it.
  Its before/after diagram, its toy-data flow, and its riskiest part start the `change`, `flow`, and `checks` scenes.
  Check each claim on the page against the diff.
- Find 1 real example for the flow: a test value, a fixture, or 1 run in a scratch directory.

Done when you can state the old and new behaviour, the 1-2 key hunks, and 2-4 checks for the reviewer.

## 3. Write the script

Plan 5 scenes for 60-90 s, about 160-220 words:

| Scene id | Idea | Picture |
|---|---|---|
| `intro` | What the change does, in 2 lines | `Title`: the feature name, with the commit or PR in the subtitle |
| `change` | Before and after | `Diagram`: the old path first, then the parts the change adds, moves (`move`), or removes (`out`) |
| `flow` | 1 example, end to end | `Diagram`: the new path, with the real values on its nodes and arrows |
| `code` | The 1-2 hunks that matter most | `CodeWalk` from `hunk.dart`, 1 step per line |
| `checks` | What to check | `Checklist`: 2-4 items, the riskiest first |

- Write the narration in 80% ASD-STE100: sentences of 20 words or fewer, 1 idea each, active voice, present tense.
  Code names, such as `tts.dart` or `localVoice`, are the 20%.
- Name each part as the code names it, so the reviewer can find it.
- Start each check line with "Check that", and name a behaviour the reviewer can test.
- Put the spoken form of each code name in `tts`: "T T S dot dart" for `tts.dart`, "local voice" for `localVoice`.

The other rules of step 3 in `SKILL.md` apply too.

Done when every scene has 2-5 lines of 20 words or fewer, and every check names a testable behaviour.

## 5. Build the code scene

`scripts/hunk.dart` reads a diff on stdin and prints 1 hunk of 1 file as CodeWalk data.
Run it from the project.
For a PR, pipe `gh pr diff <n> -R <owner>/<repo>` in place of `git show`.

```sh
git -C <repo> show <sha> | dart ../../../scripts/hunk.dart <path>           # lists the file's hunks, prints hunk 1
git -C <repo> show <sha> | dart ../../../scripts/hunk.dart <path> 66-72 > src/hunks/main.json
```

Then spread the data into a `CodeWalk`, and give each line a step:

```tsx
import main from './hunks/main.json';

<CodeWalk {...main} width={1720} fontSize={26} steps={[{at: at(cue, 0), lines: [66, 67, 68]}]} />
```

- `start` numbers the rows as the file does, and step `lines` use those numbers.
- `added` marks each new line with a green +.
  `runs` lists the added lines in unbroken runs, ready for step `lines`.
- Keep a window to about 8 rows at `fontSize` 26, so 2 windows fit above y 880.
  Split a long hunk into 2 windows, as the example does.
- `--cols` cuts a long row with "…"; the default is 100.

Done when each line of the code scene lights the rows it names.
