const songSchema = new Schema({

    songCode: { type: String, required: true },
    theme: { type: String, required: true },
    duration: { type: String, required: true },
    level: { type: String, required: true },
    targetAge: { type: String, required: true },
    composer: { type: String, required: true },
    lyricist: { type: String, required: true }

})

export default model('song', songSchema);
