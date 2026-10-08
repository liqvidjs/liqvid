import type Ffmpeg from "@ts-ffmpeg/fluent-ffmpeg";
import { Effect, Schema } from "effect";

const FfmpegCommandOptionsSchema =
  Schema.Unknown as Schema.Schema<Ffmpeg.FfmpegCommandOptions>;

const AudioCodecSchema = Schema.Unknown as Schema.Schema<
  Parameters<Ffmpeg.FfmpegCommand["audioCodec"]>[0]
>;

const AudioBitrateSchema = Schema.Unknown as Schema.Schema<
  Parameters<Ffmpeg.FfmpegCommand["audioBitrate"]>[0]
>;

const VideoCodecSchema = Schema.Unknown as Schema.Schema<
  Parameters<Ffmpeg.FfmpegCommand["videoCodec"]>[0]
>;

const VideoBitrateSchema = Schema.Unknown as Schema.Schema<
  Parameters<Ffmpeg.FfmpegCommand["videoBitrate"]>[0]
>;

const ComplexFilterSchema = Schema.Unknown as Schema.Schema<
  Parameters<Ffmpeg.FfmpegCommand["complexFilter"]>[0]
>;

const FilterMapSchema = Schema.Unknown as Schema.Schema<
  Parameters<Ffmpeg.FfmpegCommand["complexFilter"]>[1]
>;

const FfmpegOperationFields = {
  /** Options passed to the fluent-ffmpeg command constructor. */
  command: FfmpegCommandOptionsSchema.pipe(
    Schema.optional,
    Schema.annotate({
      description: "Options passed to the fluent-ffmpeg command constructor.",
    }),
  ),

  /** Whether to run this processing step. */
  enabled: Schema.Boolean.pipe(
    Schema.optional,
    Schema.annotate({ description: "Whether to run this processing step." }),
  ),

  /** Additional FFmpeg input options. */
  inputOptions: Schema.Array(Schema.String).pipe(
    Schema.optional,
    Schema.annotate({ description: "Additional FFmpeg input options." }),
  ),

  /** Additional FFmpeg output options. */
  outputOptions: Schema.Array(Schema.String).pipe(
    Schema.optional,
    Schema.annotate({ description: "Additional FFmpeg output options." }),
  ),
};
/** Options for one FFmpeg processing step. */

export const FfmpegOperationConfig = Schema.Struct(FfmpegOperationFields).pipe(
  Schema.annotate({ description: "Options for one FFmpeg processing step." }),
);

export type FfmpegOperationConfig = (typeof FfmpegOperationConfig)["Type"];
/** Configuration for encoding the audio MP4 rendition. */

export const AudioMp4Config = Schema.Struct({
  ...FfmpegOperationFields,

  /** Bitrate passed to fluent-ffmpeg's audioBitrate method. */
  bitrate: AudioBitrateSchema.pipe(
    Schema.optional,
    Schema.annotate({
      description: "Bitrate passed to fluent-ffmpeg's audioBitrate method.",
    }),
  ),

  /** Codec passed to fluent-ffmpeg's audioCodec method. */
  codec: AudioCodecSchema.pipe(
    Schema.optional,
    Schema.annotate({
      description: "Codec passed to fluent-ffmpeg's audioCodec method.",
    }),
  ),
}).pipe(
  Schema.annotate({
    description: "Configuration for encoding the audio MP4 rendition.",
  }),
);

export type AudioMp4Config = (typeof AudioMp4Config)["Type"];
/** Configuration for extracting audio from a video recording. */

export const AudioExtractConfig = Schema.Struct({
  ...FfmpegOperationFields,

  /** Codec passed to fluent-ffmpeg's audioCodec method. */
  codec: AudioCodecSchema.pipe(
    Schema.optional,
    Schema.annotate({
      description: "Codec passed to fluent-ffmpeg's audioCodec method.",
    }),
  ),
}).pipe(
  Schema.annotate({
    description: "Configuration for extracting audio from a video recording.",
  }),
);

export type AudioExtractConfig = (typeof AudioExtractConfig)["Type"];

/** Configuration for removing audio from a video recording. */
export const VideoStripConfig = Schema.Struct({
  ...FfmpegOperationFields,

  /** Codec passed to fluent-ffmpeg's videoCodec method. */
  codec: VideoCodecSchema.pipe(
    Schema.optional,
    Schema.annotate({
      description: "Codec passed to fluent-ffmpeg's videoCodec method.",
    }),
  ),
}).pipe(
  Schema.annotate({
    description: "Configuration for removing audio from a video recording.",
  }),
);

export type VideoStripConfig = (typeof VideoStripConfig)["Type"];
/** Configuration for one HLS rendition. */

export const HlsVariantConfig = Schema.Struct({
  /** Target bitrate passed to fluent-ffmpeg's videoBitrate method. */
  bitrate: VideoBitrateSchema.pipe(
    Schema.optional,
    Schema.annotate({
      description:
        "Target bitrate passed to fluent-ffmpeg's videoBitrate method.",
    }),
  ),

  /** VBV buffer size for this rendition. */
  bufferSize: Schema.Union([Schema.String, Schema.Number]).pipe(
    Schema.optional,
    Schema.annotate({ description: "VBV buffer size for this rendition." }),
  ),

  /** Codec passed to fluent-ffmpeg's videoCodec method. */
  codec: VideoCodecSchema.pipe(
    Schema.optional,
    Schema.annotate({
      description: "Codec passed to fluent-ffmpeg's videoCodec method.",
    }),
  ),
  /** Height to scale this variant to. Omit to preserve the source height. */
  height: Schema.Number.pipe(
    Schema.optional,
    Schema.annotate({
      description:
        "Height to scale this variant to. Omit to preserve the source height.",
    }),
  ),

  /** Maximum bitrate for this rendition. */
  maxRate: Schema.Union([Schema.String, Schema.Number]).pipe(
    Schema.optional,
    Schema.annotate({ description: "Maximum bitrate for this rendition." }),
  ),

  /** Minimum bitrate for this rendition. */
  minRate: Schema.Union([Schema.String, Schema.Number]).pipe(
    Schema.optional,
    Schema.annotate({ description: "Minimum bitrate for this rendition." }),
  ),
  /**
   * Name used for the rendition directory and playlist filename.
   * Use a simple filename-safe name.
   */
  name: Schema.String.pipe(
    Schema.annotate({
      description:
        "Name used for the rendition directory and playlist filename. Use a simple filename-safe name.",
    }),
  ),
}).pipe(
  Schema.annotate({ description: "Configuration for one HLS rendition." }),
);

export type HlsVariantConfig = (typeof HlsVariantConfig)["Type"];
/** Configuration for encoding adaptive HLS renditions. */

export const HlsConfig = Schema.Struct({
  ...FfmpegOperationFields,

  /** Filter graph passed to fluent-ffmpeg's complexFilter method. */
  filterComplex: ComplexFilterSchema.pipe(
    Schema.optional,
    Schema.annotate({
      description:
        "Filter graph passed to fluent-ffmpeg's complexFilter method.",
    }),
  ),

  /** HLS muxer flags. */
  flags: Schema.Array(Schema.String).pipe(
    Schema.optional,
    Schema.annotate({ description: "HLS muxer flags." }),
  ),

  /** Group-of-pictures size used for keyframes. */
  groupOfPictures: Schema.Number.pipe(
    Schema.optional,
    Schema.annotate({
      description: "Group-of-pictures size used for keyframes.",
    }),
  ),

  /** Minimum keyframe interval passed through to FFmpeg. */
  keyframeMin: Schema.Number.pipe(
    Schema.optional,
    Schema.annotate({
      description: "Minimum keyframe interval passed through to FFmpeg.",
    }),
  ),

  /** Output maps passed to fluent-ffmpeg's complexFilter method. */
  map: FilterMapSchema.pipe(
    Schema.optional,
    Schema.annotate({
      description:
        "Output maps passed to fluent-ffmpeg's complexFilter method.",
    }),
  ),

  /** HLS playlist type. */
  playlistType: Schema.String.pipe(
    Schema.optional,
    Schema.annotate({ description: "HLS playlist type." }),
  ),

  /** Encoder preset passed through to FFmpeg. */
  preset: Schema.String.pipe(
    Schema.optional,
    Schema.annotate({
      description: "Encoder preset passed through to FFmpeg.",
    }),
  ),

  /** Scene-change threshold passed through to FFmpeg. */
  sceneThreshold: Schema.Number.pipe(
    Schema.optional,
    Schema.annotate({
      description: "Scene-change threshold passed through to FFmpeg.",
    }),
  ),

  /** HLS segment duration in seconds. */
  segmentDuration: Schema.Number.pipe(
    Schema.optional,
    Schema.annotate({ description: "HLS segment duration in seconds." }),
  ),

  /** HLS segment container type. */
  segmentType: Schema.String.pipe(
    Schema.optional,
    Schema.annotate({ description: "HLS segment container type." }),
  ),

  /** Renditions included in the HLS output, ordered from lowest to highest. */
  variants: Schema.Array(HlsVariantConfig).pipe(
    Schema.optional,
    Schema.annotate({
      description:
        "Renditions included in the HLS output, ordered from lowest to highest.",
    }),
  ),

  /** x264 parameters passed through to FFmpeg. */
  x264Params: Schema.String.pipe(
    Schema.optional,
    Schema.annotate({
      description: "x264 parameters passed through to FFmpeg.",
    }),
  ),
}).pipe(
  Schema.annotate({
    description: "Configuration for encoding adaptive HLS renditions.",
  }),
);

export type HlsConfig = (typeof HlsConfig)["Type"];

/**
 * Configuration for @liqvid/media's FFmpeg recording post-processing.
 * FFmpeg command and fluent method types are reused where available; the
 * option arrays can be used for FFmpeg features not exposed by fluent-ffmpeg.
 */
export const LiqvidMediaPluginConfig = Schema.Struct({
  /** Audio-related processing steps. */
  audio: Schema.Struct({
    /** Extract audio from a video recording. */
    extract: AudioExtractConfig.pipe(
      Schema.optional,
      Schema.annotate({ description: "Extract audio from a video recording." }),
    ),

    /** Create the AAC/MP4 audio rendition. */
    mp4: AudioMp4Config.pipe(
      Schema.optional,
      Schema.annotate({ description: "Create the AAC/MP4 audio rendition." }),
    ),

    /** Whether/how to automatically transcribe the audio. */
    transcribe: Schema.Struct({
      /** Produce WebVTT captions from the audio. */
      captions: Schema.Boolean.pipe(
        Schema.withDecodingDefaultType(Effect.succeed(false)),
        Schema.annotate({
          description: "Produce WebVTT captions from the audio.",
        }),
      ),

      /** Produce a plain text transcript of the audio. */
      plain: Schema.Boolean.pipe(
        Schema.withDecodingDefaultType(Effect.succeed(false)),
        Schema.annotate({
          description: "Produce a plain text transcript of the audio.",
        }),
      ),

      /** Produce a rich transcript with individual word timings. */
      transcript: Schema.Boolean.pipe(
        Schema.withDecodingDefaultType(Effect.succeed(false)),
        Schema.annotate({
          description:
            "Produce a rich transcript with individual word timings.",
        }),
      ),
    }).pipe(
      Schema.withDecodingDefaultType(
        Effect.succeed({ captions: false, plain: false, transcript: false }),
      ),
      Schema.annotate({
        description: "Whether/how to automatically transcribe the audio.",
      }),
    ),
  }).pipe(
    Schema.optional,
    Schema.annotate({ description: "Audio-related processing steps." }),
  ),

  /** Video-related processing steps. */
  video: Schema.Struct({
    /** Create adaptive HLS renditions. */
    hls: HlsConfig.pipe(
      Schema.optional,
      Schema.annotate({ description: "Create adaptive HLS renditions." }),
    ),
    /** Create video.webm without its audio track. */
    stripAudio: VideoStripConfig.pipe(
      Schema.optional,
      Schema.annotate({
        description: "Create video.webm without its audio track.",
      }),
    ),
  }).pipe(
    Schema.optional,
    Schema.annotate({ description: "Video-related processing steps." }),
  ),
}).pipe(
  Schema.annotate({
    description:
      "Configuration for @liqvid/media's FFmpeg recording post-processing.",
  }),
);

export type LiqvidMediaPluginConfig = (typeof LiqvidMediaPluginConfig)["Type"];
