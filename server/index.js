// Import required modules
import express from "express"; // Express.js framework to create the backend server
import dotenv from "dotenv"; // dotenv is used to load environment variables from a `.env` file
import cors from "cors"; // CORS (Cross-Origin Resource Sharing) allows frontend & backend communication
import cookieParser from "cookie-parser"; // Parses cookies from incoming requests


// ✅ Load environment variables (from `.env` file)
dotenv.config();

// 🌍 Create an Express application
const app = express();

// 🔧 Set up server port (from `.env` or default to 3000)
const PORT = process.env.PORT || 3000;

/
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
