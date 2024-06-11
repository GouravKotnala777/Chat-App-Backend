import { NextFunction, Request, Response } from "express";
import User from "../models/userModel.js";
import ErrorHandler from "../utils/ErrorHandler.js";
import asyncHandler from "../utils/asyncHandler.js";
import bcryptJS from "bcryptjs";

export const createUserSeeder = asyncHandler(async(req:Request, res:Response, next:NextFunction) => {
    console.log("&&&&&&&&&&&&&&&&");
    
    const avatar = {
        public_id:"sdasdas",
        url:"sdasdas"
    };
    const seederInputs = [
        {name:"Naruto", userName:"naruto", password:await bcryptJS.hash("nn", 7), bio:"I am naruto", avatar, friends:[], groups:[]},
        {name:"Gourav", userName:"gourav", password:await bcryptJS.hash("gg", 7), bio:"I am gourav", avatar, friends:[], groups:[]},
        {name:"Sasuke", userName:"sasuke", password:await bcryptJS.hash("ss", 7), bio:"I am sasuke", avatar, friends:[], groups:[]},
        {name:"Kakashi", userName:"kakashi", password:await bcryptJS.hash("kk", 7), bio:"I am kakashi", avatar, friends:[], groups:[]}
    ];

    
    const fourUsers = await User.insertMany(seederInputs);

    // seederInputs.forEach((singleUser) => {
        
    //     const user = User.create({
    //         name, userName, password, bio, avatar
    //     });
    // })



    // if (!user) return next(new ErrorHandler("Internal Server Error", 500));

    // sendToken(res, user, 201, "Register Successfull");

    res.status(200).json({success:true, message:fourUsers})
});