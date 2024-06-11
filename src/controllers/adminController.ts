import { NextFunction, Request, Response } from "express";
import asyncHandler from "../utils/asyncHandler.js";
import User from "../models/userModel.js";
import { AuthenticatedUserRequestType } from "../middlewares/auth.js";
import Chat, { ChatTypes, ChatTypesPopulated } from "../models/chatModel.js";
import ErrorHandler from "../utils/ErrorHandler.js";
import Message from "../models/messageModel.js";
import jwt, { Secret } from "jsonwebtoken";



export const adminLogin = asyncHandler(async(req:Request, res:Response, next:NextFunction) => {
    const {secretKey}:{secretKey:string} = req.body;

    const adminSecretKey:string = process.env.ADMIN_SECRET_KEY || "thisissecret";

    const isMatched = secretKey === adminSecretKey;

    if (!isMatched) return next(new ErrorHandler("Invalid admin key", 401));

    const token = jwt.sign(secretKey, process.env.JWT_SECRET as Secret);

    res.status(200)
        .cookie("admin-token", token, {httpOnly:true, secure:false, sameSite:"none", maxAge:1000*60*60*24*3})
        .json({success:true, message:"Authenticated successfully admin"})
});
export const adminLogout = asyncHandler(async(req:Request, res:Response, next:NextFunction) => {
    

    res.status(200)
        .cookie("admin-token", "", {httpOnly:true, secure:false, sameSite:"none", maxAge:0})
        .json({success:true, message:"Logout successfull admin"})
});
export const getAdminData = asyncHandler(async(req:Request, res:Response, next:NextFunction) => {
    res.status(200).json({success:true, message:"You are admin"});
})
export const getAllUsers = asyncHandler(async(req:Request, res:Response, next:NextFunction) => {
    const users = await User.find({});
    
    if (users.length === 0) return next(new ErrorHandler("Users not found", 404));
    
    const transformedUsers = await Promise.all(users.map(async(user) => {
        const userWithGroupChatCount = await Chat.countDocuments({
            groupChat:true,
            members:{$in:user._id}
        });
        return ({   
            _id:user._id,
            name:user.name,
            userName:user.userName,
            bio:user.bio,
            avatar:user.avatar,
            groupsCount:userWithGroupChatCount,
            friendsCount:user.friends.length
        })
    }));

    if (!transformedUsers || transformedUsers.length === 0) return next(new ErrorHandler("TransformedUsers not found", 404));

    res.status(200).json({
        success:true,
        // message:users
        message:transformedUsers
    });
});
export const getAllChats = asyncHandler(async(req:Request, res:Response, next:NextFunction) => {
    const chats = await Chat.find({}).populate({model:"User", path:"creator", select:"name avatar"}) as ChatTypesPopulated[];
    
    if (!chats) return next(new ErrorHandler("Chats not found", 404));
    
    const transformedChats = await Promise.all(
        chats.map(async ({_id, name, avatar, creator, members}) => {
            const messages = await Message.find({chatID:_id});
    
            return{
                _id,
                name,
                avatar:members?.slice(0, 3).map((member) => member?.avatar?.url),
                creator:{
                    name:creator?.name || "None",
                    avatar:creator?.avatar?.url || ""
                },
                members:members?.map(({name, avatar}) => ({
                    name,
                    avatar:avatar?.url
                })),
                totalMembers:members?.length,
                totalMessages:messages.length
            }
        })
    )

    res.status(200).json({success:true, message:transformedChats});
});
export const getAllMessages = asyncHandler(async(req:Request, res:Response, next:NextFunction) => {
});
export const getDashboardStats = asyncHandler(async(req:Request, res:Response, next:NextFunction) => {
    const [groupsCount, usersCount, messagesCount, totalChatsCount] = await Promise.all([
        Chat.countDocuments({groupChat:true}),
        User.countDocuments(),
        Message.countDocuments(),
        Chat.countDocuments()
    ]);

    const toDay = new Date();

    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);

    const last7DaysMessages = await Message.find({
        createdAt:{
            $gte:last7Days,
            $lte:toDay
        }
    }).select("createdAt");

    const messages = new Array(7).fill(0);

    last7DaysMessages.forEach((message) => {
        const indexApprox = (toDay.getTime() - message.createdAt.getTime())/(1000*60*60*24);
        const index = Math.floor(indexApprox);

        messages[6 - index]++;
    })

    const stats = {
        groupsCount,
        usersCount,
        messagesCount,
        totalChatsCount,
        messagesChart:messages
    };

    res.status(200).json({success:true, message:stats});
})