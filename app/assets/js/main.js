// Stage Variables
var stage, w, h, loader, delta, timer, reloading;

// Title Screen
var TitleView = new createjs.Container();

// Game Screen
var input, ground, player, spirit;
var projectiles, spriteSheetPlatform;
var ssEnemy1, ssEnemy2, ssEnemy3;
var ssOrb, spiritCount, scoreText;
var tilesets = [], enemies = [], orbs = [];
var lives = new createjs.Container();
var bgSpawn, shake;
var shakeElapsed = 0;


function init() {
    stage = new createjs.Stage('arena');

    // grab canvas width and height for later calculations:
    w = stage.canvas.width;
    h = stage.canvas.height;

    manifest = [
        {src: 'heroine.png', id: 'character'},
        {src: 'ground.png', id: 'platform'},
        {src: 'arrow-1.png', id: 'projectile'},
        {src: 'background-2.png', id: 'background'},
        {src: 'enemy1-spritesheet.png', id: 'enemy1'},
        {src: 'enemy2-spritesheet.png', id: 'enemy2'},
        {src: 'enemy3-spritesheet.png', id: 'enemy3'},
        {src: 'spirit-orb-spritesheet.png', id: 'orb'},
        {src: 'plume-heart.png', id: 'life'},
        {src: 'title-bg.png', id: 'title-bg'}
    ];

    loader = new createjs.LoadQueue(false);
    loader.addEventListener('complete', handleComplete);
    loader.loadManifest(manifest, true, 'assets/sprites/');
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
        y: y};
    this.speed = {
        x: 0,
        y: 0};
    this.state = state;
    this.ground = ground;
    this.health = 7;
    this.groundIgnore = 0;
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
        doubletapped: {
            left: false,
            right: false,
            down: false,
            jump: false,
            fire: false
        },
        released: true,
        duration: 0,
        update: inputUpdate
    };
    this.document.onkeydown = keyPressedDown;
    this.document.onkeyup = keyPressedUp;
  
    var titleBg = new createjs.Shape();
    titleBg.graphics.beginBitmapFill(loader.getResult('title-bg')).drawRect(0, 0, w, h);
  
    var startText = new createjs.Text('Start', '32px Tahoma, Geneva, sans-serif', '#000');
    startText.x = w/2 - 32;
    startText.y = 350;
    startText.alpha = 0.5;

    var hitArea = new createjs.Shape();
    hitArea.graphics.beginFill('#FFF').drawRect(0, 0, startText.getMeasuredWidth()+5, startText.getMeasuredHeight()+10);
    startText.hitArea = hitArea;

    startText.on('mouseover', hoverEffect);
    startText.on('mouseout', hoverEffect);
    startText.on('mousedown', transitionTitleView);
  
    TitleView.addChild(titleBg, startText);
    stage.addChild(TitleView);
    stage.update();
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
    bgSpawn = 1.25;

    background = new createjs.Shape();
    background.graphics.beginBitmapFill(loader.getResult('background')).drawRect(0, 0, w, h);
    background.alpha = 0.9;

    projectiles = [];

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

    player = new Actor(ssPlayer._regX/2, ssPlayer._frameHeight*0.3334, w/2, h/2, 'stand', true);
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

    // Add lives
    for(var i = 0; i < player.health; i++) {
        var life = new createjs.Bitmap(loader.getResult('life'));
        life.x = 5 + (20 * i);
        life.y = 5;
        life.scaleX = 0.5;
        life.scaleY = 0.5;
        life.alpha = 0.5;
        lives.addChild(life); 
    }

    score = new createjs.Text('0', 'bold 18px Tahoma, Geneva, sans-serif', '#111');
    score.x = w-5;
    score.y = 2;
    score.textAlign = 'right';

    stage.addChild(background);


    stage.addChild(player.sprite);

    // Generate initial platform
    addPlatform(0, h * 0.8, 2);

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
    var enemyType = getRandomInt(1, 3);
    var enemy;
    switch (enemyType) {
    case 1:
        enemy = new Actor(64, 128, xStart, getRandomInt(-100, 500), 'walk');
        enemy.sprite = new createjs.Sprite(ssEnemy1, 'walk');
        enemy.health = 2;
        break;
    case 2:
        enemy = new Actor(64, 128, xStart, getRandomInt(-100, 500), 'walk');
        enemy.sprite = new createjs.Sprite(ssEnemy2, 'walk');
        enemy.health = 3;
        break;
    }
    enemy.initsensor('right', 4, enemy.height-8, enemy.width/2, 0);
    enemy.initsensor('left', 4, enemy.height-8, -enemy.width/2, 0);
    enemy.initsensor('bottom', enemy.width, 4, 0, enemy.height/2);
    enemy.initsensor('bottom2', enemy.width, 4, 0, enemy.height/2-1);
    enemy.speed.x = getRandomInt(100, 300) * direction;
    enemy.sprite.scaleX = enemyType == 2 ? 0-direction : direction;
    enemy.sprite.alpha = 0.6;
    enemies.push(enemy);
    stage.addChild(enemy.sprite);
}

function addPlatform(x, y, length) {
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
        bgSpawn += delta;
        if (bgSpawn > 2.25) {
            bgSpawn = 0;
            addPlatform(w, h * 0.6 + Math.random() * h * 0.35);
            if (tilesets.length > 4)
                tilesets[0].remove();
        }

        // Background scrolling
        tilesets.forEach(function(tileset) {
            tileset.pos.x -= 300 * delta;
            tileset.sprite.x -= 300 * delta;
            tileset.setbounds();
        });

        // Player inputs and momentum
        var accel = player.ground ? 40 : 25;
        if (input.right && player.pos.x <= w && !player.sensor.right.colliding() && player.jumping < 100) {
            player.speed.x += accel;
        }
        if (input.left && player.pos.x >= 0 && !player.sensor.left.colliding() && player.jumping < 100) {
            player.speed.x -= accel;
        }
        player.speed.x = Math.min(Math.max(-500, player.speed.x), 500);
        var decel = player.ground ? 25 : 12;
        if (!input.right && player.speed.x > 0)
            player.speed.x = Math.max(player.speed.x - decel, 0);
        else if (!input.left && player.speed.x < 0)
            player.speed.x = Math.min(player.speed.x + decel, 0);
        if (player.ground) {
            if (input.jump && player.jumping == 0)
                player.jump(600);
            /*else if (input.down && player.pos.y < 500)
                player.fall();*/
        }
        else {
            if (!input.jump && player.jumping == 1)
                player.jumping = 2;
            else if (input.jump && player.jumping == 2) {
                player.jump(100);
            }
            if (player.jumping >= 3 && player.jumping < 8) {
                player.jumping++;
                player.speed.y -= 140;
            }
            if (input.down && player.jumping < 100) {
                player.pound(800);
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
        if (!player.ground)
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
        }

        if (player.state == 'shootGround' || player.state == 'shootAir') {
            if (player.sprite.currentAnimation != player.state)
                player.state = player.sprite.currentAnimation;
        }

        // Update actors and sensors
        player.pos.x -= 2;
        player.update();
        updateShake();

        // Death at bottom of screen
        if (player.pos.y > h + 256 && !reloading) {
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
            player.reposition();
            player.speed.x = Math.min(0, player.speed.x);
        }
        else if (player.sensor.left.colliding()) {
            player.reposition();
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
        if (player.sprite.currentAnimation != player.state)
            player.sprite.gotoAndPlay(player.state);

        // Set player orientation
        if (player.speed.x > 0 && player.sprite.scaleX == -1)
            player.sprite.scaleX = 1;
        else if (player.speed.x < 0 && player.sprite.scaleX == 1)
            player.sprite.scaleX = -1;

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
        break;
    default:
        break;
    }

    // Update stage
    stage.update(event);

    // Update input
    input.update();
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
    if (this.jumping !== undefined)
        this.jumping = 100;
}

function actorLand() {
    this.ground = true;
    this.speed.y = 0;
    this.reposition();
    if (this.jumping === 100) {
        shake = true;
        shakeElapsed = 0;
    }
    if (this.jumping !== undefined)
        this.jumping = 0;
}

function actorReposition() {
    if (this.sensor.bottom2 !== undefined) {
        while (this.sensor.bottom2.colliding()) {
            this.pos.y -= 1;
            this.updatesensors();
        }
    }
    if (this.sensor.right2 !== undefined) {
        while (this.sensor.right2.colliding()) {
            this.pos.x -= 1;
            this.updatesensors();
        }
    }
    else if (this.sensor.left2 !== undefined) {
        while (this.sensor.left2.colliding()) {
            this.pos.x += 1;
            this.updatesensors();
        }
    }
}

function actorUpdate() {
    this.updatepos();
    this.updatesensors();
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

function updateShake() {
    if (shake) {
        shakeElapsed += delta;
        if (shakeElapsed < .5) {
            var margin = [getRandomInt(-200, 200), getRandomInt(-200, 200),
                          getRandomInt(-200, 200), getRandomInt(-200, 200)].join('px ') + 'px';
            document.getElementById('arena').style.margin = margin;
            var rgb = [getRandomInt(30, 230), getRandomInt(30, 230), getRandomInt(30, 230)].join(',')
            document.body.style.background = 'rgb(' + rgb + ')';
        }
        else {
            shake = false;
            document.getElementById("arena").style.margin = '0';
            document.body.style.background = '#CECECE';
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

    if (input.released) {
        input.released = false;

        if (input.duration == 0 || (input.id & input.last) == 0)
            input.duration = 0.35;
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
        }
    }

    input.last = input.id;
    
    if (key.isPressed('r'))
        window.location.reload(false);
}

function keyPressedUp() {
    input.released = true;

    if (!key.isPressed('left') && !key.isPressed('a')) {
        input.id &= 30;
        input.left = false;
    }
    if (!key.isPressed('right') && !key.isPressed('d')) {
        input.id &= 29;
        input.right = false;
    }
    if (!key.isPressed('down') && !key.isPressed('s')) {
        input.id &= 27;
        input.down = false;
    }
    if (!key.isPressed('up') && !key.isPressed('w')) {
        input.id &= 23;
        input.jump = false;
    }
    if (!key.isPressed('space') && !key.isPressed('enter')) {
        input.id &= 15;
        input.fire = false;
    }
}

function inputUpdate() {
    input.duration = Math.max(input.duration - delta, 0);
    input.doubletapped = {
        left: false,
        right: false,
        down: false,
        jump: false,
        fire: false
    };
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}
