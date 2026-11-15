# Review lessons from the TinaCMS anthem

The anthem v2 passed after 8 review rounds, from 2026-10-26 to 2026-11-12.
Each rule below comes from a review note.
Apply all of them to the first draft of a new film.
The full notes and changes are in `ads/tinacms/docs/cuts/anthem.md` in this skill's folder.

## Pace

| rule | the note behind it |
|---|---|
| Play the film at 90 BPM (speed 3/4 on the 120 BPM design grid). | v1 at 120 BPM: people watched it at 0.75x and 0.9x. At 100 BPM, the team still said "slow everything down, I can't read much". |
| Show 1 chat request every 2 s, 1 at a time. | At 0.6 s and then 0.9 s apart, the requests were "stressful to watch". |
| Land 1 commit every 2 s on the Git timeline. | At 0.9 s to 2.4 s apart, it went "pretty fast". |
| Hold the main answer (the mascot's line) about 3 s before the next click, at twice the body size. | "This is important, I would double the size." |
| Never leave a hold of 2 s or more with nothing new on screen. | A 3 s pause (round 6) and a 3 s empty gap (round 8c): "balance it out". |
| Give the opening 0.5 s of still screen before the first keystroke. | v1: "add half second of breathing room". |

## Words

| rule | the note behind it |
|---|---|
| Write 2 to 5 words per line, in sentence case, with a full stop. A card can hold 2 short lines. Put 1 word per headline in the brand gradient. | The treatment's ad rules. The passed cards "Built for Developers. And Content Editors." and "Works with Astro. Next.js. Or bring your own." have 2 or 3 short lines. |
| Give each audience 1 name, with the same casing on every card: "Developers", "Content Editors". | "be consistent with Developers and Content Editors casing". |
| Pick the less confronting word: "Not as much." over "Not so much." | "less confronting". |
| Name what the product supports today, and leave the door open: "Works with Astro. Next.js. Or bring your own." | A list of 3 frameworks felt "limiting or dated". Check the CLI's real options first. |
| Leave out a licence name that can change. Say "Free and open source." | The Apache licence was about to change. |
| Cut screens that are too technical for the audience. | The TypeScript schema, the GraphQL screens and the blocks scene were "too complicated". |
| Use the fonts that the product's website serves, and its style guide. | "use the same fonts as tinacms fonts on website". |
| Keep the descenders (the tails of g, p, y) of gradient words inside the gradient box. | The tails were cut off in round 3. |

## Structure

| rule | the note behind it |
|---|---|
| Show the logo on the title cut, at about 0:05, on the first note of the sonic logo. Then keep a corner logo, top left, at 80% opacity, until the end card starts. | "missing branding: there should be a logo in the top left". The treatment asked for the logo inside 5 s. At 90 BPM, the passed logo lands at 5.5 s. |
| Keep 1 title slide, right after the opening line. | The team asked "another title slide?". Hark tried it after the mascot's answer, and then put it back at 0:05. |
| Use a dark world for the developer and a light world for the user, and keep the switch. | A reviewer asked about it. Hark kept it, because it shows whose world each scene is. |
| Make the 2 people 3D cartoon characters in the mascot's style, with 2 poses per strip. | The photos were "so AI generated". Hark picked the 3D cartoon style. |
| Show a visible cause for each effect: a click on Save before the commit appears. | "there's no click on save button". |
| End with a callback to both characters. | "have a callback to built for developers and content editors". |
| End card: the logo, "Try <product> today.", the command, "or", "With your favourite AI agent 🤖", the URL. 1 centred stack, 50 px between the inked shapes (measure the ink, not the line boxes), equal top and bottom margins. The QR card and the mascot sit in mirrored side columns. A cursor clicks Copy on the command. | "make the last slide super symmetrical". No second tag line. |
| Put a QR code on the end card, with UTM tags. | "Do you want to finish with a QR code?" |

## Picture glitches

Each item was a review note. Check each one before you send a draft.

- No black stop at a cut. A black gap looks like a bug or a YouTube buffering pause.
- No empty screen at a cut. The next scene's main element arrives on the cut.
- No white flash, and no white frame from a 3D layer that fades.
- No full-frame flash or zoom when a line pops in. Only the line moves.
- No blur or depth-of-field band on the opening.
- A locked-off camera on the opening shot.
- The highlight box (Tina's orange edit box) only on the real UI. Overuse came up in round 1.
- `will-change: transform` on each text element under a slow zoom. Without it, Chrome snaps the text by whole pixels.
- A hover border covers the whole shape, the tail of a speech bubble too.
- A scripted cursor finds its target by name, not by child index.
- Review drafts at 1080p. A 960 x 540 draft looked too low in quality to review.

## Sound

| rule | the note behind it |
|---|---|
| Put a pop on every pop-up, typing on every typing run, and a click on each click that the cursor makes on screen. A plain cursor move gets no sound. | The SSW rule on audio cues: clicks on milestones, not on plain navigation. |
| Use the SSW TV sound files, not synthesized pops. | Round 4: "the SFX for the msg pop ups are not the right ones". |
| Give the chat requests the same pop as the character cards. | Round 8c: "you did the opposite". |
| Duck the music under each pop, so the pop is clear. | "make sure it's listenable along with the background music". |
| Add game-style reaction sounds: a "level up" when a character is happy, a magic sweep when the mascot helps. | "like from the game my farm life ... clash of clans". |
| Render 3 or 4 options for a voice sound and recommend 1. | 2 rounds of synthesized screams failed. A CC0 recording passed. Hark asked "which one you recommend?". |
| Measure each sound against its picture event, within 10 ms. | "random pops at the github star count, not synced". |

## Music

| rule | the note behind it |
|---|---|
| Write a calm mix: no stops, risers or big impacts at the drops. | The product owner: "I did find the music a bit intense." A reviewer: "sound bumps are too intense". |
| Offer 2 calm versions in 1 round, and let Hark pick. | Hark picked "B", the chill version. |
| Play the music bed at 80%, and master at -18 LUFS. | "lower the music to 80% as music is still loud". |
| Bring each instrument back over about 1.5 s after a quiet part. | Drums that came in before the chords made a "slight bump". |
| Never stop the music for a title. | Round 8c: "don't abrupt the music with the title slide, keep the flow". |

## Process

| rule | the note behind it |
|---|---|
| Write the planned change for each note, then make the changes. | "first write out whatever you're gonna change and then do it". |
| Before you say "ready", check that each numbered note is done and that nothing old broke. | "make sure all the feedback given 16 points are actioned and no new regression". |
| Review in a draft of the exact output. Master only after "test pass". | "only export once test pass". The live preview showed "more glitches". |
| Show a short preview before a long render that depends on a new look. | The characters got a 17 s preview and Hark's OK first. |
| When a note is not clear, ask with the question dialog. | Round 8d: "revert the title" was not clear, because the text was the same. |
