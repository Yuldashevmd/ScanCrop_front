import { useLang } from 'shared/lib';

export function AuthProfile() {
  const { t } = useLang();

  return (
    <div>
      <button className="min-w-[100px] from-[#245580] to-[#337ab7] bg-gradient-to-t px-3 py-1 rounded text-center cursor-pointer">
        {t('login')}
      </button>
    </div>
  );
}
