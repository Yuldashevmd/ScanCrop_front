import { DownloadImages } from 'features/download-images';
import { type CroppedResult } from './index';

export function ResultList({ results }: { results: CroppedResult[] }) {
  return (
    <>
      {results.length > 0 && (
        <div className="mt-10">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {results.map((r) => (
              <div
                key={r.id}
                className="bg-white/10 backdrop-blur-md p-4 rounded-2xl flex flex-col items-center shadow-lg">
                <img
                  src={r.url}
                  alt={r.name}
                  className="rounded-xl w-full aspect-square object-cover border border-white/20"
                />
                <SingleDownload r={r} />
              </div>
            ))}
          </div>
          <DownloadImages results={results} />
        </div>
      )}
    </>
  );
}

function SingleDownload({ r }: { r: CroppedResult }) {
  return (
    <a
      href={r.url}
      download={`${r.name.replace(/\.[^/.]+$/, '')}_crop.jpg`}
      className="mt-3 w-full">
      <button className="w-full py-2 rounded-full bg-white text-indigo-600 font-semibold shadow-md hover:bg-indigo-50 transition">
        Download
      </button>
    </a>
  );
}
