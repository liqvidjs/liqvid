import "effect/unstable/file-system";

declare module "effect/unstable/file-system" {
  export namespace WatchEvent {
    // Override the path properties to use your custom type
    export interface Create {
      readonly _tag: "Create";
      readonly path: never; // Replace string with your custom brand or type
    }

    export interface Update {
      readonly _tag: "Update";
      readonly path: never;
    }

    export interface Remove {
      readonly _tag: "Remove";
      readonly path: never;
    }
  }
}
