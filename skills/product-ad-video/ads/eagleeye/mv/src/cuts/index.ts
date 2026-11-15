import type { Cut } from '../engine/stage';

// Every file in this folder is a cut, addressed by its file name: ?cut=anthem, ?cut=wip-git ...
const mods = import.meta.glob<{ default: Cut }>(['./*.ts', '!./index.ts']);
const known: Record<string, () => Promise<{ default: Cut }>> = Object.fromEntries(
  Object.entries(mods).map(([p, load]) => [p.slice(2, -3), load]),
);

// The dev server runs without HMR, so a cut file added after it started is not in the glob yet:
// fall back to importing it by path.
export const cuts = new Proxy(known, {
  get(target, id: string) {
    if (id in target) return target[id];
    if (typeof id !== 'string' || !/^[\w-]+$/.test(id)) return undefined;
    return () => import(/* @vite-ignore */ `./${id}.ts`);
  },
});
