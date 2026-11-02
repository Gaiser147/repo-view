import { expect, it } from "vitest";
import { runCommand } from "../apps/server/src/process";
it("rejects signalled/time-limited commands instead of accepting partial output", async () => {
  await expect(
    runCommand(
      process.execPath,
      ["-e", 'process.stdout.write("partial"); setInterval(()=>{},1000)'],
      { cwd: process.cwd(), timeoutMs: 80 },
    ),
  ).rejects.toThrow(/time|signal|limit/i);
});
it("rejects output-budget overflow and preserves successful bytes", async () => {
  await expect(
    runCommand(
      process.execPath,
      ["-e", 'process.stdout.write("x".repeat(4096))'],
      { cwd: process.cwd(), maxOutputBytes: 64 },
    ),
  ).rejects.toThrow(/limit/i);
  expect(
    (
      await runCommand(process.execPath, ["-e", 'process.stdout.write("ok")'], {
        cwd: process.cwd(),
      })
    ).toString(),
  ).toBe("ok");
});
