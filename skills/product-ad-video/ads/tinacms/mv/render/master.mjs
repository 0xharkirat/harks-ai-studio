// Mux a rendered cut with its music cue and encode the delivery files.
// node render/master.mjs --cut anthem [--video ../out/anthem.mov] [--audio ../music/out/anthem.wav] [--name TinaCMS-Anthem-60s]
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from './lib.mjs';

const args = parseArgs(process.argv.slice(2));
const cut = args.cut ?? 'anthem';
const video = path.resolve(args.video ?? `../out/${cut}.mov`);
const audio = path.resolve(args.audio ?? `../music/out/${args.music ?? cut}.wav`);
const dir = path.resolve(args.dir ?? '../out/deliver');
fs.mkdirSync(dir, { recursive: true });
const base = path.join(dir, args.name ?? cut);
const hasAudio = fs.existsSync(audio);

const run = (a) => new Promise((res, rej) => {
  spawn('ffmpeg', ['-y', '-loglevel', 'error', '-stats', ...a], { stdio: 'inherit' }).on('close', (c) => (c ? rej(new Error('ffmpeg failed')) : res()));
});
const aIn = hasAudio ? ['-i', audio] : [];
const aMap = hasAudio ? ['-map', '0:v:0', '-map', '1:a:0', '-c:a', 'aac', '-b:a', '320k', '-ar', '48000'] : ['-map', '0:v:0'];
const color = ['-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-x264-params', 'colorprim=bt709:transfer=bt709:colormatrix=bt709'];
// Tag the frames themselves; encoder flags alone are overridden by untagged input frames.
const tag = 'setparams=color_primaries=bt709:color_trc=bt709:colorspace=bt709';
// Ad delivery master: H.264 High, tuned for flat graphics and fine lines.
await run(['-i', video, ...aIn, ...aMap, '-vf', tag, '-c:v', 'libx264', '-preset', 'slow', '-crf', '12', '-tune', 'animation', '-pix_fmt', 'yuv420p', '-profile:v', 'high', ...color, '-movflags', '+faststart', '-shortest', base + '.mp4']);
// 30 fps copy for platforms that cap the frame rate (LinkedIn). A 30 fps render needs no copy: the master is already 30.
const srcFps = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=r_frame_rate', '-of', 'csv=p=0', video]).stdout.toString().trim();
if (srcFps !== '30/1') await run(['-i', video, ...aIn, ...aMap, '-vf', tag, '-r', '30', '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-tune', 'animation', '-pix_fmt', 'yuv420p', '-profile:v', 'high', ...color, '-movflags', '+faststart', '-shortest', base + '-30fps.mp4']);
// Small preview for quick review and chat.
await run(['-i', video, ...aIn, ...aMap, '-vf', `scale=iw/2:-2,${tag}`, '-c:v', 'libx264', '-preset', 'medium', '-crf', '23', '-pix_fmt', 'yuv420p', ...color, '-movflags', '+faststart', '-shortest', base + '-preview.mp4']);
// Poster frame (thumbnail) at --poster seconds.
if (args.poster) await run(['-ss', String(args.poster), '-i', video, '-frames:v', '1', '-q:v', '2', base + '-poster.jpg']);
console.log('done:', base + '.mp4', hasAudio ? '(with audio)' : '(NO AUDIO: cue not found)');
