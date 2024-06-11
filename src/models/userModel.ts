import mongoose, { Document, Model } from "mongoose";
import bcryptJS from "bcryptjs";

export interface UserTypes extends Document{
    _id:mongoose.Schema.Types.ObjectId;
    name:string;
    userName:string;
    password:string;
    bio:string;
    avatar:{
        public_id:string;
        url:string;
    };
    friends:mongoose.Schema.Types.ObjectId[];
    groups:mongoose.Schema.Types.ObjectId[];
    comparePassword:(password:string) => Promise<boolean>
}
export interface UserTypesPopulated extends Document{
    _id:mongoose.Schema.Types.ObjectId;
    name:string;
    userName:string;
    password:string;
    bio:string;
    avatar:{
        public_id:string;
        url:string;
    };
    friends:{
        _id?:mongoose.Schema.Types.ObjectId;
        name?:string;
        userName?:string;
        avatar?:{
            public_id?:string;
            url?:string;
        };
    }[];
    groups?:{
        _id?:mongoose.Schema.Types.ObjectId|string;
        name?:string;
        groupChat?:boolean;
        avatar?:{
            public_id?:string;
            url?:string;
        }[];
    }[];
    comparePassword:(password:string) => Promise<boolean>
}

const userSchema = new mongoose.Schema<UserTypes>({
    name:{
        type:String,
        required:true
    },
    userName:{
        type:String,
        required:true,
        unique:true
    },
    password:{
        type:String,
        required:true,
        select:false
    },
    bio:String,
    avatar:{
        public_id:String,
        url:String
    },
    friends:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User"
    }],
    groups:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Chat"
    }]
}, {
    timestamps:true
});

userSchema.pre<UserTypes>("save", async function(next){
    if (!this.isModified("password")) return next();
    this.password = await bcryptJS.hash(this.password, 7);
    return this.password;
});

userSchema.methods.comparePassword = async function(password:string):Promise<boolean>{
    return await bcryptJS.compare(password, this.password)
};

const userModel:Model<UserTypes> = mongoose.models.User || mongoose.model<UserTypes>("User", userSchema);



export default userModel;