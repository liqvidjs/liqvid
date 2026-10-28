export declare global {
  export interface ImportMeta {
    readonly env: ImportMetaEnv;
  }

  export interface ImportMetaEnv {
    readonly SSR: boolean;
  }
}
