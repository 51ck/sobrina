import { describe, expect, test } from "bun:test";
import {
  loadFoundationConfig,
  MissingFoundationEnvError,
} from "./config.ts";

describe("loadFoundationConfig", () => {
  test("returns databasePath when set", () => {
    expect(loadFoundationConfig({ DATABASE_PATH: " /tmp/s.db " })).toEqual({
      databasePath: "/tmp/s.db",
    });
  });

  test("fail-fast on missing DATABASE_PATH", () => {
    expect(() => loadFoundationConfig({})).toThrow(MissingFoundationEnvError);
    expect(() => loadFoundationConfig({ DATABASE_PATH: "  " })).toThrow(
      /Copy \.env\.example/,
    );
  });
});
