// WebAudio synth only: no sound files. The context is created on the first user gesture.

const LEVEL = 0.55;

function unlockEngine(eng) {
  if (!eng.ctx) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return;
    eng.ctx = new Ctor();
    eng.master = eng.ctx.createGain();
    eng.master.gain.value = eng.muted ? 0 : LEVEL;
    eng.master.connect(eng.ctx.destination);
  }
  if (eng.ctx.state === 'suspended') eng.ctx.resume();
}

function tone(eng, { freq, to = freq, dur, type = 'sine', vol = 0.3, delay = 0 }) {
  if (!eng.ctx || eng.muted) return;
  const t0 = eng.ctx.currentTime + delay;
  const osc = eng.ctx.createOscillator();
  const gain = eng.ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + dur);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(eng.master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function noise(eng, { dur, from, to, vol = 0.35 }) {
  if (!eng.ctx || eng.muted) return;
  const ctx = eng.ctx;
  const t0 = ctx.currentTime;
  const length = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(from, t0);
  filter.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter).connect(gain).connect(eng.master);
  src.start(t0);
}

export function createAudio(initiallyMuted) {
  const eng = { ctx: null, master: null, muted: initiallyMuted };
  return {
    unlock: () => unlockEngine(eng),
    get muted() {
      return eng.muted;
    },
    setMuted(value) {
      eng.muted = value;
      if (eng.master) eng.master.gain.value = value ? 0 : LEVEL;
    },
    splash() {
      noise(eng, { dur: 0.35, from: 5200, to: 400, vol: 0.4 });
      tone(eng, { freq: 220, to: 70, dur: 0.18, vol: 0.18 });
    },
    tick(step = 0) {
      tone(eng, { freq: 1400 + (step % 6) * 60, to: 900, dur: 0.035, type: 'square', vol: 0.05 });
    },
    plink() {
      tone(eng, { freq: 880, to: 1320, dur: 0.16, vol: 0.28 });
      tone(eng, { freq: 1760, dur: 0.1, vol: 0.08, delay: 0.02 });
    },
    coin() {
      tone(eng, { freq: 988, dur: 0.07, type: 'square', vol: 0.12 });
      tone(eng, { freq: 1319, dur: 0.22, type: 'square', vol: 0.12, delay: 0.06 });
    },
    buy() {
      [523, 659, 784, 1047].forEach((freq, i) => {
        tone(eng, { freq, dur: 0.2, type: 'triangle', vol: 0.22, delay: i * 0.07 });
      });
    },
    miss() {
      tone(eng, { freq: 330, to: 220, dur: 0.16, type: 'triangle', vol: 0.1 });
    }
  };
}
