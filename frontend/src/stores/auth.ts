import type { AuthSession, LoginPayload, SignupPayload, SignupResponse, UserProfile } from '@shared/types';
import { defineStore } from 'pinia';
import { getJson, postJson } from '@/lib/api';

const ACCESS_TOKEN_KEY = 'bubble-catcher-access-token';
const REFRESH_TOKEN_KEY = 'bubble-catcher-refresh-token';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as UserProfile | null,
    accessToken: localStorage.getItem(ACCESS_TOKEN_KEY),
    refreshToken: localStorage.getItem(REFRESH_TOKEN_KEY),
  }),

  getters: {
    isAuthenticated: (state) => !!state.accessToken,
  },

  actions: {
    /** Rehydrates `user` from the access token — needed after a page reload, since only the tokens are persisted. */
    async fetchProfile() {
      if (!this.accessToken) return;
      const result = await getJson<UserProfile>('/user/profile', this.accessToken);
      if (result.success) this.user = result.data;
    },

    setSession(session: AuthSession) {
      this.user = session.user;
      this.accessToken = session.accessToken;
      this.refreshToken = session.refreshToken;
      localStorage.setItem(ACCESS_TOKEN_KEY, session.accessToken);
      localStorage.setItem(REFRESH_TOKEN_KEY, session.refreshToken);
    },

    /** Throws with the backend's error code as the message (e.g. 'INVALID_CREDENTIALS') — callers resolve it via resolveErrorCode(). */
    async login(payload: LoginPayload) {
      const result = await postJson<AuthSession>('/auth/login', payload);
      if (!result.success) throw new Error(result.error.code);
      this.setSession(result.data);
    },

    /** Returns `{ pending: true }` when the instance requires admin approval — no session is created yet. */
    async signup(payload: SignupPayload): Promise<SignupResponse> {
      const result = await postJson<SignupResponse>('/auth/signup', payload);
      if (!result.success) throw new Error(result.error.code);
      if (!result.data.pending) this.setSession(result.data);
      return result.data;
    },

    /** Best-effort — revokes the refresh token server-side, but always clears local state even if the request fails (e.g. offline). */
    async logout() {
      const refreshToken = this.refreshToken;
      this.user = null;
      this.accessToken = null;
      this.refreshToken = null;
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);

      if (refreshToken) {
        try {
          await postJson('/auth/logout', { refreshToken });
        } catch {
          /* Local session is already cleared — a failed revoke just leaves a stale token to expire naturally. */
        }
      }
    },
  },
});
