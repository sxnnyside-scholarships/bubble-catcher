/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue';

  // biome-ignore lint/suspicious/noExplicitAny: standard Vue SFC component typing
  // biome-ignore lint/complexity/noBannedTypes: standard Vue SFC component typing
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
