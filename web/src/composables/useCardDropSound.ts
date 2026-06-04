let ctx: AudioContext | null = null;

const getCtx = (): AudioContext => {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
};

export const playCardDropSound = () => {
  try {
    const ac = getCtx();
    const now = ac.currentTime;

    // Low thud — body impact
    const thud = ac.createOscillator();
    const thudGain = ac.createGain();
    thud.type = 'sine';
    thud.frequency.setValueAtTime(120, now);
    thud.frequency.exponentialRampToValueAtTime(48, now + 0.12);
    thudGain.gain.setValueAtTime(0.38, now);
    thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    thud.connect(thudGain);
    thudGain.connect(ac.destination);
    thud.start(now);
    thud.stop(now + 0.18);

    // High tick — surface click
    const tick = ac.createOscillator();
    const tickGain = ac.createGain();
    tick.type = 'triangle';
    tick.frequency.setValueAtTime(1400, now + 0.01);
    tick.frequency.exponentialRampToValueAtTime(600, now + 0.06);
    tickGain.gain.setValueAtTime(0.18, now + 0.01);
    tickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    tick.connect(tickGain);
    tickGain.connect(ac.destination);
    tick.start(now + 0.01);
    tick.stop(now + 0.08);

    // Soft shimmer — celebration sparkle
    const shimmer = ac.createOscillator();
    const shimmerGain = ac.createGain();
    shimmer.type = 'sine';
    shimmer.frequency.setValueAtTime(880, now + 0.06);
    shimmer.frequency.exponentialRampToValueAtTime(1320, now + 0.22);
    shimmerGain.gain.setValueAtTime(0.0, now + 0.06);
    shimmerGain.gain.linearRampToValueAtTime(0.07, now + 0.1);
    shimmerGain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    shimmer.connect(shimmerGain);
    shimmerGain.connect(ac.destination);
    shimmer.start(now + 0.06);
    shimmer.stop(now + 0.28);
  } catch {
    // AudioContext not available (e.g. SSR, sandboxed iframe) — fail silently
  }
};
