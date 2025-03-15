const http = require('http');
const express = require('express');
const app = express();
const path = require('path');

const server = http.createServer(app);
const io = require('socket.io')(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    maxHttpBufferSize: 10e6 // 10MB max file size
});

app.use(express.static(path.join(__dirname, '../client')));

const rooms = new Map();

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join', ({ username, room }) => {
        room = room || 'default';
        socket.join(room);
        socket.username = username;
        socket.room = room;

        if (!rooms.has(room)) {
            rooms.set(room, new Set());
        }
        rooms.get(room).add(socket.id);

        // Notify others in the room
        socket.to(room).emit('user-joined', { id: socket.id, username });
        
        // Send list of existing users to the new participant
        const users = Array.from(rooms.get(room)).filter(id => id !== socket.id);
        socket.emit('room-users', users);

        // Broadcast updated participant count
        io.to(room).emit('participant-count', rooms.get(room).size);
    });

    socket.on('signal', ({ to, signal }) => {
        io.to(to).emit('signal', {
            from: socket.id,
            signal,
            username: socket.username
        });
    });

    socket.on('message', (message) => {
        io.to(socket.room).emit('message', {
            content: message,
            from: socket.username,
            id: socket.id,
            timestamp: new Date().toISOString()
        });
    });

    socket.on('file', (fileData) => {
        // Broadcast file to all users in the room
        io.to(socket.room).emit('file', {
            ...fileData,
            from: socket.username,
            id: socket.id,
            timestamp: new Date().toISOString()
        });
    });

    socket.on('disconnect', () => {
        if (socket.room && rooms.has(socket.room)) {
            rooms.get(socket.room).delete(socket.id);
            if (rooms.get(socket.room).size === 0) {
                rooms.delete(socket.room);
            } else {
                io.to(socket.room).emit('participant-count', rooms.get(socket.room).size);
            }
        }
        io.to(socket.room).emit('user-left', socket.id);
    });
});

const PORT = process.env.PORT || 8080;
const HOST = '0.0.0.0';

server.listen(PORT, HOST, (err) => {
    if (err) {
        console.error('Error starting server:', err);
        return;
    }
    console.log(`Server running at http://${HOST}:${PORT}`);
    console.log('You can access it using:');
    console.log(`  - http://localhost:${PORT}`);
    console.log(`  - http://127.0.0.1:${PORT}`);
});
