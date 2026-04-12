import cloudinary from '../config/cloudinary.js';
import { Readable } from 'stream';

export const uploadToCloudinary = async (buffer, folder = 'chat-uploads', resourceType = 'auto', publicId = undefined) => {
  return new Promise((resolve, reject) => {
    const options = { folder, resource_type: resourceType, access_mode: 'public' };
    if (publicId) options.public_id = publicId;
    
    const uploadStream = cloudinary.uploader.upload_stream(
      options,
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    Readable.from(buffer).pipe(uploadStream);
  });
};

export const deleteFromCloudinary = async (publicId, resourceType = 'image') => {
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (error) {
    console.error('Failed to delete from Cloudinary:', error);
  }
};
