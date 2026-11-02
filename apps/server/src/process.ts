import { spawn } from "node:child_process";
export function killCommand(pid: number) {
  try {
    process.kill(process.platform === "win32" ? pid : -pid, "SIGKILL");
  } catch {
    /* already exited */
  }
}
export function runCommand(
  command: string,
  args: string[],
  options: {
    cwd: string;
    input?: string;
    env?: NodeJS.ProcessEnv;
    timeoutMs?: number;
    maxOutputBytes?: number;
    checkBudget?: () => Promise<boolean>;
    onChild?: (pid: number | null) => void;
  },
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env ?? process.env,
      detached: process.platform !== "win32",
      stdio: ["pipe", "pipe", "pipe"],
    });
    if (child.pid) options.onChild?.(child.pid);
    let reason = "",
      bytes = 0,
      stderr = "",
      checking = false;
    const chunks: Buffer[] = [];
    const stop = (message: string) => {
      reason = message;
      if (child.pid) killCommand(child.pid);
    };
    const timer = setTimeout(
      () => stop("Command time limit exceeded."),
      options.timeoutMs ?? 120000,
    );
    const monitor = options.checkBudget
      ? setInterval(async () => {
          if (checking) return;
          checking = true;
          try {
            if (!(await options.checkBudget!()))
              stop("Repository storage limit exceeded.");
          } catch {
            stop("Repository storage could not be checked.");
          } finally {
            checking = false;
          }
        }, 1000)
      : undefined;
    const cleanup = () => {
      clearTimeout(timer);
      if (monitor) clearInterval(monitor);
      options.onChild?.(null);
    };
    child.stdout.on("data", (buffer: Buffer) => {
      bytes += buffer.length;
      if (bytes > (options.maxOutputBytes ?? 25 * 1024 * 1024))
        stop("Command output limit exceeded.");
      else chunks.push(buffer);
    });
    child.stderr.on("data", (buffer) => {
      stderr = (stderr + buffer.toString()).slice(-3000);
    });
    child.on("error", (error) => {
      cleanup();
      reject(error);
    });
    child.on("close", (code, signal) => {
      cleanup();
      if (reason || code !== 0 || signal)
        reject(
          new Error(
            reason ||
              (stderr.includes("couldn't find remote ref")
                ? "Branch or commit not found."
                : `Git command failed${signal ? " with signal " + signal : ""}. Retry this repository.`),
          ),
        );
      else resolve(Buffer.concat(chunks));
    });
    child.stdin.on("error", () => {});
    child.stdin.end(options.input);
  });
}
