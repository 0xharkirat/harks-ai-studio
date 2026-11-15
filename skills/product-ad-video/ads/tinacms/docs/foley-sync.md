# Foley sync: picture events per cut

These are the moments on screen that should have a sound.
Times are cut seconds, already on the 16th grid unless marked.
Types: `click` (mouse), `key` (one keystroke), `keys a-b` (keystrokes on every 16th from a to b), `pop` (something lands), `blip` (a soft UI tick or notification), `whoosh` (a panel or camera moves fast), `ping` (a Git commit), `thud` (an error).
Keep everything tasteful and quiet under the music. Drop any event that would crowd a hit already in the music.

## anthem (62 s)

| t | type | what |
|---|---|---|
| 0.0 | click | caret power-on |
| 0.0-1.75 | keys | Markdown typing on 16ths |
| 2.0 | whoosh | the editor window slides in |
| 4.85 | pop | the edit box snaps around the logo |
| 7.5 | whoosh | the logo flies to the corner |
| 8.0 | whoosh | the developer window flies in |
| 8.5-9.375 | keys | the last lines type |
| 9.5 | pop | "Saved" tick |
| 10.0 | whoosh | the raw-text window slides in |
| 11.0, 11.5, 12.0, 12.5 | blip | chat messages arrive |
| 11.0 | click | the cursor clicks into the YAML |
| 11.5 | thud | the YAML error banner shakes |
| 12.0 | pop | the unimpressed llama sticker |
| 14.0 | whoosh | the llama rises |
| 14.5 | pop | "Need a hand?" bubble |
| 15.0 | whoosh (down) | the picture powers off |
| 15.5 | click | the click on black |
| 16.5, 16.875, 17.25, 17.5 | blip | the edit box hops across hover states |
| 17.75 | click | click on the headline |
| 18.125-19.75 | keys | the headline types |
| 21.0, 21.5 | click | open the image field, open the media manager |
| 22.0 | blip | hover the image |
| 22.25, 22.5 | click | select, insert |
| 22.5 | pop | the new image lands |
| 25.0, 26.0, 27.0 | pop | blocks snap into new order |
| 28.0 | whoosh | the block picker slides in |
| 29.0 | click | pick a template |
| 29.75 | pop | the new block drops in |
| 30.0 | whoosh | the stack collapses |
| 32.0 | click | Save |
| 33.0-33.5 | keys | the diff line types |
| 36.375 | pop | the pull request card opens |
| 37.0 | blip | "Checks passed" |
| 40.0 | whoosh | into the code panel |
| 40.75, 41.0, 41.25, 41.5, 41.75, 42.0, 42.5 | pop | each code line emits a form field |
| 43.5 | whoosh | the GraphQL card |
| 43.75-45.0 | keys | the query types |
| 45.5, 45.75, 46.0 | pop | Next.js, Astro, Hugo land |
| 56.5-58.0 | keys | the command types in the pill |
| 57.0 | pop | the edit box snaps around the pill |
| 58.0 | click | copy (on the sonic logo) |
| 59.0 | whoosh | the llama rocks in |

Proof (48-56):

| t | type | what |
|---|---|---|
| 48.5 | pop | the Apache 2.0 pill |
| 49.0, 49.5, 50.0, 50.5 | pop | star bursts while the counter climbs |
| 51.0 | ping | the counter lands, "Starred" |
| 52.5, 53.0, 53.5, 54.0, 54.5 | blip | the edit box hops between pages |
| 55.0 | whoosh | the wall collapses to the centre |

## thirty (30 s) and vertical

| t | type | what |
|---|---|---|
| 0.25-1.5 | keys | the headline types (hook) |
| 2.85 | pop | the edit box snaps around the logo |
| 5.5 | whoosh | the logo flies to the corner |
| 6.5, 6.875, 7.25 | blip | hover hops |
| 7.75 | click | click on the tagline |
| 8.125-9.75 | keys | the tagline types |
| 15.0, 16.0 | pop | blocks reorder |
| 16.75 | whoosh | the picker slides in |
| 17.5 | click | pick a template |
| 18.5 | pop | the new block drops in |
| 19.5 | whoosh | the stack collapses |
| 20.0 | click | Save |
| 24.5-26.0 | keys | the command types |
| 25.0 | pop | the edit box snaps around the pill |
| 26.0 | click | copy (on the sonic logo) |
| 27.0 | whoosh | the llama rocks in |

## fifteen (15 s)

| t | type | what |
|---|---|---|
| 0.25-1.5 | keys | the headline types (hook) |
| 2.85 | pop | the edit box snaps around the logo |
| 4.3 (32nd) | click | click on the tagline |
| 4.375-5.75 | keys | the tagline types |
| 6.5 | pop | a block reorders |
| 7.0 | pop | the new block drops in |
| 8.0 | click | Save |
| 10.25-11.0 | keys | the command types |
| 11.0 | click | copy (on the sonic logo) |
| 12.0 | whoosh | the llama rocks in |

## dev (45 s)

| t | type | what |
|---|---|---|
| 0.375-2.875 | keys | the command types on 16ths |
| 3.0 | key (enter) | Enter |
| 3.0-3.5 | blip | output lines flood in (a fast run) |
| 4.85 | pop | the edit box snaps around the logo |
| 6.75, 7.25, 7.75, 8.25, 8.75, 9.25, 10.0 | pop | code lines emit form fields |
| 12.25-13.5 | keys | the query types |
| 16.0 | whoosh | the TypeScript card |
| 17.5 | blip | the autocomplete popup |
| 19.0 | key | `headline` is inserted |
| 20.5, 20.875, 21.25, 21.5 | blip | hover hops |
| 21.75 | click | click on the headline |
| 22.125-23.75 | keys | the headline types |
| 25.0, 25.5 | click | open the image field, the media manager |
| 26.25, 26.5 | click | select, insert |
| 26.5 | pop | the new image lands |
| 28.0 | click | Save |
| 29.0-29.5 | keys | the diff line types |
| 32.375 | pop | the pull request card |
| 36.0, 36.5, 37.0 | pop | Next.js, Astro, Hugo land |
| 38.0 | pop | "Open source. Apache 2.0." |
| 40.25-41.0 | keys | the command types |
| 41.0 | click | copy (on the sonic logo) |
| 42.0 | whoosh | the llama rocks in |

## six (6 s)

| t | type | what |
|---|---|---|
| 0.125-1.0 | keys | the headline types |
| 1.5-1.875 | keys | the command types (fast) |
| 2.0 | pop | the edit box snaps around the pill |
| 3.0 | click | copy (on the sonic logo) |
| 3.5 | whoosh | the llama rocks in |
