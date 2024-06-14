import mongoose, { Document, Model } from "mongoose";

export interface ChatTypes extends Document{
    _id:mongoose.Schema.Types.ObjectId|string;
    name:string;
    groupChat:boolean;
    creator?:mongoose.Schema.Types.ObjectId;
    members:mongoose.Schema.Types.ObjectId[];
    avatar:{
        public_id:string;
        url:string;
    }[];
    lastMessage:string;
}
export interface ChatTypesPopulated extends Document{
    _id:mongoose.Schema.Types.ObjectId|string;
    name:string;
    groupChat:boolean;
    creator?:{
        _id?:mongoose.Schema.Types.ObjectId;
        name?:string;
        userName?:string;
        avatar?:{
            public_id:string;
            url:string;
        };
    };
    members?:{
        _id?:mongoose.Schema.Types.ObjectId;
        name?:string;
        avatar?:{
            public_id:string;
            url:string;
        };
        userName?:string;
        bio?:string;
        createdAt?:Date;
    }[];
    avatar:{
        public_id:string;
        url:string;
    }[];
    lastMessage:string;
}




const chatSchema = new mongoose.Schema<ChatTypes>({
    name:String,
    groupChat:Boolean,
    creator:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User"
    },
    members:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User"
    }],
    avatar:{
        public_id:String,
        url:String
    },
    lastMessage:String
}, {
    timestamps:true
});

const chatModel:Model<ChatTypes> = mongoose.models.Chat || mongoose.model<ChatTypes>("Chat", chatSchema);

export default chatModel;