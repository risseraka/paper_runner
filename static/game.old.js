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

var currentObstacle = HOLE;
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

    this.animate = function () {
        this.moveable = true;
		if(this.x > 100)
			this.ready = true;
        for (var i = 0; i < OBSTACLES.length; i++) {
			var o = OBSTACLES[i];
            if (this.collide(o)){
				if (o.tag == 'trou' || o.tag == 'plane'){
					gameOver();
				}
				else if (o.tag == 'crayon')
					this.moveable = false;
			}	
        }

		if (this.moveable){
			var speed = DEFAULT_SPEED;
			if (uid === undefined || uid === 1) {
				if (keyboard.left || PHY.g < -20 || (mouse.down && mouse.x < parseInt(canvas.style.width) / 2)) {
					speed = SLOW_SPEED;
				}
				if (keyboard.right || PHY.g > 20 || (mouse.down && mouse.x > parseInt(canvas.style.width) / 2)) {
					speed = FAST_SPEED;
				}
				if (!this.fall) {
					if (keyboard.top && !this.jump) {
						this.jump = true;
					} else if (!keyboard.top && this.jump) {
						this.jump = false;
						this.fall = true;
						PHY.acceleration = 0;
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

			if (!this.fall) {
				if (this.x > this.X) this.x += (this.X - this.x) / speed;
				else if (this.x < this.X) this.x += (this.x - this.X) / speed;

				this.x += speed;
			}

			this.frame += 0.3;
			if (this.frame >= 4) this.frame = 0;
		}
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

function Obstacle(img, tag, x, y) {
    this.img = new Image();
    this.img.src = img;

    this.build = function () {
        this.x = x;
        this.y = y;
        this.width = this.img.width;
        this.height = this.img.height;
		this.tag = tag;
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
		if(player.ready && player.collide(this))
			gameOver();
    }
    this.draw = function (context) {
        context.drawImage(this.img, this.position.x, this.position.y);
    }
	
    var that = this;
    this.img.onload = function () {
        that.build();
    }
}

window.onload = function () {
    window.onkeydown = function (event) {
        if (uid === undefined || uid === 1) {
            var k = event.keyCode;

            if (k == 37) {
                keyboard.left = true;
                emitSpeed(-1);
            }
            if (k == 38 || k == 32) {
                keyboard.top = true;
                emitJump(1);
            }
            if (k == 39) {
                keyboard.right = true;
                emitSpeed(1);
            }
            if (k == 40) {
                keyboard.bottom = true;
                emitJump(0);
            }
        }
    };
    window.onkeyup = function (event) {
        if (uid === undefined || uid === 1) {
            var k = event.keyCode;

            if (k == 37) {
                keyboard.left = false;
                emitSpeed(0);
            }
            if (k == 38 || k == 32) {
                keyboard.top = false;
                emitJump(0);
            }
            if (k == 39) {
                keyboard.right = false;
                emitSpeed(0);
            }
            if (k == 40) {
                keyboard.bottom = false;
            }
        }
    };
    canvas.onmousedown = function (event) {
        event.preventDefault();
        event.stopPropagation();
        mouse.x = event.clientX;
        if (uid === undefined || uid === 1) {
            mouse.down = true;
        } else if (uid === undefined || uid === 2) {
            mouse.y = event.clientY;
            mouse.down = true;
            var obstacle = currentObstacle.substr(7, currentObstacle.indexOf('.')-7);
            emitObstacle(obstacle, mouse.x, mouse.y);
        }
        return false;
    };
    canvas.addEventListener('mouseup', function (event) {
        mouse.down = false;
    }, false);
    window.addEventListener('deviceorientation', function (event) {
        PHY.g = event.gamma;
    }, false);
    init();
    run();
}

function init() {
    canvas.width = SCREEN_WIDTH;
    canvas.height = SCREEN_HEIGHT;
    canvas.style.width = '1024px';
    canvas.style.height = '512px';

    PHY['GROUND'] = canvas.height - GROUND;

    background = new Image();
    background.src = BACKGROUND;
    player = new Player(SPRITESHEET);
    OBSTACLES.push(new Ground(LINE));
    hand = new Hand(HAND, [HAND_HIGH, HAND_LOW]);
}

function run() {
    var start = (new Date).getTime();

//    uid = 1;
    updateLevel();
    animate();
    render();
    computeFPS();

    var end = (new Date).getTime(),
        time = (16 - (end - start) < 0) ? 0 : 16 - (end - start);
	if(game)
		setTimeout(run, time);
}

function updateLevel() {
    if (mouse.y && mouse.down && mouse.y < 437) {
        var x = mouse.x / (canvas.offsetWidth / canvas.width),
            y = mouse.y / (canvas.offsetHeight / canvas.height),
			obstacle = currentObstacle.substr(7, currentObstacle.indexOf('.')-7);

        OBSTACLES.push(new Obstacle(currentObstacle, obstacle, x, y));
        mouse.down = false;
    }
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
    ctx.fillText(fps, 15, 15);
    ctx.fillText('SOURIS : ' + mouse.x + ';' + mouse.y, 15, 25);
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
        e.x -= speed;
		if(e.tag != 'ground' && player.collide(e))
			player.x -= speed;
        if (e.x < -e.width) {
            if (e.tag == 'ground') {
                e.x + canvas.width + e.width;
            } else {
                OBSTACLES.splice(i--, 1);
            }
        }
    }
}

function gameOver()
{
//	emitDeath();
	game = false;
	alert('U ARE A FUCKING NOOB.');
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