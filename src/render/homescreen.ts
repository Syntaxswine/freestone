/**
 * The home screen (SIM 15 title-screen arc): the game's front door AND its pause menu.
 * This is the one place the field-guide restraint yields to a full-art picture
 * (HomeScreen.png). New Game, Settings, and now Save/Load are all wired — the
 * event-sourced format lives in src/sim/save.ts (makeSave/replay), so Save is
 * stableStringify → a localStorage slot and Load is a reload that replays it (main.ts
 * owns both, and reset-by-reload keeps the render layers, which bind to `world` at
 * construction, from stranding). Pure DOM/overlay: it never touches the sim, so
 * nothing here can move the determinism baseline.
 */

export interface HomeScreenOptions {
  /** Start a fresh game (main.ts decides reset-by-reload vs begin-in-place). */
  onNewGame: () => void;
  /** Resume the game in progress (the Back button; only shown when one exists). */
  onBack: () => void;
  /** Write the Lodge Book from the world in progress (only offered when one exists). */
  onSave: () => void;
  /** Reopen the kept castle (a reload that replays the save; only when one exists). */
  onLoad: () => void;
  getTutorialEnabled: () => boolean;
  setTutorialEnabled: (on: boolean) => void;
  /** The kept Lodge Book, or null if none yet — labels Save ("over Yr N") / Load ("Yr N"). */
  getSaveInfo: () => { year: number } | null;
}

export interface HomeScreen {
  /** Show the overlay. `canBack` = a game is in progress, so offer "Back" and "Save". */
  open(canBack: boolean): void;
  close(): void;
  isOpen(): boolean;
  /** Flash "Saved ✓" on the Save button and refresh the slot labels (after a save). */
  noteSaved(): void;
}

export function createHomeScreen(opts: HomeScreenOptions): HomeScreen {
  const home = document.createElement('div');
  home.id = 'home';
  // BASE_URL, not an absolute '/assets/…' — the Pages subpath law (/freestone/).
  home.style.backgroundImage = `url(${import.meta.env.BASE_URL}assets/HomeScreen.png)`;
  home.innerHTML = `
    <div class="home-inner">
      <h1 id="home-title">Castle Cultivator</h1>
      <div id="home-tag">a castle raised across generations, stone by stone</div>
      <div id="home-menu" class="home-col">
        <button class="home-btn primary" data-act="new">New Game</button>
        <button class="home-btn" data-act="settings">Settings</button>
        <button class="home-btn" data-act="save"><span class="lbl">Save</span><span class="soon"></span></button>
        <button class="home-btn" data-act="load"><span class="lbl">Load</span><span class="soon"></span></button>
        <button class="home-btn" data-act="back" style="display:none">Back to the castle</button>
      </div>
      <div id="home-settings" class="home-col">
        <div class="set-row"><span class="label">Mining tutorial</span>
          <button class="pill" data-act="tut-toggle">on</button></div>
        <button class="home-btn" data-act="settings-back">‹ Back</button>
      </div>
    </div>`;
  document.body.appendChild(home);

  const backBtn = home.querySelector('[data-act="back"]') as HTMLButtonElement;
  const saveBtn = home.querySelector('[data-act="save"]') as HTMLButtonElement;
  const loadBtn = home.querySelector('[data-act="load"]') as HTMLButtonElement;
  const saveLbl = saveBtn.querySelector('.lbl') as HTMLElement;
  const saveSoon = saveBtn.querySelector('.soon') as HTMLElement;
  const loadLbl = loadBtn.querySelector('.lbl') as HTMLElement;
  const loadSoon = loadBtn.querySelector('.soon') as HTMLElement;
  const tutPill = home.querySelector('[data-act="tut-toggle"]') as HTMLButtonElement;
  let lastCanBack = false;

  function refreshPill(): void {
    const on = opts.getTutorialEnabled();
    tutPill.textContent = on ? 'on' : 'off';
    tutPill.classList.toggle('on', on);
  }

  /** Save is offered only with a game in progress; Load only with a kept Lodge Book. */
  function refreshSlots(canBack: boolean): void {
    lastCanBack = canBack;
    backBtn.style.display = canBack ? '' : 'none';
    const info = opts.getSaveInfo();
    saveBtn.disabled = !canBack;
    saveLbl.textContent = 'Save';
    saveSoon.textContent = info ? `over Yr ${info.year}` : '';
    loadBtn.disabled = !info;
    loadLbl.textContent = 'Load';
    loadSoon.textContent = info ? `Yr ${info.year}` : 'empty';
  }

  home.addEventListener('click', (ev) => {
    const t = (ev.target as HTMLElement).closest('[data-act]') as HTMLElement | null;
    if (!t || (t as HTMLButtonElement).disabled) return;
    switch (t.dataset.act) {
      case 'new':
        opts.onNewGame();
        break;
      case 'settings':
        home.classList.add('settings');
        break;
      case 'settings-back':
        home.classList.remove('settings');
        break;
      case 'back':
        opts.onBack();
        break;
      case 'save':
        opts.onSave();
        break;
      case 'load':
        opts.onLoad();
        break;
      case 'tut-toggle':
        opts.setTutorialEnabled(!opts.getTutorialEnabled());
        refreshPill();
        break;
    }
  });

  return {
    open(canBack: boolean): void {
      home.classList.remove('settings');
      refreshPill();
      refreshSlots(canBack);
      home.classList.add('shown');
    },
    close(): void {
      home.classList.remove('shown');
    },
    isOpen(): boolean {
      return home.classList.contains('shown');
    },
    noteSaved(): void {
      const info = opts.getSaveInfo();
      saveLbl.textContent = 'Saved ✓';
      saveSoon.textContent = info ? `Yr ${info.year}` : '';
      window.setTimeout(() => {
        if (home.classList.contains('shown')) refreshSlots(lastCanBack);
      }, 1300);
    },
  };
}
