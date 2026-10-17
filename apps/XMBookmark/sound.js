/**
 * XMB Sound Engine (Web Audio API Procedural Generation)
 * Synthesizes classic PS3 navigation clicks, chime, cancel, and procedural ambient drone.
 */
class XMBSoundEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.sfxGain = null;
    this.bgmGain = null;

    this.isMuted = false;
    this.bgmEnabled = true;
    this.sfxVolume = 0.75;
    this.bgmVolume = 0.35;

    // 内蔵アンビエント用ノード
    this.ambientOscillators = [];
    this.ambientFilter = null;
    this.ambientLfo = null;
    this.isAmbientPlaying = false;

    // カスタムオーディオ（手持ちファイル）
    this.customAudio = new Audio();
    this.customAudio.loop = true;
    this.isCustomBgmActive = false;

    // 初回ユーザーインタラクション時にAudioContext初期化
    this._initOnFirstUserGesture();
  }

  _initContext() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    this.ctx = new AudioCtx();

    // マスターゲイン
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    // 効果音ゲイン
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
    this.sfxGain.connect(this.masterGain);

    // BGMゲイン
    this.bgmGain = this.ctx.createGain();
    this.bgmGain.gain.setValueAtTime(this.bgmVolume, this.ctx.currentTime);
    this.bgmGain.connect(this.masterGain);

    // カスタムオーディオへの接続
    try {
      const source = this.ctx.createMediaElementSource(this.customAudio);
      source.connect(this.bgmGain);
    } catch (e) {
      // 既に接続されている場合など
    }
  }

  _initOnFirstUserGesture() {
    const unlock = () => {
      this._initContext();
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      if (this.bgmEnabled && !this.isAmbientPlaying && !this.isCustomBgmActive) {
        this.startAmbientDrone();
      }
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('touchstart', unlock);
    };

    window.addEventListener('keydown', unlock, { once: false });
    window.addEventListener('pointerdown', unlock, { once: false });
    window.addEventListener('touchstart', unlock, { once: false });
  }

  resumeContext() {
    if (!this.ctx) this._initContext();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  /**
   * ナビゲーション移動音（XMB特有の「カチッ / コッ」）
   * 澄んだ高域サイン波 (約 2200Hz) + 微小ノイズエンベロープ、減衰30〜35ms
   */
  playNavTick() {
    this.resumeContext();
    if (!this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;

    // 1. 高域サイン波成分 (シャープなアタック)
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sine';
    // わずかにピッチベンドして小気味よいクリック感を出す (2300Hz -> 1800Hz)
    osc.frequency.setValueAtTime(2350, t);
    osc.frequency.exponentialRampToValueAtTime(1600, t + 0.028);

    oscGain.gain.setValueAtTime(0.4, t);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.032);

    osc.connect(oscGain);
    oscGain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.035);

    // 2. 微小バーストノイズ成分（アタックの硬質感を付与）
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.015); // 15ms
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.setValueAtTime(3200, t);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.18, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.025);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);

    noise.start(t);
    noise.stop(t + 0.03);
  }

  /**
   * 決定音（澄んだ透明なクリスタル和音「ピロッ / シャリン」）
   * 1046Hz(C6) -> 1568Hz(G6) のアルペジオ＆倍音
   */
  playConfirm() {
    this.resumeContext();
    if (!this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;
    const notes = [
      { f: 1046.5, delay: 0.00, dur: 0.28, gain: 0.35 },
      { f: 1318.5, delay: 0.03, dur: 0.32, gain: 0.35 },
      { f: 1567.9, delay: 0.06, dur: 0.38, gain: 0.40 },
      { f: 2093.0, delay: 0.09, dur: 0.45, gain: 0.30 }
    ];

    notes.forEach(note => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(note.f, t + note.delay);

      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.setValueAtTime(note.gain, t + note.delay);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + note.delay + note.dur);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t + note.delay);
      osc.stop(t + note.delay + note.dur + 0.05);
    });
  }

  /**
   * キャンセル音（落ち着いた下降トーン「ポッ」）
   */
  playCancel() {
    this.resumeContext();
    if (!this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, t); // D5
    osc.frequency.exponentialRampToValueAtTime(392.0, t + 0.12); // G4

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.14);
  }

  /**
   * エラー・警告音
   */
  playError() {
    this.resumeContext();
    if (!this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(260, t);
    osc.frequency.setValueAtTime(220, t + 0.08);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.2);
  }

  /**
   * Web Audio APIによるプロシージャル・イージーリスニングBGM
   * 聴いていて心地よい、温かみのあるメロディック・コード進行（Cmaj7 -> Am9 -> Fmaj7 -> Gsus4）
   * 柔らかなサイン波トーンとローパスフィルターによるフェンダーローズ調の癒やしサウンド
   */
  startAmbientDrone() {
    if (!this.bgmEnabled || this.isAmbientPlaying || this.isCustomBgmActive) return;
    this.resumeContext();
    if (!this.ctx) return;

    this.stopAmbientDrone();

    // マスターフィルター（高域の角を取り、温かいアナログ感を出す）
    this.ambientFilter = this.ctx.createBiquadFilter();
    this.ambientFilter.type = 'lowpass';
    this.ambientFilter.frequency.setValueAtTime(420, this.ctx.currentTime);
    this.ambientFilter.Q.setValueAtTime(1.2, this.ctx.currentTime);

    // わずかに温かみを出すサチュレーション／ゲイン
    this.ambientFilter.connect(this.bgmGain);

    // イージーリスニングのコード進行（周波数リスト Hz）
    // 1: Cmaj7  (C3: 130.81, G3: 196.00, B3: 246.94, E4: 329.63)
    // 2: Am9    (A2: 110.00, G3: 196.00, C4: 261.63, E4: 329.63)
    // 3: Fmaj7  (F2: 87.31,  A3: 220.00, C4: 261.63, E4: 329.63)
    // 4: Gsus4  (G2: 98.00,  C4: 261.63, D4: 293.66, G4: 392.00)
    const chordProgression = [
      [130.81, 196.00, 246.94, 329.63],
      [110.00, 196.00, 261.63, 329.63],
      [87.31,  220.00, 261.63, 329.63],
      [98.00,  261.63, 293.66, 392.00]
    ];

    let currentChordIndex = 0;
    const chordDuration = 5.5; // 1コードあたり5.5秒でゆったり推移

    const playNextChord = () => {
      if (!this.isAmbientPlaying || !this.ctx) return;

      const t = this.ctx.currentTime;
      const freqs = chordProgression[currentChordIndex];
      currentChordIndex = (currentChordIndex + 1) % chordProgression.length;

      // 4声の和音をそれぞれフェードイン＆フェードアウト
      freqs.forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        // 優しい丸みのあるサイン波
        osc.type = 'sine';
        // わずかなデチューンで豊かなコーラス感
        const detune = (i % 2 === 0 ? 1 : -1) * 3.5;
        osc.frequency.setValueAtTime(freq, t);
        osc.detune.setValueAtTime(detune, t);

        const targetVol = 0.09 / (1 + i * 0.25);
        gain.gain.setValueAtTime(0.0001, t);
        // 1.8秒かけてゆったりフェードイン
        gain.gain.linearRampToValueAtTime(targetVol, t + 1.8);
        // 終盤で滑らかにフェードアウト
        gain.gain.setValueAtTime(targetVol, t + chordDuration - 1.5);
        gain.gain.linearRampToValueAtTime(0.0001, t + chordDuration + 0.5);

        osc.connect(gain);
        gain.connect(this.ambientFilter);

        osc.start(t);
        osc.stop(t + chordDuration + 0.6);

        this.ambientOscillators.push({ osc, gain });
      });

      // 偶数コードで時折そっと鳴る柔らかい高音チャイム（星の煌めき）
      if (Math.random() < 0.75) {
        const bellNotes = [523.25, 659.25, 783.99, 987.77]; // C5, E5, G5, B5
        const bellFreq = bellNotes[Math.floor(Math.random() * bellNotes.length)];
        const bellDelay = 1.2 + Math.random() * 2.0;

        const bellOsc = this.ctx.createOscillator();
        const bellGain = this.ctx.createGain();
        bellOsc.type = 'sine';
        bellOsc.frequency.setValueAtTime(bellFreq, t + bellDelay);

        bellGain.gain.setValueAtTime(0.0001, t);
        bellGain.gain.setValueAtTime(0.035, t + bellDelay);
        bellGain.gain.exponentialRampToValueAtTime(0.0001, t + bellDelay + 2.2);

        bellOsc.connect(bellGain);
        bellGain.connect(this.ambientFilter);

        bellOsc.start(t + bellDelay);
        bellOsc.stop(t + bellDelay + 2.3);

        this.ambientOscillators.push({ osc: bellOsc, gain: bellGain });
      }

      // 古い不要ノードを配列からクリーンアップ
      this.ambientOscillators = this.ambientOscillators.filter(item => {
        try {
          return item.gain && item.gain.gain;
        } catch(e) {
          return false;
        }
      });
    };

    // 初回演奏
    playNextChord();

    // 継続的ループ
    this.ambientTimer = setInterval(playNextChord, chordDuration * 1000 - 400); // 400msクロスフェード
    this.isAmbientPlaying = true;
  }

  stopAmbientDrone() {
    if (!this.isAmbientPlaying) return;

    if (this.ambientTimer) {
      clearInterval(this.ambientTimer);
      this.ambientTimer = null;
    }

    const t = this.ctx ? this.ctx.currentTime : 0;
    this.ambientOscillators.forEach(({ osc, gain }) => {
      try {
        if (gain) {
          gain.gain.setValueAtTime(gain.gain.value, t);
          gain.gain.linearRampToValueAtTime(0.0001, t + 1.2);
        }
        if (osc) {
          osc.stop(t + 1.3);
        }
      } catch (e) {}
    });

    this.ambientOscillators = [];
    this.ambientFilter = null;
    this.isAmbientPlaying = false;
  }

  /**
   * カスタム音楽ファイルの再生
   */
  playCustomBgm(fileOrUrl) {
    this.stopAmbientDrone();
    if (this.customAudio) {
      this.customAudio.pause();
    }

    if (fileOrUrl instanceof File) {
      const url = URL.createObjectURL(fileOrUrl);
      this.customAudio.src = url;
    } else if (typeof fileOrUrl === 'string') {
      this.customAudio.src = fileOrUrl;
    }

    if (this.bgmEnabled) {
      this.customAudio.play().then(() => {
        this.isCustomBgmActive = true;
      }).catch(e => {
        console.warn('Custom audio playback blocked or error:', e);
      });
    }
  }

  stopCustomBgm() {
    if (this.customAudio) {
      this.customAudio.pause();
      this.isCustomBgmActive = false;
    }
  }

  toggleBgm(enabled) {
    this.bgmEnabled = (typeof enabled === 'boolean') ? enabled : !this.bgmEnabled;
    if (this.bgmEnabled) {
      if (this.isCustomBgmActive && this.customAudio.src) {
        this.customAudio.play().catch(() => {});
      } else {
        this.startAmbientDrone();
      }
    } else {
      this.stopAmbientDrone();
      if (this.customAudio) this.customAudio.pause();
    }
    return this.bgmEnabled;
  }

  setBgmVolume(val) {
    this.bgmVolume = Math.max(0, Math.min(1, val));
    if (this.bgmGain && this.ctx) {
      this.bgmGain.gain.setValueAtTime(this.bgmVolume, this.ctx.currentTime);
    }
  }

  setSfxVolume(val) {
    this.sfxVolume = Math.max(0, Math.min(1, val));
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
    }
  }
}

// グローバルインスタンス化
window.xmbSound = new XMBSoundEngine();
