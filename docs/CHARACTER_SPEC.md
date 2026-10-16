# Buddies — character & animation spec

Personality: warm, calm, quietly encouraging. A supportive friend, not a hype-man.
Never guilt-trips, never shouts, never loops the same bit twice in a row.
Rule of thumb: every animation must *communicate* something (arrival, question, reaction, rest).

## 0. Roster
| Id | Name | Species | Signature features |
|---|---|---|---|
| panda | Bao | Panda | black ears/eye patches/arms, leaf sprig |
| cat | Mochi | Cat | orange tabby stripes, pointy ears, whiskers, tail |
| bunny | Pip | Bunny | tall pink-lined ears, cotton tail |
| penguin | Pebble | Penguin | white face/belly, beak, head tuft, flippers |
| axolotl | Ollie | Axolotl | gill fronds, freckles, tail |

All share one skeleton, expression set, gestures, bottle/paw and timings below.

## 1. Look (Bao shown; other characters keep the same proportions)
- Chubby panda, white body, charcoal ears/arms/feet, soft pink inner-ears and cheeks.
- Big glossy eyes on tilted charcoal patches; small nose; mouth is a single curve that opens for joy/surprise.
- Holds a clear water bottle with a pastel cap (user-selectable). Water level is real: it drops when Bao sips.

## 2. Expressions (`EMO` in `src/shared/mascot.js`)
| State | Eyes | Brows | Mouth | Used for |
|---|---|---|---|---|
| neutral | open | flat | soft smile | resting |
| happy | closed arcs `^ ^` | slightly up | open smile | positive moments, goodbye |
| joy | closed arcs | up | wide open smile | answering **Yes** |
| ask | slightly wide | raised | small open | asking the question |
| hmm | normal | inner ends up (mild) | near-flat | answering **Not yet** (concern, not sadness) |
| sip | closed arcs | – | closed, cheeks puffed | drinking |
| sleepy | lids low | – | small | paused / ignored |
| surprised | wide | high | round | picked up |
| dizzy | half | tilted | wobble | poked 4× quickly |

Autonomous layers on top of every state: blink every 1.8–5.4s (occasional double blink), breathing (±1.4%),
eyes follow the cursor within 650px or wander otherwise, tiny arm sway.

## 3. Body & bottle gestures
| Gesture | What it says | Duration |
|---|---|---|
| hop | arrival / acknowledgement | ~0.4s (squash 110ms → stretch → land 70ms → settle) |
| wave | greeting / goodbye | 1–2 waves, ~0.7s each |
| offer | holds bottle out toward you | 0.35s raise + gentle jiggle |
| sip | bottle to mouth, cap pops off, 1–2 gulps, cheeks puff | ~2s |
| lean-walk | forward lean (3°), foot lift, body bob | continuous |
| stretch / curious tilt / yawn / smile | idle life | 1–2s |

## 4. Choreography
**Entrance** (only when away): appears off the left edge, smile, walks **left → right** to 58–74% of the
screen at ~240px/s with eased start/stop (~5s), turns to you, small hop. Quiet "appear" chime.

**Ask**: if already on screen it never disappears — it hops to get attention. Bubble pops in (380ms back-ease):
“Hey, have you had some water?” with **Yes, I have! 💧** (primary, blue) · **Not yet** (secondary) ·
*Remind me later* (tertiary). Bao holds the bottle out, waves occasionally, and waits up to 90s.

**Yes** (~4s): joy face → hop → 26 confetti pieces + 4 sparkles → bubble “n/goal today” → shared sip → wave → settle.
Daily goal reached: 90 confetti, two cheers, fanfare. Soft rising arpeggio.

**Not yet** (~4s): “hmm” face → glance down at the bottle → look back up with a small smile → bottle raise.
Text is reassuring (“No rush! A few sips would feel great”). One quiet two-note sound. Retries after the
configured delay, at most N times, then waits for the next regular slot.

**Later / no answer**: nod + wave / drowsy shrug. Both retry later.

**Linger & exit**: after reacting, Bao stays visible 4.5s, waves goodbye, then walks **right → left**
(~225px/s, ~5s) off the screen. In "always around" mode it simply goes back to idling.

**Idle** (every 6–11s, weighted): look around, smile, curious tilt, walk to the far side, patrol edge-to-edge,
sip, stretch, hop, yawn, short sway. Quiet ones dominate.

## 5. Buttons & feedback
Pill buttons, 14px/800 weight. Primary = blue gradient + soft glow; secondary = pale grey-blue; tertiary = text.
Hover: lift 1px + 4% scale. Press: 96% scale. Click plays a short tick. Min size 80×36px.

## 6. Sound (all synthesized, master gain ×0.75, user mute + volume)
appear (rising pop) · ask (two soft triangle notes) · yes (4-note arpeggio) · big (6-note fanfare, goal only) ·
hmm (two low notes) · gulp · splash · step (barely audible) · tick · sparkle · giggle (poke).

## 7. Timing & easing
UI/pose transitions 180–450ms `inOut`; arrivals/anticipation use `back`/`out`; falls use gravity (2400px/s²).
Walks use a smoothstep ramp over the first/last 130px. Animation loop drops to ~30fps when nothing is moving.
