import express from "express"
import jwtAuth from "../../middlewares/jwtAuth"
import { prisma } from "../../db"
// import { PrismaClient } from "@prisma/client"

export const userRouter = express.Router()
// const prisma =  new PrismaClient()

userRouter.get("/", jwtAuth, async (req,res):Promise<any> => {
    // @ts-ignore
    const id = req.id
    try {
        const user = await prisma.user.findFirst({
            where: {
                id
            },
            select: {
                email: true,
                username: true
            }
        })

        return res.status(200).json({
            user
        })
    } catch (error) {
        return res.status(500).json({
            message: "something wrong occured",
            Error: error
        })
    }

} )