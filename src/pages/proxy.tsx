import { useGetMeQuery } from 'entities/auth';

export function Proxy() {
  const { data } = useGetMeQuery({});
  console.log(data, 'data');

  return null;
}
