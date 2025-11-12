import { useGetMeQuery } from 'entities/auth';
import { Navigate } from 'react-router';

export function Proxy({ children }: { children: React.ReactNode }) {
  const { data } = useGetMeQuery({});

  if (!data?.isAuth) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
