import {
  createMandatoryNumberCriterionOption,
  createMandatoryStringCriterionOption,
  createStringCriterionOption,
  createDateCriterionOption,
  createMandatoryTimestampCriterionOption,
  createDurationCriterionOption,
} from "./criteria/criterion";
import { HasMarkersCriterionOption } from "./criteria/has-markers";
import { SceneIsMissingCriterionOption } from "./criteria/is-missing";
import { MoviesCriterionOption } from "./criteria/movies";
import { OrganizedCriterionOption } from "./criteria/organized";
import { PerformersCriterionOption } from "./criteria/performers";
import { ResolutionCriterionOption } from "./criteria/resolution";
import { StudiosCriterionOption } from "./criteria/studios";
import { InteractiveCriterionOption } from "./criteria/interactive";
import {
  PerformerTagsCriterionOption,
  TagsCriterionOption,
} from "./criteria/tags";
import { ListFilterOptions, MediaSortByOptions } from "./filter-options";
import { DisplayMode } from "./types";
import {
  DuplicatedCriterionOption,
  PhashCriterionOption,
} from "./criteria/phash";
import { PerformerFavoriteCriterionOption } from "./criteria/favorite";
import { CaptionsCriterionOption } from "./criteria/captions";
import { StashIDCriterionOption } from "./criteria/stash-ids";
import { RatingCriterionOption } from "./criteria/rating";
import { PathCriterionOption } from "./criteria/path";
import { OrientationCriterionOption } from "./criteria/orientation";

const defaultSortBy = "date";
const sortByOptions = [
  "organized",
  "o_counter",
  "date",
  "file_count",
  "filesize",
  "duration",
  "framerate",
  "bitrate",
  "last_played_at",
  "resume_time",
  "play_duration",
  "play_count",
  "movie_scene_number",
  "interactive",
  "interactive_speed",
  "perceptual_similarity",
  ...MediaSortByOptions,
].map(ListFilterOptions.createSortBy);

const displayModeOptions = [
  DisplayMode.Grid,
  DisplayMode.List,
  DisplayMode.Wall,
  DisplayMode.Tagger,
];

const criterionOptions = [
  createStringCriterionOption("title"),
  createStringCriterionOption("code", "scene_code"),
  PathCriterionOption,
  createStringCriterionOption("details"),
  createStringCriterionOption("director"),
  createMandatoryStringCriterionOption("oshash", "media_info.hash"),
  createStringCriterionOption("checksum", "media_info.checksum"),
  PhashCriterionOption,
  DuplicatedCriterionOption,
  OrganizedCriterionOption,
  RatingCriterionOption,
  createMandatoryNumberCriterionOption("o_counter"),
  ResolutionCriterionOption,
  OrientationCriterionOption,
  createMandatoryNumberCriterionOption("framerate"),
  createStringCriterionOption("video_codec"),
  createStringCriterionOption("audio_codec"),
  createDurationCriterionOption("duration"),
  createDurationCriterionOption("resume_time"),
  createDurationCriterionOption("play_duration"),
  createMandatoryNumberCriterionOption("play_count"),
  HasMarkersCriterionOption,
  SceneIsMissingCriterionOption,
  TagsCriterionOption,
  createMandatoryNumberCriterionOption("tag_count"),
  PerformerTagsCriterionOption,
  PerformersCriterionOption,
  createMandatoryNumberCriterionOption("performer_count"),
  createMandatoryNumberCriterionOption("performer_age"),
  PerformerFavoriteCriterionOption,
  StudiosCriterionOption,
  MoviesCriterionOption,
  createStringCriterionOption("url"),
  StashIDCriterionOption,
  InteractiveCriterionOption,
  CaptionsCriterionOption,
  createMandatoryNumberCriterionOption("interactive_speed"),
  createMandatoryNumberCriterionOption("file_count"),
  createDateCriterionOption("date"),
  createMandatoryTimestampCriterionOption("created_at"),
  createMandatoryTimestampCriterionOption("updated_at"),
];

export const SceneListFilterOptions = new ListFilterOptions(
  defaultSortBy,
  sortByOptions,
  displayModeOptions,
  criterionOptions
);
