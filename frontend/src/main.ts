import './styles.css';
import { averageScore, nearestBeatDelta, normalizeRoomCode, timingScore } from './relay';

type RoomMessage = {
  type: string;
  role?: 'host' | 'companion';
  connected?: boolean;
  bpm?: number;
  duration?: number;
  at?: number;
  score?: number;
  round?: number;
};

const app = document.querySelector<HTMLDivElement>('#app')!;
const routeAnnouncement = document.createElement('div');
routeAnnouncement.className = 'sr-only';
routeAnnouncement.setAttribute('aria-live', 'polite');
document.body.append(routeAnnouncement);

let cleanupPage: (() => void) | undefined;
let objectAudioUrl: string | undefined;

const pageTitles: Record<string, string> = {
  '/': 'Haptic Beat Relay — send tactile beat cues',
  '/demo': 'Demo — Haptic Beat Relay',
  '/host': 'Host a round — Haptic Beat Relay',
  '/join': 'Join a room — Haptic Beat Relay',
  '/privacy': 'Privacy — Haptic Beat Relay',
  '/terms': 'Terms — Haptic Beat Relay',
  '/404': 'Page not found — Haptic Beat Relay',
};

function header(): string {
  return `
    <a class="skip-link" href="#main">Skip to main content</a>
    <header class="site-header">
      <a class="wordmark" href="/" data-route aria-label="Haptic Beat Relay home">
        <span class="wordmark-pulse" aria-hidden="true"></span>
        <span>Haptic Beat Relay</span>
      </a>
      <nav aria-label="Main navigation">
        <a href="/demo" data-route>Demo</a>
        <a href="/join" data-route>Join</a>
        <a href="/privacy" data-route>Privacy</a>
      </nav>
    </header>`;
}

function footer(): string {
  return `
    <footer class="site-footer">
      <p>Send tactile beat cues between two devices.</p>
      <nav aria-label="Footer navigation">
        <a href="/privacy" data-route>Privacy</a>
        <a href="/terms" data-route>Terms</a>
        <a href="https://sociobot.in" rel="external">Built by Param Factory <span class="sr-only">(external site)</span></a>
      </nav>
      <p class="build-note">Version 1.0 · Original generated environment art</p>
    </footer>`;
}

function demoBanner(): string {
  return `<aside class="demo-banner" aria-label="Demo status">
    <strong>Demo — sample data, nothing is saved</strong>
    <span class="demo-actions"><button class="text-button" id="reset-demo" type="button">Reset demo</button><a href="/host" data-route>Start for real</a></span>
  </aside>`;
}

function landingPage(): string {
  return `${header()}
    <main id="main">
      <section class="hero scene-section" aria-labelledby="hero-title">
        <div class="hero-copy">
          <p class="eyebrow">One host · one companion · one beat</p>
          <h1 id="hero-title" tabindex="-1">Send every beat to a friend</h1>
          <p class="lede">For friends and rhythm-game makers who need tactile cues and shared timing without an account.</p>
          <div class="hero-action-row">
            <a class="button primary" href="/demo" data-route>Try it with sample data</a>
            <span>A paired sample round opens now.</span>
          </div>
          <a class="button secondary" href="/host" data-route>Create a real room</a>
          <ul class="plain-facts" aria-label="Product facts">
            <li><span aria-hidden="true">01</span> Free to use</li>
            <li><span aria-hidden="true">02</span> Music stays on the host device</li>
            <li><span aria-hidden="true">03</span> The relay needs a connection</li>
          </ul>
        </div>
        <figure class="hero-art">
          <picture>
            <source type="image/webp" srcset="/art/relay-clearing-720.webp 720w, /art/relay-clearing-1280.webp 1280w" sizes="(max-width: 760px) 100vw, 58vw" />
            <img src="/art/relay-clearing-1280.webp" width="1280" height="853" alt="Two glowing signal posts relay amber beats across a misty night clearing." fetchpriority="high" decoding="async" />
          </picture>
          <figcaption>One device sends the pulse. The other taps it back.</figcaption>
        </figure>
      </section>

      <section class="preview-section" aria-labelledby="preview-title">
        <div>
          <p class="eyebrow">The shared view</p>
          <h2 id="preview-title">See the same round on both devices</h2>
          <p>The host sets the pace. The companion feels each cue and taps the beat back.</p>
        </div>
        <div class="signal-stage" aria-label="Preview of a connected room">
          <div class="stage-status"><span class="live-dot"></span> Paired with companion</div>
          <div class="beat-rail" aria-hidden="true"><i></i><i class="active"></i><i></i><i></i></div>
          <div class="preview-score"><span>Shared accuracy</span><strong>88%</strong></div>
          <div class="meter"><span class="score-88"></span></div>
        </div>
      </section>

      <section class="steps-section" aria-labelledby="steps-title">
        <p class="eyebrow">How it works</p>
        <h2 id="steps-title">Run a round in three steps</h2>
        <ol class="steps">
          <li><strong>Create a room.</strong><span>Share its six-character code with one friend.</span></li>
          <li><strong>Set the beat.</strong><span>Choose the tempo or load an audio loop from your device.</span></li>
          <li><strong>Tap it back.</strong><span>The companion feels each cue and builds a shared score.</span></li>
        </ol>
      </section>

      <section class="limits-section" aria-labelledby="limits-title">
        <div>
          <p class="eyebrow">Clear limits</p>
          <h2 id="limits-title">Your browser decides how haptics feel</h2>
        </div>
        <div class="prose">
          <p>Phone vibration and controller haptics vary by browser and device.</p>
          <p>The screen still flashes each cue when vibration is unavailable.</p>
          <p>Rooms hold only live relay messages. Closing the server clears every room.</p>
          <p>This tool does not stream music, match players, or include music files.</p>
        </div>
      </section>
    </main>${footer()}`;
}

function hostPage(): string {
  return `${header()}<main id="main" class="app-main">
    <section class="room-shell" aria-labelledby="host-title">
      <div class="room-heading">
        <p class="eyebrow">Host device</p>
        <h1 id="host-title" tabindex="-1">Host a tactile beat round</h1>
        <p>Keep this screen open. Give the room code to one friend.</p>
      </div>
      <div id="host-error" class="notice error" role="alert" hidden></div>
      <section class="code-board" aria-labelledby="code-label">
        <div><span id="code-label">Room code</span><strong id="room-code" aria-live="polite">······</strong></div>
        <button class="button secondary compact" id="copy-code" type="button" disabled>Copy room link</button>
      </section>
      <p class="connection-state" id="connection-state" aria-live="polite"><span class="status-dot"></span> Opening a private room…</p>
      <div class="host-grid">
        <section class="controls-panel" aria-labelledby="setup-title">
          <h2 id="setup-title">Set the beat</h2>
          <label for="bpm">Tempo <output id="bpm-output" for="bpm">104 BPM</output></label>
          <input id="bpm" type="range" min="60" max="180" value="104" step="1" />
          <label class="file-control" for="audio-loop">Load an audio loop <span>Optional · stays on this device</span></label>
          <input id="audio-loop" type="file" accept="audio/*" />
          <p class="file-name" id="file-name">Built-in click is ready.</p>
          <button class="button primary wide" id="start-round" type="button" disabled>Start 60-second round</button>
          <p class="control-help">The button activates when your companion joins.</p>
        </section>
        ${roundPanel('Waiting for a companion', 0, 0)}
      </div>
    </section>
  </main>${footer()}`;
}

function roundPanel(status: string, score: number, round: number): string {
  return `<section class="round-panel" aria-labelledby="round-title">
    <div class="round-top"><h2 id="round-title">Live round</h2><span id="round-count">Round ${round || '—'}</span></div>
    <div class="beat-orbit" id="beat-orbit" aria-hidden="true"><span></span><span></span><span></span><span></span><b></b></div>
    <p class="round-state" id="round-state" aria-live="polite">${status}</p>
    <div class="score-readout"><span>Shared accuracy</span><strong id="score-value">${score}%</strong></div>
    <div class="meter large" role="meter" aria-label="Shared accuracy" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${score}"><span id="score-meter" class="score-${score}"></span></div>
    <p class="tap-count" id="tap-count">No returned taps yet.</p>
  </section>`;
}

function companionPage(code = ''): string {
  const codeEntry = !code ? `<form id="join-form" class="join-form">
      <label for="join-code">Six-character room code</label>
      <input id="join-code" name="code" inputmode="text" autocomplete="off" maxlength="7" required aria-describedby="join-help join-error" />
      <p id="join-help">Ask the host for the code shown on their screen.</p>
      <p id="join-error" class="field-error" role="alert"></p>
      <button class="button primary" type="submit">Join the room</button>
    </form>` : `<section class="companion-stage" aria-labelledby="cue-title">
      <p class="connection-state" id="connection-state" aria-live="polite"><span class="status-dot"></span> Joining room ${code}…</p>
      <h2 id="cue-title">Tap when you feel the cue</h2>
      <button class="tap-pad" id="tap-pad" type="button" disabled><span>Tap the beat</span><small>Space key also works</small></button>
      <div class="score-readout"><span>Shared accuracy</span><strong id="score-value">0%</strong></div>
      <div class="meter large" role="meter" aria-label="Shared accuracy" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span id="score-meter" class="score-0"></span></div>
      <p class="round-state" id="round-state" aria-live="polite">Waiting for the host to start.</p>
    </section>`;

  return `${header()}<main id="main" class="app-main">
    <section class="join-shell" aria-labelledby="join-title">
      <p class="eyebrow">Companion device</p>
      <h1 id="join-title" tabindex="-1">Join a friend’s beat room</h1>
      <p>Enter the host’s code. Keep this screen open for vibration cues.</p>
      ${codeEntry}
    </section>
  </main>${footer()}`;
}

function demoPage(): string {
  return `${demoBanner()}${header()}<main id="main" class="app-main demo-main">
    <section class="room-shell" aria-labelledby="demo-title">
      <div class="room-heading">
        <p class="eyebrow">Sample host · paired with Sam</p>
        <h1 id="demo-title" tabindex="-1">Try a tactile beat round</h1>
        <p>This sample uses a 104 BPM practice loop and realistic returned taps.</p>
      </div>
      <section class="code-board sample-code" aria-label="Sample room">
        <div><span>Sample room</span><strong>DEMO24</strong></div><span class="sample-label">Sam is ready</span>
      </section>
      <div class="host-grid">
        <section class="controls-panel" aria-labelledby="sample-title">
          <h2 id="sample-title">Sample setup</h2>
          <dl class="sample-list"><div><dt>Tempo</dt><dd>104 BPM</dd></div><div><dt>Loop</dt><dd>Night practice click</dd></div><div><dt>Past rounds</dt><dd>82% · 89%</dd></div></dl>
          <button class="button primary wide" id="demo-start" type="button">Start sample round</button>
          <p class="control-help">The sample round lasts 12 seconds.</p>
        </section>
        ${roundPanel('Sam is ready. Start when you are.', 86, 3)}
      </div>
    </section>
  </main>${footer()}`;
}

function legalPage(kind: 'privacy' | 'terms'): string {
  const privacy = kind === 'privacy';
  return `${header()}<main id="main" class="legal-main"><article>
    <p class="eyebrow">${privacy ? 'Privacy' : 'Terms'}</p>
    <h1 tabindex="-1">${privacy ? 'Your room leaves no account behind' : 'Use the relay with care'}</h1>
    ${privacy ? `<h2>What the relay handles</h2>
      <p>The server holds a room code, two random access tokens, and live timing messages.</p>
      <p>Room state stays in server memory for up to two hours. A server restart clears it sooner.</p>
      <p>Your audio loop stays inside the host browser. The relay never receives the file.</p>
      <h2>What we do not collect</h2>
      <p>There are no accounts, advertising trackers, or analytics scripts.</p>
      <p>The server writes routine operational logs. These logs may include an IP address and request path.</p>
      <h2>Questions</h2><p>Email <a href="mailto:privacy@sociobot.in">privacy@sociobot.in</a>.</p>` : `<h2>The service</h2>
      <p>Haptic Beat Relay is free software for small music and game sessions.</p>
      <p>Browser and device support can change how vibration and controller cues work.</p>
      <h2>Your use</h2>
      <p>Use only audio that you have permission to play. Do not use the relay for unlawful activity.</p>
      <p>Do not rely on vibration cues for safety, health, or emergency alerts.</p>
      <h2>Availability</h2>
      <p>The service is provided without a promise of uninterrupted availability.</p>
      <p>These terms use the MIT license for the source code. They were last updated on 28 August 2026.</p>`}
  </article></main>${footer()}`;
}

function notFoundPage(): string {
  return `${header()}<main id="main" class="lost-main">
    <section><p class="eyebrow">Signal lost · 404</p><h1 tabindex="-1">This beat has no room</h1><p>The address does not lead to an open page.</p><a class="button primary" href="/" data-route>Return to the start</a></section>
    <div class="lost-signal" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
  </main>${footer()}`;
}

function navigate(path: string, push = true, focusHeading = true): void {
  cleanupPage?.();
  cleanupPage = undefined;
  if (push && location.pathname !== path) {
    history.replaceState({ ...history.state, scrollY: window.scrollY }, '', location.href);
    history.pushState({ scrollY: 0 }, '', path);
  }
  const joinMatch = path.match(/^\/join\/([A-Za-z0-9]{6})$/);
  let knownPath = pageTitles[path] ? path : joinMatch ? '/join' : '/404';
  document.title = pageTitles[knownPath];
  document.querySelector<HTMLLinkElement>('link[rel="canonical"]')!.href = `https://haptic-beat-relay.sociobot.in${knownPath}`;

  if (path === '/') app.innerHTML = landingPage();
  else if (path === '/host') app.innerHTML = hostPage();
  else if (path === '/demo') app.innerHTML = demoPage();
  else if (path === '/privacy') app.innerHTML = legalPage('privacy');
  else if (path === '/terms') app.innerHTML = legalPage('terms');
  else if (path === '/join') app.innerHTML = companionPage();
  else if (joinMatch) app.innerHTML = companionPage(normalizeRoomCode(joinMatch[1]));
  else app.innerHTML = notFoundPage();

  bindGlobalActions();
  if (path === '/host') void setupHost();
  if (path === '/join') setupJoinForm();
  if (joinMatch) void setupCompanion(normalizeRoomCode(joinMatch[1]));
  if (path === '/demo') setupDemo();

  window.scrollTo(0, push ? 0 : Number(history.state?.scrollY ?? 0));
  const heading = app.querySelector<HTMLElement>('h1');
  if (focusHeading) {
    heading?.focus({ preventScroll: true });
    routeAnnouncement.textContent = heading?.textContent ?? '';
  }
}

function bindGlobalActions(): void {
  document.querySelectorAll<HTMLAnchorElement>('a[data-route]').forEach((link) => {
    link.addEventListener('click', (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      navigate(new URL(link.href).pathname);
    });
  });
  document.querySelector('#reset-demo')?.addEventListener('click', () => navigate('/demo', false));
}

function setupJoinForm(): void {
  const form = document.querySelector<HTMLFormElement>('#join-form')!;
  const input = document.querySelector<HTMLInputElement>('#join-code')!;
  const error = document.querySelector<HTMLElement>('#join-error')!;
  input.addEventListener('input', () => {
    input.value = normalizeRoomCode(input.value);
    error.textContent = '';
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const code = normalizeRoomCode(input.value);
    if (code.length !== 6) {
      error.textContent = 'The code needs six letters and numbers. Check it and try again.';
      input.focus();
      return;
    }
    navigate(`/join/${code}`);
  });
}

async function setupHost(): Promise<void> {
  const state = document.querySelector<HTMLElement>('#connection-state')!;
  const error = document.querySelector<HTMLElement>('#host-error')!;
  const start = document.querySelector<HTMLButtonElement>('#start-round')!;
  const copy = document.querySelector<HTMLButtonElement>('#copy-code')!;
  const bpmInput = document.querySelector<HTMLInputElement>('#bpm')!;
  const bpmOutput = document.querySelector<HTMLOutputElement>('#bpm-output')!;
  const fileInput = document.querySelector<HTMLInputElement>('#audio-loop')!;
  const fileName = document.querySelector<HTMLElement>('#file-name')!;
  let socket: WebSocket | undefined;
  let paired = false;
  let timer: number | undefined;
  let finishTimer: number | undefined;
  let audio: HTMLAudioElement | undefined;
  let audioContext: AudioContext | undefined;
  let roomCode = '';
  let round = 0;
  let beats: number[] = [];
  let scores: number[] = [];

  cleanupPage = () => {
    socket?.close();
    if (timer) clearInterval(timer);
    if (finishTimer) clearTimeout(finishTimer);
    audio?.pause();
    audioContext?.close();
    if (objectAudioUrl) URL.revokeObjectURL(objectAudioUrl);
  };

  bpmInput.addEventListener('input', () => { bpmOutput.value = `${bpmInput.value} BPM`; });
  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('audio/')) {
      fileInput.value = '';
      fileName.textContent = 'Choose an audio file. This file was not loaded.';
      return;
    }
    if (objectAudioUrl) URL.revokeObjectURL(objectAudioUrl);
    objectAudioUrl = URL.createObjectURL(file);
    audio = new Audio(objectAudioUrl);
    audio.loop = true;
    fileName.textContent = `${file.name} is ready and stays on this device.`;
  });

  try {
    const response = await fetch('/api/rooms', { method: 'POST' });
    if (!response.ok) throw new Error('The room server did not open a room. Reload this page to try again.');
    const room = await response.json() as { code: string; host_token: string };
    roomCode = room.code;
    document.querySelector('#room-code')!.textContent = room.code;
    copy.disabled = false;
    socket = openRoomSocket(room.code, 'host', room.host_token, (message) => {
      if (message.type === 'presence' && message.role === 'companion') {
        paired = Boolean(message.connected);
        state.innerHTML = `<span class="status-dot ${paired ? 'connected' : ''}"></span>${paired ? 'Companion connected. The round is ready.' : 'Companion left. Share the code to reconnect.'}`;
        start.disabled = !paired;
      }
      if (message.type === 'tap' && typeof message.at === 'number' && beats.length) {
        const delta = nearestBeatDelta(Date.now(), beats);
        if (delta === null) return;
        scores.push(timingScore(delta, 60000 / Number(bpmInput.value)));
        updateScore(averageScore(scores), scores.length);
        socket?.send(JSON.stringify({ type: 'score', score: averageScore(scores), round }));
        pulseReturn();
      }
    }, (message) => {
      state.innerHTML = `<span class="status-dot"></span>${message}`;
      start.disabled = true;
    });
    state.innerHTML = '<span class="status-dot"></span>Room open. Waiting for one companion…';

    copy.addEventListener('click', async () => {
      const link = `${location.origin}/join/${roomCode}`;
      try {
        await navigator.clipboard.writeText(link);
        copy.textContent = 'Room link copied';
      } catch {
        copy.textContent = 'Copy blocked — share the code';
      }
    });

    start.addEventListener('click', () => {
      if (!paired || !socket || socket.readyState !== WebSocket.OPEN) return;
      round += 1;
      scores = [];
      beats = [];
      updateScore(0, 0);
      start.disabled = true;
      start.textContent = 'Round in progress';
      const bpm = Number(bpmInput.value);
      const duration = 60;
      socket.send(JSON.stringify({ type: 'round_start', bpm, duration, round }));
      document.querySelector('#round-count')!.textContent = `Round ${round}`;
      document.querySelector('#round-state')!.textContent = 'Listen for the beat. Your companion is tapping it back.';
      audioContext ??= new AudioContext();
      void audioContext.resume();
      void audio?.play().catch(() => { fileName.textContent = 'The audio loop could not play. The built-in click is running.'; });
      fireHostBeat(audioContext, socket, round, beats);
      timer = window.setInterval(() => fireHostBeat(audioContext!, socket!, round, beats), 60000 / bpm);
      finishTimer = window.setTimeout(() => finishRound(), duration * 1000);
    });
  } catch (cause) {
    error.hidden = false;
    error.textContent = cause instanceof Error && cause.message !== 'Failed to fetch'
      ? cause.message
      : 'The room server could not be reached. Check your connection and reload this page.';
    state.innerHTML = '<span class="status-dot"></span>Room unavailable';
  }

  function finishRound(): void {
    if (timer) clearInterval(timer);
    timer = undefined;
    audio?.pause();
    socket?.send(JSON.stringify({ type: 'round_end', score: averageScore(scores), round }));
    document.querySelector('#round-state')!.textContent = scores.length ? `Round complete with ${averageScore(scores)}% accuracy.` : 'Round complete. No companion taps arrived.';
    start.disabled = !paired;
    start.textContent = 'Start another 60-second round';
  }
}

function openRoomSocket(code: string, role: 'host' | 'companion', token: string, onMessage: (message: RoomMessage) => void, onClose: (message: string) => void): WebSocket {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const socket = new WebSocket(`${protocol}//${location.host}/api/rooms/${code}/socket?role=${role}&token=${encodeURIComponent(token)}`);
  socket.addEventListener('message', (event) => {
    try { onMessage(JSON.parse(String(event.data)) as RoomMessage); } catch { /* Ignore malformed room messages. */ }
  });
  socket.addEventListener('close', () => onClose('The relay connection closed. Reload to make a new room.'));
  socket.addEventListener('error', () => onClose('The relay connection failed. Check your connection and reload.'));
  return socket;
}

function fireHostBeat(context: AudioContext, socket: WebSocket, round: number, beats: number[]): void {
  const at = Date.now();
  beats.push(at);
  if (beats.length > 8) beats.shift();
  socket.send(JSON.stringify({ type: 'beat', at, round }));
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.frequency.value = 880;
  gain.gain.setValueAtTime(0.16, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.055);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.06);
  pulseBeat();
}

async function setupCompanion(code: string): Promise<void> {
  const state = document.querySelector<HTMLElement>('#connection-state')!;
  const pad = document.querySelector<HTMLButtonElement>('#tap-pad')!;
  const roundState = document.querySelector<HTMLElement>('#round-state')!;
  let socket: WebSocket | undefined;
  let roundActive = false;

  cleanupPage = () => socket?.close();
  try {
    const response = await fetch(`/api/rooms/${code}/join`, { method: 'POST' });
    const body = await response.json() as { companion_token?: string; message?: string };
    if (!response.ok || !body.companion_token) throw new Error(body.message ?? 'The room did not accept this device. Check the code and try again.');
    socket = openRoomSocket(code, 'companion', body.companion_token, (message) => {
      if (message.type === 'presence' && message.role === 'host') {
        state.innerHTML = `<span class="status-dot ${message.connected ? 'connected' : ''}"></span>${message.connected ? `Connected to room ${code}` : 'The host left this room.'}`;
      }
      if (message.type === 'round_start') {
        roundActive = true;
        pad.disabled = false;
        roundState.textContent = `Round ${message.round} is live at ${message.bpm} BPM.`;
      }
      if (message.type === 'beat') cueCompanion();
      if (message.type === 'score' && typeof message.score === 'number') updateScore(message.score, undefined);
      if (message.type === 'round_end') {
        roundActive = false;
        pad.disabled = true;
        roundState.textContent = `Round complete with ${message.score ?? 0}% accuracy.`;
      }
    }, (message) => {
      state.innerHTML = `<span class="status-dot"></span>${message}`;
      pad.disabled = true;
    });
    socket.addEventListener('open', () => {
      state.innerHTML = `<span class="status-dot connected"></span>Connected to room ${code}`;
    });
  } catch (cause) {
    const message = cause instanceof Error && cause.message !== 'Failed to fetch'
      ? cause.message
      : 'The room server could not be reached. Check your connection and try again.';
    state.innerHTML = `<span class="status-dot"></span>${message} <a href="/join" data-route>Enter another code</a>`;
    bindGlobalActions();
  }

  const tap = () => {
    if (!roundActive || socket?.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify({ type: 'tap', at: Date.now() }));
    pad.classList.remove('tapped');
    requestAnimationFrame(() => pad.classList.add('tapped'));
  };
  pad.addEventListener('click', tap);
  const keyHandler = (event: KeyboardEvent) => {
    if (event.code === 'Space' && document.activeElement === document.body) {
      event.preventDefault();
      tap();
    }
  };
  window.addEventListener('keydown', keyHandler);
  const previousCleanup = cleanupPage;
  cleanupPage = () => { previousCleanup?.(); window.removeEventListener('keydown', keyHandler); };
}

function cueCompanion(): void {
  if (typeof navigator.vibrate === 'function') navigator.vibrate(45);
  const pad = document.querySelector('#tap-pad');
  pad?.classList.remove('cue');
  requestAnimationFrame(() => pad?.classList.add('cue'));
  navigator.getGamepads?.().forEach((gamepad) => {
    const actuator = gamepad?.vibrationActuator as GamepadHapticActuator | undefined;
    void actuator?.playEffect?.('dual-rumble', { duration: 60, strongMagnitude: 0.7, weakMagnitude: 0.4 });
  });
}

function updateScore(score: number, tapCount?: number): void {
  const value = document.querySelector<HTMLElement>('#score-value');
  const meter = document.querySelector<HTMLElement>('.meter[role="meter"]');
  const fill = document.querySelector<HTMLElement>('#score-meter');
  if (value) value.textContent = `${score}%`;
  if (value && tapCount !== undefined) value.dataset.taps = String(tapCount);
  if (meter) meter.setAttribute('aria-valuenow', String(score));
  fill?.style.setProperty('--score', `${score}%`);
  const count = document.querySelector<HTMLElement>('#tap-count');
  if (count && tapCount !== undefined) count.textContent = tapCount === 0 ? 'No returned taps yet.' : `${tapCount} returned ${tapCount === 1 ? 'tap' : 'taps'}.`;
}

function pulseBeat(): void {
  const orbit = document.querySelector('#beat-orbit');
  orbit?.classList.remove('beat');
  requestAnimationFrame(() => orbit?.classList.add('beat'));
}

function pulseReturn(): void {
  const orbit = document.querySelector('#beat-orbit');
  orbit?.classList.remove('returned');
  requestAnimationFrame(() => orbit?.classList.add('returned'));
}

function setupDemo(): void {
  const start = document.querySelector<HTMLButtonElement>('#demo-start')!;
  let timer: number | undefined;
  let finish: number | undefined;
  let beat = 0;
  const scores = [92, 84, 97, 76, 89, 94, 81, 99, 87, 91, 83, 96, 78, 90, 95, 86, 93, 82, 98, 88];
  cleanupPage = () => { if (timer) clearInterval(timer); if (finish) clearTimeout(finish); };
  start.addEventListener('click', () => {
    start.disabled = true;
    start.textContent = 'Sample round in progress';
    document.querySelector('#round-state')!.textContent = 'Listen for the pulse. Sam is tapping it back.';
    updateScore(0, 0);
    beat = 0;
    const tick = () => {
      pulseBeat();
      window.setTimeout(() => pulseReturn(), 180);
      beat += 1;
      updateScore(averageScore(scores.slice(0, beat)), beat);
    };
    tick();
    timer = window.setInterval(tick, 60000 / 104);
    finish = window.setTimeout(() => {
      if (timer) clearInterval(timer);
      timer = undefined;
      document.querySelector('#round-state')!.textContent = `Sample round complete with ${averageScore(scores)}% accuracy.`;
      start.disabled = false;
      start.textContent = 'Run the sample again';
    }, 12000);
  });
}

history.scrollRestoration = 'manual';
window.addEventListener('popstate', () => navigate(location.pathname, false));
navigate(location.pathname, false, false);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => undefined));
}
