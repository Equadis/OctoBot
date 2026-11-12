import { describe, expect, it } from "vitest";
import { isCommandError, isWhisperThrottle } from "./system-error.js";

describe("isCommandError", () => {
  it("flags guild-invite failure messages (server interpolates the name)", () => {
    expect(isCommandError("Raider is already in a guild.")).toBe(true);
    expect(isCommandError("You are not in a guild.")).toBe(true);
    expect(isCommandError("You do not have permission to perform that action.")).toBe(true);
    expect(isCommandError("No player named 'Ghost' is currently playing.")).toBe(true);
    expect(isCommandError("Player not found.")).toBe(true);
  });

  it("matches case-insensitively", () => {
    expect(isCommandError("RAIDER IS ALREADY IN A GUILD")).toBe(true);
  });

  it("ignores benign system messages", () => {
    expect(isCommandError("Welcome to Turtle WoW!")).toBe(false);
    expect(isCommandError("You have reached level 60!")).toBe(false);
    expect(isCommandError("The server will restart in 15 minutes.")).toBe(false);
  });

  it("treats the whisper throttle as its own thing (handled, not alerted)", () => {
    expect(isWhisperThrottle("You have whispered too many different players too quickly.")).toBe(true);
    expect(isWhisperThrottle("Please wait a while before whispering any additional players.")).toBe(true);
    expect(isWhisperThrottle("Raider is already in a guild.")).toBe(false);
    // and it isn't mistaken for a command error (which would alert the errors channel)
    expect(isCommandError("You have whispered too many different players too quickly.")).toBe(false);
  });
});
