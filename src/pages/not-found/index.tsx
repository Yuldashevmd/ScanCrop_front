import { Link } from 'react-router';
import { useLang } from 'shared/lib';

export function NotfoundPage() {
  const { t } = useLang();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 text-gray-800">
      <h1 className="text-9xl font-bold text-blue-600">404</h1>
      <h2 className="text-4xl font-semibold mt-4 mb-2">{t('not-found')}</h2>
      <p className="text-lg text-gray-600 mb-8">{t('page-not-found')}</p>
      <Link
        to="/"
        className="px-6 py-3 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 transition duration-300 ease-in-out">
        {t('go-to-homepage')}
      </Link>
    </div>
  );
}
