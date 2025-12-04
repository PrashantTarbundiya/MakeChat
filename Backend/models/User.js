import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String },
  name: { type: String, required: true },
  avatar: { type: String, default: 'https://res.cloudinary.com/durcxd0dn/image/upload/v1764685235/Gemini_Generated_Image_gbor5vgbor5vgbor_2_hxkfgg.png' },
  googleId: { type: String, unique: true, sparse: true },
  createdAt: { type: Date, default: Date.now }
});

userSchema.pre('save', async function() {
  if (!this.isModified('password') || !this.password) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.comparePassword = async function(password) {
  if (!this.password) return false;
  return await bcrypt.compare(password, this.password);
};

export default mongoose.model('User', userSchema);
