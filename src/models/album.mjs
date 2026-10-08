import mongoose from 'mongoose';

const Schema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String
    },
    photos: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Photo'
    }],
    created_at: {
        type: Date,
        default: Date.now
    }
}, {
    collection: 'album',
    minimize: false,
    versionKey: false
});

export default Schema;