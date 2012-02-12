var http = require("http"),
    fs = require("fs"),
    parseURL = require("url").parse,

    io = require("socket.io"),

    types = {
        "html": {
            "contentType": "text/html",
            "base": "./static/"
        },
        "htm": {
            "contentType": "text/html",
            "base": "./static/"
        },
        "js": {
            "contentType": "application/javascript",
            "base": "./static/"
        },
        "css": {
            "contentType": "text/css",
            "base": "./static/"
        },
        "json": {
            "contentType": "application/json",
            "base": "./cache/"
        },
        "png": {
            "contentType": "image/png",
            "base": "./cache/"
        }
    },

    extRegExp = /\.([A-Za-z]+)$/,

    paths,
    httpServer,

    game = {
        "started": false,
        "begin": undefined,
        "end": undefined
    },

    interval;



function getFile(res, contentType) {
    return function (err, content) {
        if (err) {
            res.writeHead(404, {});
        } else {
            res.writeHead(200, {
                "Content-Type": contentType + "; charset=UTF-8"
            });
        }
        res.end(content);
    };
}

paths = {
    "static": function staticPath(req, res, parsed) {
        //console.log("in static:", parsed.pathname);

        var extension = parsed.pathname.match(extRegExp)[1],
            type,
            fileName,
            path;

        if (extension && types[extension]) {
            type = types[extension];
            fileName = parsed.pathname.split("/");
            fileName = fileName[fileName.length - 1];
            // path = type.base + fileName;
            path = "." + parsed.pathname;
            //console.log("reading file:", path);
            fs.readFile(path, getFile(res, type.contentType));
        } else {
            res.writeHead(404, {});
            res.end();
        }
    },
    "/": function rootPath(req, res, parsed) {
        if (parsed.pathname.match(extRegExp)) {
            paths.static(req, res, parsed);
        } else {
            html = fs.readFileSync(__dirname + '/jawsKiller.html');
            res.end(html);
        }
    }
};

function startServer(req, res) {
    var parsed = parseURL(req.url, true),
        match = parsed.pathname.match(extRegExp),
        path;

    if (match) {
        paths["static"](req, res, parsed);
    } else {
        for (var i in paths) {
            match = parsed.pathname.match(new RegExp(i));
            if (match) {
                paths[i](req, res, parsed, match);
                return;
            }
        }
        res.writeHead(404, {});
        res.end();
        return;
    }
}

httpServer = http.createServer(startServer);
httpServer.listen(8080, require("./ip").ip);

var socketsio = io.listen(httpServer),

    players = {},
    playersCount = 0;
    clients = {};

socketsio.sockets.on('connection', function (socket) {
    var player;

    if (players[1] === undefined) {
        player = {
            'socket': socket,
            'uid': 1,
            'ready': false,
            'win': 0,
            'loss': 0
        };
        players[1] = player;
        clients[socket.id] = player;
        playersCount += 1;
    } else if (players[2] === undefined) {
        player = {
            'socket': socket,
            'uid': 2,
            'ready': false,
            'win': 0,
            'loss': 0
        };
        players[2] = player;
        clients[socket.id] = player;
        playersCount += 1;
    } else {
        socket.emit('full');
    }

    var other;

    if (player !== undefined) {
        player.socket.emit('uid', player.uid);
        socketsio.sockets.emit('joined', playersCount);
    }

    socket.on('disconnect', function disconnected() {
        var player = clients[this.id],
            other;
        
        if (player !== undefined) {
            playersCount -= 1;
            other = (player === players[1]) ? players[2] : players[1];
            if (other !== undefined)  {
                other.socket.emit('quit', playersCount);
                if (game.started === true) {
                    gameoverRecep.call(player.socket);
                }
            }
            delete players[player.uid];
            delete clients[this.id];
        }
    });

    var TIME_MAX = 30;
    function tickTimeline() {
        game.now = TIME_MAX - Math.round((Date.now() - game.begin) / 1000) + 1;
        console.log("Tick", game.now);
        socketsio.sockets.emit("timeline", game);
        if (game.now === 0) {
            gameoverRecep.call(players[2].socket);
        }
    }

    socket.on('ready', function readyNow() {
        var player = clients[this.id],
            other;

        if (player !== undefined &&
                player.ready === false) {
            player.ready = true;
            other = (player === players[1]) ? players[2] : players[1];
            if (other !== undefined)  {
                other.socket.emit('is_ready', player.uid);
                if (other.ready === true) {
                    socketsio.sockets.emit('start');
                    game.started = true;
                    game.begin = Date.now();
                    interval = setInterval(tickTimeline, 1000);
                }
            }
        }
    });

    socket.on('obstacle', function obstacleRecep(objParam) {
        socketsio.sockets.emit('obstacle', objParam);
    });

    socket.on('speed', function speedRecep(speed) {
        socketsio.sockets.emit('speed', speed);
    });

    socket.on('jump', function jumpRecep(jump) {
        socketsio.sockets.emit('jump', jump);
    });

    var gameoverRecep = function gameoverRecep() {
        var player = clients[this.id];

        if (player !== undefined) {
            other = (player === players[1]) ? players[2] : players[1];
            player.ready = false;
            player.loss += 1;
            if (other !== undefined)  {
                other.ready = false;
                other.win += 1;
                socketsio.sockets.emit('finish', other.uid);
            }
        }
        game.started = false;
        clearInterval(interval);
    };

    socket.on('gameover', gameoverRecep);
});