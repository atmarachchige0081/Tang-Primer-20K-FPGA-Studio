import { describe, expect, it } from "vitest";
import { markReleaseNotesSeen, releaseNotesPending, RELEASE_NOTES_VERSION } from "./release-notes";

describe("release notes preference", () => {
  it("is pending until the exact release is acknowledged", () => {
    const values = new Map<string, string>();
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
    expect(releaseNotesPending(storage)).toBe(true);
    markReleaseNotesSeen(storage);
    expect([...values.values()]).toContain(RELEASE_NOTES_VERSION);
    expect(releaseNotesPending(storage)).toBe(false);
  });

  it("fails open when storage is unavailable", () => {
    expect(releaseNotesPending({ getItem: () => { throw new Error("blocked"); } })).toBe(true);
    expect(() => markReleaseNotesSeen({ setItem: () => { throw new Error("blocked"); } })).not.toThrow();
  });
});
