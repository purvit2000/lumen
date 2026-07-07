import { sfx } from '../audio/sfx';

const KEY = 'lumen.audio.v1';

interface AudioPrefs {
  on: boolean;
  volume: number;
}

function loadPrefs(): AudioPrefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<AudioPrefs>;
      return {
        on: typeof p.on === 'boolean' ? p.on : true,
        volume: typeof p.volume === 'number' ? Math.min(1, Math.max(0, p.volume)) : 0.6,
      };
    }
  } catch {
    // fall through to defaults
  }
  return { on: true, volume: 0.6 };
}

function savePrefs(prefs: AudioPrefs): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    // Storage unavailable — the setting just won't persist.
  }
}

/**
 * Global music control: a ♪ toggle and a volume slider pinned to the
 * bottom-right corner, floating above both the mission roadmap and the
 * in-game HUD. Preferences persist in localStorage, and the soundtrack
 * auto-starts on the first user gesture only if it was left on.
 */
export function createAudioControl(): void {
  const prefs = loadPrefs();
  sfx.setAmbienceVolume(prefs.volume);

  const el = document.createElement('div');
  el.id = 'audio-control';
  el.innerHTML = `
    <button id="audio-toggle" class="btn" title="Toggle music">♪</button>
    <input id="audio-volume" type="range" min="0" max="100" step="1"
      value="${Math.round(prefs.volume * 100)}" title="Music volume" aria-label="Music volume" />
  `;
  document.body.appendChild(el);

  const toggleBtn = el.querySelector<HTMLButtonElement>('#audio-toggle')!;
  const slider = el.querySelector<HTMLInputElement>('#audio-volume')!;
  const reflect = () => toggleBtn.classList.toggle('muted', !prefs.on);
  reflect();

  toggleBtn.addEventListener('click', () => {
    prefs.on = sfx.toggleAmbience();
    savePrefs(prefs);
    reflect();
  });

  slider.addEventListener('input', () => {
    prefs.volume = Number(slider.value) / 100;
    sfx.setAmbienceVolume(prefs.volume);
    // Raising the volume while muted is a clear "I want sound" signal.
    if (!prefs.on && prefs.volume > 0) {
      sfx.startAmbience();
      prefs.on = sfx.ambienceOn;
      reflect();
    }
    savePrefs(prefs);
  });

  // WebAudio may only start inside a user gesture; honor the saved choice.
  const autoStart = () => {
    window.removeEventListener('pointerdown', autoStart);
    if (prefs.on) {
      sfx.startAmbience();
      reflect();
    }
  };
  window.addEventListener('pointerdown', autoStart);
}
