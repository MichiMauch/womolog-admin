import { NextApiRequest, NextApiResponse } from 'next';
import fetch from 'node-fetch';

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  tags?: {
    [key: string]: string;
  };
  nodes?: number[];
  members?: {
    type: string;
    ref: number;
    role: string;
  }[];
}

interface OverpassResponse {
  elements: OverpassElement[];
}

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const { latitude, longitude } = req.query;

  if (!latitude || !longitude) {
    res.status(400).json({ error: 'Latitude and longitude are required' });
    return;
  }

  const overpassQuery = `
    [out:json];
    (
      node["amenity"](around:3000,${latitude},${longitude});
      way["amenity"](around:3000,${latitude},${longitude});
      relation["amenity"](around:3000,${latitude},${longitude});
      node["bridge"](around:3000,${latitude},${longitude});
      way["bridge"](around:3000,${latitude},${longitude});
      relation["bridge"](around:3000,${latitude},${longitude});
      node["highway"](around:3000,${latitude},${longitude});
      way["highway"](around:3000,${latitude},${longitude});
      relation["highway"](around:3000,${latitude},${longitude});
      node["tourism"](around:3000,${latitude},${longitude});
      way["tourism"](around:3000,${latitude},${longitude});
      relation["tourism"](around:3000,${latitude},${longitude});
      node["natural"](around:3000,${latitude},${longitude});
      way["natural"](around:3000,${latitude},${longitude});
      relation["natural"](around:3000,${latitude},${longitude});
      node["route"](around:3000,${latitude},${longitude});
      way["route"](around:3000,${latitude},${longitude});
      relation["route"](around:3000,${latitude},${longitude});
    );
    out center;
  `;

  const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch data from Overpass API');
    }
    const data = (await response.json()) as unknown;

    // Check if the data is of type OverpassResponse
    if (!data || typeof data !== 'object' || !('elements' in data)) {
      throw new Error('Invalid data format from Overpass API');
    }

    res.status(200).json((data as OverpassResponse).elements);
  } catch (error) {
    console.error('Error fetching data from Overpass API:', error);
    res.status(500).json({ error: 'Error fetching data from Overpass API' });
  }
};

export default handler;
