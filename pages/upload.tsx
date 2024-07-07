'use client';

import { useState } from 'react';

interface Place {
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

interface ExifData {
  fileNameWithoutExtension: string;
  gps: {
    latitude: number;
    longitude: number;
    altitude?: number;
  };
  DateTimeOriginal: string;
}

interface NominatimData {
  name: string;
  town: string;
  country: string;
  countryCode: string;
}

interface WeatherData {
  main: {
    temp: number;
    humidity: number;
  };
  weather: {
    description: string;
  }[];
  wind: {
    speed: number;
  };
}

const UploadPage = () => {
  const [file, setFile] = useState<File | null>(null);
  const [exifData, setExifData] = useState<ExifData | null>(null);
  const [nominatimData, setNominatimData] = useState<NominatimData | null>(null);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [hikingRoutes, setHikingRoutes] = useState<Place[]>([]);
  const [bicycleRoutes, setBicycleRoutes] = useState<Place[]>([]);
  const [mtbRoutes, setMtbRoutes] = useState<Place[]>([]);
  const [attractions, setAttractions] = useState<Place[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [manualName, setManualName] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dateTimeOriginal, setDateTimeOriginal] = useState('');
  const [processingLog, setProcessingLog] = useState('');
  const [filePath, setFilePath] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setFile(event.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to upload file:', response.statusText, errorText);
        return;
      }

      const data = await response.json();
      const uploadedFilePath = data.file.filepath;
      setFilePath(uploadedFilePath); // Speichern des Dateipfads
      console.log('EXIF data received:', data.exifData);
      setExifData(data.exifData);

      if (data.exifData.DateTimeOriginal) {
        const formattedDate = formatDateForInput(data.exifData.DateTimeOriginal);
        setDateTimeOriginal(formattedDate);
      }

      if (data.exifData.gps.latitude && data.exifData.gps.longitude) {
        const nominatimResponse = await fetch(`/api/nominatim?latitude=${data.exifData.gps.latitude}&longitude=${data.exifData.gps.longitude}`);
        if (!nominatimResponse.ok) {
          const errorText = await nominatimResponse.text();
          console.error('Failed to fetch Nominatim data:', nominatimResponse.statusText, errorText);
          return;
        }

        const nominatimData = await nominatimResponse.json();
        console.log('Nominatim data received:', nominatimData);
        setNominatimData(nominatimData);

        const weatherResponse = await fetch(`/api/weather?latitude=${data.exifData.gps.latitude}&longitude=${data.exifData.gps.longitude}`);
        if (!weatherResponse.ok) {
          const errorText = await weatherResponse.text();
          console.error('Failed to fetch weather data:', weatherResponse.statusText, errorText);
          return;
        }

        const weatherData = await weatherResponse.json();
        console.log('Weather data received:', weatherData);
        setWeatherData(weatherData);

        const placesResponse = await fetch(`/api/places?latitude=${data.exifData.gps.latitude}&longitude=${data.exifData.gps.longitude}`);
        if (!placesResponse.ok) {
          const errorText = await placesResponse.text();
          console.error('Failed to fetch places data:', placesResponse.statusText, errorText);
          return;
        }

        const placesData: Place[] = await placesResponse.json();
        console.log('Places data received:', placesData);

        const hiking: Place[] = [];
        const bicycle: Place[] = [];
        const mtb: Place[] = [];
        const attraction: Place[] = [];

        placesData.forEach((place) => {
          if (!place.tags || !place.tags.name) return;

          if (place.tags.route === 'hiking') {
            hiking.push(place);
          } else if (place.tags.route === 'bicycle') {
            bicycle.push(place);
          } else if (place.tags.route === 'mtb') {
            mtb.push(place);
          } else if (place.tags.tourism === 'attraction') {
            attraction.push(place);
          }
        });

        setHikingRoutes(hiking);
        setBicycleRoutes(bicycle);
        setMtbRoutes(mtb);
        setAttractions(attraction);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
    }
  };

  const handleSaveToSheet = async () => {
    if (!exifData || !nominatimData) return;

    const saveData = {
      name: manualName || nominatimData.name || '',
      town: nominatimData.town || '',
      country: nominatimData.country || '',
      countryCode: nominatimData.countryCode || '',
      fileNameWithoutExtension: exifData?.fileNameWithoutExtension || '',
      dateTimeOriginal: dateTimeOriginal ? formatDate(dateTimeOriginal) : '',
      endDate: endDate ? formatDate(endDate) : '',
      latitude: exifData.gps.latitude || '',
      longitude: exifData.gps.longitude || '',
      altitude: exifData.gps.altitude || '',
    };

    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const response = await fetch('/api/save-to-sheet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([saveData]),
      });

      if (!response.ok) {
        console.error('Failed to save data to Google Sheet:', response.statusText);
        return;
      }

      setSaveSuccess(true);

      if (filePath) {
        await runImageProcessingScript(filePath); // Bildverarbeitung und Hochladen
      }
    } catch (error) {
      console.error('Error saving data to Google Sheet:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const runImageProcessingScript = async (filePath: string) => {
    try {
      const response = await fetch('/api/run-script', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filePath }),
      });

      const data: { output?: string, error?: string } = await response.json();

      if (response.ok) {
        setProcessingLog(data.output || 'Process completed successfully.');
      } else {
        setProcessingLog(`Error: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      setProcessingLog(`Error: ${(error as Error).message}`);
    }
  };

  const formatDateForInput = (dateString: string) => {
    const [day, month, year] = dateString.split('.');
    return `${year}-${month}-${day}`;
  };

  const formatDate = (dateString: string) => {
    const [year, month, day] = dateString.split('-');
    return `${day}.${month}.${year}`;
  };

  return (
    <div>
      <h1>Upload and Read EXIF Data</h1>
      <input type="file" onChange={handleFileChange} />
      <button onClick={handleUpload}>Upload and Read EXIF</button>

      {exifData && (
        <ul>
          <li><strong>Filename (without extension):</strong> {exifData.fileNameWithoutExtension}</li>
          <li>
            <label>
              <strong>DateTime Original:</strong>
              <input 
                type="date" 
                value={dateTimeOriginal} 
                onChange={(e) => setDateTimeOriginal(e.target.value)} 
              />
            </label>
          </li>
          <li>
            <label>
              <strong>Datum bis:</strong>
              <input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)} 
              />
            </label>
          </li>
          <li><strong>Latitude:</strong> {exifData.gps.latitude}</li>
          <li><strong>Longitude:</strong> {exifData.gps.longitude}</li>
          {exifData.gps.altitude !== undefined && (
            <li><strong>Altitude:</strong> {exifData.gps.altitude} meters</li>
          )}
        </ul>
      )}

      {nominatimData && (
        <div>
          <h2>Nominatim API Data</h2>
          <ul>
            <li><strong>Name:</strong> {nominatimData.name || (manualName ? manualName : 'Name not available')}</li>
            {nominatimData.name ? null : (
              <div>
                <input
                  type="text"
                  placeholder="Enter name"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                />
              </div>
            )}
            <li><strong>Town:</strong> {nominatimData.town}</li>
            <li><strong>Country:</strong> {nominatimData.country}</li>
            <li><strong>Country Code:</strong> {nominatimData.countryCode}</li>
          </ul>
        </div>
      )}

      {weatherData && (
        <div>
          <h2>Current Weather</h2>
          <ul>
            <li><strong>Temperature:</strong> {weatherData.main.temp} °C</li>
            <li><strong>Weather:</strong> {weatherData.weather[0].description}</li>
            <li><strong>Humidity:</strong> {weatherData.main.humidity} %</li>
            <li><strong>Wind Speed:</strong> {weatherData.wind.speed} m/s</li>
          </ul>
        </div>
      )}

      {hikingRoutes.length > 0 && (
        <div>
          <h2>Wanderungen</h2>
          <ul>
            {hikingRoutes.map((place, index) => (
              <li key={index}>
                <strong>{place.tags?.name}</strong>
                {place.tags?.description && ` - Description: ${place.tags.description}`}
                {place.tags?.symbol && ` - Symbol: ${place.tags.symbol}`}
              </li>
            ))}
          </ul>
        </div>
      )}

      {bicycleRoutes.length > 0 && (
        <div>
          <h2>Fahrradtour</h2>
          <ul>
            {bicycleRoutes.map((place, index) => (
              <li key={index}>
                <strong>{place.tags?.name}</strong>
                {place.tags?.description && ` - Description: ${place.tags.description}`}
                {place.tags?.symbol && ` - Symbol: ${place.tags.symbol}`}
              </li>
            ))}
          </ul>
        </div>
      )}

      {mtbRoutes.length > 0 && (
        <div>
          <h2>Mountainbiketour</h2>
          <ul>
            {mtbRoutes.map((place, index) => (
              <li key={index}>
                <strong>{place.tags?.name}</strong>
                {place.tags?.description && ` - Description: ${place.tags.description}`}
                {place.tags?.symbol && ` - Symbol: ${place.tags.symbol}`}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {attractions.length > 0 && (
        <div>
          <h2>Attraktionen</h2>
          <ul>
            {attractions.map((place, index) => (
              <li key={index}>
                <strong>{place.tags?.name}</strong>
                {place.tags?.description && ` - Description: ${place.tags.description}`}
                {place.tags?.symbol && ` - Symbol: ${place.tags.symbol}`}
              </li>
            ))}
          </ul>
        </div>
      )}

      {exifData && nominatimData && (
        <div>
          <button onClick={handleSaveToSheet} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save to Google Sheet'}
          </button>
          {saveSuccess && <p>Data saved successfully!</p>}
          <pre>{processingLog}</pre>
        </div>
      )}
    </div>
  );
};

export default UploadPage;