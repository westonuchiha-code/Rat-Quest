#!/usr/bin/env python3
"""Turns recordings (recordings/map.json) into src/audio/recorded.ts: trimmed, pitched, filtered, squashed to a low rate and
a few bits, like the console samples. Run from the project folder. Needs ffmpeg and numpy."""
import base64, json, subprocess, sys, tempfile, os
import numpy as np

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cfg = json.load(open(os.path.join(root, 'recordings', 'map.json')))
out = {}
for name, c in cfg.items():
    if name.startswith('_'):
        continue
    src = os.path.join(root, 'recordings', c['file'])
    with tempfile.TemporaryDirectory() as d:
        wav = os.path.join(d, 'x.wav')
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(c['start']), '-to', str(c['end']), '-i', src, '-ac', '1', '-ar', '44100', wav], check=True)
        import wave
        w = wave.open(wav)
        a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float64) / 32768
    a -= a.mean()
    # pitch: play faster or slower (linear resample)
    pitch = c.get('pitch', 1.0)
    n = int(len(a) / pitch)
    a = np.interp(np.arange(n) * pitch, np.arange(len(a)), a)
    # to the console-ish rate
    rate = c.get('rate', 22050)
    m = int(len(a) * rate / 44100)
    k = max(1, int(44100 / rate))
    kernel = np.ones(k) / k
    a = np.convolve(a, kernel, mode='same')
    a = np.interp(np.arange(m) * 44100 / rate, np.arange(len(a)), a)
    # extra low-pass (one pole)
    lp = c.get('lowpass', 1.0)
    if lp < 1.0:
        y = np.zeros_like(a)
        s = 0.0
        for i, v in enumerate(a):
            s += (v - s) * lp
            y[i] = s
        a = y
    # fade in/out so there are no clicks, normalise, squash
    f = min(len(a) // 8, int(rate * 0.004))
    if f > 0:
        a[:f] *= np.linspace(0, 1, f)
        a[-f * 4:] *= np.linspace(1, 0, f * 4)
    peak = np.abs(a).max() or 1
    a = a / peak * c.get('gain', 0.85)
    levels = 2 ** (c.get('bits', 7) - 1)
    q = np.round(np.clip(a, -1, 1) * levels) / levels
    i8 = np.round(q * 127).astype(np.int8)
    out[name] = {'rate': rate, 'loop': bool(c.get('loop', False)), 'b64': base64.b64encode(i8.tobytes()).decode()}
    print(f'{name}: {len(i8)} samples at {rate} Hz ({len(i8) / rate:.2f}s)')

# ---- voice banks: auto-slice a recording of the 27 syllables into voice_<bank>_<syl> samples ----
SYLS = ['ah','eh','ee','oh','oo','ba','ka','da','fa','ga','ha','ja','la','ma','na','pa','ra','sa','sha','cha','ta','wa','ya','za','eek','hup','heh']
vpath = os.path.join(root, 'recordings', 'voices.json')
if os.path.exists(vpath):
    import wave
    for bank, c in json.load(open(vpath)).items():
        if bank.startswith('_'):
            continue
        with tempfile.TemporaryDirectory() as d:
            wav = os.path.join(d, 'v.wav')
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', os.path.join(root, 'recordings', c['file']), '-ac', '1', '-ar', '44100', wav], check=True)
            w = wave.open(wav)
            A = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float64) / 32768
        sr = 44100
        hop = sr // 100
        env = np.array([np.sqrt((A[i:i + hop] ** 2).mean()) for i in range(0, len(A) - hop, hop)])
        on = env > c.get('threshold', 0.03)
        segs = []
        i = 0
        while i < len(on):
            if on[i]:
                j = i
                while j < len(on) and on[j]:
                    j += 1
                if segs and i - segs[-1][1] < 6:
                    segs[-1][1] = j
                else:
                    segs.append([i, j])
                i = j
            else:
                i += 1
        segs = [sg for k, sg in enumerate(segs) if (k + 1) not in c.get('skip', [])]
        if 'minpeak' in c and not c.get('free'):
            segs = [sg for sg in segs if env[sg[0]:sg[1]].max() >= c['minpeak'] and sg[1] - sg[0] >= c.get('minlen', 8)]
        if c.get('free'):
            # A free-form bank (beatboxing, noises): keep the good sounds, and share them out over the 27 syllables in turn.
            good = [sg for sg in segs if sg[1] - sg[0] >= c.get('minlen', 8) and env[sg[0]:sg[1]].max() >= c.get('minpeak', 0.1)]
            # Ordered by brightness (low thumps first, bright ticks last) so the game can pick kicks, snares and hats.
            def centroid(sg):
                x = A[sg[0] * hop: sg[1] * hop]
                sp = np.abs(np.fft.rfft(x * np.hanning(len(x))))
                fr = np.fft.rfftfreq(len(x), 1 / sr)
                return (sp * fr).sum() / (sp.sum() or 1)
            good.sort(key=centroid)
            segs = [good[int(i * len(good) / len(SYLS))] for i in range(len(SYLS))]
        if len(segs) != len(SYLS):
            print(f'WARNING {bank}: found {len(segs)} sounds, expected {len(SYLS)}; using the first {min(len(segs), len(SYLS))}')
        rate = c.get('rate', 22050)
        alias = c.get('alias', {})
        for syl, (a0, a1) in zip(SYLS, segs):
            a = A[max(0, a0 * hop - hop): min(len(A), min(a1 * hop + hop * 2, a0 * hop + int(sr * c.get('maxlen', 0.3))))].copy()
            a -= a.mean()
            if c.get('reverse'):
                a = a[::-1].copy()
            if c.get('droop'):
                # A sleepy sag: the pitch slides down (and the sound stretches) across each syllable.
                r = np.linspace(1.0, 1.0 - c['droop'], len(a))
                pos = np.cumsum(r)
                pos = pos[pos < len(a) - 1]
                a = np.interp(pos, np.arange(len(a)), a)
            m = int(len(a) * rate / sr)
            k = max(1, int(sr / rate))
            a = np.convolve(a, np.ones(k) / k, mode='same')
            a = np.interp(np.arange(m) * sr / rate, np.arange(len(a)), a)
            lp = c.get('lowpass', 1.0)
            if lp < 1.0:
                y = np.zeros_like(a); st = 0.0
                for ii, v in enumerate(a):
                    st += (v - st) * lp; y[ii] = st
                a = y
            f = int(rate * 0.006)
            a[:f] *= np.linspace(0, 1, f); a[-f * 3:] *= np.linspace(1, 0, f * 3)
            a = a / (np.abs(a).max() or 1) * c.get('gain', 0.85)
            lv = 2 ** (c.get('bits', 6) - 1)
            i8 = np.round(np.round(np.clip(a, -1, 1) * lv) / lv * 127).astype(np.int8)
            out[f'voice_{bank}_{syl}'] = {'rate': rate, 'loop': False, 'b64': base64.b64encode(i8.tobytes()).decode()}
        for syl, src_syl in alias.items():
            out[f'voice_{bank}_{syl}'] = out[f'voice_{bank}_{src_syl}']
        print(f'voice {bank}: {min(len(segs), len(SYLS))} syllables')

lines = ['/** Made by scripts/make-recorded.py from recordings/map.json. Do not edit by hand. */',
         'export interface Recorded { rate: number; loop: boolean; b64: string }',
         'export const RECORDED: Record<string, Recorded> = {']
for k, v in out.items():
    lines.append(f"  {k}: {{ rate: {v['rate']}, loop: {str(v['loop']).lower()}, b64: '{v['b64']}' }},")
lines.append('};')
open(os.path.join(root, 'src', 'audio', 'recorded.ts'), 'w').write('\n'.join(lines) + '\n')
