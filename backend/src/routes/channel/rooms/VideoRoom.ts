import express from "express";
import jwtAuth from "../../../middlewares/jwtAuth";
import { prisma } from "../../../db";
import { any } from "zod";

export const videoRoomRouter = express.Router()

videoRoomRouter.post("/", jwtAuth, async (req, res): Promise<any> => {
    const { name, channelId } = req.body;

    try {
        // Fetch the channel with the ownerId
        const channel = await prisma.channel.findFirst({
            where: {
                id: channelId
            },
            select: {
                ownerId: true
            }
        });

        // Check if the channel exists
        if (!channel) {
            console.error(`Channel doesn't exist!`);
            return res.status(404).json({ message: "Channel not found" });
        }

        // Check if the authenticated user is the owner of the channel
        // @ts-ignore
        if (channel.ownerId !== req.id) { // `req.user.id` is from jwtAuth middleware
            return res.status(403).json({ message: "Only the channel owner can create rooms" });
        }

        // Create the room
        const room = await prisma.rooms.create({
            data: {
                channelId: channelId,
                name: name,
                ownerId: channel.ownerId
            }
        });

        // Return the created room
        return res.status(201).json(room);

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "An error occurred while creating the room" });
    }
});

videoRoomRouter.get("/",jwtAuth, async (req,res):Promise<any> => {
    // @ts-ignore
    const id = req.id
    const channelId = req.body.channelId

    try {

        const channel = await prisma.channel.findFirst({
            where: {
                id: channelId
            },
            select: {
                ownerId: true
            }
        });

// @ts-ignore

        if (channel?.ownerId !== req.id) { // `req.user.id` is from jwtAuth middleware
            return res.status(403).json({ message: "Only the channel owner can create rooms" });
        }
        
        const rooms = await prisma.rooms.findMany({
            where: {
                channelId,
                ownerId: channel?.ownerId
            }
        })


        return res.status(201).json(rooms);

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "An error occurred while fetching the room" });   
    }
})
