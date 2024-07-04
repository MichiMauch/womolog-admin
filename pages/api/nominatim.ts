import { NextApiRequest, NextApiResponse } from 'next';
import fetch from 'node-fetch';

interface NominatimAddress {
  town?: string;
  city?: string;
  village?: string;
  country: string;
  country_code: string;
}

interface NominatimResponse {
  name?: string;
  address: NominatimAddress;
}

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const { latitude, longitude } = req.query;

  if (!latitude || !longitude) {
    res.status(400).json({ error: 'Latitude and longitude are required' });
    return;
  }

  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch data from Nominatim');
    }
    const data = await response.json() as NominatimResponse;
    const { name, address } = data;
    const result = {
      name: name || '',
      town: address.town || address.city || address.village || '',
      country: address.country.split('/')[0],  // Nur den ersten Teil des Ländernamens verwenden
      countryCode: address.country_code
    };
    res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching data from Nominatim:', error);
    res.status(500).json({ error: 'Error fetching data from Nominatim' });
  }
};

export default handler;