/**
 * PS3 Dynamic Silk Wave & Stardust Particle Visualizer
 * Accurately replicates the PS3 Firmware 3.00 aesthetic with multi-layered bezier waves and twinkling particles.
 */
class XMBWaveEngine {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');

    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.time = 0;
    this.speed = 0.008;
    this.impulse = 0; // ナビゲーション移動時の波の揺らめきリアクション

    // カラーパレット
    this.currentTheme = 'purple';
    this.themes = {
      purple: {
        bgTop: '#1b0933',
        bgMid: '#0d041c',
        bgBot: '#05010b',
        waveColors: [
          'rgba(192, 132, 252, 0.14)',
          'rgba(232, 121, 249, 0.10)',
          'rgba(168, 85, 247, 0.18)',
          'rgba(255, 255, 255, 0.22)',
          'rgba(147, 51, 234, 0.12)'
        ],
        particleColor: '230, 200, 255'
      },
      blue: {
        bgTop: '#032b4d',
        bgMid: '#02182c',
        bgBot: '#010912',
        waveColors: [
          'rgba(56, 189, 248, 0.16)',
          'rgba(14, 165, 233, 0.12)',
          'rgba(96, 165, 250, 0.18)',
          'rgba(255, 255, 255, 0.25)',
          'rgba(2, 132, 199, 0.12)'
        ],
        particleColor: '200, 240, 255'
      },
      emerald: {
        bgTop: '#023326',
        bgMid: '#011c15',
        bgBot: '#000a07',
        waveColors: [
          'rgba(52, 211, 153, 0.16)',
          'rgba(16, 185, 129, 0.12)',
          'rgba(110, 231, 183, 0.20)',
          'rgba(255, 255, 255, 0.22)',
          'rgba(5, 150, 105, 0.12)'
        ],
        particleColor: '210, 255, 235'
      },
      space: {
        bgTop: '#13112c',
        bgMid: '#080811',
        bgBot: '#020204',
        waveColors: [
          'rgba(148, 163, 184, 0.14)',
          'rgba(203, 213, 225, 0.12)',
          'rgba(241, 245, 249, 0.18)',
          'rgba(255, 255, 255, 0.25)',
          'rgba(100, 116, 139, 0.10)'
        ],
        particleColor: '255, 255, 255'
      },
      ruby: {
        bgTop: '#4a0e20',
        bgMid: '#260610',
        bgBot: '#0d0105',
        waveColors: [
          'rgba(251, 113, 133, 0.16)',
          'rgba(244, 63, 94, 0.12)',
          'rgba(225, 29, 72, 0.18)',
          'rgba(255, 255, 255, 0.22)',
          'rgba(190, 18, 60, 0.10)'
        ],
        particleColor: '255, 210, 225'
      },
      gold: {
        bgTop: '#452605',
        bgMid: '#241302',
        bgBot: '#0a0501',
        waveColors: [
          'rgba(251, 191, 36, 0.16)',
          'rgba(245, 158, 11, 0.12)',
          'rgba(252, 211, 77, 0.20)',
          'rgba(255, 255, 255, 0.24)',
          'rgba(217, 119, 6, 0.10)'
        ],
        particleColor: '255, 245, 205'
      }
    };

    // スターダスト・パーティクル
    this.particleCount = 75;
    this.particles = [];

    // 波の定義（5本の重なり合う半透明シルクリボン）
    this.waveLayers = [
      { yRatio: 0.52, amp: 55, freq: 0.0018, speed: 0.012, phase: 0 },
      { yRatio: 0.48, amp: 70, freq: 0.0014, speed: 0.009, phase: 1.8 },
      { yRatio: 0.55, amp: 85, freq: 0.0012, speed: 0.007, phase: 3.4 },
      { yRatio: 0.50, amp: 40, freq: 0.0022, speed: 0.015, phase: 4.8 },
      { yRatio: 0.46, amp: 65, freq: 0.0016, speed: 0.010, phase: 2.5 }
    ];

    this.showWavesOnCustomWallpaper = true;
    this.hasCustomWallpaper = false;

    this.init();
  }

  init() {
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.createParticles();
    this.animate();
  }

  resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
  }

  createParticles() {
    this.particles = [];
    for (let i = 0; i < this.particleCount; i++) {
      this.particles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        radius: Math.random() * 1.8 + 0.6,
        alpha: Math.random() * 0.7 + 0.2,
        twinkleSpeed: Math.random() * 0.03 + 0.01,
        twinklePhase: Math.random() * Math.PI * 2,
        vx: (Math.random() - 0.5) * 0.25,
        vy: -Math.random() * 0.35 - 0.05
      });
    }
  }

  setParticleCount(count) {
    this.particleCount = Math.max(0, Math.min(200, count));
    this.createParticles();
  }

  setTheme(themeName) {
    if (this.themes[themeName]) {
      this.currentTheme = themeName;
      document.body.className = `theme-${themeName}`;
    }
  }

  triggerImpulse() {
    // ナビゲーション入力時にウェーブを少し跳ねさせる
    this.impulse = Math.min(this.impulse + 22, 45);
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    this.time += this.speed;
    if (this.impulse > 0.01) {
      this.impulse *= 0.94; // 減衰
    } else {
      this.impulse = 0;
    }

    this.render();
  }

  render() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const theme = this.themes[this.currentTheme] || this.themes.purple;

    ctx.clearRect(0, 0, w, h);

    // 1. 背景グラデーション（カスタム壁紙時は透過させる）
    if (!this.hasCustomWallpaper) {
      const bgGrad = ctx.createRadialGradient(
        w * 0.65, h * 0.38, 50,
        w * 0.5, h * 0.5, Math.max(w, h) * 0.85
      );
      bgGrad.addColorStop(0, theme.bgTop);
      bgGrad.addColorStop(0.55, theme.bgMid);
      bgGrad.addColorStop(1, theme.bgBot);

      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);
    }

    // 壁紙設定時にウェーブを重ねない設定ならスキップ
    if (this.hasCustomWallpaper && !this.showWavesOnCustomWallpaper) {
      return;
    }

    // 2. スターダスト・パーティクルの描画
    ctx.save();
    for (let p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.twinklePhase += p.twinkleSpeed;

      // 画面ループ
      if (p.x < 0) p.x = w;
      if (p.x > w) p.x = 0;
      if (p.y < 0) p.y = h;
      if (p.y > h) p.y = 0;

      const currentAlpha = Math.max(0.05, p.alpha * (0.6 + 0.4 * Math.sin(p.twinklePhase)));
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${theme.particleColor}, ${currentAlpha})`;
      ctx.shadowBlur = p.radius * 4;
      ctx.shadowColor = `rgba(${theme.particleColor}, ${currentAlpha})`;
      ctx.fill();
    }
    ctx.restore();

    // 3. PS3 シルクリボン・ウェーブの描画
    // サイン波を滑らかなベジェ曲線で描画し、波と波が交差する美しいリボンを作る
    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    const step = 28; // 横分割ステップ

    this.waveLayers.forEach((layer, layerIdx) => {
      const baseY = h * layer.yRatio;
      const amp = layer.amp + this.impulse;
      const waveColor = theme.waveColors[layerIdx % theme.waveColors.length];

      ctx.beginPath();

      // 波の上端ライン
      let points = [];
      for (let x = -step; x <= w + step * 2; x += step) {
        const y = baseY +
          Math.sin(x * layer.freq + this.time * layer.speed * 40 + layer.phase) * amp +
          Math.cos(x * layer.freq * 0.5 - this.time * 0.4 + layer.phase) * (amp * 0.45);
        points.push({ x, y });
      }

      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length - 1; i++) {
        const xc = (points[i].x + points[i + 1].x) / 2;
        const yc = (points[i].y + points[i + 1].y) / 2;
        ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
      }

      // 画面下部まで帯状に閉じる
      ctx.lineTo(w + step, h + 100);
      ctx.lineTo(-step, h + 100);
      ctx.closePath();

      // 半透明グラデーション塗りつぶし
      const grad = ctx.createLinearGradient(0, baseY - amp, 0, baseY + amp * 2.2);
      grad.addColorStop(0, waveColor);
      grad.addColorStop(0.5, waveColor.replace(/[\d\.]+\)$/, '0.04)'));
      grad.addColorStop(1, 'rgba(0,0,0,0)');

      ctx.fillStyle = grad;
      ctx.fill();

      // 鮮明な光沢エッジライン（リボンの稜線）
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length - 1; i++) {
        const xc = (points[i].x + points[i + 1].x) / 2;
        const yc = (points[i].y + points[i + 1].y) / 2;
        ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
      }
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.28 + (layerIdx === 3 ? 0.35 : 0)})`;
      ctx.stroke();
    });

    ctx.restore();
  }
}

// グローバルインスタンス化
window.xmbWave = new XMBWaveEngine('bg-canvas');
