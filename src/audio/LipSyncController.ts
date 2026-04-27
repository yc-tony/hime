import type { Live2DController } from '../live2d/Live2DController';

// Module-level cache: one HTMLMediaElement can only be connected to ONE MediaElementSourceNode
// for its entire lifetime. React StrictMode double-mounts components, so we must reuse the
// existing AudioContext + AnalyserNode instead of creating a new MediaElementSource each time.
const elementCache = new WeakMap<HTMLMediaElement, { ctx: AudioContext; analyser: AnalyserNode }>();

// Drives Live2D mouth parameter (ParamMouthOpenY) from Web Audio frequency analysis.
// Must be initialized inside a user gesture (iOS Safari constraint).
export class LipSyncController {
  private _audioEl: HTMLAudioElement;
  private _ctx: AudioContext | null = null;
  private _analyser: AnalyserNode | null = null;
  private _raf: number | null = null;
  private _live2d: Live2DController | null = null;
  private _smoothVal = 0;

  constructor(audioEl: HTMLAudioElement) {
    this._audioEl = audioEl;
  }

  bind(live2dCtrl: Live2DController): void {
    this._live2d = live2dCtrl;
  }

  // Must be called synchronously inside a user gesture handler.
  // iOS Safari only allows AudioContext creation within a gesture call stack.
  initFromGesture(): void {
    if (this._ctx) return;

    // Reuse existing nodes if this audio element was already wired up
    // (happens on React StrictMode double-mount — second mount must not call
    // createMediaElementSource again or the browser throws InvalidStateError)
    const cached = elementCache.get(this._audioEl);
    if (cached) {
      this._ctx     = cached.ctx;
      this._analyser = cached.analyser;
      if (this._ctx.state === 'suspended') this._ctx.resume().catch(() => {});
      return;
    }

    this._ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this._analyser = this._ctx.createAnalyser();
    this._analyser.fftSize = 256;
    this._analyser.smoothingTimeConstant = 0.6;

    const source = this._ctx.createMediaElementSource(this._audioEl);
    source.connect(this._analyser);
    this._analyser.connect(this._ctx.destination);

    elementCache.set(this._audioEl, { ctx: this._ctx, analyser: this._analyser });

    if (this._ctx.state === 'suspended') {
      this._ctx.resume().catch(() => {});
    }
  }

  resume(): void {
    if (this._ctx?.state === 'suspended') {
      this._ctx.resume().catch(() => {});
    }
  }

  start(): void {
    if (!this._ctx) return;
    this.resume();
    this._loop();
  }

  stop(): void {
    if (this._raf !== null) {
      cancelAnimationFrame(this._raf);
      this._raf = null;
    }
    this._smoothVal = 0;
    this._applyMouth(0);
  }

  // rAF loop: sample frequency data → exponential smooth → write to model
  private _loop(): void {
    if (!this._analyser) return;
    const buf = new Uint8Array(this._analyser.frequencyBinCount);
    this._analyser.getByteFrequencyData(buf);

    // fftSize=256 → ~172 Hz/bin. First 24 bins ≈ 0–4100 Hz (human voice range)
    const voiceBins = Math.min(24, buf.length);
    let sum = 0;
    for (let i = 0; i < voiceBins; i++) sum += buf[i];
    const raw = Math.min((sum / voiceBins) / 128, 1.0);  // normalise 0–1

    // Attack fast, release slow — more natural mouth movement
    const speed = raw > this._smoothVal ? 0.6 : 0.3;
    this._smoothVal += (raw - this._smoothVal) * speed;
    this._applyMouth(this._smoothVal);

    this._raf = requestAnimationFrame(() => this._loop());
  }

  private _applyMouth(value: number): void {
    const core = this._live2d?.getCoreModel();
    if (!core) return;
    try {
      if (typeof core.setParameterValueById === 'function') {
        core.setParameterValueById('ParamMouthOpenY', value);
      } else if (typeof core.setParamFloat === 'function') {
        core.setParamFloat('ParamMouthOpenY', value);
      }
    } catch (_) { /* model not ready, ignore */ }
  }
}
