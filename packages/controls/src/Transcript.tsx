import { Duration, type DurationLike } from "@liqvid/duration";
import { usePlayback, useTime$ } from "@liqvid/playback/react";
import type { RichTranscript, TranscriptEntry } from "@liqvid/schemas";
import {
  type Awaitable,
  formatTime,
  makeContext,
  range,
  useAwaitable,
} from "@liqvid/utils";
import { Fragment, useCallback, useEffect, useState } from "react";

type TranscriptContext = {
  body: HTMLDivElement | null;
  links: TranscriptLink[];
  setSearch: (search: string) => void;
  supply: (update: Partial<TranscriptContext>) => void;
  transcript: RichTranscript | null;
};

const { use: useTranscriptApi, Provider: TranscriptProvider } =
  makeContext<TranscriptContext>({
    defaultValue: {
      body: null,
      links: [],
      setSearch: () => {},
      supply: () => {},
      transcript: null,
    },
    name: "Transcript",
    uniqueKey: "@liqvid/controls/transcript",
  });

type TranscriptIndex = {
  flat: number;
  paragraph: number;
  word: number;
};

type TranscriptLink = HTMLAnchorElement & {
  dataset: { start: string; end: string };
};

/**
 * Render the transcript content.
 */
function TranscriptBody({
  renderWord = (_token, props) => <a {...props} />,
  ...props
}: {
  /** Render a word */
  renderWord: (
    token: TranscriptEntry,
    props: React.AnchorHTMLAttributes<HTMLAnchorElement>,
  ) => React.ReactElement;
} & React.HTMLAttributes<HTMLDivElement>) {
  const playback = usePlayback();
  const [body, setRef] = useState<HTMLDivElement | null>(null);

  const { supply, transcript } = useTranscriptApi();

  useEffect(() => {
    if (!body) return;

    const updateLinks = () => {
      supply({
        links:
          Array.from(
            body.querySelectorAll<TranscriptLink>("a[data-start][data-end]"),
          ) ?? [],
      });
    };

    // initial run
    updateLinks();

    // mutation observer
    const observer = new MutationObserver(updateLinks);
    observer.observe(body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
    };
  }, [body, supply]);

  useHighlightActiveWord();

  // supply body element
  useEffect(() => {
    supply({ body });
  }, [body, supply]);

  if (!transcript) return null;

  return (
    <div {...props} ref={setRef}>
      {range(transcript.paragraphBreaks.length + 1).map((i) => {
        const start = i === 0 ? 0 : transcript.paragraphBreaks[i - 1]! + 1;
        const end =
          i === transcript.paragraphBreaks.length
            ? transcript.words.length
            : transcript.paragraphBreaks[i]! + 1;

        return (
          <p key={transcript.paragraphBreaks[i] ?? "end"}>
            {transcript.words.slice(start, end).map((token, j) => (
              <Fragment key={`${i}:${j}`}>
                {renderWord(token, {
                  children: token[0],
                  "data-end": token[2],
                  "data-start": token[1],
                  onClick: () => {
                    playback.currentTime$ = { milliseconds: token[1] };
                  },
                } as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
                {j !== end - start - 1 && " "}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}

/**
 * Render times vertically along the transcript
 */
function TranscriptTimes({
  interval = { seconds: 20 },
  renderLink = (_time, props) => <button {...props} />,
  ...props
}: {
  interval?: DurationLike;
  renderLink?: (
    time: Duration,
    props: React.ComponentProps<"button">,
  ) => React.ReactElement;
} & React.HTMLAttributes<HTMLDivElement>) {
  const { body, links, transcript } = useTranscriptApi();
  const playback = usePlayback();

  const [times] = useState<(HTMLElement | null)[]>([]);

  const intervalMs = Duration.inMilliseconds(interval);

  const [measured, setMeasured] = useState(false);

  useEffect(() => {
    if (!body || !transcript) return;

    let j = 0;

    for (let i = 1; i < times.length; ++i) {
      let y = 0;
      for (; j < links.length; ++j) {
        const link = links[j]!;
        const start = parseFloat(link.dataset.start);

        if (start >= i * intervalMs) {
          y =
            (link.offsetTop - body.offsetTop) /
            body.getBoundingClientRect().height;
          break;
        }
      }

      if (times[i]) {
        times[i]!.style.top = `${y * 100}%`;
      }
    }

    setMeasured(true);
  }, [body, transcript, intervalMs, links, times]);

  return (
    <div data-affords="click" {...props}>
      {range(Math.ceil(playback.duration$.dividedBy(interval))).map((i) => (
        <Fragment key={i}>
          {renderLink(Duration.from(interval).times(i), {
            children: (
              <time dateTime={formatTime(intervalMs * i)}>
                {formatTime(intervalMs * i)}
              </time>
            ),
            hidden: !measured, // avoid bad positioning before the words are measured
            onClick: (e) => {
              e.preventDefault();
              playback.currentTime$ = { milliseconds: intervalMs * i };
            },
            ref: (el) => {
              times[i] = el;
            },
            type: "button",
          })}
        </Fragment>
      ))}
    </div>
  );
}

/**
 * Affordance to filter the transcript.
 */
function TranscriptSearch({
  filter = (input, { word }) => {
    const normalizedInput = input.toLowerCase().trim();
    if (!normalizedInput) return true;

    const inputWords = normalizedInput.split(/\s+/);

    const normalizedWord = word.toLowerCase();

    return inputWords.some((w) => normalizedWord.includes(w));
  },
  ...props
}: {
  filter?: (
    input: string,
    token: { start: number; end: number; word: string },
  ) => boolean;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  const { links } = useTranscriptApi();

  // search terms
  const onSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.currentTarget.value.trim();

    for (const link of links) {
      const start = parseFloat(link.dataset.start);
      const end = parseFloat(link.dataset.end);

      const matches = filter(value, {
        end,
        start,
        word: link.textContent,
      });

      if (value && matches) {
        const mark = document.createElement("mark");
        mark.append(link.textContent);
        link.replaceChildren(mark);
      } else {
        if (link.firstElementChild) {
          link.replaceChildren(link.textContent);
        }
      }
    }
  };

  return (
    <input data-affords="keys" onChange={onSearch} type="search" {...props} />
  );
}

/**
 * Wrapper around rich transcript viewer.
 */
export function TranscriptRoot({
  children,
  transcript: $transcript,
}: {
  children?: React.ReactNode;
  transcript: Awaitable<RichTranscript>;
}) {
  const transcript = useAwaitable($transcript);

  const [api, setApi] = useState<TranscriptContext>({
    body: null,
    links: [],
    setSearch: () => {},
    supply: (update) => {
      setApi((prev) => ({ ...prev, ...update }));
    },
    transcript,
  });

  useEffect(() => {
    api.supply({ transcript });
  }, [api.supply, transcript]);

  return <TranscriptProvider value={api}>{children}</TranscriptProvider>;
}

export const Transcript = {
  Body: TranscriptBody,
  Root: TranscriptRoot,
  Search: TranscriptSearch,
  Times: TranscriptTimes,
};

/* ------------------------------ highlight active word ------------------------------ */
function useHighlightActiveWord() {
  const playback = usePlayback();
  const { body, links, transcript } = useTranscriptApi();

  const setActiveWord = useCallback(
    (t: Duration) => {
      if (!body || !transcript) return;

      const { flat } = getActiveWord(transcript, t);

      for (const prev of body.querySelectorAll("[aria-current]")) {
        prev.removeAttribute("aria-current");
      }

      links[flat]?.setAttribute("aria-current", "");
    },
    [body, transcript, links],
  );

  // highlight current words
  useTime$(setActiveWord);

  // set active word
  useEffect(() => {
    setActiveWord(playback.currentTime$);
  }, [playback, setActiveWord]);
}

function getActiveWord(
  transcript: RichTranscript,
  time: Duration,
): TranscriptIndex {
  const t = time.inMilliseconds();
  let paragraph = transcript.paragraphBreaks.length;
  let word = 0;
  let flat = 0;

  for (let i = 0; i < transcript.paragraphBreaks.length; ++i) {
    if (transcript.words[transcript.paragraphBreaks[i]!]![2] > t) {
      paragraph = i;
      flat = i === 0 ? 0 : transcript.paragraphBreaks[i - 1]! + 1;
      break;
    }
  }

  for (
    let i = 0;
    i <
    (transcript.paragraphBreaks[paragraph] ?? transcript.words.length) - flat;
    ++i
  ) {
    if (transcript.words[flat + i]![2] > t) {
      word = i;
      flat += i;
      break;
    }
  }

  return { flat, paragraph, word };
}
