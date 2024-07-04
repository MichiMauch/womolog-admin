import processAndUploadImage from '../../scripts/processimage';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { filePath } = req.body;
  if (!filePath) {
    res.status(400).json({ error: 'File path not provided' });
    return;
  }

  try {
    await processAndUploadImage(filePath);
    res.status(200).json({ message: 'Image processed and uploaded successfully' });
  } catch (error) {
    console.error(`Error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
}
