// import { Schema, model } from 'mongoose';


// const songSchema = new Schema({

//     theme: { type: String, required: true },
//     duration: { type: String, required: true },
//     level: { type: String, required: true },
//     targetAge: { type: String, required: true },
//     composer: { type: String, required: true },
//     lyricist: { type: String, required: true },
//     audioFileName: { type: String }, // הוספת שדה לשם הקובץ

//     audioFile: { type: String }


// })

// export default model('song', songSchema);

import { Schema, model } from 'mongoose';

const songSchema = new Schema({
    theme: { type: String, required: true },
    duration: { type: String, required: true },
    level: { type: String, required: true },
    targetAge: { type: String, required: true },
    composer: { type: String, required: true },
    lyricist: { type: String, required: true },
    audioFileName: { type: String }, // שם הקובץ בשרת
    createdAt: { type: Date, default: Date.now }
});

export default model('song', songSchema);
