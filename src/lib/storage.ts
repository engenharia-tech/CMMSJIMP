import { supabase } from '../supabase';
import imageCompression from 'browser-image-compression';

export async function uploadEquipmentPhoto(file: File): Promise<string> {
  try {
    // 1. Compress the image to keep it "light"
    const options = {
      maxSizeMB: 0.5, // Max 500KB
      maxWidthOrHeight: 1024,
      useWebWorker: true,
    };
    
    const compressedFile = await imageCompression(file, options);
    
    // 2. Generate a unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
    const filePath = `equipment/${fileName}`;

    // 3. Upload to Supabase Storage
    // Note: The bucket 'equipment-photos' must be created in Supabase console with public access
    const { error: uploadError } = await supabase.storage
      .from('equipment-photos')
      .upload(filePath, compressedFile);

    if (uploadError) {
      throw uploadError;
    }

    // 4. Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from('equipment-photos')
      .getPublicUrl(filePath);

    return publicUrl;
  } catch (error) {
    console.error('Error uploading photo:', error);
    throw error;
  }
}
