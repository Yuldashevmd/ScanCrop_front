import { useGetMeQuery } from 'entities/auth';
import { Navigate } from 'react-router';

export function Proxy({ children }: { children: React.ReactNode }) {
  const { data, isLoading, isError } = useGetMeQuery({});

  if (isLoading) return <div>Loading...</div>;
  if (isError || data?.isAuth !== true) return <Navigate to="/login" replace />;

  return <>{children}</>;
}
