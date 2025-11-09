import React, { useState, useEffect, useCallback, type ChangeEvent } from 'react';
import * as faceapi from 'face-api.js';
import { Loading } from './loading';
import { Error } from './error';
import { ResultList } from './result-list';

const CANVAS_SIZE = 600;
const DESIRED_EYE_Y_RATIO = 0.58;
const DESIRED_FACE_RATIO = 0.65;
const TOP_MARGIN_RATIO = 0.2;
const BASE_ZOOM = 0.45;

export interface CroppedResult {
  id: string;
  name: string;
  url: string;
}

export const Cropper: React.FC = () => {
  const [results, setResults] = useState<CroppedResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);

  // === MODELLARNI YUKLASH ===
  const loadModels = useCallback(async () => {
    try {
      const CDN = 'https://justadudewhohacks.github.io/face-api.js/models/';
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(CDN),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri(CDN),
      ]);
      setModelsLoaded(true);
    } catch {
      setError('Face detection model failed to load.');
    }
  }, []);

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  // === YAKKA RASMNI CROP QILISH FUNKSIYASI ===
  const cropSingleImage = useCallback(
    (file: File): Promise<string> =>
      new Promise((resolve, reject) => {
        if (!modelsLoaded) return reject();

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = URL.createObjectURL(file);

        img.onload = async () => {
          try {
            const detection = await faceapi
              .detectSingleFace(
                img,
                new faceapi.TinyFaceDetectorOptions({ inputSize: 512, scoreThreshold: 0.5 }),
              )
              .withFaceLandmarks(true);

            if (!detection) throw Error({ error: 'Face not detected' });

            const { landmarks } = detection;
            const leftEye = landmarks.getLeftEye();
            const rightEye = landmarks.getRightEye();
            const jaw = landmarks.getJawOutline();

            const eyeCenterX = (leftEye[0].x + rightEye[3].x) / 2;
            const eyeCenterY =
              (leftEye.reduce((s, p) => s + p.y, 0) + rightEye.reduce((s, p) => s + p.y, 0)) /
              (leftEye.length + rightEye.length);

            const jawTop = Math.min(...jaw.map((p) => p.y));
            const jawBottom = Math.max(...jaw.map((p) => p.y));
            const faceHeight = jawBottom - jawTop;

            const scale = ((CANVAS_SIZE * DESIRED_FACE_RATIO) / faceHeight) * BASE_ZOOM;
            const desiredEyeY = CANVAS_SIZE * DESIRED_EYE_Y_RATIO;
            const dx = CANVAS_SIZE / 2 - eyeCenterX * scale;
            const dy = desiredEyeY - eyeCenterY * scale - CANVAS_SIZE * TOP_MARGIN_RATIO;

            const canvas = document.createElement('canvas');
            canvas.width = CANVAS_SIZE;
            canvas.height = CANVAS_SIZE;
            const ctx = canvas.getContext('2d')!;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
            ctx.drawImage(img, dx, dy, img.width * scale, img.height * scale);

            // Rasmdan so‘ng oqartirish effekti
            ctx.drawImage(img, dx, dy, img.width * scale, img.height * scale);
            const imageData = ctx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE);
            const data = imageData.data;
            for (let i = 0; i < data.length; i += 4) {
              data[i] = Math.min(data[i] + 15, 255); // R kanal
              data[i + 1] = Math.min(data[i + 1] + 15, 255); // G kanal
              data[i + 2] = Math.min(data[i + 2] + 15, 255); // B kanal
            }
            ctx.putImageData(imageData, 0, 0);

            const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
            resolve(dataUrl);
          } catch {
            reject();
          }
        };
      }),
    [modelsLoaded],
  );

  // === BIR NECHTA RASMNI BIRMA-BIR CROP QILISH ===
  const handleFiles = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;

      setLoading(true);
      setError(null);
      setResults([]);

      const processed: CroppedResult[] = [];

      for (const file of files) {
        try {
          const result = await cropSingleImage(file);
          if (result) processed.push({ id: crypto.randomUUID(), name: file.name, url: result });
        } catch {
          setError(`Some pictures is not detected: ${file.name}`);
        }
      }

      setResults(processed);
      setLoading(false);
    },
    [cropSingleImage],
  );

  // === UI ===
  return (
    <div className="max-w-5xl mx-auto px-4 py-10 text-center">
      <h1 className="text-3xl md:text-4xl font-semibold text-white mb-3">Photo Cropper</h1>
      <p className="text-gray-200 mb-8 text-sm md:text-base">
        Upload one or multiple photos to crop.
      </p>

      <input
        type="file"
        accept="image/*"
        multiple
        onChange={handleFiles}
        className="w-full border border-white border-dashed rounded-2xl p-6 text-white cursor-pointer bg-white/10 hover:bg-white/20 transition"
      />
      <Loading loading={loading} />
      <Error error={error} />
      <ResultList results={results} />
    </div>
  );
};
