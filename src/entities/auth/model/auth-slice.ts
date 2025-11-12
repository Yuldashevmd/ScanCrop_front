import { createSlice } from '@reduxjs/toolkit';
import { authApi } from '../api';

const initialState = {
  isAuth: false,
  loading: false,
};

export const authSlice = createSlice({
  name: 'authSlice',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    // login
    builder.addMatcher(authApi.endpoints.login.matchPending, (state) => {
      state.loading = true;
    });
    builder.addMatcher(authApi.endpoints.login.matchRejected, (state) => {
      state.loading = false;
    });
    builder.addMatcher(authApi.endpoints.login.matchFulfilled, (state) => {
      state.isAuth = true;
      state.loading = false;
    });
    // logout
    builder.addMatcher(authApi.endpoints.logout.matchPending, (state) => {
      state.loading = true;
    });
    builder.addMatcher(authApi.endpoints.logout.matchRejected, (state) => {
      state.loading = false;
    });
    builder.addMatcher(authApi.endpoints.logout.matchFulfilled, (state) => {
      state.isAuth = false;
      state.loading = false;
    });
    // getMe
    builder.addMatcher(authApi.endpoints.getMe.matchPending, (state) => {
      state.loading = true;
    });
    builder.addMatcher(authApi.endpoints.getMe.matchRejected, (state) => {
      state.loading = false;
    });
    builder.addMatcher(authApi.endpoints.getMe.matchFulfilled, (state, action) => {
      state.isAuth = action.payload.isAuth;
      state.loading = false;
    });
  },
});

export const {} = authSlice.actions;
export default authSlice.reducer;
