// import { PrismaClient } from "@prisma/client";
import express from "express";
import jwtAuth from "../../middlewares/jwtAuth";
import { prisma } from "../../db";

export const channelRouter = express.Router();
// const prisma = new PrismaClient();

channelRouter.post("/", jwtAuth, async (req, res): Promise<any> => {
    const channelName = req.body.name;
    // @ts-ignore
    const id = req.id as string;  // Ensure the id is typed correctly

    try {
        // Check if the channel already exists
        const channelExists = await prisma.channel.findFirst({
            where: { name: channelName },
        });

        if (channelExists) {
            return res.status(409).json({
                message: "Channel already exists!",
            });
        }

        // Create a new channel
        const channel = await prisma.channel.create({
            data: {
                name: channelName,
                ownerId: id,
            },
        });

        return res.status(201).json({
            message: `${channelName} channel created successfully for owner ${id}!`,
        });
        
    } catch (error) {
        // Internal Server Error for unexpected issues
        return res.status(500).json({
            message: "Something went wrong",
            error: error instanceof Error ? error.message : String(error),  // Send proper error details
        });
    }
});

channelRouter.get("/",jwtAuth, async (req,res):Promise<any> => {
    // @ts-ignore
    const id = req.id
    try {

        const channels = await prisma.channel.findMany({
            where: {
                ownerId: id
            }
        })

        return res.status(201).json({
            channels
        })
        
    } catch (error) {
        return res.status(500).json({
            message: "Something went wrong",
            Error: error
        })
    }
})

channelRouter.delete("/",jwtAuth,async (req, res): Promise<any> => {
    // @ts-ignore
    const id = req.id
    const channelId = req.body.channelId
    try {
        const isExists = await prisma.channel.findFirst({
            where: {
                id: channelId
            }
        })
        if(!isExists) {
            return res.status(400).json({
                message: "Channel doesn't exists"
            })
        }

        const deletedChannel = await prisma.channel.delete({
            where: {
                id: channelId
            }
        })

        return res.status(201).json({
            message: `Channel:${channelId} is successfully deleted!`
        })

    } catch (error) {
        return res.status(401).json({
            message: "Something went wrong while deleting channel",
            Error: error
        })
    }
} )
