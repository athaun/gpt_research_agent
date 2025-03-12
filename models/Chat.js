import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const MessageSchema = new Schema({
    role: {
        type: String,
        enum: ['system', 'user', 'assistant'],
        required: true
    },
    content: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

const ChatSchema = new Schema({
    title: {
        type: String,
        default: 'New Chat'
    },
    model: {
        type: String,
        required: true,
        default: 'llama3.1'
    },
    messages: [MessageSchema],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

export default model('Chat', ChatSchema);