const normalizePort = val => {
    var port = parseInt(val, 10);
    if (isNaN(port)) {
      // named pipe
        return val;
    }      
    if (port >= 0) {
      // port number
        return port;
    }      
    return false;
};

const onError = error => {
    if (error.syscall !== "listen") {
        throw error;
    }
    const bind = typeof port === "string" ? "pipe " + port : "port " + port;
    switch (error.code) {
        case "EACCES":
        console.error(bind + " requires elevated privileges");
        process.exit(1);
        break;
        case "EADDRINUSE":
        console.error(bind + " is already in use");
        process.exit(1);
        break;
        default:
        throw error;
    }
};

const onListening = () => {
    const addr = server.address();
    const bind = typeof port === "string" ? "pipe " + addr : "port " + port;
    debug("Listening on " + bind);
};

// const express = require('express');
// const router = express.Router();
require('dotenv').config();

const app = require("./app");
const debug = require("debug")("node-angular"); //node-angular any name
const http = require("http");
const port = normalizePort(process.env.PORT || '3000');
const server = http.createServer(app);
const User = require('./auth/auth-mongoose');
var ObjectId = require('mongodb').ObjectId;


const io = require('socket.io')(server, {
    cors: {
        origin: '*',
    }
});


io.on('connection', (socket) => {
    socket.emit('mySocketId', socket.id)

    socket.on('sendSocketToFriends', (data) => {
        socket.request.user = { _id: data.userId };
        if(data.friendsSockets.length > 0){
            io.to(data.friendsSockets).emit('friendsSocketId', 
            {
                userId: data.userId, 
                socketId: data.mySocketId
            })
        }
    })

    socket.on('disconnect', () => {
        if(socket.request.user){
            User.findOneAndUpdate(
            { _id: new ObjectId(socket.request.user._id) },
            {
                $set: {
                    'afterLogin.connected': false
                }
            },
            {
                new: true
            }
            )
            .then((data) => {
                console.log(`Updated user's afterLogin.connected field to false: ${data}`);
            })
            .catch((err) => {
                console.log(err);
            });
        }
    })

    socket.on('sendMessage', (socketId, message) => {
        io.to(socketId).emit('recieveMessage', message);
    })
})





//
app.set('port', port);
app.set('io', io)

server.on('listen', onListening);
server.on('error', onError)

server.listen(port);






