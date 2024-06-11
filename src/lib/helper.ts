import mongoose from "mongoose";
import { userSocketIDs } from "../app.js";

interface MemberTypes {
    _id?:mongoose.Schema.Types.ObjectId;
    name?:string;
    avatar?:{
        public_id:string;
        url:string;
    };
}

export const getOtherMember = (members?:MemberTypes[], userID?:mongoose.Schema.Types.ObjectId) => {
    return members?.find((member) => member?._id?.toString() !== userID?.toString());
};

export const getSockets = (members:mongoose.Schema.Types.ObjectId[]) => {
    console.log({members}, "getSocket server helper");
    
    return members.map((member) => userSocketIDs.get(member.toString())!)
};

export const getBase64 = (file:Express.Multer.File) => `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;