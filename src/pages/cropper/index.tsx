import React, { useCallback, useEffect, useState } from 'react';
import * as faceapi from 'face-api.js';
import { Loading } from './loading';
import { ErrorBoundary } from './error';
import { ResultList } from './result-list';
import { useLang } from 'shared/lib';

const CANVAS_SIZE = 600;
const FACE_DETECT_SIZE = 360;
const DESIRED_EYE_Y_RATIO = 0.58;
const DESIRED_FACE_RATIO = 0.65;
const TOP_MARGIN_RATIO = 0.2;
const BASE_ZOOM = 0.45;

const DEFAULT_CONCURRENCY = 3;

export interface CroppedResult {
  id: string;
  name: string;
  url: string;
}

interface LoadedImage {
  img: HTMLImageElement | ImageBitmap;
}

// --------------------------------------------
// ADAPTIVE JPEG SIZE (200–240 KB)
// --------------------------------------------
async function ensureJpegSize(canvas: HTMLCanvasElement, minKb = 200, maxKb = 240) {
  let q = 0.9;
  let step = 0.05;

  for (let i = 0; i < 10; i++) {
    const data = canvas.toDataURL('image/jpeg', q);
    const sizeKb = Math.round((data.length * 3) / 4096);

    if (sizeKb > maxKb) {
      q -= step;
      if (q < 0.1) q = 0.1;
    } else if (sizeKb < minKb) {
      q += step;
      if (q > 0.99) q = 0.99;
    } else {
      return data;
    }

    step *= 0.55;
  }

  return canvas.toDataURL('image/jpeg', q);
}

export const Cropper: React.FC = () => {
  const { t } = useLang();

  const [results, setResults] = useState<CroppedResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);

  // ★ NEW: background-removal tayyorligini belgilovchi state
  const [bgReady, setBgReady] = useState(false);

  const [whiteBg, setWhiteBg] = useState(false);

  // --------------------------------------------
  // PRELOAD background-removal (FULL INIT)
  // Bu WASM worker birinchi yuklanganda to‘liq ishga tushadi!
  // --------------------------------------------
  useEffect(() => {
    (async () => {
      try {
        const { removeBackground } = await import('@imgly/background-removal');

        // Dummy image bilan WASMni to‘liq initialize qilamiz
        const empty = new Blob([new Uint8Array(10)], { type: 'image/png' });
        try {
          await removeBackground(new File([empty], 'init.png'));
        } catch {}

        setBgReady(true);
        console.log('background-removal fully ready');
      } catch (e) {
        console.warn('bg preload error', e);
      }
    })();
  }, []);

  // --------------------------------------------
  // load face API
  // --------------------------------------------
  const loadModels = useCallback(async () => {
    try {
      const CDN = 'https://justadudewhohacks.github.io/face-api.js/models/';
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(CDN),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri(CDN),
      ]);
      setModelsLoaded(true);
    } catch (e) {
      setError('Face detection model failed to load.');
    }
  }, []);

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  // --------------------------------------------
  // Apply white background
  // --------------------------------------------
  const applyWhiteBackground = useCallback(
    async (dataUrl: string): Promise<string> => {
      // ★ apply faqat bgReady true bo‘lsa ishlaydi
      if (!whiteBg || !bgReady) return dataUrl;

      const { removeBackground } = await import('@imgly/background-removal');

      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], 'input.png', { type: blob.type });

      const removed = await removeBackground(file, {
        output: { format: 'image/png', quality: 1 },
      });

      const bmp = await createImageBitmap(removed);

      const c = document.createElement('canvas');
      c.width = bmp.width;
      c.height = bmp.height;

      const ctx = c.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(bmp, 0, 0);

      return c.toDataURL('image/png');
    },
    [whiteBg, bgReady],
  );

  // --------------------------------------------
  // Load image (bitmap or element)
  // --------------------------------------------
  const loadImageBitmapOrElement = useCallback(async (file: File): Promise<LoadedImage> => {
    const url = URL.createObjectURL(file);

    try {
      const blob = await fetch(url).then((r) => r.blob());
      const bmp = await createImageBitmap(blob);
      URL.revokeObjectURL(url);

      return { img: bmp };
    } catch {
      return await new Promise<LoadedImage>((resolve) => {
        const img = new Image();
        img.onload = () => {
          URL.revokeObjectURL(url);
          resolve({ img });
        };
        img.src = url;
      });
    }
  }, []);

  // --------------------------------------------
  // Core crop function
  // --------------------------------------------
  const cropSingleImage = useCallback(
    async (file: File) => {
      if (!modelsLoaded) throw new Error('Models not loaded');

      const { img } = await loadImageBitmapOrElement(file);
      const imgW = (img as any).width;
      const imgH = (img as any).height;

      if (!imgW || !imgH) throw new Error('Invalid image');

      // detect small canvas
      const detC = document.createElement('canvas');
      detC.width = FACE_DETECT_SIZE;
      detC.height = Math.round((imgH / imgW) * FACE_DETECT_SIZE);

      const dctx = detC.getContext('2d')!;
      dctx.drawImage(img as any, 0, 0, detC.width, detC.height);

      const det = await faceapi
        .detectSingleFace(
          detC,
          new faceapi.TinyFaceDetectorOptions({
            inputSize: 256,
            scoreThreshold: 0.5,
          }),
        )
        .withFaceLandmarks(true);

      if (!det) throw new Error('Face not detected');

      // scale back
      const sx = imgW / detC.width;
      const sy = imgH / detC.height;

      const landmarks = det.landmarks.positions.map((p) => ({
        x: p.x * sx,
        y: p.y * sy,
      }));

      // eyes center
      const left = landmarks.slice(36, 42);
      const right = landmarks.slice(42, 48);

      const lc = {
        x: left.reduce((s, p) => s + p.x, 0) / left.length,
        y: left.reduce((s, p) => s + p.y, 0) / left.length,
      };
      const rc = {
        x: right.reduce((s, p) => s + p.x, 0) / right.length,
        y: right.reduce((s, p) => s + p.y, 0) / right.length,
      };

      const angle = Math.atan2(rc.y - lc.y, rc.x - lc.x);

      // rotate canvas
      const diag = Math.ceil(Math.hypot(imgW, imgH));
      const rotC = document.createElement('canvas');
      rotC.width = diag;
      rotC.height = diag;
      const rctx = rotC.getContext('2d')!;
      rctx.translate(diag / 2, diag / 2);
      rctx.rotate(-angle);
      rctx.drawImage(img as any, -imgW / 2, -imgH / 2);

      // rotated landmarks
      const cosA = Math.cos(-angle);
      const sinA = Math.sin(-angle);
      const cx = imgW / 2,
        cy = imgH / 2;
      const rcx = diag / 2,
        rcy = diag / 2;

      const rLand = landmarks.map((p) => {
        const rx = cosA * (p.x - cx) - sinA * (p.y - cy) + rcx;
        const ry = sinA * (p.x - cx) + cosA * (p.y - cy) + rcy;

        return { x: rx, y: ry };
      });

      const jaw = rLand.slice(0, 17);
      const top = Math.min(...jaw.map((p) => p.y));
      const bottom = Math.max(...jaw.map((p) => p.y));
      const faceH = bottom - top;

      const scale = ((CANVAS_SIZE * DESIRED_FACE_RATIO) / faceH) * BASE_ZOOM;

      const le = rLand.slice(36, 42);
      const re = rLand.slice(42, 48);

      const ecx =
        (le.reduce((s, p) => s + p.x, 0) + re.reduce((s, p) => s + p.x, 0)) /
        (le.length + re.length);
      const ecy =
        (le.reduce((s, p) => s + p.y, 0) + re.reduce((s, p) => s + p.y, 0)) /
        (le.length + re.length);

      const desiredEyeY = CANVAS_SIZE * DESIRED_EYE_Y_RATIO;
      const dx = CANVAS_SIZE / 2 - ecx * scale;
      const dy = desiredEyeY - ecy * scale - CANVAS_SIZE * TOP_MARGIN_RATIO;

      const finalC = document.createElement('canvas');
      finalC.width = CANVAS_SIZE;
      finalC.height = CANVAS_SIZE;

      const fctx = finalC.getContext('2d')!;
      fctx.fillStyle = '#ffffff';
      fctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      fctx.drawImage(rotC, dx, dy, rotC.width * scale, rotC.height * scale);

      // initial jpeg 200–240kb
      let output = await ensureJpegSize(finalC, 200, 240);

      // apply white background if needed
      if (whiteBg && bgReady) {
        output = await applyWhiteBackground(output);

        // white background applied → must re-compress to 200–240kb
        const blob = await (await fetch(output)).blob();
        const bmp2 = await createImageBitmap(blob);

        const tmp = document.createElement('canvas');
        tmp.width = bmp2.width;
        tmp.height = bmp2.height;
        tmp.getContext('2d')!.drawImage(bmp2, 0, 0);

        output = await ensureJpegSize(tmp, 200, 240);
      }

      return output;
    },
    [modelsLoaded, applyWhiteBackground, loadImageBitmapOrElement, whiteBg, bgReady],
  );

  // --------------------------------------------
  // CONCURRENCY RUNNER
  // --------------------------------------------
  const runWithConcurrency = useCallback(
    async (files: File[], concurrency = DEFAULT_CONCURRENCY) => {
      const out: CroppedResult[] = [];
      const errors: string[] = [];
      let i = 0;

      const worker = async () => {
        while (true) {
          const idx = i++;
          if (idx >= files.length) return;
          const file = files[idx];

          try {
            const url = await cropSingleImage(file);
            out.push({ id: crypto.randomUUID(), name: file.name, url });
          } catch (e) {
            errors.push(file.name);
          }
        }
      };

      await Promise.all(
        Array.from({ length: Math.min(concurrency, files.length) }, () => worker()),
      );

      return { out, errors };
    },
    [cropSingleImage],
  );

  // --------------------------------------------
  // handle input
  // --------------------------------------------
  const handleFiles = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (!files.length) return;

      // ★ Agar background-removal ishlatilsa, tayyorligini kutish
      if (whiteBg && !bgReady) {
        setError('Background removal is initializing, please wait 1–2 seconds...');

        return;
      }

      setLoading(true);
      setError(null);
      setResults([]);

      try {
        const { out, errors } = await runWithConcurrency(files);

        if (errors.length) {
          setError('Some pictures failed: ' + errors.join(', '));
        }

        setResults(out);
      } finally {
        setLoading(false);
      }
    },
    [runWithConcurrency, whiteBg, bgReady],
  );

  // --------------------------------------------
  // RENDER
  // --------------------------------------------
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
        <div className="h-[45px] bg-gradient-to-b from-[#f5f5f5] to-[#e8e8e8] p-4 flex items-center text-gray-800">
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
