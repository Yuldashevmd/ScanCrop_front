import { baseApi } from 'shared/api';
import { API_MAP, API_METHODS } from 'shared/lib';

export const authApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    login: build.mutation({
      query: (body) => ({
        url: API_MAP.LOGIN,
        method: API_METHODS.POST,
        body,
      }),
    }),
  }),
});

export const { useLoginMutation } = authApi;
