import React, { useState, useEffect, useCallback, type ChangeEvent } from 'react';
import * as faceapi from 'face-api.js';
import { Loading } from './loading';
import { ErrorBoundary } from './error';
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
    (file: File): Promise<string | null> =>
      new Promise((resolve, reject) => {
        if (!modelsLoaded) return reject('Models not loaded yet.');

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = URL.createObjectURL(file);

        img.onload = async () => {
          try {
            // 🟢 1️⃣ Rasm 5:5 (ya’ni 1:1) formatda ekanligini tekshiramiz
            const aspectRatio = img.width / img.height;
            if (Math.abs(aspectRatio - 1) < 0.02) {
              // Faqat xabar chiqadi, natijaga qo‘shilmaydi
              setError(`${file.name} rasm 5:5 o‘lchamda, crop qilinmaydi.`);

              return resolve(null);
            }

            // 2️⃣ Yuzni aniqlaymiz
            const detection = await faceapi
              .detectSingleFace(
                img,
                new faceapi.TinyFaceDetectorOptions({ inputSize: 512, scoreThreshold: 0.5 }),
              )
              .withFaceLandmarks(true);

            if (!detection) throw new Error('Face not detected');

            // 3️⃣ Ko‘zlar markazini aniqlaymiz
            const leftEye = detection.landmarks.getLeftEye();
            const rightEye = detection.landmarks.getRightEye();

            const leftEyeCenter = {
              x: leftEye.reduce((s, p) => s + p.x, 0) / leftEye.length,
              y: leftEye.reduce((s, p) => s + p.y, 0) / leftEye.length,
            };
            const rightEyeCenter = {
              x: rightEye.reduce((s, p) => s + p.x, 0) / rightEye.length,
              y: rightEye.reduce((s, p) => s + p.y, 0) / rightEye.length,
            };

            // 4️⃣ Rasmni aylantirish
            const dy = rightEyeCenter.y - leftEyeCenter.y;
            const dx = rightEyeCenter.x - leftEyeCenter.x;
            const angle = Math.atan2(dy, dx);

            const rotateCanvas = document.createElement('canvas');
            const rctx = rotateCanvas.getContext('2d')!;
            const biggerSize = Math.max(img.width, img.height) * 1.5;
            rotateCanvas.width = biggerSize;
            rotateCanvas.height = biggerSize;

            rctx.translate(biggerSize / 2, biggerSize / 2);
            rctx.rotate(-angle);
            rctx.drawImage(img, -img.width / 2, -img.height / 2);

            const rotatedImage = new Image();
            rotatedImage.src = rotateCanvas.toDataURL();

            rotatedImage.onload = async () => {
              const detRotated = await faceapi
                .detectSingleFace(
                  rotatedImage,
                  new faceapi.TinyFaceDetectorOptions({ inputSize: 512, scoreThreshold: 0.5 }),
                )
                .withFaceLandmarks(true);

              if (!detRotated) {
                console.warn('Face not found after rotation, using original');

                return resolve(rotateCanvas.toDataURL('image/jpeg', 0.95));
              }

              const { landmarks } = detRotated;
              const jaw = landmarks.getJawOutline();
              const jawTop = Math.min(...jaw.map((p) => p.y));
              const jawBottom = Math.max(...jaw.map((p) => p.y));
              const faceHeight = jawBottom - jawTop;
              const scale = ((CANVAS_SIZE * DESIRED_FACE_RATIO) / faceHeight) * BASE_ZOOM;

              const leftEye2 = landmarks.getLeftEye();
              const rightEye2 = landmarks.getRightEye();
              const eyeCenterX = (leftEye2[0].x + rightEye2[3].x) / 2;
              const eyeCenterY =
                (leftEye2.reduce((s, p) => s + p.y, 0) + rightEye2.reduce((s, p) => s + p.y, 0)) /
                (leftEye2.length + rightEye2.length);

              const desiredEyeY = CANVAS_SIZE * DESIRED_EYE_Y_RATIO;
              const dx2 = CANVAS_SIZE / 2 - eyeCenterX * scale;
              const dy2 = desiredEyeY - eyeCenterY * scale - CANVAS_SIZE * TOP_MARGIN_RATIO;

              const canvas = document.createElement('canvas');
              canvas.width = CANVAS_SIZE;
              canvas.height = CANVAS_SIZE;
              const ctx = canvas.getContext('2d')!;
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
              ctx.drawImage(
                rotatedImage,
                dx2,
                dy2,
                rotatedImage.width * scale,
                rotatedImage.height * scale,
              );

              // Oqartirish effekti
              const imageData = ctx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE);
              const data = imageData.data;
              for (let i = 0; i < data.length; i += 4) {
                data[i] = Math.min(data[i] + 15, 255);
                data[i + 1] = Math.min(data[i + 1] + 15, 255);
                data[i + 2] = Math.min(data[i + 2] + 15, 255);
              }
              ctx.putImageData(imageData, 0, 0);

              const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
              resolve(dataUrl);
            };
          } catch (err) {
            reject(err);
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
          setError(`Some pictures could not be detected: ${file.name}`);
        }
      }

      setResults(processed);
      setLoading(false);
    },
    [cropSingleImage],
  );

  // === UI ===
  return (
    <div>
      <div className="mx-[10px] md:mx-[40px] mt-[2.5rem] mb-[1.5rem] text-black text-center space-y-1">
        <h3 className=" text-[24px]">Upload photo to crop</h3>
        <p className="text-sm sm:text-base">Your data not saved on platforms to provide privacy</p>
      </div>
      <hr className="text-gray-200 my-3" />

      <div className="flex justify-center">
        <label
          htmlFor="upload"
          className="cursor-pointer w-full border border-gray-300 px-[12px] py-[6px] min-h-[38px] rounded">
          Click to upload images
        </label>
        <input
          id="upload"
          type="file"
          accept="image/*"
          multiple
          onChange={handleFiles}
          placeholder="Please upload images"
          className="hidden"
        />
      </div>

      <div className="border border-gray-300 rounded my-4">
        <div className="h-[45px] from-gray-[#f5f5f5] to-[#e8e8e8] bg-gradient-to-b p-4 flex items-center text-gray-800">
          Images
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
