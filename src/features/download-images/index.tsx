import { useCallback } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { useLang } from 'shared/lib';

type CroppedResult = {
  id: string;
  name: string;
  url: string;
};

interface IProps {
  results: CroppedResult[];
}

declare global {
  interface Window {
    showSaveFilePicker?: (options?: any) => Promise<any>;
  }
}

export function DownloadImages({ results }: IProps) {
  const { t } = useLang();

  const downloadAll = useCallback(async () => {
    try {
      // Zip yaratish
      const zip = new JSZip();
      results.forEach((r) => {
        const base64 = r.url.split(',')[1];
        zip.file(`${r.name.replace(/\.[^/.]+$/, '')}_crop.jpg`, base64, { base64: true });
      });

      const blob = await zip.generateAsync({ type: 'blob' });

      if (window.showSaveFilePicker) {
        try {
          const fileHandle = await window.showSaveFilePicker({
            suggestedName: 'cropped_photos.zip',
            types: [{ description: 'ZIP file', accept: { 'application/zip': ['.zip'] } }],
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
        saveAs(blob, 'cropped_photos.zip');
      }
    } catch (err) {
      console.error('Failed to save zip file', err);
      alert('Failed to save zip file. Please try again.');
    }
  }, [results]);

  return (
    <div className="mt-8 w-fit">
      <button
        onClick={downloadAll}
        className="from-[#245580] to-[#337ab7] bg-gradient-to-t px-3 py-1 rounded text-center cursor-pointer w-full min-h-[38px] text-white">
        {t('download_all')}
      </button>
    </div>
  );
}
