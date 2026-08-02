declare module "skulpt" {
  class Suspension<_T> {
    resume?: () => unknown;
  }

  class SkulptError {
    args: {
      v: {
        $mangled: string;
        $savedKeyHash: string;
        v: string;
      }[];
      in$repr: boolean;
    };
    traceback: {
      colno: number;
      filename: string;
      lineno: number;
    }[];
    $d: {
      $version: number;
      buckets: Record<string, unknown>;
      entries: Record<string, unknown>;
      in$repr: boolean;
      size: number;
    };
  }

  const builtinFiles: {
    files: {
      [filename: string]: string | Suspension<string>;
    };
  };

  function configure(o: {
    output(text: string): void;
    read(filename: string): string | Suspension<string>;
  }): void;

  function importMainWithBody(
    name: string,
    dumpJS: boolean,
    body: string,
    canSuspend: boolean,
  ): void;

  const misceval: {
    asyncToPromise(callback: unknown): Promise<unknown>;
    promiseToSuspension<T>(promise: Promise<T>): Suspension<T>;
  };
}

// declare global {
//   interface Window {
//     Sk: {
//       builtinFiles: {
//         files: {
//           [filename: string]: string;
//         };
//       };
//
//       configure(o: {
//         output(text: string): void;
//         read(filename: string): string;
//       }): void;
//
//       importMainWithBody(
//         name: string,
//         dumpJS: boolean,
//         body: string,
//         canSuspend: boolean,
//       ): void;
//
//       misceval: {
//         asyncToPromise(callback: unknown): Promise<unknown>;
//       };
//     };
//   }
// }
