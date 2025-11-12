import { useLoginMutation } from 'entities/auth';
import { useState } from 'react';
import { useLang } from 'shared/lib';

export function Login() {
  const { t } = useLang();
  const [userLogin, setUserLogin] = useState('');
  const [userPassword, setUserPassword] = useState('');

  const [login, { isLoading, isError }] = useLoginMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('kirdi', userLogin);

    try {
      if (userLogin && userPassword) {
        const response = await login({ login: userLogin, password: userPassword }).unwrap();
        if (response) {
          console.log(response);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex items-center justify-center h-[80dvh]">
      <div className="max-w-150 w-full min-h-fit px-8 py-6 mt-4 text-left bg-white border border-gray-300 rounded-lg">
        <h3 className="text-base sm:text-2xl font-bold text-center">{t('login-title')}</h3>
        <form id="login-form" onSubmit={handleSubmit} autoComplete="off" autoCorrect="off">
          <div className="mt-4">
            <div>
              <label className="block text-sm sm:text-base" htmlFor="login">
                {t('auth.login')}
              </label>
              <input
                placeholder={t('auth.login-placeholder')}
                className="w-full px-4 py-2 mt-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600  text-sm sm:text-base"
                id="login"
                value={userLogin}
                onChange={(e) => setUserLogin(e.target.value)}
                required
              />
            </div>
            <div className="mt-4">
              <label className="block  text-sm sm:text-base" htmlFor="password">
                {t('auth.password')}
              </label>
              <input
                type="password"
                placeholder={t('auth.password-placeholder')}
                className="w-full px-4 py-2 mt-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600  text-sm sm:text-base"
                id="password"
                value={userPassword}
                onChange={(e) => setUserPassword(e.target.value)}
                required
              />
            </div>
            <div className="mt-4">
              <button
                form="login-form"
                disabled={isLoading}
                type="submit"
                className="min-w-[100px] from-[#245580] to-[#337ab7] bg-gradient-to-t px-3 py-1 rounded text-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-white w-full min-h-[35px] sm:min-h-[40px]  text-sm sm:text-base">
                {isLoading ? t('loading') : t('login')}
              </button>
            </div>
            {isError && (
              <div className="mt-4 text-red-500 text-sm sm:text-base">{t('auth.login-error')}</div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
