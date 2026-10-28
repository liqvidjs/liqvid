import type { TLEditorSnapshot } from "@tldraw/editor";

export type SavedState = Readonly<{
  createdAt: string;
  isGlobal: boolean;
  name: string;
  snapshot: TLEditorSnapshot;
}>;
