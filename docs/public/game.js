/* =========================================================
   BIOQUEST — FABIOLOGIA
   Versão 2.5D — Phaser 3
   ========================================================= */

const WIDTH = 1280;
const HEIGHT = 720;
const WORLD_WIDTH = 2560;
const GROUND_TOP = 665;
const JUMP_SPEED = 560;

const MAX_ENERGY = 100;
const MAX_LIVES = 5;
const START_AMMO = 5;
const SHIELD_MS = 6000;

const TERMINAL_XS = [450, 1330, 1900];

const WORLDS = [
  {
    name: "FLORESTA DA ECOLOGIA",
    color: 0x91d9a2,
    tint: 0xffffff,
    weapon: "SEMENTES",
    shotTint: 0xb6ff6b,
    questions: [
      {
        q: "Qual relação ecológica ocorre quando um organismo captura outro para se alimentar?",
        a: ["Mutualismo", "Predatismo", "Comensalismo", "Inquilinismo"],
        c: 1,
        e: "No predatismo, um organismo captura e consome outro."
      },
      {
        q: "Os produtores de uma cadeia alimentar são geralmente:",
        a: ["Fungos", "Carnívoros", "Autotróficos", "Decompositores"],
        c: 2,
        e: "Os produtores fabricam matéria orgânica, geralmente por fotossíntese."
      },
      {
        q: "O que acontece com a energia ao longo da cadeia alimentar?",
        a: ["Aumenta", "É totalmente reciclada", "Parte é dissipada como calor", "Permanece constante"],
        c: 2,
        e: "Parte da energia é dissipada como calor em cada nível trófico."
      }
    ]
  },
  {
    name: "INVASÃO VIRAL",
    color: 0x263e75,
    tint: 0xb8a8ff,
    weapon: "ANTICORPOS",
    shotTint: 0x7fd0ff,
    questions: [
      {
        q: "Os vírus dependem de células hospedeiras porque:",
        a: ["Produzem seu próprio ATP", "Precisam da maquinaria celular para se reproduzir", "Possuem núcleo", "Realizam fotossíntese"],
        c: 1,
        e: "Os vírus são parasitas intracelulares obrigatórios."
      },
      {
        q: "A vacinação estimula:",
        a: ["A memória imunológica", "A digestão", "A produção de hemácias", "A coagulação"],
        c: 0,
        e: "A vacinação estimula a formação de células de memória."
      },
      {
        q: "Os antibióticos atuam principalmente contra:",
        a: ["Vírus", "Bactérias", "Príons", "Protozoários"],
        c: 1,
        e: "Antibióticos são utilizados contra infecções bacterianas."
      }
    ]
  },
  {
    name: "LABORATÓRIO CELULAR",
    color: 0x34436f,
    tint: 0x9fe8ff,
    weapon: "ENZIMAS",
    shotTint: 0xff9df0,
    questions: [
      {
        q: "Qual organela está relacionada à produção de ATP?",
        a: ["Lisossomo", "Mitocôndria", "Ribossomo", "Centríolo"],
        c: 1,
        e: "A mitocôndria participa da respiração celular."
      },
      {
        q: "A síntese de proteínas ocorre nos:",
        a: ["Ribossomos", "Lisossomos", "Vacúolos", "Centríolos"],
        c: 0,
        e: "Os ribossomos realizam a síntese proteica."
      },
      {
        q: "O DNA é formado por unidades chamadas:",
        a: ["Aminoácidos", "Lipídios", "Nucleotídeos", "Glicídios"],
        c: 2,
        e: "Os nucleotídeos formam a molécula de DNA."
      }
    ]
  }
];

/* =========================================================
   ÁUDIO
   ========================================================= */

const SFX = {
  ctx: null,
  master: null,
  muted: false,
  timer: null,
  onMute: null,

  init() {
    if (this.ctx) return;

    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;

      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.7;
      this.master.connect(this.ctx.destination);

      try {
        this.muted = localStorage.getItem("bioquest_muted") === "1";
        this.master.gain.value = this.muted ? 0 : 0.7;
      } catch (e) {}

      const unlock = () => this.unlock();

      ["pointerdown", "keydown", "touchend"].forEach(event => {
        window.addEventListener(event, unlock, { passive: true });
      });
    } catch (e) {
      console.warn("Áudio indisponível:", e);
    }
  },

  unlock() {
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  },

  tone(freq, duration = 0.12, type = "sine", volume = 0.08, delay = 0) {
    if (!this.ctx || this.muted || this.ctx.state !== "running") return;

    const now = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(this.master);

    osc.start(now);
    osc.stop(now + duration + 0.03);
  },

  play(name) {
    if (!this.ctx || this.muted) return;

    const notes = {
      jump: [280, 640],
      coin: [988, 1319],
      energy: [523, 659, 784],
      ammo: [420, 620],
      life: [523, 659, 784, 1047],
      shield: [300, 900, 1400],
      shoot: [520, 350],
      empty: [130],
      enemyHit: [220],
      stomp: [180, 90],
      enemyDie: [420, 220],
      hurt: [320, 160],
      death: [440, 370, 311, 247],
      terminal: [660, 880],
      click: [600],
      correct: [523, 659, 784, 1047],
      wrong: [220, 165],
      portal: [392, 494, 587, 784, 988],
      world: [523, 659, 784, 1047],
      victory: [523, 659, 784, 1047, 1319],
      gameover: [392, 330, 262]
    };

    const list = notes[name] || [440];

    list.forEach((freq, i) => {
      this.tone(freq, 0.16, "triangle", 0.08, i * 0.09);
    });
  },

  startMusic(index) {
    this.stopMusic();

    const melodies = [
      [392, 440, 523, 659, 523, 440, 392, 330],
      [220, 262, 311, 370, 311, 262, 220, 196],
      [330, 392, 440, 523, 440, 392, 330, 262]
    ];

    const melody = melodies[index] || melodies[0];
    let step = 0;

    this.timer = setInterval(() => {
      if (!this.muted) {
        this.tone(melody[step % melody.length], 0.18, "triangle", 0.025);
      }
      step++;
    }, 260);
  },

  stopMusic() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  },

  toggleMute() {
    this.muted = !this.muted;

    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(
          this.muted ? 0 : 0.7,
          this.ctx.currentTime,
          0.03
      );
    }

    try {
      localStorage.setItem("bioquest_muted", this.muted ? "1" : "0");
    } catch (e) {}

    if (this.onMute) this.onMute();
  }
};

/* =========================================================
   CENA PRINCIPAL
   ========================================================= */

class BioQuest extends Phaser.Scene {

  constructor() {
    super("BioQuest");
  }

  init(data = {}) {
    this.worldIndex = data.worldIndex ?? 0;
    this.score = data.score ?? 0;
    this.lives = data.lives ?? 3;
    this.coins = data.coins ?? 0;
    this.energy = data.energy ?? MAX_ENERGY;
    this.ammo = data.ammo ?? START_AMMO;

    this.questionIndex = 0;
    this.answered = 0;

    this.started = false;
    this.quizOpen = false;
    this.finished = false;
    this.resultShown = false;

    this.invulnUntil = 0;
    this.hurtUntil = 0;
    this.knockUntil = 0;
    this.shieldUntil = 0;
    this.nextShot = 0;
    this.toastCooldown = 0;
    this.ammoToastAt = 0;
    this.facing = 1;

    this.touch = {
      left: false,
      right: false,
      crouch: false
    };

    this.jumpRequested = false;
    this.interactRequested = false;
    this.fireRequested = false;

    this.quizObjects = [];
    this.quizKeyHandler = null;
    this.toastText = null;

    this.decorations = [];
  }

  preload() {
    this.load.spritesheet(
        "fabiologia",
        "assets/personagem/fabiologia_spritesheet.png",
        {
          frameWidth: 384,
          frameHeight: 512
        }
    );
  }

  create() {
    this.world = WORLDS[this.worldIndex];
    this.isTouch = !!this.sys.game.device.input.touch;

    SFX.init();

    if (this.input.mouse) {
      this.input.mouse.disableContextMenu();
    }

    this.physics.world.setBounds(0, 0, WORLD_WIDTH, HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, HEIGHT);

    this.hasSprite =
        this.textures.exists("fabiologia") &&
        this.textures.get("fabiologia").frameTotal >= 8;

    this.createBackground();
    this.createTextures();
    this.createLevel();
    this.createPlayer();
    this.createAnimations();
    this.createControls();
    this.createHUD();
    this.createCollisions();
    this.createStartScreen();

    this.cameras.main.startFollow(
        this.player,
        true,
        0.08,
        0.08
    );

    this.cameras.main.setDeadzone(260, 150);
  }

  /* =======================================================
     CENÁRIO 2.5D
     ======================================================= */

  createBackground() {
    this.cameras.main.setBackgroundColor(this.world.color);

    const bg = this.add.graphics();

    bg.fillGradientStyle(
        this.world.color,
        this.world.color,
        0x477d8c,
        0x244d56,
        1
    );

    bg.fillRect(0, 0, WORLD_WIDTH, HEIGHT);

    bg.setDepth(-100);
    bg.setScrollFactor(0.05);

    this.createSkyDetails();
    this.createFarMountains();
    this.createFarForest();
    this.createMiddleForest();
    this.createNearForest();
    this.createAtmosphere();

    if (this.worldIndex === 0) {
      this.createRiverAndWaterfall();
    } else {
      this.createWorldParticles();
    }
  }

  createSkyDetails() {
    const g = this.add.graphics();
    g.setScrollFactor(0.08);
    g.setDepth(-95);

    if (this.worldIndex === 0) {
      g.fillStyle(0xfff2b0, 0.8);
      g.fillCircle(1080, 130, 65);

      g.fillStyle(0xfff7ce, 0.25);
      g.fillCircle(1080, 130, 95);

      for (let i = 0; i < 18; i++) {
        const x = Phaser.Math.Between(50, WORLD_WIDTH);
        const y = Phaser.Math.Between(60, 250);

        g.fillStyle(0xffffff, 0.18);
        g.fillEllipse(x, y, 100, 28);
        g.fillEllipse(x + 30, y - 10, 65, 30);
      }
    } else {
      for (let i = 0; i < 100; i++) {
        g.fillStyle(0xffffff, Phaser.Math.FloatBetween(0.2, 0.8));
        g.fillCircle(
            Phaser.Math.Between(0, WORLD_WIDTH),
            Phaser.Math.Between(20, 500),
            Phaser.Math.Between(1, 3)
        );
      }
    }
  }

  createFarMountains() {
    const g = this.add.graphics();
    g.setScrollFactor(0.12);
    g.setDepth(-90);

    for (let x = 0; x < WORLD_WIDTH + 300; x += 300) {
      const height = Phaser.Math.Between(180, 290);

      g.fillStyle(
          this.worldIndex === 0 ? 0x709c86 : 0x46557d,
          0.55
      );

      g.fillTriangle(
          x,
          470,
          x + 150,
          470 - height,
          x + 300,
          470
      );

      g.fillStyle(0xffffff, 0.12);

      g.fillTriangle(
          x + 105,
          470 - height + 85,
          x + 150,
          470 - height,
          x + 195,
          470 - height + 85
      );
    }
  }

  createFarForest() {
    const g = this.add.graphics();
    g.setScrollFactor(0.18);
    g.setDepth(-80);

    for (let x = 0; x < WORLD_WIDTH + 150; x += 125) {
      const h = Phaser.Math.Between(120, 220);
      const r = Phaser.Math.Between(45, 75);

      g.fillStyle(0x234f43, 0.55);
      g.fillRect(x + 48, 450 - h / 2, 25, 220);

      g.fillStyle(0x38765a, 0.65);
      g.fillCircle(x + 60, 440 - h, r);

      g.fillStyle(0x55956c, 0.3);
      g.fillCircle(x + 42, 430 - h, r * 0.55);
    }
  }

  createMiddleForest() {
    const g = this.add.graphics();
    g.setScrollFactor(0.35);
    g.setDepth(-70);

    for (let x = 0; x < WORLD_WIDTH + 180; x += 180) {
      const h = Phaser.Math.Between(170, 270);

      g.fillStyle(0x204d38, 0.9);
      g.fillRoundedRect(x + 65, 430 - h / 2, 38, 250, 12);

      g.fillStyle(0x276744, 0.95);
      g.fillCircle(x + 80, 420 - h, 85);

      g.fillStyle(0x438b55, 0.75);
      g.fillCircle(x + 45, 440 - h, 55);

      g.fillStyle(0x5ca56a, 0.4);
      g.fillCircle(x + 110, 440 - h, 48);
    }
  }

  createNearForest() {
    const g = this.add.graphics();
    g.setScrollFactor(0.55);
    g.setDepth(-60);

    for (let x = 0; x < WORLD_WIDTH + 100; x += 95) {
      const h = Phaser.Math.Between(90, 155);

      g.fillStyle(0x153c2c, 0.85);
      g.fillRect(x + 35, 560 - h / 2, 20, 160);

      g.fillStyle(0x1d5838, 0.95);
      g.fillCircle(x + 45, 545 - h, 58);

      g.fillStyle(0x3c8a4b, 0.5);
      g.fillCircle(x + 25, 540 - h, 35);
    }
  }

  createAtmosphere() {
    const fog = this.add.graphics();
    fog.setScrollFactor(0.2);
    fog.setDepth(-50);

    for (let i = 0; i < 12; i++) {
      const x = i * 250;

      fog.fillStyle(0xe0ffe8, 0.055);
      fog.fillEllipse(x, 535, 320, 95);
    }

    if (this.worldIndex === 0) {
      for (let i = 0; i < 35; i++) {
        const x = Phaser.Math.Between(0, WORLD_WIDTH);
        const y = Phaser.Math.Between(100, 600);

        const light = this.add.circle(
            x,
            y,
            Phaser.Math.Between(2, 4),
            0xeaff8b,
            0.65
        );

        light.setDepth(-20);

        this.tweens.add({
          targets: light,
          y: y - Phaser.Math.Between(20, 70),
          alpha: 0.15,
          duration: Phaser.Math.Between(1800, 3500),
          yoyo: true,
          repeat: -1,
          delay: Phaser.Math.Between(0, 1500)
        });
      }
    }
  }

  createRiverAndWaterfall() {
    const river = this.add.graphics();
    river.setScrollFactor(0.4);
    river.setDepth(-40);

    river.fillStyle(0x164d6b, 0.7);
    river.fillEllipse(1260, 545, 1050, 180);

    river.fillStyle(0x2b8bb0, 0.65);
    river.fillEllipse(1260, 535, 900, 125);

    river.fillStyle(0x8be5ed, 0.3);
    river.fillEllipse(1260, 520, 650, 45);

    // Cachoeira ao fundo.
    const waterfall = this.add.graphics();
    waterfall.setScrollFactor(0.3);
    waterfall.setDepth(-35);

    waterfall.fillStyle(0x237fa0, 0.8);
    waterfall.fillRoundedRect(1160, 260, 210, 270, 35);

    waterfall.fillStyle(0x8be7f2, 0.65);
    waterfall.fillRoundedRect(1180, 265, 35, 255, 15);

    waterfall.fillStyle(0xffffff, 0.4);
    waterfall.fillRoundedRect(1240, 270, 22, 250, 10);

    waterfall.fillStyle(0x4bb4d0, 0.7);
    waterfall.fillRoundedRect(1290, 265, 40, 255, 15);

    // Espuma na base.
    waterfall.fillStyle(0xb4f4f5, 0.45);
    waterfall.fillEllipse(1260, 525, 300, 55);

    // Partículas da água.
    for (let i = 0; i < 28; i++) {
      const x = Phaser.Math.Between(1160, 1360);
      const y = Phaser.Math.Between(280, 540);

      const drop = this.add.rectangle(
          x,
          y,
          Phaser.Math.Between(2, 5),
          Phaser.Math.Between(10, 24),
          0xc5faff,
          0.7
      );

      drop.setDepth(-30);

      this.tweens.add({
        targets: drop,
        y: 545,
        alpha: 0.1,
        duration: Phaser.Math.Between(700, 1500),
        repeat: -1,
        delay: Phaser.Math.Between(0, 1300),
        onRepeat: () => {
          drop.y = Phaser.Math.Between(260, 330);
          drop.x = Phaser.Math.Between(1160, 1360);
          drop.alpha = 0.7;
        }
      });
    }

    // Ondas da superfície.
    for (let i = 0; i < 12; i++) {
      const wave = this.add.ellipse(
          850 + i * 75,
          535 + Math.sin(i) * 12,
          55,
          8,
          0xc6f8ff,
          0.35
      );

      wave.setDepth(-25);

      this.tweens.add({
        targets: wave,
        x: wave.x + 80,
        alpha: 0.05,
        duration: 2200,
        repeat: -1,
        yoyo: true,
        delay: i * 120
      });
    }
  }

  createWorldParticles() {
    for (let i = 0; i < 45; i++) {
      const particle = this.add.circle(
          Phaser.Math.Between(0, WORLD_WIDTH),
          Phaser.Math.Between(50, 600),
          Phaser.Math.Between(2, 5),
          this.worldIndex === 1 ? 0x91d7ff : 0xffaaff,
          0.55
      );

      particle.setDepth(-20);

      this.tweens.add({
        targets: particle,
        y: particle.y - Phaser.Math.Between(30, 100),
        alpha: 0.1,
        duration: Phaser.Math.Between(1500, 3000),
        yoyo: true,
        repeat: -1,
        delay: Phaser.Math.Between(0, 2000)
      });
    }
  }

  /* =======================================================
     TEXTURAS DO JOGO
     ======================================================= */

  createTextures() {
    const make = (name, w, h, draw) => {
      if (this.textures.exists(name)) return;

      const g = this.make.graphics({
        x: 0,
        y: 0,
        add: false
      });

      draw(g);
      g.generateTexture(name, w, h);
      g.destroy();
    };

    make("ground", 128, 32, g => {
      g.fillStyle(0x493c2b);
      g.fillRect(0, 0, 128, 32);

      g.fillStyle(0x326b42);
      g.fillRect(0, 0, 128, 12);

      g.fillStyle(0x79d66e);
      g.fillRect(0, 0, 128, 5);

      g.fillStyle(0x6e5b3d);
      for (let i = 0; i < 12; i++) {
        g.fillRect(i * 12, 15 + (i % 3) * 4, 7, 3);
      }
    });

    make("platform", 150, 30, g => {
      g.fillStyle(0x354b40);
      g.fillRoundedRect(0, 5, 150, 25, 6);

      g.fillStyle(0x647c57);
      g.fillRoundedRect(0, 0, 150, 13, 6);

      g.fillStyle(0x9ad875);
      g.fillRoundedRect(0, 0, 150, 5, 3);

      g.fillStyle(0x304b39);
      g.fillRect(12, 15, 20, 4);
      g.fillRect(70, 18, 30, 4);
      g.fillRect(120, 14, 18, 4);
    });

    make("coin", 32, 32, g => {
      g.fillStyle(0xb77b10);
      g.fillCircle(16, 17, 14);

      g.fillStyle(0xffd12e);
      g.fillCircle(16, 15, 13);

      g.lineStyle(3, 0xffffff);
      g.strokeCircle(16, 15, 9);

      g.fillStyle(0xfff5a1);
      g.fillCircle(11, 10, 3);
    });

    make("enemy", 48, 48, g => {
      g.fillStyle(0x8d283f);
      g.fillCircle(24, 26, 21);

      g.fillStyle(0xe54e64);
      g.fillCircle(24, 22, 20);

      g.fillStyle(0xffffff);
      g.fillCircle(17, 18, 5);
      g.fillCircle(31, 18, 5);

      g.fillStyle(0x111111);
      g.fillCircle(17, 18, 2);
      g.fillCircle(31, 18, 2);

      g.fillStyle(0x772438);
      g.fillEllipse(24, 33, 18, 5);
    });

    make("flyer", 56, 44, g => {
      g.fillStyle(0x5b369f);
      g.fillTriangle(0, 8, 22, 22, 6, 36);
      g.fillTriangle(56, 8, 34, 22, 50, 36);

      g.fillStyle(0xa66bff);
      g.fillCircle(28, 24, 16);

      g.fillStyle(0xffffff);
      g.fillCircle(22, 20, 4);
      g.fillCircle(34, 20, 4);

      g.fillStyle(0x111111);
      g.fillCircle(22, 20, 2);
      g.fillCircle(34, 20, 2);
    });

    make("spike", 32, 34, g => {
      g.fillStyle(0x9cabb0);
      g.fillTriangle(0, 34, 16, 0, 32, 34);

      g.fillStyle(0xffffff);
      g.fillTriangle(9, 27, 16, 5, 22, 27);
    });

    make("portal", 80, 96, g => {
      g.fillStyle(0x50f5d7, 0.25);
      g.fillEllipse(40, 48, 70, 90);

      g.lineStyle(8, 0x50f5d7);
      g.strokeEllipse(40, 48, 52, 80);

      g.lineStyle(3, 0xffffff, 0.7);
      g.strokeEllipse(40, 48, 35, 65);
    });

    make("terminal", 64, 70, g => {
      g.fillStyle(0x102d3c);
      g.fillRoundedRect(3, 3, 58, 64, 7);

      g.fillStyle(0x6ce8cf);
      g.fillRoundedRect(11, 11, 42, 34, 4);

      g.fillStyle(0x193d4b);
      g.fillRect(17, 18, 30, 3);
      g.fillRect(17, 26, 23, 3);
    });

    make("shot", 16, 16, g => {
      g.fillStyle(0xffffff);
      g.fillCircle(8, 8, 7);
      g.lineStyle(2, 0x222222);
      g.strokeCircle(8, 8, 7);
    });

    make("energy", 32, 32, g => {
      g.fillStyle(0x3ddc84);
      g.fillCircle(16, 16, 15);
      g.lineStyle(2, 0xffffff);
      g.strokeCircle(16, 16, 15);
      g.fillStyle(0xffffff);
      g.fillRect(13, 7, 6, 18);
      g.fillRect(7, 13, 18, 6);
    });

    make("heart", 32, 32, g => {
      g.fillStyle(0xff5c7a);
      g.fillCircle(10, 11, 8);
      g.fillCircle(22, 11, 8);
      g.fillTriangle(3, 15, 29, 15, 16, 30);
    });

    make("ammo", 32, 32, g => {
      g.fillStyle(0xffb347);
      g.fillRoundedRect(2, 6, 28, 22, 4);
      g.lineStyle(2, 0x7a4a00);
      g.strokeRoundedRect(2, 6, 28, 22, 4);
      g.fillStyle(0xffffff);
      g.fillTriangle(18, 8, 9, 19, 16, 19);
      g.fillTriangle(14, 26, 23, 15, 16, 15);
    });

    make("shield", 32, 32, g => {
      g.fillStyle(0x4fc3f7);
      g.fillRect(4, 3, 24, 14);
      g.fillTriangle(4, 16, 28, 16, 16, 30);
      g.lineStyle(2, 0xffffff);
      g.strokeRect(4, 3, 24, 14);
    });
  }

  /* =======================================================
     FASE
     ======================================================= */

  createLevel() {
    this.platforms = this.physics.add.staticGroup();
    this.hazards = this.physics.add.staticGroup();
    this.terminals = this.physics.add.staticGroup();

    this.enemies = this.physics.add.group();
    this.flyers = this.physics.add.group({
      allowGravity: false
    });

    this.shots = this.physics.add.group({
      allowGravity: false
    });

    this.pickups = this.physics.add.group({
      allowGravity: false,
      immovable: true
    });

    this.coinsGroup = this.physics.add.group({
      allowGravity: false,
      immovable: true
    });

    // Chão principal.
    this.ground = this.add.tileSprite(
        WORLD_WIDTH / 2,
        681,
        WORLD_WIDTH,
        32,
        "ground"
    );

    this.ground.setTint(this.world.tint);
    this.ground.setDepth(2);

    this.physics.add.existing(this.ground, true);

    // Plataformas.
    [
      [330, 550],
      [560, 460],
      [790, 535],
      [1020, 445],
      [1260, 520],
      [1480, 455],
      [1710, 535],
      [1940, 445],
      [2180, 520]
    ].forEach(([x, y]) => {
      const platform = this.platforms.create(
          x,
          y,
          "platform"
      );

      platform.setTint(this.world.tint);
      platform.setDepth(4);
      platform.refreshBody();
    });

    this.createTerrainDecorations();

    // Moedas.
    [
      [430, 500],
      [650, 410],
      [890, 480],
      [1110, 400],
      [1360, 470],
      [1590, 410],
      [1830, 480],
      [2070, 400],
      [2290, 465],
      [180, 640],
      [1120, 640],
      [1650, 640],
      [2300, 640]
    ].forEach(([x, y]) => {
      const coin = this.coinsGroup.create(x, y, "coin");

      coin.body.setAllowGravity(false);
      coin.setDepth(8);

      this.tweens.add({
        targets: coin,
        y: y - 9,
        duration: 600,
        yoyo: true,
        repeat: -1
      });
    });

    // Itens.
    [
      ["ammo", 250, 635],
      ["ammo", 330, 505],
      ["energy", 560, 415],
      ["shield", 790, 490],
      ["ammo", 1020, 400],
      ["energy", 1050, 635],
      ["energy", 1260, 475],
      ["heart", 1480, 410],
      ["ammo", 1710, 490],
      ["energy", 1940, 400],
      ["ammo", 2000, 635],
      ["shield", 2180, 475],
      ["energy", 2380, 635]
    ].forEach(([type, x, y]) => {
      this.spawnPickup(type, x, y);
    });

    // Espinhos.
    [720, 1210, 1780].forEach(x => {
      const spike = this.hazards.create(
          x,
          GROUND_TOP - 17,
          "spike"
      );

      spike.setDepth(6);
      spike.refreshBody();
    });

    // Inimigos.
    [650, 900, 1130, 1530, 1700, 2110, 2330].forEach(x => {
      this.spawnWalker(x);
    });

    [[760, 330], [1400, 300], [2050, 320]].forEach(([x, y]) => {
      this.spawnFlyer(x, y);
    });

    // Terminais.
    this.totalChallenges = TERMINAL_XS.length;

    TERMINAL_XS.forEach(x => {
      const terminal = this.terminals.create(
          x,
          GROUND_TOP - 35,
          "terminal"
      );

      terminal.setDepth(7);
      terminal.refreshBody();
      terminal.setData("used", false);

      const label = this.add.text(
          x,
          GROUND_TOP - 95,
          "[E] DESAFIO",
          {
            fontSize: "14px",
            color: "#ffffff",
            backgroundColor: "#092b35",
            padding: { x: 6, y: 3 },
            fontStyle: "bold"
          }
      );

      label.setOrigin(0.5);
      label.setDepth(9);

      terminal.setData("label", label);
    });

    // Portal.
    this.portalOpen = false;

    this.portal = this.physics.add.staticImage(
        2460,
        GROUND_TOP - 48,
        "portal"
    );

    this.portal.setAlpha(0.3);
    this.portal.setDepth(8);
    this.portal.refreshBody();

    this.portalLabel = this.add.text(
        2460,
        GROUND_TOP - 120,
        "BLOQUEADO",
        {
          fontSize: "14px",
          color: "#ffe16a",
          backgroundColor: "#092b35",
          padding: { x: 6, y: 3 }
        }
    );

    this.portalLabel.setOrigin(0.5);
    this.portalLabel.setDepth(9);
  }

  createTerrainDecorations() {
    const g = this.add.graphics();
    g.setDepth(3);

    for (let x = 40; x < WORLD_WIDTH; x += 85) {
      const h = Phaser.Math.Between(10, 25);

      // Pedras.
      g.fillStyle(0x526b52, 0.9);
      g.fillEllipse(x, 652, h * 1.6, h);

      g.fillStyle(0x9bb18b, 0.45);
      g.fillEllipse(x - 3, 648, h, h * 0.5);

      // Pequenas plantas.
      if (x % 170 === 40) {
        g.lineStyle(3, 0x2a7442, 1);
        g.lineBetween(x + 30, 653, x + 25, 635);
        g.lineBetween(x + 30, 653, x + 40, 632);

        g.fillStyle(0x68bd61);
        g.fillEllipse(x + 22, 637, 13, 7);
        g.fillEllipse(x + 43, 634, 13, 7);
      }
    }

    // Pedras grandes ao longo do caminho.
    for (let i = 0; i < 12; i++) {
      const x = i * 215 + 80;

      g.fillStyle(0x455c4c);
      g.fillEllipse(x, 648, 45, 28);

      g.fillStyle(0x81957a, 0.65);
      g.fillEllipse(x - 8, 641, 22, 10);
    }
  }

  spawnPickup(type, x, y) {
    const item = this.pickups.create(x, y, type);

    item.body.setAllowGravity(false);
    item.setData("type", type);
    item.setDepth(9);

    this.tweens.add({
      targets: item,
      y: y - 8,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });

    return item;
  }

  spawnWalker(x) {
    const speed = 60 + this.worldIndex * 18;
    const strong = this.worldIndex > 0;

    const enemy = this.enemies.create(
        x,
        GROUND_TOP - 24,
        "enemy"
    );

    enemy.setBounce(0);
    enemy.setVelocityX(speed);
    enemy.setCollideWorldBounds(true);
    enemy.setDepth(9);

    enemy.setData({
      type: "walker",
      left: x - 100,
      right: x + 100,
      speed,
      hp: strong ? 2 : 1,
      dmg: 20,
      tint: strong ? 0xff9a5c : 0
    });

    if (strong) enemy.setTint(0xff9a5c);
  }

  spawnFlyer(x, y) {
    const flyer = this.flyers.create(x, y, "flyer");

    flyer.body.setAllowGravity(false);

    const speed = 70 + this.worldIndex * 15;

    flyer.setVelocityX(speed);
    flyer.setDepth(9);

    flyer.setData({
      type: "flyer",
      left: x - 160,
      right: x + 160,
      baseY: y,
      phase: Math.random() * 6,
      amp: 40,
      speed,
      hp: 2,
      dmg: 15,
      tint: 0
    });
  }

  /* =======================================================
     PERSONAGEM
     ======================================================= */

  createPlayer() {
    if (this.hasSprite) {
      this.player = this.physics.add.sprite(
          100,
          560,
          "fabiologia",
          0
      );

      this.player.setScale(0.16);
      this.player.body.setSize(175, 350);
      this.player.body.setOffset(104, 105);
    } else {
      this.player = this.physics.add.sprite(
          100,
          560,
          "enemy"
      );

      this.player.setTint(0x6be58c);
    }

    this.player.setCollideWorldBounds(true);
    this.player.setDepth(10);
    this.player.setMaxVelocity(260, 800);
    this.player.setBounce(0);

    this.checkpointX = 100;
    this.checkpointY = 560;

    // Sombra no chão para reforçar profundidade.
    this.playerShadow = this.add.ellipse(
        100,
        655,
        55,
        15,
        0x071c16,
        0.35
    );

    this.playerShadow.setDepth(5);
  }

  createAnimations() {
    if (!this.hasSprite) return;

    const definitions = [
      ["idle", [0], 1, -1],
      ["run", [1, 2, 3], 10, -1],
      ["crouch", [4], 1, -1],
      ["jump", [5], 1, 0],
      ["hurt", [6], 1, 0],
      ["lookUp", [7], 1, -1]
    ];

    definitions.forEach(([key, frames, rate, repeat]) => {
      if (this.anims.exists(key)) return;

      this.anims.create({
        key,
        frames: this.anims.generateFrameNumbers(
            "fabiologia",
            { frames }
        ),
        frameRate: rate,
        repeat
      });
    });
  }

  /* =======================================================
     CONTROLES
     ======================================================= */

  createControls() {
    this.keys = this.input.keyboard.addKeys({
      left: "LEFT",
      right: "RIGHT",
      up: "UP",
      down: "DOWN",
      jump: "SPACE",
      a: "A",
      d: "D",
      e: "E",
      fire: "F",
      fire2: "X"
    });

    if (!this.isTouch) return;

    this.createTouchButton(
        85, 615, "◀",
        () => this.touch.left = true,
        () => this.touch.left = false,
        46
    );

    this.createTouchButton(
        215, 615, "▶",
        () => this.touch.right = true,
        () => this.touch.right = false,
        46
    );

    this.createTouchButton(
        150, 500, "↓",
        () => this.touch.crouch = true,
        () => this.touch.crouch = false,
        38
    );

    this.createTouchButton(
        1195, 605, "↑",
        () => this.jumpRequested = true,
        () => {},
        54
    );

    this.createTouchButton(
        1065, 630, "F",
        () => this.fireRequested = true,
        () => {},
        44
    );

    this.createTouchButton(
        1195, 480, "E",
        () => this.interactRequested = true,
        () => {},
        40
    );
  }

  createTouchButton(x, y, label, onDown, onUp, radius = 44) {
    const circle = this.add.circle(
        x,
        y,
        radius,
        0x092b35,
        0.75
    );

    circle.setStrokeStyle(2, 0x9de6d2);
    circle.setScrollFactor(0);
    circle.setDepth(100);
    circle.setInteractive();

    this.add.text(x, y, label, {
      fontSize: Math.round(radius * 0.85) + "px",
      color: "#ffffff",
      fontStyle: "bold"
    })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(101);

    circle.on("pointerdown", () => {
      onDown();
      circle.setFillStyle(0x287f70);
    });

    const release = () => {
      onUp();
      circle.setFillStyle(0x092b35, 0.75);
    };

    circle.on("pointerup", release);
    circle.on("pointerout", release);
    circle.on("pointerupoutside", release);
  }

  /* =======================================================
     HUD
     ======================================================= */

  createHUD() {
    this.hud = this.add.container(0, 0)
        .setScrollFactor(0)
        .setDepth(150);

    const bg = this.add.rectangle(
        640,
        42,
        1240,
        68,
        0x092b35,
        0.9
    );

    bg.setStrokeStyle(2, 0x70d9ad);

    this.hudTitle = this.add.text(
        25,
        10,
        this.world.name,
        {
          fontSize: "20px",
          color: "#ffffff",
          fontStyle: "bold"
        }
    );

    this.hudScore = this.add.text(
        650,
        10,
        "",
        {
          fontSize: "20px",
          color: "#ffe16a",
          fontStyle: "bold"
        }
    ).setOrigin(0.5, 0);

    this.hudLives = this.add.text(
        1130,
        10,
        "",
        {
          fontSize: "20px",
          color: "#ff8a9a",
          fontStyle: "bold"
        }
    ).setOrigin(0.5, 0);

    this.hudEnergyLabel = this.add.text(
        25,
        44,
        "ENERGIA",
        {
          fontSize: "16px",
          color: "#8ff0bb",
          fontStyle: "bold"
        }
    );

    this.hudBar = this.add.graphics();

    this.hudAmmo = this.add.text(
        650,
        44,
        "",
        {
          fontSize: "16px",
          color: "#ffb347",
          fontStyle: "bold"
        }
    ).setOrigin(0.5, 0);

    this.hudShield = this.add.text(
        1130,
        44,
        "",
        {
          fontSize: "16px",
          color: "#7fe9ff",
          fontStyle: "bold"
        }
    ).setOrigin(0.5, 0);

    this.hud.add([
      bg,
      this.hudTitle,
      this.hudScore,
      this.hudLives,
      this.hudEnergyLabel,
      this.hudBar,
      this.hudAmmo,
      this.hudShield
    ]);

    if (!this.isTouch) {
      this.add.text(
          640,
          695,
          "A/D ou ←/→ mover  |  ↑ ou ESPAÇO pular  |  F atirar  |  ↓ abaixar  |  E interagir  |  M som",
          {
            fontSize: "14px",
            color: "#ffffff",
            backgroundColor: "#092b35",
            padding: { x: 10, y: 5 }
          }
      )
          .setOrigin(0.5)
          .setScrollFactor(0)
          .setDepth(150);
    }

    this.createSystemButtons();
    this.updateHUD();
  }

  createSystemButtons() {
    const h = this.isTouch ? 44 : 30;

    const make = (y, label, callback) => {
      const rect = this.add.rectangle(
          1215,
          y,
          120,
          h,
          0x092b35,
          0.85
      );

      rect.setStrokeStyle(2, 0x70d9ad);
      rect.setScrollFactor(0);
      rect.setDepth(160);
      rect.setInteractive({ useHandCursor: true });

      const text = this.add.text(
          1215,
          y,
          label,
          {
            fontSize: "14px",
            color: "#ffffff",
            fontStyle: "bold"
          }
      );

      text.setOrigin(0.5);
      text.setScrollFactor(0);
      text.setDepth(161);

      rect.on("pointerdown", (pointer, x, y, event) => {
        if (event && event.stopPropagation) {
          event.stopPropagation();
        }

        callback();
      });

      return text;
    };

    this.soundTxt = make(
        112,
        "",
        () => SFX.toggleMute()
    );

    SFX.onMute = () => this.refreshSoundBtn();

    this.refreshSoundBtn();

    this.input.keyboard.on("keydown-M", () => {
      SFX.toggleMute();
    });

    if (this.scale.fullscreen && this.scale.fullscreen.available) {
      make(112 + h + 8, "TELA CHEIA", () => {
        if (this.scale.isFullscreen) {
          this.scale.stopFullscreen();
        } else {
          this.scale.startFullscreen();
        }
      });
    }
  }

  refreshSoundBtn() {
    if (this.soundTxt && this.soundTxt.active) {
      this.soundTxt.setText(
          SFX.muted ? "SOM: DESLIGADO" : "SOM: LIGADO"
      );
    }
  }

  updateHUD() {
    if (!this.hudScore) return;

    this.hudScore.setText(
        `PONTOS: ${this.score}  |  MOEDAS: ${this.coins}  |  DESAFIOS: ${this.answered}/${this.totalChallenges}`
    );

    this.hudLives.setText(
        "VIDAS: " + "♥ ".repeat(Math.max(0, this.lives))
    );

    this.hudAmmo.setText(
        `${this.world.weapon}: ${this.ammo}   (F atira)`
    );

    const shieldLeft = this.shieldUntil - this.time.now;

    this.hudShield.setText(
        shieldLeft > 0
            ? `ESCUDO ${Math.ceil(shieldLeft / 1000)}s`
            : ""
    );

    const ratio = Phaser.Math.Clamp(
        this.energy / MAX_ENERGY,
        0,
        1
    );

    const color =
        ratio > 0.5
            ? 0x3ddc84
            : ratio > 0.25
                ? 0xffd12e
                : 0xff5c5c;

    const x = 110;
    const y = 44;
    const w = 260;
    const h = 18;

    this.hudBar.clear();

    this.hudBar.fillStyle(0x0b1f28, 1);
    this.hudBar.fillRect(x, y, w, h);

    this.hudBar.fillStyle(color, 1);
    this.hudBar.fillRect(
        x + 2,
        y + 2,
        (w - 4) * ratio,
        h - 4
    );

    this.hudBar.lineStyle(2, 0x70d9ad, 1);
    this.hudBar.strokeRect(x, y, w, h);
  }

  showToast(message) {
    if (this.toastText) {
      this.toastText.destroy();
    }

    this.toastText = this.add.text(
        640,
        130,
        message,
        {
          fontSize: "22px",
          color: "#ffe16a",
          backgroundColor: "#092b35",
          padding: { x: 14, y: 8 }
        }
    );

    this.toastText
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(400);

    const toast = this.toastText;

    this.tweens.add({
      targets: toast,
      alpha: 0,
      delay: 1500,
      duration: 500,
      onComplete: () => toast.destroy()
    });
  }

  /* =======================================================
     COLISÕES
     ======================================================= */

  createCollisions() {
    this.physics.add.collider(this.player, this.ground);
    this.physics.add.collider(this.player, this.platforms);

    this.physics.add.collider(this.enemies, this.ground);
    this.physics.add.collider(this.enemies, this.platforms);

    this.physics.add.overlap(
        this.player,
        this.coinsGroup,
        this.collectCoin,
        null,
        this
    );

    this.physics.add.overlap(
        this.player,
        this.pickups,
        this.collectPickup,
        null,
        this
    );

    this.physics.add.overlap(
        this.player,
        this.hazards,
        this.hazardHit,
        null,
        this
    );

    this.physics.add.overlap(
        this.player,
        this.enemies,
        this.hitEnemy,
        null,
        this
    );

    this.physics.add.overlap(
        this.player,
        this.flyers,
        this.hitEnemy,
        null,
        this
    );

    this.physics.add.overlap(
        this.player,
        this.terminals,
        this.interactTerminal,
        null,
        this
    );

    this.physics.add.overlap(
        this.player,
        this.portal,
        this.finishWorld,
        null,
        this
    );

    this.physics.add.overlap(
        this.shots,
        this.enemies,
        this.shotHitsEnemy,
        null,
        this
    );

    this.physics.add.overlap(
        this.shots,
        this.flyers,
        this.shotHitsEnemy,
        null,
        this
    );

    this.physics.add.overlap(
        this.shots,
        this.platforms,
        shot => shot.destroy(),
        null,
        this
    );
  }

  /* =======================================================
     TELA INICIAL
     ======================================================= */

  createStartScreen() {
    this.startPanel = this.add.container(0, 0)
        .setScrollFactor(0)
        .setDepth(300);

    const shade = this.add.rectangle(
        640,
        360,
        1280,
        720,
        0x061923,
        0.88
    );

    const title = this.add.text(
        640,
        215,
        "BIOQUEST",
        {
          fontSize: "64px",
          color: "#80efb1",
          fontStyle: "bold"
        }
    ).setOrigin(0.5);

    const subtitle = this.add.text(
        640,
        295,
        this.world.name,
        {
          fontSize: "27px",
          color: "#ffffff",
          fontStyle: "bold"
        }
    ).setOrigin(0.5);

    const tip = this.add.text(
        640,
        375,
        `Colete ENERGIA, VIDAS, ESCUDOS e MUNIÇÃO.\nAtire ${this.world.weapon} com F e pule em cima dos inimigos!\nResponda os 3 desafios para abrir o portal.`,
        {
          fontSize: "19px",
          color: "#ffffff",
          align: "center",
          lineSpacing: 6
        }
    ).setOrigin(0.5);

    const start = this.add.text(
        640,
        490,
        this.isTouch
            ? "TOQUE AQUI PARA COMEÇAR"
            : "CLIQUE AQUI OU PRESSIONE ESPAÇO",
        {
          fontSize: "22px",
          color: "#ffe16a",
          fontStyle: "bold"
        }
    );

    start
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

    this.startPanel.add([
      shade,
      title,
      subtitle,
      tip,
      start
    ]);

    start.on("pointerdown", () => this.startGame());

    this.input.keyboard.once("keydown-SPACE", () => {
      this.startGame();
    });
  }

  startGame() {
    if (this.started) return;

    this.started = true;

    this.startPanel.destroy();

    SFX.init();
    SFX.unlock();
    SFX.startMusic(this.worldIndex);

    Phaser.Input.Keyboard.JustDown(this.keys.jump);
  }

  /* =======================================================
     LOOP PRINCIPAL
     ======================================================= */

  update() {
    if (!this.started || this.finished || this.quizOpen) return;

    this.updatePlayer();
    this.updateEnemies();
    this.updateHUD();
    this.updatePlayerShadow();

    this.jumpRequested = false;
    this.interactRequested = false;
    this.fireRequested = false;
  }

  updatePlayerShadow() {
    if (!this.playerShadow || !this.playerShadow.active) return;

    const grounded =
        this.player.body.blocked.down ||
        this.player.body.touching.down;

    this.playerShadow.setPosition(
        this.player.x,
        655
    );

    this.playerShadow.setAlpha(
        grounded ? 0.4 : 0.2
    );

    this.playerShadow.setScale(
        grounded ? 1 : 0.7
    );
  }

  updatePlayer() {
    const now = this.time.now;

    const left =
        this.keys.left.isDown ||
        this.keys.a.isDown ||
        this.touch.left;

    const right =
        this.keys.right.isDown ||
        this.keys.d.isDown ||
        this.touch.right;

    const crouch =
        this.keys.down.isDown ||
        this.touch.crouch;

    const lookUp = this.keys.up.isDown;

    const grounded =
        this.player.body.blocked.down ||
        this.player.body.touching.down;

    if (now >= this.knockUntil) {
      if (left && !right && !crouch) {
        this.player.setVelocityX(-190);
        this.facing = -1;
      } else if (right && !left && !crouch) {
        this.player.setVelocityX(190);
        this.facing = 1;
      } else {
        this.player.setVelocityX(0);
      }
    }

    this.player.setFlipX(this.facing < 0);

    // Pulo: seta para cima OU espaço.
    const jump =
        Phaser.Input.Keyboard.JustDown(this.keys.up) ||
        Phaser.Input.Keyboard.JustDown(this.keys.jump) ||
        this.jumpRequested;

    if (jump && grounded && !crouch) {
      this.player.setVelocityY(-JUMP_SPEED);
      SFX.play("jump");
    }

    const fire =
        Phaser.Input.Keyboard.JustDown(this.keys.fire) ||
        Phaser.Input.Keyboard.JustDown(this.keys.fire2) ||
        this.fireRequested;

    if (fire) this.shoot();

    this.applyPlayerVisuals(now);

    if (!this.hasSprite) return;

    if (now < this.hurtUntil) {
      this.player.anims.play("hurt", true);
    } else if (!grounded) {
      this.player.anims.play("jump", true);
    } else if (crouch) {
      this.player.anims.play("crouch", true);
    } else if (lookUp) {
      this.player.anims.play("lookUp", true);
    } else if (Math.abs(this.player.body.velocity.x) > 20) {
      this.player.anims.play("run", true);
    } else {
      this.player.anims.play("idle", true);
    }
  }

  applyPlayerVisuals(now) {
    let tint = this.hasSprite ? 0 : 0x6be58c;

    if (now < this.shieldUntil) {
      tint = 0x7fe9ff;
    } else if (now < this.hurtUntil) {
      tint = 0xff7777;
    }

    if (tint) {
      this.player.setTint(tint);
    } else {
      this.player.clearTint();
    }

    const blink =
        now < this.invulnUntil &&
        now >= this.shieldUntil &&
        Math.floor(now / 90) % 2 === 0;

    this.player.setAlpha(blink ? 0.45 : 1);
  }

  updateEnemies() {
    const now = this.time.now;

    this.enemies.getChildren().forEach(enemy => {
      if (!enemy || !enemy.active) return;

      const speed = enemy.getData("speed");

      if (enemy.x < enemy.getData("left")) {
        enemy.setVelocityX(speed);
      }

      if (enemy.x > enemy.getData("right")) {
        enemy.setVelocityX(-speed);
      }
    });

    this.flyers.getChildren().forEach(flyer => {
      if (!flyer || !flyer.active) return;

      const speed = flyer.getData("speed");

      if (flyer.x < flyer.getData("left")) {
        flyer.setVelocityX(speed);
      }

      if (flyer.x > flyer.getData("right")) {
        flyer.setVelocityX(-speed);
      }

      flyer.y =
          flyer.getData("baseY") +
          Math.sin(now * 0.003 + flyer.getData("phase")) *
          flyer.getData("amp");
    });
  }

  /* =======================================================
     ARMA
     ======================================================= */

  shoot() {
    const now = this.time.now;

    if (now < this.nextShot) return;

    if (this.ammo <= 0) {
      if (now > this.ammoToastAt) {
        this.showToast(
            `Sem ${this.world.weapon.toLowerCase()}! Procure as caixas de munição.`
        );

        this.ammoToastAt = now + 1500;
      }

      SFX.play("empty");
      return;
    }

    this.ammo--;
    this.nextShot = now + 280;

    SFX.play("shoot");

    const dir = this.facing;

    const shot = this.shots.create(
        this.player.x + dir * 34,
        this.player.y - 6,
        "shot"
    );

    shot.body.setAllowGravity(false);
    shot.setTint(this.world.shotTint);
    shot.setDepth(9);
    shot.setVelocityX(dir * 560);

    this.time.delayedCall(1100, () => {
      if (shot && shot.active) {
        shot.destroy();
      }
    });

    this.updateHUD();
  }

  shotHitsEnemy(shot, enemy) {
    if (!shot.active || !enemy.active) return;

    shot.destroy();
    this.damageEnemy(enemy, 1);
  }

  damageEnemy(enemy, damage) {
    if (!enemy.active) return;

    const hp = enemy.getData("hp") - damage;
    enemy.setData("hp", hp);

    if (hp <= 0) {
      this.killEnemy(enemy);
      return;
    }

    SFX.play("enemyHit");

    enemy.setTintFill(0xffffff);

    this.time.delayedCall(90, () => {
      if (!enemy.active) return;

      const tint = enemy.getData("tint");

      if (tint) {
        enemy.setTint(tint);
      } else {
        enemy.clearTint();
      }
    });
  }

  killEnemy(enemy) {
    const isFlyer = enemy.getData("type") === "flyer";

    const x = enemy.x;
    const y = enemy.y;

    this.score += isFlyer ? 40 : 25;

    SFX.play("enemyDie");

    this.burst(
        x,
        y,
        isFlyer ? 0xa66bff : 0xe54e64
    );

    if (Math.random() < 0.35) {
      const type = Math.random() < 0.3
          ? "ammo"
          : "energy";

      this.spawnPickup(
          type,
          Phaser.Math.Clamp(x, 60, WORLD_WIDTH - 60),
          GROUND_TOP - 30
      );
    }

    enemy.disableBody(true, true);

    this.updateHUD();
  }

  burst(x, y, color) {
    for (let i = 0; i < 8; i++) {
      const particle = this.add.circle(
          x,
          y,
          4,
          color
      );

      particle.setDepth(20);

      const angle = Math.PI * 2 / 8 * i;

      this.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * 42,
        y: y + Math.sin(angle) * 42,
        alpha: 0,
        duration: 350,
        onComplete: () => particle.destroy()
      });
    }
  }

  /* =======================================================
     EVENTOS DO JOGO
     ======================================================= */

  collectCoin(player, coin) {
    if (!coin.active) return;

    coin.disableBody(true, true);

    SFX.play("coin");

    this.coins++;
    this.score += 10;

    this.updateHUD();
  }

  collectPickup(player, item) {
    if (!item.active) return;

    const type = item.getData("type");

    if (type === "energy") {
      if (this.energy >= MAX_ENERGY) return;

      this.energy = Math.min(
          MAX_ENERGY,
          this.energy + 30
      );

      SFX.play("energy");
      this.showToast("+30 ENERGIA");

    } else if (type === "heart") {
      if (this.lives >= MAX_LIVES) return;

      this.lives++;

      SFX.play("life");
      this.showToast("+1 VIDA");

    } else if (type === "ammo") {
      this.ammo += 6;

      SFX.play("ammo");
      this.showToast(`+6 ${this.world.weapon}`);

    } else if (type === "shield") {
      this.shieldUntil = this.time.now + SHIELD_MS;

      SFX.play("shield");
      this.showToast(
          `ESCUDO por ${SHIELD_MS / 1000}s!`
      );
    }

    item.disableBody(true, true);

    this.score += 5;

    this.updateHUD();
  }

  hitEnemy(player, enemy) {
    if (!enemy.active) return;

    const falling = player.body.velocity.y > 0;

    const fromAbove =
        player.body.bottom - enemy.body.top < 26;

    if (falling && fromAbove) {
      player.setVelocityY(-340);

      SFX.play("stomp");

      this.damageEnemy(enemy, 2);
    } else {
      this.hurtPlayer(
          enemy.getData("dmg") ?? 20,
          enemy.x
      );
    }
  }

  hazardHit(player, spike) {
    this.hurtPlayer(20, spike.x);
  }

  hurtPlayer(amount, sourceX) {
    const now = this.time.now;

    if (this.finished || this.quizOpen) return;

    if (
        now < this.invulnUntil ||
        now < this.shieldUntil
    ) {
      return;
    }

    this.energy -= amount;

    SFX.play("hurt");

    this.invulnUntil = now + 1100;
    this.hurtUntil = now + 350;
    this.knockUntil = now + 250;

    const direction =
        this.player.x < sourceX ? -1 : 1;

    this.player.setVelocity(
        direction * 240,
        -320
    );

    this.cameras.main.shake(120, 0.005);

    this.updateHUD();

    if (this.energy <= 0) {
      this.handleDeath();
    }
  }

  handleDeath() {
    this.lives--;
    this.energy = MAX_ENERGY;

    this.updateHUD();

    if (this.lives <= 0) {
      this.gameOver();
      return;
    }

    SFX.play("death");

    this.player.setPosition(
        this.checkpointX,
        this.checkpointY
    );

    this.player.setVelocity(0, -200);

    this.invulnUntil = this.time.now + 1800;
    this.hurtUntil = this.time.now + 300;

    this.showToast(
        "Você perdeu uma vida! Energia restaurada."
    );
  }

  interactTerminal(player, terminal) {
    if (
        terminal.getData("used") ||
        this.quizOpen
    ) {
      return;
    }

    const interact =
        Phaser.Input.Keyboard.JustDown(this.keys.e) ||
        this.interactRequested;

    if (!interact) return;

    terminal.setData("used", true);

    SFX.play("terminal");

    this.checkpointX = terminal.x - 70;
    this.checkpointY = 560;

    this.currentTerminal = terminal;

    this.openQuiz();
  }

  /* =======================================================
     QUIZ
     ======================================================= */

  clearQuizObjects() {
    this.quizObjects.forEach(obj => {
      if (obj && obj.destroy) {
        obj.destroy();
      }
    });

    this.quizObjects = [];
  }

  bindQuizKeys(callback) {
    this.unbindQuizKeys();

    this.quizKeyHandler = callback;

    this.input.keyboard.on(
        "keydown",
        callback
    );
  }

  unbindQuizKeys() {
    if (this.quizKeyHandler) {
      this.input.keyboard.off(
          "keydown",
          this.quizKeyHandler
      );

      this.quizKeyHandler = null;
    }
  }

  openQuiz() {
    if (this.quizOpen) return;

    this.quizOpen = true;

    this.player.setVelocity(0, 0);
    this.physics.pause();

    const question =
        this.world.questions[
        this.questionIndex % this.world.questions.length
            ];

    this.currentQuestion = question;

    const add = obj => {
      obj.setScrollFactor(0);
      obj.setDepth(500);

      this.quizObjects.push(obj);

      return obj;
    };

    add(
        this.add.rectangle(
            640,
            360,
            1280,
            720,
            0x06131e,
            0.96
        )
    );

    add(
        this.add.rectangle(
            640,
            360,
            930,
            560,
            0x123849
        ).setStrokeStyle(4, 0x79e6bd)
    );

    add(
        this.add.text(
            640,
            115,
            "DESAFIO BIOQUEST",
            {
              fontSize: "32px",
              color: "#8ff0bb",
              fontStyle: "bold"
            }
        ).setOrigin(0.5)
    );

    add(
        this.add.text(
            640,
            160,
            `QUESTÃO ${this.answered + 1} DE ${this.totalChallenges}   •   acerte: +20 energia e +4 munição   •   erre: −25 energia`,
            {
              fontSize: "16px",
              color: "#ffe16a"
            }
        ).setOrigin(0.5)
    );

    add(
        this.add.text(
            230,
            205,
            question.q,
            {
              fontSize: "23px",
              color: "#ffffff",
              fontStyle: "bold",
              wordWrap: { width: 820 }
            }
        )
    );

    question.a.forEach((answer, index) => {
      const y = 315 + index * 65;

      const box = add(
          this.add.rectangle(
              640,
              y,
              850,
              52,
              0x24566a
          ).setStrokeStyle(2, 0x75cdb4)
      );

      box.setInteractive({ useHandCursor: true });

      box.on("pointerover", () => {
        box.setFillStyle(0x2f7088);
      });

      box.on("pointerout", () => {
        box.setFillStyle(0x24566a);
      });

      box.on("pointerdown", () => {
        this.answerQuestion(index);
      });

      add(
          this.add.text(
              250,
              y,
              `${String.fromCharCode(65 + index)})  ${answer}`,
              {
                fontSize: "20px",
                color: "#ffffff"
              }
          ).setOrigin(0, 0.5)
      );
    });

    this.bindQuizKeys(event => {
      const key = event.key.toUpperCase();

      const idx =
          "ABCD".indexOf(key) >= 0
              ? "ABCD".indexOf(key)
              : "1234".indexOf(key);

      if (idx >= 0 && idx < 4) {
        this.answerQuestion(idx);
      }
    });
  }

  answerQuestion(index) {
    if (!this.quizOpen || this.resultShown) return;

    this.resultShown = true;

    this.unbindQuizKeys();

    const question = this.currentQuestion;
    const correct = index === question.c;

    let rewardText;

    SFX.play(correct ? "correct" : "wrong");

    if (correct) {
      this.score += 100;

      this.energy = Math.min(
          MAX_ENERGY,
          this.energy + 20
      );

      this.ammo += 4;

      rewardText =
          `+100 pontos   +20 ENERGIA   +4 ${this.world.weapon}`;
    } else {
      this.energy -= 25;
      rewardText = "−25 ENERGIA";
    }

    this.updateHUD();

    this.clearQuizObjects();

    const add = obj => {
      obj.setScrollFactor(0);
      obj.setDepth(510);

      this.quizObjects.push(obj);

      return obj;
    };

    add(
        this.add.rectangle(
            640,
            360,
            1280,
            720,
            0x06131e,
            0.97
        )
    );

    add(
        this.add.rectangle(
            640,
            360,
            900,
            440,
            0x123849
        ).setStrokeStyle(3, 0x79e6bd)
    );

    add(
        this.add.text(
            640,
            245,
            correct
                ? "RESPOSTA CORRETA!"
                : "RESPOSTA INCORRETA",
            {
              fontSize: "34px",
              color: correct ? "#82f0a7" : "#ff8b8b",
              fontStyle: "bold"
            }
        ).setOrigin(0.5)
    );

    if (!correct) {
      add(
          this.add.text(
              640,
              290,
              `Resposta certa: ${question.a[question.c]}`,
              {
                fontSize: "20px",
                color: "#ffe16a",
                align: "center",
                wordWrap: { width: 760 }
              }
          ).setOrigin(0.5)
      );
    }

    add(
        this.add.text(
            640,
            350,
            question.e,
            {
              fontSize: "22px",
              color: "#ffffff",
              align: "center",
              wordWrap: { width: 760 }
            }
        ).setOrigin(0.5)
    );

    add(
        this.add.text(
            640,
            405,
            rewardText,
            {
              fontSize: "20px",
              color: correct ? "#82f0a7" : "#ff8b8b",
              fontStyle: "bold"
            }
        ).setOrigin(0.5)
    );

    const button = add(
        this.add.rectangle(
            640,
            475,
            280,
            62,
            0x24566a
        ).setStrokeStyle(2, 0x79e6bd)
    );

    button.setInteractive({ useHandCursor: true });

    add(
        this.add.text(
            640,
            475,
            "CONTINUAR",
            {
              fontSize: "24px",
              color: "#ffe16a"
            }
        ).setOrigin(0.5)
    );

    const proceed = () => this.closeResult();

    button.on("pointerdown", proceed);

    this.bindQuizKeys(event => {
      if (
          event.key === "Enter" ||
          event.key === " "
      ) {
        proceed();
      }
    });
  }

  closeResult() {
    if (!this.resultShown) return;

    this.resultShown = false;

    this.unbindQuizKeys();
    this.clearQuizObjects();

    this.questionIndex++;
    this.answered++;

    const terminal = this.currentTerminal;

    if (terminal) {
      const label = terminal.getData("label");

      if (label) {
        label.setText("✔ FEITO");
      }

      terminal.setTint(0x777777);
    }

    Phaser.Input.Keyboard.JustDown(this.keys.jump);
    Phaser.Input.Keyboard.JustDown(this.keys.up);
    Phaser.Input.Keyboard.JustDown(this.keys.fire);
    Phaser.Input.Keyboard.JustDown(this.keys.fire2);
    Phaser.Input.Keyboard.JustDown(this.keys.e);

    this.quizOpen = false;

    this.physics.resume();

    this.updateHUD();

    if (this.energy <= 0) {
      this.handleDeath();

      if (this.lives <= 0) return;
    }

    if (
        this.answered >= this.totalChallenges &&
        !this.portalOpen
    ) {
      this.portalOpen = true;

      this.portal.setAlpha(1);
      this.portalLabel.setText("PORTAL ABERTO");

      SFX.play("portal");

      this.tweens.add({
        targets: this.portal,
        alpha: 0.6,
        duration: 500,
        yoyo: true,
        repeat: -1
      });

      this.showToast(
          "Portal aberto! Vá até o fim da fase."
      );
    }
  }

  /* =======================================================
     FIM DE FASE E JOGO
     ======================================================= */

  finishWorld() {
    if (this.finished) return;

    if (!this.portalOpen) {
      if (this.time.now > this.toastCooldown) {
        this.showToast(
            "Responda todos os desafios para abrir o portal!"
        );

        this.toastCooldown = this.time.now + 2500;
      }

      return;
    }

    this.finished = true;

    this.player.setVelocity(0, 0);

    if (this.worldIndex < WORLDS.length - 1) {
      this.showNextWorld();
    } else {
      this.victory();
    }
  }

  makeButton(
      x,
      y,
      w,
      h,
      label,
      callback,
      depth,
      fontSize = "26px"
  ) {
    const rect = this.add.rectangle(
        x,
        y,
        w,
        h,
        0x24566a
    );

    rect.setStrokeStyle(2, 0x79e6bd);
    rect.setScrollFactor(0);
    rect.setDepth(depth);
    rect.setInteractive({ useHandCursor: true });

    this.add.text(
        x,
        y,
        label,
        {
          fontSize,
          color: "#ffe16a",
          fontStyle: "bold"
        }
    )
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(depth + 1);

    let done = false;

    const once = () => {
      if (done) return;

      done = true;
      callback();
    };

    rect.on("pointerdown", once);

    this.input.keyboard.once(
        "keydown-ENTER",
        once
    );
  }

  showNextWorld() {
    SFX.stopMusic();
    SFX.play("world");

    this.add.rectangle(
        640,
        360,
        1280,
        720,
        0x061923,
        0.96
    )
        .setScrollFactor(0)
        .setDepth(600);

    this.add.text(
        640,
        260,
        "FASE CONCLUÍDA!",
        {
          fontSize: "46px",
          color: "#8ff0bb",
          fontStyle: "bold"
        }
    )
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(601);

    this.add.text(
        640,
        330,
        `Pontos: ${this.score}  |  Vidas: ${this.lives}  |  Energia recuperada (+30)`,
        {
          fontSize: "22px",
          color: "#ffffff"
        }
    )
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(601);

    this.makeButton(
        640,
        430,
        300,
        65,
        "PRÓXIMA FASE",
        () => {
          this.scene.restart({
            worldIndex: this.worldIndex + 1,
            score: this.score,
            lives: this.lives,
            coins: this.coins,
            energy: Math.min(
                MAX_ENERGY,
                this.energy + 30
            ),
            ammo: this.ammo
          });
        },
        601
    );
  }

  victory() {
    SFX.stopMusic();
    SFX.play("victory");

    this.showEndScreen(
        "MISSÃO CUMPRIDA!",
        `Pontuação: ${this.score}  |  Moedas: ${this.coins}`
    );
  }

  gameOver() {
    this.finished = true;

    this.physics.pause();

    SFX.stopMusic();
    SFX.play("gameover");

    this.showEndScreen(
        "FIM DE JOGO",
        "Tente novamente e complete sua missão."
    );
  }

  showEndScreen(titleText, detailText) {
    this.add.rectangle(
        640,
        360,
        1280,
        720,
        0x061923,
        0.97
    )
        .setScrollFactor(0)
        .setDepth(700);

    this.add.text(
        640,
        270,
        titleText,
        {
          fontSize: "48px",
          color: "#8ff0bb",
          fontStyle: "bold"
        }
    )
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(701);

    this.add.text(
        640,
        350,
        detailText,
        {
          fontSize: "23px",
          color: "#ffffff"
        }
    )
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(701);

    this.makeButton(
        640,
        450,
        340,
        65,
        "JOGAR NOVAMENTE",
        () => {
          this.scene.restart({
            worldIndex: 0,
            score: 0,
            lives: 3,
            coins: 0
          });
        },
        701,
        "25px"
    );
  }
}

/* =========================================================
   CONFIGURAÇÃO PHASER
   ========================================================= */

const config = {
  type: Phaser.AUTO,

  parent: "game",

  width: WIDTH,
  height: HEIGHT,

  backgroundColor: "#102d3b",

  physics: {
    default: "arcade",

    arcade: {
      gravity: {
        y: 1100
      },

      debug: false
    }
  },

  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,

    width: WIDTH,
    height: HEIGHT,

    expandParent: true
  },

  input: {
    activePointers: 5
  },

  disableContextMenu: true,

  scene: [BioQuest]
};

window.bioQuestGame = new Phaser.Game(config);

/* =========================================================
   REDIMENSIONAMENTO
   ========================================================= */

const refreshScale = () => {
  if (
      window.bioQuestGame &&
      window.bioQuestGame.scale
  ) {
    window.bioQuestGame.scale.refresh();
  }
};

window.addEventListener(
    "orientationchange",
    () => {
      setTimeout(refreshScale, 300);
    }
);

window.addEventListener(
    "resize",
    refreshScale
);