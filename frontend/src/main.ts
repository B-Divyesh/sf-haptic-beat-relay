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
  tap_id?: number;
  beat_id?: number;
  cue_delay?: number;
  tap_count?: number;
  active?: boolean;
  score_acknowledged?: boolean;
};

type RelayConnectionState = 'connecting' | 'open' | 'reconnecting';

type RelaySocket = {
  close: () => void;
  isOpen: () => boolean;
  send: (message: string) => boolean;
};

type ScoreUpdate = {
  score: number;
  round: number;
  tap_count: number;
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

const pageDescriptions: Record<string, string> = {
  '/': 'Send a beat loop to one phone for vibration cues, returned taps, and a shared timing score.',
  '/demo': 'Try a paired sample beat round with returned taps and a shared score.',
  '/host': 'Open a room, set the tempo, and send beat cues to one friend.',
  '/join': 'Join a friend’s room to receive beat cues and tap them back.',
  '/privacy': 'Read how temporary Haptic Beat Relay rooms handle data.',
  '/terms': 'Read the terms for using Haptic Beat Relay.',
  '/404': 'The requested Haptic Beat Relay page was not found.',
};

function setMeta(name: string, content: string, property = false): void {
  const selector = property ? `meta[property="${name}"]` : `meta[name="${name}"]`;
  document.querySelector<HTMLMetaElement>(selector)?.setAttribute('content', content);
}

function header(): string {
  return `
    <header class="site-header">
      <a class="skip-link" href="#main">Skip to main content</a>
      <a class="wordmark" href="/" data-route aria-label="Haptic Beat Relay home">
        <span class="wordmark-pulse" aria-hidden="true"></span>
        <span>Haptic Beat Relay</span>
      </a>
      <nav aria-label="Main navigation">
        <a href="/?demo=1" data-route>Demo</a>
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
    <span class="demo-actions"><button class="text-button" id="reset-demo" type="button">Reset demo</button><a href="/host" data-route>Create a real room</a></span>
  </aside>`;
}

function landingPage(): string {
  return `${header()}
    <main id="main">
      <section class="hero scene-section" aria-labelledby="hero-title">
        <div class="hero-copy">
          <p class="eyebrow">One host · one friend · one beat</p>
          <h1 id="hero-title" tabindex="-1">Send every beat to a friend</h1>
          <p class="lede">For friends and rhythm-game makers who need tactile cues and shared timing without an account.</p>
          <div class="hero-action-row">
            <a class="button primary" href="/?demo=1" data-route>Try it with sample data</a>
            <span>A paired sample round opens now.</span>
          </div>
          <a class="button secondary" href="/host" data-route>Create a real room</a>
          <ul class="plain-facts" aria-label="Product facts">
            <li><span aria-hidden="true">01</span> Free to use</li>
            <li><span aria-hidden="true">02</span> Audio loops stay on the host device</li>
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
          <p>The host sets the pace. Your friend feels each cue and taps the beat back.</p>
        </div>
        <div class="signal-stage" aria-label="Preview of a connected room">
          <div class="stage-status"><span class="live-dot"></span> Paired with your friend</div>
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
          <li><strong>Tap it back.</strong><span>Your friend feels each cue and builds a shared score.</span></li>
        </ol>
      </section>

      <section class="limits-section" aria-labelledby="limits-title">
        <div>
          <p class="eyebrow">Clear limits</p>
          <h2 id="limits-title">Vibration varies by browser and device</h2>
        </div>
        <div class="prose">
          <p>Phone vibration and controller vibration vary by browser and device.</p>
          <p>The screen still flashes each cue when vibration is unavailable.</p>
          <p>Rooms hold only live relay messages. Room records expire automatically after two hours.</p>
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
          <p class="control-help">The button activates when your friend joins.</p>
        </section>
        ${roundPanel('Waiting for a friend', 0, 0)}
      </div>
    </section>
  </main>${footer()}`;
}

function roundPanel(status: string, score: number, round: number, tapText = 'No returned taps yet.'): string {
  return `<section class="round-panel" aria-labelledby="round-title">
    <div class="round-top"><h2 id="round-title">Live round</h2><span id="round-count">Round ${round || '—'}</span></div>
    <div class="beat-orbit" id="beat-orbit" aria-hidden="true"><span></span><span></span><span></span><span></span><b></b></div>
    <p class="round-state" id="round-state" aria-live="polite">${status}</p>
    <div class="score-readout"><span>Shared accuracy</span><strong id="score-value">${score}%</strong></div>
    <div class="meter large" role="meter" aria-label="Shared accuracy" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${score}"><span id="score-meter" class="score-${score}"></span></div>
    <p class="tap-count" id="tap-count">${tapText}</p>
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
      <p class="eyebrow">Friend device</p>
      <h1 id="join-title" tabindex="-1">Join a friend’s beat room</h1>
      <p>Enter the host’s code. Keep this screen open for vibration cues.</p>
      ${codeEntry}
    </section>
  </main>${footer()}`;
}

function demoPage(): string {
  return `${demoBanner()}${header()}<main id="main" class="app-main demo-main">
    <section class="room-shell" aria-labelledby="demo-title">
      <div class="room-heading demo-heading">
        <p class="eyebrow">Sample host · paired with Sam</p>
        <h1 id="demo-title" tabindex="-1">Try a tactile beat round</h1>
        <p>This sample uses a 104 BPM practice loop and realistic returned taps.</p>
      </div>
      <section class="demo-live" aria-labelledby="sample-round-title">
        <div class="demo-live-top"><div><p class="eyebrow">Paired sample</p><h2 id="sample-round-title">Sam taps each cue back</h2></div><button class="button primary" id="demo-start" type="button">Start sample round</button></div>
        ${roundPanel('Sam returned 3 taps in the last round.', 86, 3, '3 returned taps.')}
      </section>
      <div class="host-grid demo-details">
        <section class="controls-panel" aria-labelledby="sample-title">
          <h2 id="sample-title">Sample setup</h2>
          <dl class="sample-list"><div><dt>Tempo</dt><dd>104 BPM</dd></div><div><dt>Loop</dt><dd>Night practice click</dd></div><div><dt>Past rounds</dt><dd>82% · 89%</dd></div></dl>
          <p class="control-help">The sample round lasts 12 seconds.</p>
        </section>
        <section class="code-board sample-code" aria-label="Sample room">
          <div><span>Sample room</span><strong>DEMO24</strong></div><span class="sample-label">Sam is ready</span>
        </section>
      </div>
    </section>
  </main>${footer()}`;
}

function legalPage(kind: 'privacy' | 'terms'): string {
  const privacy = kind === 'privacy';
  return `${header()}<main id="main" class="legal-main"><article>
    <p class="eyebrow">${privacy ? 'Privacy' : 'Terms'}</p>
    <h1 tabindex="-1">${privacy ? 'How temporary rooms handle your data' : 'Terms for using Haptic Beat Relay'}</h1>
    ${privacy ? `<h2>What the relay handles</h2>
      <p>The server holds a room code, two random access tokens, and live timing messages.</p>
      <p>SQLite stores room records for up to two hours. Active rooms survive a server restart.</p>
      <p>The server keeps a client network address briefly to enforce request limits.</p>
      <p>Your audio loop stays inside the host browser. The relay never receives the file.</p>
      <h2>What we do not collect</h2>
      <p>There are no accounts, advertising trackers, or analytics scripts.</p>
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
    <section><p class="eyebrow">Signal lost · 404</p><h1 tabindex="-1">Page not found</h1><p>The address does not lead to an open page.</p><a class="button primary" href="/" data-route>Return to the start</a></section>
    <div class="lost-signal" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
  </main>${footer()}`;
}

function isDemoPath(path: string, search = ''): boolean {
  return path === '/demo' || new URLSearchParams(search).get('demo') === '1';
}

function navigate(target: string, push = true, focusHeading = true): void {
  const destination = new URL(target, location.origin);
  const path = destination.pathname;
  const search = destination.search;
  const demo = isDemoPath(path, search);
  cleanupPage?.();
  cleanupPage = undefined;
  if (push && `${location.pathname}${location.search}` !== `${path}${search}`) {
    history.replaceState({ ...history.state, scrollY: window.scrollY }, '', location.href);
    history.pushState({ scrollY: 0 }, '', `${path}${search}`);
  }
  const joinMatch = path.match(/^\/join\/([A-Za-z0-9]{6})$/);
  const knownPath = demo ? '/demo' : pageTitles[path] ? path : joinMatch ? '/join' : '/404';
  document.title = pageTitles[knownPath];
  const description = pageDescriptions[knownPath];
  setMeta('description', description);
  setMeta('og:title', document.title, true);
  setMeta('og:description', description, true);
  setMeta('twitter:title', document.title);
  setMeta('twitter:description', description);
  document.querySelector<HTMLLinkElement>('link[rel="canonical"]')!.href = `https://haptic-beat-relay.sociobot.in${knownPath}`;

  if (demo) app.innerHTML = demoPage();
  else if (path === '/') app.innerHTML = landingPage();
  else if (path === '/host') app.innerHTML = hostPage();
  else if (path === '/privacy') app.innerHTML = legalPage('privacy');
  else if (path === '/terms') app.innerHTML = legalPage('terms');
  else if (path === '/join') app.innerHTML = companionPage();
  else if (joinMatch) app.innerHTML = companionPage(normalizeRoomCode(joinMatch[1]));
  else app.innerHTML = notFoundPage();

  bindGlobalActions();
  if (path === '/host') void setupHost();
  if (path === '/join') setupJoinForm();
  if (joinMatch) void setupCompanion(normalizeRoomCode(joinMatch[1]));
  if (demo) setupDemo();

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
      const route = new URL(link.href);
      navigate(`${route.pathname}${route.search}`);
    });
  });
  document.querySelector('#reset-demo')?.addEventListener('click', () => navigate('/?demo=1', false));
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
  let socket: RelaySocket | undefined;
  let paired = false;
  let roundActive = false;
  let timer: number | undefined;
  let finishTimer: number | undefined;
  let audio: HTMLAudioElement | undefined;
  let audioContext: AudioContext | undefined;
  let roomCode = '';
  let round = 0;
  let beats: number[] = [];
  let scores: number[] = [];
  let pendingScore: ScoreUpdate | undefined;
  const seenTapIds = new Set<number>();
  let beatId = 0;

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
        state.innerHTML = `<span class="status-dot ${paired ? 'connected' : ''}"></span>${paired ? 'Your friend is connected. The round is ready.' : 'Your friend left. Share the code to reconnect.'}`;
        start.disabled = !paired || roundActive;
      }
      if (
        message.type === 'tap'
        && typeof message.at === 'number'
        && typeof message.tap_id === 'number'
        && message.round === round
        && roundActive
        && beats.length
        && !seenTapIds.has(message.tap_id)
      ) {
        seenTapIds.add(message.tap_id);
        const beatMs = 60000 / Number(bpmInput.value);
        // A browser can deliver this WebSocket frame long after the friend
        // pressed. Score the companion's cue-to-tap interval when supplied;
        // the host-arrival fallback keeps an older client usable.
        const delta = typeof message.cue_delay === 'number' && message.cue_delay >= 0
          ? message.cue_delay
          : nearestBeatDelta(Date.now(), beats);
        if (delta === null) return;
        scores.push(timingScore(delta, beatMs));
        pendingScore = { score: averageScore(scores), round, tap_count: scores.length };
        socket?.send(JSON.stringify({ type: 'score', ...pendingScore }));
        pulseReturn();
      }
      if (
        message.type === 'score'
        && pendingScore
        && message.score === pendingScore.score
        && message.round === pendingScore.round
        && message.tap_count === pendingScore.tap_count
      ) {
        // The relay only broadcasts a score after SQLite commits it. This is
        // the host's durable acknowledgement; a companion ACK then confirms
        // that the peer has applied the same persisted score.
        updateScore(pendingScore.score, pendingScore.tap_count);
      }
      if (
        message.type === 'score_ack'
        && pendingScore
        && message.score === pendingScore.score
        && message.round === pendingScore.round
        && message.tap_count === pendingScore.tap_count
      ) {
        updateScore(pendingScore.score, pendingScore.tap_count);
      }
      if (
        message.type === 'relay_state'
        && typeof message.round === 'number'
        && typeof message.score === 'number'
        && typeof message.tap_count === 'number'
        && message.round >= round
      ) {
        round = message.round;
        pendingScore = { score: message.score, round: message.round, tap_count: message.tap_count };
        updateScore(message.score, message.tap_count);
      }
    }, (connectionState) => {
      if (connectionState === 'reconnecting') {
        paired = false;
        state.innerHTML = '<span class="status-dot"></span>Relay interrupted. Reconnecting…';
        start.disabled = true;
      } else if (connectionState === 'open') {
        state.innerHTML = '<span class="status-dot"></span>Room connected. Checking for your friend…';
      }
    });
    state.innerHTML = '<span class="status-dot"></span>Room open. Waiting for one friend…';

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
      if (!paired || !socket?.isOpen()) return;
      round += 1;
      roundActive = true;
      scores = [];
      beats = [];
      beatId = 0;
      pendingScore = undefined;
      seenTapIds.clear();
      updateScore(0, 0);
      start.disabled = true;
      start.textContent = 'Round in progress';
      const bpm = Number(bpmInput.value);
      const duration = 60;
      socket.send(JSON.stringify({ type: 'round_start', bpm, duration, round }));
      document.querySelector('#round-count')!.textContent = `Round ${round}`;
      document.querySelector('#round-state')!.textContent = 'Listen for the beat. Your friend is tapping it back.';
      audioContext ??= new AudioContext();
      void audioContext.resume();
      void audio?.play().catch(() => { fileName.textContent = 'The audio loop could not play. The built-in click is running.'; });
      fireHostBeat(audioContext, socket, round, beats, ++beatId);
      timer = window.setInterval(() => fireHostBeat(audioContext!, socket!, round, beats, ++beatId), 60000 / bpm);
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
    roundActive = false;
    document.querySelector('#round-state')!.textContent = scores.length ? `Round complete with ${averageScore(scores)}% accuracy.` : 'Round complete. No friend taps arrived.';
    start.disabled = !paired;
    start.textContent = 'Start another 60-second round';
  }
}

function openRoomSocket(
  code: string,
  role: 'host' | 'companion',
  token: string,
  onMessage: (message: RoomMessage) => void,
  onConnectionState: (state: RelayConnectionState) => void,
): RelaySocket {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const url = `${protocol}//${location.host}/api/rooms/${code}/socket?role=${role}&token=${encodeURIComponent(token)}`;
  let socket: WebSocket | undefined;
  let reconnectTimer: number | undefined;
  let stopped = false;
  let attempts = 0;

  const connect = () => {
    if (stopped) return;
    onConnectionState(attempts === 0 ? 'connecting' : 'reconnecting');
    const candidate = new WebSocket(url);
    socket = candidate;
    candidate.addEventListener('open', () => {
      if (candidate !== socket || stopped) return;
      attempts = 0;
      onConnectionState('open');
    });
    candidate.addEventListener('message', (event) => {
      if (candidate !== socket || stopped) return;
      try { onMessage(JSON.parse(String(event.data)) as RoomMessage); } catch { /* Ignore malformed room messages. */ }
    });
    candidate.addEventListener('close', () => {
      if (candidate !== socket || stopped) return;
      socket = undefined;
      attempts += 1;
      onConnectionState('reconnecting');
      reconnectTimer = window.setTimeout(connect, Math.min(1_500, 200 * attempts));
    });
    candidate.addEventListener('error', () => candidate.close());
  };

  connect();
  return {
    close: () => {
      stopped = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      socket?.close();
      socket = undefined;
    },
    isOpen: () => socket?.readyState === WebSocket.OPEN,
    send: (message) => {
      if (socket?.readyState !== WebSocket.OPEN) return false;
      socket.send(message);
      return true;
    },
  };
}

function fireHostBeat(
  context: AudioContext,
  socket: RelaySocket,
  round: number,
  beats: number[],
  beatId: number,
): void {
  const at = Date.now();
  beats.push(at);
  if (beats.length > 8) beats.shift();
  socket.send(JSON.stringify({ type: 'beat', at, round, beat_id: beatId }));
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
  let socket: RelaySocket | undefined;
  let roundActive = false;
  let round = 0;
  let tapId = 0;
  let lastCueAt: number | undefined;
  let lastBeatId: number | undefined;

  const acknowledgeScore = (message: RoomMessage) => {
    if (
      typeof message.score !== 'number'
      || typeof message.round !== 'number'
      || typeof message.tap_count !== 'number'
    ) return;
    socket?.send(JSON.stringify({
      type: 'score_ack',
      score: message.score,
      round: message.round,
      tap_count: message.tap_count,
    }));
  };

  const applyScore = (message: RoomMessage) => {
    if (
      typeof message.score !== 'number'
      || typeof message.tap_count !== 'number'
      || message.round !== round
    ) return;
    updateScore(message.score, undefined);
    acknowledgeScore(message);
  };

  cleanupPage = () => socket?.close();
  try {
    let response: Response | undefined;
    let body: { companion_token?: string; message?: string } = {};
    for (let attempt = 0; attempt < 12; attempt += 1) {
      response = await fetch(`/api/rooms/${code}/join`, { method: 'POST' });
      body = await response.json() as { companion_token?: string; message?: string };
      if (response.status !== 409 || body.companion_token) break;
      await new Promise((resolve) => window.setTimeout(resolve, 250));
    }
    if (!response) throw new Error('The room did not answer. Check the code and try again.');
    if (!response.ok || !body.companion_token) throw new Error(body.message ?? 'The room did not accept this device. Check the code and try again.');
    socket = openRoomSocket(code, 'companion', body.companion_token, (message) => {
      if (message.type === 'presence' && message.role === 'host') {
        state.innerHTML = `<span class="status-dot ${message.connected ? 'connected' : ''}"></span>${message.connected ? `Connected to room ${code}` : 'The host left this room.'}`;
      }
      if (message.type === 'round_start') {
        roundActive = true;
        round = message.round ?? 0;
        lastCueAt = undefined;
        lastBeatId = undefined;
        pad.disabled = true;
        roundState.textContent = `Round ${message.round} is live at ${message.bpm} BPM.`;
      }
      if (message.type === 'beat') {
        lastCueAt = Date.now();
        lastBeatId = message.beat_id;
        pad.disabled = false;
        cueCompanion();
      }
      if (message.type === 'score') applyScore(message);
      if (message.type === 'relay_state' && typeof message.round === 'number') {
        round = message.round;
        roundActive = Boolean(message.active);
        lastCueAt = undefined;
        lastBeatId = undefined;
        pad.disabled = true;
        if (roundActive) {
          roundState.textContent = `Round ${message.round} is live at ${message.bpm ?? 'the selected'} BPM.`;
        }
        applyScore(message);
      }
      if (message.type === 'round_end') {
        roundActive = false;
        pad.disabled = true;
        roundState.textContent = `Round complete with ${message.score ?? 0}% accuracy.`;
      }
    }, (connectionState) => {
      if (connectionState === 'reconnecting') {
        state.innerHTML = '<span class="status-dot"></span>Relay interrupted. Reconnecting…';
        pad.disabled = true;
      } else if (connectionState === 'open') {
        state.innerHTML = `<span class="status-dot connected"></span>Connected to room ${code}`;
      }
    });
  } catch (cause) {
    const message = cause instanceof Error && cause.message !== 'Failed to fetch'
      ? cause.message
      : 'The room server could not be reached. Check your connection and try again.';
    state.innerHTML = `<span class="status-dot"></span>${message} <a href="/join" data-route>Enter another code</a>`;
    bindGlobalActions();
  }

  const tap = () => {
    if (!roundActive || !socket?.isOpen() || lastCueAt === undefined || lastBeatId === undefined) return;
    tapId += 1;
    socket.send(JSON.stringify({
      type: 'tap',
      at: Date.now(),
      round,
      tap_id: tapId,
      beat_id: lastBeatId,
      cue_delay: Math.max(0, Date.now() - lastCueAt),
    }));
    pad.disabled = true;
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
window.addEventListener('popstate', () => navigate(`${location.pathname}${location.search}`, false));
navigate(`${location.pathname}${location.search}`, false, false);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => undefined));
}
