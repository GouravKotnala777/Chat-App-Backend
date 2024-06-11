import { NextFunction, Request, Response } from "express";


const asyncHandler = (controller:(req:Request, res:Response, next:NextFunction) => Promise<void>) => async(req:Request, res:Response, next:NextFunction) => {
    try {
        await controller(req, res, next);
    } catch (error) {
        console.log(error);
        res.status(400).json({success:false, message:error});
    }
};

export default asyncHandler;