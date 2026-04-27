import React from 'react';

// Renders the Live2D canvas + placeholder. The actual PIXI/Live2D logic lives
// in Live2DController (imperative) to avoid React re-render conflicts with WebGL.
const Live2DPanel: React.FC = () => {
  return (
    <div id="l2d-panel">
      <canvas id="l2d-canvas" style={{ display: 'none' }} />
      <div id="l2d-placeholder">
        <span>Live2D</span>
      </div>
    </div>
  );
};

export default Live2DPanel;
