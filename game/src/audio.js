// Night Vault — sound: every effect is synthesized with WebAudio,
// no audio files. Guard footsteps grow louder as a guard nears, so
// sound tells you where danger is before you see the cone.

export function createAudio() {
  let ctx = null;
  let muted = false;

  function ensureContext() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, dur, type, gain, slideTo) {
    if (muted) return;
    const ac = ensureContext();
    if (!ac) return;
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ac.currentTime);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ac.currentTime + dur);
    g.gain.setValueAtTime(gain, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
    osc.connect(g).connect(ac.destination);
    osc.start();
    osc.stop(ac.currentTime + dur);
  }

  function noiseBurst(dur, gain, filterFreq) {
    if (muted) return;
    const ac = ensureContext();
    if (!ac) return;
    const len = Math.max(1, Math.floor(ac.sampleRate * dur));
    const buffer = ac.createBuffer(1, len, ac.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ac.createBufferSource();
    src.buffer = buffer;
    const filter = ac.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const g = ac.createGain();
    g.gain.value = gain;
    src.connect(filter).connect(g).connect(ac.destination);
    src.start();
  }

  return {
    unlock() { ensureContext(); },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    isMuted() { return muted; },
    // volume 0..1 by distance to the guard — the nearer, the louder.
    footstep(volume) {
      if (volume <= 0.02) return;
      noiseBurst(0.07, 0.10 * volume, 500);
    },
    suspiciousBlip() { tone(880, 0.12, 'sine', 0.08, 1174); },
    alarm() {
      tone(660, 0.16, 'square', 0.07);
      setTimeout(() => tone(660, 0.16, 'square', 0.07), 180);
    },
    pickup() {
      tone(1046, 0.10, 'sine', 0.09);
      setTimeout(() => tone(1568, 0.16, 'sine', 0.09), 90);
    },
    coinClink() { tone(2093, 0.08, 'triangle', 0.10, 1568); },
    caughtSting() { tone(392, 0.4, 'sawtooth', 0.10, 98); },
    floorClear() {
      [523, 659, 784].forEach((f, i) => setTimeout(() => tone(f, 0.14, 'sine', 0.09), i * 110));
    },
    victory() {
      [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.2, 'triangle', 0.10), i * 140));
    },
    uiClick() { tone(740, 0.05, 'sine', 0.05); },
  };
}
