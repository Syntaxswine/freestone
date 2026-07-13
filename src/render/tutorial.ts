/**
 * The mining tutorial (SIM 15 title-screen arc). Two parts, per the boss:
 *   1. a one-time intro modal that explains how the game works, then
 *   2. a persistent corner checklist that ticks off as you actually mine.
 * It never gates input — it only WATCHES real events (main.ts calls saw() from the
 * underground toggle, the depth readout, and a successful quarry). Pure DOM: the sim
 * is untouched, so nothing here can move the determinism baseline. Whether it runs is
 * the Settings toggle's business; main.ts calls start() at New Game if enabled.
 */

export type TutStep = 'underground' | 'seam' | 'quarry';

interface StepDef {
  key: TutStep;
  label: string;
}
const STEPS: StepDef[] = [
  { key: 'underground', label: 'Look underground — press U' },
  { key: 'seam', label: 'Find a dry seam (stone, not blue)' },
  { key: 'quarry', label: 'Quarry an outcrop — Q, draw a ring, Enter' },
];

export interface Tutorial {
  /** Show the intro modal; dismissing it reveals the checklist. */
  start(): void;
  /** Mark a step done (idempotent, no-op unless running). */
  saw(step: TutStep): void;
  running(): boolean;
}

export function createTutorial(): Tutorial {
  let built = false;
  let isRunning = false;
  let completed = false;
  const done = new Set<TutStep>();

  let intro!: HTMLElement;
  let panel!: HTMLElement;
  let head!: HTMLElement;
  let foot!: HTMLElement;
  const rows = new Map<TutStep, HTMLElement>();

  function build(): void {
    intro = document.createElement('div');
    intro.id = 'tut-intro';
    intro.innerHTML = `
      <div class="card">
        <h3>Reading the Land</h3>
        <p>You steward a castle across generations — you draw its walls, its buildings
        and its farms, and every wall is built of <b>stone</b>.</p>
        <p>Stone is won from the ground beneath you. Before you dig you <b>read the
        land</b>: which seams lie shallow, which are dry, and which are drowned —
        beyond an open cut.</p>
        <p>Let's win your first stones.</p>
        <button class="go">Show me &rsaquo;</button>
      </div>`;
    intro.querySelector('.go')!.addEventListener('click', () => {
      intro.classList.remove('shown');
      panel.classList.add('shown');
    });
    document.body.appendChild(intro);

    panel = document.createElement('div');
    panel.id = 'tutorial';
    head = document.createElement('h4');
    panel.appendChild(head);
    for (const s of STEPS) {
      const row = document.createElement('div');
      row.className = 'tut-step';
      row.innerHTML = `<span class="box">☐</span><span class="txt">${s.label}</span>`;
      panel.appendChild(row);
      rows.set(s.key, row);
    }
    foot = document.createElement('div');
    foot.className = 'tut-foot';
    panel.appendChild(foot);
    document.body.appendChild(panel);
    built = true;
  }

  function render(): void {
    head.textContent = completed ? 'MINING — first stones won ✓' : 'MINING — your first stones';
    let activeMarked = false;
    for (const s of STEPS) {
      const row = rows.get(s.key)!;
      const isDone = done.has(s.key);
      row.classList.toggle('done', isDone);
      (row.querySelector('.box') as HTMLElement).textContent = isDone ? '☑' : '☐';
      const active = !isDone && !activeMarked;
      row.classList.toggle('active', active);
      if (active) activeMarked = true;
    }
    foot.textContent = completed
      ? 'First stones won — the land provides. Drowned or deep stone will want an adit (coming soon).'
      : 'Tip: right-drag to look around · the wheel changes depth underground.';
  }

  return {
    start(): void {
      if (!built) build();
      isRunning = true;
      completed = false;
      done.clear();
      render();
      panel.classList.remove('shown'); // checklist waits behind the intro
      intro.classList.add('shown');
    },
    saw(step: TutStep): void {
      if (!isRunning || completed || done.has(step)) return;
      done.add(step);
      if (done.size === STEPS.length) completed = true;
      render();
      if (completed) {
        isRunning = false;
        window.setTimeout(() => panel.classList.remove('shown'), 9000); // retire after the win lands
      }
    },
    running(): boolean {
      return isRunning;
    },
  };
}
