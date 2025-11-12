import { useSelector } from 'react-redux';

export function useAuth() {
  const { isAuth } = useSelector((state: { authSlice: { isAuth: boolean } }) => state.authSlice);
  const { loading } = useSelector((state: { authSlice: { loading: boolean } }) => state.authSlice);

  return {
    isAuth,
    loading,
  };
}
