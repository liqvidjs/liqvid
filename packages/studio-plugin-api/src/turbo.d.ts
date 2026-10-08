export declare global {
  interface ImportMeta {
    /**
     * Built-in environment metadata when using Turbopack.
     */
    readonly env: ImportMetaEnv;
  }

  interface ImportMetaEnv {
    readonly BASE_URL: string;
    readonly DEV: boolean;
    readonly MODE: string;
    readonly PROD: boolean;
  }
}
