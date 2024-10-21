import express from "express";
import cors from "cors";
import dotenv from "dotenv"; // Import dotenv
import { signupRouter } from "./routes/authentication/signup";
import { signinRouter } from "./routes/authentication/signin";
import { userRouter } from "./routes/user/user";
import { channelRouter } from "./routes/channel/channel";
import { PrismaClient } from "@prisma/client";
import { messageRouter } from "./routes/messages/message";

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT ;

app.use(cors());
app.use(express.json());
app.use("/api/user",userRouter)
app.use("/api/user/subscriptions")
app.use("/api/user/messages",messageRouter)
app.use("/api/user/channel",channelRouter)
app.use("/api/auth/signup",signupRouter)
app.use("/api/auth/signin",signinRouter)

// Health check route
app.get("/", (req, res) => {
    res.json({
        message: "Healthy server"
    });
});

console.log(`Using PORT: ${PORT}`); // Log the PORT

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
