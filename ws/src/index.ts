import { WebSocketServer, WebSocket } from 'ws';
import { ChatManager } from './chat app/chatmanager';


const wss = new WebSocketServer({ port: 8080 });


wss.on('connection', function connection(userSocket:WebSocket) {
  userSocket.on('error', console.error);
  ChatManager.getInstance()


  userSocket.on('message', function message(data) {
   
    const parsedMessage = JSON.parse(data.toString())

    if (!parsedMessage.userId) {
      console.error("Missing userid in message:",parsedMessage)
      return;
    }

    ChatManager.getInstance().addUser(parsedMessage.userId, userSocket)

    ChatManager.getInstance().handleMessage(parsedMessage, parsedMessage.userId)

  })

  userSocket.on('close', () => {
    console.log("A user disconnected")
  })
  
});