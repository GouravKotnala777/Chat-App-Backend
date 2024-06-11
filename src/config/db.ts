import mongoose from "mongoose";

const connectDatabase = (uri:string) => {
    mongoose.connect(uri, {
        dbName:"ChatApp"
    })
    .then(() => {
        console.log("connected...");
    })
    .catch((error) => {
        console.log(error);
    })
};

export default connectDatabase;