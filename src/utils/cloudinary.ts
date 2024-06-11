import {v2 as cloudinary} from "cloudinary";
import {v4 as uuid} from "uuid";
import { getBase64 } from "../lib/helper.js";


export const uploadFilesOnCloudinary = async(files:Express.Multer.File[]) => {
    const uploadPromises:Promise<{public_id:string; secure_url:string;}>[] = files.map((file) => {
        return new Promise((resolve, reject) => {
            cloudinary.uploader.upload(getBase64(file), {
                resource_type:"auto",
                public_id:uuid()
            }, (error, result) => {
                if (error) return reject(error);
                resolve(result!);
            })
        })
    });

    try {
        const results:{public_id:string; secure_url:string;}[] = await Promise.all(uploadPromises);

        const formattedResults = results.map((result) => ({
            public_id:result.public_id,
            url:result.secure_url
        }));

        console.log("upload ho gai sayad");
        

        return formattedResults;
    } catch (error) {
        console.log(error);
        throw new Error("Error uploading files to cloudinary");
    }
};