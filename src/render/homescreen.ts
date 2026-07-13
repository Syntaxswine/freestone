/**
 * The home screen (SIM 15 title-screen arc): the game's front door AND its pause menu.
 * This is the one place the field-guide restraint yields to a full-art picture
 * (HomeScreen.png). New Game and Settings are wired; Save/Load are spec'd stubs (the
 * event-sourced format already lives in src/sim/save.ts — makeSave/replay — so wiring
 * them later is UI + a localStorage slot, no sim work). Pure DOM/overlay: it never
 * touches the sim, so nothing here can move the determinism baseline.
 */

export interface HomeScreenOptions {
  /** Start a fresh game (main.ts decides reset-by-reload vs begin-in-place). */
  onNewGame: () => void;
  /** Resume the game in progress (the Back button; only shown when one exists). */
  onBack: () => void;
  getTutorialEnabled: () => boolean;
  setTutorialEnabled: (on: boolean) => void;
}

export interface HomeScreen {
  /** Show the overlay. `canBack` = a game is in progress, so offer "Back". */
  open(canBack: boolean): void;
  close(): void;
  isOpen(): boolean;
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
        <button class="home-btn" data-act="save" disabled>Save<span class="soon">soon</span></button>
        <button class="home-btn" data-act="load" disabled>Load<span class="soon">soon</span></button>
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
  const tutPill = home.querySelector('[data-act="tut-toggle"]') as HTMLButtonElement;

  function refreshPill(): void {
    const on = opts.getTutorialEnabled();
    tutPill.textContent = on ? 'on' : 'off';
    tutPill.classList.toggle('on', on);
  }

  home.addEventListener('click', (ev) => {
    const t = (ev.target as HTMLElement).closest('[data-act]') as HTMLElement | null;
    if (!t) return;
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
      case 'tut-toggle':
        opts.setTutorialEnabled(!opts.getTutorialEnabled());
        refreshPill();
        break;
      // 'save' / 'load' are disabled stubs — no handler. When persistence is wired:
      // Save = makeSave(world, commandLog) → stableStringify → localStorage slot;
      // Load = replay(save, site) → autostart. Both already exist in src/sim/save.ts.
    }
  });

  return {
    open(canBack: boolean): void {
      backBtn.style.display = canBack ? '' : 'none';
      home.classList.remove('settings');
      refreshPill();
      home.classList.add('shown');
    },
    close(): void {
      home.classList.remove('shown');
    },
    isOpen(): boolean {
      return home.classList.contains('shown');
    },
  };
}
