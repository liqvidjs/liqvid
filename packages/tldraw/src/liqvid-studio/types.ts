import type { TLEditorSnapshot } from "@tldraw/editor";

export type SavedState = Readonly<{
  createdAt: string;
  name: string;
  snapshot: TLEditorSnapshot;
}>;
