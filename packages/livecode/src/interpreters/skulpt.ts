/// <reference path="skulpt.d.ts" />

import Sk from "skulpt";

export class PythonInterpreter {
  constructor() {
    this.read = this.read.bind(this);
  }

  read(filename: string): string {
    if (
      Sk.builtinFiles === undefined ||
      Sk.builtinFiles.files[filename] === undefined
    )
      throw `File not found: '${filename}'`;
    return Sk.builtinFiles.files[filename];
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
