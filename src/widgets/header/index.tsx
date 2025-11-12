import { AuthProfile } from 'features/auth-profile';
import { Link } from 'react-router';
import { useLang } from 'shared/lib';

export function HeaderUI() {
  const { t } = useLang();

  return (
    <header className="bg-[#337ab7] h-[50px] w-full px-4 flex justify-center items-center text-white">
      <section className="max-w-[1080px] w-full flex justify-between items-center">
        <Link to={'/'}>
          <h2 className="text-xl font-semibold">{t('app-name')}</h2>
        </Link>

        {/* AUTH */}
        <AuthProfile />
      </section>
    </header>
  );
}
