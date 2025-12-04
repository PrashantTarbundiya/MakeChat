import mongoose from 'mongoose';

const userMemorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  memories: [{ type: String }],
  preferences: { type: Map, of: String },
  storeHistory: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model('UserMemory', userMemorySchema);
