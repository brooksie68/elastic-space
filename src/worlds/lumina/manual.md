# Lumina — the manual

Plain words. Short sentences. One section at a time, written with James
reading each one before the next (started 2026-09-01). Every claim here is
checked against the code, not the intent.

## The mod matrix

The matrix is six wires. Each wire listens to one thing in the music and
pushes one slider. That is all it does.

### Reading a row

A row has three parts, left to right.

1. What it listens to.
2. Which slider it pushes.
3. How hard, and which way.

### What a wire can listen to

**bass, low mid, mid, high.** How loud that part of the sound is right now.
Bass is the kick and the bass line. Low mid is the body of the snare and the
bottom of the keys. Mid is the crack of the snare, the keys, a voice. High is
the hi-hat and cymbals. Each one is measured against its own loudest recent
moment, so a quiet song pushes as hard as a loud one. That takes a few seconds
to settle when a song starts.

**level.** The four above, averaged.

**beat.** A guess at the kick. It fires when the bass jumps well above what it
has been doing for the last half second. It is a thump that fades. Beat sense
sets how small a jump counts. Beat decay sets how long the thump lasts. Both
are on the reactivity card.

**pulse, bar, phrase, swing.** These come from the beat grid, not from
listening. The grid is measured ahead of time, off line. Only these tracks
have one: Angular Ritual, Jungle Moog Ritual, Timber at Sea, Spore Circuit,
Zion Rips, Viz Test Track 01. On any other track these four are silent and a
wire on them does nothing.

- **pulse** fires on the beats the accent picker names, and fades. Accent
  decay sets how long it lasts.
- **bar** climbs from zero to full across each bar and drops back on the
  downbeat.
- **phrase** does the same across a phrase. The phrase length was measured
  with the grid, eight, twelve or sixteen bars.
- **swing** is zero for one bar and full for the next.

Every one of these runs from zero to full and back. Beat and pulse jump to
full and fade. The loudness ones rise and fall with the sound.

### What a wire can push

Any slider on the board except the grid counts. Size, speed, blur, spread,
twist, desync, hue, displace, rotate, spin, pulse, merge, counter, every
effect in the FX rack, and the scene knobs. Rows and columns cannot be pushed.
Changing them rebuilds the picture.

Note the name clash. **Pulse** in the middle column is the slider that makes
tiles throb. **Pulse** in the left column is the beat grid. Two things, one
word.

### How hard

The number on the right. At +100% the wire pushes the slider up by its full
travel when what it listens to is at full strength. At −100% it pulls the
slider down by the same amount. At +50% it pushes half as far. At 0 the wire
is off. Double-click the number to zero it.

Full travel is fixed for each slider. For most sliders it is the whole slider.
For size it is 180 pixels. For speed it is about two thirds of the slider.
A slider never goes past its end. If the push would take it past, it stops at
the end.

### Where the slider rests

Your slider is the resting place. The wire pushes from there and lets go.
When the music stops, every slider goes back to where you left it. The gold
dot on a slider shows where the wire is holding it right now.

Two wires on the same slider add up.

### Master

Master is on the reactivity card. It scales every wire at once. At 0 nothing
moves. At 1 the numbers mean what they say. At 2 every wire pushes twice as
hard.

### Attack and release

Attack and release are on the reactivity card. They smooth the four loudness
sources and level. Attack is how fast a source rises when the sound gets
louder. Release is how fast it falls when the sound gets quieter. They do not
touch beat, pulse, bar, phrase or swing.

### Saving

The six rows are part of a react preset. Save one from the react presets
card. Turn on "per track" and the rows are remembered for the song that is
playing and come back when it plays again.

### Where the matrix applies

In free play, the matrix is the only way the music moves the picture. In
claude's set, each cut brings its own six rows and yours are set aside until
you go back to free play.
