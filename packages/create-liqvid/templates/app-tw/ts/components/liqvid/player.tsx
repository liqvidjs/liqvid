"use client";

import "./recording.css";

import { MediaRecording } from "@liqvid/media/recording";
import { PromptsProvider } from "@liqvid/prompts";
import { MarkerRecording } from "@liqvid/script/recording";
import {
	LiqvidDevToolsProvider,
	type LiqvidStudioPlugin,
	RecordingControl,
} from "@liqvid/studio";
import {
	ArrowsIn,
	ArrowsOut,
	Moon,
	Pause,
	Play,
	SpeakerHigh,
	SpeakerLow,
	SpeakerNone,
	SpeakerX,
	Sun,
} from "@phosphor-icons/react";
import classNames from "classnames";
import {
	ColorSchemeProvider,
	Controls,
	type HidingStrategy,
	HydrateElement,
	HydrateVariants,
	Player,
	type Script,
	ScriptProvider,
	SegmentProvider,
} from "liqvid";
import {lazy} from "react"

import {
	persistColorScheme,
	persistMute,
	persistVolume,
} from "@/lib/persistence";

import { KeyboardShortcuts } from "./controls/KeyboardShortcuts";
import { shortcuts } from "./shortcuts";

/* development-only controls */
const isDevelopment = process.env.NODE_ENV === "development";
const ShowMarkerName = isDevelopment ? lazy(() =>
	import("@/components/dev/ShowMarkerName").then(
		(imports) => ({default: imports.ShowMarkerName,
	}),
)) : () => null;

export function LiqvidPlayer<M extends string>({
	classNames: propClassNames,
	children,
	hideWith,
	plugins,
	projectPath,
	script,
	thumbs,
	...props
}: React.ComponentProps<typeof Player.Root> &
	Pick<React.ComponentProps<typeof Controls.ScrubberBar>, "thumbs"> & {
		classNames?: {
			canvas?: string;
			controls?: string;
		};

		hideWith?: HidingStrategy;

		plugins?: LiqvidStudioPlugin[];

		/** path to the project on disk */
		projectPath: string;

		script: Script<M>;
	}) {

	return (
		<ColorSchemeProvider persistence={persistColorScheme}>
			<ScriptProvider script={script} shortcuts={shortcuts.script}>
				<LiqvidDevToolsProvider
					plugins={isDevelopment ? [MediaRecording, MarkerRecording, ...(plugins ?? [])] : []}
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
							<Play className={iconClassName} weight="fill" />
						) : (
							<Pause className={iconClassName} weight="fill" />
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
							(node as HTMLInputElement).value = String(
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
													<SpeakerHigh
														className={iconClassName}
														weight="fill"
													/>
												),
												gte: 0.5,
											},
											{
												children: (
													<SpeakerLow
														className={iconClassName}
														weight="fill"
													/>
												),
												gt: 0,
												lt: 0.5,
											},
											{
												children: (
													<SpeakerNone
														className={iconClassName}
														weight="fill"
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
									<SpeakerX className={iconClassName} weight="fill" />
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
										<Moon className={iconClassName} weight="fill" />
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
										<Sun className={iconClassName} weight="fill" />
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
							<ArrowsIn className={iconClassName} weight="bold" />
						) : (
							<ArrowsOut className={iconClassName} weight="bold" />
						)}
					</button>
				);
			}}
			shortcuts={shortcuts.fullscreen}
		/>
	);
}
