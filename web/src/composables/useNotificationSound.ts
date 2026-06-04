// Plays a short notification sound for foreground push events.
// Tries /notification.mp3 first; falls back to a synthesized tone via Web Audio API.
// Sound is suppressed when the user has opted out via localStorage.

const STORAGE_KEY = 'kiuq-sound-enabled';

export const isSoundEnabled = (): boolean =>
  localStorage.getItem(STORAGE_KEY) !== 'false';

export const setSoundEnabled = (enabled: boolean): void =>
  localStorage.setItem(STORAGE_KEY, String(enabled));

// Synthesize a two-tone ding using Web Audio — no file required.
const synthSound = (ctx: AudioContext): void => {
  const now = ctx.currentTime;
  const freqs = [880, 1100];
  freqs.forEach((freq, i) => {
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.value = freq;
    const start = now + i * 0.12;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.18, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.22);
    osc.start(start);
    osc.stop(start + 0.25);
  });
};

let audioCtx: AudioContext | null = null;
let mp3Failed = false;

const getAudioContext = (): AudioContext | null => {
  if (typeof AudioContext === 'undefined' && typeof (window as any).webkitAudioContext === 'undefined') return null;
  if (!audioCtx) {
    const Ctx = AudioContext ?? (window as any).webkitAudioContext;
    audioCtx = new Ctx();
  }
  return audioCtx;
};

export const playNotificationSound = async (): Promise<void> => {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  // Resume if browser suspended the context (autoplay policy)
  if (ctx.state === 'suspended') {
    try { await ctx.resume(); } catch { return; }
  }

  // Try MP3 file first, synthesize if it failed or is missing
  if (!mp3Failed) {
    try {
      const res = await fetch('/notification.mp3', { method: 'HEAD' });
      if (res.ok) {
        const audio = new Audio('/notification.mp3');
        audio.volume = 0.6;
        await audio.play();
        return;
      }
    } catch {
      // fall through to synth
    }
    mp3Failed = true;
  }

  synthSound(ctx);
};
