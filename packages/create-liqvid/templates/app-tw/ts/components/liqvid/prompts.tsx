import { Cue as PlainCue, Prompt as PlainPrompt } from "@liqvid/prompts";
import { twMerge } from "tailwind-merge";

export const Prompt = ({
	className,
	...props
}: React.ComponentProps<typeof PlainPrompt>) => (
	<PlainPrompt
		className={twMerge(
			"absolute z-100 w-[35em] shadow-lg",
			"overflow-hidden rounded-sm",
			"text-white",
			"*:hidden *:data-active:block [&>[data-active]~*]:block",
			"[&>:not([data-active])]:opacity-40",
			className,
		)}
		{...props}
	/>
);

export const Cue = <M extends string>(
	props: React.ComponentProps<typeof PlainCue<M>>,
) => (
	<PlainCue
		classes={{
			cue: "bg-orange-500 font-mono py-[.2em] px-[.1em] text-[14px]",
			line: "odd:bg-gray-400 even:bg-gray-600 py-1 px-[.2em]",
			measure: "block py-1 px-[.2em]",
		}}
		{...props}
	/>
);
