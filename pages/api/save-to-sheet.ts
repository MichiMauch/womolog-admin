import { NextApiRequest, NextApiResponse } from 'next';
import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

const getClient = () => {
  const credentials = {
    type: process.env.GOOGLE_TYPE,
    project_id: process.env.GOOGLE_PROJECT_ID,
    private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    client_id: process.env.GOOGLE_CLIENT_ID,
    auth_uri: process.env.GOOGLE_AUTH_URI,
    token_uri: process.env.GOOGLE_TOKEN_URI,
    auth_provider_x509_cert_url: process.env.GOOGLE_AUTH_PROVIDER_X509_CERT_URL,
    client_x509_cert_url: process.env.GOOGLE_CLIENT_X509_CERT_URL,
  };

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: SCOPES,
  });
  return auth.getClient();
};

const saveToSheet = async (authClient: any, data: any) => {
  const sheets = google.sheets({ version: 'v4', auth: authClient });
  const spreadsheetId = '1UlG-etv8S6QhUd4w_1-TmIQdp4jF8Z-x3giPfb84k5M'; // Ersetzen Sie dies durch Ihre Spreadsheet-ID
  const range = 'test!A2'; // Ersetzen Sie dies durch Ihren Sheet-Namen und Bereich

  const values = data.map((item: any) => [
    item.name,
    item.town,
    item.dateTimeOriginal,
    item.endDate,
    item.fileNameWithoutExtension,
    item.latitude,
    item.longitude,
    item.country,
    item.countryCode,
    item.altitude,
  ]);

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values,
    },
  });
};

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const data = req.body;

  try {
    const authClient = await getClient();
    await saveToSheet(authClient, data);
    res.status(200).json({ message: 'Data saved to Google Sheet' });
  } catch (error) {
    console.error('Error saving data to Google Sheet:', error);
    res.status(500).json({ error: 'Error saving data to Google Sheet' });
  }
};

export default handler;
