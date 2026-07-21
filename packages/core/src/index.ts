/** @sobrina/core — channel-agnostic domain (scaffold stub). */
export const CORE_PACKAGE = "@sobrina/core" as const;

export {
  loadFoundationConfig,
  MissingFoundationEnvError,
  type FoundationConfig,
} from "./config.ts";
