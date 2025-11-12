import { useLang } from 'shared/lib';

export function Loading({ loading }: { loading: boolean }) {
  const { t } = useLang();
  if (!loading) return null;

  return <div className="text-gray-800 text-lg animate-pulse">{t('loading')}</div>;
}
