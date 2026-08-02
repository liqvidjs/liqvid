/// <reference path="skulpt.d.ts" />

import Sk from "skulpt";

export class PythonInterpreter {
  constructor() {
    this.read = this.read.bind(this);
  }

  read(filename: string): string {
    const file = Sk.builtinFiles?.files[filename];
    if (!file) throw new Error(`File not found: '${filename}'`);

    if (typeof file !== "string") {
      throw new Error(`Cannot read synchronously: '${filename}'`);
    }

    return file;
  }

  async run(code: string): Promise<string[]> {
    const output: string[] = [];
    Sk.configure({
      output: (txt) => {
        if (txt !== "\n") {
          output.push(txt);
        }
      },
      read: this.read,
    });

    await Sk.misceval.asyncToPromise(() =>
      Sk.importMainWithBody("<stdin>", false, code, true),
    );
    return output;
  }

  runSync(code: string): string[] {
    const output: string[] = [];
    Sk.configure({
      output: (txt: string) => {
        if (txt !== "\n") {
          output.push(txt);
        }
      },
      read: this.read,
    });

    Sk.importMainWithBody("<stdin>", false, code, false);
    return output;
  }
}
