import { PayloadAction, createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import {
  MovieState,
  MoviesFilter,
  SuccessMoviesResponse,
  SuccessMoviesSearchResponse,
  SuccessOneMovieResponse,
  SuccessRatingResponse,
  SuccessReviewResponse,
} from '../@types/MovieState';
import * as api from '../api';
// import type { RootState } from '../store/store';
import { budgetToMillions, isNumber, isoDateToFrench, isoDateToYear } from '../utils/utils';

const movieState: MovieState = {
  currentMovie: null,
  movieList: [],
  movieResultList: [],
};

// thunk types: createAsyncThunk<returned object type, received arg type>
export const actionFetchOneMovie = createAsyncThunk<SuccessOneMovieResponse, string>(
  'movies/fetchOneMovie',
  async (id, thunkAPI) => {
    if (id === undefined) {
      return thunkAPI.rejectWithValue('No id provided');
    }
    if (!isNumber(id as string)) {
      return thunkAPI.rejectWithValue('Invalid id');
    }
    const response = await api.getMovieById(id as string);
    return response.data;
  }
);

// fetch a list of movies based on a predefined filter such as 'nowplaying', 'popular', 'upcoming', 'toprated'
export const actionFetchMovies = createAsyncThunk<SuccessMoviesResponse, MoviesFilter>(
  'movies/fetchMovies',
  async (filter, thunkAPI) => {
    if (filter === undefined) {
      return thunkAPI.rejectWithValue('No filter provided');
    }
    const response = await api.getMoviesByFilter(filter);
    return response.data;
  }
);

// fetch a list of movies with title_fr corresponding to the search query
export const actionSearchMovies = createAsyncThunk<SuccessMoviesSearchResponse, string>(
  'movies/searchMovies',
  async (query, thunkAPI) => {
    if (query === undefined) {
      return thunkAPI.rejectWithValue('No query provided');
    }
    const response = await api.searchMovies(query);
    return response.data;
  }
);

export const actionPostReview = createAsyncThunk<[SuccessReviewResponse], { review: string; tmdbId: number }>(
  'movie/postReview',
  async (payload, thunkAPI) => {
    const { review, tmdbId } = payload;
    if (review === undefined) {
      return thunkAPI.rejectWithValue('No review provided');
    }
    if (tmdbId === undefined || Number.isNaN(tmdbId)) {
      return thunkAPI.rejectWithValue('No tmdbId provided');
    }
    const response = await api.postReview(review, tmdbId);
    return [response.data];
  }
);

export const actionUpdateReview = createAsyncThunk<[SuccessReviewResponse, number], { review: string; id: number }>(
  'movie/updateReview',
  async (payload, thunkAPI) => {
    const { review, id } = payload;
    if (review === undefined) {
      return thunkAPI.rejectWithValue('No review provided');
    }
    if (id === undefined || Number.isNaN(id)) {
      return thunkAPI.rejectWithValue('No review id provided');
    }
    const response = await api.patchReview(review, id);
    // send both api response and review id
    return [response.data, id];
  }
);

export const actionPostRating = createAsyncThunk<[SuccessRatingResponse, number], { rating: number; tmdbId: number }>(
  'movie/postRating',
  async (payload, thunkAPI) => {
    const { rating, tmdbId } = payload;
    const allowedRatings = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];
    if (rating === undefined || Number.isNaN(rating) || !allowedRatings.includes(rating)) {
      return thunkAPI.rejectWithValue('No rating provided');
    }
    if (tmdbId === undefined || Number.isNaN(tmdbId)) {
      return thunkAPI.rejectWithValue('No tmdbId provided');
    }
    const response = await api.postRating(rating, tmdbId);
    // send both api response and rating value because value is not provided by api
    return [response.data, rating];
  }
);

export const actionUpdateRating = createAsyncThunk<[SuccessRatingResponse, number], { rating: number; id: number }>(
  'movie/updateRating',
  async (payload, thunkAPI) => {
    const { rating, id } = payload;
    if (rating === undefined) {
      return thunkAPI.rejectWithValue('No rating provided');
    }
    if (id === undefined || Number.isNaN(id)) {
      return thunkAPI.rejectWithValue('No rating id provided');
    }
    const response = await api.patchRating(rating, id);
    // send both api response and rating value because value is not provided by api
    return [response.data, rating];
  }
);

const moviesSlice = createSlice({
  name: 'movies',
  initialState: movieState,
  reducers: {
    actionResetCurrentMovie: (state) => {
      state.currentMovie = null;
    },
    actionResetMovieList: (state) => {
      state.movieList = [];
    },
    resetMovieResultList: (state) => {
      state.movieResultList = [];
    },
    addedInPlaylist: (state, action: PayloadAction<number>) => {
      if (state.currentMovie?.user_data) {
        state.currentMovie.user_data.in_playlists.push(action.payload);
      } else if (state.currentMovie) {
        state.currentMovie.user_data = {
          userId: 0,
          rating: null,
          review: null,
          in_playlists: [action.payload],
        };
      }
    },
  },
  extraReducers(builder) {
    builder
      .addCase(actionFetchOneMovie.fulfilled, (state, action) => {
        const response = action.payload as SuccessOneMovieResponse;
        state.currentMovie = response.data;
        state.currentMovie.budgetInMillions = budgetToMillions(state.currentMovie.budget);
        state.currentMovie.frenchDate = isoDateToFrench(state.currentMovie.release_date);
        state.currentMovie.year = isoDateToYear(state.currentMovie.release_date);
      })
      .addCase(actionFetchOneMovie.rejected, (_, action) => {
        // eslint-disable-next-line no-console
        console.log('Error :', action.error.message);
        if (action.payload) {
          // eslint-disable-next-line no-console
          console.log('Error :', action.payload);
        }
      })
      .addCase(actionFetchMovies.fulfilled, (state, action) => {
        const response = action.payload as SuccessMoviesResponse;
        state.movieList = response.data;
      })
      .addCase(actionSearchMovies.fulfilled, (state, action) => {
        const response = action.payload as SuccessMoviesSearchResponse;
        state.movieResultList = response.data;
      })
      .addCase(actionPostReview.fulfilled, (state, action) => {
        const [response] = action.payload;
        if (response.status === 'success') {
          const { review_id, content } = response.data;
          // add review in reviews list of current movie object
          if (state.currentMovie && review_id) {
            state.currentMovie.reviews.push({ review_id, content });
            if (state.currentMovie.user_data) {
              state.currentMovie.user_data.review = { review_id, content };
            } else {
              state.currentMovie.user_data = {
                userId: 0,
                rating: null,
                review: { review_id, content },
                in_playlists: [],
              };
            }
          }
        }
      })
      .addCase(actionUpdateReview.fulfilled, (state, action) => {
        const [response, id] = action.payload;
        if (response.status === 'success') {
          // add review in reviews list of current movie object
          console.log(response.data);
          if (state.currentMovie) {
            state.currentMovie.reviews = state.currentMovie.reviews.map((item) => {
              if (item.review_id === id) {
                return { review_id: id, content: response.data.content };
              }
              return item;
            });
            state.currentMovie.user_data.review!.content = response.data.content;
          }
        }
      })
      .addCase(actionPostRating.fulfilled, (state, action) => {
        const [response, rating] = action.payload;
        if (response.status === 'success') {
          const { rating_id, media_average_rating } = response.data;
          if (state.currentMovie && rating_id) {
            state.currentMovie.average_rating = media_average_rating;
            if (state.currentMovie.user_data) {
              state.currentMovie.user_data.rating = { rating_id, value: rating };
            } else {
              state.currentMovie.user_data = {
                userId: 0,
                rating: { rating_id, value: rating },
                review: null,
                in_playlists: [],
              };
            }
          }
        }
      })
      .addCase(actionUpdateRating.fulfilled, (state, action) => {
        const [response, rating] = action.payload;
        if (response.status === 'success') {
          const { media_average_rating } = response.data;
          if (state.currentMovie) {
            state.currentMovie.average_rating = media_average_rating;
            state.currentMovie.user_data.rating!.value = rating;
          }
        }
      });
  },
});

export default moviesSlice.reducer;

export const { actionResetCurrentMovie, actionResetMovieList, resetMovieResultList, addedInPlaylist } =
  moviesSlice.actions;
