import mongoose from 'mongoose';

const fileDownloadSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  mimetype: { type: String, required: true },
  data: { type: String, required: true }, // base64-encoded file buffer
  size: { type: Number },
  createdAt: { type: Date, default: Date.now, expires: 2592000 } // auto-delete after 30 days
});

export default mongoose.model('FileDownload', fileDownloadSchema);
