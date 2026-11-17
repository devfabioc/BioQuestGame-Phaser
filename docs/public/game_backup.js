
/* ============================================================
   BIOQUEST - FABIOLOGIA
   Fase 1: Floresta da Ecologia
   Phaser 3
   Personagem animado: FaBiologia
   ============================================================ */

const LARGURA = 1280;
const ALTURA = 720;
const MUNDO_LARGURA = 2560;

let jogador;
let plataformas;
let moedas;
let inimigos;
let espinhos;
let checkpoint;
let portal;
let teclas;
let controles;
let camera;
let hud = {};
let pontuacao = 0;
let vidas = 3;
let checkpointAtivo = false;
let pontoRetorno = { x: 100, y: 520 };
let invulneravel = false;
let faseConcluida = false;
let jogoEncerrado = false;
let ultimaPosicaoY = 0;

const config = {
    type: Phaser.AUTO,
    width: LARGURA,
    height: ALTURA,
    parent: document.body,
    backgroundColor: "#78c9e8",

    physics: {
        default: "arcade",
        arcade: {
            gravity: { y: 1000 },
            debug: false
        }
    },

    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },

    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

const jogo = new Phaser.Game(config);

/* ============================================================
   CARREGAMENTO
   ============================================================ */

function preload() {
    this.load.spritesheet(
        "fabiologia",
        "assets/personagem/fabiologia_spritesheet.png",
        {
            frameWidth: 384,
            frameHeight: 512
        }
    );
}

/* ============================================================
   CRIAÇÃO DA FASE
   ============================================================ */

function create() {

    pontuacao = 0;
    vidas = 3;
    checkpointAtivo = false;
    pontoRetorno = { x: 100, y: 520 };
    invulneravel = false;
    faseConcluida = false;
    jogoEncerrado = false;

    this.physics.world.setBounds(0, 0, MUNDO_LARGURA, ALTURA);

    criarAnimacoes(this);
    criarCenario(this);
    criarPlataformas(this);
    criarMoedas(this);
    criarInimigos(this);
    criarEspinhos(this);
    criarCheckpoint(this);
    criarPortal(this);
    criarJogador(this);
    criarHUD(this);
    criarControles(this);
    configurarColisoes(this);

    camera = this.cameras.main;
    camera.setBounds(0, 0, MUNDO_LARGURA, ALTURA);
    camera.startFollow(jogador, true, 0.08, 0.08);

    this.physics.world.setBoundsCollision(true, true, false, true);

    teclas = this.input.keyboard.addKeys({
        esquerda: Phaser.Input.Keyboard.KeyCodes.LEFT,
        direita: Phaser.Input.Keyboard.KeyCodes.RIGHT,
        pular: Phaser.Input.Keyboard.KeyCodes.SPACE,
        a: Phaser.Input.Keyboard.KeyCodes.A,
        d: Phaser.Input.Keyboard.KeyCodes.D,
        w: Phaser.Input.Keyboard.KeyCodes.W,
        esc: Phaser.Input.Keyboard.KeyCodes.ESC
    });

    atualizarHUD();
}

/* ============================================================
   ANIMAÇÕES DO PERSONAGEM
   ============================================================ */

function criarAnimacoes(scene) {

    scene.anims.create({
        key: "fab-idle",
        frames: scene.anims.generateFrameNumbers("fabiologia", {
            start: 0,
            end: 1
        }),
        frameRate: 3,
        repeat: -1
    });

    scene.anims.create({
        key: "fab-run",
        frames: scene.anims.generateFrameNumbers("fabiologia", {
            start: 2,
            end: 4
        }),
        frameRate: 10,
        repeat: -1
    });

    scene.anims.create({
        key: "fab-jump",
        frames: scene.anims.generateFrameNumbers("fabiologia", {
            start: 5,
            end: 6
        }),
        frameRate: 6,
        repeat: 0
    });

    scene.anims.create({
        key: "fab-land",
        frames: [{ key: "fabiologia", frame: 7 }],
        frameRate: 1,
        repeat: 0
    });
}

/* ============================================================
   CENÁRIO DA FLORESTA
   ============================================================ */

function criarCenario(scene) {

    const g = scene.add.graphics();

    // Céu
    g.fillGradientStyle(
        0x78c9e8,
        0x78c9e8,
        0xc9edff,
        0xc9edff,
        1
    );
    g.fillRect(0, 0, MUNDO_LARGURA, ALTURA);

    // Sol
    g.fillStyle(0xffdf63, 1);
    g.fillCircle(1100, 105, 55);

    // Montanhas distantes
    g.fillStyle(0x82b8a0, 1);
    for (let x = 0; x < MUNDO_LARGURA; x += 350) {
        g.fillTriangle(
            x, 440,
            x + 180, 150,
            x + 360, 440
        );
    }

    // Montanhas próximas
    g.fillStyle(0x579875, 1);
    for (let x = -100; x < MUNDO_LARGURA; x += 420) {
        g.fillTriangle(
            x, 510,
            x + 200, 260,
            x + 430, 510
        );
    }

    // Rio
    g.fillStyle(0x39b9d7, 0.75);
    g.fillRect(0, 590, MUNDO_LARGURA, 130);

    g.fillStyle(0x9cecff, 0.8);
    for (let x = 0; x < MUNDO_LARGURA; x += 180) {
        g.fillEllipse(x + 60, 625, 100, 8);
    }

    // Árvores decorativas
    for (let x = 80; x < MUNDO_LARGURA; x += 230) {

        const altura = Phaser.Math.Between(100, 170);

        g.fillStyle(0x765039, 1);
        g.fillRect(x, 480 - altura / 2, 25, altura);

        g.fillStyle(0x26764a, 1);
        g.fillCircle(x + 12, 450 - altura, 55);

        g.fillStyle(0x3d985d, 1);
        g.fillCircle(x - 20, 470 - altura, 35);

        g.fillCircle(x + 40, 470 - altura, 35);
    }

    // Flores decorativas
    for (let x = 40; x < MUNDO_LARGURA; x += 90) {
        g.fillStyle(0xffe66d, 1);
        g.fillCircle(x, 570, 6);
        g.fillStyle(0xffffff, 1);
        g.fillCircle(x - 6, 566, 4);
        g.fillCircle(x + 6, 566, 4);
    }

    // Cachoeira decorativa
    g.fillStyle(0x9beaff, 0.8);
    g.fillRect(1450, 350, 90, 240);

    g.fillStyle(0xffffff, 0.5);
    g.fillRect(1465, 350, 12, 240);
    g.fillRect(1500, 350, 10, 240);

    // Nome da fase
    scene.add.text(40, 30, "BIOQUEST", {
        fontFamily: "Arial",
        fontSize: "25px",
        fontStyle: "bold",
        color: "#ffffff",
        stroke: "#155b38",
        strokeThickness: 5
    }).setScrollFactor(0).setDepth(100);

    scene.add.text(40, 62, "FLORESTA DA ECOLOGIA", {
        fontFamily: "Arial",
        fontSize: "15px",
        fontStyle: "bold",
        color: "#eaffd7",
        stroke: "#155b38",
        strokeThickness: 3
    }).setScrollFactor(0).setDepth(100);
}

/* ============================================================
   TEXTURAS
   ============================================================ */

function criarTexturas(scene) {

    if (!scene.textures.exists("chao")) {
        const g = scene.make.graphics({ x: 0, y: 0, add: false });

        g.fillStyle(0x704b2c, 1);
        g.fillRoundedRect(0, 0, 160, 40, 8);

        g.fillStyle(0x43a047, 1);
        g.fillRoundedRect(0, 0, 160, 12, 5);

        g.fillStyle(0x78c850, 1);
        g.fillRect(0, 0, 160, 5);

        g.generateTexture("chao", 160, 40);
        g.destroy();
    }

    if (!scene.textures.exists("moeda")) {
        const g = scene.make.graphics({ x: 0, y: 0, add: false });

        g.fillStyle(0xffc928, 1);
        g.fillCircle(16, 16, 15);

        g.lineStyle(3, 0xffed85, 1);
        g.strokeCircle(16, 16, 11);

        g.fillStyle(0xffe875, 1);
        g.fillCircle(11, 10, 4);

        g.generateTexture("moeda", 32, 32);
        g.destroy();
    }

    if (!scene.textures.exists("joaninha")) {
        const g = scene.make.graphics({ x: 0, y: 0, add: false });

        g.fillStyle(0xe62d35, 1);
        g.fillEllipse(20, 18, 36, 29);

        g.lineStyle(3, 0x222222, 1);
        g.strokeEllipse(20, 18, 36, 29);

        g.lineBetween(20, 4, 20, 32);

        g.fillStyle(0x171717, 1);
        g.fillCircle(10, 12, 4);
        g.fillCircle(28, 12, 4);
        g.fillCircle(10, 24, 4);
        g.fillCircle(28, 24, 4);

        g.fillCircle(20, 2, 5);

        g.generateTexture("joaninha", 40, 38);
        g.destroy();
    }

    if (!scene.textures.exists("espinho")) {
        const g = scene.make.graphics({ x: 0, y: 0, add: false });

        g.fillStyle(0x555555, 1);
        for (let x = 0; x < 90; x += 18) {
            g.fillTriangle(x, 30, x + 9, 0, x + 18, 30);
        }

        g.generateTexture("espinho", 90, 30);
        g.destroy();
    }

    if (!scene.textures.exists("bandeira")) {
        const g = scene.make.graphics({ x: 0, y: 0, add: false });

        g.fillStyle(0x75502d, 1);
        g.fillRect(5, 0, 7, 90);

        g.fillStyle(0x36c76b, 1);
        g.fillTriangle(12, 5, 65, 20, 12, 38);

        g.generateTexture("bandeira", 70, 90);
        g.destroy();
    }

    if (!scene.textures.exists("portal")) {
        const g = scene.make.graphics({ x: 0, y: 0, add: false });

        g.fillStyle(0x7a38d1, 0.25);
        g.fillEllipse(40, 50, 75, 100);

        g.lineStyle(8, 0xb56cff, 1);
        g.strokeEllipse(40, 50, 65, 90);

        g.lineStyle(4, 0xe3c4ff, 1);
        g.strokeEllipse(40, 50, 43, 70);

        g.generateTexture("portal", 80, 100);
        g.destroy();
    }
}

/* ============================================================
   PLATAFORMAS
   ============================================================ */

function criarPlataformas(scene) {

    criarTexturas(scene);

    plataformas = scene.physics.add.staticGroup();

    // Chão principal
    for (let x = 0; x < MUNDO_LARGURA; x += 160) {
        plataformas.create(x + 80, 680, "chao")
            .setScale(1, 1)
            .refreshBody();
    }

    const posicoes = [
        [400, 555],
        [700, 500],
        [1050, 555],
        [1400, 490],
        [1750, 540],
        [2100, 480]
    ];

    posicoes.forEach(([x, y]) => {
        plataformas.create(x, y, "chao")
            .setScale(0.85, 0.7)
            .refreshBody();
    });

    plataformas.create(930, 620, "chao")
        .setScale(0.6, 0.6)
        .refreshBody();

    plataformas.create(1880, 610, "chao")
        .setScale(0.6, 0.6)
        .refreshBody();
}

/* ============================================================
   MOEDAS
   ============================================================ */

function criarMoedas(scene) {

    moedas = scene.physics.add.group({
        allowGravity: false,
        immovable: true
    });

    const posicoes = [
        [250, 580],
        [400, 490],
        [520, 480],
        [700, 435],
        [850, 540],
        [1050, 490],
        [1200, 530],
        [1400, 425],
        [1570, 470],
        [1750, 480],
        [1950, 540],
        [2100, 415]
    ];

    posicoes.forEach(([x, y]) => {
        const moeda = moedas.create(x, y, "moeda");
        moeda.setCircle(14);
        moeda.setBounce(0);
    });
}

/* ============================================================
   INIMIGOS
   ============================================================ */

function criarInimigos(scene) {

    inimigos = scene.physics.add.group();

    const posicoes = [
        [580, 640],
        [1180, 640],
        [1840, 640]
    ];

    posicoes.forEach(([x, y]) => {

        const inimigo = inimigos.create(x, y, "joaninha");

        inimigo.setBounce(0);
        inimigo.setCollideWorldBounds(true);
        inimigo.setVelocityX(Phaser.Math.Between(45, 70));
        inimigo.setData("direcao", 1);
        inimigo.setData("inicio", x);
        inimigo.setData("limite", 110);
        inimigo.body.setAllowGravity(true);
    });
}

/* ============================================================
   ESPINHOS
   ============================================================ */

function criarEspinhos(scene) {

    espinhos = scene.physics.add.staticGroup();

    espinhos.create(1120, 650, "espinho");
    espinhos.create(1980, 650, "espinho");
}

/* ============================================================
   CHECKPOINT
   ============================================================ */

function criarCheckpoint(scene) {

    checkpoint = scene.physics.add.staticImage(
        1300,
        585,
        "bandeira"
    );

    checkpoint.setOrigin(0.5, 1);
    checkpoint.setDepth(5);
}

/* ============================================================
   PORTAL
   ============================================================ */

function criarPortal(scene) {

    portal = scene.physics.add.staticImage(
        2470,
        575,
        "portal"
    );

    portal.setOrigin(0.5, 0.5);
}

/* ============================================================
   JOGADOR
   ============================================================ */

function criarJogador(scene) {

    jogador = scene.physics.add.sprite(
        100,
        520,
        "fabiologia"
    );

    jogador.setScale(0.16);
    jogador.setDepth(10);

    jogador.setCollideWorldBounds(true);
    jogador.setBounce(0);

    jogador.body.setSize(260, 420);
    jogador.body.setOffset(62, 82);

    jogador.setMaxVelocity(260, 900);

    jogador.anims.play("fab-idle");
}

/* ============================================================
   COLISÕES
   ============================================================ */

function configurarColisoes(scene) {

    scene.physics.add.collider(jogador, plataformas);

    scene.physics.add.collider(inimigos, plataformas);

    scene.physics.add.overlap(
        jogador,
        moedas,
        coletarMoeda,
        null,
        scene
    );

    scene.physics.add.overlap(
        jogador,
        inimigos,
        colidirInimigo,
        null,
        scene
    );

    scene.physics.add.overlap(
        jogador,
        espinhos,
        receberDano,
        null,
        scene
    );

    scene.physics.add.overlap(
        jogador,
        checkpoint,
        ativarCheckpoint,
        null,
        scene
    );

    scene.physics.add.overlap(
        jogador,
        portal,
        concluirFase,
        null,
        scene
    );
}

/* ============================================================
   HUD
   ============================================================ */

function criarHUD(scene) {

    hud.pontuacao = scene.add.text(1050, 25, "", {
        fontFamily: "Arial",
        fontSize: "22px",
        fontStyle: "bold",
        color: "#ffffff",
        stroke: "#155b38",
        strokeThickness: 5
    }).setScrollFactor(0).setDepth(100);

    hud.vidas = scene.add.text(1050, 58, "", {
        fontFamily: "Arial",
        fontSize: "20px",
        fontStyle: "bold",
        color: "#ffffff",
        stroke: "#155b38",
        strokeThickness: 5
    }).setScrollFactor(0).setDepth(100);

    hud.checkpoint = scene.add.text(1050, 90, "", {
        fontFamily: "Arial",
        fontSize: "15px",
        color: "#ffffff",
        stroke: "#155b38",
        strokeThickness: 4
    }).setScrollFactor(0).setDepth(100);
}

function atualizarHUD() {

    if (!hud.pontuacao) return;

    hud.pontuacao.setText("PONTOS: " + pontuacao);
    hud.vidas.setText("VIDAS: " + "♥ ".repeat(vidas));
    hud.checkpoint.setText(
        checkpointAtivo ? "CHECKPOINT: ATIVO" : "CHECKPOINT: NÃO ATIVO"
    );
}

/* ============================================================
   CONTROLES DE TOQUE
   ============================================================ */

function criarControles(scene) {

    controles = {
        esquerda: false,
        direita: false,
        pular: false
    };

    function criarBotao(x, y, texto, largura, altura, acao) {

        const fundo = scene.add.rectangle(
            x, y, largura, altura, 0x173e31, 0.75
        );

        fundo.setScrollFactor(0);
        fundo.setDepth(110);
        fundo.setStrokeStyle(3, 0xffffff, 0.8);
        fundo.setInteractive();

        const label = scene.add.text(x, y, texto, {
            fontFamily: "Arial",
            fontSize: "27px",
            fontStyle: "bold",
            color: "#ffffff"
        }).setOrigin(0.5);

        label.setScrollFactor(0);
        label.setDepth(111);

        fundo.on("pointerdown", () => {
            controles[acao] = true;
            fundo.setAlpha(1);
        });

        fundo.on("pointerup", () => {
            controles[acao] = false;
            fundo.setAlpha(0.75);
        });

        fundo.on("pointerout", () => {
            controles[acao] = false;
            fundo.setAlpha(0.75);
        });
    }

    criarBotao(75, 625, "◀", 65, 65, "esquerda");
    criarBotao(155, 625, "▶", 65, 65, "direita");
    criarBotao(1180, 625, "▲", 80, 75, "pular");
}

/* ============================================================
   MOVIMENTAÇÃO DO JOGADOR
   ============================================================ */

function atualizarJogador(scene) {

    if (jogoEncerrado || faseConcluida) return;

    const esquerda =
        teclas.esquerda.isDown ||
        teclas.a.isDown ||
        controles.esquerda;

    const direita =
        teclas.direita.isDown ||
        teclas.d.isDown ||
        controles.direita;

    const pular =
        Phaser.Input.Keyboard.JustDown(teclas.pular) ||
        Phaser.Input.Keyboard.JustDown(teclas.w) ||
        controles.pular;

    const velocidade = 220;

    if (esquerda) {

        jogador.setVelocityX(-velocidade);
        jogador.setFlipX(true);

    } else if (direita) {

        jogador.setVelocityX(velocidade);
        jogador.setFlipX(false);

    } else {

        jogador.setVelocityX(0);
    }

    if (
        pular &&
        jogador.body.blocked.down
    ) {
        jogador.setVelocityY(-510);
        jogador.anims.play("fab-jump", true);
    }

    if (!jogador.body.blocked.down) {

        if (jogador.anims.currentAnim?.key !== "fab-jump") {
            jogador.anims.play("fab-jump", true);
        }

    } else if (esquerda || direita) {

        jogador.anims.play("fab-run", true);

    } else {

        jogador.anims.play("fab-idle", true);
    }
}

/* ============================================================
   MOVIMENTAÇÃO DOS INIMIGOS
   ============================================================ */

function atualizarInimigos() {

    inimigos.getChildren().forEach(inimigo => {

        if (!inimigo.active) return;

        const inicio = inimigo.getData("inicio");
        const limite = inimigo.getData("limite");

        if (inimigo.x > inicio + limite) {
            inimigo.setVelocityX(-65);
            inimigo.setFlipX(true);
        }

        if (inimigo.x < inicio - limite) {
            inimigo.setVelocityX(65);
            inimigo.setFlipX(false);
        }
    });
}

/* ============================================================
   COLETAR MOEDAS
   ============================================================ */

function coletarMoeda(jogador, moeda) {

    if (!moeda.active) return;

    moeda.disableBody(true, true);

    pontuacao += 10;
    atualizarHUD();

    this.tweens.add({
        targets: moeda,
        alpha: 0,
        duration: 150
    });
}

/* ============================================================
   INIMIGOS: PULO SOBRE A JOANINHA
   ============================================================ */

function colidirInimigo(jogador, inimigo) {

    if (!jogador.active || !inimigo.active) return;
    if (invulneravel || jogoEncerrado || faseConcluida) return;

    const jogadorPorCima =
        jogador.body.velocity.y > 0 &&
        jogador.body.bottom < inimigo.body.top + 22;

    if (jogadorPorCima) {

        inimigo.disableBody(true, true);

        jogador.setVelocityY(-350);

        pontuacao += 50;
        atualizarHUD();

    } else {

        receberDano.call(this);
    }
}

/* ============================================================
   RECEBER DANO
   ============================================================ */

function receberDano() {

    if (invulneravel || jogoEncerrado || faseConcluida) return;

    vidas--;
    atualizarHUD();

    invulneravel = true;

    jogador.setTint(0xff5555);
    jogador.setVelocity(0, -300);

    if (vidas <= 0) {

        encerrarJogo(this);
        return;
    }

    this.time.delayedCall(700, () => {

        jogador.setPosition(
            pontoRetorno.x,
            pontoRetorno.y
        );

        jogador.setVelocity(0, 0);
    });

    this.time.delayedCall(1500, () => {

        invulneravel = false;

        if (jogador.active) {
            jogador.clearTint();
        }
    });
}

/* ============================================================
   CHECKPOINT
   ============================================================ */

function ativarCheckpoint() {

    if (checkpointAtivo) return;

    checkpointAtivo = true;

    pontoRetorno = {
        x: 1300,
        y: 520
    };

    pontuacao += 100;
    atualizarHUD();

    checkpoint.setTint(0x8cff9a);

    const mensagem = this.add.text(
        640,
        250,
        "CHECKPOINT ATIVADO!",
        {
            fontFamily: "Arial",
            fontSize: "32px",
            fontStyle: "bold",
            color: "#ffffff",
            stroke: "#145b32",
            strokeThickness: 7
        }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(150);

    this.time.delayedCall(1800, () => {
        mensagem.destroy();
    });
}

/* ============================================================
   CONCLUSÃO DA FASE
   ============================================================ */

function concluirFase() {

    if (faseConcluida || jogoEncerrado) return;

    faseConcluida = true;

    jogador.setVelocity(0, 0);
    jogador.body.enable = false;

    pontuacao += vidas * 100;
    atualizarHUD();

    this.physics.pause();

    const fundo = this.add.rectangle(
        640,
        360,
        1280,
        720,
        0x071d16,
        0.85
    ).setScrollFactor(0).setDepth(200);

    const titulo = this.add.text(
        640,
        235,
        "FASE CONCLUÍDA!",
        {
            fontFamily: "Arial",
            fontSize: "48px",
            fontStyle: "bold",
            color: "#aaff85",
            stroke: "#174b27",
            strokeThickness: 8
        }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(201);

    const resultado = this.add.text(
        640,
        320,
        "Você explorou a Floresta da Ecologia!\n\nPONTUAÇÃO FINAL: " + pontuacao,
        {
            fontFamily: "Arial",
            fontSize: "26px",
            color: "#ffffff",
            align: "center",
            lineSpacing: 12
        }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(201);

    const botao = this.add.rectangle(
        640,
        470,
        300,
        65,
        0x2eaa58
    ).setInteractive().setScrollFactor(0).setDepth(202);

    this.add.text(
        640,
        470,
        "JOGAR NOVAMENTE",
        {
            fontFamily: "Arial",
            fontSize: "23px",
            fontStyle: "bold",
            color: "#ffffff"
        }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(203);

    botao.on("pointerdown", () => {
        this.scene.restart();
    });
}

/* ============================================================
   FIM DE JOGO
   ============================================================ */

function encerrarJogo(scene) {

    jogoEncerrado = true;

    jogador.setVelocity(0, 0);
    jogador.body.enable = false;

    scene.physics.pause();

    const fundo = scene.add.rectangle(
        640,
        360,
        1280,
        720,
        0x160909,
        0.88
    ).setScrollFactor(0).setDepth(200);

    scene.add.text(
        640,
        270,
        "FIM DE JOGO",
        {
            fontFamily: "Arial",
            fontSize: "55px",
            fontStyle: "bold",
            color: "#ff6565",
            stroke: "#550000",
            strokeThickness: 8
        }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(201);

    scene.add.text(
        640,
        350,
        "Não desista, explorador!\nTente novamente.",
        {
            fontFamily: "Arial",
            fontSize: "26px",
            color: "#ffffff",
            align: "center"
        }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(201);

    scene.time.delayedCall(2500, () => {
        scene.scene.restart();
    });
}

/* ============================================================
   ATUALIZAÇÃO PRINCIPAL
   ============================================================ */

function update() {

    if (jogoEncerrado || faseConcluida) return;

    atualizarJogador(this);
    atualizarInimigos();

    // Evita que o personagem caia para fora do cenário.
    if (jogador.y > ALTURA + 100) {
        receberDano.call(this);
    }

    // Animação das moedas.
    moedas.getChildren().forEach(moeda => {
        if (moeda.active) {
            moeda.rotation += 0.025;
        }
    });

    // Pequena animação do portal.
    if (portal && portal.active) {
        portal.setScale(
            1 + Math.sin(this.time.now / 250) * 0.06
        );
    }
}
