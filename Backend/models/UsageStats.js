import mongoose from 'mongoose';

const usageStatsSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  stats: {
    type: Map,
    of: {
      count: { type: Number, default: 0 },
      lastUsed: { type: Date, default: Date.now }
    },
    default: {}
  },
  totalMessages: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Static method to increment usage
usageStatsSchema.statics.trackUsage = async function(userId, modelId) {
  const update = {
    $inc: { totalMessages: 1, [`stats.${modelId}.count`]: 1 },
    $set: { [`stats.${modelId}.lastUsed`]: new Date(), updatedAt: new Date() }
  };
  return this.findOneAndUpdate({ userId }, update, { upsert: true, new: true });
};

export default mongoose.model('UsageStats', usageStatsSchema);
