export const getFileNameWithoutExtension = (filename: string): string => {
    return filename.substring(0, filename.lastIndexOf('.')) || filename;
  };
  