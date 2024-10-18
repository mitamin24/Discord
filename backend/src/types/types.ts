interface User {
    id: string;
    username: string;
    email: string;
    createdAt: Date;
}

interface Channel {
    id: string;
    name: string;
    ownerId: string; // Reference to the User who owns the channel
    createdAt: Date;
}

interface Message {
    id: string;
    channelId: string; // Reference to the Channel
    userId: string;    // Reference to the User who sent the message
    content: string;
    createdAt: Date;
}