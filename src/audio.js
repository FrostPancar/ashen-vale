// ASHEN VALE — WebAudio chiptune: SFX + looping step-sequenced music.
let ctx = null, master = null, musicGain = null, sfxGain = null;
let musicTimer = null, currentSong = null;

function ac() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);
    musicGain = ctx.createGain(); musicGain.gain.value = 0.34; musicGain.connect(master);
    sfxGain = ctx.createGain(); sfxGain.gain.value = 0.8; sfxGain.connect(master);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function osc(type, freq, t0, dur, vol = 0.2, dest = null, slide = 0) {
  const c = ac();
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t0 + dur);
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  o.connect(g); g.connect(dest || sfxGain);
  o.start(t0); o.stop(t0 + dur + 0.02);
}

function noise(t0, dur, vol = 0.15, freq = 1200) {
  const c = ac();
  const len = Math.max(1, (dur * c.sampleRate) | 0);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource(); src.buffer = buf;
  const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 0.8;
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  src.connect(f); f.connect(g); g.connect(sfxGain);
  src.start(t0); src.stop(t0 + dur);
}

export const SFX = {
  swing() { const t = ac().currentTime; noise(t, 0.12, 0.12, 2400); },
  hit() { const t = ac().currentTime; osc('square', 220, t, 0.09, 0.18, null, -120); noise(t, 0.06, 0.1, 900); },
  hurt() { const t = ac().currentTime; osc('square', 160, t, 0.18, 0.22, null, -90); },
  enemyDie() { const t = ac().currentTime; osc('square', 300, t, 0.22, 0.16, null, -260); noise(t + 0.05, 0.15, 0.1, 500); },
  shoot() { const t = ac().currentTime; osc('square', 700, t, 0.08, 0.1, null, -400); },
  spark() { const t = ac().currentTime; osc('sawtooth', 900, t, 0.1, 0.08, null, -500); },
  pickup() { const t = ac().currentTime; osc('square', 660, t, 0.06, 0.14); osc('square', 880, t + 0.07, 0.09, 0.14); },
  coin() { const t = ac().currentTime; osc('square', 990, t, 0.05, 0.12); osc('square', 1320, t + 0.06, 0.1, 0.12); },
  potion() { const t = ac().currentTime; osc('sine', 330, t, 0.12, 0.18, null, 200); osc('sine', 550, t + 0.1, 0.15, 0.14, null, 150); },
  levelup() {
    const t = ac().currentTime;
    [440, 554, 659, 880].forEach((f, i) => osc('square', f, t + i * 0.09, 0.14, 0.16));
  },
  chest() { const t = ac().currentTime; osc('square', 392, t, 0.1, 0.14); osc('square', 523, t + 0.1, 0.16, 0.14); },
  lever() { const t = ac().currentTime; noise(t, 0.08, 0.14, 600); osc('square', 180, t + 0.06, 0.1, 0.14); },
  gate() { const t = ac().currentTime; noise(t, 0.5, 0.18, 240); osc('sawtooth', 70, t, 0.5, 0.16, null, -30); },
  door() { const t = ac().currentTime; noise(t, 0.12, 0.1, 400); },
  push() { const t = ac().currentTime; noise(t, 0.2, 0.12, 300); },
  bossRoar() {
    const t = ac().currentTime;
    osc('sawtooth', 80, t, 0.7, 0.3, null, -40); osc('sawtooth', 55, t + 0.1, 0.8, 0.3, null, -20);
    noise(t, 0.6, 0.15, 200);
  },
  slam() { const t = ac().currentTime; osc('sine', 60, t, 0.4, 0.4, null, -30); noise(t, 0.25, 0.25, 180); },
  thud() { const t = ac().currentTime; osc('sine', 95, t, 0.12, 0.2, null, -45); noise(t, 0.07, 0.1, 350); },
  shatter() { const t = ac().currentTime; noise(t, 0.18, 0.2, 1800); noise(t + 0.05, 0.16, 0.13, 900); osc('square', 520, t, 0.08, 0.09, null, -320); },
  grass() { const t = ac().currentTime; noise(t, 0.09, 0.1, 3200); noise(t + 0.03, 0.07, 0.07, 2200); },
  blink() { const t = ac().currentTime; osc('sine', 1200, t, 0.15, 0.1, null, -900); },
  ui() { const t = ac().currentTime; osc('square', 520, t, 0.04, 0.08); },
  deny() { const t = ac().currentTime; osc('square', 150, t, 0.15, 0.14, null, -40); },
  questDone() {
    const t = ac().currentTime;
    [523, 659, 784, 1047].forEach((f, i) => osc('square', f, t + i * 0.11, 0.18, 0.15));
  },
  /** Item pickup — pitch rises with rarity. */
  pickupRarity(rarity = 'common') {
    const t = ac().currentTime;
    const sets = {
      common:    [[520, 0.06], [660, 0.07]],
      magic:     [[660, 0.06], [880, 0.08], [1047, 0.09]],
      rare:      [[880, 0.07], [1175, 0.08], [1397, 0.12]],
      legendary: [[988, 0.07], [1319, 0.08], [1760, 0.14]],
    };
    for (const [f, delay] of sets[rarity] || sets.common) {
      osc('square', f, t + delay, 0.09, 0.14);
    }
  },
  /** First entry into Ashfall — brief fanfare before the end card. */
  arrivalSting() {
    const t = ac().currentTime;
    [392, 494, 587, 740, 988].forEach((f, i) => osc('square', f, t + i * 0.13, 0.2, 0.16));
    osc('triangle', 196, t, 1.4, 0.12, musicGain, 30);
  },
  /** Cave echo mark — layered delay gag (one-shot). */
  echo() {
    const t = ac().currentTime;
    osc('sine', 280, t, 0.45, 0.14, null, -90);
    osc('sine', 210, t + 0.32, 0.55, 0.11, null, -70);
    osc('sine', 165, t + 0.68, 0.65, 0.09, null, -45);
    noise(t + 0.05, 0.12, 0.07, 700);
  },
};

/* ---------------- music sequencer ---------------- */
// Notes: midi numbers, 0 = rest. Each song: bpm, melody[], bass[], (8th notes)
function f(m) { return 440 * Math.pow(2, (m - 69) / 12); }

const SONGS = {
  town: {
    bpm: 96,
    mel: [76, 0, 74, 0, 71, 0, 74, 0, 76, 0, 79, 0, 76, 0, 74, 0,
          71, 0, 69, 0, 66, 0, 69, 0, 71, 0, 0, 0, 0, 0, 0, 0],
    bass: [52, 0, 0, 0, 47, 0, 0, 0, 52, 0, 0, 0, 47, 0, 0, 0,
           45, 0, 0, 0, 42, 0, 0, 0, 47, 0, 0, 0, 47, 0, 0, 0],
  },
  route: {
    bpm: 118,
    mel: [69, 71, 72, 0, 76, 0, 72, 0, 71, 0, 67, 0, 64, 0, 67, 0,
          69, 71, 72, 0, 77, 0, 76, 0, 72, 0, 71, 0, 69, 0, 0, 0],
    bass: [45, 0, 45, 0, 40, 0, 40, 0, 41, 0, 41, 0, 43, 0, 43, 0,
           45, 0, 45, 0, 40, 0, 40, 0, 41, 0, 43, 0, 45, 0, 0, 0],
  },
  cave: {
    bpm: 84,
    mel: [62, 0, 0, 0, 65, 0, 0, 0, 68, 0, 0, 0, 65, 0, 62, 0,
          61, 0, 0, 0, 65, 0, 0, 0, 67, 0, 0, 0, 0, 0, 0, 0],
    bass: [38, 0, 0, 0, 0, 0, 38, 0, 41, 0, 0, 0, 0, 0, 36, 0,
           37, 0, 0, 0, 0, 0, 37, 0, 38, 0, 0, 0, 0, 0, 0, 0],
  },
  boss: {
    bpm: 140,
    mel: [62, 62, 65, 62, 68, 0, 67, 65, 62, 62, 65, 62, 70, 0, 68, 67,
          62, 62, 65, 62, 73, 0, 72, 68, 67, 0, 65, 0, 62, 0, 0, 0],
    bass: [38, 38, 0, 38, 38, 0, 38, 0, 36, 36, 0, 36, 36, 0, 36, 0,
           37, 37, 0, 37, 37, 0, 37, 0, 38, 38, 0, 38, 41, 0, 43, 0],
  },
};

export function playMusic(name) {
  if (currentSong === name) return;
  stopMusic();
  const song = SONGS[name];
  if (!song) return;
  currentSong = name;
  const c = ac();
  const stepDur = 60 / song.bpm / 2; // 8th notes
  let step = 0;
  let nextTime = c.currentTime + 0.1;
  musicTimer = setInterval(() => {
    while (nextTime < c.currentTime + 0.25) {
      const i = step % song.mel.length;
      const m = song.mel[i], b = song.bass[i];
      if (m) osc('square', f(m), nextTime, stepDur * 0.9, 0.10, musicGain);
      if (b) osc('triangle', f(b), nextTime, stepDur * 1.6, 0.16, musicGain);
      if (name === 'boss' && i % 4 === 0) noise(nextTime, 0.05, 0.05, 300);
      nextTime += stepDur;
      step++;
    }
  }, 90);
}

export function stopMusic() {
  if (musicTimer) clearInterval(musicTimer);
  musicTimer = null;
  currentSong = null;
}

export function initAudio() { ac(); }
