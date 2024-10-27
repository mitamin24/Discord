import express from "express"
import jwtAuth from "../../middlewares/jwtAuth"
import { prisma } from "../../db"


export const subscriptionRouter = express.Router()

subscriptionRouter.post("/",jwtAuth, async (req,res):Promise<any> => {
    const {channelId, userId} = req.body

    try {
        
      const subscription = await prisma.subscriptions.create({
        data: {
            channelId,
            userId
        }
      })

      return res.status(201).json({
        message: `User:${userId} is subscribed to channel:${channelId}`
      })

    } catch (error) {
        return res.status(401).json({
            message: "Something went wrong",
            Error: error
        })
    }
})

subscriptionRouter.get("/",jwtAuth, async (req,res):Promise<any> => {
    // @ts-ignore
    const id = req.id;

    try {
        
        const channels = await prisma.subscriptions.findMany({
            where: {
                userId: id
            },
            select: {
                channelId: true
            }
        })
        
        return res.status(201).json({
            channels
        })

    } catch (error) {
        return res.status(401).json({
            message: "Something went wrong",
            Error: error
        })
    }
})

subscriptionRouter.delete("/",jwtAuth,async (req,res):Promise<any> => {
    const {userId, channelId} = req.body;

    try {

        const deletedChannels = await prisma.subscriptions.deleteMany({
            where: {
                // userId,
                channelId
            }
        })
        
        return res.status(201).json({
            message: `Deleted1`
        })
        
    } catch (error) {
        return res.status(401).json({
            message: "Something went wrong",
            Error: error
        })
    }
})