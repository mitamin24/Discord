import React, { useEffect, useRef, useState } from 'react';
import { Device } from 'mediasoup-client';

const VideoConference: React.FC = () => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [isInCall, setIsInCall] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [transportOptions, setTransportOptions] = useState<any>(null);
  const device = useRef<Device | null>(null);
  const sendTransport = useRef<any>(null);
  const recvTransport = useRef<any>(null);
  const userId = useRef<string>(`user_${Math.random().toString(36).substr(2, 9)}`); // Unique ID for the user
  const token = localStorage.getItem('token')

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8080');
    
    setSocket(ws);

    ws.onopen = () => {
      console.log("Connected to WebSocket");
      ws.send(JSON.stringify({
        type: "AUTH",
        token
      }))
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      handleSocketMessage(message);
    };

    return () => {
      ws.close();
    };
  }, []);

  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  const handleSocketMessage = async (message: any) => {
    switch (message.type) {
      case 'JOIN_ROOM_SUCCESS':
        setTransportOptions(message.transportOptions);
        await createDevice(message.rtpCapabilities);
        await produceStream(); // Start producing stream
        break;
      case 'NEW_PRODUCER':
        await consumeStream(message.producerId);
        break;
      case 'CONSUMER_READY':
        await handleConsumer(message);
        break;
      case 'USER_LEFT':
        handleUserLeft(message.userId);
        break;
      default:
        break;
    }
  };

  const startMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
    } catch (error) {
      console.error("Error accessing media devices:", error);
    }
  };

  const joinRoom = (roomId: string) => {
    if (socket) {
      socket.send(JSON.stringify({
        type: "JOIN_ROOM",
        roomId,
        userId: userId.current,
      }));
    }
  };

  const createDevice = async (routerRtpCapabilities: any) => {
    const newDevice = new Device();
    await newDevice.load({ routerRtpCapabilities });
    device.current = newDevice;

    await createSendTransport();
    await createRecvTransport();
  };

  const createSendTransport = async () => {
    const transport = device.current!.createSendTransport(transportOptions);

    transport.on('connect', ({ dtlsParameters }, callback, errback) => {
      socket?.send(JSON.stringify({
        type: 'CONNECT_TRANSPORT',
        dtlsParameters
      }));
      callback();
    });

    transport.on('produce', async (params, callback, errback) => {
      const { kind, rtpParameters } = params;
      socket?.send(JSON.stringify({
        type: "PRODUCE",
        kind,
        rtpParameters,
        roomId: "d95b7207-cb13-41fb-a623-fb42b37ecaf2", // Replace with the actual room ID
        userId: userId.current // Use unique user ID
      }));
      callback({ id: 'producerId' }); // Provide actual producer ID in production
    });

    sendTransport.current = transport;
  };

  const createRecvTransport = async () => {
    const transport = device.current!.createRecvTransport(transportOptions);

    transport.on('connect', ({ dtlsParameters }, callback, errback) => {
      socket?.send(JSON.stringify({
        type: 'CONNECT_RECV_TRANSPORT',
        dtlsParameters
      }));
      callback();
    });

    recvTransport.current = transport;
  };

  const produceStream = async () => {
    if (localStream && sendTransport.current) {
      const videoTrack = localStream.getVideoTracks()[0];
      await sendTransport.current.produce({ track: videoTrack });
    }
  };

  const consumeStream = async (producerId: string) => {
    socket?.send(JSON.stringify({
      type: "CONSUME",
      roomId: "d95b7207-cb13-41fb-a623-fb42b37ecaf2", // Replace with the actual room ID
      producerId,
      userId: userId.current // Use unique user ID
    }));
  };

  const handleConsumer = async ({ consumerId, rtpParameters, producerId }: any) => {
    const consumer = await recvTransport.current!.consume({
      id: consumerId,
      producerId,
      kind: 'video',
      rtpParameters,
    });

    const remoteStream = new MediaStream();
    remoteStream.addTrack(consumer.track);

    setRemoteStreams(prev => {
      const newStreams = new Map(prev);
      newStreams.set(consumerId, remoteStream); // Use consumerId to store the stream
      return newStreams;
    });
  };

  const handleUserLeft = (userId: string) => {
    setRemoteStreams(prev => {
      const newStreams = new Map(prev);
      newStreams.delete(userId); // Remove stream for the user who left
      return newStreams;
    });
  };

  const startCall = async () => {
    await startMedia();
    joinRoom("roomId"); // Join the room (replace with dynamic roomId)
    setIsInCall(true);
  };

  return (
    <div>
      <div>
        <button onClick={startCall} disabled={isInCall}>
          {isInCall ? 'In Call' : 'Start Video Call'}
        </button>
      </div>
      <div>
        <video ref={localVideoRef} autoPlay muted playsInline></video>
      </div>
      <div>
        {Array.from(remoteStreams.entries()).map(([userId, stream]) => (
          <video
            key={userId}
            ref={(videoElement) => {
              if (videoElement && stream) {
                videoElement.srcObject = stream;
              }
            }}
            autoPlay
            playsInline
          ></video>
        ))}
      </div>
    </div>
  );
};

export default VideoConference;
