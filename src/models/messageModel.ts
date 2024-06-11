import mongoose, { Document, Model } from "mongoose";

export interface MessageTypes extends Document{
    _id:string;
    sender:mongoose.Schema.Types.ObjectId;
    chatID:mongoose.Schema.Types.ObjectId;
    content?:string;
    attachements:{
        public_id?:string;
        url?:string;
    }[];
    createdAt:Date;
}
export interface MessageTypesPopulated extends Document{
    _id:string;
    sender:{
        userID:mongoose.Schema.Types.ObjectId;
        name:string;
    };
    chatID:mongoose.Schema.Types.ObjectId;
    content?:string;
    attachements:{
        public_id?:string;
        url?:string;
    }[];
    createdAt:Date;
}

const messageSchema = new mongoose.Schema<MessageTypes>({
    sender:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User"
    },
    chatID:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Chat"
    },
    content:String,
    attachements:[{
        public_id:String,
        url:String
    }]
},{
    timestamps:true
});

const messageModel:Model<MessageTypes> = mongoose.models.Message || mongoose.model<MessageTypes>("Message", messageSchema);

export default messageModel;