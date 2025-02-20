import { Server } from "socket.io";
import { createNewMsg } from "../controller/chats";

export let io: any;
// let activeSockets: string[] = [];

const Socket = (server: any): void => {
  console.log("socket function called");

  io = new Server(server, {
    cors: {
      origin: "*", // Adjust for production
      methods: ["GET", "POST"],
      //   transports: ['websocket', 'polling'],
      credentials: false,
    },
    allowEIO3: true,
  });

  let registerUser:any = {};  
  const users:any = {}; // Store the sockets of each user to target them later
  let userActivities:any = {};  // Store user activity status

  io.on("connection", (socket: any) => {
    
    // testing typing and status
    socket.on('userRegister', (userId:string) => {
      // Check if userId is already registered in registerUser
      if (!(userId in registerUser)) {
        registerUser[userId] = { ids: [], list:[] }; // Initialize if not present
      }
      const previousIds = registerUser[userId]?.ids ?? [];
      if(!previousIds.includes(socket.id))
        registerUser[userId].ids = [...previousIds, socket.id];
    });

    // Update Chat User Status
    socket.on('updateChatUserList', (userId:string, list:string[] =[]) => {
      if(userId && list.length){
        registerUser[userId].list = [...list];

        list?.forEach((receiverId:string) => {
          registerUser[receiverId]?.ids.forEach((socketId:string) => {
            io.to(socketId).emit('GetUsersStatus', userActivities[userId]);
          })
          
          io.to(socket.id).emit('GetUsersStatus', userActivities[receiverId])          
        })
      }
    });

    // Send and Receive Message
    socket.on('SendMessage', async (data:any) => {
      const reciverUser = data.receiver+"_"+data.sender;
      const selfUser = data.sender+"_"+data.receiver;

      try{
        const createNew:any = await createNewMsg(data)
        
        if(registerUser[data.receiver]){
          registerUser[data.receiver]?.ids.forEach((socketId:string) => {
            io.to(socketId).emit('NewMessage', createNew._doc)
          });
        }
        
        registerUser[data.sender]?.ids.forEach((socketId:string) => {
          io.to(socketId).emit('NewMessage', createNew._doc)
        });
      } catch (error) {        
        io.to(users[reciverUser]).emit('NewMessage', {error:"message not recived"});       
        io.to(users[selfUser]).emit('NewMessage', {error:"message not sent"});
      }
    });

    // Update User Status
    socket.on('UserChatStatus', (data:{sender:string, receiver:string, online:boolean, typing:boolean}) => {
      userActivities[data.sender] = { ...data, lastActive: new Date(), };
      if(data.sender && !data.receiver)
        registerUser[data.sender]?.list.forEach((receiverId:string) => {
          registerUser[receiverId]?.ids.forEach((socketId:string) => {
            io.to(socketId).emit('GetUsersStatus', userActivities[data.sender])
          })
        })

      if(data.receiver && registerUser[data.receiver]?.ids.length)
        registerUser[data.receiver]?.ids.forEach((socketId:string) => {
          io.to(socketId).emit('GetUsersStatus', userActivities[data.sender])
        })
    });

    socket.on('disconnect', () => {
      console.log(`Remove user ${socket.id}`);
    });

  })


};

export const sendNotifi = async (user: any, message: string) => {
  try {
    // Emit the notification to all connected clients
    io.emit("receive notification", message);
  } catch (error) {
    console.log("fail send RTN");
  }
};

export default Socket;
