const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;
// when using middleware `hostname` and `port` must be provided below
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const rooms = new Map(); // code -> Room Object

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 7).toUpperCase();
}

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const roomTimeouts = new Map(); // code -> Timeout

    const io = new Server(httpServer);

    const getIp = (socket) => socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;

    io.on('connection', (socket) => {
    // console.log('Client connected', socket.id);

    socket.on('create_room', ({ code: requestedCode, name } = {}, callback) => {
      // Handle optional arguments correctly if only callback is passed (legacy check)
      // But simpler to assume object is passed now.
      // The previous signature was (callback). The new one should be ({ name }, callback).
      // Wait, the previous code used callback as first arg?
      // No: socket.emit('create_room', ({ code }) => { ... })
      // Client side: socket.emit("create_room", ({ code }: { code: string }) => { ... });
      // Wait, client emits callback as the LAST argument. The data is the first argument?
      // Client: socket.emit("create_room", ({ code: ... }) => ...)
      // Actually, in client: `socket.emit("create_room", ({ code }: { code: string }) => {`
      // This looks like the client expects the callback to receive an object with code.
      // But what does the client SEND?
      // socket.emit("event", arg1, callback)
      // In `app/connect/host/page.tsx`: `socket.emit("create_room", ({ code }: { code: string }) => { ... });`
      // This means it's emitting NO data, just a callback.
      
      // So I need to change the client to emit `{ name }` and the server to receive it.
      
      const roomCode = generateRoomCode();
      const ip = getIp(socket);
      console.log(`[ROOM] User ${name || "Host"} created room ${roomCode} (IP: ${ip})`);
      rooms.set(roomCode, {
        hostId: socket.id,
        hostName: name || "Host", // Store host name
        users: [],
        settings: {
            mode: 'time',
            duration: 30,
            difficulty: 'medium',
        },
        status: 'waiting'
      });
      socket.join(roomCode);
      if (typeof callback === 'function') callback({ code: roomCode });
    });

    socket.on('claim_host', ({ code }, callback) => {
        const room = rooms.get(code);
        if (room) {
            // Check if there is an active host? Or just override?
            // Since we are handling reconnection, we assume the old socket is dead or this is the same person.
            // If we had a timeout pending, clear it.
            if (roomTimeouts.has(code)) {
                clearTimeout(roomTimeouts.get(code));
                roomTimeouts.delete(code);
            }
            
            room.hostId = socket.id;
            socket.join(code);
            callback({ 
                success: true, 
                users: room.users, 
                settings: room.settings, 
                status: room.status 
            });
        } else {
            callback({ success: false, error: 'Room not found' });
        }
    });

    socket.on('join_room', ({ code, name }, callback) => {
      const room = rooms.get(code);
      if (!room) {
        return callback({ error: 'Room not found' });
      }
      
      const newUser = { id: socket.id, name, stats: { wpm: 0, accuracy: 0, progress: 0 } };
      room.users.push(newUser);
      socket.join(code);
      
      // Notify host
      io.to(room.hostId).emit('user_joined', newUser);
      
      const ip = getIp(socket);
      console.log(`[ROOM] User ${name} joined room ${code} (IP: ${ip})`);

      // Send current state to joiner
      callback({ settings: room.settings, status: room.status, hostName: room.hostName });
      
      // console.log(`User ${name} joined room ${code}`);
    });

    socket.on('update_settings', ({ code, settings }) => {
      const room = rooms.get(code);
      if (room && room.hostId === socket.id) {
        room.settings = { ...room.settings, ...settings };
        io.to(code).emit('settings_updated', room.settings);
      }
    });
    
    socket.on('start_test', ({ code }) => {
        const room = rooms.get(code);
        if (room && room.hostId === socket.id) {
            room.status = 'active';
            io.to(code).emit('test_started');
        }
    });

    socket.on('stop_test', ({ code }) => {
        const room = rooms.get(code);
        if (room && room.hostId === socket.id) {
            room.status = 'waiting';
            io.to(code).emit('test_stopped');
        }
    });
    
    socket.on('reset_test', ({ code }) => {
        const room = rooms.get(code);
        if (room && room.hostId === socket.id) {
             room.status = 'waiting';
            // Reset stats for all users?
             room.users.forEach(u => u.stats = { wpm: 0, accuracy: 0, progress: 0, wordsTyped: 0, timeElapsed: 0, isFinished: false });
            io.to(code).emit('test_reset');
        }
    });

    socket.on('kick_user', ({ code, userId }) => {
        const room = rooms.get(code);
        if (room && room.hostId === socket.id) {
            const index = room.users.findIndex(u => u.id === userId);
            if (index !== -1) {
                const user = room.users[index];
                console.log(`[ROOM] User ${user.name} (ID: ${userId}) left room ${code} (Kicked)`);
                room.users.splice(index, 1);
                // Notify the user they were kicked
                io.to(userId).emit('kicked');
                
                // Notify host to update list
                io.to(room.hostId).emit('user_left', { userId });
                
                // Make the user leave the socket room
                const userSocket = io.sockets.sockets.get(userId);
                if (userSocket) {
                    userSocket.leave(code);
                }
            }
        }
    });

    socket.on('reset_user', ({ code, userId }) => {
        const room = rooms.get(code);
        if (room && room.hostId === socket.id) {
            const user = room.users.find(u => u.id === userId);
            if (user) {
                user.stats = { wpm: 0, accuracy: 0, progress: 0, wordsTyped: 0, timeElapsed: 0, isFinished: false };
                io.to(userId).emit('test_reset'); // Reuse test_reset event or specific one? test_reset usually implies global reset.
                // Let's use the same event since it triggers sessionId change.
                // But we only send it to THAT user.
                io.to(room.hostId).emit('stats_update', { userId, stats: user.stats });
            }
        }
    });

    socket.on('send_stats', ({ code, stats }) => {
      const room = rooms.get(code);
      if (room) {
        const user = room.users.find(u => u.id === socket.id);
        if (user) {
          user.stats = stats;
          // If this is a user update, forward to host (or everyone if we want a leaderboard)
          // Optimization: Maybe throttle this or only send to host
          io.to(room.hostId).emit('stats_update', { userId: socket.id, stats });
        }
      }
    });

    socket.on('disconnect', () => {
      // Handle user disconnect
        rooms.forEach((room, code) => {
            if (room.hostId === socket.id) {
                // Host left - set timeout to destroy room
                // Give them 2 minutes to reconnect
                console.log(`[ROOM] Host ${room.hostName} (ID: ${socket.id}) disconnected from room ${code}`);
                const timeout = setTimeout(() => {
                    io.to(code).emit('host_disconnected');
                    rooms.delete(code);
                    roomTimeouts.delete(code);
                    console.log(`[ROOM] Room ${code} destroyed due to host inactivity`);
                }, 2 * 60 * 1000);
                roomTimeouts.set(code, timeout);
            } else {
                const index = room.users.findIndex(u => u.id === socket.id);
                if (index !== -1) {
                    const [removedUser] = room.users.splice(index, 1);
                    console.log(`[ROOM] User ${removedUser.name} (ID: ${socket.id}) left room ${code}`);
                    io.to(room.hostId).emit('user_left', { userId: socket.id });
                }
            }
        });
    });
  });

  httpServer.once('error', (err) => {
    console.error(err);
    process.exit(1);
  });

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
