import { useCallback } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

type CroppedResult = {
  id: string;
  name: string;
  url: string;
};

interface IProps {
  results: CroppedResult[];
}

export function DownloadImages(props: IProps) {
  const { results } = props;

  const downloadAll = useCallback(async () => {
    const zip = new JSZip();
    results.forEach((r) => {
      const base64 = r.url.split(',')[1];
      zip.file(`${r.name.replace(/\.[^/.]+$/, '')}_crop.jpg`, base64, { base64: true });
    });

    const blob = await zip.generateAsync({ type: 'blob' });
    saveAs(blob, 'cropped_photos.zip');
  }, [results]);

  return (
    <div className="mt-8">
      <button
        onClick={downloadAll}
        className="px-10 py-3 bg-indigo-500 text-white font-bold rounded-full shadow-lg hover:bg-indigo-700 transition cursor-pointer">
        Download all photos (zip)
      </button>
    </div>
  );
}
