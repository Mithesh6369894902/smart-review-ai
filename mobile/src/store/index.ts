import { configureStore, createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { AnalysisResult, BatchSummary, Stats } from '../types';
import { api } from '../services/api';

interface AppState {
  analyses: AnalysisResult[];
  stats: Stats | null;
  isLoading: boolean;
  error: string | null;
  currentAnalysis: AnalysisResult | null;
  notice: string | null;
  serverOnline: boolean;
  offlineMode: boolean;
}

const initialState: AppState = {
  analyses: [],
  stats: null,
  isLoading: false,
  error: null,
  currentAnalysis: null,
  notice: null,
  serverOnline: false,
  offlineMode: false,
};

const FALLBACK_NOTICE = 'Cloud server unreachable — used on-device AI';

export const analyzeReview = createAsyncThunk(
  'app/analyzeReview',
  async ({ text, productName }: { text: string; productName?: string }, { rejectWithValue }) => {
    try {
      const response = await api.analyzeReview(text, productName);
      return { result: response.data, fallback: !!response.fallback };
    } catch (e: any) {
      return rejectWithValue(e.message || 'Analysis failed');
    }
  }
);

export const analyzeBatch = createAsyncThunk(
  'app/analyzeBatch',
  async ({ reviews, productName }: { reviews: string[]; productName?: string }, { rejectWithValue }) => {
    try {
      const response = await api.analyzeBatch(reviews, productName);
      return { data: response.data, fallback: !!response.fallback };
    } catch (e: any) {
      return rejectWithValue(e.message || 'Batch analysis failed');
    }
  }
);

export const fetchHistory = createAsyncThunk(
  'app/fetchHistory',
  async (limit?: number) => {
    const response = await api.getHistory(limit ?? 100);
    return response.data;
  }
);

export const fetchStats = createAsyncThunk(
  'app/fetchStats',
  async () => {
    const response = await api.getStats();
    return response.data;
  }
);

export const refreshAll = createAsyncThunk(
  'app/refreshAll',
  async (_, { dispatch }) => {
    await Promise.all([dispatch(fetchHistory()), dispatch(fetchStats())]);
  }
);

export const checkServer = createAsyncThunk(
  'app/checkServer',
  async () => {
    const h = await api.checkHealth();
    return { online: h.ok, offline: h.offline };
  }
);

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    clearCurrentAnalysis: (state) => {
      state.currentAnalysis = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    setNotice: (state, action: PayloadAction<string>) => {
      state.notice = action.payload;
    },
    clearNotice: (state) => {
      state.notice = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(analyzeReview.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        state.notice = null;
      })
      .addCase(analyzeReview.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentAnalysis = action.payload.result;
        state.analyses.unshift(action.payload.result);
        if (action.payload.fallback) state.notice = FALLBACK_NOTICE;
      })
      .addCase(analyzeReview.rejected, (state, action) => {
        state.isLoading = false;
        state.error = (action.payload as string) || action.error.message || 'Analysis failed';
      })
      .addCase(analyzeBatch.fulfilled, (state, action) => {
        if (action.payload.fallback) state.notice = FALLBACK_NOTICE;
      })
      .addCase(fetchHistory.fulfilled, (state, action: PayloadAction<AnalysisResult[]>) => {
        state.analyses = action.payload;
      })
      .addCase(fetchStats.fulfilled, (state, action: PayloadAction<Stats>) => {
        state.stats = action.payload;
      })
      .addCase(checkServer.fulfilled, (state, action) => {
        state.serverOnline = action.payload.online;
        state.offlineMode = action.payload.offline;
      });
  },
});

export const { clearCurrentAnalysis, clearError, setNotice, clearNotice } = appSlice.actions;

export const store = configureStore({
  reducer: {
    app: appSlice.reducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export type { BatchSummary };
