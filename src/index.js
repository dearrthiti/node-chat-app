const path = require('path')
const http = require('http')
const express = require('express')
const socketio = require('socket.io')
const Filter = require('bad-words')
const { generateMessage, generateLacationMessage } = require('./utils/messages')
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users')

const app = express()
const server = http.createServer(app)
const io = socketio(server)

const port = process.env.PROT || 3000
const publicDirectoryPath = path.join(__dirname, '../public')

app.use(express.static(publicDirectoryPath))

io.on('connection', (socket) => {
    console.log('New Websocket connection')

    socket.on('join', (options, callback) => {
        const { error, user } = addUser( { id: socket.id, ...options } )

        if (error) {
            return callback(error)
        }

        socket.join(user.room)

        socket.emit('message', generateMessage('Welcome!', 'Admin'))
        socket.broadcast.to(user.room).emit('message', generateMessage(`${user.username} has joined!`, 'Admin'))
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })

        callback()

        // socket.emit, io.emit, socket.broadcast.emit
        // io.to.emit => to emit to a specific room
        // socket.broadcast.to.emit => to emit to everyone except specific client in a sepecific chat room
    })

    socket.on('sendMessage', (message, callback) => {
        const filter = new Filter()
        const user = getUser(socket.id)

        if (filter.isProfane(message)) {
            return callback('Profanity is not allowed!')
        }

        io.to(user.room).emit('message', generateMessage(message, user.username))
        callback()
    })

    socket.on('sendLocation', (coords, callback) => {
        const user = getUser(socket.id)

        io.to(user.room).emit('locationMessage', generateLacationMessage(`https://google.com/maps?q=${coords.latitude},${coords.longitude}`, user.username))
        callback()
    })

    socket.on('disconnect', () => {
        const user = removeUser(socket.id)

        if (user) {
            io.to(user.room).emit('message', generateMessage(`${user.username} has left!`, 'Admin'))
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }
    })
})

server.listen(port, () => {
    console.log(`Server is up onport ${port}!`)
})