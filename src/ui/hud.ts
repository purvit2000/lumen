export interface Hud {
  show(): void;
  hide(): void;
  setLevel(number: number, name: string, hint: string | undefined, par: number): void;
  updateMoves(moves: number): void;
  showWin(stars: number, moves: number, par: number, hasNext: boolean): void;
  hideWin(): void;
}

export function createHud(opts: {
  onReset: () => void;
  onNext: () => void;
  onMenu: () => void;
}): Hud {
  const root = document.getElementById('hud')!;
  root.innerHTML = `
    <div class="panel top-left">
      <h1>LUMEN</h1>
      <div class="level-name" id="hud-level-name"></div>
      <div class="moves" id="hud-moves"></div>
    </div>
    <div class="panel top-right">
      <button id="hud-menu" class="btn">☰ Missions</button>
      <button id="hud-reset" class="btn">↺ Reset</button>
    </div>
    <div class="hint">
      <span id="hud-hint"></span>
      <span class="hint-sub">tap a mirror to select it, then choose ⟲ or ⟳ · drag to orbit · scroll to zoom</span>
    </div>
    <div class="win-overlay hidden" id="hud-win">
      <div class="win-card">
        <div class="win-title">Mission Complete</div>
        <div class="win-stars" id="hud-stars"></div>
        <div class="win-detail" id="hud-win-detail"></div>
        <div class="win-buttons">
          <button id="hud-replay" class="btn">↺ Replay</button>
          <button id="hud-to-menu" class="btn">☰ Missions</button>
          <button id="hud-next" class="btn primary">Next Mission →</button>
        </div>
      </div>
    </div>
  `;

  const nameEl = root.querySelector<HTMLElement>('#hud-level-name')!;
  const movesEl = root.querySelector<HTMLElement>('#hud-moves')!;
  const hintEl = root.querySelector<HTMLElement>('#hud-hint')!;
  const winEl = root.querySelector<HTMLElement>('#hud-win')!;
  const starsEl = root.querySelector<HTMLElement>('#hud-stars')!;
  const detailEl = root.querySelector<HTMLElement>('#hud-win-detail')!;
  const nextBtn = root.querySelector<HTMLButtonElement>('#hud-next')!;

  root.querySelector('#hud-reset')!.addEventListener('click', opts.onReset);
  root.querySelector('#hud-replay')!.addEventListener('click', opts.onReset);
  root.querySelector('#hud-menu')!.addEventListener('click', opts.onMenu);
  root.querySelector('#hud-to-menu')!.addEventListener('click', opts.onMenu);
  nextBtn.addEventListener('click', opts.onNext);

  let par = 0;

  return {
    show() {
      root.style.display = '';
    },
    hide() {
      root.style.display = 'none';
    },
    setLevel(number, name, hint, parMoves) {
      par = parMoves;
      nameEl.textContent = `Mission ${number} — ${name}`;
      hintEl.textContent = hint ?? 'Light every crystal.';
      movesEl.textContent = `Moves: 0 · Par: ${par}`;
      winEl.classList.add('hidden');
    },
    updateMoves(moves) {
      movesEl.textContent = `Moves: ${moves} · Par: ${par}`;
    },
    showWin(stars, moves, parMoves, hasNext) {
      starsEl.innerHTML = [1, 2, 3]
        .map((i) => `<span class="star ${i <= stars ? 'earned' : ''}" style="animation-delay:${i * 0.18}s">★</span>`)
        .join('');
      detailEl.textContent =
        moves <= parMoves
          ? `Solved in ${moves} moves — perfect!`
          : `Solved in ${moves} moves (par ${parMoves}).`;
      nextBtn.style.display = hasNext ? '' : 'none';
      winEl.classList.remove('hidden');
    },
    hideWin() {
      winEl.classList.add('hidden');
    },
  };
}
