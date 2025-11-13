import React, { useCallback, useEffect, useState } from 'react';
import * as faceapi from 'face-api.js';
import { Loading } from './loading';
import { ErrorBoundary } from './error';
import { ResultList } from './result-list';
import { useLang } from 'shared/lib';

const CANVAS_SIZE = 600;
const FACE_DETECT_SIZE = 360; // detect uchun kichik o'lcham — tezlik uchun
const DESIRED_EYE_Y_RATIO = 0.58;
const DESIRED_FACE_RATIO = 0.65;
const TOP_MARGIN_RATIO = 0.2;
const BASE_ZOOM = 0.45;

// concurrency limit (necha rasm parallel ishlansin)
const DEFAULT_CONCURRENCY = 3;

export interface CroppedResult {
  id: string;
  name: string;
  url: string;
}

export const Cropper: React.FC = () => {
  const { t } = useLang();

  const [results, setResults] = useState<CroppedResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [whiteBg, setWhiteBg] = useState(false);

  // ---------- Load face-api models ----------
  const loadModels = useCallback(async () => {
    try {
      const CDN = 'https://justadudewhohacks.github.io/face-api.js/models/';
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(CDN),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri(CDN),
      ]);
      setModelsLoaded(true);
      setError(null);
    } catch (err) {
      console.error('Model load failed:', err);
      setError('Face detection model failed to load.');
    }
  }, []);

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  // ---------- applyWhiteBackground (dynamic import, memoized) ----------
  const applyWhiteBackground = useCallback(
    async (dataUrl: string): Promise<string> => {
      // Agar checkbox o‘chirilgan bo‘lsa — darhol qayt
      if (!whiteBg) return dataUrl;

      // dynamic import — WASM faqat kerak bo‘lganda yuklanadi
      const { removeBackground } = await import('@imgly/background-removal');

      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], 'image.jpg', { type: blob.type });

      const result = await removeBackground(file, {
        output: { format: 'image/png', quality: 1 },
      });

      // createImageBitmap bilan ishlash (GPU-accel bo‘lishi mumkin)
      const imgBitmap = await createImageBitmap(result);

      const canvas = document.createElement('canvas');
      canvas.width = imgBitmap.width;
      canvas.height = imgBitmap.height;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(imgBitmap, 0, 0);

      return canvas.toDataURL('image/jpeg', 0.95);
    },
    [whiteBg],
  );

  // ---------- helper: safe load of image (createImageBitmap fallback) ----------
  const loadImageBitmapOrElement = useCallback(async (file: File) => {
    const objectUrl = URL.createObjectURL(file);
    try {
      const blob = await fetch(objectUrl).then((r) => r.blob());
      // createImageBitmap may be faster (decoding off-main-thread on supporting browsers)
      const bitmap = await createImageBitmap(blob);
      URL.revokeObjectURL(objectUrl);

      return { img: bitmap as ImageBitmap, cleanup: () => {} };
    } catch {
      // fallback to HTMLImageElement
      return await new Promise<{ img: HTMLImageElement; cleanup: () => void }>(
        (resolve, reject) => {
          const imgEl = new Image();
          imgEl.crossOrigin = 'anonymous';
          imgEl.onload = () => {
            URL.revokeObjectURL(objectUrl);
            resolve({ img: imgEl, cleanup: () => {} });
          };
          imgEl.onerror = (e) => {
            URL.revokeObjectURL(objectUrl);
            reject(e);
          };
          imgEl.src = objectUrl;
        },
      );
    }
  }, []);

  // ---------- main crop function ----------
  const cropSingleImage = useCallback(
    async (file: File): Promise<string> => {
      if (!modelsLoaded) throw new Error('Models not loaded');

      // 1) load image (bitmap or element)
      const { img } = await loadImageBitmapOrElement(file);
      const imgWidth = (img as any).width;
      const imgHeight = (img as any).height;

      if (!imgWidth || !imgHeight) throw new Error('Invalid image dimensions');

      // 2) detect on small canvas (fast)
      const detectCanvas = document.createElement('canvas');
      detectCanvas.width = FACE_DETECT_SIZE;
      detectCanvas.height = Math.max(1, Math.round((imgHeight / imgWidth) * FACE_DETECT_SIZE));
      const dctx = detectCanvas.getContext('2d')!;
      dctx.drawImage(img as any, 0, 0, detectCanvas.width, detectCanvas.height);

      const detection = await faceapi
        .detectSingleFace(
          detectCanvas,
          new faceapi.TinyFaceDetectorOptions({ inputSize: 256, scoreThreshold: 0.5 }),
        )
        .withFaceLandmarks(true);

      if (!detection) throw new Error('Face not detected');

      // 3) map detection landmarks to ORIGINAL coordinates
      const scaleX = imgWidth / detectCanvas.width;
      const scaleY = imgHeight / detectCanvas.height;

      // faceapi Landmark positions array
      const origLandmarks = detection.landmarks.positions.map((p) => ({
        x: p.x * scaleX,
        y: p.y * scaleY,
      }));

      // 4) compute eye centers (original coords) and angle
      const leftEyePts = origLandmarks.slice(36, 42);
      const rightEyePts = origLandmarks.slice(42, 48);

      const leftEyeCenter = {
        x: leftEyePts.reduce((s, p) => s + p.x, 0) / leftEyePts.length,
        y: leftEyePts.reduce((s, p) => s + p.y, 0) / leftEyePts.length,
      };
      const rightEyeCenter = {
        x: rightEyePts.reduce((s, p) => s + p.x, 0) / rightEyePts.length,
        y: rightEyePts.reduce((s, p) => s + p.y, 0) / rightEyePts.length,
      };

      const dy = rightEyeCenter.y - leftEyeCenter.y;
      const dx = rightEyeCenter.x - leftEyeCenter.x;
      const angle = Math.atan2(dy, dx); // radians

      // 5) rotate original image into a square canvas that fits rotated image
      const diagonal = Math.ceil(Math.hypot(imgWidth, imgHeight));
      const rotateCanvas = document.createElement('canvas');
      rotateCanvas.width = diagonal;
      rotateCanvas.height = diagonal;
      const rctx = rotateCanvas.getContext('2d')!;
      rctx.translate(diagonal / 2, diagonal / 2);
      rctx.rotate(-angle); // rotate opposite to align eyes horizontally
      rctx.drawImage(img as any, -imgWidth / 2, -imgHeight / 2);

      // 6) transform original landmarks coordinates into rotated canvas coordinates
      const cx = imgWidth / 2;
      const cy = imgHeight / 2;
      const rCx = diagonal / 2;
      const rCy = diagonal / 2;
      const cosA = Math.cos(-angle);
      const sinA = Math.sin(-angle);

      const rotatedLandmarks = origLandmarks.map((p) => {
        const relX = p.x - cx;
        const relY = p.y - cy;
        const rx = cosA * relX - sinA * relY + rCx;
        const ry = sinA * relX + cosA * relY + rCy;

        return { x: rx, y: ry };
      });

      // 7) compute jaw/top/bottom & scale based on rotated landmarks (jaw indices 0..16)
      const jaw = rotatedLandmarks.slice(0, 17);
      const jawTop = Math.min(...jaw.map((p) => p.y));
      const jawBottom = Math.max(...jaw.map((p) => p.y));
      const faceHeight = jawBottom - jawTop;
      if (!faceHeight || !isFinite(faceHeight)) throw new Error('Invalid face geometry');

      const scale = ((CANVAS_SIZE * DESIRED_FACE_RATIO) / faceHeight) * BASE_ZOOM;

      // rotated eyes centers
      const leftEyeRot = rotatedLandmarks.slice(36, 42);
      const rightEyeRot = rotatedLandmarks.slice(42, 48);
      const eyeCenterX =
        (leftEyeRot.reduce((s, p) => s + p.x, 0) + rightEyeRot.reduce((s, p) => s + p.x, 0)) /
        (leftEyeRot.length + rightEyeRot.length);
      const eyeCenterY =
        (leftEyeRot.reduce((s, p) => s + p.y, 0) + rightEyeRot.reduce((s, p) => s + p.y, 0)) /
        (leftEyeRot.length + rightEyeRot.length);

      const desiredEyeY = CANVAS_SIZE * DESIRED_EYE_Y_RATIO;

      const dxFinal = CANVAS_SIZE / 2 - eyeCenterX * scale;
      const dyFinal = desiredEyeY - eyeCenterY * scale - CANVAS_SIZE * TOP_MARGIN_RATIO;

      // 8) final canvas — draw rotatedCanvas (high-res) into final canvas (maintain quality)
      const finalCanvas = document.createElement('canvas');
      finalCanvas.width = CANVAS_SIZE;
      finalCanvas.height = CANVAS_SIZE;
      const fctx = finalCanvas.getContext('2d')!;
      fctx.fillStyle = '#ffffff';
      fctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      fctx.drawImage(
        rotateCanvas,
        dxFinal,
        dyFinal,
        rotateCanvas.width * scale,
        rotateCanvas.height * scale,
      );

      let output = finalCanvas.toDataURL('image/jpeg', 0.95);

      // 9) apply white background removal only if enabled (dynamic import)
      try {
        output = await applyWhiteBackground(output);
      } catch (e) {
        // not fatal — just warn
        console.warn('applyWhiteBackground failed:', e);
      }

      return output;
    },
    [modelsLoaded, applyWhiteBackground, loadImageBitmapOrElement],
  );

  // ---------- helper: limited concurrency runner ----------
  const runWithConcurrency = useCallback(
    async (files: File[], concurrency = DEFAULT_CONCURRENCY) => {
      const resultsArr: CroppedResult[] = [];
      let idx = 0;
      const errors: string[] = [];

      const worker = async () => {
        while (true) {
          const i = idx++;
          if (i >= files.length) return;
          const file = files[i];
          try {
            const url = await cropSingleImage(file);
            resultsArr.push({ id: crypto.randomUUID(), name: file.name, url });
          } catch (err) {
            console.warn('Crop failed for', file.name, err);
            errors.push(`${file.name}`);
          }
        }
      };

      const workers: Promise<void>[] = [];
      for (let i = 0; i < Math.min(concurrency, files.length); i++) {
        workers.push(worker());
      }
      await Promise.all(workers);

      return { resultsArr, errors };
    },
    [cropSingleImage],
  );

  // ---------- handle input files ----------
  const handleFiles = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;

      setLoading(true);
      setError(null);
      setResults([]);

      try {
        const { resultsArr, errors } = await runWithConcurrency(files, DEFAULT_CONCURRENCY);
        if (errors.length) {
          setError(`Some pictures could not be processed: ${errors.join(', ')}`);
        }
        setResults(resultsArr);
      } catch (err) {
        console.error('Processing error:', err);
        setError('Processing failed. See console.');
      } finally {
        setLoading(false);
      }
    },
    [runWithConcurrency],
  );

  // ---------- render ----------
  return (
    <div>
      <div className="mx-[10px] md:mx-[40px] mt-[2.5rem] mb-[1.5rem] text-black text-center space-y-1">
        <h3 className=" text-[24px]">{t('crop-title')}</h3>
        <p className="text-sm sm:text-base">{t('crop-desc')}</p>
      </div>
      <hr className="text-gray-200 my-3" />

      <div className="flex justify-center gap-3 items-center">
        <label
          htmlFor="upload"
          className="cursor-pointer w-full border border-gray-300 px-[12px] py-[6px] min-h-[38px] rounded text-center">
          {t('upload')}
        </label>
        <input
          disabled={loading}
          id="upload"
          type="file"
          accept="image/*"
          multiple
          onChange={handleFiles}
          className="hidden"
        />
      </div>

      <label className="flex items-center space-x-2 mt-1">
        <input type="checkbox" checked={whiteBg} onChange={(e) => setWhiteBg(e.target.checked)} />
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-sm sm:text-base">{t('white-bg')}</span>
          <span className="text-xs text-red-500 font-normal">{t('takes-a-time')}</span>
        </div>
      </label>

      <div className="border border-gray-300 rounded my-4">
        <div className="h-[45px] from-gray-[#f5f5f5] to-[#e8e8e8] bg-gradient-to-b p-4 flex items-center text-gray-800">
          {t('images')}
        </div>
        <div className="px-6 py-4">
          <Loading loading={loading} />
          <ErrorBoundary error={error} />
          <ResultList results={results} />
        </div>
      </div>
    </div>
  );
};
