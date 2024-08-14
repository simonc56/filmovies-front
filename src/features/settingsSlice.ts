import { PayloadAction, createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { SuccessLoginResponse, SuccessProfilResponse } from '../@types/Credentials';
import * as api from '../api';
import type { RootState } from '../store/store';
import { getInitialSettingsState, removeStoreUser, setStoreUser } from '../utils/localStorage';

export const actionLogin = createAsyncThunk('settings/login', async (_, thunkAPI) => {
  const state = thunkAPI.getState() as RootState;
  const { email, password } = state.settings.user;
  const response = await api.login({ email, password });
  return response.data;
});

export const actionSignup = createAsyncThunk('settings/signup', async (_, thunkAPI) => {
  const state = thunkAPI.getState() as RootState;
  const { email, password, firstname, lastname, birthdate } = state.settings.user;
  const response = await api.register({ email, password, firstname, lastname, birthdate });
  return response.data;
});

export const actionGetProfil = createAsyncThunk('settings/getProfil', async () => {
  const response = await api.getProfil();
  return response.data;
});

const settingsSlice = createSlice({
  name: 'settings',
  initialState: getInitialSettingsState,
  reducers: {
    logout: (state) => {
      state.user.firstname = '';
      state.user.lastname = '';
      state.user.email = '';
      state.user.password = '';
      state.user.birthdate = '';
      state.user.logged = false;
      state.user.token = '';
      api.removeTokenJWTToAxiosInstance();
      removeStoreUser();
    },
    updateToken: (state, action: PayloadAction<string>) => {
      state.user.token = action.payload;
      state.user.logged = true;
      setStoreUser(state.user);
    },
    editFirstname: (state, action: PayloadAction<string>) => {
      state.user.firstname = action.payload;
    },
    editLastName: (state, action: PayloadAction<string>) => {
      state.user.lastname = action.payload;
    },
    editEmail: (state, action: PayloadAction<string>) => {
      state.user.email = action.payload;
    },
    editPassword: (state, action: PayloadAction<string>) => {
      state.user.password = action.payload;
    },
    editBirthdate: (state, action: PayloadAction<string>) => {
      state.user.birthdate = action.payload;
    },
    resetMessages: (state) => {
      state.successMessage = null;
      state.errorMessage = null;
    },
  },
  extraReducers(builder) {
    builder
      .addCase(actionLogin.fulfilled, (state, action) => {
        const response = action.payload.data as SuccessLoginResponse;
        state.user.firstname = response.firstname;
        state.user.lastname = response.lastname;
        state.user.birthdate = response.birthdate;
        state.user.token = response.token;
        state.user.logged = true;
        state.user.password = '';
        api.addTokenJWTToAxiosInstance(response.token);
        setStoreUser(state.user);
        state.errorMessage = null;
        state.successMessage = "Vous êtes connecté. Redirection vers la page d'accueil...";
      })
      .addCase(actionLogin.rejected, (state, action) => {
        state.successMessage = null;
        if (action.error.code === 'ERR_NETWORK') {
          state.errorMessage = 'Veuillez vérifier votre connexion Internet.';
          return;
        }
        state.errorMessage = "Veuillez vérifier vos informations d'identification.";
      })
      .addCase(actionSignup.fulfilled, (state, action) => {
        const response = action.payload as SuccessLoginResponse;
        // renvoyer un message de confirmation
      })
      .addCase(actionSignup.rejected, (_, action) => {
        // eslint-disable-next-line no-console
        console.log(action.error.message);
      })
      .addCase(actionGetProfil.fulfilled, (state, action) => {
        const response = action.payload.data as SuccessProfilResponse;
        // fill missing user data
        state.user.birthdate = response.birthdate;
        state.user.subscriptionDate = response.created_at;
        state.user.commentCount = response.count_review;
        state.user.ratingCount = response.count_rating;
      })
      .addCase(actionGetProfil.rejected, (_, action) => {
        // eslint-disable-next-line no-console
        console.log(action.error.message);
      });
  },
});

export const selectUser = (state: RootState) => state.settings.user;

export default settingsSlice.reducer;

export const {
  logout,
  updateToken,
  resetMessages,
  editEmail,
  editPassword,
  editFirstname,
  editLastName,
  editBirthdate,
} = settingsSlice.actions;
