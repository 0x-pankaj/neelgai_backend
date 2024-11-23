import mongoose from 'mongoose';
import { DB_NAME } from '../constant.js';



const connectDB = async () => {
    try {
        console.log("DB: ", DB_NAME)
        const connectionInstance =  await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        console.log(` \n MongoDb connected !! DB HOST ${connectionInstance.connection.host}`);
    } catch (error) {
        console.log("MONGO_DB connecton ERROR: ", error);
        process.exit(1)
    }
}

export default connectDB