import { Schema } from "mongoose";


const examSchema = new Schema({
 title: { type: String, required: true },
    description: { type: String },
    questions: [questionSchema],
    createdAt: { type: Date, default: Date.now },
    duration: { type: Number, required: true } // משך המבחן בדקות

})
export default('exam', examSchema);