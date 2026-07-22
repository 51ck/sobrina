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
