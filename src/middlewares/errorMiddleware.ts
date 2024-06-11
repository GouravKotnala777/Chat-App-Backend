import { NextFunction, Request, Response } from "express";
import ErrorHandler from "../utils/ErrorHandler.js";


const errorMiddleware = (err:ErrorHandler, req:Request, res:Response, next:NextFunction) => {
    err.message ||= "Internal Server Error...";
    err.statusCode ||= 500;

    // isse fix karna hai validation galat hai
    if (err.statusCode === 11000) {
        err.message = "Duplicate field hai";
        err.statusCode = 400;
    }
    if (err.name === "CastError") {
        
    }
    //-----------------------






    return res.status(err.statusCode).json({success:false, message:err.message});
};

export default errorMiddleware;