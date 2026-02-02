

import mongoose from "mongoose";

export const connectDB = async () => {
    const MONGO_URI = "mongodb://localhost:27017/learning";

    try {
        await mongoose.connect(MONGO_URI);
        console.log(`mongodb connected successfully to ${MONGO_URI}`);

    } catch (error) {
        console.error(error.message);
        process.exit(1); 
    }
};
