import { NextFunction, Request, Response } from "express";
import { AuthenticatedUserRequestType } from "../middlewares/auth.js";
import Chat from "../models/chatModel.js";
import Message from "../models/messageModel.js";
import ErrorHandler from "../utils/ErrorHandler.js";
import asyncHandler from "../utils/asyncHandler.js";
import { emitEvent } from "../utils/features.js";
import { NEW_MESSAGE, NEW_MESSAGE_ALERT } from "../constants/events.js";
import { uploadFilesOnCloudinary } from "../utils/cloudinary.js";
import mongoose from "mongoose";


export const sendAttachments = async(req:Request, res:Response, next:NextFunction) => {

    try {
        const {chatID, content, forwardedAttachement}:{chatID:string|string[]; content:string|string[]; forwardedAttachement:string|string[];} = req.body;
    
        console.log({chatID}, {content}, {forwardedAttachement});
        
        
        if (typeof chatID === "string" && (typeof content ==="undefined" || typeof content === "string")) {
            const chat = await Chat.findById(chatID);
            
            if (!chat) next(new ErrorHandler("Chat not found", 404));
            
            const files = req.files || [];
            console.log({files});
        
            // if (files.length < 1) return next(new ErrorHandler("Please upload attachment", 400));
            if (!files || files.length === 0 && !content) next(new ErrorHandler("Please provide content or attachments", 400));
            // if ((files as Express.Multer.File[]).length > 5) return next(new ErrorHandler("Files can't be more than 5", 400));
        
            // const assa = await uploadFilesOnCloudinary(files as Express.Multer.File[]);

            const attachements:{
                public_id: string;
                url: string;
            }[] = forwardedAttachement? 
            [] : await uploadFilesOnCloudinary(files as Express.Multer.File[]);

            
            
            const messageForDB = {
                content,
                attachements,
                sender:(req as AuthenticatedUserRequestType).user._id,
                chatID
            };

            const messageForRealTime = {
                ...messageForDB,
                sender:{
                    _id:(req as AuthenticatedUserRequestType).user._id,
                    name:(req as AuthenticatedUserRequestType).user.name
                }
            };
        
            const userIDArray = chat?.members.map((member) => member);
        
            const message = await Message.create(messageForDB);
        
            emitEvent(req, NEW_MESSAGE, userIDArray!, {
                message:messageForRealTime,
                chatID
            });
            emitEvent(req, NEW_MESSAGE_ALERT, userIDArray!, {chatID});
            
        }
        else if(typeof chatID === "object" && typeof content === "object"){
            console.log("XXXXXXXXXXXXXXXX  (1)")
            
            chatID.forEach(async (chatMapItem) => {
                console.log("XXXXXXXXXXXXXXXX  (2)")
                const chat = await Chat.findById(chatMapItem);

                console.log("XXXXXXXXXXXXXXXX  (2.1)")
                
                if (!chat) next(new ErrorHandler("Chat not found", 404));
                console.log("XXXXXXXXXXXXXXXX  (3)")
                
                const files = req.files || [];
                
                // if (!files || files.length === 0 && content.length === 0) next(new ErrorHandler("Please provide attachments", 400));
                
                // const attachements:{
                //     public_id: string;
                //     url: string;
                // }[] = forwardedAttachement.length !== 0 ? [{
                //     public_id: forwardedAttachement ,
                //     url: forwardedAttachement
                // }]:[];
                
                console.log("XXXXXXXXXXXXXXXX  (4)")
                const contentMessageForDB = content.length !== 0 ?
                    content.map((contentMapItem) => {                    
                        return {
                            content:contentMapItem,
                            attachements:[],
                            sender:(req as AuthenticatedUserRequestType).user._id,
                            chatID:chat?._id
                        }
                    }):[];
                
                const attachementMessageForDB = typeof forwardedAttachement === "object" ? 
                    forwardedAttachement.map((attachementMapItem) => {                    
                            const splitted_public_id = attachementMapItem.split("/");
                            const public_id = splitted_public_id[splitted_public_id.length - 1].split(".")[0];
                            console.log({public_id});
                            
                                return {
                                    content:"",
                                    attachements:[{
                                        public_id,
                                        url: attachementMapItem
                                    }],
                                    sender:(req as AuthenticatedUserRequestType).user._id,
                                    chatID:chat?._id
                                }
                            }):[];
                console.log("XXXXXXXXXXXXXXXX  (5)")
                



                const contentMessageForRealTime = content.length !== 0 ? 
                    content.map((contentMapItem) => (
                        {
                            content:contentMapItem,
                            attachements:[],
                            chatID:chat?._id,
                            sender:{
                                _id:(req as AuthenticatedUserRequestType).user._id,
                                name:(req as AuthenticatedUserRequestType).user.name
                            }
                        }
                    )):[];
                const attachmentMessageForRealTime = typeof forwardedAttachement === "object" ? 
                        forwardedAttachement.map((attachementMapItem) => (
                            {
                                content:"",
                                attachements:[{
                                    public_id: attachementMapItem,
                                    url: attachementMapItem
                                }],
                                chatID:chat?._id,
                                sender:{
                                    _id:(req as AuthenticatedUserRequestType).user._id,
                                    name:(req as AuthenticatedUserRequestType).user.name
                                }
                            })
                        ):[];



                
                console.log("XXXXXXXXXXXXXXXX  (6)")
                const userIDArray = chat?.members.map((member) => member);
                
                console.log("XXXXXXXXXXXXXXXX  (7)")
                const message = await Message.insertMany([...contentMessageForDB, ...attachementMessageForDB]);
                
                
                console.log("::::::::::::::::: 1");
                console.log({contentMessageForDB});
                console.log("----------------");
                console.log({attachementMessageForDB});
                console.log("----------------");
                console.log({message});
                console.log("::::::::::::::::: 2");
                
                
                
                // emitEvent(req, NEW_MESSAGE, userIDArray!, {
                //     message:messageForRealTime,
                //     chatID
                // });
                // emitEvent(req, NEW_MESSAGE_ALERT, userIDArray!, {chatID});
                console.log("XXXXXXXXXXXXXXXX  (8)")
            
            });
        }
        return res.status(200).json({
            success:true, message:"Message sent"
        });
        
    } catch (error) {
        console.log(error);
        next(error);
    }
    
};
export const getMessages = async(req:Request, res:Response, next:NextFunction) => {
    const {chatID} = req.params;
    // const page = req.query.page as string;
    const page = 1;
    console.log({page});
    
    const limit = 20;
    const skip = (Number(page) - 1) * limit;

    const [messages, totalMessagesCount] = await Promise.all([
        Message.find({chatID})
                                .sort({createdAt:-1})
                                .skip(skip)
                                .limit(limit)
                                .populate("sender", "name avatar")
                                .lean(),
        Message.countDocuments({chat:chatID})
    ]);

    const totalPages = Math.ceil(totalMessagesCount / limit) || 0;

    res.status(200).json({success:true, message:messages.reverse(), totalPages});
};
export const deleteMessages = async(req:Request, res:Response, next:NextFunction) => {
    try {
        const {messageID}:{messageID:mongoose.Schema.Types.ObjectId[]} = req.body;

        console.log({messageID});
        

        if (messageID.length === 0) return next(new ErrorHandler("Please select message to delete", 400));

        messageID.forEach(async(singleMessageID) => {
            await Message.findByIdAndDelete(singleMessageID);
        });

        res.status(200).json({success:true, message:"Messages deleted successfully"});
    } catch (error) {
        console.log(error);
        next(error);        
    }
};