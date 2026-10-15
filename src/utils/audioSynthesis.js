// Audio utility for ambient wedding music, shutter sounds, and voice recording

let audioCtx = null;
let bgMusicInterval = null;
let isMusicPlaying = false;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// Gentle ambient wedding music chords (Cmaj7 -> Am9 -> Fmaj7 -> G7sus)
export function toggleBackgroundMusic(onStateChange) {
  const ctx = getAudioContext();
  if (!ctx) return false;

  if (isMusicPlaying) {
    if (bgMusicInterval) {
      clearInterval(bgMusicInterval);
      bgMusicInterval = null;
    }
    isMusicPlaying = false;
    if (onStateChange) onStateChange(false);
    return false;
  }

  isMusicPlaying = true;
  if (onStateChange) onStateChange(true);

  const chords = [
    [261.63, 329.63, 392.00, 493.88], // Cmaj7
    [220.00, 261.63, 329.63, 392.00], // Am7
    [174.61, 261.63, 329.63, 349.23], // Fmaj7
    [196.00, 293.66, 349.23, 392.00], // Gsus
  ];
  let chordIndex = 0;

  function playChord() {
    if (!isMusicPlaying) return;
    const currentChord = chords[chordIndex % chords.length];
    chordIndex++;

    currentChord.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      // Strum stagger
      const startTime = ctx.currentTime + (i * 0.08);
      const duration = 2.4;

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.025, startTime + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    });
  }

  playChord();
  bgMusicInterval = setInterval(playChord, 2600);
  return true;
}

export function isAudioPlaying() {
  return isMusicPlaying;
}

export function playCameraShutterSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(800, now);
  osc.frequency.exponentialRampToValueAtTime(120, now + 0.08);

  gain.gain.setValueAtTime(0.15, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.12);

  // Secondary mechanical click
  setTimeout(() => {
    if (!ctx) return;
    const clickOsc = ctx.createOscillator();
    const clickGain = ctx.createGain();
    clickOsc.type = 'sine';
    clickOsc.frequency.setValueAtTime(1200, ctx.currentTime);
    clickGain.gain.setValueAtTime(0.08, ctx.currentTime);
    clickGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
    clickOsc.connect(clickGain);
    clickGain.connect(ctx.destination);
    clickOsc.start();
    clickOsc.stop(ctx.currentTime + 0.05);
  }, 90);
}

export function playCountdownBeep(isFinal = false) {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(isFinal ? 880 : 520, now);

  gain.gain.setValueAtTime(0.08, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + (isFinal ? 0.25 : 0.12));

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + (isFinal ? 0.25 : 0.12));
}

// Generate simple synthetic speech chime for voice note preview
export function playSyntheticVoice(durationSeconds = 5, onEnd) {
  const ctx = getAudioContext();
  if (!ctx) {
    if (onEnd) setTimeout(onEnd, durationSeconds * 1000);
    return null;
  }

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(220, now);
  // Frequency modulation for voice-like cadence
  for (let t = 0; t < durationSeconds; t += 0.2) {
    const targetFreq = 200 + Math.sin(t * 8) * 40 + Math.cos(t * 3) * 30;
    osc.frequency.linearRampToValueAtTime(targetFreq, now + t);
  }

  // Filter to soften harshness
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(650, now);

  gain.gain.setValueAtTime(0.04, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSeconds);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + durationSeconds);

  if (onEnd) {
    setTimeout(onEnd, durationSeconds * 1000);
  }

  return {
    stop: () => {
      try {
        osc.stop();
      } catch (e) {
        // already stopped
      }
    }
  };
}
