import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';

interface ImageCropperProps {
  imageSrc: string;
  onCropComplete: (croppedStr: string) => void;
  onCancel: () => void;
}

const getCroppedImg = async (imageSrc: string, pixelCrop: any) => {
  const image = new Image();
  image.src = imageSrc;
  await new Promise((resolve) => (image.onload = resolve));
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) return null;

  let targetWidth = pixelCrop.width;
  let targetHeight = pixelCrop.height;
  
  const MAX_DIMENSION = 800;
  if (targetWidth > MAX_DIMENSION || targetHeight > MAX_DIMENSION) {
    if (targetWidth > targetHeight) {
      targetHeight = Math.round((MAX_DIMENSION / targetWidth) * targetHeight);
      targetWidth = MAX_DIMENSION;
    } else {
      targetWidth = Math.round((MAX_DIMENSION / targetHeight) * targetWidth);
      targetHeight = MAX_DIMENSION;
    }
  }

  canvas.width = targetWidth;
  canvas.height = targetHeight;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    targetWidth,
    targetHeight
  );

  return canvas.toDataURL('image/jpeg', 0.8);
};

export const ImageCropper: React.FC<ImageCropperProps> = ({ imageSrc, onCropComplete, onCancel }) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const handleCropComplete = useCallback((croppedArea: any, croppedPixels: any) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return;
    const croppedUrl = await getCroppedImg(imageSrc, croppedAreaPixels);
    if (croppedUrl) {
      onCropComplete(croppedUrl);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80">
      <div className="bg-white p-6 rounded shadow-xl w-full max-w-[500px] flex flex-col">
        <h3 className="text-[17px] font-medium text-gray-800 mb-4 font-sans">Crop Profile Image</h3>
        <div className="relative w-full h-[400px] bg-gray-100 rounded overflow-hidden">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="rect"
            showGrid={false}
            onCropChange={setCrop}
            onCropComplete={handleCropComplete}
            onZoomChange={setZoom}
          />
        </div>
        
        <div className="mt-8 flex items-center gap-4">
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
          <input
            type="range"
            value={zoom}
            min={1}
            max={3}
            step={0.1}
            aria-labelledby="Zoom"
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        <div className="mt-8 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-6 py-2 rounded text-[#4a4a4a] hover:bg-gray-50 font-medium text-[14px]"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-6 py-2 bg-[#042d30] rounded text-white hover:bg-[#064246] font-medium text-[14px]"
          >
            Apply Crop
          </button>
        </div>
      </div>
    </div>
  );
};
