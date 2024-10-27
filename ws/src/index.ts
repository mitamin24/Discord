import { WebSocketServer, WebSocket } from 'ws';
import { ChatManager } from './chat room/chatmanager';
import { VideoManager } from './video room/videoManager';
import jwt, { JwtPayload } from "jsonwebtoken"
import dotenv from "dotenv"
dotenv.config()

const wss = new WebSocketServer({ port: 8080 });

wss.on('connection', (userSocket: WebSocket) => {
    userSocket.on('error', (error) => {
        console.error('WebSocket error:', error);
    });

    const chatManager = ChatManager.getInstance();
    const videoManager = VideoManager.getInstance();

    userSocket.on('message', (data) => {
        try {
            const parsedMessage = JSON.parse(data.toString());

            if(parsedMessage.type === "AUTH") {
                const token = parsedMessage.token
                const decodedToken = jwt.verify(token, process.env.JWT_SECRET || "random") as JwtPayload
                console.log(process.env.JWT_SECRET);

                const userId = decodedToken.id
                console.log(`User Id: `, userId);

                if (!parsedMessage.userId) {
                    console.error('Missing userId in message:', parsedMessage);
                    return;
                }

                ChatManager.setJwtToken(token)
                VideoManager.setJwtToken(token)
            }

            switch (parsedMessage.type) {
                case 'JOIN_ROOM':
                    videoManager.joinRoom(parsedMessage.channelId,parsedMessage.roomId, parsedMessage.userId, userSocket, parsedMessage.roomType);
                    break;

                case 'PRODUCE':
                    videoManager.handleProducer(parsedMessage.userId, parsedMessage.roomId, parsedMessage.kind, parsedMessage.rtpParameters);
                    break;

                default:
                    console.warn('Unknown message type:', parsedMessage.type);
            }

            // Add user to chat manager and handle the incoming message
            chatManager.addUser(parsedMessage.userId, userSocket);
            chatManager.handleMessage(parsedMessage, parsedMessage.userId);
        } catch (error) {
            console.error('Error processing message:', error);
        }
    });

    userSocket.on('close', () => {
        console.log('A user disconnected');
        // Handle user disconnection from managers if needed
        // chatManager.removeUser(userSocket);
        // videoManager.removeUser(userSocket); // You might need to implement this
    });
});
