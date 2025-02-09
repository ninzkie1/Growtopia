import { Server } from "socket.io";
import http from "http";
import express from "express";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173"],
  },
});

// used to store online users
const userSocketMap = {}; // {userId: socketId}

io.on("connection", (socket) => {
  console.log("A user connected", socket.id);

  const userId = socket.handshake.query.userId;
  if (userId) userSocketMap[userId] = socket.id;

  // Handle signaling data
  socket.on("offer", (data) => {
    const { offer, to } = data;
    const receiverSocketId = userSocketMap[to];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("offer", { offer, from: userId });
    }
  });

  socket.on("answer", (data) => {
    const { answer, to } = data;
    const receiverSocketId = userSocketMap[to];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("answer", { answer, from: userId });
    }
  });

  socket.on("ice-candidate", (data) => {
    const { candidate, to } = data;
    const receiverSocketId = userSocketMap[to];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("ice-candidate", { candidate, from: userId });
    }
  });

  socket.on("call-ended", (data) => {
    const { to } = data;
    const receiverSocketId = userSocketMap[to];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("call-ended");
    }
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected", socket.id);
    delete userSocketMap[userId];
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });

  io.emit("getOnlineUsers", Object.keys(userSocketMap));
});

const getReceiverSocketId = (receiverId) => userSocketMap[receiverId];

export { io, app, server, getReceiverSocketId };