import { useAuth, useLogoutMutation } from 'entities/auth';
import { Link, useNavigate } from 'react-router';
import { useLang } from 'shared/lib';

export function AuthProfile() {
  const { t } = useLang();
  const { isAuth, loading } = useAuth();
  const navigate = useNavigate();

  const [logout] = useLogoutMutation();

  const onLogout = async () => {
    const response = await logout({}).unwrap();

    if (response) {
      navigate('/login', { replace: true });
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-300 min-w-[100px] h-[30px] px-3 py-1 rounded animate-pulse"></div>
    );
  }

  if (isAuth) {
    return (
      <button
        onClick={onLogout}
        className="min-w-[100px] from-[#245580] to-[#337ab7] bg-gradient-to-t px-3 py-1 rounded text-center cursor-pointer">
        {t('logout')}
      </button>
    );
  }

  return (
    <Link
      to={'/login'}
      className="min-w-[100px] from-[#245580] to-[#337ab7] bg-gradient-to-t px-3 py-1 rounded text-center cursor-pointer">
      {t('login')}
    </Link>
  );
}
