import { CookieOptions, Response } from "express";
import jwt from "jsonwebtoken";

const cookieOptions:CookieOptions = {maxAge:1000*60*60*24*4, httpOnly:true, secure:true, sameSite:"none"};

export const sendToken = async(res:Response, user:any, code:number, message:any) => {
    try {
        const token = await jwt.sign({_id:user._id}, process.env.TOKEN_SECRET as string, {expiresIn:process.env.TOKEN_EXPIRY});     

        return res.status(code).cookie("token", token, cookieOptions).json({success:true, message:message})
    } catch (error) {
        return res.status(401).json({success:false, message:error});
    }
};