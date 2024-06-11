import express, { NextFunction, Request, Response } from "express";
import { IncomingMessage, ServerResponse, createServer } from "http";
import { Server, Socket } from "socket.io";
import cors from "cors";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import userRouter from "./routes/userRouter.js";
import connectDatabase from "./config/db.js";
import errorMiddleware from "./middlewares/errorMiddleware.js";
import { config } from "dotenv";
import seederRouter from "./seeders/seederRouter.js";
import chatRouter from "./routes/chatRouter.js";
import adminRouter from "./routes/adminRouter.js";
import messageRouter from "./routes/messageRouter.js";
import { v2 as cloudinary } from "cloudinary";
import { v4 as uuid } from "uuid";
import { NEW_MESSAGE, NEW_MESSAGE_ALERT } from "./constants/events.js";
import { getSockets } from "./lib/helper.js";
import { AuthenticatedUserSocketRequestType, socketAuthenticator } from "./middlewares/auth.js";
import ErrorHandler from "./utils/ErrorHandler.js";
import mongoose from "mongoose";



interface AuthenticatedUserSocketRequestTypeA extends Socket {
    user?:{
        _id:mongoose.Schema.Types.ObjectId;
        name:string;
        userName:string;
        bio:string;
        avatar:{
            public_id:string;
            url:string;
        };
    };
}




interface ExtendedIncomingMessage extends IncomingMessage {
    cookies: { [key: string]: string };
    res: ServerResponse;
}
interface AuthenticatedUserSocketRequestTypeB extends Socket {
    user?:{
        _id:mongoose.Schema.Types.ObjectId;
        name:string;
        userName:string;
        bio:string;
        avatar:{
            public_id:string;
            url:string;
        };
    };
    request:ExtendedIncomingMessage;
}
interface MessageForRealTimeTypes{
    content:string;
    _id:string;
    sender:{
        _id?:mongoose.Schema.Types.ObjectId;
        name?:string;
    },
    chatID:string;
    createdAt:string;
}




config({
    path:"./.env"
})

const PORT = 8000;
const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors:{
        origin:process.env.SERVER_URI,
        methods:["GET", "POST"],
        credentials:true
    }
});
app.set("io", io);

export const userSocketIDs:Map<string, string> = new Map();

connectDatabase(process.env.DATABASE_URI as string);
cloudinary.config({
    cloud_name:process.env.CLOUDINARY_CLOUD_NAME,
    api_key:process.env.CLOUDINARY_API_KEY,
    api_secret:process.env.CLOUDINARY_API_SECRET
})


app.use(cors({
    origin:process.env.SERVER_URI,
    credentials:true
}));
app.use(express.json());
app.use(bodyParser.urlencoded({extended:true}));
app.use(cookieParser())



app.use("/api/v1/user", userRouter);
app.use("/api/v1/chat", chatRouter);
app.use("/api/v1/message", messageRouter)
app.use("/api/v1/seed", seederRouter);
app.use("/api/v1/admin", adminRouter);


app.use(errorMiddleware);

app.get("/", async (req, res, next) => {
    res.status(200).json({success:true, message:"Working ffrom Port:8000"});
});


io.use((socket:AuthenticatedUserSocketRequestType|Socket, next: (err?: Error) => void) => {
    cookieParser()((socket as AuthenticatedUserSocketRequestType).request, (socket as AuthenticatedUserSocketRequestType).request.res, async(err) => {
        await socketAuthenticator(err, (socket as AuthenticatedUserSocketRequestType), next);
    })
});

io.on("connection", (socket:AuthenticatedUserSocketRequestTypeA) => {
    const user = socket.user;
    userSocketIDs.set(user?._id.toString()!, socket.id);
    console.log({userSocketIDs});

    socket.on(NEW_MESSAGE, async({chatID, members, messageInp}:{chatID:string; members:mongoose.Schema.Types.ObjectId[]; messageInp:string;}) => {
        const messageForRealTime:MessageForRealTimeTypes = {
            content:messageInp,
            _id:uuid(),
            sender:{
                _id:user?._id,
                name:user?.name
            },
            chatID,
            createdAt:new Date().toISOString()
        };
        const messageForDB = {
            content:messageInp,
            sender:user?._id,
            chatID,
            attachment:[]
        };

        console.log("Sever app.ts socket chal gaya ---- (1)");
        
        // console.log("EMITTING", members);

        const memberSocket = getSockets(members);
        // console.log({memberSocket});
        
        io.to(memberSocket).emit(NEW_MESSAGE, {
            chatID, message:messageForRealTime
        });
        // io.to(memberSocket).emit(NEW_MESSAGE_ALERT, {chatID});

        // console.log("New Message", messageForRealTime);
    })

    socket.on("message", ({room, message}) => {
        console.log({room, message});
        io.to(room).emit("message_received", message);
    });

    socket.on("join_room", (room) => {
        socket.join(room);
    });

    socket.on("disconnect", () => {
        console.log("User Disconnected", socket.id);
        userSocketIDs.delete(user!._id.toString());
    });
});

server.listen(PORT, () => {
    console.log("Listening..."); 
});