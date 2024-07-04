import { NextApiRequest, NextApiResponse } from 'next';
import formidable, { File as FormidableFile } from 'formidable';
import fs from 'fs';
import path from 'path';
import { ExifImage } from 'exif';
import { getFileNameWithoutExtension } from '../../utils/getFileNameWithoutExtension';

export const config = {
  api: {
    bodyParser: false,
  },
};

const convertDMSToDD = (degrees: number, minutes: number, seconds: number, direction: string) => {
  let dd = degrees + minutes / 60 + seconds / 3600;
  if (direction === "S" || direction === "W") {
    dd *= -1;
  }
  return dd;
};

const formatDate = (dateString: string) => {
  if (!dateString) return '';
  const [year, month, day] = dateString.split(' ')[0].split(':');
  return `${day}.${month}.${year}`;
};

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const uploadDir = path.resolve(process.cwd(), 'uploads');

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const form = formidable({
    multiples: false,
  });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error('Error parsing the file:', err);
      res.status(500).json({ error: 'Error parsing the file' });
      return;
    }

    const fileArray = files.file as FormidableFile[];
    const file = Array.isArray(fileArray) ? fileArray[0] : fileArray;

    if (!file) {
      console.error('No file found:', files);
      res.status(400).json({ error: 'No file found' });
      return;
    }

    const originalFileName = file.originalFilename || '';
    const fileNameWithoutExtension = getFileNameWithoutExtension(originalFileName);
    const newFilePath = path.join(uploadDir, originalFileName);

    try {
      // Verschieben der Datei zum endgültigen Speicherort
      await fs.promises.rename(file.filepath, newFilePath);
      console.log('File moved successfully:', newFilePath);
    } catch (moveError) {
      console.error('Error moving the file:', moveError);
      res.status(500).json({ error: 'Error moving the file' });
      return;
    }

    let data;
    try {
      data = fs.readFileSync(newFilePath);
      console.log('File read successfully');
    } catch (readError) {
      console.error('Error reading the file:', readError);
      res.status(500).json({ error: 'Error reading the file' });
      return;
    }

    try {
      new ExifImage({ image: data }, (error, exifData) => {
        if (error) {
          console.error('Error parsing EXIF data:', error);
          res.status(500).json({ error: 'Error parsing EXIF data' });
          return;
        }
        const { gps, exif } = exifData;
        if (!gps || !gps.GPSLatitude || !gps.GPSLongitude || !gps.GPSLatitudeRef || !gps.GPSLongitudeRef) {
          res.status(400).json({ error: 'No complete GPS data found' });
          return;
        }

        const latitude = convertDMSToDD(
          gps.GPSLatitude[0],
          gps.GPSLatitude[1],
          gps.GPSLatitude[2],
          gps.GPSLatitudeRef
        );
        const longitude = convertDMSToDD(
          gps.GPSLongitude[0],
          gps.GPSLongitude[1],
          gps.GPSLongitude[2],
          gps.GPSLongitudeRef
        );

        const result = {
          file: {
            filepath: newFilePath,
          },
          exifData: {
            fileNameWithoutExtension,
            gps: {
              latitude,
              longitude,
              altitude: gps.GPSAltitude,
            },
            DateTimeOriginal: exif.DateTimeOriginal ? formatDate(exif.DateTimeOriginal) : undefined,
          },
        };
        console.log('Filtered EXIF data:', result);
        res.status(200).json(result);
      });
    } catch (exifError) {
      console.error('Error reading EXIF data:', exifError);
      res.status(500).json({ error: 'Error reading EXIF data' });
    }
  });
};

export default handler;
