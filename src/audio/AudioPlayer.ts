import { LipSyncController } from './LipSyncController';

// Wraps HTMLAudioElement with generation-counter stop logic and lip sync integration.
// "Generation" pattern prevents stale callbacks from earlier play() calls interfering
// with a newer one that started before the previous ended.
export class AudioPlayer {
  readonly lipSync: LipSyncController;
  private $audio: HTMLAudioElement;
  private _playGen = 0;
  private _currentUrl: string | null = null;

  constructor(audioEl: HTMLAudioElement) {
    this.$audio = audioEl;
    this.lipSync = new LipSyncController(audioEl);
    this._unlockOnGesture();
  }

  // Play a silent audio clip on the first user gesture to unlock iOS audio
  private _unlockOnGesture(): void {
    const unlock = () => {
      this.$audio.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YQAAAAA=';
      this.$audio.play().then(() => this.$audio.pause()).catch(() => {});
      this.lipSync.initFromGesture();
    };
    document.addEventListener('touchstart', unlock, { once: true, passive: true });
    document.addEventListener('pointerdown', unlock, { once: true, passive: true });
  }

  // Resume AudioContext if suspended — call synchronously inside a gesture handler
  warmup(): void {
    this.lipSync.resume();
  }

  play(url: string, muted: boolean): void {
    if (!url || muted) return;
    this.stop();
    const gen = ++this._playGen;
    this._currentUrl = url;
    this.$audio.src = url;
    this.$audio.play()
      .then(() => { if (gen === this._playGen) this.lipSync.start(); })
      .catch(e => console.warn('[Audio] 播放失敗:', e));

    const onDone = () => {
      if (gen !== this._playGen) return;
      this.lipSync.stop();
      this._currentUrl = null;
    };
    this.$audio.addEventListener('ended', onDone, { once: true });
    this.$audio.addEventListener('error', onDone, { once: true });
  }

  playAndWait(url: string | null, muted: boolean): Promise<void> {
    if (!url || muted) return Promise.resolve();
    return new Promise(resolve => {
      const done = () => resolve();
      this.$audio.addEventListener('ended', done, { once: true });
      this.$audio.addEventListener('error', done, { once: true });
      this.play(url, muted);
    });
  }

  stop(): void {
    this._playGen++;
    this._currentUrl = null;
    this.$audio.pause();
    this.$audio.removeAttribute('src');
    this.$audio.load();
    this.lipSync.stop();
  }

  get isPlaying(): boolean {
    return !this.$audio.paused && !this.$audio.ended && !!this._currentUrl;
  }
}
