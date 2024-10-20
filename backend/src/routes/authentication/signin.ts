import express, { Request, Response } from "express"; // Import Request and Response types
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { signinSchema } from "../../zod/zod";

dotenv.config();

export const signinRouter = express.Router();
const prisma = new PrismaClient();
const secret = process.env.JWT_SECRET || (process.env.NODE_ENV === 'development' ? 'secret' : undefined);

if (!secret) {
    throw new Error("JWT secret is not defined!");
}

signinRouter.use(express.json());
signinRouter.use(cors());

signinRouter.post("/", async (req, res):Promise<any> => { // Explicitly type req and res
    const signinInput = signinSchema.safeParse(req.body);
    if (!signinInput.success) {
        return res.status(400).json({
            message: "Please enter correct inputs!",
            errors: signinInput.error.errors, // Provide detailed error messages
        });
    }
    
    const { password, email } = signinInput.data;

    try {
        const user = await prisma.user.findFirst({
            where: { email },
        });

        if (!user) {
            return res.status(404).json({
                message: "User not found",
            });
        }

        const isPassword = await bcrypt.compare(password, user.password);

        if (!isPassword) {
            return res.status(401).json({
                message: "Invalid credentials",
            });
        }

        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
            },
            secret,
        );

        return res.status(200).json({
            message: "Signin successful",
            token,
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Something went wrong",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
});
