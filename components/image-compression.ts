import imageCompression from 'browser-image-compression';

const compressImage = async (file: File): Promise<File> => {
  const options = {
    maxSizeMB: 3,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
  };
  try {
    const compressedFile = await imageCompression(file, options);
    return compressedFile;
  } catch (error) {
    console.error('Error compressing image:', error);
    return file;
  }
};

export default compressImage;
