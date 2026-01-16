// Import required modules
import express from "express"; // Express.js framework to create the backend server
import dotenv from "dotenv"; // dotenv is used to load environment variables from a `.env` file
import cors from "cors"; // CORS (Cross-Origin Resource Sharing) allows frontend & backend communication
import cookieParser from "cookie-parser"; // Parses cookies from incoming requests
import { createServer } from "http"; // Creates an HTTP server (needed for WebSocket support)
import { Server } from "socket.io"; // Import `Server` from `socket.io` for real-time communication

// Import custom route files
import authRoute from "./rout/authRout.js"; // Import authentication routes (login/signup)
import userRoute from "./rout/userRout.js"; // Import user-related routes (profile, settings)
import dbConnection from "./db/dbConnect.js"; // Import function to connect to MongoDB database

// ✅ Load environment variables (from `.env` file)
dotenv.config();

// 🌍 Create an Express application
const app = express(); 

// 🔧 Set up server port (from `.env` or default to 3000)
const PORT = process.env.PORT || 3000;

// 📡 Create an HTTP server to work with Express (needed for WebSockets)
const server = createServer(app);

// 🌍 Allowed frontend origins for CORS (Cross-Origin Resource Sharing)
const allowedOrigins = [process.env.FRONTEND_URL]; 
console.log(allowedOrigins); // Debugging: Check if the frontend URL is loaded properly

// 🔧 Middleware to handle CORS
app.use(cors({
  origin: function (origin, callback) { 
    if (!origin || allowedOrigins.includes(origin)) { 
      callback(null, true); // ✅ Allow the request if it's from an allowed origin
    } else {
      callback(new Error('Not allowed by CORS')); // ❌ Block requests from unknown origins
    }
  },
  credentials: true, // ✅ Allow sending cookies with requests
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // ✅ Allow these HTTP methods
}));

// 🛠 Middleware for handling JSON requests and cookies
app.use(express.json()); // Enables parsing of JSON request bodies
app.use(cookieParser()); // Enables reading cookies in HTTP requests

// 🔗 Define API routes
app.use("/api/auth", authRoute); // Authentication routes (login, signup, logout)
app.use("/api/user", userRoute); // User-related routes (profile, settings)

// ✅ Test Route to check if the server is running
app.get("/ok", (req, res) => {
  res.json({ message: "Server is running!" }); // Returns a JSON response
});

// 🔥 Initialize Socket.io for real-time communication
const io = new Server(server, {
  pingTimeout: 60000, // ⏳ Set timeout for inactive users (1 minute)
  cors: {
    origin: allowedOrigins[0], // ✅ Allow requests from the frontend URL
    methods: ["GET", "POST"], // ✅ Allow only these methods
  },
});
console.log("[SUCCESS] Socket.io initialized with CORS"); // Debugging message

// 🟢 Store online users and active calls
let onlineUsers = []; // Array to store online users
const activeCalls = new Map(); // Map to track ongoing calls

// 📞 Handle WebSocket (Socket.io) connections
io.on("connection", (socket) => {
  console.log(`[INFO] New connection: ${socket.id}`); // Debugging: New user connected

  // 🔹 Emit an event to send the socket ID to the connected user
  socket.emit("me", socket.id);

  // 📡 User joins the chat system
  socket.on("join", (user) => {
    if (!user || !user.id) {
      console.warn("[WARNING] Invalid user data on join"); // Warn if user data is missing
      return;
    }

    socket.join(user.id); // 🔹 Add user to a room with their ID
    const existingUser = onlineUsers.find((u) => u.userId === user.id); // Check if user is already online

    if (existingUser) {
      existingUser.socketId = socket.id; // Update socket ID if user reconnects
    } else {
      // 🟢 Add new user to online users list
      onlineUsers.push({
        userId: user.id,
        name: user.name,
        socketId: socket.id,
      });
    }

    io.emit("online-users", onlineUsers); // 🔹 Broadcast updated online users list
  });

  // 📞 Handle outgoing call request
  socket.on("callToUser", (data) => {
    const callee = onlineUsers.find((user) => user.userId === data.callToUserId); // Find the user being called

    if (!callee) {
      socket.emit("userUnavailable", { message: "User is offline." }); // ❌ Notify caller if user is offline
      return;
    }

    // 🚫 If the user is already in another call
    if (activeCalls.has(data.callToUserId)) {
      socket.emit("userBusy", { message: "User is currently in another call." });

      io.to(callee.socketId).emit("incomingCallWhileBusy", {
        from: data.from,
        name: data.name,
        email: data.email,
        profilepic: data.profilepic,
      });

      return;
    }

    // 📞 Emit an event to the receiver's socket (callee)
    io.to(callee.socketId).emit("callToUser", {
      signal: data.signalData, // WebRTC signal data
      from: data.from, // Caller ID
      name: data.name, // Caller name
      email: data.email, // Caller email
      profilepic: data.profilepic, // Caller profile picture
    });
  });

  // 📞 Handle when a call is accepted
  socket.on("answeredCall", (data) => {
    io.to(data.to).emit("callAccepted", {
      signal: data.signal, // WebRTC signal
      from: data.from, // Caller ID
    });

    // 📌 Track active calls in a Map
    activeCalls.set(data.from, { with: data.to, socketId: socket.id });
    activeCalls.set(data.to, { with: data.from, socketId: data.to });
  });

  // ❌ Handle call rejection
  socket.on("reject-call", (data) => {
    io.to(data.to).emit("callRejected", {
      name: data.name, // Rejected user's name
      profilepic: data.profilepic // Rejected user's profile picture
    });
  });

  // 📴 Handle call ending
  socket.on("call-ended", (data) => {
    io.to(data.to).emit("callEnded", {
      name: data.name, // User who ended the call
    });

    // 🔥 Remove call from active calls
    activeCalls.delete(data.from);
    activeCalls.delete(data.to);
  });

  // ❌ Handle user disconnecting from the server
  socket.on("disconnect", () => {
    const user = onlineUsers.find((u) => u.socketId === socket.id); // Find the disconnected user
    if (user) {
      activeCalls.delete(user.userId); // Remove the user from active calls

      // 🔥 Remove all calls associated with this user
      for (const [key, value] of activeCalls.entries()) {
        if (value.with === user.userId) activeCalls.delete(key);
      }
    }

    // 🔥 Remove user from the online users list
    onlineUsers = onlineUsers.filter((user) => user.socketId !== socket.id);
    
    // 🔹 Broadcast updated online users list
    io.emit("online-users", onlineUsers);

    // 🔹 Notify others that the user has disconnected
    socket.broadcast.emit("discounnectUser", { disUser: socket.id });

    console.log(`[INFO] Disconnected: ${socket.id}`); // Debugging: User disconnected
  });
});

// 🏁 Start the server after connecting to the database
(async () => {
  try {
    await dbConnection(); // Connect to MongoDB
    server.listen(PORT, () => {
      console.log(`✅ Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("❌ Failed to connect to the database:", error);
    process.exit(1); // Exit the process if the database connection fails
  }
})();
