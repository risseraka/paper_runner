var canvas = document.getElementById('canvas'),
    ctx = canvas.getContext('2d');

var SCREEN_WIDTH = 512,
    SCREEN_HEIGHT = 256;

var BACKGROUND = 'static/papier.png',
    LINE = 'static/line.png',
    HAND = 'static/hand.png',
    SPRITESHEET = {
        sprites: 'static/spritesheet.png',
        frameSize: [64, 128]
    },
    HOLE = 'static/trou.png',
    BLOC = 'static/crayons.png',
    PLANE = 'static/plane.png';

var DEFAULT_SPEED = 15,
    SLOW_SPEED = 10,
    FAST_SPEED = 20,
    SCROLL_SPEED = 5;

var HAND_HIGH = {
    x: -30,
    y: 0
},
    HAND_LOW = {
        x: 0,
        y: 100
    };

var GROUND = 15;
var PHY = {
    GRAVITY: 1,
    acceleration: 15,
    g: 0,
    MAX_ACCELERATION: 15,
};

var currentObstacle = BLOC;
var OBSTACLES = [];

var mouse = {
    x: 0,
    y: 0,
    down: false
}
var keyboard = {
    left: false,
    top: false,
    right: false,
    bottom: false
}
var previous = [],
    fps;

var game = true;

var background, line, hand, player, uid;

function Player(spriteSheet, x, y) {
    this.X = x || 0;
    this.Y = y || canvas.height - GROUND;
    this.x = this.X;
    this.y = this.Y;
    this.width = spriteSheet.frameSize[0];
    this.height = spriteSheet.frameSize[1];

    this.spriteSheet = new Image();
    this.spriteSheet.src = spriteSheet.sprites;
    this.frame = 0;

    this.ready = false;
    this.moveable = true;
    this.jump = false;
    this.fall = false;
    this.speed = DEFAULT_SPEED;

    this.handleSpeed = function (speed) {
        this.speed = speed;
    }

    this.handleJump = function (jump) {
        if (!this.fall) {
            if (!jump && this.jump) {
                this.fall = true;
                PHY.acceleration = 0;
            } else {
                this.fall = false;
            }
            this.jump = jump;
        }
    }
    this.animate = function () {
        this.moveable = true;
        if (this.x > hand.position.x + hand.width) this.ready = true;
        for (var i = 0; i < OBSTACLES.length; i++) {
            var o = OBSTACLES[i];
            if (this.collide(o)) {
                if (o.tag == 'trou' || o.tag == 'plane') {
                    gameOver();
                } else if (o.tag == 'crayons') {
                    this.moveable = false;
                }
            }
        }

        //JUMP & FALL
        if (this.y < PHY.GROUND && !this.jump) this.fall = true;

        if (PHY.acceleration < 0) {
            this.jump = false;
            this.fall = true;
        }
        if (this.jump) {
            this.y -= PHY.acceleration;
            PHY.acceleration -= PHY.GRAVITY;
        } else if (this.fall) {
            if (PHY.acceleration > PHY.MAX_ACCELERATION) PHY.acceleration = PHY.MAX_ACCELERATION;

            this.y += PHY.acceleration;
            PHY.acceleration += PHY.GRAVITY;

            if (this.y > PHY.GROUND) {
                PHY.acceleration = PHY.MAX_ACCELERATION;
                this.y = PHY.GROUND;
                this.jump = false;
                this.fall = false;
            }
        }

        if (this.moveable) {
            if (this.x > this.X) this.x += (this.X - this.x) / this.speed;
            else if (this.x < this.X) this.x += (this.x - this.X) / this.speed;

            this.x += this.speed;
        }
        this.frame += 0.3;
        if (this.frame >= 4) this.frame = 0;
    }

    this.collide = function (obstacle) {
        if (this.x - this.width / 2 > obstacle.x + obstacle.width / 2 - 20 || // Collision Gauche
        this.x + this.width / 2 < obstacle.x - obstacle.width / 2 + 20 || // Collision Droite
        this.y - this.height + 30 > obstacle.y + obstacle.width / 2 - 20 || // Collision Haut
        this.y - 25 < obstacle.y - obstacle.width / 2 + 20) { // Collision Bas
            return false;
        } else return true;
    }

    this.draw = function (context) {
        context.drawImage(this.spriteSheet, 0 + (this.width * Math.floor(this.frame)), 0, this.width, this.height, this.x - this.width / 2, this.y - this.height, this.width, this.height);
        //                context.strokeRect(this.x-this.width/2, this.y-this.height+30, this.width, this.height-55);
    }
}

function Obstacle(img, x, y) {
    this.img = new Image();
    this.img.src = img;

    this.build = function () {
        this.x = x;
        this.y = y;
        this.width = this.img.width;
        this.height = this.img.height;
        this.tag = img.substr(7, img.indexOf('.') - 7);
        this.planeDir = 1;
        OBSTACLES.push(this);
    }
    this.draw = function (context) {
        context.drawImage(this.img, this.x - this.width / 2, this.y - this.height / 2);
        //                context.strokeRect(this.x-this.width/2+25, this.y-this.height/2+30, this.width-50, this.height-55);
    }

    var that = this;
    this.img.onload = function () {
        that.build();
    }
}

function Ground(img) {
    this.x = 0;
    this.y = player.y - 38;
    this.img = new Image();
    this.img.src = img;

    this.tag = 'ground';

    this.build = function () {
        this.width = this.img.width;
    }
    this.draw = function (context) {
        for (var i = 0; this.x + this.width * i < canvas.width; i++)
        ctx.drawImage(this.img, this.x + this.width * i, this.y);
    }

    var that = this;
    this.img.onload = function () {
        that.build();
    }
}

function Hand(img, moves) {
    this.position = {
        x: -30,
        y: 0
    };
    this.img = new Image();
    this.img.src = img;

    this.build = function () {
        this.width = this.img.width;
        this.height = this.img.height;

        var tweenDown = new TWEEN.Tween(this.position).to(HAND_LOW, 2000);
        tweenDown.easing(TWEEN.Easing.Elastic.EaseInOut);
        var tweenUp = new TWEEN.Tween(this.position).to(HAND_HIGH, 2000);
        tweenUp.easing(TWEEN.Easing.Elastic.EaseInOut);

        tweenDown.chain(tweenUp);
        tweenUp.chain(tweenDown);

        tweenDown.start();
    }
    this.animate = function () {
        this.x = this.position.x;
        this.y = this.position.y;
        TWEEN.update();
        if (uid == 1 && player.ready && player.collide(this)) gameOver();
    }
    this.draw = function (context) {
        context.drawImage(this.img, this.position.x, this.position.y);
    }

    var that = this;
    this.img.onload = function () {
        that.build();
    }
}

function Menus(img) {
    this.background = new Image();
    this.background.src = img;
    this.state = 'waiting';
    this.loop = true;
    this.buttons = [];

    this.waiting = function () {
        if (this.state == 'waiting') {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(this.background, 0, 0);
            ctx.font = '15pt bold';
            ctx.fillText('WAITING FOR AN OTHER PLAYER...', 25, 40);
            this.state = 'waiting';
        }
    }
    this.ready = function () {
        if (!this.buttons.length) {
            this.buttons.push(new Button(0, 0, 'static/play.png', emitReady));
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(this.background, 0, 0);

        this.drawButtons();
        this.state = 'ready';
    }
    this.start = function () {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(this.background, 0, 0);
        game = true;
        run();
    }

    this.drawButtons = function () {
        for (var i = 0; i < this.buttons.length; i++) {
            this.buttons[i].draw();
        }
    }
    this.pressButtons = function (x, y) {
        for (var i = 0; i < this.buttons.length; i++) {
            if (this.buttons[i].hover(x, y)) {
                this.buttons[i].down = true;
            }
        }
    }
    this.releaseButtons = function () {
        for (var i = 0; i < this.buttons.length; i++) {
            this.buttons[i].down = false;
        }
    }
    this.run = function () {
        var start = (new Date).getTime();

        this[this.state]();

        var end = (new Date).getTime(),
            time = (16 - (end - start) < 0) ? 0 : 16 - (end - start);
        if (this.loop) {
            setTimeout(function () {
                menu.run();
            }, time);
        }
    }
}

function Button(x, y, img, callback) {
    this.img = new Image();
    this.img.src = img;

    this.build = function () {
        this.x = x;
        this.y = y;
        this.width = parseInt(canvas.style.width);
        this.height = parseInt(canvas.style.height);
        this.tag = 'button';
        this.active = false;
        this.down = false;
        this.callback = callback;

        this.draw();
    }
    this.hover = function (x, y) {
        if (x >= this.x && x <= this.x + this.width && y >= this.y && y <= this.y + this.height) return true;
        else return false;
    }
    this.draw = function () {
        ctx.drawImage(this.img, this.x, this.y);
        if (this.active) {
            ctx.fillStyle = 'rgba(153,153,153,0.3)';
            ctx.fillRect(this.x, this.y, this.width, this.height);
        } else if (this.hover(mouse.x, mouse.y) && this.down) {
            this.down = false;
            this.active = true;
            this.callback();
        }
    }

    var that = this;
    this.img.onload = function () {
        that.build();
    }
}

window.addEventListener('load', function () {
    init();
    run();
}, false);

function loadEvent() {
    if (uid === 1) {
        window.addEventListener('keydown', function (event) {
            var k = event.keyCode;

            if (k == 37) {
                emitSpeed(SLOW_SPEED);
            }
            if (k == 38 || k == 32) {
                emitJump(1);
            }
            if (k == 39) {
                emitSpeed(FAST_SPEED);
            }
            if (k == 40) {
                emitJump(0);
            }
        }, false);

        window.addEventListener('keyup', function (event) {
            var k = event.keyCode;

            if (k == 37 || k == 39) {
                emitSpeed(DEFAULT_SPEED);
            }
            if (k == 38 || k == 32) {
                emitJump(0);
            }
        }, false);

        canvas.addEventListener('mousedown', function (event) {
            emitJump(1);
        }, false);

        canvas.addEventListener('mouseup', function (event) {
            emitJump(0);
        }, false);

        window.addEventListener('touchstart', function (event) {
            emitJump(1);
        }, false);

        window.addEventListener('touchmove', function (event) {
            emitJump(1);
        }, false);

        window.addEventListener('touchend', function (event) {
            emitJump(0);
        }, false);
        window.addEventListener('deviceorientation', function (event) {
            var g = event.gamma;

            if (g < -20) {
                emitSpeed(SLOW_SPEED);
            } else if (g > 20) {
                emitSpeed(FAST_SPEED);
            } else {
                emitSpeed(DEFAULT_SPEED);
            }
        }, false);
    } else if (uid === 2) {
        canvas.addEventListener('mousedown', function (event) {
            //           if (!menu.loop) {
            emitObstacle(currentObstacle, mouse.x, mouse.y);
            //          }
        }, false);

        window.addEventListener('touchstart', function (event) {
            //            if (!menu.loop) {
            emitObstacle(currentObstacle, mouse.x, mouse.y);
            //            }
        }, false);
    }

    canvas.addEventListener('touchstart', function (event) {
        event.preventDefault();
        event.stopPropagation();
        mouse.x = event.clientX;
        mouse.y = event.clientY;
        //        menu.pressButtons(event.clientX, event.clientY);
    }, false);

    window.addEventListener('mousedown', function (event) {
        event.preventDefault();
        event.stopPropagation();
        mouse.x = event.clientX;
        mouse.y = event.clientY;
        //        menu.pressButtons(event.clientX, event.clientY);
    }, false);

    window.addEventListener('mouseup', function (evnet) {
        //        menu.releaseButtons();
    }, false);
}

function init() {
    canvas.width = SCREEN_WIDTH;
    canvas.height = SCREEN_HEIGHT;
    canvas.style.width = '1024px';
    canvas.style.height = '512px';

    //    menu = new Menus(BACKGROUND);
    PHY['GROUND'] = canvas.height - GROUND;

    background = new Image();
    background.onload = function () {
        //      menu.waiting();
        //      menu.run();
    }
    background.src = BACKGROUND;
    hand = new Hand(HAND, [HAND_HIGH, HAND_LOW]);
    player = new Player(SPRITESHEET);
    OBSTACLES.push(new Ground(LINE));
}

function run() {
    var start = (new Date).getTime();
    animate();
    render();
    computeFPS();

    var end = (new Date).getTime(),
        time = (16 - (end - start) < 0) ? 0 : 16 - (end - start);
    if (game) setTimeout(run, time);
}

function animate() {
    if (OBSTACLES.length) {
        paralax(OBSTACLES);
    }
    player.animate();
    hand.animate();
}

function render() {
    ctx.drawImage(background, 0, 0);

    player.draw(ctx);
    drawLevel();
}

function drawLevel() {
    for (var i = 0; i < OBSTACLES.length; i++)
    OBSTACLES[i].draw(ctx);
    hand.draw(ctx);
}

function paralax(element) {
    var speed = SCROLL_SPEED;

    for (var i = 0; i < element.length; i++) {
        var e = element[i];
        if (e.tag == 'plane') {
            var YMAX = 50,
                YMIN = 200;

            if (e.y > YMIN) {
                e.planeDir = -1;
            } else if (e.y < YMAX) {
                e.planeDir = 1;
            }
            e.y += e.planeDir * 2;
            e.x += speed / 2;
        }
        e.x -= speed;
        if (e.tag != 'ground' && player.collide(e)) player.x -= speed;
        if (e.x < -e.width) {
            if (e.tag == 'ground') {
                e.x + canvas.width + e.width;
            } else {
                OBSTACLES.splice(i--, 1);
            }
        }
    }
}

function gameOver() {
    emitGameOver();
    //    game = false;
}

function computeFPS() {
    if (previous.length > 60) {
        previous.splice(0, 1);
    }

    previous.push((new Date).getTime());
    for (var id = 0, sum = 0; id < previous.length - 1; id++) {
        sum += previous[id + 1] - previous[id];
    }

    fps = Math.floor(1000.0 / (sum / previous.length));
}