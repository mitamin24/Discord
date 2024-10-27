import { createClient, RedisClientType } from "redis"
import { WebSocket } from "ws"
// @ts-ignore
// import {prisma} from "../../../backend/src/db"
import axios from "axios"

// export const jwtToken = localStorage.getItem("token")

export class ChatManager {
    private static instance: ChatManager
    private publishClient: RedisClientType
    private redisClient: RedisClientType
    private subscriptions: { [key: string]: { ws: WebSocket, channels: string[] } }
    private static jwtToken: string;

    private constructor() {
        this.redisClient = createClient({
            url: 'redis://discord-redis-server:6379' // connect to redis using container name
        })
        this.redisClient.connect().catch(console.error);
        this.publishClient = createClient({
            url: 'redis://discord-redis-server:6379' // connect to redis using container name
        })
        this.publishClient.connect().catch(console.error);
        this.subscriptions = {}
    }

        /*  subscriptions structure
        {
            "user1" : {
            ws: websocket,
            channels: [movie,series]
            .
            },
            "user2": {
            ws: websocket,
            channels: [anime,wallpaper]
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

    public static getInstance(): ChatManager {
        if (!ChatManager.instance) {
            ChatManager.instance = new ChatManager()
        }
        return ChatManager.instance
    }

    public static setJwtToken(token: string):void {
        this.jwtToken = token
    }
        

    public addUser(userid:string, ws: WebSocket) {
        if(!this.subscriptions[userid]) {
            this.subscriptions[userid] = {ws, channels: [] }
            console.log(`User :${userid} connected`);    
            console.log(`All users: ${Object.keys(this.subscriptions).length}`)
        } else {
            console.log(`User ${userid} is already connected`)
        }
    }

    public handleMessage(parsedMessage: any, userId: string) {
        if (parsedMessage.type === "SUBSCRIBE") {
            this.subscribeToChannel(parsedMessage.channelId, userId);
        } else if (parsedMessage.type === "UNSUBSCRIBE") {
            this.unsubscribeToChannel(parsedMessage.channelId, userId);
        } else if (parsedMessage.type === "MESSAGE") {
            // call the publish method to publish message to redis
            this.publishMessage(parsedMessage.channelId, parsedMessage.message, parsedMessage.userId)
            // cll the broadcast method to sent the messafe to all users in the channel
            this.broadcastMessageToChannel(parsedMessage.channelId, parsedMessage.message,parsedMessage.userId)
        } else if (parsedMessage.type === "DISCONNECT") {
            // call the handle disconnect method
            this.handleDisconnect(userId)
        }
    }
    

    private async subscribeToChannel(channelId: string, userId: string) {
        const userSubscription = this.subscriptions[userId]

        if(!userSubscription) {
            console.log(`${userId} doesn't exists`);
            return
        }

        if (userSubscription.channels.includes(channelId)) {
            console.log(`User ${userId} is already subscribed to channel: ${channelId}`)
            return
        }

        userSubscription.channels.push(channelId)

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

       
        try {

            const response = await axios.post("http://localhost:3001/api/user/subscriptions",{
                channelId,
                userId
            }, 
        {
            headers: {
                'Authorization': `${ChatManager.jwtToken}`
            }
        })

            // const subscribe = await prisma.subscriptions.create({
            //     data: {
            //         channelId: channelId,
            //         userId: userId,
            //     }
            // })

            console.log(`Subscriptions data added to table`);
            

            
        } catch (error) {
            console.error("Error storing subscriptions",error)
        }

    }

    private async unsubscribeToChannel(channelId: string, userId: string) {
        const userSubscription = this.subscriptions[userId]

        if(!userSubscription) {
            console.log(`${userId} doesn't exists`);
            return;
            
        }

        if (!userSubscription.channels.includes(channelId)) {
            console.log(`User ${userId} is already unsubscribed from channel: ${channelId}`)
            return;
        }

        this.subscriptions[userId].channels = userSubscription.channels.filter(c => c !== channelId)

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
        console.log(`Chuannels User :${userId} is subscribed to.`,this.subscriptions[userId].channels)

        try {

            const response = await axios.delete(`http://localhost:3001/api/user/subscriptions`, {
                    data: { channelId }, // Send `channelId` in the `data` field
                    headers: {
                        Authorization: `Bearer ${ChatManager.jwtToken}`, // Add the JWT token in the Authorization header
                       
                    },
                }
            );
            console.log("deleted!");
            
            // const unsubscribe = await prisma.subscriptions.deleteMany({
            //     where: {
            //         userId: userId,
            //         channelId: channelId
            //     },
            // })
        } catch (error) {
            console.error("Error deleting subscription data from the database")
        }
    }

    private publishMessage(channelId: string, message: string, userId: string) {
        const userSubscription = this.subscriptions[userId];
        
        // Check if the user is subscribed to the channel
        if (!userSubscription || !userSubscription.channels.includes(channelId)) {
            console.log(`User: ${userId} is not subscribed to ${channelId}. So I can't send message.`);
            return;
        }
    
        this.publishClient.publish(channelId, message);
        console.log(`Message: ${message} published to Redis channel ${channelId}`);
    }
    
    private async broadcastMessageToChannel(channelId: string, message: string, userId: string) {
        // Check if the user is subscribed to the channel
        const userSubscription = this.subscriptions[userId];
    
        if (!userSubscription || !userSubscription.channels.includes(channelId)) {
            console.log(`User: ${userId} is not subscribed to ${channelId}. So I can't send message.`);
            return;
        }
    
        Object.keys(this.subscriptions).forEach(id => {
            const userSubscription = this.subscriptions[id];
            if (userSubscription.channels.includes(channelId)) {
                const ws = userSubscription.ws;
                if (ws) {
                    ws.send(JSON.stringify({
                        type: "MESSAGE",
                        channelId,
                        message
                    }));
                }
            }
        });
        console.log(`Broadcast message to websocket clients in channel ${channelId}: ${message}`);

        try {

            const response = await axios.post("http://localhost:3001/api/user/messages",{
                userId,
                channelId,
                message
            },
            {
                headers: {
                    Authorization: ChatManager.jwtToken
                }
            }
        )
        console.log("message created");
        

            // const msg = await prisma.messages.create({
            //     data: {
            //         message: message,
            //         userId: userId,
            //         channelId: channelId
            //     }
            // })
        } catch (error) {
            console.error("Error storing msg in database table")        
        }
    }
    

    private handleDisconnect(userId: string) {
        const user = this.subscriptions[userId]
        if (!user) {
            console.log(`User: ${userId} is already disconnected`)
            return
        }

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
{
    "userId": "1234",
    "type": "SUBSCRIBE",
    "channelId": "anime"
}


*/