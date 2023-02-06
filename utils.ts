export function concat<T>(...args: (T[] | null)[]): T[] {
  const array = [] as T[];
  for (const arg of args) array.push(...arg ?? []);
  return array;
}

export function dedupe<T>(array: T[], ...keys: string[]): typeof array {
  if (keys.length) {
    const record = {} as Record<string, Set<unknown>>;
    return array.filter(function (item) {
      if (!isRecord(item)) return true;
      let isNew = true;
      for (const key of keys) {
        const value = item[key];
        const queue = record[key] ??= new Set();
        isNew &&= !queue.has(value);
        if (isNew) queue.add(value);
      }
      return isNew;
    });
  } else {
    const queue = new Set(array);
    return [...queue];
  }
}

type Key = string | number | symbol;
const isRecord = (x: unknown): x is Record<Key, unknown> =>
  x != null && typeof x === "object";

export class ext {
  static #HTML = new Set(["html", "htm"]);
  static #HTMLtemplate = new Set(["jinja", "njk", "eta", "ejs"]);
  static #HTMLish = new Set([...this.#HTML, ...this.#HTMLtemplate]);
  static HTML = (lang: string) => this.#HTML.has(lang);
  static HTMLtemplate = (lang: string) => this.#HTMLtemplate.has(lang);
  static HTMLish = (lang: string) => this.#HTMLish.has(lang);
}
