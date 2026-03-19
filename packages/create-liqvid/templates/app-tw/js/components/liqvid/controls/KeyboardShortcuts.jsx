import { useKeyboardShortcut } from "liqvid";
import { Dialog } from "radix-ui";
import { useState } from "react";

import { shortcuts } from "../shortcuts";

export function KeyboardShortcuts() {
	const [open, setOpen] = useState(false);

	useKeyboardShortcut("Shift+?", () => {
		setOpen((prev) => !prev);
	});

	return (
		<Dialog.Root onOpenChange={setOpen} open={open}>
			<Dialog.Portal>
				<Dialog.Overlay
					className="fixed inset-0 z-30 bg-black opacity-80"
					style={{
						animation: "overlayShow 150ms cubic-bezier(0.16, 1, 0.3, 1)",
					}}
				/>
				<Dialog.Content className="fixed top-1/2 left-1/2 z-30 max-h-[85vh] w-[90vw] max-w-[1000px] -translate-x-1/2 -translate-y-1/2">
					<aside className="rounded-md bg-white p-4 shadow-lg">
						<Dialog.Title className="mb-4 text-2xl">
							Keyboard shortcuts
						</Dialog.Title>
						<Dialog.Description />
						<div className="columns-2">
							<Table caption="Playback">
								{shortcuts.playPause && (
									<Row keys={shortcuts.playPause} label="Toggle play/pause" />
								)}
								{shortcuts.seeking?.relative?.map((s) => {
									if (
										!(
											typeof s.delta === "object" &&
											"seconds" in s.delta &&
											typeof s.delta.seconds === "number"
										)
									)
										return null;
									const label =
										(s.delta.seconds < 0 ? "Rewind " : "Fast forward ") +
										Math.abs(s.delta.seconds) +
										" second" +
										(Math.abs(s.delta.seconds) > 1 ? "s" : "");
									return <Row key={s.key} keys={s.key} label={label} />;
								})}
								<Row
									keys={"0..9"}
									label="Seek to 0%, 10%, 20%, etc. in the video"
								/>
							</Table>

							<Table caption="General">
								<Row keys={shortcuts.mute} label="Toggle mute" />
								<Row keys={shortcuts.colorScheme} label="Toggle color scheme" />
							</Table>
						</div>
					</aside>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}

function Table({
	caption,
	children,
}) {
	return (
		<table className="mb-4">
			<caption className="mb-1 text-left text-gray-600 text-xs uppercase">
				{caption}
			</caption>
			<tbody>{children}</tbody>
		</table>
	);
}

function Row({
	label,
	keys,
} ) {
	if (!keys) return null;

	if (typeof keys === "string") {
		keys = [keys];
	}
	return (
		<tr className="border-gray-200 border-t border-solid text-[16px]">
			<th className="w-70 py-1 text-left font-light text-gray-500" scope="row">
				{label}
			</th>
			<td className="w-20">
				{keys.map((key) => (
					<kbd key={key}>{fmt(key)}</kbd>
				))}
			</td>
		</tr>
	);
}

function fmt(seq) {
	return seq
		.split("+")
		.map((key) => {
			switch (key) {
				case "ArrowLeft":
					return "←";
				case "ArrowRight":
					return "→";
				case "Meta":
					return "⌘";
				default:
					return key;
			}
		})
		.join("+");
}
