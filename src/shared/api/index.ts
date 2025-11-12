import {
  createApi,
  fetchBaseQuery,
  type BaseQueryApi,
  type FetchArgs,
} from '@reduxjs/toolkit/query/react';

const baseUrl = import.meta.env.VITE_APP_URL_DEV;

const baseQuery = async (
  args: string | FetchArgs,
  api: BaseQueryApi,
  extraOptions?: Record<string, unknown>,
) => {
  const rawResult = await fetchBaseQuery({
    baseUrl,
    prepareHeaders: (headers) => {
      headers.set('credentials', 'include');
      headers.set('Content-Type', 'application/json');

      return headers;
    },
  })(args, api, extraOptions ?? {});

  return rawResult;
};

export const baseApi = createApi({
  reducerPath: 'baseApi',
  baseQuery,
  endpoints: () => ({}),
  tagTypes: [''],
});
