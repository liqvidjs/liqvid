declare global {
  export interface ImportMeta extends Omit<ImportMeta, "url"> {
    url: string & { __tag: "" };
    resolve(specifier: string): string;
  }
}
