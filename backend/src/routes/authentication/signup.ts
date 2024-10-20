import express, { Request, Response } from "express"; // Ensure proper imports
import cors from "cors";
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";
import { signupSchema } from "../../zod/zod";

const prisma = new PrismaClient();

export const signupRouter = express.Router();

signupRouter.use(express.json());
signupRouter.use(cors());

signupRouter.post("/", async (req, res):Promise<any> => { // Type annotations for req and res
    const signupInput = signupSchema.safeParse(req.body);
    
    if (!signupInput.success) {
        return res.status(400).json({
            message: "Please enter correct input",
            errors: signupInput.error.errors, // Include validation errors for more context
        });
    }

    const { email, username, password } = signupInput.data; // Use validated data

    try {
        // Hash password before storing it in the database
        const hashedPassword = await bcrypt.hash(password, 10);

        const userExists = await prisma.user.findFirst({
            where: {
                email: email
            }
        })

        if (userExists) {
            return res.status(409).json({
                message: "User already exists!"
            })
        }

        const newUser = await prisma.user.create({
            data: {
                email,
                username,
                password: hashedPassword,
            },
        });

        return res.status(201).json({
            message: "Signup successfully",
            user: {
                id: newUser.id,
                email: newUser.email,
                username: newUser.username,
            },
        });

    } catch (error) {
        console.error(error); // Log the error for debugging
        return res.status(500).json({
            message: "Something went wrong",
            error: error instanceof Error ? error.message : "Unknown error", // Provide a clearer error message
        });
    }
});
