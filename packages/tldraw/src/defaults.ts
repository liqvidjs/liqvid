// biome-ignore lint/suspicious/noExplicitAny: template used as a diff base
export const getDefaultShape = (): Record<string, any> => ({
  isLocked: false,
  meta: {},
  opacity: 1,
  parentId: "page:page",
  props: {
    color: "black",
    dash: "draw",
    fill: "none",
    isClosed: false,
    isComplete: false,
    isPen: false,
    segments: [],
    size: "m",
  },
  rotation: 0,
  type: "draw",
  typeName: "shape",
});
