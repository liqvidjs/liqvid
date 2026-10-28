export declare global {
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }

  interface ImportMetaEnv {
    readonly BASE_URL: string;
    readonly DEV: boolean;
    readonly MODE: string;
    readonly PROD: boolean;
  }
}
