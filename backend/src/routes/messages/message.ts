import express from "express"
import jwtAuth from "../../middlewares/jwtAuth"
import { prisma } from "../../db";

export const messageRouter = express.Router()

messageRouter.post("/",jwtAuth,async (req, res):Promise<any> => {
 
    const {message, channelId, userId}  = req.body;

    try {
        
        const msg = await prisma.messages.create({
            data: {
                userId,
                channelId,
                message
            }
        })

        return res.status(201).json({
            message: "Successfully stored entry in db",
            userId,
            channelId
        })

    } catch (error) {
        return res.status(401).json({
            message: "SOmething went wrong",
            Error: error
        })
    }
})

messageRouter.get("/", jwtAuth, async (req, res): Promise<any> => {
    // @ts-ignore
    const id = req.id;
    const channelId = req.query.channelId as string;

    if (!channelId) {
        return res.status(400).json({ error: "channelId is required" });
    }

    try {
        const messages = await prisma.messages.findMany({
            where: {
                userId: id, // Adjust this if necessary to match your schema
                channelId
            },
            select: {
                message: true
            }
        });
        res.status(200).json({ messages });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "An error occurred while fetching messages." });
    }
});

messageRouter.delete("/",jwtAuth, async (req,res):Promise<any> => {
    // @ts-ignore
    const id = req.id
    const channelId = req.body.channelId
    const messageId = req.body.messageId

    try {

        const deletedMsg = await prisma.messages.deleteMany({
            where: {
                userId: id,
                channelId,
                id: messageId
            }
        })

        if (deletedMsg.count > 0) {
            return res.status(204).json({ message: "Deleted!"}); // Successfully deleted
        } else {
            return res.status(404).json({ message: "Message not found." });
        }
        
    } catch (error) {
        console.error("Error deleting messages:", error);
        return res.status(500).json({ error: "An error occurred while deleting messages." });
    }
})