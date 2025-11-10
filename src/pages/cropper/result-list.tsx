import { DownloadImages } from 'features/download-images';
import { type CroppedResult } from './index';
import { useDisclosure } from 'shared/lib';
import { useState } from 'react';

export function ResultList({ results }: { results: CroppedResult[] }) {
  const { onOpen, isOpen, onClose } = useDisclosure();
  const [imageUrl, setImageUrl] = useState<string>();

  const openImage = (url: string) => {
    onOpen();
    setImageUrl(url);
  };

  const closeImage = () => {
    onClose();
    setImageUrl(undefined);
  };

  return (
    <>
      {results.length > 0 && (
        <div className="mt-10">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {results.map((r) => (
              <div
                key={r.id}
                className="bg-white/10 backdrop-blur-md p-4 rounded-2xl flex flex-col items-center shadow-lg">
                <button onClick={() => openImage(r.url)}>
                  <img
                    loading="lazy"
                    src={r.url}
                    alt={r.name}
                    className="rounded-xl w-full aspect-square object-cover border border-white/20"
                  />
                </button>
                <SingleDownload r={r} />
              </div>
            ))}
          </div>
          <DownloadImages results={results} />
        </div>
      )}
      {/* Dialog */}
      <Dialog isOpen={isOpen} imageUrl={imageUrl} closeImage={closeImage} />
    </>
  );
}

declare global {
  interface Window {
    showSaveFilePicker?: (options?: any) => Promise<any>;
  }
}

export function SingleDownload({ r }: { r: CroppedResult }) {
  const handleSave = async () => {
    try {
      const response = await fetch(r.url);
      const blob = await response.blob();

      if (window.showSaveFilePicker) {
        try {
          const fileHandle = await window.showSaveFilePicker({
            suggestedName: `${r.name.replace(/\.[^/.]+$/, '')}_crop.jpg`,
            types: [{ description: 'JPEG image', accept: { 'image/jpeg': ['.jpg'] } }],
          });

          if (!fileHandle) return;

          const writable = await fileHandle.createWritable();
          await writable.write(blob);
          await writable.close();
        } catch (err: any) {
          if (err.name === 'AbortError') return;
          throw err;
        }
      } else {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${r.name.replace(/\.[^/.]+$/, '')}_crop.jpg`;
        link.click();
        URL.revokeObjectURL(link.href);
      }
    } catch (err) {
      console.error('File save failed', err);
      alert('File save failed. Please try again.');
    }
  };

  return (
    <button
      onClick={handleSave}
      className="mt-3 w-full py-2 rounded-full bg-white text-indigo-600 font-semibold shadow-md hover:bg-indigo-50 transition">
      Save As...
    </button>
  );
}

function Dialog({
  imageUrl,
  isOpen,
  closeImage,
}: {
  imageUrl: string | undefined;
  isOpen: boolean;
  closeImage: () => void;
}) {
  if (!imageUrl) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          closeImage();
        }
      }}
      className={
        isOpen
          ? 'fixed inset-0 w-full h-full flex items-center justify-center bg-black/50 z-50'
          : 'hidden'
      }>
      <button className="absolute right-2 top-1 text-2xl text-white" onClick={closeImage}>
        X
      </button>
      <img
        loading="lazy"
        src={imageUrl}
        alt={'image'}
        className="rounded-xl max-w-fit max-h-fit w-full h-full"
      />
    </div>
  );
}
