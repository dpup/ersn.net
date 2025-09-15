import { useState, useEffect, useCallback } from 'react';
import type { ReactElement } from 'react';
import {
  Sun,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudDrizzle,
  Zap,
  Eye,
  AlertTriangle,
  CheckCircle,
  Clock,
  MapPin
} from 'lucide-react';

// API Response Interfaces
interface RoadApiResponse {
  roads: {
    id: string;
    name: string;
    section: string;
    status: string;
    durationMinutes: number;
    distanceKm: number;
    congestionLevel: string;
    delayMinutes: number;
    chainControl: string;
    alerts: any[];
  }[];
  lastUpdated: string;
}

interface WeatherApiResponse {
  weatherData: {
    locationId: string;
    locationName: string;
    weatherMain: string;
    weatherDescription: string;
    weatherIcon: string;
    temperatureCelsius: number;
    feelsLikeCelsius: number;
    humidityPercent: number;
    windSpeedKmh: number;
    windDirectionDegrees: number;
    visibilityKm: number;
    alerts: any[];
  }[];
  lastUpdated: string;
}

interface AlertsApiResponse {
  alerts: any[];
  lastUpdated: string;
}

// Display Interfaces
interface RoadSegment {
  from: string;
  to: string;
  status: 'clear' | 'delays' | 'restrictions' | 'closed';
  delayMinutes?: number;
  description?: string;
}

interface WeatherLocation {
  name: string;
  temperature: number;
  condition: string;
  icon: string;
}

interface ApiData {
  roads: RoadSegment[];
  weather: WeatherLocation[];
  alerts: string[];
  lastUpdated: string;
}

const getWeatherIcon = (iconCode: string) => {
  // OpenWeatherMap icon codes mapping
  // Reference: https://openweathermap.org/weather-conditions
  const iconMap: Record<string, ReactElement> = {
    // Clear sky
    '01d': <Sun className="h-5 w-5 text-yellow-500" />,
    '01n': <Sun className="h-5 w-5 text-yellow-400" />,

    // Few clouds
    '02d': <Cloud className="h-5 w-5 text-gray-400" />,
    '02n': <Cloud className="h-5 w-5 text-gray-500" />,

    // Scattered clouds
    '03d': <Cloud className="h-5 w-5 text-gray-500" />,
    '03n': <Cloud className="h-5 w-5 text-gray-600" />,

    // Broken clouds
    '04d': <Cloud className="h-5 w-5 text-gray-600" />,
    '04n': <Cloud className="h-5 w-5 text-gray-700" />,

    // Shower rain
    '09d': <CloudDrizzle className="h-5 w-5 text-blue-500" />,
    '09n': <CloudDrizzle className="h-5 w-5 text-blue-600" />,

    // Rain
    '10d': <CloudRain className="h-5 w-5 text-blue-500" />,
    '10n': <CloudRain className="h-5 w-5 text-blue-600" />,

    // Thunderstorm
    '11d': <Zap className="h-5 w-5 text-yellow-600" />,
    '11n': <Zap className="h-5 w-5 text-yellow-500" />,

    // Snow
    '13d': <CloudSnow className="h-5 w-5 text-blue-300" />,
    '13n': <CloudSnow className="h-5 w-5 text-blue-400" />,

    // Mist/Fog
    '50d': <Eye className="h-5 w-5 text-gray-400" />,
    '50n': <Eye className="h-5 w-5 text-gray-500" />,
  };

  // Return the mapped icon or default to cloud
  return iconMap[iconCode] || <Cloud className="h-5 w-5 text-gray-500" />;
};

const getRoadStatusIcon = (status: string) => {
  switch (status) {
    case 'clear':
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    case 'delays':
      return <Clock className="h-5 w-5 text-yellow-600" />;
    case 'restrictions':
    case 'closed':
      return <AlertTriangle className="h-5 w-5 text-red-600" />;
    default:
      return <CheckCircle className="h-5 w-5 text-green-600" />;
  }
};

const getRoadStatusText = (segment: RoadSegment) => {
  switch (segment.status) {
    case 'clear':
      return 'Clear';
    case 'delays':
      return segment.delayMinutes ? `${segment.delayMinutes} min delays` : 'Delays';
    case 'restrictions':
      return 'Restrictions';
    case 'closed':
      return 'Closed';
    default:
      return 'Unknown';
  }
};

export default function RoadWeatherStatus() {
  const [data, setData] = useState<ApiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);

      const [roadsResponse, weatherResponse] = await Promise.all([
        fetch('https://info.ersn.net/api/v1/roads', {
          method: 'GET',
          mode: 'cors',
        }),
        fetch('https://info.ersn.net/api/v1/weather', {
          method: 'GET',
          mode: 'cors',
        })
      ]);

      if (!roadsResponse.ok || !weatherResponse.ok) {
        const errorDetails = {
          roads: `${roadsResponse.status} ${roadsResponse.statusText}`,
          weather: `${weatherResponse.status} ${weatherResponse.statusText}`,
        };
        throw new Error(`API Error: ${JSON.stringify(errorDetails)}`);
      }

      const roads: RoadApiResponse = await roadsResponse.json();
      const weather: WeatherApiResponse = await weatherResponse.json();

      console.log('Raw API data:');
      console.log('Roads response:', roads);
      console.log('Weather response:', weather);

      // Transform API data to our format
      const transformedData: ApiData = {
        roads: roads.roads.map(road => {
          // Parse the section to extract from/to (e.g., "Angels Camp to Murphys")
          const sectionParts = road.section.split(' to ');
          const from = sectionParts[0] || road.name;
          const to = sectionParts[1] || 'Destination';

          // Map status to our expected values
          let status: 'clear' | 'delays' | 'restrictions' | 'closed' = 'clear';
          if (road.status?.toLowerCase() === 'closed') {
            status = 'closed';
          } else if (road.delayMinutes > 0) {
            status = 'delays';
          } else if (road.chainControl && road.chainControl.toLowerCase() !== 'none') {
            status = 'restrictions';
          } else if (road.congestionLevel?.toLowerCase() === 'clear' && road.status?.toLowerCase() === 'open') {
            status = 'clear';
          }

          return {
            from,
            to,
            status,
            delayMinutes: road.delayMinutes,
            description: road.chainControl && road.chainControl.toLowerCase() !== 'none' ? `Chain control: ${road.chainControl}` : undefined
          };
        }),
        weather: weather.weatherData.map(w => ({
          name: w.locationName,
          temperature: Math.round(w.temperatureCelsius * 9/5 + 32), // Convert to Fahrenheit
          condition: w.weatherDescription,
          icon: w.weatherIcon
        })),
        alerts: weather.weatherData.flatMap(w =>
          w.alerts.map(alert => String(alert))
        ),
        lastUpdated: new Date().toLocaleTimeString()
      };


      console.log('Transformed data:', transformedData);
      setData(transformedData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load data';
      setError(errorMessage);
      console.error('Road/Weather API Error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Refresh every 5 minutes
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) {
    return (
      <div className="my-8">
        <div className="bg-white border border-stone-300 p-6 rounded-sm animate-pulse">
          <div className="h-6 bg-stone-200 rounded mb-4"></div>
          <div className="space-y-2">
            <div className="h-4 bg-stone-200 rounded w-3/4"></div>
            <div className="h-4 bg-stone-200 rounded w-1/2"></div>
            <div className="h-4 bg-stone-200 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="my-8">
        <div className="bg-stone-100 border border-stone-300 p-6 rounded-sm">
          <p className="text-stone-600 text-sm mb-2">
            Unable to load current conditions. Please check back later.
          </p>
          <button
            type="button"
            onClick={fetchData}
            className="text-stone-800 hover:text-red-700 text-sm underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  console.log('Rendering with data:', data);

  return (
    <div className="my-8">
      <div className="bg-white border border-stone-300 rounded-sm overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2">
          {/* Road Conditions */}
          <div className="p-6 border-b lg:border-b-0 lg:border-r border-stone-200">
            <div className="flex items-center space-x-3 mb-4">
              <MapPin className="h-6 w-6 text-stone-700" aria-hidden="true" />
              <h3 className="text-xl font-serif text-stone-800">Road Conditions</h3>
            </div>

            <div className="space-y-3">
              {data.roads.length === 0 ? (
                <p className="text-stone-600 text-sm italic">No road data available</p>
              ) : (
                data.roads.map((segment, index) => (
                <div key={index} className="flex items-center justify-between py-2">
                  <div className="flex items-center space-x-3">
                    {getRoadStatusIcon(segment.status)}
                    <div>
                      <div className="font-medium text-stone-800">
                        {segment.from} → {segment.to}
                      </div>
                      {segment.description && (
                        <div className="text-sm text-stone-600">{segment.description}</div>
                      )}
                    </div>
                  </div>
                  <div className="text-sm font-medium text-stone-700">
                    {getRoadStatusText(segment)}
                  </div>
                </div>
                ))
              )}
            </div>

            {/* Alerts Section */}
            <div className="mt-6 pt-4 border-t border-stone-200">
              <h4 className="font-medium text-stone-800 mb-3 flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-stone-600" />
                <span>Alerts</span>
              </h4>
              {data.alerts.length > 0 ? (
                <div className="space-y-2">
                  {data.alerts.map((alert, index) => (
                    <div key={index} className="text-sm text-stone-700 bg-yellow-50 border border-yellow-200 rounded p-2">
                      {alert}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-stone-600 italic">No active incidents</p>
              )}
            </div>
          </div>

          {/* Weather Status */}
          <div className="p-6">
            <div className="flex items-center space-x-3 mb-4">
              <Cloud className="h-6 w-6 text-stone-700" aria-hidden="true" />
              <h3 className="text-xl font-serif text-stone-800">Weather Status</h3>
            </div>

            <div className="space-y-3">
              {data.weather.length === 0 ? (
                <p className="text-stone-600 text-sm italic">No weather data available</p>
              ) : (
                data.weather.map((location, index) => (
                <div key={index} className="flex items-center justify-between py-2">
                  <div className="flex items-center space-x-3">
                    {getWeatherIcon(location.icon)}
                    <div className="font-medium text-stone-800">
                      {location.name}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-stone-800">
                      {location.temperature}°F
                    </div>
                    <div className="text-sm text-stone-600">
                      {location.condition}
                    </div>
                  </div>
                </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}