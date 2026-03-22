declare module "skulpt" {
  const builtinFiles: {
    files: {
      [filename: string]: string;
    };
  };

  function configure(o: {
    output(text: string): void;
    read(filename: string): string;
  }): void;

  function importMainWithBody(
    name: string,
    dumpJS: boolean,
    body: string,
    canSuspend: boolean,
  ): void;

  const misceval: {
    asyncToPromise(callback: unknown): Promise<unknown>;
  };
}
