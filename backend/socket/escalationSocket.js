let io;

module.exports = {
  init: (serverInstance) => {
    const { Server } = require('socket.io');
    io = new Server(serverInstance, {
      cors: {
        origin: (origin, callback) => {
          if (!origin) return callback(null, true);
          if (/^http:\/\/localhost(:\d+)?$/.test(origin) || /^http:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) {
            return callback(null, true);
          }
          callback(new Error('Not allowed by CORS'));
        },
        credentials: true
      }
    });

    io.on('connection', (socket) => {
      console.log(`🔌 Client connected to socket: ${socket.id}`);

      socket.on('disconnect', () => {
        console.log(`🔌 Client disconnected from socket: ${socket.id}`);
      });
    });

    return io;
  },
  getIO: () => {
    return io;
  }
};
