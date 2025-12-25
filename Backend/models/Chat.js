import mongoose from 'mongoose';

const chatSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, default: 'New Chat' },
  messages: [{
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
    mode: { type: String, default: 'normal' },
    thinking: { type: String },
    model: { type: String },
    filePublicId: { type: String },
    versions: [{ type: String }],
    currentVersion: { type: Number, default: 0 },
    timestamp: { type: Date, default: Date.now }
  }],
  uploadedFiles: [{
    publicId: String,
    url: String,
    type: String
  }],
  shareToken: { type: String, unique: true, sparse: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export default mongoose.model('Chat', chatSchema);
