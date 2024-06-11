import { NextFunction, Request, Response } from "express";
import asyncHandler from "../utils/asyncHandler.js";
import User, { UserTypesPopulated } from "../models/userModel.js";
import { sendToken } from "../utils/sendToken.js";
import ErrorHandler from "../utils/ErrorHandler.js";
import { AuthenticatedUserRequestType } from "../middlewares/auth.js";
import Chat from "../models/chatModel.js";
import Notification from "../models/requestModel.js";
import { emitEvent } from "../utils/features.js";
import { NEW_REQUEST, REFETCH } from "../constants/events.js";
import mongoose from "mongoose";
import { uploadFilesOnCloudinary } from "../utils/cloudinary.js";



export const createUser = asyncHandler(async(req:Request, res:Response, next:NextFunction) => {
    const {name, userName, password, bio} = req.body;
    const file = req.file as Express.Multer.File;

    console.log({name, userName, password, bio});
    
    if (!name || !userName || !password || !bio) return next(new ErrorHandler("All fields are required", 400));
    if (!file) return next(new ErrorHandler("Please upload avatar", 400));
    
    const result = await uploadFilesOnCloudinary([file])

    const isUserExist = await User.findOne({userName});

    if (isUserExist) return next(new ErrorHandler("User already exists", 400))
    
    const avatar = {
        public_id:result[0].public_id,
        url:result[0].url
    };

    console.log({avatar});

    if (!avatar) return next (new ErrorHandler("Avatar is required", 400));

    const user = await User.create({
        name, userName, password, bio, avatar
    });

    if (!user) return next(new ErrorHandler("Internal Server Error", 500));

    sendToken(res, user, 201, "Register Successfull");
});
export const login = asyncHandler(async(req:Request, res:Response, next:NextFunction) => {
    const {userName, password} = req.body;

    console.log({userName, password});

    if (!userName || !password) return next(new ErrorHandler("All fields are required", 400));

    const user = await User.findOne({userName}).select("+password");

    console.log({userfromlogin:user});
    

    if (!user) return (next(new ErrorHandler("Wrong email or password 1", 404)))
        
    const isPasswordMatched = await user.comparePassword(password);
        
    if (!isPasswordMatched) return (next(new ErrorHandler("Wrong email or password 2", 404)))

    sendToken(res, user, 201, "login Successfull");
});
export const logout = asyncHandler(async(req:Request, res:Response, next:NextFunction) => {
    res.status(200)
        .cookie("token", "", {httpOnly:true, secure:true, sameSite:"none", maxAge:0})
        .json({success:true, message:"Logout successfull"})
});
export const me = asyncHandler(async(req:Request, res:Response, next:NextFunction) => {
    const user = (req as AuthenticatedUserRequestType).user;

    // console.log({user});
    

    if (!user) return next(new ErrorHandler("User not found -- me", 400));

    res.status(200).json({success:true, message:user})

});
export const searchUsers = asyncHandler(async(req:Request, res:Response, next:NextFunction) => {
        const name = req.query.name as string;
    
        if (!name) return next(new ErrorHandler("Find field is empty", 400));        
    
        const user = await User.findById((req as AuthenticatedUserRequestType).user._id).populate({model:"User", path:"friends", select:"userName name"}) as UserTypesPopulated;
        
        if (!user) return next(new ErrorHandler("logged in user not found", 404));

        const namePattern = new RegExp(name, "i");

        const notFriends = await User.find({_id:{$nin:user.friends, $ne:user._id}});

        const searchedUser = notFriends.filter((notFriendUser) => namePattern.test(notFriendUser.name));
        
        if (searchedUser.length === 0) return next(new ErrorHandler("SearchedUser not found", 404));
    
        res.status(200).json({success:true, message:searchedUser}) 
});
export const sendFriendRequest = async(req:Request, res:Response, next:NextFunction) => {
    try {
        const {userID} = req.body;

        if (!userID) return next(new ErrorHandler("Please provide userID for friend request", 400));


        const request = await Notification.findOne({
            $or:[
                {sender:(req as AuthenticatedUserRequestType).user._id, receiver:userID},
                {sender:userID, receiver:(req as AuthenticatedUserRequestType).user._id}
            ]
        });

        console.log({request});
        

        if (request) return next(new ErrorHandler("Request already sent", 400));

        await Notification.create({
            sender:(req as AuthenticatedUserRequestType).user._id,
            receiver:userID,
            status:"pending"
        });

        emitEvent(req, NEW_REQUEST, [userID], "");

        return res.status(200).json({success:true, message:"Friend request sent"});
    } catch (error) {
        console.log(error);
        next(error);
    }
};
export const acceptFriendRequest = async(req:Request, res:Response, next:NextFunction) => {
    try {
        const {requestID, accept}:{requestID:mongoose.Schema.Types.ObjectId; accept:boolean;} = req.body;
    
        const request = await Notification.findById(requestID)
                                        .populate({model:"User", path:"sender", select:"name"})
                                        .populate({model:"User", path:"receiver", select:"name"});
    
        if (!request) return next(new ErrorHandler("Request not found", 404));
    
        if (request.receiver._id.toString() !== (req as AuthenticatedUserRequestType).user._id.toString()) return next(new ErrorHandler("You are not authorized to accept this request", 401));
    
        if (!accept) {
            await request.deleteOne();
    
            return res.status(200).json({
                success:true, message:"Friend request rejected"
            });
        };
    
        console.log({sender:request.sender._id});
        console.log({reciever:request.receiver._id});
        
        const members = [request.sender._id, request.receiver._id];
    
        const [, senderUser, receiverUser,] = await Promise.all([
            Chat.create({
                members,
                name:`${request.sender.name}-${request.receiver.name}`
            }),
            User.findByIdAndUpdate(request.sender._id, {$push:{friends:request.receiver._id}}),
            User.findByIdAndUpdate(request.receiver._id, {$push:{friends:request.sender._id}}),
            request.deleteOne()
        ]);


        
    
        // const userIDArray = chat.members.map((member) => member._id);
        // // console.log({userIDArray});
    
        emitEvent(req, REFETCH, members, "");
        
        res.status(200).json({
            success:true,
            message:"Friend request accepted",
            senderID:request.sender._id
        });
        
    } catch (error) {
        console.log(error);
        next(error);
    }
};
export const getMyNotifications = asyncHandler(async(req:Request, res:Response, next:NextFunction) => {
    const requests = await Notification.find({receiver:(req as AuthenticatedUserRequestType).user._id})
                                        .populate({model:"User", path:"sender", select:"name avatar"});
    const allRequests = requests.map((request) => ({
        _id:request._id,
        sender:{
            _id:request.sender._id,
            name:request.sender.name,
            avata:request.sender.avatar.url
        }
    }));

    res.status(200).json({success:true, message:allRequests})
});
export const getMyAllFriends = asyncHandler(async(req:Request, res:Response, next:NextFunction) => {
    const userID = (req as AuthenticatedUserRequestType).user._id;
    
    if (!userID) return next(new ErrorHandler("UserID not found", 404));
    
    const user = await User.findById(userID).populate({model:"User", path:"friends", select:"name userName avatar"});
       

    if (!user) return next(new ErrorHandler("User not found", 404));

    res.status(200).json({success:true, message:user?.friends});
});