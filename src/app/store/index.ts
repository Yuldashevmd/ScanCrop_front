import { configureStore, type ConfigureStoreOptions } from '@reduxjs/toolkit';
import { authSlice } from 'entities/auth';
import { baseApi } from 'shared/api';

export const createStore = (options?: ConfigureStoreOptions['preloadedState'] | undefined) =>
  configureStore({
    reducer: {
      [baseApi.reducerPath]: baseApi.reducer,
      authSlice: authSlice.reducer,
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(baseApi.middleware),
    devTools: true,
    ...options,
  });

export const store = createStore();
