/** Readable name of an uploaded object: drops the folder and the "<time>-<random>-" prefix. */
export function displayFileName(path: string): string {
  const name = path.split("/").pop() ?? path;
  return name.replace(/^\d{10,}-[0-9a-f]{6}-/, "");
}
