// Image preloading. Every image is decoded before the first frame that uses it.
const imgs = new Map<string, Promise<HTMLImageElement>>();

export function img(url: string): Promise<HTMLImageElement> {
  let p = imgs.get(url);
  if (!p) {
    p = new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.decoding = 'sync';
      i.onload = () => i.decode().then(() => res(i), () => res(i));
      i.onerror = () => rej(new Error(`image failed: ${url}`));
      i.src = url;
    });
    imgs.set(url, p);
  }
  return p;
}

export async function json<T = any>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url);
    return r.ok ? ((await r.json()) as T) : null;
  } catch {
    return null;
  }
}

/** Wait until every font face named in `families` (with weights) is ready. */
export async function fonts(specs: string[]) {
  await Promise.all(specs.map((s) => document.fonts.load(s).catch(() => [])));
  await document.fonts.ready;
}
