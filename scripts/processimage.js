const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Laden der .env-Datei explizit aus dem Wurzelverzeichnis
const envPath = path.resolve(__dirname, '../.env');
const result = dotenv.config({ path: envPath });

// Debugging-Informationen
console.log('Env File Loaded:', result.parsed);

// Überprüfen der Umgebungsvariablen
console.log('Cloudflare Account ID:', process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID);
console.log('Cloudflare Bucket Name:', process.env.NEXT_PUBLIC_CLOUDFLARE_BUCKET_NAME);
console.log('Cloudflare Access Key ID:', process.env.CLOUDFLARE_ACCESS_KEY_ID);
console.log('Cloudflare Secret Access Key:', process.env.CLOUDFLARE_SECRET_ACCESS_KEY);

// Direkte Zuweisung der Zugangsdaten (zu Debug-Zwecken)
const accessKeyId = process.env.CLOUDFLARE_ACCESS_KEY_ID;
const secretAccessKey = process.env.CLOUDFLARE_SECRET_ACCESS_KEY;
const bucketName = process.env.NEXT_PUBLIC_CLOUDFLARE_BUCKET_NAME || 'womolog';

if (!accessKeyId || !secretAccessKey || !bucketName) {
  console.error('Fehlende Umgebungsvariablen: Stellen Sie sicher, dass die Zugangsdaten in der .env-Datei definiert sind.');
  process.exit(1);
}

// Cloudflare R2 Konfiguration
const s3Client = new S3Client({
  endpoint: `https://${process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  region: 'auto',
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

// Unterstützte Bildformate
const supportedFormats = ['.jpg', '.jpeg', '.png', '.tiff', '.gif', '.svg'];

const processAndUploadImage = async (inputFilePath) => {
  const ext = path.extname(inputFilePath).toLowerCase();
  if (!supportedFormats.includes(ext)) {
    throw new Error(`Unsupported image format: ${inputFilePath}`);
  }

  const fileName = path.basename(inputFilePath, ext);
  const outputFilePath = path.join(path.dirname(inputFilePath), `${fileName}.webp`);

  try {
    await sharp(inputFilePath)
      .resize({ width: 800, withoutEnlargement: true })
      .rotate() // Metadaten beibehalten und Ausrichtung automatisch korrigieren
      .webp({ quality: 80, effort: 4 }) // Niedrigere Qualität und mittlere Anstrengung für kleinere Dateigröße
      .toFile(outputFilePath);

    const fileContent = fs.readFileSync(outputFilePath);
    const params = {
      Bucket: bucketName,
      Key: `${fileName}.webp`,
      Body: fileContent,
      ContentType: 'image/webp',
    };

    const command = new PutObjectCommand(params);
    await s3Client.send(command);
    console.log(`Hochgeladen: ${fileName}.webp zu Cloudflare R2`);
    
    // Entfernen der temporären Datei
    fs.unlinkSync(outputFilePath);
  } catch (error) {
    throw new Error(`Fehler beim Verarbeiten und Hochladen von ${inputFilePath}: ${error.message}`);
  }
};

module.exports = processAndUploadImage;
