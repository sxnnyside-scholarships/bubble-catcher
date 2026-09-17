<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { resolveErrorCode } from '@/i18n';
import { checkPassword, isValidEmail, isValidPassword } from '@/lib/validators';
import { useAuthStore } from '@/stores/auth';

const { t } = useI18n();
const router = useRouter();
const auth = useAuthStore();

const isSignUp = ref(false);
const name = ref('');
const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const showPassword = ref(false);
const showConfirmPassword = ref(false);
const touched = ref(false);
const passwordFocused = ref(false);
const isSubmitting = ref(false);
const submitError = ref('');
const ownerNotice = ref(false);
const pendingApproval = ref(false);

const passwordChecklist = computed(() => checkPassword(password.value));
const showPasswordChecklist = computed(() => isSignUp.value && (passwordFocused.value || password.value.length > 0));

const nameError = computed(() => {
  if (!isSignUp.value || !touched.value || name.value.trim()) return '';
  return t('auth.nameRequired');
});

const emailError = computed(() => {
  if (!touched.value || !email.value) return '';
  return isValidEmail(email.value) ? '' : t('auth.emailInvalid');
});

const confirmPasswordError = computed(() => {
  if (!isSignUp.value || !touched.value || !confirmPassword.value) return '';
  return confirmPassword.value === password.value ? '' : t('auth.passwordMismatch');
});

const canSubmit = computed(() => {
  if (!isValidEmail(email.value) || !password.value) return false;
  if (!isSignUp.value) return true;
  return !!name.value.trim() && isValidPassword(password.value) && confirmPassword.value === password.value;
});

async function handleSubmit() {
  touched.value = true;
  submitError.value = '';
  if (!canSubmit.value) return;

  isSubmitting.value = true;
  try {
    if (isSignUp.value) {
      const result = await auth.signup({ name: name.value.trim(), email: email.value, password: password.value });
      if (result.pending) {
        pendingApproval.value = true;
        return;
      }
      if (result.user.isOwner) {
        ownerNotice.value = true;
        return;
      }
    } else {
      await auth.login({ email: email.value, password: password.value });
    }
    router.push('/dashboard');
  } catch (err) {
    submitError.value = resolveErrorCode(err instanceof Error ? err.message : 'INTERNAL_ERROR');
  } finally {
    isSubmitting.value = false;
  }
}

function toggleMode() {
  isSignUp.value = !isSignUp.value;
  touched.value = false;
  submitError.value = '';
  pendingApproval.value = false;
  showPassword.value = false;
  showConfirmPassword.value = false;
  name.value = '';
}
</script>

<template>
  <div class="flex h-full flex-col justify-center px-6 py-10 sm:px-10 lg:px-12">
    <!-- Brand Icon at Top of Form -->
    <div class="mb-6 flex flex-col items-center text-center">
      <img
        src="/favicon.svg"
        alt="Bubble Catcher Logo"
        class="mb-3 h-20 w-20 object-contain drop-shadow-lg transition-transform duration-300 hover:scale-105"
      />

      <h2 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--color-text)]">
        {{ isSignUp ? t('auth.signUp') : t('auth.signIn') }}
      </h2>
      <p class="mt-1 text-xs text-[var(--color-text-secondary)]">
        {{ isSignUp ? t('auth.signUpDescription') : t('auth.welcomeBack') }}
      </p>
    </div>

    <!-- Owner banner — shown once, right after the first account on the instance signs up -->
    <div v-if="ownerNotice" class="flex flex-col items-center gap-4 text-center">
      <div class="rounded-xl border border-[var(--color-success)]/40 bg-[var(--color-success)]/10 p-4 text-sm text-[var(--color-success)]">
        {{ t('auth.ownerBanner') }}
      </div>
      <button type="button" class="btn-bubble w-full font-semibold tracking-wide" @click="router.push('/dashboard')">
        {{ t('auth.signIn') }}
      </button>
    </div>

    <!-- Pending-approval notice — shown after signup when the instance requires admin approval -->
    <div v-else-if="pendingApproval" class="flex flex-col items-center gap-3 text-center">
      <h3 class="text-lg font-bold text-[var(--color-text)]">{{ t('auth.pendingApprovalTitle') }}</h3>
      <p class="text-sm text-[var(--color-text-secondary)]">{{ t('auth.pendingApprovalBody') }}</p>
      <button type="button" class="btn-bubble-ghost mt-2 font-medium" @click="toggleMode">
        {{ t('auth.signIn') }}
      </button>
    </div>

    <!-- Auth Form -->
    <form v-else class="flex flex-col gap-4" novalidate @submit.prevent="handleSubmit">
      <div
        v-if="submitError"
        class="rounded-xl border border-[var(--color-error)]/40 bg-[var(--color-error)]/10 p-3.5 text-sm text-[var(--color-error)] backdrop-blur-sm transition-all"
      >
        {{ submitError }}
      </div>

      <!-- Name Field (Sign Up only) -->
      <label v-if="isSignUp" class="flex flex-col gap-1.5 text-sm">
        <span class="font-medium text-[var(--color-text-secondary)]">{{ t('auth.name') }}</span>
        <div class="relative">
          <input
            v-model="name"
            type="text"
            autocomplete="name"
            required
            @blur="touched = true"
            class="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 px-4 py-2.5 text-sm text-[var(--color-text)] placeholder-[var(--color-text-tertiary)] outline-none transition-all duration-200 focus:border-[var(--color-primary-500)] focus:ring-2 focus:ring-[var(--color-primary-500)]/20"
            placeholder="Ada Lovelace"
          />
        </div>
        <span v-if="nameError" class="text-xs text-[var(--color-error)]">{{ nameError }}</span>
      </label>

      <!-- Email Field -->
      <label class="flex flex-col gap-1.5 text-sm">
        <span class="font-medium text-[var(--color-text-secondary)]">{{ t('auth.email') }}</span>
        <div class="relative">
          <input
            v-model="email"
            type="email"
            autocomplete="email"
            required
            @blur="touched = true"
            class="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 px-4 py-2.5 text-sm text-[var(--color-text)] placeholder-[var(--color-text-tertiary)] outline-none transition-all duration-200 focus:border-[var(--color-primary-500)] focus:ring-2 focus:ring-[var(--color-primary-500)]/20"
            placeholder="estudiante@ejemplo.com"
          />
        </div>
        <span v-if="emailError" class="text-xs text-[var(--color-error)]">{{ emailError }}</span>
      </label>

      <!-- Password Field -->
      <label class="flex flex-col gap-1.5 text-sm">
        <span class="font-medium text-[var(--color-text-secondary)]">{{ t('auth.password') }}</span>
        <div class="relative">
          <input
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            :autocomplete="isSignUp ? 'new-password' : 'current-password'"
            required
            @focus="passwordFocused = true"
            @blur="touched = true; passwordFocused = false"
            class="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 px-4 py-2.5 pr-11 text-sm text-[var(--color-text)] placeholder-[var(--color-text-tertiary)] outline-none transition-all duration-200 focus:border-[var(--color-primary-500)] focus:ring-2 focus:ring-[var(--color-primary-500)]/20"
            placeholder="••••••••"
          />
          <button
            type="button"
            @click="showPassword = !showPassword"
            class="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-[var(--color-text-tertiary)] transition-colors hover:text-[var(--color-text-secondary)] focus:outline-none"
            :aria-label="showPassword ? 'Ocultar contraseña' : 'Ver contraseña'"
          >
            <!-- Eye / Eye-off SVGs -->
            <svg
              v-if="!showPassword"
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <svg
              v-else
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
              <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
              <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
              <line x1="2" x2="22" y1="2" y2="22" />
            </svg>
          </button>
        </div>

        <!-- Live password requirements checklist (Sign Up only) -->
        <ul
          v-if="showPasswordChecklist"
          class="mt-1 flex flex-col gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-secondary)]/60 p-2.5"
        >
          <li
            v-for="rule in [
              { key: 'minLength', met: passwordChecklist.minLength, label: t('auth.passwordRequirements.minLength') },
              { key: 'uppercase', met: passwordChecklist.uppercase, label: t('auth.passwordRequirements.uppercase') },
              { key: 'lowercase', met: passwordChecklist.lowercase, label: t('auth.passwordRequirements.lowercase') },
              { key: 'number', met: passwordChecklist.number, label: t('auth.passwordRequirements.number') },
            ]"
            :key="rule.key"
            class="flex items-center gap-2 text-xs transition-colors duration-200"
            :class="rule.met ? 'text-[var(--color-success)]' : 'text-[var(--color-text-tertiary)]'"
          >
            <svg
              v-if="rule.met"
              xmlns="http://www.w3.org/2000/svg"
              class="h-3.5 w-3.5 flex-shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="3"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <svg
              v-else
              xmlns="http://www.w3.org/2000/svg"
              class="h-3.5 w-3.5 flex-shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="12" cy="12" r="9" />
            </svg>
            <span>{{ rule.label }}</span>
          </li>
        </ul>
      </label>

      <!-- Confirm Password Field (Sign Up only) -->
      <label v-if="isSignUp" class="flex flex-col gap-1.5 text-sm">
        <span class="font-medium text-[var(--color-text-secondary)]">{{ t('auth.confirmPassword') }}</span>
        <div class="relative">
          <input
            v-model="confirmPassword"
            :type="showConfirmPassword ? 'text' : 'password'"
            autocomplete="new-password"
            required
            @blur="touched = true"
            class="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 px-4 py-2.5 pr-11 text-sm text-[var(--color-text)] placeholder-[var(--color-text-tertiary)] outline-none transition-all duration-200 focus:border-[var(--color-primary-500)] focus:ring-2 focus:ring-[var(--color-primary-500)]/20"
            placeholder="••••••••"
          />
          <button
            type="button"
            @click="showConfirmPassword = !showConfirmPassword"
            class="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-[var(--color-text-tertiary)] transition-colors hover:text-[var(--color-text-secondary)] focus:outline-none"
            :aria-label="showConfirmPassword ? 'Ocultar contraseña' : 'Ver contraseña'"
          >
            <svg
              v-if="!showConfirmPassword"
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <svg
              v-else
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
              <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
              <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
              <line x1="2" x2="22" y1="2" y2="22" />
            </svg>
          </button>
        </div>
        <span v-if="confirmPasswordError" class="text-xs text-[var(--color-error)]">{{ confirmPasswordError }}</span>
      </label>

      <!-- Submit Button -->
      <button
        type="submit"
        class="btn-bubble mt-2 w-full flex items-center justify-center gap-2 font-semibold tracking-wide"
        :disabled="isSubmitting"
      >
        <span
          v-if="isSubmitting"
          class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
        />
        <span>{{ isSubmitting ? t('auth.submitting') : (isSignUp ? t('auth.signUp') : t('auth.signIn')) }}</span>
      </button>
    </form>

    <!-- Toggle Sign In / Sign Up -->
    <div v-if="!ownerNotice && !pendingApproval" class="mt-6 text-center text-xs sm:text-sm text-[var(--color-text-secondary)]">
      <span>{{ isSignUp ? t('auth.hasAccount') : t('auth.noAccount') }}</span>
      <button
        type="button"
        class="btn-bubble-ghost ml-2 font-medium"
        @click="toggleMode"
      >
        {{ isSignUp ? t('auth.signIn') : t('auth.signUp') }}
      </button>
    </div>
  </div>
</template>
