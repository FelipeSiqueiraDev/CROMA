/**
 * Sons da interface, sintetizados na hora (Web Audio, sem arquivos):
 * lápis riscando, borracha, papel, pincel, carimbo, teclas da máquina de
 * escrever, item voando e caindo. Volume baixo; dá para desligar no menu.
 */
const KEY = 'croma.sfx';

interface Burst {
  dur: number;
  type: BiquadFilterType;
  freq: number;
  freq2?: number;
  q?: number;
  gain: number;
  attack?: number;
  release?: number;
}

class Sfx {
  enabled = true;
  private ac: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private lastTick = 0;

  constructor() {
    try {
      this.enabled = localStorage.getItem(KEY) !== '0';
    } catch {
      /* sem storage */
    }
    if (typeof window === 'undefined') return;
    const unlock = () => {
      this.ctx();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
  }

  setEnabled(v: boolean) {
    this.enabled = v;
    try {
      localStorage.setItem(KEY, v ? '1' : '0');
    } catch {
      /* sem storage */
    }
    if (v) this.paper();
  }

  private ctx(): AudioContext | null {
    if (!this.enabled) return null;
    if (!this.ac) {
      // o navegador só libera áudio depois de um clique/tecla na página
      const ua = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation;
      if (ua && !ua.hasBeenActive) return null;
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      this.ac = new AC();
      this.master = this.ac.createGain();
      this.master.gain.value = 0.3;
      this.master.connect(this.ac.destination);
      const len = this.ac.sampleRate * 2;
      const b = this.ac.createBuffer(1, len, this.ac.sampleRate);
      const d = b.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.noise = b;
    }
    if (this.ac.state === 'suspended') void this.ac.resume();
    return this.ac.state === 'running' ? this.ac : null;
  }

  /** Rajada de ruído filtrado com envelope. Devolve o nó de ganho para modulação. */
  private burst(o: Burst, into?: AudioNode) {
    const ac = this.ctx();
    if (!ac || !this.noise || !this.master) return null;
    const t = ac.currentTime + 0.005;
    const src = ac.createBufferSource();
    src.buffer = this.noise;
    const f = ac.createBiquadFilter();
    f.type = o.type;
    f.frequency.setValueAtTime(o.freq, t);
    if (o.freq2) f.frequency.exponentialRampToValueAtTime(o.freq2, t + o.dur);
    f.Q.value = o.q ?? 0.8;
    const g = ac.createGain();
    const a = o.attack ?? 0.01;
    const r = o.release ?? 0.05;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(o.gain, t + a);
    g.gain.setValueAtTime(o.gain, t + Math.max(a, o.dur - r));
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    src.connect(f).connect(g).connect(into ?? this.master);
    src.start(t, Math.random() * 1.2);
    src.stop(t + o.dur + 0.05);
    return { g, t, ac };
  }

  private tone(f1: number, f2: number, dur: number, gain: number, type: OscillatorType = 'sine') {
    const ac = this.ctx();
    if (!ac || !this.master) return;
    const t = ac.currentTime + 0.005;
    const o = ac.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f1, t);
    o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  /** Grafite no papel: ruído agudo com "arranhado" irregular. */
  pencil(ms: number, vol = 1) {
    const ac = this.ctx();
    if (!ac || !this.master) return;
    const mod = ac.createGain();
    mod.gain.value = 0.55;
    mod.connect(this.master);
    const lfo = ac.createOscillator();
    lfo.type = 'square';
    lfo.frequency.value = 17 + Math.random() * 9;
    const depth = ac.createGain();
    depth.gain.value = 0.42;
    lfo.connect(depth).connect(mod.gain);
    const b = this.burst({ dur: ms / 1000, type: 'bandpass', freq: 3900, freq2: 3200, q: 1.1, gain: 0.55 * vol, attack: 0.02, release: 0.09 }, mod);
    if (!b) return;
    lfo.start(b.t);
    lfo.stop(b.t + ms / 1000 + 0.05);
  }

  /** Borracha esfregando. */
  erase(ms: number) {
    const b = this.burst({ dur: ms / 1000, type: 'lowpass', freq: 1300, q: 0.7, gain: 0.5, attack: 0.02, release: 0.08 });
    if (!b) return;
    const n = 6;
    for (let i = 0; i < n; i++) {
      const at = b.t + (i / n) * (ms / 1000);
      b.g.gain.setValueAtTime(i % 2 ? 0.18 : 0.5, at);
    }
  }

  /** Folha deslizando / aba virando. */
  paper() {
    this.burst({ dur: 0.22, type: 'bandpass', freq: 2600, freq2: 700, q: 0.7, gain: 0.32, attack: 0.015, release: 0.12 });
  }

  /** Pincel molhado passando. */
  brush(ms: number) {
    this.burst({ dur: ms / 1000, type: 'bandpass', freq: 1100, freq2: 1900, q: 0.55, gain: 0.26, attack: 0.07, release: 0.16 });
  }

  /** Carimbo batendo. */
  stamp() {
    this.tone(130, 45, 0.16, 0.7);
    this.burst({ dur: 0.03, type: 'highpass', freq: 1800, gain: 0.35, attack: 0.002, release: 0.02 });
  }

  /** Tecla da máquina de escrever (com limite de frequência). */
  tick() {
    const now = performance.now();
    if (now - this.lastTick < 28) return;
    this.lastTick = now;
    this.burst({ dur: 0.014, type: 'highpass', freq: 2600 + Math.random() * 900, gain: 0.1 + Math.random() * 0.05, attack: 0.001, release: 0.01 });
  }

  /** Item cortando o ar. */
  whoosh(ms: number) {
    this.burst({ dur: ms / 1000, type: 'bandpass', freq: 420, freq2: 2300, q: 0.9, gain: 0.22, attack: ms / 2500, release: ms / 2000 });
  }

  /** Item chegando no retrato. */
  drop() {
    this.tone(190, 70, 0.14, 0.45);
    this.burst({ dur: 0.07, type: 'lowpass', freq: 700, gain: 0.3, attack: 0.003, release: 0.05 });
  }

  /** Estalo curto (clique de botão/checkbox). */
  click() {
    this.burst({ dur: 0.018, type: 'highpass', freq: 2300, gain: 0.18, attack: 0.001, release: 0.012 });
    this.tone(900, 700, 0.03, 0.06, 'triangle');
  }

  /** "Plim" suave (item aparecendo). */
  pop() {
    this.tone(540, 900, 0.08, 0.18, 'triangle');
  }

  /** Tecla do painel de senha (cada número um tom). */
  beep(n = 0) {
    this.tone(880 + (n % 10) * 22, 880 + (n % 10) * 22, 0.07, 0.12, 'square');
  }

  /** Senha errada: zumbido grave. */
  denied() {
    this.tone(150, 140, 0.32, 0.22, 'sawtooth');
    this.tone(155, 150, 0.32, 0.12, 'square');
  }

  /** Senha certa: trava abrindo (dois tons e um estalo). */
  granted() {
    this.tone(660, 660, 0.09, 0.14, 'square');
    setTimeout(() => this.tone(990, 990, 0.14, 0.14, 'square'), 110);
    setTimeout(() => this.burst({ dur: 0.05, type: 'highpass', freq: 1500, gain: 0.3, attack: 0.002, release: 0.03 }), 260);
  }

  /** Móvel pesado arrastado no chão (geladeira deslizando), com a batida no fim. */
  scrape(ms: number) {
    const b = this.burst({ dur: ms / 1000, type: 'lowpass', freq: 380, freq2: 240, q: 1.4, gain: 0.55, attack: 0.18, release: 0.2 });
    if (!b) return;
    // trepida enquanto arrasta
    for (let i = 0; i < 14; i++) b.g.gain.setValueAtTime(i % 2 ? 0.3 : 0.55, b.t + 0.2 + (i / 14) * (ms / 1000 - 0.4));
    this.burst({ dur: ms / 1000, type: 'bandpass', freq: 1400, freq2: 900, q: 2, gain: 0.08, attack: 0.2, release: 0.2 });
    setTimeout(() => {
      this.tone(90, 50, 0.22, 0.5);
      this.burst({ dur: 0.08, type: 'lowpass', freq: 500, gain: 0.35, attack: 0.003, release: 0.06 });
    }, ms - 60);
  }
}

export const sfx = new Sfx();
