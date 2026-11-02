export function parseRepository(input: string): string {
  let value = input.trim();
  if (value.startsWith("https://")) {
    const url = new URL(value);
    if (
      url.hostname !== "github.com" ||
      url.port ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    )
      throw new Error("Use a public github.com/owner/repository URL.");
    value = url.pathname.slice(1);
  }
  value = value.replace(/\.git$/, "").replace(/\/$/, "");
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]*\/[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(value))
    throw new Error("Use a public github.com/owner/repository URL.");
  return value;
}
