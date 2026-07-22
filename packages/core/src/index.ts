/** @sobri/core — channel-agnostic domain (scaffold stub). */
export const CORE_PACKAGE = "@sobri/core" as const;

export {
  loadFoundationConfig,
  MissingFoundationEnvError,
  type FoundationConfig,
} from "./config.ts";

export {
  openStore,
  SQLITE_ACCESS,
  type Store,
} from "./store.ts";

export { migrate, MIGRATIONS, type Migration } from "./migrate.ts";

export {
  getOrCreateChat,
  getSettings,
  updateSettings,
  ChatNotFoundError,
  InvalidSettingsError,
  DEFAULT_TIMEZONE,
  DEFAULT_GRACE_TOKEN_N,
  type ChatSettings,
  type ChatSettingsPatch,
  type ClockTime,
} from "./settings.ts";

export {
  joinChecklist,
  leaveChecklist,
  removeFromChecklist,
  listChecklist,
  isOnChecklist,
  type ChecklistMembership,
  type ChecklistMember,
} from "./checklist.ts";

export {
  computeDayKey,
  ensureOpenDay,
  getDay,
  closeDay,
  DayNotFoundError,
  type Day,
  type DayKey,
  type DayKeySettings,
  type DayStatus,
} from "./day.ts";

export {
  hasGraceToken,
  grantGraceToken,
  consumeGraceToken,
  resolveSlip,
  type SlipResolution,
  maybeEarnGraceToken,
  refundGraceToken,
} from "./grace.ts";

export {
  recordCheckIn,
  joinAndRecordCheckIn,
  NotOnChecklistError,
  DayClosedError,
  type CheckIn,
  type CheckInIntent,
  type CheckInStatus,
} from "./checkin.ts";

export { listSilentChecklistMembers } from "./deadline.ts";
