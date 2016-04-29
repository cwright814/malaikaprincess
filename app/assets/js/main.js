Url = {
    get get(){
        var vars= {};
        if(window.location.search.length!==0)
            window.location.search.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value){
                key=decodeURIComponent(key);
                if(typeof vars[key]==="undefined") {vars[key]= decodeURIComponent(value);}
                else {vars[key]= [].concat(vars[key], decodeURIComponent(value));}
            });
        return vars;
    }
};

// Stage Variables
var stage, w, h, splash, loader, delta, timer, reloading;

// Title Screen
var TitleView = new createjs.Container();

// Game Screen
var input, ground, player, clothing, spirit;
var projectiles, spriteSheetPlatform;
var ssEnemy1, ssEnemy2, ssEnemy3, ssOrb, ssTotem;
var totemCount, scoreText;
var tilesets = [], enemies = [], orbs = [], totems = [];
var totemFormations = [];
var lives = new createjs.Container();
var bgSpawn, shakeDuration;
var hardmode = Url.get.hardmode !== undefined, speedFactor;

// Probabilities
var groundLength = [1, 1, 2, 2, 2, 3];
var groundHoles;
var totemLand;
var totemHole;

// Constructors

function Point(x, y, z) {
    if (x === undefined || x == null)
        x = 0;
    if (y === undefined || y == null)
        y = 0;
    if (z === undefined || z == null)
        z = 0;
    this.x = x;
    this.y = y;
    this.z = z;
}

function Actor(width, height, x, y, state, ground) {
    if (x === undefined)
        x = 0;
    if (y === undefined)
        y = 0;
    if (state === undefined)
        state = null;
    if (ground === undefined)
        ground = false;

    this.width = width;
    this.height = height;
    this.pos = {
        x: x,
        y: y
    };
    this.speed = {
        x: 0,
        y: 0,
        run: 500
    };
    this.state = state;
    this.ground = ground;
    this.health = 8;
    this.groundIgnore = 0;
    this.dashing = 0;
    this.dashforce = 1000;
    this.hasdashed = false;
    this.dashdelay = 0;
    this.shoot = actorShoot;
    this.jump = actorJump;
    this.fall = actorFall;
    this.land = actorLand;
    this.setbounds = setBounds;
    this.updatepos = updatePos;
    this.initsensor = initSensor;
    this.update = actorUpdate;
    this.updatesensors = actorUpdateSensors;
    this.colliding = colliding;
    this.reposition = actorReposition;
    this.pound = actorPound;
    this.dash = actorDash;
    this.dashcancel = actorDashCancel;
}

// Main code

function init() {
    stage = new createjs.Stage('arena');

    // grab canvas width and height for later calculations:
    w = stage.canvas.width;
    h = stage.canvas.height;

    splash = new createjs.LoadQueue(true);
    splash.addEventListener('complete', showSplash);
    splash.loadManifest([{src: 'title-bg.png', id: 'title-bg'}], true, 'assets/sprites/');
}

function showSplash() {
    var titleBg = new createjs.Shape();
    titleBg.graphics.beginBitmapFill(splash.getResult('title-bg')).drawRect(0, 0, w, h);

    TitleView.addChild(titleBg);
    stage.addChild(TitleView);
    stage.update();

    manifest = [
        {src: 'heroine.png', id: 'character'},
        {src: 'heroine-clothing.png', id: 'clothing'},
        {src: 'ground.png', id: 'platform'},
        {src: 'arrow-1.png', id: 'projectile'},
        {src: 'background-2.png', id: 'background'},
        {src: 'enemy1-spritesheet.png', id: 'enemy1'},
        {src: 'enemy2-spritesheet.png', id: 'enemy2'},
        {src: 'enemy3-spritesheet.png', id: 'enemy3'},
        {src: 'spirit-orb-spritesheet.png', id: 'orb'},
        {src: 'heart-life.png', id: 'life'},
        {src: 'totem.png', id: 'totem'},
        {src: 'title-enter.png', id: 'title-enter'}
    ];

    loader = new createjs.LoadQueue(true);
    loader.addEventListener('complete', handleComplete);
    loader.loadManifest(manifest, true, 'assets/sprites/');
}

function handleComplete() {
    createjs.Ticker.timingMode = createjs.Ticker.RAF;
    createjs.Ticker.addEventListener('tick', tick);
    addTitleScreen();
}

function addTitleScreen() {
    stage.enableMouseOver(10);
    stage.state = 'title';
    input = {
        id: 0,
        last: 0,
        left: false,
        right: false,
        down: false,
        jump: false,
        fire: false,
        dash: false,
        doubletapped: {
            left: false,
            right: false,
            down: false,
            jump: false,
            fire: false,
            dash: false
        },
        released: true,
        duration: 0,
        update: inputUpdate
    };
    this.document.onkeydown = keyPressedDown;
    this.document.onkeyup = keyPressedUp;

    var titleEnter = new createjs.Shape(); //561, 515
    titleEnter.graphics.beginBitmapFill(loader.getResult('title-enter')).drawRect(0, 0, 295, 25);
    titleEnter.x = 561;
    titleEnter.y = 515;

    TitleView.addChild(titleEnter);
    stage.update();

    /*var startText = new createjs.Text('Start', '32px Tahoma, Geneva, sans-serif', '#000');
    startText.x = w/2 - 32;
    startText.y = 350;
    startText.alpha = 0.5;

    var hitArea = new createjs.Shape();
    hitArea.graphics.beginFill('#FFF').drawRect(0, 0, startText.getMeasuredWidth()+5, startText.getMeasuredHeight()+10);
    startText.hitArea = hitArea;

    startText.on('mouseover', hoverEffect);
    startText.on('mouseout', hoverEffect);
    startText.on('mousedown', transitionTitleView);
  
    TitleView.addChild(startText);
    stage.update();*/
}

function hoverEffect(event) {
    event.target.alpha = (event.type == 'mouseover') ? '1' : '0.5'; 
    stage.update()
}

function transitionTitleView() {
    // Todo: Maybe try to fade out title screen. 
    stage.removeChild(TitleView);
    TitleView = null;
    addGameScreen();
}

function addGameScreen() {
    stage.enableMouseOver(0);
    stage.state = 'game';
    timer = 0;
    reloading = false;
    bgSpawn = 0.5;
    shakeDuration = 0;
    totemCount = 0;

    background = new createjs.Shape();
    background.graphics.beginBitmapFill(loader.getResult('background')).drawRect(0, 0, w, h);
    background.alpha = 0.9;

    projectiles = [];

    if (hardmode) {
        groundHoles = [0, 0, 0, 0, 0, 1, 1];
        totemLand = [5, 7, 8, 9, 11, 13, 15, 16, 19, 20, 21, 23, 27, 28, 29, 30, 33, 34, 35, 36, 37, 38, 39, 41];
        totemHole = [5, 8, 9, 11, 16, 23];
        speedFactor = 0.75;
    }
    else {
        groundHoles = [0, 1, 1, 1, 1, 1, 1, 1, 1];
        totemLand = [0, 1, 2, 3, 4, 6, 10, 12, 14, 17, 18, 22, 24, 25, 26, 31, 32, 40, 42];
        totemHole = [1, 4, 14];
        speedFactor = 0.5;
    }

    var ssPlayer = new createjs.SpriteSheet({
        framerate: 30,
        'images': [loader.getResult('character')],
        'frames': {'width': 214, 'height': 150, 'regX': 107, 'regY': 75, 'count': 31},
        'animations': {
            'fall': [0, 3, '', 0.5],
            'stand': [4, 17, 'stand', 0.4],
            'jump': [18, 22, 'jump', 0.6],
            'run': [23, 30, 'run', 0.5]
        }
    });

    player = new Actor(ssPlayer._regX/2, ssPlayer._frameHeight*0.3334, w*0.75, h*0.4, 'stand', true);
    player.sprite = new createjs.Sprite(ssPlayer, 'stand');
    player.initsensor('right', 4, player.height-4, player.width/2, -4);
    player.initsensor('right2', 4, player.height-4, player.width/2-1, -4);
    player.initsensor('left', 4, player.height-4, -player.width/2, -4);
    player.initsensor('left2', 4, player.height-4, -player.width/2+1, -4);
    player.initsensor('bottom', player.width-16, 4, 0, player.height/2);
    player.initsensor('bottom2', player.width-16, 4, 0, player.height/2-1);
    //player.initsensor('top', player.width-16, 4, 0, -player.height/2);
    //player.initsensor('top2', player.width-16, 4, 0, -player.height/2+1);
    player.hasFired = false;
    player.jumping = 0;
    player.canmultidash = true;

    var ssClothing = new createjs.SpriteSheet({
        framerate: 30,
        'images': [loader.getResult('clothing')],
        'frames': {'width': 214, 'height': 150, 'regX': 107, 'regY': 75, 'count': 31},
        'animations': {
            'fall': [0, 3, '', 0.5],
            'stand': [4, 17, 'stand', 0.4],
            'jump': [18, 22, 'jump', 0.6],
            'run': [23, 30, 'run', 0.5]
        }
    });

    clothing = new createjs.Sprite(ssClothing, 'stand');

    ssEnemy1 = new createjs.SpriteSheet({
        framerate: 10,
        'images': [loader.getResult('enemy1')],
        'frames': {'width': 128, 'height': 128, 'regX': 69, 'regY': 30, 'count': 8},
        'animations': {
            'walk': [5, 7],
            'die': [0, 3, 'end'],
            'hit': [4, 5, 'walk'],
            'end': [-1]
        }
    });

    ssEnemy2 = new createjs.SpriteSheet({
        framerate: 10,
        'images': [loader.getResult('enemy2')],
        'frames': {'width': 128, 'height': 128, 'regX': 64, 'regY': 64, 'count': 10},
        'animations': {
            'walk': [5, 9],
            'die': [0, 3, 'end'],
            'hit': [4, 5, 'walk'],
            'end': [-1]
        }
    });

    ssOrb = new createjs.SpriteSheet({
        framerate: 8,
        'images': [loader.getResult('orb')],
        'frames': {'width': 128, 'height': 128, 'regX': 64, 'regY': 64, 'count': 4},
        'animations': {
            'pulse': [0, 3]
        }
    });

    ssTotem = new createjs.SpriteSheet({
        framerate: 60,
        'images': [loader.getResult('totem')],
        'frames': {'width': 38, 'height': 58, 'regX': 19, 'regY': 29, 'count': 51},
        'animations': {
            'idle': [0, 0, '', 0.5],
            'lit1': [1, 24, 'lit1', 0.5],
            'lit2': [25, 48, 'lit2', 0.5],
            'red' : [49, 49, '', 0.5],
            'dead': [50, 50, '', 0.5]
        }
    });

    // Totem formations
    totemFormations.push([new Point(0, 2)]);
    totemFormations.push([new Point(0, 2), new Point(1, 2), new Point(2, 2)]);
    totemFormations.push([new Point(0, 1), new Point(2, 1), new Point(3, 1), new Point(4, 1), new Point(5, 1)]);
    totemFormations.push([new Point(0, 0), new Point(0, 1), new Point(0, 2), new Point(0, 4)]);
    totemFormations.push([new Point(0, 0), new Point(1, 0), new Point(2, 0),
        new Point(2, 1), new Point(2, 2), new Point(3, 2)]);
    totemFormations.push([new Point(0, 0), new Point(0, 1), new Point(0, 2),
        new Point(0, 3), new Point(1, 0), new Point(3, 0),
        new Point(4, 0), new Point(4, 1), new Point(4, 2),
        new Point(4, 3)]);
    totemFormations.push([new Point(0, 3), new Point(1, 3), new Point(1, 2),
        new Point(1, 1), new Point(1, 0), new Point(2, 3)]);
    totemFormations.push([new Point(0, 0), new Point(1, 0), new Point(1, 1),
        new Point(2, 0), new Point(2, 1), new Point(2, 2),
        new Point(3, 1), new Point(4, 1)]);
    totemFormations.push([new Point(0, 3), new Point(0, 2), new Point(1, 2),
        new Point(1, 1), new Point(2, 1), new Point(2, 0)]);
    totemFormations.push([new Point(0, 0), new Point(0, 1), new Point(1, 1),
        new Point(2, 1), new Point(4, 2), new Point(4, 3),
        new Point(5, 3), new Point(6, 3)]);
    totemFormations.push([new Point(0, 0), new Point(1, 1), new Point(2, 2), new Point(3, 3)]);
    totemFormations.push([new Point(0, 4), new Point(1, 4), new Point(2, 5),
        new Point(2, 4), new Point(2, 3), new Point(3, 4),
        new Point(3, 2), new Point(4, 1), new Point(5, 4),
        new Point(5, 0), new Point(6, 4)]);
    totemFormations.push([new Point(0, 3), new Point(1, 2), new Point(2, 1),
        new Point(3, 2), new Point(4, 3)]);
    totemFormations.push([new Point(0, 3), new Point(1, 4), new Point(1, 2),
        new Point(2, 5), new Point(2, 1), new Point(3, 4),
        new Point(3, 2), new Point(4, 3)]);
    totemFormations.push([new Point(0, 3), new Point(1, 3), new Point(2, 3),
        new Point(2, 2), new Point(2, 1), new Point(2, 0)]);
    totemFormations.push([new Point(0, 1), new Point(1, 2), new Point(1, 1),
        new Point(1, 0), new Point(3, 4), new Point(3, 3),
        new Point(3, 2), new Point(4, 3)]);
    totemFormations.push([new Point(0, 0), new Point(0, 1), new Point(0, 2),
        new Point(0, 3), new Point(1, 4), new Point(2, 2),
        new Point(3, 4), new Point(4, 3), new Point(4, 2),
        new Point(4, 1), new Point(4, 0)]);
    totemFormations.push([new Point(0, 0, 1)]);
    totemFormations.push([new Point(0, 0, 1), new Point(0, 1, 1)]);
    totemFormations.push([new Point(0, 0, 1), new Point(0, 1, 1), new Point(0, 2, 1), new Point(0, 3, 1)]);
    totemFormations.push([new Point(0, 0, 1), new Point(0, 1, 1), new Point(0, 3, 1), new Point(0, 4, 1)]);
    totemFormations.push([new Point(0, 3, 1), new Point(0, 1, 1), new Point(1, 3, 1),
        new Point(1, 1, 1), new Point(2, 3, 1), new Point(2, 1, 1),
        new Point(3, 4, 1), new Point(3, 3, 1), new Point(3, 1, 1),
        new Point(3, 0, 1)]);
    totemFormations.push([new Point(0, 4, 1), new Point(0, 3, 1), new Point(0, 2, 1),
        new Point(0, 1, 1), new Point(2, 1, 1), new Point(3, 1, 1),
        new Point(3, 0, 1)]);
    totemFormations.push([new Point(0, 5, 1), new Point(0, 4, 1), new Point(0, 3, 1),
        new Point(0, 2, 1), new Point(0, 1, 1), new Point(2, 1, 1),
        new Point(3, 1, 1), new Point(4, 1, 1), new Point(5, 1, 1),
        new Point(6, 1, 1), new Point(6, 0, 1)]);
    totemFormations.push([new Point(0, 0, 1), new Point(1, 0, 1),
        new Point(2, 0, 1), new Point(3, 0, 1), new Point(4, 0, 1)]);
    totemFormations.push([new Point(0, 0, 1), new Point(1, 0, 1), new Point(2, 0, 1),
        new Point(5, 0, 1), new Point(6, 0, 1), new Point(7, 0, 1), new Point(8, 0, 1)]);
    totemFormations.push([new Point(0, 2), new Point(0, 1, 1), new Point(0, 0), new Point(1, 1)]);
    totemFormations.push([new Point(0, 1, 1), new Point(1, 1, 1), new Point(2, 1, 1),
        new Point(2, 2), new Point(2, 0), new Point(3, 1)]);
    totemFormations.push([new Point(0, 3, 1), new Point(1, 3), new Point(2, 3),
        new Point(2, 1), new Point(1, 1, 1), new Point(2, 0, 1), new Point(3, 3)]);
    totemFormations.push([new Point(0, 4, 1), new Point(0, 2, 1), new Point(0, 0, 1), new Point(1, 2),
        new Point(2, 4, 1), new Point(2, 2, 1), new Point(2, 0, 1), new Point(3, 2, 1)]);
    totemFormations.push([new Point(0, 0), new Point(1, 3, 1), new Point(1, 1, 1), new Point(2, 4),
        new Point(3, 3, 1), new Point(3, 1, 1), new Point(4, 5, 1), new Point(4, 4, 1),
        new Point(4, 3, 1), new Point(4, 1, 1), new Point(4, 0, 1)]);
    totemFormations.push([new Point(0, 2), new Point(0, 3, 1),
        new Point(1, 2, 1), new Point(1, 3)]);
    totemFormations.push([new Point(0, 1, 1), new Point(0, 0, 1), new Point(1, 1, 1), new Point(1, 0, 1),
        new Point(2, 1, 1), new Point(2, 0, 1), new Point(3, 1, 1), new Point(3, 0, 1)]);
    totemFormations.push([new Point(0, 2, 1), new Point(0, 1, 1), new Point(0, 0, 1), new Point(1, 2),
        new Point(1, 1), new Point(1, 0), new Point(2, 2, 1), new Point(2, 1, 1),
        new Point(2, 0, 1), new Point(3, 2, 1), new Point(3, 1, 1), new Point(3, 0, 1),
        new Point(4, 2, 1), new Point(4, 1, 1), new Point(4, 0, 1)]);
    totemFormations.push([new Point(0, 3), new Point(0, 2), new Point(0, 1, 1), new Point(1, 3, 1),
        new Point(1, 2), new Point(2, 3), new Point(2, 2), new Point(2, 1, 1),
        new Point(3, 3, 1), new Point(3, 2)]);
    totemFormations.push([new Point(0, 1, 1), new Point(1, 1), new Point(2, 1, 1),
        new Point(3, 1), new Point(4, 1, 1), new Point(5, 1), new Point(6, 1, 1)]);
    totemFormations.push([new Point(0, 0, 1), new Point(1, 1), new Point(2, 1), new Point(2, 0, 1),
        new Point(3, 0, 1), new Point(4, 0, 1), new Point(5, 2, 1), new Point(5, 1, 1),
        new Point(5, 0, 1), new Point(6, 2), new Point(7, 2, 1), new Point(7, 1, 1),
        new Point(7, 0, 1)]);
    totemFormations.push([new Point(0, 3), new Point(1, 5, 1), new Point(1, 4, 1), new Point(1, 3),
        new Point(1, 2, 1), new Point(1, 1, 1), new Point(1, 0, 1), new Point(2, 0),
        new Point(3, 5, 1), new Point(3, 4, 1), new Point(3, 2, 1), new Point(3, 1, 1),
        new Point(3, 0, 1), new Point(4, 5, 1), new Point(4, 0), new Point(5, 5, 1), new Point(5, 3),
        new Point(5, 2, 1), new Point(5, 1, 1), new Point(5, 0, 1), new Point(7, 7, 1),
        new Point(7, 6, 1), new Point(7, 5, 1), new Point(7, 4, 1), new Point(7, 3, 1), new Point(7, 2, 1),
        new Point(7, 1, 1), new Point(7, 0)]);
    totemFormations.push([new Point(0, 0), new Point(2, 0), new Point(3, 7, 1), new Point(3, 6, 1),
        new Point(3, 5, 1), new Point(3, 3, 1), new Point(3, 1, 1), new Point(3, 0),
        new Point(4, 0), new Point(5, 3, 1), new Point(5, 2), new Point(5, 1, 1),
        new Point(5, 0, 1), new Point(6, 3, 1), new Point(6, 2), new Point(6, 1, 1), new Point(6, 0, 1),
        new Point(7, 6, 1), new Point(7, 5), new Point(7, 3, 1), new Point(7, 1, 1), new Point(7, 0, 1)]);
    totemFormations.push([new Point(0, 0, 1), new Point(1, 1), new Point(1, 0, 1), new Point(2, 3, 1),
        new Point(2, 1, 1), new Point(2, 0, 1), new Point(3, 3, 1), new Point(3, 2),
        new Point(3, 1), new Point(3, 0), new Point(4, 3, 1), new Point(4, 2),
        new Point(4, 1, 1), new Point(4, 0, 1), new Point(5, 3, 1), new Point(5, 2), new Point(5, 1),
        new Point(5, 0)]);
    totemFormations.push([new Point(0, 4), new Point(0, 3, 1), new Point(0, 2),
        new Point(0, 1, 1), new Point(1, 1, 1), new Point(3, 1, 1),
        new Point(4, 4), new Point(4, 3, 1), new Point(4, 2),
        new Point(4, 1, 1)]);
    totemFormations.push([new Point(0, 3), new Point(1, 5), new Point(1, 4, 1), new Point(1, 3),
        new Point(1, 2, 1), new Point(1, 0, 1), new Point(2, 4, 1),
        new Point(2, 0, 1), new Point(4, 4, 1), new Point(4, 0, 1), new Point(5, 5),
        new Point(5, 4, 1), new Point(5, 3), new Point(5, 2, 1), new Point(5, 0, 1),
        new Point(6, 3)]);
    totemFormations.push([new Point(0, 2), new Point(0, 1), new Point(0, 0), new Point(1, 1), new Point(2, 2),
        new Point(2, 1), new Point(2, 0)]);

    // Add lives
    for(var i = 0; i < player.health; i++) {
        var life = new createjs.Bitmap(loader.getResult('life'));
        life.x = 5 + (20 * i);
        life.y = 5;
        life.scaleX = 0.5;
        life.scaleY = 0.5;
        life.alpha = 0.8;
        lives.addChild(life); 
    }

    score = new createjs.Text('Totems lit: 0', 'bold 18px Tahoma, Geneva, sans-serif', '#111');
    score.x = w-5;
    score.y = 2;
    score.textAlign = 'right';

    stage.addChild(background);

    stage.addChild(player.sprite, clothing);

    // Generate initial platform
    addPlatform(0, h * 0.8, 3, false);

    stage.addChild(lives, score);
}

function spawnOrb(x, y) {
    var orb = new Actor(24, 24, x, y, 'pulse');
    orb.sprite = new createjs.Sprite(ssOrb, 'pulse');
    orb.alpha = 0.8;
    orbs.push(orb);
    stage.addChild(orb.sprite);
}

function spawnEnemy() {
    var direction = Math.random() < 0.5 ? -1 : 1;
    var xStart  = direction == -1 ? w+30 : -30;
    var enemyType = randInt(1, 3);
    var enemy;
    switch (enemyType) {
    case 1:
        enemy = new Actor(64, 128, xStart, randInt(-100, 500), 'walk');
        enemy.sprite = new createjs.Sprite(ssEnemy1, 'walk');
        enemy.health = 2;
        break;
    case 2:
        enemy = new Actor(64, 128, xStart, randInt(-100, 500), 'walk');
        enemy.sprite = new createjs.Sprite(ssEnemy2, 'walk');
        enemy.health = 3;
        break;
    }
    enemy.initsensor('right', 4, enemy.height-8, enemy.width/2, 0);
    enemy.initsensor('left', 4, enemy.height-8, -enemy.width/2, 0);
    enemy.initsensor('bottom', enemy.width, 4, 0, enemy.height/2);
    enemy.initsensor('bottom2', enemy.width, 4, 0, enemy.height/2-1);
    enemy.speed.x = randInt(100, 300) * direction;
    enemy.sprite.scaleX = enemyType == 2 ? 0-direction : direction;
    enemy.sprite.alpha = 0.6;
    enemies.push(enemy);
    stage.addChild(enemy.sprite);
}

function addScore(amount) {
    totemCount += amount;
    score.text = "Totems lit: " + totemCount;
}

function addTotems(id, offsetX, offsetY) {
    var _w = ssTotem._frameWidth * 1.75;
    var _h = ssTotem._frameHeight * 1.15;
    totemFormations[id].forEach(function(point) {
        var _x = offsetX + point.x * _w;
        var _y = offsetY - point.y * _h;
        var _state = point.z == 2 ? 'dead' : point.z == 1 ? 'red' : 'idle';
        var totem = new Actor(_w * 0.5, _h * 0.5, _x, _y, _state);
        totem.sprite = new createjs.Sprite(ssTotem, _state);
        totem.red = point.z;
        totem.lit = 0;
        totem.ignore = 0;
        totem.hit = function() {
            if (this.red == 0 && this.ignore == 0 && this.lit < 2) {
                this.lit++;
                this.ignore = 0.4;
                if (this.lit == 1) {
                    this.state = 'lit1';
                    addScore(1);
                }
                else if (this.lit == 2) {
                    this.state = 'lit2';
                    addScore(2);
                    if (player.jumping != 100 && player.dashing == 0 && !player.ground) {
                        player.speed.y = Math.min(player.speed.y - 300, -750);
                    }
                }
            }
            else if (this.red == 1) {
                this.red = 2;
                this.state = 'dead';
                shake(0.3);
                player.health--;
                lives.removeChildAt(lives.children.length-1);
                if (player.health <= 0) {
                    reloading = true;
                    document.location.reload(true);
                }
            }
        };
        totem.tick = function() {
            if (this.ignore > 0) {
                this.ignore -= delta;
                if (this.ignore < 0)
                    this.ignore = 0;
            }
        };
        totems.push(totem);
        stage.addChild(totem.sprite);
    });
}

function addPlatform(x, y, length, spawnTotems) {
    if (length === undefined) length = 1;
    var spriteImg = loader.getResult('platform');
    var sprite = new createjs.Shape();
    sprite.graphics.beginBitmapFill(spriteImg).drawRect(0, 0, spriteImg.width * length, spriteImg.height);
    sprite.x = Math.round(x);
    sprite.y = Math.round(y);
    sprite.snapToPixel = true;
  
    platform = {
        width: spriteImg.width * length,
        height: spriteImg.height - 16,
        pos: {
            x: sprite.x + (spriteImg.width * length) / 2,
            y: 16 + sprite.y + (spriteImg.height - 16) / 2
        },
        sprite: sprite,
        setbounds: setBounds,
        remove: removePlatform
    };
    platform.setbounds();

    if (spawnTotems === undefined || spawnTotems) {
        addTotems(totemHole[randIntEx(0, totemHole.length)], x + spriteImg.width * length - 32, y - 48);
        bgSpawn -= (length - 1) * 1.75 - 0.15 - 0.5 * groundHoles[randIntEx(0, groundHoles.length)];
        if (length > 1) {
            if ((length == 2 ? randInt(0, 2) : 1) > 0)
                addTotems(totemLand[randIntEx(0, totemLand.length)], x + spriteImg.width * length / 2 - 32, y - 48);
        }
    }

    tilesets.push(platform);
    stage.addChild(platform.sprite);
}

function removePlatform() {
    stage.removeChild(this.sprite);
    for (var i = 1; i < tilesets.length; i++) {
        tilesets[i-1] = tilesets[i];
    }
    tilesets.length -= 1;
}

function tick(event) {
    delta = event.delta / 1000;

    switch (stage.state) {
    case 'title':
        if (input.fire)
        {
            input.fire = false;
            transitionTitleView();
        }
        break;
    case 'game':
        // Tick the timer
        timer += delta;

        // Background spawning
        bgSpawn += delta * speedFactor;
        if (bgSpawn > 2.25) {
            bgSpawn -= 2.25;
            addPlatform(w, h * 0.6 + Math.random() * h * 0.35, groundLength[randIntEx(0, groundLength.length)]);
            if (tilesets.length > 4)
                tilesets[0].remove();
            for (var i = 0, totem; totem = totems[i]; i++) {
                if (totem.colliding()) {
                    stage.removeChild(totem.sprite);
                    totems.splice(i, 1);
                    i--;
                }
            }
        }

        // Background scrolling
        tilesets.forEach(function(tileset) {
            tileset.pos.x -= 300 * delta * speedFactor;
            tileset.sprite.x -= 300 * delta * speedFactor;
            tileset.setbounds();
        });

        // Player inputs and momentum
        if (player.dashing == 0) {
            var accel = player.ground ? 40 : 25;
            if (input.right && player.pos.x <= w && !player.sensor.right.colliding() && player.jumping < 100) {
                player.speed.x += accel;
            }
            if (input.left && player.pos.x >= 0 && !player.sensor.left.colliding() && player.jumping < 100) {
                player.speed.x -= accel;
            }
            player.speed.x = Math.min(Math.max(-player.speed.run, player.speed.x), player.speed.run);
        }

        var decel = player.ground ? 25 : 12;
        if (!input.right && player.speed.x > 0 || player.speed.x > player.speed.run)
            player.speed.x = Math.max(player.speed.x - decel, 0);
        else if (!input.left && player.speed.x < 0 || player.speed.x < -player.speed.run)
            player.speed.x = Math.min(player.speed.x + decel, 0);

        if (player.dashing == 0) {
            if (input.doubletapped.right || input.dash && (input.right || !input.left && player.sprite.scaleX == 1)) {
                player.sprite.scaleX = 1;
                clothing.scaleX = 1;
                player.dash(0.275);
                input.dash = false;
            }
            else if (input.doubletapped.left || input.dash && (input.left || !input.right && player.sprite.scaleX == -1)) {
                player.sprite.scaleX = -1;
                clothing.scaleX = -1;
                player.dash(0.275);
                input.dash = false;
            }
        }

        if (player.ground) {
            if (input.jump && player.jumping == 0)
                player.jump(620);
            /*else if (input.down && player.pos.y < 500)
                player.fall();*/
        }
        else {
            if (player.jumping == 0)
                player.jumping = 1;
            else if (!input.jump && player.jumping == 1)
                player.jumping = 2;
            else if (input.jump && player.jumping == 2) {
                player.jump(90);
            }
            else if (player.jumping >= 3 && player.jumping < 9) {
                player.jumping++;
                player.speed.y -= 140;
            }
            if (input.down && player.jumping < 100) {
                player.pound(1250);
            }
        }

        /*if (input.fire && !player.hasFired) {
            player.shoot();
            player.hasFired = true;
            if (player.ground)
                player.state = 'shootGround';
            else
                player.state = 'shootAir';
            player.sprite.gotoAndPlay(player.state);
        }
        if (player.hasFired && !input.fire) {
            player.hasFired = false;
        }*/

        if (!player.ground && player.dashing == 0)
            player.speed.y += 1600 * delta;

        // Player states
        if (player.state != 'shootGround' && player.state != 'shootAir') {
            if (player.ground) {
                if (player.speed.x == 0)
                    player.state = 'stand';
                else
                    player.state = 'run';
            }
            else {
                if (player.speed.y < 0)
                    player.state = 'jump';
                else
                    player.state = 'fall';
            }
            if (player.dashing > 0)
                player.state = 'jump';
        }

        if (player.state == 'shootGround' || player.state == 'shootAir') {
            if (player.sprite.currentAnimation != player.state)
                player.state = player.sprite.currentAnimation;
        }

        // Update actors and sensors
        player.pos.x -= 2;
        player.update();
        clothing.x = player.sprite.x;
        clothing.y = player.sprite.y;

        // Death at bottom of screen
        if (player.pos.y > h + 128 && !reloading) {
            reloading = true;
            window.location.reload(false);
        }

        // Projectiles update/destruction
        for (var i = 0; i < projectiles.length; i++) {
            var projectile = projectiles[i];
            projectile.updatepos();
            // Remove projectiles no longer on screen
            if (projectile.sprite.x < -projectile.sprite.getBounds().width || projectile.sprite.x > w) {
                stage.removeChild(projectile.sprite);
                projectiles.splice(i, 1);
            }

            // Check projectile and enemy collision
            for (var j = 0; j < enemies.length; j++) {
                var enemy = enemies[j];
                var currAnim = enemy.sprite.currentAnimation;
                if (currAnim != 'end' && currAnim != 'die' && currAnim != 'hit' && projectile.colliding(enemy)) {
                    enemy.sprite.gotoAndPlay('hit');
                    enemy.health -= 1;
                    if (enemy.health <= 0 && currAnim != 'die') {
                        enemy.sprite.gotoAndPlay('die');
                        spawnOrb(enemy.pos.x, enemy.pos.y+36);
                        enemy.speed.x = 0;
                    }
                }
                else if (currAnim == 'end') {
                    stage.removeChild(enemy.sprite);
                    enemies.splice(j, 1);
                }
            }
        }

        // Check for collisions
        if (player.sensor.right.colliding()) {
            player.reposition(false);
            player.speed.x = Math.min(0, player.speed.x);
        }
        else if (player.sensor.left.colliding()) {
            player.reposition(false);
            player.speed.x = Math.max(0, player.speed.x);
        }
        if (player.pos.x > w) {
            player.speed.x = Math.min(0, player.speed.x);
            player.pos.x = w;
        }
        else if (player.pos.x < 0) {
            player.speed.x = Math.max(0, player.speed.x);
            player.pos.x = 0;
        }
        if (!player.ground && player.groundIgnore <= 0 && player.speed.y > 0 && player.sensor.bottom.colliding())
            player.land();
        if ((player.ground && !player.sensor.bottom.colliding()) || player.groundIgnore > 0)
            player.ground = false;
        if (player.groundIgnore > 0)
            player.groundIgnore -= delta;

        // Set player animation
        if (player.sprite.currentAnimation != player.state) {
            player.sprite.gotoAndPlay(player.state);
            clothing.gotoAndPlay(player.state);
        }

        // Set player orientation
        if (player.speed.x > 0 && player.sprite.scaleX == -1) {
            player.sprite.scaleX = 1;
            clothing.scaleX = 1;
        }
        else if (player.speed.x < 0 && player.sprite.scaleX == 1) {
            player.sprite.scaleX = -1;
            clothing.scaleX = -1;
        }

        if (player.sensor.bottom2.colliding() && !reloading) {
            reloading = true;
            document.location.reload(true);
        }

        // Now do the same thing for the enemies
        for (var i = 0; i < enemies.length; i++) {
            var enemy = enemies[i];
            if (enemy.sprite.currentAnimation == 'walk')
            {
                if (enemy.sprite.x < -enemy.sprite.getBounds().width || enemy.sprite.x > w+enemy.sprite.getBounds().width) {
                    stage.removeChild(enemy.sprite);
                    enemies.splice(i, 1);
                    player.health--;
                    lives.removeChildAt(lives.children.length-1);
                    if (player.health <= 0)
                        document.location.reload(true);
                }
            }

            if (!enemy.ground)
                enemy.speed.y += 1200 * delta;

            if (!enemy.ground && enemy.speed.y > 0 && enemy.sensor.bottom.colliding())
                enemy.land();
            if (enemy.ground && !enemy.sensor.bottom.colliding())
                enemy.ground = false;

            enemy.update();
        }

        // Update totems
        for (var i = 0, totem; totem = totems[i]; i++) {
            totem.speed.x = -300 * speedFactor;

            if (player.colliding(totem))
                totem.hit();

            if (totem.sprite.currentAnimation != totem.state)
                totem.sprite.gotoAndPlay(totem.state);

            totem.update();
            totem.tick();

            if (totem.pos.x < -ssTotem._frameWidth) {
                stage.removeChild(totem.sprite);
                totems.splice(i, 1);
                i--;
            }
        }
        break;
    default:
        break;
    }

    // Update stage
    stage.update(event);

    // Update input
    input.update();

    // Update shake
    updateShake();

    // Increase speed factor
    speedFactor += ((hardmode ? 1.75 : 1.25) - speedFactor) * (hardmode ? 0.00026 : 0.00015);
}

function actorShoot() {
    var projectile = new Actor(24, 6, this.pos.x-12, this.pos.y+24);
    projectile.speed.x = 1500 * this.sprite.scaleX;
    projectile.sprite = new createjs.Bitmap(loader.getResult('projectile'));
    projectile.sprite.scaleX = this.sprite.scaleX;

    projectiles.push(projectile);
    stage.addChild(projectile.sprite);
}

function actorJump(force) {
    this.ground = false;
    this.speed.y = -force;
    this.dashcancel();
    if (this.jumping !== undefined)
        this.jumping++;
}

function actorFall() {
    this.ground = false;
    this.groundIgnore = 0.2;
}

function actorPound(force) {
    this.speed.x = 0;
    this.speed.y = force;
    this.dashcancel();
    if (this.jumping !== undefined)
        this.jumping = 100;
}

function actorLand() {
    this.ground = true;
    this.hasdashed = false;
    this.speed.y = 0;
    this.reposition(true);
    if (this.jumping !== undefined) {
        if (this.jumping == 100) {
            shake(0.3);
        }
        this.jumping = 0;
    }
}

function actorDash(duration) {
    if (this.dashing == 0) {
        if (this.dashdelay == 0) {
            if (duration !== undefined && (this.ground || !this.hasdashed || this.canmultidash !== undefined)) {
                this.hasdashed = !this.ground;
                this.dashing = duration;
                shake(0.15);
            }
        }
        else {
            this.dashdelay -= delta;
            if (this.dashdelay < 0)
                this.dashdelay = 0;
        }
    }
    if (this.dashing > 0) {
        this.dashing -= delta;
        if (this.dashing > 0) {
            this.speed.x = this.dashforce * this.sprite.scaleX;
            this.speed.y = 0;
        }
        else {
            this.dashing = 0;
            this.dashdelay = 0.35;
        }
    }
}

function actorDashCancel() {
    if (this.dashing != 0) {
        this.dashing = 0;
        this.dashdelay = 0.35;
    }
}

function actorReposition(vertical) {
    var limit;
    if (vertical === undefined || vertical) {
        if (this.sensor.bottom2 !== undefined) {
            limit = 32;
            while (this.sensor.bottom2.colliding() && limit > 0) {
                this.pos.y -= 1;
                this.updatesensors();
                limit--;
            }
        }
        if (this.sensor.top2 !== undefined) {
            limit = 32;
            while (this.sensor.top2.colliding() && limit > 0) {
                this.pos.y += 1;
                this.updatesensors();
                limit--;
            }
        }
    }
    if (vertical === undefined || !vertical) {
        if (this.sensor.right2 !== undefined) {
            limit = 32;
            while (this.sensor.right2.colliding() && limit > 0) {
                this.pos.x -= 1;
                this.updatesensors();
                limit--;
            }
        }
        if (this.sensor.left2 !== undefined) {
            limit = 32;
            while (this.sensor.left2.colliding() && limit > 0) {
                this.pos.x += 1;
                this.updatesensors();
                limit--;
            }
        }
    }
}

function actorUpdate() {
    this.updatepos();
    this.updatesensors();
    this.dash();
}

function actorUpdateSensors() {
    for (var key in this.sensor)
        this.sensor[key].updatepos();
}

function initSensor(label, width, height, offsetX, offsetY) { // Creates child (sensor) for parent
    if (this.sensor === undefined)
        this.sensor = {};
    this.sensor[label] = {
        width: width,
        height: height,
        pos: {
            x: this.pos.x,
            y: this.pos.y
        },
        offset: {
            x: offsetX,
            y: offsetY
        },
        parent: this,
        setbounds: setBounds,
        updatepos: updatePos,
        colliding: colliding
    };
}

function shake(duration) {
    shakeDuration = duration;
}

function updateShake() {
    if (shakeDuration > 0) {
        shakeDuration -= delta;
        if (shakeDuration > 0) {
            var max = (shakeDuration * 64) | 0;
            var min = -max;
            document.getElementById('arena').style.margin =
                [randInt(min, max), randInt(min, max), randInt(min, max), randInt(min, max)]
                    .join('px ') + 'px';
        }
        else {
            document.getElementById("arena").style.margin = '0';
        }
    }
}

function updatePos() {
    if (this.offset !== undefined) { // Sensor positioning
        this.pos.x = this.parent.pos.x + this.offset.x;
        this.pos.y = this.parent.pos.y + this.offset.y;
    } else if (this.speed !== undefined) { // Player positioning
        this.pos.x += this.speed.x * delta;
        this.pos.y += this.speed.y * delta;
    }
    if (this.sprite !== undefined) { // Sprite positioning
        this.sprite.x = this.pos.x;
        this.sprite.y = this.pos.y;
    }
}

function setBounds() { // Calculates object bounds for collision detection
    this.bound = {
        right: this.pos.x + this.width/2,
        left: this.pos.x - this.width/2,
        bottom: this.pos.y + this.height/2,
        top: this.pos.y - this.height/2
    };
}

function colliding(_objects) { // Compares object bounds vs objects[] to test for collision
    this.setbounds();
    var objects = [];
  
    if (_objects === undefined)
        objects = tilesets;
    else if (_objects[0] === undefined)
        objects.push(_objects);
    else
        objects = _objects;
  
    for (var i = 0; i < objects.length; i++) {
        var object = objects[i];
        if (object.state !== undefined)
            object.setbounds();
        if (this.bound.right > object.bound.left &&
            this.bound.left < object.bound.right &&
            this.bound.bottom > object.bound.top &&
            this.bound.top < object.bound.bottom)
            return true;
    }
    return false;
}

function keyPressedDown() {
    if (key.isPressed('left') || key.isPressed('a')) {
        input.id |= 1;
        input.left = true;
    }
    if (key.isPressed('right') || key.isPressed('d')) {
        input.id |= 2;
        input.right = true;
    }
    if (key.isPressed('down') || key.isPressed('s')) {
        input.id |= 4;
        input.down = true;
    }
    if (key.isPressed('up') || key.isPressed('w')) {
        input.id |= 8;
        input.jump = true;
    }
    if (key.isPressed('space') || key.isPressed('enter')) {
        input.id |= 16;
        input.fire = true;
    }
    if (key.isPressed('z') || key.isPressed('l')) {
        input.id |= 32;
        input.dash = true;
    }

    var multiple = input.id > 2 && input.id != 4 && input.id != 8 && input.id != 16 && input.id != 32;

    if (input.released || multiple) {
        input.released = false;
        if (input.duration == 0 || (input.id & input.last) == 0 || multiple)
            input.duration = 0.2;
        else {
            var overlap = input.id & input.last;
            if ((overlap & 1) == 1)
                input.doubletapped.left = true;
            if ((overlap & 2) == 2)
                input.doubletapped.right = true;
            if ((overlap & 4) == 4)
                input.doubletapped.down = true;
            if ((overlap & 8) == 8)
                input.doubletapped.jump = true;
            if ((overlap & 16) == 16)
                input.doubletapped.fire = true;
            if ((overlap & 32) == 32)
                input.doubletapped.dash = true;
        }
    }

    input.last = input.id;
    
    if (key.isPressed('r'))
        window.location.reload(false);
}

function keyPressedUp() {
    input.released = true;

    if (!key.isPressed('left') && !key.isPressed('a')) {
        input.id &= 62;
        input.left = false;
    }
    if (!key.isPressed('right') && !key.isPressed('d')) {
        input.id &= 61;
        input.right = false;
    }
    if (!key.isPressed('down') && !key.isPressed('s')) {
        input.id &= 59;
        input.down = false;
    }
    if (!key.isPressed('up') && !key.isPressed('w')) {
        input.id &= 55;
        input.jump = false;
    }
    if (!key.isPressed('space') && !key.isPressed('enter')) {
        input.id &= 47;
        input.fire = false;
    }
    if (!key.isPressed('z') && !key.isPressed('l')) {
        input.id &= 31;
        input.dash = false;
    }
}

function inputUpdate() {
    input.duration = Math.max(input.duration - delta, 0);
    input.doubletapped = {
        left: false,
        right: false,
        down: false,
        jump: false,
        fire: false,
        dash: false
    };
}

function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randIntEx(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}
