import express from "express";
import cors from "cors";
import { signinSchema } from "../zod/zod";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

export const signinRouter = express.Router();
const prisma = new PrismaClient();
const secret = process.env.JWT_SECRET || (process.env.NODE_ENV === 'development' ? 'secret' : undefined);

if (!secret) {
    throw new Error("JWT secret is not defined!");
}

signinRouter.use(express.json());
signinRouter.use(cors());

// @ts-ignore
signinRouter.post("/", async (req, res) => {
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
                userId: user.id,
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
