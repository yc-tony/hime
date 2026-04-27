import React from 'react';
import useAppStore from '../store/appStore';

// Horizontal strip of queued images waiting to be sent with the next message
const ImageStrip: React.FC = () => {
  const { pendingImages, setPendingImages } = useAppStore();

  const remove = (idx: number) => {
    const next = [...pendingImages];
    next.splice(idx, 1);
    setPendingImages(next);
  };

  if (pendingImages.length === 0) return null;

  return (
    <div id="image-preview-strip">
      {pendingImages.map((dataUrl, idx) => (
        <div key={idx} className="img-preview-item">
          <img src={dataUrl} alt={`圖片 ${idx + 1}`} />
          <button
            className="img-preview-remove"
            title="移除"
            onClick={() => remove(idx)}
          >×</button>
        </div>
      ))}
    </div>
  );
};

export default ImageStrip;
