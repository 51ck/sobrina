import { describe, expect, test } from "bun:test";
import { boot } from "./boot.ts";
import { MissingFoundationEnvError } from "./config.ts";

describe("boot", () => {
  test("fails clearly when DATABASE_PATH unset", async () => {
    await expect(boot({})).rejects.toBeInstanceOf(MissingFoundationEnvError);
    await expect(boot({})).rejects.toThrow(/DATABASE_PATH/);
    await expect(boot({})).rejects.toThrow(/\.env\.example/);
  });
});
