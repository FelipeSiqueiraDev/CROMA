import type { Clima, Universo } from './entradaCena';

/**
 * A trilha da tela de entrada, sintetizada na hora (Web Audio, sem arquivos), como os sons de
 * sfx.ts: um tema de aventura por universo e o som do ambiente da cena sorteada.
 *
 * - **Os temas:** fantasia (alaúde e flauta), horror cósmico (coro grave e zumbido), paranormal
 *   (caixinha de música) e Tormenta (épico, com tambores). Oito compassos que se repetem, com
 *   variação a cada volta. De noite o som fica mais escuro; de dia, mais aberto.
 * - **O ambiente:** a chuva, o trovão em cada relâmpago, o vento na neve e na neblina, o estalar
 *   da vela acesa e os passarinhos de dia.
 *
 * O navegador só deixa tocar depois do primeiro toque ou tecla na página. A escolha (ligada ou
 * desligada) fica neste aparelho.
 */

const CHAVE = 'crona.entrada.musica';
const CHAVE_VOLUME = 'crona.entrada.volume';
/** o volume de 0 a 1 vira o ganho do som (1 = o mais alto, ainda sem distorcer) */
const GANHO = 1;

type Nota = [midi: number | null, tempos: number];
type Timbre = 'flauta' | 'caixinha' | 'metal' | 'coro';
interface Tema {
  bpm: number;
  acordes: string[];
  melodia: Nota[];
  timbre: Timbre;
  /** o acompanhamento: arpejo subindo (alaúde), caixinha (agudo e lento) ou só o acorde */
  arpejo: 'subindo' | 'caixinha' | 'nenhum';
  tambor?: boolean;
  /** nota grave que fica soando por baixo (o zumbido do horror) */
  zumbido?: number;
}

const NOTAS: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
/** 'C#5' → 73 */
function midi(n: string): number {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(n);
  if (!m) throw new Error(`nota ${n}`);
  return 12 * (Number(m[3]) + 1) + NOTAS[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}
/** 'A4:1 D5:.5 -:1' → notas (o '-' é pausa) */
function frase(s: string): Nota[] {
  return s
    .split(/\s+/)
    .filter((p) => p && p !== '|')
    .map((p) => {
      const [n, t] = p.split(':');
      return [n === '-' ? null : midi(n), Number(t)];
    });
}
/** 'Dm' → as notas do acorde perto do Dó central */
function acorde(nome: string): number[] {
  const m = /^([A-G][#b]?)(m|dim|sus2)?$/.exec(nome);
  if (!m) throw new Error(`acorde ${nome}`);
  const raiz = midi(`${m[1]}3`);
  const terca = m[2] === 'm' || m[2] === 'dim' ? 3 : m[2] === 'sus2' ? 2 : 4;
  const quinta = m[2] === 'dim' ? 6 : 7;
  return [raiz, raiz + terca, raiz + quinta];
}

const TEMAS: Record<Universo, Tema> = {
  fantasia: {
    bpm: 88,
    acordes: ['Dm', 'C', 'Bb', 'C', 'Dm', 'F', 'C', 'A'],
    melodia: frase(`A4:1 D5:1 E5:1 F5:1 | E5:1.5 D5:.5 C5:1 E5:1 | D5:2 F5:1 D5:1 | C5:1 D5:1 E5:2 |
      F5:1 E5:.5 D5:.5 A5:2 | G5:1 F5:1 E5:1 C5:1 | D5:1.5 E5:.5 C5:1 G4:1 | A4:2 C#5:1 E5:1`),
    timbre: 'flauta',
    arpejo: 'subindo',
  },
  horror: {
    bpm: 54,
    acordes: ['Am', 'F', 'Dm', 'E', 'Am', 'F', 'Dm', 'E'],
    melodia: frase(`E5:3 F5:1 | E5:2 C5:2 | D5:3 F5:1 | E5:2 G#4:2 |
      A4:2 B4:1 C5:1 | D#5:2 E5:2 | F5:2 D5:1 B4:1 | G#4:4`),
    timbre: 'coro',
    arpejo: 'nenhum',
    zumbido: midi('A1'),
  },
  paranormal: {
    bpm: 66,
    acordes: ['Em', 'C', 'Am', 'B', 'Em', 'C', 'Am', 'B'],
    melodia: frase(`B5:1 G5:1 E5:1 G5:1 | C6:2 B5:1 A5:1 | A5:1 C6:1 E6:1 C6:1 | B5:2 D#6:1 F#5:1 |
      G5:1 B5:1 E6:2 | E6:1 D6:1 C6:2 | A5:1 C6:1 B5:1 A5:1 | B5:3 -:1`),
    timbre: 'caixinha',
    arpejo: 'caixinha',
  },
  tormenta: {
    bpm: 100,
    acordes: ['Dm', 'Bb', 'Gm', 'A', 'Dm', 'Bb', 'Gm', 'A'],
    melodia: frase(`D5:1 A5:1 G5:.5 F5:.5 E5:1 | F5:2 D5:2 | G5:1 F5:1 E5:1 D5:1 | C#5:2 E5:1 A4:1 |
      D5:.5 E5:.5 F5:1 A5:1 D6:1 | C6:1 Bb5:1 A5:1 F5:1 | G5:1.5 A5:.5 Bb5:1 G5:1 | A5:4`),
    timbre: 'metal',
    arpejo: 'subindo',
    tambor: true,
  },
};

const hz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

export class Trilha {
  /** ligada (a escolha deste aparelho) */
  ligada = true;
  /** o volume, de 0 a 1 (também guardado no aparelho) */
  volume = 0.7;
  /** o som começou ou parou (o navegador liberou, ou segurou) */
  aoMudarEstado: () => void = () => {};
  private ac: AudioContext | null = null;
  private mestre: GainNode | null = null;
  private musica: GainNode | null = null;
  private filtro: BiquadFilterNode | null = null;
  private eco: ConvolverNode | null = null;
  private atraso: DelayNode | null = null;
  private ruido: AudioBuffer | null = null;
  private relogio = 0;
  private proximoCompasso = 0;
  private compasso = 0;
  private volta = 0;
  private proximoEstalo = 0;
  private proximoPassaro = 0;
  private tema: Tema;
  private luzDia = 0;
  private velaAcesa = true;
  private fechada = false;

  constructor(
    private universo: Universo,
    private clima: Clima,
  ) {
    this.tema = TEMAS[universo];
    try {
      this.ligada = localStorage.getItem(CHAVE) !== '0';
      const v = Number(localStorage.getItem(CHAVE_VOLUME));
      if (localStorage.getItem(CHAVE_VOLUME) !== null && Number.isFinite(v)) this.volume = Math.min(1, Math.max(0, v));
    } catch {
      /* sem storage */
    }
  }

  /** Muda o volume (0 a 1). Subir do zero liga a música; ir a zero não desliga, só cala. */
  ajustarVolume(v: number) {
    this.volume = Math.min(1, Math.max(0, v));
    try {
      localStorage.setItem(CHAVE_VOLUME, String(Math.round(this.volume * 100) / 100));
    } catch {
      /* sem storage */
    }
    if (this.volume > 0 && !this.ligada) this.alternar();
    else if (this.ligada) this.comecar(0.15);
  }

  get tocando() {
    return !!this.ac && this.ac.state === 'running' && this.ligada;
  }

  /** Liga ou desliga (e guarda a escolha). */
  alternar(): boolean {
    this.ligada = !this.ligada;
    try {
      localStorage.setItem(CHAVE, this.ligada ? '1' : '0');
    } catch {
      /* sem storage */
    }
    if (this.ligada) this.comecar();
    else this.calar(0.4);
    return this.ligada;
  }

  /** Começa (chamado num toque ou tecla, quando o navegador deixa); `subida` em segundos. */
  comecar(subida = 3) {
    if (!this.ligada || this.fechada) return;
    if (!this.ac) this.montar();
    const ac = this.ac;
    if (!ac || !this.mestre) return;
    if (ac.state === 'suspended') void ac.resume();
    const t = ac.currentTime;
    this.mestre.gain.cancelScheduledValues(t);
    this.mestre.gain.setValueAtTime(this.mestre.gain.value, t);
    this.mestre.gain.linearRampToValueAtTime(this.volume * GANHO, t + subida);
    if (!this.relogio) {
      this.proximoCompasso = t + 0.3;
      this.relogio = window.setInterval(() => this.agendar(), 90);
    }
  }

  /** A luz da cena: de noite a música fica mais escura. */
  luz(dia: number, vela: boolean) {
    this.luzDia = dia;
    this.velaAcesa = vela;
    if (this.filtro && this.ac) this.filtro.frequency.setTargetAtTime(1500 + 5000 * dia, this.ac.currentTime, 1.5);
  }

  /** Abaixa até sumir (`fechar` desliga de vez, ao sair da tela). */
  calar(segundos = 1, fechar = false) {
    const ac = this.ac;
    if (fechar) this.fechada = true;
    if (!ac || !this.mestre) return;
    const t = ac.currentTime;
    this.mestre.gain.cancelScheduledValues(t);
    this.mestre.gain.setValueAtTime(this.mestre.gain.value, t);
    this.mestre.gain.linearRampToValueAtTime(0, t + segundos);
    if (!fechar) return;
    setTimeout(() => {
      clearInterval(this.relogio);
      this.relogio = 0;
      void ac.close();
      this.ac = null;
    }, segundos * 1000 + 200);
  }

  // ---------------------------------------------------------------- o som da cena

  /** O trovão: um estalo e o ronco grave que rola. `perto` de 0 a 1. */
  trovao(perto = Math.random()) {
    const ac = this.ac;
    if (!ac || !this.mestre || !this.tocando) return;
    const t = ac.currentTime + 0.15 + (1 - perto) * 1.2;
    // o estalo (só quando é perto)
    if (perto > 0.4) this.rajada(t, 0.25, 'highpass', 1800, 0.3 * perto, 0.003, 0.22);
    // o ronco: grave, longo e rolando
    const ronco = this.rajada(t + 0.05, 3.6, 'lowpass', 160, 0.9, 0.08, 3.4);
    if (ronco) {
      const lfo = ac.createOscillator();
      const prof = ac.createGain();
      lfo.frequency.value = 5 + Math.random() * 4;
      prof.gain.value = 0.35;
      lfo.connect(prof).connect(ronco.gain);
      lfo.start(t);
      lfo.stop(t + 3.8);
    }
  }

  // ---------------------------------------------------------------- por dentro

  private montar() {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ac = new AC();
    this.ac = ac;
    // o navegador pode segurar o som até o primeiro toque: quem mostra o botão fica sabendo
    ac.onstatechange = () => this.aoMudarEstado();
    this.mestre = ac.createGain();
    this.mestre.gain.value = 0;
    this.mestre.connect(ac.destination);
    // o ruído (chuva, vento, trovão, estalos, tambor)
    const len = ac.sampleRate * 3;
    this.ruido = ac.createBuffer(1, len, ac.sampleRate);
    const d = this.ruido.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    // o salão: um eco longo, feito de ruído que morre devagar
    this.eco = ac.createConvolver();
    const ir = ac.createBuffer(2, ac.sampleRate * 2.6, ac.sampleRate);
    for (let c = 0; c < 2; c++) {
      const ch = ir.getChannelData(c);
      for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / ch.length, 2.6);
    }
    this.eco.buffer = ir;
    const ecoVolta = ac.createGain();
    ecoVolta.gain.value = 0.55;
    this.eco.connect(ecoVolta).connect(this.mestre);
    // a música passa por um filtro que segue a luz da cena
    this.musica = ac.createGain();
    this.musica.gain.value = 0.85;
    this.filtro = ac.createBiquadFilter();
    this.filtro.type = 'lowpass';
    this.filtro.frequency.value = 1500 + 5000 * this.luzDia;
    this.musica.connect(this.filtro);
    this.filtro.connect(this.mestre);
    this.filtro.connect(this.eco);
    // o eco da melodia (repete atrás, mais baixo)
    this.atraso = ac.createDelay(1);
    this.atraso.delayTime.value = (60 / this.tema.bpm) * 0.75;
    const volta = ac.createGain();
    volta.gain.value = 0.28;
    this.atraso.connect(volta).connect(this.atraso);
    volta.connect(this.filtro);
    // o ambiente
    const chuva = this.clima === 'chuva' || this.clima === 'tempestade';
    this.laco('bandpass', 2200, 0.6, chuva ? (this.clima === 'tempestade' ? 0.16 : 0.11) : 0);
    const vento = this.laco('bandpass', 420, 1.2, this.clima === 'neve' || this.clima === 'neblina' || this.clima === 'tempestade' ? 0.07 : 0);
    if (vento) {
      // o vento sobe e desce
      const lfo = ac.createOscillator();
      const prof = ac.createGain();
      lfo.frequency.value = 0.07;
      prof.gain.value = 0.05;
      lfo.connect(prof).connect(vento.gain);
      lfo.start();
    }
  }

  /** Ruído em laço, filtrado (a chuva, o vento). */
  private laco(tipo: BiquadFilterType, freq: number, q: number, volume: number): GainNode | null {
    const ac = this.ac;
    if (!ac || !this.ruido || !this.mestre || volume <= 0) return null;
    const src = ac.createBufferSource();
    src.buffer = this.ruido;
    src.loop = true;
    const f = ac.createBiquadFilter();
    f.type = tipo;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ac.createGain();
    g.gain.value = volume;
    src.connect(f).connect(g).connect(this.mestre);
    src.start();
    return g;
  }

  /** Uma rajada de ruído com envelope (estalo, ronco, tambor). */
  private rajada(t: number, dur: number, tipo: BiquadFilterType, freq: number, volume: number, ataque: number, queda: number, destino?: AudioNode) {
    const ac = this.ac;
    if (!ac || !this.ruido || !this.mestre) return null;
    const src = ac.createBufferSource();
    src.buffer = this.ruido;
    src.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = ac.createBiquadFilter();
    f.type = tipo;
    f.frequency.value = freq;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(volume, t + ataque);
    g.gain.exponentialRampToValueAtTime(0.0001, t + ataque + queda);
    src.connect(f).connect(g).connect(destino ?? this.mestre);
    src.start(t, Math.random() * 2);
    src.stop(t + dur + 0.1);
    return g;
  }

  /** Agenda o que toca nos próximos instantes (o relógio roda a cada 90 ms). */
  private agendar() {
    const ac = this.ac;
    if (!ac || ac.state !== 'running') return;
    const tema = this.tema;
    const tempo = 60 / tema.bpm;
    // o navegador segurou o som e soltou agora: começa do compasso de agora, sem atropelar
    if (this.proximoCompasso < ac.currentTime - 0.05) this.proximoCompasso = ac.currentTime + 0.1;
    while (this.proximoCompasso < ac.currentTime + 0.4) {
      this.tocarCompasso(this.proximoCompasso, tempo);
      this.proximoCompasso += tempo * 4;
      this.compasso = (this.compasso + 1) % tema.acordes.length;
      if (this.compasso === 0) this.volta++;
    }
    this.ambiente(ac.currentTime);
  }

  private tocarCompasso(t: number, tempo: number) {
    const tema = this.tema;
    const k = this.compasso;
    const notas = acorde(tema.acordes[k]);
    const dur = tempo * 4;
    // o acorde por baixo e o baixo
    for (const n of notas) this.pad(n, t, dur, tema.timbre === 'coro' ? 0.04 : 0.024);
    this.baixo(notas[0] - 12, t, dur);
    if (tema.zumbido && k === 0) this.pad(tema.zumbido, t, dur * tema.acordes.length, 0.06);
    // o acompanhamento
    if (tema.arpejo === 'subindo')
      for (let i = 0; i < 8; i++) {
        const n = notas[i % 3] + 12 * (1 + Math.floor(i / 3) % 2);
        this.dedilhado(n, t + i * tempo * 0.5, 0.035);
      }
    else if (tema.arpejo === 'caixinha') for (let i = 0; i < 4; i++) this.dedilhado(notas[(i * 2) % 3] + 24, t + i * tempo, 0.035, 1.6);
    else if (Math.random() < 0.5) this.dedilhado(notas[2] + 12, t + tempo * 2, 0.04, 2.2);
    if (tema.tambor) {
      this.tambor(t, 'bumbo');
      this.tambor(t + tempo * 2, 'bumbo');
      if (k % 4 === 3) for (let i = 0; i < 4; i++) this.tambor(t + tempo * (2 + i * 0.5), 'caixa');
      for (let i = 0; i < 8; i++) this.tambor(t + i * tempo * 0.5, 'chocalho');
    }
    // a melodia: na terceira volta descansa (só o acompanhamento), na segunda sobe uma oitava
    if (this.volta % 4 === 2) return;
    const oitava = this.volta % 4 === 1 && tema.timbre !== 'caixinha' ? 12 : 0;
    const inicio = k * 4;
    let pos = 0;
    for (const [n, tempos] of tema.melodia) {
      if (pos >= inicio && pos < inicio + 4 && n !== null) this.voz(n + oitava, t + (pos - inicio) * tempo, tempos * tempo);
      pos += tempos;
    }
  }

  /** Um acorde sustentado: dois serrotes levemente desafinados, filtrados. */
  private pad(n: number, t: number, dur: number, vol: number) {
    const ac = this.ac!;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + Math.min(1, dur * 0.3));
    g.gain.setValueAtTime(vol, t + dur * 0.8);
    g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.6);
    const f = ac.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 900;
    for (const det of [-7, 7]) {
      const o = ac.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = hz(n);
      o.detune.value = det;
      o.connect(f);
      o.start(t);
      o.stop(t + dur + 0.7);
    }
    f.connect(g).connect(this.musica!);
  }

  private baixo(n: number, t: number, dur: number) {
    const ac = this.ac!;
    const o = ac.createOscillator();
    o.type = 'triangle';
    o.frequency.value = hz(n);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.075, t + 0.04);
    g.gain.exponentialRampToValueAtTime(0.02, t + dur * 0.9);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.musica!);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  /** A corda beliscada (alaúde, harpa) ou a caixinha de música. */
  private dedilhado(n: number, t: number, vol: number, queda = 0.9) {
    const ac = this.ac!;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + queda);
    const f = ac.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(this.tema.timbre === 'caixinha' ? 6000 : 3200, t);
    f.frequency.exponentialRampToValueAtTime(700, t + queda * 0.7);
    const tipos: OscillatorType[] = this.tema.timbre === 'caixinha' ? ['sine', 'sine'] : ['triangle', 'square'];
    tipos.forEach((tipo, i) => {
      const o = ac.createOscillator();
      o.type = tipo;
      // a caixinha tem um harmônico agudo de metal
      o.frequency.value = hz(n) * (this.tema.timbre === 'caixinha' && i ? 4.01 : 1);
      const gi = ac.createGain();
      gi.gain.value = i ? (this.tema.timbre === 'caixinha' ? 0.25 : 0.18) : 1;
      o.connect(gi).connect(f);
      o.start(t);
      o.stop(t + queda + 0.05);
    });
    f.connect(g).connect(this.musica!);
  }

  /** A melodia, no timbre do tema. */
  private voz(n: number, t: number, dur: number) {
    const ac = this.ac!;
    const timbre = this.tema.timbre;
    if (timbre === 'caixinha') return this.dedilhado(n, t, 0.09, Math.max(1.2, dur * 1.5));
    const g = ac.createGain();
    const vol = timbre === 'metal' ? 0.085 : timbre === 'coro' ? 0.075 : 0.12;
    const ataque = timbre === 'coro' ? 0.35 : timbre === 'metal' ? 0.05 : 0.06;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + ataque);
    g.gain.setValueAtTime(vol * 0.85, t + Math.max(ataque, dur - 0.08));
    g.gain.linearRampToValueAtTime(0.0001, t + dur + (timbre === 'coro' ? 0.6 : 0.12));
    const f = ac.createBiquadFilter();
    f.type = timbre === 'coro' ? 'bandpass' : 'lowpass';
    f.frequency.value = timbre === 'coro' ? 900 : timbre === 'metal' ? 2200 : 3000;
    f.Q.value = timbre === 'coro' ? 1.4 : 0.7;
    // o vibrato entra depois do ataque
    const lfo = ac.createOscillator();
    lfo.frequency.value = timbre === 'coro' ? 4.2 : 5.4;
    const prof = ac.createGain();
    prof.gain.setValueAtTime(0, t);
    prof.gain.linearRampToValueAtTime(timbre === 'metal' ? 4 : 9, t + Math.min(0.4, dur));
    lfo.connect(prof);
    lfo.start(t);
    lfo.stop(t + dur + 0.7);
    const tipos: OscillatorType[] = timbre === 'flauta' ? ['triangle', 'sine'] : timbre === 'metal' ? ['sawtooth', 'square'] : ['sawtooth', 'sawtooth'];
    tipos.forEach((tipo, i) => {
      const o = ac.createOscillator();
      o.type = tipo;
      o.frequency.value = hz(n) * (timbre === 'flauta' && i ? 2 : 1);
      o.detune.value = timbre === 'coro' ? (i ? 9 : -9) : 0;
      prof.connect(o.detune);
      const gi = ac.createGain();
      gi.gain.value = i ? 0.35 : 1;
      o.connect(gi).connect(f);
      o.start(t);
      o.stop(t + dur + 0.7);
    });
    f.connect(g);
    g.connect(this.musica!);
    g.connect(this.atraso!);
  }

  private tambor(t: number, tipo: 'bumbo' | 'caixa' | 'chocalho') {
    const ac = this.ac!;
    if (tipo === 'chocalho') return void this.rajada(t, 0.08, 'highpass', 7000, 0.025, 0.002, 0.05, this.musica!);
    if (tipo === 'caixa') return void this.rajada(t, 0.2, 'bandpass', 1800, 0.12, 0.002, 0.16, this.musica!);
    const o = ac.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(130, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.3);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.35, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
    o.connect(g).connect(this.musica!);
    o.start(t);
    o.stop(t + 0.5);
  }

  /** O ambiente que não é laço: o estalar da vela e os passarinhos de dia. */
  private ambiente(agora: number) {
    if (this.velaAcesa && agora > this.proximoEstalo) {
      this.proximoEstalo = agora + 0.4 + Math.random() * 2.6;
      this.rajada(agora + 0.05, 0.03, 'bandpass', 2500 + Math.random() * 2500, 0.03 + Math.random() * 0.04, 0.001, 0.02);
    }
    const sol = this.luzDia > 0.6 && (this.clima === 'limpo' || this.clima === 'nuvens');
    if (sol && agora > this.proximoPassaro) {
      this.proximoPassaro = agora + 2.5 + Math.random() * 6;
      this.passarinho(agora + 0.1);
    }
  }

  /** Um canto curto: duas ou três notas que escorregam, bem agudas. */
  private passarinho(t: number) {
    const ac = this.ac!;
    const notas = 2 + Math.floor(Math.random() * 3);
    const base = 2600 + Math.random() * 1400;
    for (let i = 0; i < notas; i++) {
      const ti = t + i * (0.09 + Math.random() * 0.05);
      const o = ac.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(base * (1 + Math.random() * 0.3), ti);
      o.frequency.exponentialRampToValueAtTime(base * (0.75 + Math.random() * 0.6), ti + 0.07);
      const g = ac.createGain();
      g.gain.setValueAtTime(0.0001, ti);
      g.gain.exponentialRampToValueAtTime(0.025, ti + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, ti + 0.08);
      o.connect(g).connect(this.mestre!);
      g.connect(this.eco!);
      o.start(ti);
      o.stop(ti + 0.1);
    }
  }
}
