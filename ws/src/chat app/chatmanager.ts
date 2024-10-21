import { createClient, RedisClientType } from "redis"
import { WebSocket } from "ws"
// @ts-ignore
import { prisma } from "../../../backend/src/db"

export class ChatManager {
    private static instance: ChatManager
    private publishClient: RedisClientType
    private redisClient: RedisClientType
    private subscriptions: { [key: string]: { ws: WebSocket, channels: string[] } }

    // Constructor initializing Redis clients and managing active subscriptions
    private constructor() {
        this.redisClient = createClient()
        this.redisClient.connect()
        this.publishClient = createClient()
        this.publishClient.connect()
        this.subscriptions = {}
    }

    /* subscriptions structure
    {
        "user1" : {
            ws: websocket,
            channels: [movie, series]
        },
        "user2": {
            ws: websocket,
            channels: [anime, wallpaper]
        }
    }
    */

    // message structure
    /*
    {
        "userId": "userId"
        "type": "SUBSCRIBE",
        "channelId": "channelId",
        "message": message
    }    
    */

    // Singleton pattern to ensure one instance of ChatManager exists
    public static getInstance(): ChatManager {
        if (!ChatManager.instance) {
            ChatManager.instance = new ChatManager()
        }
        return ChatManager.instance
    }

    // Add a new user to the system if they are not already connected
    public addUser(userid: string, ws: WebSocket) {
        if (!this.subscriptions[userid]) {
            this.subscriptions[userid] = { ws, channels: [] }
            console.log(`User :${userid} connected`)
            console.log(`All users: ${Object.keys(this.subscriptions).length}`)
        } else {
            console.log(`User ${userid} is already connected`)
        }
    }

    // Handle different types of messages sent from a user
    public handleMessage(parsedMessage: any, userId: string) {
        if (parsedMessage.type === "SUBSCRIBE") {
            // Subscribe user to a channel
            this.subscribeToChannel(parsedMessage.channelId, userId)
        } else if (parsedMessage.type === "UNSUBSCRIBE") {
            // Unsubscribe user from a channel
            this.unsubscribeToChannel(parsedMessage.channelId, userId)
        } else if (parsedMessage.type === "MESSAGE") {
            // Publish message to the Redis channel and broadcast to all clients
            this.publishMessage(parsedMessage.channelId, parsedMessage.message, parsedMessage.userId)
            this.broadcastMessageToChannel(parsedMessage.channelId, parsedMessage.message, parsedMessage.userId)
        } else if (parsedMessage.type === "DISCONNECT") {
            // Handle user disconnection
            this.handleDisconnect(userId)
        }
    }

    // Subscribe a user to a Redis channel
    private async subscribeToChannel(channelId: string, userId: string) {
        const userSubscription = this.subscriptions[userId]

        // Ensure the user exists
        if (!userSubscription) {
            console.log(`${userId} doesn't exist`)
            return
        }

        // Check if user is already subscribed to the channel
        if (userSubscription.channels.includes(channelId)) {
            console.log(`User ${userId} is already subscribed to channel: ${channelId}`)
            return
        }

        // Add the channel to the user's subscription list
        userSubscription.channels.push(channelId)

        // Subscribe to the Redis channel
        this.redisClient.subscribe(channelId, (message) => {
            const ws = userSubscription.ws
            if (ws) {
                ws.send(JSON.stringify({
                    userId,
                    type: "SUBSCRIBED",
                    channelId,
                    message: `Subscribed successfully to channel: ${channelId}`
                }))
            }
        })

        console.log(`User ${userId} subscribed to channel: ${channelId}`)
        console.log(this.subscriptions[userId].channels)

        // Store the subscription in the database
        try {
            const subscribe = await prisma.subscriptions.create({
                data: {
                    channelId: channelId,
                    userId: userId,
                }
            })
            console.log(`Subscriptions data added to table`)
        } catch (error) {
            console.error("Error storing subscriptions", error)
        }
    }

    // Unsubscribe a user from a Redis channel
    private async unsubscribeToChannel(channelId: string, userId: string) {
        const userSubscription = this.subscriptions[userId]

        // Ensure the user exists
        if (!userSubscription) {
            console.log(`${userId} doesn't exist`)
            return
        }

        // Check if the user is already unsubscribed from the channel
        if (!userSubscription.channels.includes(channelId)) {
            console.log(`User ${userId} is already unsubscribed from channel: ${channelId}`)
            return
        }

        // Remove the channel from the user's subscription list
        this.subscriptions[userId].channels = userSubscription.channels.filter(c => c !== channelId)

        // Unsubscribe from the Redis channel
        this.redisClient.unsubscribe(channelId, () => {
            const ws = userSubscription.ws
            if (ws) {
                ws.send(JSON.stringify({
                    userId,
                    type: "UNSUBSCRIBED",
                    channelId,
                    message: `Unsubscribed user ${userId} from channel: ${channelId}`
                }))
            }
        })

        console.log(`Unsubscribed user ${userId} from channel: ${channelId}`)
        console.log(`Channels User :${userId} is subscribed to.`, this.subscriptions[userId].channels)

        // Remove the subscription from the database
        try {
            const unsubscribe = await prisma.subscriptions.deleteMany({
                where: {
                    userId: userId,
                    channelId: channelId
                },
            })
        } catch (error) {
            console.error("Error deleting subscription data from the database")
        }
    }

    // Publish a message to a Redis channel
    private publishMessage(channelId: string, message: string, userId: string) {
        const userSubscription = this.subscriptions[userId]

        // Ensure the user is subscribed to the channel
        if (!userSubscription || !userSubscription.channels.includes(channelId)) {
            console.log(`User: ${userId} is not subscribed to ${channelId}. So I can't send message.`)
            return
        }

        // Publish the message to the Redis channel
        this.publishClient.publish(channelId, message)
        console.log(`Message: ${message} published to Redis channel ${channelId}`)
    }

    // Broadcast a message to all WebSocket clients subscribed to the channel
    private async broadcastMessageToChannel(channelId: string, message: string, userId: string) {
        const userSubscription = this.subscriptions[userId]

        // Ensure the user is subscribed to the channel
        if (!userSubscription || !userSubscription.channels.includes(channelId)) {
            console.log(`User: ${userId} is not subscribed to ${channelId}. So I can't send message.`)
            return
        }

        // Broadcast the message to all WebSocket clients in the channel
        Object.keys(this.subscriptions).forEach(id => {
            const userSubscription = this.subscriptions[id]
            if (userSubscription.channels.includes(channelId)) {
                const ws = userSubscription.ws
                if (ws) {
                    ws.send(JSON.stringify({
                        type: "MESSAGE",
                        channelId,
                        message
                    }))
                }
            }
        })
        console.log(`Broadcast message to WebSocket clients in channel ${channelId}: ${message}`)

        // Store the message in the database
        try {
            const msg = await prisma.messages.create({
                data: {
                    message: message,
                    userId: userId,
                    channelId: channelId
                }
            })
        } catch (error) {
            console.error("Error storing msg in database table")
        }
    }

    // Handle user disconnection and unsubscribe from all channels
    private handleDisconnect(userId: string) {
        const user = this.subscriptions[userId]

        // Ensure the user is already connected
        if (!user) {
            console.log(`User: ${userId} is already disconnected`)
            return
        }

        // Unsubscribe the user from all channels and remove their subscriptions
        user.channels.forEach(channelId => {
            this.redisClient.unsubscribe(channelId, () => {
                console.log(`User ${userId} unsubscribed from channel: ${channelId}`)
            })
        })

        delete this.subscriptions[userId]
        console.log(`User ${userId} disconnected and all subscriptions removed`)
    }
}

/*
Example message:
{
    "userId": "1234",
    "type": "SUBSCRIBE",
    "channelId": "anime"
}
*/
