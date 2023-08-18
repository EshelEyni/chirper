import { ThunkAction } from "redux-thunk";
import { AnyAction } from "redux";
import { configureStore } from "@reduxjs/toolkit";

import systemSlice from "./slices/systemSlice";
import authSlice from "./slices/authSlice";
import postEditSlice from "./slices/postEditSlice";

export const store = configureStore({
  reducer: {
    system: systemSlice,
    auth: authSlice,
    postEdit: postEditSlice,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppThunk = ThunkAction<Promise<void>, RootState, undefined, AnyAction>;
