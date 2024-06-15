import { Request } from "express";
import { UserTypes } from "../models/userModel.js";
import mongoose from "mongoose";
import { getSockets } from "../lib/helper.js";


export const emitEvent = (req:Request, event:string, users:(mongoose.Schema.Types.ObjectId)[], data:any) => {

    const io = req.app.get("io");
    const usersSocket = getSockets(users);
    
    io.to(usersSocket).emit(event, data);
};

export const uploadFilesToCloudinary = async(public_ids:string[]) => {
    
};
export const deleteFilesFromCloudinary = async(public_ids:string[]) => {
    
};