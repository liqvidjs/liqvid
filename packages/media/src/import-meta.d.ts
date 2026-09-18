export declare global {
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }

  interface ImportMetaEnv {
    readonly SSR: boolean;
  }
}
