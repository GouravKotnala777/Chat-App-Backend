import mongoose, { Model, Models } from "mongoose";


export interface NotificationTypes {
    _id:string;
    status:"pending"|"accepted"|"rejected";
    sender:{
        _id:mongoose.Schema.Types.ObjectId;
        avatar:{public_id:string; url:string;};
        name:string;
    },
    receiver:{
        _id:mongoose.Schema.Types.ObjectId;
        name:string;
    }
    // receiver:mongoose.Schema.Types.ObjectId;
}

const notificationSchema = new mongoose.Schema<NotificationTypes>({
    status:{
        type:String,
        enum:["pending", "accepted", "rejected"]
    },
    sender:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User"
    },
    receiver:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User"
    }
}, {
    timestamps:true
});

const notificationModel:Model<NotificationTypes> = mongoose.models.Notification || mongoose.model<NotificationTypes>("Notification", notificationSchema);

export default notificationModel;