import { NextFunction, Request, Response } from "express";
import ErrorHandler from "../utils/ErrorHandler.js";
import jwt, { Secret } from "jsonwebtoken";
import User from "../models/userModel.js";
import mongoose from "mongoose";
import { Socket } from "socket.io";
import { IncomingHttpHeaders, IncomingMessage, ServerResponse } from "http";

export interface AuthenticatedUserRequestType extends Request {
    user:{
        _id:mongoose.Schema.Types.ObjectId;
        name:string;
        userName:string;
        bio:string;
        avatar:{
            public_id:string;
            url:string;
        };
    }
}

interface CustomRequest extends IncomingMessage {
    cookies: { [key: string]: string };
    res:ServerResponse;
}
export interface AuthenticatedUserSocketRequestType extends Socket {
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
    request:Request&CustomRequest;
}


export const isUserAuthenticated = async(req:Request, res:Response, next:NextFunction) => {
    try {        
        const token = req.cookies?.token;

        // console.log({token});   

        if (!token) return next(new ErrorHandler("Token Not Found", 404));
        
        const verifiedToken = jwt.verify(token, process.env.TOKEN_SECRET as Secret);
        
        const loggedInUser = await User.findById(verifiedToken);
        

        // console.log({loggedInUser});
        

        if (!loggedInUser) return next(new ErrorHandler("User Not Found / Token expired / Login first", 404));

        (req as AuthenticatedUserRequestType).user = loggedInUser;
        next();
    } catch (error) {
        console.log(error);
        res.status(401).json({success:false, message:"Login First"})
    }
};
export const isUserAdmin = (req:Request, res:Response, next:NextFunction) => {
    const token = req.cookies["admin-token"];

    if (!token) return next(new ErrorHandler("Only admin can access this route", 401));

    const adminID = jwt.verify(token, process.env.TOKEN_SECRET as Secret);
    const adminSecretKey = process.env.ADMIN_SECRET_KEY || "thisissecret";

    if (adminID !== adminSecretKey) return next(new ErrorHandler("Invalid admin key", 401));

    next();
};
export const socketAuthenticator = async(err:any, socket:AuthenticatedUserSocketRequestType, next: (err?: any) => void):Promise<void> => {
    try {
        if (err)  return next(err);
        const authToken = socket.request.cookies["token"];
        if (!authToken) return next(new ErrorHandler("Please login to access this route", 401));

        const decodedData = jwt.verify(authToken, process.env.TOKEN_SECRET as Secret);

        const user = await User.findById(decodedData);

        if (!user) return next(new ErrorHandler("Please login to access this route", 401));

        socket.user = user;

        return next();
    } catch (error) {
        console.log(error);
        next(error);
    }
};