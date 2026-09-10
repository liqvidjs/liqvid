import { useMarker, useScriptOptional } from "liqvid";

/** Control to show the name of the current marker. */
export function ShowMarkerName() {
  const script = useScriptOptional();

  if (!script) return null;

  return <ShowMarkerNameInner />;
}

function ShowMarkerNameInner() {
  const active = useMarker();

  return (
    <span
      className="inline-flex h-full select-text items-center bg-[#af1866] px-[.5em] align-top font-sans"
      key="show-marker-name"
    >
      {active.name}
    </span>
  );
}
