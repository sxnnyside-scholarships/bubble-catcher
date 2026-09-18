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
    /** Fetches the current user profile using the active access token. */
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

    /** Authenticates user with credentials and initializes session. */
    async login(payload: LoginPayload) {
      const result = await postJson<AuthSession>('/auth/login', payload);
      if (!result.success) throw new Error(result.error.code);
      this.setSession(result.data);
    },

    /** Registers new user account with provided payload. */
    async signup(payload: SignupPayload): Promise<SignupResponse> {
      const result = await postJson<SignupResponse>('/auth/signup', payload);
      if (!result.success) throw new Error(result.error.code);
      if (!result.data.pending) this.setSession(result.data);
      return result.data;
    },

    /** Terminates current session, clears stored tokens, and revokes server token. */
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
          // Ignore network errors during token revocation
        }
      }
    },
  },
});
