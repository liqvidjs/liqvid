import { useMarker } from "liqvid";

/** Control to show the name of the current marker. */
export function ShowMarkerName() {
	const active = useMarker();

	return (
		<span
			className="inline-flex h-full select-text items-center bg-(--accent-solid) px-[.5em] align-top font-sans"
			key="show-marker-name"
		>
			{active.name}
		</span>
	);
}
