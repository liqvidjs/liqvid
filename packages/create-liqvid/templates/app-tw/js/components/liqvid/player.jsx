"use client";

import "./recording.css";

import { MediaRecording } from "@liqvid/media/recording";
import { PromptsProvider } from "@liqvid/prompts";
import { MarkerRecording } from "@liqvid/script/recording";
import {
	LiqvidDevToolsProvider,
	RecordingControl,
} from "@liqvid/studio";
import {
	Maximize,
	Minimize,
	Moon,
	Pause,
	Play,
	Sun,
	Volume,
	Volume1,
	Volume2,
	VolumeX,
} from "lucide-react";
import classNames from "classnames";
import {
	ColorSchemeProvider,
	Controls,
	devComponent,
	HydrateElement,
	HydrateVariants,
	Player,
	ScriptProvider,
	SegmentProvider,
} from "liqvid";

import {
	persistColorScheme,
	persistMute,
	persistVolume,
	usePersistMute,
	usePersistVolume,
} from "@/lib/persistence";

import { KeyboardShortcuts } from "./controls/KeyboardShortcuts";
import { shortcuts } from "./shortcuts";

/* development-only controls */
const ShowMarkerName = devComponent(() =>
	import("@/components/dev/ShowMarkerName").then(
		(imports) => imports.ShowMarkerName,
	),
);

export function LiqvidPlayer({
	classNames: propClassNames,
	children,
	hideWith,
	plugins,
	projectPath,
	script,
	thumbs,
	...props
} ) {
  usePersistMute(persistMute, script.playback);
  usePersistVolume(persistVolume, script.playback);

	return (
		<ColorSchemeProvider from={persistColorScheme}>
			<ScriptProvider script={script} shortcuts={shortcuts.script}>
				<LiqvidDevToolsProvider
					plugins={[MediaRecording, MarkerRecording, ...(plugins ?? [])]}
					projectPath={projectPath}
				>
					<SegmentProvider hideWith={hideWith}>
						<Player.Root {...props}>
							<PromptsProvider
								persistence={{ prefix: `liqvid.prompts[${projectPath}]` }}
								shortcut={shortcuts.togglePrompts}
							>
								<Player.Controls
									className={propClassNames?.controls}
									hideAfter={{ seconds: 3 }}
								>
									<Controls.ScrubberBar
										shortcuts={shortcuts.seeking}
										thumbs={thumbs}
									/>
									<KeyboardShortcuts />
									<Buttons />
								</Player.Controls>
								<Player.Canvas
									className={classNames(
										"bg-[#eee] text-black",
										"dark:bg-[#202020] dark:text-white",
										"transition-colors duration-150",
										propClassNames?.canvas,
									)}
									pauseOnClick={process.env.NODE_ENV === "production"}
								>
									{children}
								</Player.Canvas>
							</PromptsProvider>
						</Player.Root>
					</SegmentProvider>
				</LiqvidDevToolsProvider>
			</ScriptProvider>
		</ColorSchemeProvider>
	);
}

const iconClassName = "h-[calc(var(--lv-controls-height)*0.45)] w-auto";

function Buttons() {
	return (
		<div className="lv-controls-buttons h-(--lv-controls-height)">
			<PlayPause />

			{/* left controls */}
			<MuteButton />
			<VolumeSlider />
			<Controls.TimeDisplay />
			<ShowMarkerName />

			{/* right controls */}
			<div className="lv-controls-right h-full">
				<RecordingControl shortcuts={shortcuts.recording} />
				<ColorSchemeToggle />
				<FullScreen />
			</div>
		</div>
	);
}

function PlayPause() {
	return (
		<Controls.PlayPause
			render={({ paused, seeking }, { ...props }) => {
				const label = (paused || seeking ? "Play" : "Pause") + " (k)";
				return (
					<button aria-label={label} title={label} {...props}>
						{paused || seeking ? (
							<Play className={iconClassName} fill="currentColor" />
						) : (
							<Pause className={iconClassName} fill="currentColor" />
						)}
					</button>
				);
			}}
			shortcuts={shortcuts.playPause}
		/>
	);
}

function VolumeSlider() {
	return (
		<Controls.VolumeSlider
			render={({ volume }, props) => {
				const label = `${volume}% volume`;

				return (
					<HydrateElement
						from={[persistMute, persistVolume]}
						hydrationFn={(node, muted, volume) => {
							node.setAttribute("aria-label", `${volume}% volume`);
							(node).value = String(
								muted ? 0 : volume * 100,
							);
						}}
					>
						<input aria-label={label} {...props} />
					</HydrateElement>
				);
			}}
			shortcuts={shortcuts.volume}
		/>
	);
}

function MuteButton() {
	return (
		<Controls.Mute
			render={({ muted, volume }, props) => {
				const strings = {
					mute: "Mute (m)",
					unmute: "Unmute (m)",
				};

				return (
					<HydrateVariants
						{...persistMute}
						value={muted}
						variants={{
							false: (
								<button
									aria-label={strings.mute}
									title={strings.mute}
									{...props}
								>
									<HydrateVariants
										{...persistVolume}
										value={volume}
										variants={[
											{
												children: (
													<Volume2
														className={iconClassName}
														fill="currentColor"
													/>
												),
												gte: 0.5,
											},
											{
												children: (
													<Volume1
														className={iconClassName}
														fill="currentColor"
													/>
												),
												gt: 0,
												lt: 0.5,
											},
											{
												children: (
													<Volume
														className={iconClassName}
														fill="currentColor"
													/>
												),
												eq: 0,
											},
										]}
									/>
								</button>
							),
							true: (
								<button
									aria-label={strings.unmute}
									title={strings.unmute}
									{...props}
								>
									<VolumeX className={iconClassName} fill="currentColor" />
								</button>
							),
						}}
					/>
				);
			}}
			shortcuts={shortcuts.mute}
		/>
	);
}

function ColorSchemeToggle() {
	return (
		<Controls.ColorSchemeToggle
			render={({ colorScheme }, props) => {
				const strings = {
					dark: "Toggle color scheme (currently dark)",
					light: "Toggle color scheme (currently light)",
				};

				return (
					<HydrateVariants
						{...persistColorScheme}
						value={colorScheme}
						variants={[
							{
								children: (
									<button
										aria-label={strings.dark}
										title={strings.dark}
										{...props}
									>
										<Moon className={iconClassName} fill="currentColor" />
									</button>
								),
								eq: "dark",
							},
							{
								children: (
									<button
										aria-label={strings.light}
										title={strings.light}
										{...props}
									>
										<Sun className={iconClassName} fill="currentColor" />
									</button>
								),
								eq: "light",
							},
						]}
					/>
				);
			}}
			shortcuts={shortcuts.colorScheme}
		/>
	);
}

function FullScreen() {
	return (
		<Controls.FullScreen
			render={({ isFullScreen }, props) => {
				const label =
					(isFullScreen ? "Exit full screen" : "Full screen") + " (f)";

				return (
					<button aria-label={label} title={label} {...props}>
						{isFullScreen ? (
							<Minimize className={iconClassName} strokeWidth={2.5} />
						) : (
							<Maximize className={iconClassName} strokeWidth={2.5} />
						)}
					</button>
				);
			}}
			shortcuts={shortcuts.fullscreen}
		/>
	);
}
