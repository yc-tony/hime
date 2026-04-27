import type { Live2DStep } from '../types';

// PIXI is loaded via CDN — declare minimal types to satisfy TypeScript
declare namespace PIXI {
  interface Application {
    stage: { addChild: (child: any) => void };
    renderer: { width: number; height: number; resize: (w: number, h: number) => void; on: (event: string, cb: () => void) => void };
    destroy: (removeView: boolean) => void;
  }
}

// Manages PIXI.js + pixi-live2d-display integration.
// Lives outside React — created once and reused for the page lifetime.
export class Live2DController {
  private canvas: HTMLCanvasElement;
  private placeholder: HTMLElement;
  private app: PIXI.Application | null = null;
  private model: any = null;               // pixi-live2d-display model (no TS types shipped)
  private _seqTimers: ReturnType<typeof setTimeout>[] = [];

  // Callback invoked when the expression badge needs to update
  onExpressionChange?: (name: string) => void;

  constructor(canvasId: string, placeholderId: string) {
    this.canvas      = document.getElementById(canvasId) as HTMLCanvasElement;
    this.placeholder = document.getElementById(placeholderId) as HTMLElement;
  }

  async init(modelPath: string): Promise<void> {
    if (!modelPath) {
      console.info('[Live2D] model_url 為空，顯示 placeholder');
      return;
    }

    try {
      this.placeholder.style.display = 'none';
      this.canvas.style.display      = 'block';

      // PIXI needs window.PIXI to be set for pixi-live2d-display
      (window as any).PIXI = (window as any).PIXI;

      this.app = new (window as any).PIXI.Application({
        view:            this.canvas,
        autoStart:       true,
        backgroundAlpha: 0,
        resizeTo:        this.canvas.parentElement!,
      });

      const { Live2DModel } = (window as any).PIXI.live2d;
      this.model = await Live2DModel.from(modelPath, {
        autoInteract: false,
        onError: (e: Error) => console.error('[Live2D] 模型載入失敗:', e),
      });

      this.app!.stage.addChild(this.model);
      this._fitModel();
      this.app!.renderer.on('resize', () => this._fitModel());

      console.info('[Live2D] 模型載入成功:', modelPath);
    } catch (err) {
      console.error('[Live2D] 初始化失敗:', err);
      this.placeholder.style.display = 'flex';
      this.canvas.style.display      = 'none';
    }
  }

  // Scale and position the model to fit the canvas container.
  //
  // Strategy: "contain + portrait zoom"
  //   1. Contain scale  — the largest scale where the model still fits
  //                       within both canvas width AND height.
  //   2. Portrait zoom  — multiply by PORTRAIT_ZOOM (>1) so the character
  //                       fills the frame; excess is cropped from the bottom
  //                       so the face / upper body stays visible.
  //
  // This normalises models of different natural sizes so every character
  // appears at roughly the same visual scale, regardless of how large or
  // small the source model3.json happens to be.
  private static readonly PORTRAIT_ZOOM = 1.5;

  private _fitModel(): void {
    if (!this.model || !this.app) return;
    const { width, height } = this.app.renderer;
    const naturalW = this.model.width  / (this.model.scale.x || 1);
    const naturalH = this.model.height / (this.model.scale.y || 1);
    if (!naturalW || !naturalH) return;

    // Step 1: contain — model fits entirely within the canvas
    const containScale = Math.min(width / naturalW, height / naturalH);

    // Step 2: zoom in for portrait framing (upper-body focus)
    const scale = containScale * Live2DController.PORTRAIT_ZOOM;

    this.model.scale.set(scale);

    const scaledW = naturalW * scale;
    const scaledH = naturalH * scale;

    // Centre horizontally (may extend slightly past canvas edges at high zoom)
    this.model.x = (width  - scaledW) / 2;

    // Vertical: if the zoomed model is taller than the canvas, shift it up
    // so we show the top 70 % (face + upper body) rather than the feet.
    if (scaledH > height) {
      this.model.y = -(scaledH - height) * 0.3;
    } else {
      this.model.y = 0;
    }
  }

  // Call after layout mode switches to force canvas resize
  refreshLayout(): void {
    if (!this.app || !this.model) return;
    requestAnimationFrame(() => {
      const parent = this.canvas.parentElement!;
      this.app!.renderer.resize(parent.clientWidth, parent.clientHeight);
      this._fitModel();
    });
  }

  setExpression(name: string): void {
    if (!this.model) return;
    try {
      this.model.expression(name);
      this.onExpressionChange?.(name);
    } catch (e) {
      console.warn('[Live2D] expression 設定失敗:', name, e);
    }
  }

  startMotion(group: string, index = 0): void {
    if (!this.model) return;
    try {
      this.model.motion(group, index);
    } catch (e) {
      console.warn('[Live2D] motion 設定失敗:', group, index, e);
    }
  }

  // Write raw parameter values to the core model (Cubism 4 + Cubism 2 fallback)
  setParameters(params: Record<string, number>): void {
    if (!this.model) return;
    const coreModel = this.model?.internalModel?.coreModel;
    if (!coreModel) return;

    Object.entries(params).forEach(([id, value]) => {
      try {
        if (typeof coreModel.setParameterValueById === 'function') {
          coreModel.setParameterValueById(id, value);
        } else if (typeof coreModel.setParamFloat === 'function') {
          coreModel.setParamFloat(id, value);
        }
      } catch (e) {
        console.warn('[Live2D] parameter 設定失敗:', id, value, e);
      }
    });
  }

  private _applyStep(step: Live2DStep): void {
    if (step.expression) this.setExpression(step.expression);
    if (step.motion)     this.startMotion(step.motion.group, step.motion.index ?? 0);
    if (step.parameters) this.setParameters(step.parameters);
  }

  private _clearSequence(): void {
    this._seqTimers.forEach(t => clearTimeout(t));
    this._seqTimers = [];
  }

  // Apply a live2d payload — array of timed steps or a single step object
  applyLive2D(live2d: Live2DStep | Live2DStep[]): void {
    if (!live2d) return;
    this._clearSequence();
    const steps = Array.isArray(live2d) ? live2d : [{ delay: 0, ...live2d }];
    steps.forEach(step => {
      const t = setTimeout(() => this._applyStep(step), step.delay ?? 0);
      this._seqTimers.push(t);
    });
  }

  // Expose the core model so LipSyncController can write ParamMouthOpenY
  getCoreModel(): any {
    return this.model?.internalModel?.coreModel ?? null;
  }

  destroy(): void {
    this._clearSequence();
    this.app?.destroy(false);
    this.app  = null;
    this.model = null;
  }
}
