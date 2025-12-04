import mongoose from 'mongoose';

export const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-chat');
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB Connection Issue');
  }
};
