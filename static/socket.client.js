function log() {
    var ligne = Array.prototype.slice.call(arguments).join(' '),
        div = document.getElementById('log');

    console.log(ligne);
    // div.innerHTML += ligne + '<br/>';
}

var socket = io.connect(),
    uid;

// autres joueurs
socket.on('uid', function (data) {
    uid = data;
    loadEvent();
    log("Player", data);
});

socket.on('joined', function (count) {
    log('There are ', count, 'player(s) in the room!');
    if (count > 1) {
//        menu.ready();
    }
});

socket.on('full', function () {
    log('The game is full, please come back later');
});

socket.on('quit', function (count) {
    log('Player ', uid, 'just left');
/*
    if (count < 2) {
        menu.state = 'waiting';
        menu.run();
        for (var i = 0; i < menu.buttons.length; i++) {
            menu.buttons[i].active = false;
        }
    }
*/
});

function emitReady() {
    socket.emit('ready');
}

socket.on('is_ready', function (uid) {
    log('Player', uid, 'is ready to kick your ass!');
});

socket.on('start', function () {
    log('Game is starting!');
//    menu.loop = false;
//    run();
});

function emitObstacle(type, x, y) {
    socket.emit('obstacle', {
        'type': type,
        'x': x,
        'y': y
    });
}

socket.on('obstacle', function (objParam) {
    log('Player 2 sent an obstacle, type:', objParam.type, 'x:', objParam.x, 'y:', objParam.y);

    var x = canvas.width,
        y = objParam.type === BLOC ?
                canvas.height - GROUND - 55 :
                objParam.y / (canvas.offsetHeight / canvas.height);
    if (y < 437) {
        new Obstacle(objParam.type, x, y);
    }
});

function emitSpeed(speed) {
    socket.emit('speed', speed);
}

socket.on('speed', function (speed) {
    player.handleSpeed(speed);
});

function emitJump(jump) {
    socket.emit('jump', jump);
}

socket.on('jump', function (jump) {
    log('Player 1', (jump === true ? 'jumped' : 'released'));
    player.handleJump(jump);
});

function emitGameOver() {
    socket.emit("gameover");
}

socket.on('finish', function () {
    log('Game finished!');
/*
    menu.state = 'waiting';
    menu.run();
    for (var i = 0; i < menu.buttons.length; i++) {
        menu.buttons[i].active = false;
    }
*/
});
