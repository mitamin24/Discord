import axios from "axios";
import * as mediasoup from "mediasoup";
import { types as mediasoupTypes } from "mediasoup";
import { WebSocket } from "ws";
// import { jwtToken } from "../chat room/chatmanager";
// import { prisma } from "../../../backend/src/db";

interface User {
    id: string;
    ws: WebSocket;
    transport?: mediasoupTypes.Transport;
    producers: Map<string, mediasoupTypes.Producer>
    consumers: Map<string, mediasoupTypes.Consumer>
}

interface Room {
    name: string;
    type: 'video' | 'voice' | 'both'; // New field to distinguish between video and voice
    users: Map<string, User>;
}

export class VideoManager {
    private static instance: VideoManager;
    private worker?: mediasoupTypes.Worker;
    private router?: mediasoupTypes.Router;
    private workerSettings: mediasoupTypes.WorkerSettings;
    private mediaCodecs: mediasoupTypes.RtpCodecCapability[];
    private rooms: Map<string, Room>;
    private static jwtToken: string

    private constructor() {
        this.workerSettings = {
            logLevel: "warn",
            rtcMinPort: 10000,
            rtcMaxPort: 10100,
        };
        this.mediaCodecs = [
            {
                kind: 'audio',
                mimeType: 'audio/opus',
                clockRate: 48000,
                channels: 2,
            },
            {
                kind: 'video',
                mimeType: 'video/VP8',
                clockRate: 90000,
            },
        ];
        this.rooms = new Map();
        this.createWorker();
    }

    public static getInstance() {
        if (!VideoManager.instance) {
            VideoManager.instance = new VideoManager();
        }
        return VideoManager.instance;
    }

    public static setJwtToken(token: string):void {
        this.jwtToken = token;
    }

    private async createWorker() {
        this.worker = await mediasoup.createWorker(this.workerSettings);

        this.worker.on('died', () => {
            console.error("Mediasoup worker has died");
        });

        this.router = await this.worker.createRouter({ mediaCodecs: this.mediaCodecs });
    }

    // Join a room
    public async joinRoom(channelId:string ,roomId: string, userId: string, userSocket: WebSocket, roomType: 'video' | 'voice' | 'both') {

        const roomExists = await axios.get("http://localhost:3001/api/user/channel/createVideoRoom",{
            data: {
                channelId
            }, 
            headers: {
                Authorization: VideoManager.jwtToken
            }
        })

        // const roomExists = await prisma.rooms.findFirst({
        //     where: {
        //         id: roomId
        //     }
        // });
    
        if (!roomExists) {
            userSocket.send(JSON.stringify({ type: "ERROR", message: `Room ${roomId} doesn't exist` }));
            return;
        }
    
        // Check if the room is already in memory (this.rooms)
        let room = this.rooms.get(roomId);
    
        if (!room) {
            // Room doesn't exist in memory, create a new room
            room = {
                name: roomId,
                type: roomType,
                users: new Map()
            };
            this.rooms.set(roomId, room);
        } else {
            // If the room already exists, check if the user is already in the room
            if (room.users.has(userId)) {
                console.error(`User ${userId} is already in room ${roomId}`);
                userSocket.send(JSON.stringify({ type: "ERROR", message: `User is already in the room` }));
                return;
            }
    
            // Ensure the room type matches the requested type (optional)
            if (room.type !== roomType) {
                console.error(`Room ${roomId} is not compatible with the requested type ${roomType}`);
                userSocket.send(JSON.stringify({ type: "ERROR", message: `Room type mismatch` }));
                return;
            }
        }
    
        // Add the new user to the room
        const user: User = {
            id: userId,
            ws: userSocket,
            producers: new Map(),
            consumers: new Map()
        };
    
        room.users.set(userId, user);
    
        // Create WebRTC transport for the user
        user.transport = await this.createWebRtcTransport();
    
        // Notify the user that they have joined the room
        userSocket.send(JSON.stringify({ type: "JOINED_THE_ROOM", roomId, roomType }));
    
        // Notify other users in the room
        this.broadcastUserJoined(roomId, userId);
    }
    
    

    private async createWebRtcTransport() {
        const transport = await this.router?.createWebRtcTransport({
            listenIps: [{ ip: '0.0.0.0', announcedIp: '152.59.3.23' }],
            enableUdp: true,
            enableTcp: true,
            preferUdp: true,
        });

        transport?.on('dtlsstatechange', (dtlsState: any) => {
            if (dtlsState === 'closed') {
                transport.close();
            }
        });

        transport?.on('@close', () => {
            console.log("Transport closed");
        });

        return transport;
    }

    public async handleProducer(userId: string, roomId: string, kind: 'audio' | 'video' , rtpParameters: any) {
        const room = this.rooms.get(roomId);
        const user = room?.users.get(userId);
        if (!room || !user || !user.transport) {
            console.error(`User ${userId} not found in room ${roomId}`);
            return;
        }

        // Create producer
        const producer = await user.transport.produce({
            kind,
            rtpParameters,
        });

        user.producers.set(producer.id, producer)
        this.broadcastProducer(roomId, userId, producer.id, kind)

        this.createConsumersForExistingUsers(roomId, userId, producer)

    }

    private broadcastProducer(roomId: string, userId: string, producerId: string, kind: 'audio' | 'video') {
        const room = this.rooms.get(roomId);
        if (!room) return;

        room.users.forEach(user => {
            if (user.id !== userId) {
                user.ws.send(JSON.stringify({
                    type: "NEW_PRODUCER",
                    producerId,
                    userId,
                    kind,
                }));
            }
        });
    }

      // Create consumers for all users to receive the new producer's stream
      private async createConsumersForExistingUsers(roomId: string, producerUserId: string, producer: mediasoupTypes.Producer) {
        const room = this.rooms.get(roomId);
        if (!room) return;

        room.users.forEach(async (user) => {
            if (user.id !== producerUserId && user.transport) {
                const consumer = await user.transport.consume({
                    producerId: producer.id, // Stream from producer
                    rtpCapabilities: this.router?.rtpCapabilities!, // Capabilities for receiving the media
                });

                if (consumer) {
                    user.consumers.set(consumer.id, consumer);
                    user.ws.send(JSON.stringify({
                        type: "NEW_CONSUMER",
                        consumerId: consumer.id,
                        producerUserId,
                    }));

                    // Handle when the consumer's media stream ends
                    consumer.on('transportclose', () => {
                        user.consumers.delete(consumer.id);
                    });
                }
            }
        });
    }


    // Notify all users in the room when a new user joins
    private broadcastUserJoined(roomId: string, userId: string) {
        const room = this.rooms.get(roomId);
        if (!room) return;

        room.users.forEach(user => {
            if (user.id !== userId) {
                user.ws.send(JSON.stringify({ type: "USER_JOINED", userId }));
            }
        });
    }
}
