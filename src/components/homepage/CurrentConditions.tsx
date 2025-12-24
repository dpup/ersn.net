import { useState, useEffect, useCallback } from 'react';
import type { ReactElement } from 'react';
import {
  Zap,
  Eye,
  CloudRain,
  CloudSnow,
  Sun,
  Cloud,
  ChevronRight,
  AlertTriangle,
  OctagonX,
} from 'lucide-react';

interface RoadApiResponse {
  roads: {
    id: string;
    name: string;
    section: string;
    status: string;
    delayMinutes: number;
    chainControl: string;
    alerts: Array<{
      id: string;
      severity: string;
      title: string;
      description: string;
      classification?: string;
    }>;
  }[];
  lastUpdated: string;
}

interface WeatherApiResponse {
  weatherData: {
    locationId: string;
    locationName: string;
    weatherDescription: string;
    weatherIcon: string;
    temperatureCelsius: number;
    alerts: Array<{
      id?: string;
      severity?: string;
      title?: string;
      description?: string;
    }>;
  }[];
  lastUpdated: string;
}

interface RepeaterInfo {
  name: string;
  frequency: string;
  status: 'up' | 'down' | 'unknown';
}

interface Alert {
  id?: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  title: string;
  description?: string;
  type: 'road' | 'weather';
}

const repeaters: RepeaterInfo[] = [
  { name: 'Murphys', frequency: '462.725', status: 'down' },
  { name: 'Arnold Summit', frequency: '462.725', status: 'up' },
];

const getWeatherIcon = (iconCode: string): ReactElement => {
  const iconMap: Record<string, ReactElement> = {
    '01d': <Sun className="h-4 w-4 text-yellow-500" />,
    '01n': <Sun className="h-4 w-4 text-yellow-400" />,
    '02d': <Cloud className="h-4 w-4 text-gray-400" />,
    '02n': <Cloud className="h-4 w-4 text-gray-500" />,
    '03d': <Cloud className="h-4 w-4 text-gray-500" />,
    '03n': <Cloud className="h-4 w-4 text-gray-600" />,
    '04d': <Cloud className="h-4 w-4 text-gray-600" />,
    '04n': <Cloud className="h-4 w-4 text-gray-700" />,
    '09d': <CloudRain className="h-4 w-4 text-blue-500" />,
    '09n': <CloudRain className="h-4 w-4 text-blue-600" />,
    '10d': <CloudRain className="h-4 w-4 text-blue-500" />,
    '10n': <CloudRain className="h-4 w-4 text-blue-600" />,
    '11d': <Zap className="h-4 w-4 text-yellow-600" />,
    '11n': <Zap className="h-4 w-4 text-yellow-500" />,
    '13d': <CloudSnow className="h-4 w-4 text-blue-300" />,
    '13n': <CloudSnow className="h-4 w-4 text-blue-400" />,
    '50d': <Eye className="h-4 w-4 text-gray-400" />,
    '50n': <Eye className="h-4 w-4 text-gray-500" />,
  };
  return iconMap[iconCode] || <Cloud className="h-4 w-4 text-gray-500" />;
};

// Helper to collect and normalize alerts from API data
const collectAlerts = (
  roadData: RoadApiResponse | null,
  weatherData: WeatherApiResponse | null,
): Alert[] => {
  const alerts: Alert[] = [];

  // Collect road alerts
  roadData?.roads.forEach((road) => {
    road.alerts.forEach((alert) => {
      const severity = alert.severity?.toUpperCase();
      if (severity === 'CRITICAL' || severity === 'WARNING') {
        alerts.push({
          id: alert.id,
          severity: severity as 'CRITICAL' | 'WARNING',
          title: alert.title || alert.description,
          description: alert.description,
          type: 'road',
        });
      }
    });
  });

  // Collect weather alerts
  weatherData?.weatherData.forEach((location) => {
    location.alerts.forEach((alert) => {
      const severity = alert.severity?.toUpperCase();
      if (severity === 'CRITICAL' || severity === 'WARNING') {
        alerts.push({
          id: alert.id,
          severity: severity as 'CRITICAL' | 'WARNING',
          title: alert.title || alert.description || '',
          description: alert.description,
          type: 'weather',
        });
      }
    });
  });

  // Sort by severity (CRITICAL first)
  return alerts.sort((a, b) => {
    if (a.severity === 'CRITICAL' && b.severity !== 'CRITICAL') return -1;
    if (a.severity !== 'CRITICAL' && b.severity === 'CRITICAL') return 1;
    return 0;
  });
};

export default function CurrentConditions() {
  const [roadData, setRoadData] = useState<RoadApiResponse | null>(null);
  const [weatherData, setWeatherData] = useState<WeatherApiResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [roadsResponse, weatherResponse] = await Promise.all([
        fetch('https://info.ersn.net/api/v1/roads', {
          method: 'GET',
          mode: 'cors',
        }),
        fetch('https://info.ersn.net/api/v1/weather', {
          method: 'GET',
          mode: 'cors',
        }),
      ]);

      if (!roadsResponse.ok || !weatherResponse.ok) {
        throw new Error('Failed to fetch data');
      }

      const roads: RoadApiResponse = await roadsResponse.json();
      const weather: WeatherApiResponse = await weatherResponse.json();

      setRoadData(roads);
      setWeatherData(weather);
    } catch (err) {
      console.error('API Error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const getRoadStatusText = (road: any) => {
    if (road.status?.toLowerCase() === 'closed') return 'Closed';
    if (road.delayMinutes > 0) return `${road.delayMinutes}min delays`;
    if (road.chainControl && road.chainControl.toLowerCase() !== 'none') return 'Chain controls';
    return 'Clear';
  };

  const getRoadStatusColor = (road: any) => {
    if (road.status?.toLowerCase() === 'closed') return 'text-red-700';
    if (road.delayMinutes > 15) return 'text-red-700';
    if (road.delayMinutes > 0 || (road.chainControl && road.chainControl.toLowerCase() !== 'none'))
      return 'text-yellow-700';
    return 'text-green-700';
  };

  if (loading) {
    return (
      <div className="bg-white border border-stone-300 rounded-sm p-6 animate-pulse">
        <div className="flex items-center space-x-3 mb-4">
          <div className="h-6 w-6 bg-stone-200 rounded"></div>
          <div className="h-6 bg-stone-200 rounded w-40"></div>
          <div className="h-5 w-10 bg-stone-200 rounded"></div>
        </div>
        <div className="space-y-3">
          <div className="h-6 bg-stone-100 rounded"></div>
          <div className="h-6 bg-stone-100 rounded"></div>
          <div className="h-6 bg-stone-100 rounded"></div>
        </div>
      </div>
    );
  }

  const alerts = collectAlerts(roadData, weatherData);
  const hasCritical = alerts.some((a) => a.severity === 'CRITICAL');
  const hasAlerts = alerts.length > 0;

  return (
    <div className="bg-white border border-stone-300 rounded-sm p-6 flex flex-col">
      <div className="flex items-center space-x-3 mb-4">
        <Zap className="h-6 w-6 text-stone-700" />
        <h3 className="text-xl font-serif text-stone-800">Current Conditions</h3>
        <span className="text-xs text-stone-500 bg-stone-100 px-2 py-1 rounded">Live</span>
      </div>

      {/* Active Alerts Banner */}
      {hasAlerts && (
        <a
          href="/status"
          className={`mb-4 p-3 rounded-md flex items-center justify-between transition-colors ${
            hasCritical
              ? 'bg-red-50 border border-red-200 hover:bg-red-100'
              : 'bg-yellow-50 border border-yellow-200 hover:bg-yellow-100'
          }`}
        >
          <div className="flex items-center space-x-2">
            {hasCritical ? (
              <OctagonX className="h-4 w-4 text-red-600 flex-shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-yellow-600 flex-shrink-0" />
            )}
            <span
              className={`text-sm font-medium ${hasCritical ? 'text-red-800' : 'text-yellow-800'}`}
            >
              {alerts.length} active weather {alerts.length === 1 ? 'alert' : 'alerts'}
            </span>
          </div>
          <ChevronRight
            className={`h-4 w-4 flex-shrink-0 ${hasCritical ? 'text-red-600' : 'text-yellow-600'}`}
          />
        </a>
      )}

      <div className="flex-1 flex flex-col">
        <div className="space-y-4 text-sm flex-1">
          {/* Road Conditions */}
          <div>
            <h4 className="font-medium text-stone-700 mb-1">Road conditions</h4>
            <div className="space-y-1 ml-2">
              {(() => {
                if (!roadData?.roads) {
                  return (
                    <div className="flex justify-between items-center">
                      <span className="text-stone-600">Status:</span>
                      <span className="font-medium text-stone-500">No data</span>
                    </div>
                  );
                }

                const roadsWithIssues = roadData.roads.filter(
                  (road) =>
                    road.status?.toLowerCase() === 'closed' ||
                    road.delayMinutes > 0 ||
                    (road.chainControl && road.chainControl.toLowerCase() !== 'none'),
                );

                if (roadsWithIssues.length === 0) {
                  return (
                    <div className="flex justify-between items-center">
                      <span className="text-stone-600">All routes:</span>
                      <span className="font-medium text-green-700">Clear</span>
                    </div>
                  );
                }

                return roadsWithIssues.map((road) => {
                  const sectionParts = road.section.split(' to ');
                  const routeName = sectionParts.length > 1 ? road.section : road.name;
                  return (
                    <div key={road.id} className="flex justify-between items-center">
                      <span className="text-stone-600 truncate">{routeName}:</span>
                      <span className={`font-medium ${getRoadStatusColor(road)}`}>
                        {getRoadStatusText(road)}
                      </span>
                    </div>
                  );
                });
              })()}
            </div>
          </div>

          {/* Weather */}
          <div>
            <h4 className="font-medium text-stone-700 mb-1">Weather</h4>
            <div className="space-y-1 ml-2">
              {weatherData?.weatherData.map((location) => (
                <div key={location.locationId} className="flex justify-between items-center">
                  <span className="text-stone-600 truncate">{location.locationName}:</span>
                  <div className="flex items-center space-x-1 flex-shrink-0">
                    {getWeatherIcon(location.weatherIcon)}
                    <span className="font-medium text-stone-700">
                      {Math.round((location.temperatureCelsius * 9) / 5 + 32)}°F
                    </span>
                  </div>
                </div>
              )) || (
                <div className="flex justify-between items-center">
                  <span className="text-stone-600">Status:</span>
                  <span className="font-medium text-stone-500">No data</span>
                </div>
              )}
            </div>
          </div>

          {/* Repeaters */}
          <div>
            <h4 className="font-medium text-stone-700 mb-1">Repeaters</h4>
            <div className="space-y-1 ml-2">
              {repeaters.map((repeater) => (
                <div key={repeater.name} className="flex justify-between items-center">
                  <span className="text-stone-600">{repeater.name}:</span>
                  <span
                    className={`font-medium ${repeater.status === 'up' ? 'text-green-700' : 'text-red-700'}`}
                  >
                    {repeater.status === 'up' ? 'Up' : 'Down'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-stone-200">
          <a
            href="/status"
            className="flex items-center justify-center space-x-2 w-full py-1.5 px-3 bg-stone-100 hover:bg-stone-200 rounded-md transition-colors text-sm font-medium text-stone-700"
          >
            <span>View Full Status</span>
            <ChevronRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </div>
  );
}
