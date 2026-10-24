# OS Performance Analyzer
Interactive laboratory for six operating-system topics. Plain HTML + ES modules: **no dependencies, no build step**.
All results are **simulated** from your inputs; they are not measurements of your real OS.

## Run (Windows, Node.js 18+)
```
cd os_pj
npm start        (or: npm run dev)
```
Open http://localhost:5173 and keep the terminal open. Tests: `npm test`.
Optional browser test: `npm i -D playwright`, `npx playwright install chromium`, then with the app running `node e2e/browser-check.cjs`.

## Structure
- `src/engine.js` algorithms only. Each run returns a step trace (`steps`) plus `summary`; steps carry the reason for every decision.
- `src/views.js` pure renderers `(run, step, ui) -> HTML`. Playback only renders the trace, it never recomputes.
- `src/learn.js` concept / algorithm / glossary content. `src/insights.js` result interpretation generated from the numbers.
- `src/modules.js` input parsing, metrics, extra charts. `src/app.js` shell, playback, DOM reconciler, dashboard. `src/styles.css` design system.
- `test/` engine, playback/render, and insight tests. `e2e/` optional browser test.

## Modules
CPU: FCFS, SJF, Priority (non-preemptive), Round Robin. Memory: First/Best/Worst Fit. Files: Sequential/Indexed/Linked.
Deadlock: Banker's safety and detection, with a resource-allocation graph. Pages: FIFO/Optimal/LRU. Disk: FCFS/SCAN/C-SCAN/LOOK.

## Conventions
- CPU ties: key, then arrival, then input order; lower priority number = higher priority; RR enqueues new arrivals before the preempted process.
- Memory: a block keeps leftover capacity for later processes. External fragmentation = 1 − largest free block ÷ total free.
- Files: indexed uses one index block per file; linked stores a pointer in every data block. Metadata is reported as index blocks or pointer-carrying blocks (not directly comparable).
- Disk: SCAN goes to the physical end before reversing. C-SCAN goes to the end, jumps to the other end (**jump distance is counted**), continues. LOOK reverses at the last request. Servicing order is shown separately from boundary/wraparound moves.
- Optimal page replacement ties: first frame slot. For `1 2 3 1 4 5 2` / 3 frames: FIFO 6, **Optimal 5**, LRU 6.

## Controls
Reset, Prev, Play/Pause, Next, speed, scrub slider, click any history row to jump. Keyboard: ← → step, Space play/pause, R reset.

## Limitations
- No memory deallocation/release is modeled (allocation only). No preemptive SJF/SRTF.
- The resource-allocation graph shows instance counts; with multi-instance resources a cycle does not prove deadlock, so verdicts come from Work/Finish.
- Linked allocation shows pointers inside cells plus a traversal tracer, not drawn connector lines between distant blocks.
- Simulations compute instantly, so there are no loading states. Tested in Chromium only.
