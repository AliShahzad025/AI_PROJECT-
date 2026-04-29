/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GEMINI_API_KEY: string;
  readonly VITE_MOCK_AI: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
