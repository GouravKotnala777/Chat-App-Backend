import { Request } from "express";
import { UserTypes } from "../models/userModel.js";
import mongoose from "mongoose";
import { getSockets } from "../lib/helper.js";


export const emitEvent = (req:Request, event:string, users:(mongoose.Schema.Types.ObjectId)[], data:any) => {
    console.log("emitting event", event);

    const io = req.app.get("io");
    const usersSocket = getSockets(users);
    io.to(usersSocket).emit(event, data);
    console.log("features-server chal gaya");
    

};

export const uploadFilesToCloudinary = async(public_ids:string[]) => {
    
};
export const deleteFilesFromCloudinary = async(public_ids:string[]) => {
    
};