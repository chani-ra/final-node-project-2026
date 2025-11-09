import mongoose from "mongoose";
export const connectDB = async () => {
    const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/mydatabase";
    if(!MONGO_URI){
        console.error("MONGO_URI is not defined in environment variables");
        process.exit(1);
    }
    try {
        await mongoose.connect(MONGO_URI, {
            //שימוש באפשרויות לעדכון חיבור MongoDB מתקדם מונע אזהרות בקונסול 
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log(`MongoDB connected successfully to ${MONGO_URI}`);
    }       catch (error) {    
        console.error("MongoDB connection error:", error);
        process.exit(1);
    }
     };
