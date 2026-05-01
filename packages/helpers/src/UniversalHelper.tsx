import { Position, type PositionProps } from "./Position.tsx";
import { Segment, type SegmentProps } from "./Segment.tsx";

export function UniversalHelper<M extends string>({
  children,
  hideWith,
  during,
  from,
  to,
  ...props
}: Partial<SegmentProps<M>> & PositionProps) {
  const hasSegmentProps =
    during !== undefined || to !== undefined || from !== undefined;

  return (
    <Position {...props}>
      {hasSegmentProps ? (
        // biome-ignore lint/suspicious/noExplicitAny: polymorphism
        <Segment {...({ during, from, hideWith, to } as any)}>
          {children}
        </Segment>
      ) : (
        children
      )}
    </Position>
  );
}
