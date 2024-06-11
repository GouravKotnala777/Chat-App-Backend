import { NextFunction, Request, Response } from "express";
import asyncHandler from "../utils/asyncHandler.js";
import Chat, { ChatTypes, ChatTypesPopulated } from "../models/chatModel.js";
import ErrorHandler from "../utils/ErrorHandler.js";
import { AuthenticatedUserRequestType } from "../middlewares/auth.js";
import { deleteFilesFromCloudinary, emitEvent } from "../utils/features.js";
import { ALERT, REFETCH } from "../constants/events.js";
import mongoose from "mongoose";
import { getOtherMember } from "../lib/helper.js";
import { ObjectId } from "mongoose";
import User from "../models/userModel.js";
import Message from "../models/messageModel.js";




export const createGroupChat = asyncHandler(async(req:Request, res:Response, next:NextFunction) => {    
    const {name, members}:{name:string; members:mongoose.Schema.Types.ObjectId[];} = req.body;

    if (members.length < 2) return next(new ErrorHandler("Select minimum 2 users", 400));

    const allMembers = [...members, (req as AuthenticatedUserRequestType).user._id];

    const chat = await Chat.create({
        name,
        groupChat:true,
        creator:(req as AuthenticatedUserRequestType).user._id,
        members:allMembers,
    });
    members.forEach(async (member) => {
        await User.findByIdAndUpdate(member, {$push:{groups:chat._id}})
    });
    await User.findByIdAndUpdate((req as AuthenticatedUserRequestType).user._id, {$push:{groups:chat._id}});
  
    

    emitEvent(req, ALERT, allMembers, `Wellcome to ${name} group`);
    emitEvent(req, REFETCH, members, ``);

    res.status(200).json({success:true, message:chat});
});
export const getMyChats = asyncHandler(async(req:Request, res:Response, next:NextFunction) => {
    const myChats = await Chat.find({members:(req as AuthenticatedUserRequestType).user._id}).populate({model:"User", path:"members", select:"name avatar"}) as ChatTypesPopulated[];
    
    const transformedChats = myChats.map((chat) => {
        const otherMember = getOtherMember(chat.members, (req as AuthenticatedUserRequestType).user._id);

        return{
            _id:chat._id,
            groupChat:chat.groupChat,
            avatar:chat.groupChat?chat?.members?.slice(0, 3).map(({avatar}) => avatar?.url):[otherMember?.avatar?.url],
            name:chat.groupChat?chat.name:otherMember?.name,
            members:chat?.members?.reduce((prev:mongoose.Schema.Types.ObjectId[], curr) => {
                if (curr.toString() !== (req as AuthenticatedUserRequestType).user._id.toString()) {
                    prev?.push(curr._id!);
                }
                return prev;
            }, []),
            lastMessage:chat.lastMessage
        }
    });

    // console.log({transformedChats});
    

    res.status(200).json({success:true, message:transformedChats})
});
export const getMyGroups = asyncHandler(async(req:Request, res:Response, next:NextFunction) => {
    const chats = await Chat.find({
        members:{$in:(req as AuthenticatedUserRequestType).user._id},
        groupChat:true,
        creator:(req as AuthenticatedUserRequestType).user._id
    }).populate({model:"User", path:"members", select:"name avatar"}) as ChatTypesPopulated[];

    // console.log({chats});

    const groups = chats.map(({members, _id, groupChat, name}) => ({
        _id, groupChat, name, avatar:members?.slice(0, 3).map((avatar) => avatar)
    }));

    // console.log({groups});
    

    res.status(200).json({success:true, message:groups});
});
export const addMembers = asyncHandler(async(req:Request, res:Response, next:NextFunction) => {
    const {chatID, members}:{chatID:string, members:string[]} = req.body;

    if (!chatID) return next(new ErrorHandler("Please provide chatID", 400));
    if (!members || members.length < 1) return next(new ErrorHandler("Please provide members in array form", 400));

    const chat = await Chat.findById(chatID) as ChatTypes;

    if (!chat) return next(new ErrorHandler("Chat not found", 404));
    if (!chat.groupChat) return next(new ErrorHandler("This is not a groupChat", 400));  

    const newArray:(string | mongoose.Schema.Types.ObjectId | mongoose.Types.ObjectId)[]|Set<string | mongoose.Schema.Types.ObjectId | mongoose.Types.ObjectId> = 
    [...new Set(
        [...chat.members, ...members].map((item) => {
        return item.toString();
    }))];

    chat.members = newArray as ObjectId[];

    await chat.save();

    const chatPopulated = await Chat.findById(chatID).populate({model:"User", path:"members", select:"name userName"}) as ChatTypesPopulated;

    // console.log(chatPopulated?.members?.map((i) => i?.name).join(", "));
    

    emitEvent(req, ALERT, chat.members, `${chatPopulated?.members?.map((i) => i?.name).join(", ")} has been added in the group`)
    emitEvent(req, REFETCH, chat.members, "");


    res.status(200).json({success:true, message:"Members added successfully"});
});
export const removeMember = asyncHandler(async(req:Request, res:Response, next:NextFunction) => {
    const {userID, chatID}:{userID:string; chatID:string;} = req.body;

    const [chat, userThatWillBeRemoved] = await Promise.all([
        Chat.findById(chatID),
        User.findById(userID, "name")
    ]);

    if (!chat) return next(new ErrorHandler("Chat not found", 404));
    if (!chat) return next(new ErrorHandler("This is not a groupChat", 400));
    if (chat.creator?.toString() !== (req as AuthenticatedUserRequestType).user._id.toString()) return next(new ErrorHandler("You are not allowed to add members", 403));
    if (chat.members.length <= 3) return next(new ErrorHandler("Group must have at least 3 members", 400));
    if (!userThatWillBeRemoved) return next(new ErrorHandler("User not found", 404));

    

    const memberFindResult = chat.members.find((member) => member.toString() === userID.toString());

    if (!memberFindResult) return next(new ErrorHandler("Not a member", 400));

    chat.members = chat.members.filter((member) => member.toString() !== userID.toString());

    await User.findByIdAndUpdate(userID, {$pull:{groups:chat._id}});
    await chat.save();

    emitEvent(req, ALERT, chat.members, `${userThatWillBeRemoved?.name} has been removed from the group`);
    emitEvent(req, REFETCH, chat.members, "");

    res.status(200).json({success:true, message:"Members removed successfully"});
});
export const leaveGroup = asyncHandler(async(req:Request, res:Response, next:NextFunction) => {
    const {chatID} = req.params;

    console.log({chatID});
    

    const chat = await Chat.findById(chatID);

    if (!chat) return next(new ErrorHandler("Chat not found", 404));
    if (!chat.groupChat) return next(new ErrorHandler("This is not a groupChat", 400));

    const remainingMembers = chat.members.filter((member) => member.toString() !== (req as AuthenticatedUserRequestType).user._id.toString());

    console.log({remainingMembers:remainingMembers.length});
    
    if (remainingMembers.length < 3) return next(new ErrorHandler("Group must have at least 3 members", 400));

    if (chat.creator?.toString() === (req as AuthenticatedUserRequestType).user._id.toString()) {
        const randomElement = Math.floor(Math.random()*remainingMembers.length);
        const newCreator = remainingMembers[randomElement];

        chat.creator = newCreator;
    }

    const userIDArray = chat.members.map((member) => member);

    chat.members = remainingMembers;



    await User.findByIdAndUpdate((req as AuthenticatedUserRequestType).user._id, {$pull:{groups:chatID}});
    await chat.save();

    emitEvent(req, ALERT, userIDArray, `${(req as AuthenticatedUserRequestType).user.name} has left the group`);

    res.status(200).json({success:true, message:"Member removed successfully"})
});
export const getChatDetailes = asyncHandler(async(req:Request, res:Response, next:NextFunction) => {
    if (req.query.populate === "true") {        
        const chat = await Chat.findById(req.params.chatID)
                            .populate({model:"User", path:"members", select:"name avatar"})
                            .lean() as ChatTypesPopulated;

        if (!chat) return next(new ErrorHandler("Chat not found", 404));
        
        const members = chat?.members?.map((member) => ({
            _id:member._id as mongoose.Schema.Types.ObjectId,
            name:member.name as string,
            avatar:{
                public_id:member.avatar?.url as string,
                url:member.avatar?.url as string
            }
        }));
        res.status(200).json({success:true, message:members});
    }
    else{
        const chat = await Chat.findById(req.params.chatID)
                                .populate({model:"User", path:"members", select:"name avatar"})
                                .lean() as ChatTypesPopulated;

        if (!chat) return next(new ErrorHandler("Chat not found", 404));

        res.status(200).json({success:true, message:chat});
    }
});
export const renameGroup = asyncHandler(async(req:Request, res:Response, next:NextFunction) => {
    const {chatID} = req.params;
    const {name} = req.body;
    
    const chat = await Chat.findById(chatID);

    if (!chat) return next(new ErrorHandler("Chat not found", 404));
    if (!chat.groupChat) return next(new ErrorHandler("This is not groupChat", 400));
    if (chat.creator?.toString() !== (req as AuthenticatedUserRequestType).user._id.toString()) return next(new ErrorHandler("You are not allowed to rename the group", 403));

    const userIDArray = chat.members.map((member) => member);
    // console.log({userIDArray});

    chat.name = name;
    await chat.save();

    emitEvent(req, REFETCH, userIDArray, "");

    res.status(200).json({success:true, message:"Group renamed successfully"});
});
export const deleteChat = asyncHandler(async(req:Request, res:Response, next:NextFunction) => {
    
    const {chatID} = req.params;
    
    const chat = await Chat.findById(chatID);
    
    if (!chat) return next(new ErrorHandler("Chat not found", 404));
    
    const userIDArray = chat.members.map((member) => member);
    
    
    if (chat.groupChat && chat.creator?.toString() !== (req as AuthenticatedUserRequestType).user._id.toString()) return next(new ErrorHandler("You are not allowed to delete the group", 403));
    if (!chat.groupChat && !userIDArray.includes((req as AuthenticatedUserRequestType).user._id)) return next(new ErrorHandler("You are not allowed to delete the group", 403));
    
    const messageWithAttachments = await Message.find({
        chat:chatID,
        attachments:{$exists:true, $ne:[]}
    });
    
    const public_ids:string[] = [];
    
    messageWithAttachments.forEach(({attachements}) => 
        attachements.forEach((q:{public_id?:string, url?:string;}) => 
            public_ids.push(q.public_id!)));
    
    await Promise.all([
        User.updateMany({groups:{$in:chatID}}, {$pull:{groups:chatID}}),
        deleteFilesFromCloudinary(public_ids),
        chat.deleteOne(),
        Message.deleteMany({chat:chatID})
    ]);
    
    emitEvent(req, REFETCH, userIDArray, "");
    
    res.status(200).json({success:true, message:"Group deleted successfully"});
});