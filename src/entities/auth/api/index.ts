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

    logout: build.mutation({
      query: () => ({
        url: API_MAP.LOGOUT,
        method: API_METHODS.POST,
      }),
    }),

    getMe: build.query({
      query: () => ({
        url: API_MAP.GET_ME,
        method: API_METHODS.GET,
      }),
    }),
  }),
});

export const { useLoginMutation, useLogoutMutation, useGetMeQuery } = authApi;
