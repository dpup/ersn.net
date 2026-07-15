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
  MapPin,
  CircleAlert,
  OctagonX,
} from 'lucide-react';
import WeatherDetailsDialog from './WeatherDetailsDialog';
import AlertDetailsDialog from './AlertDetailsDialog';
import { type Alert, type WeatherLocation, formatHumanTime, formatEnumValue } from './types';

// API Response Interfaces — S.I.E.R.R.A. Grid /api/v1 (camelCase fields).
// Weather is served by /conditions; road incidents and weather alerts are both
// events on the unified event feed (/events?layer=…).
interface WeatherConditionsApi {
  locationId?: string;
  locationName?: string;
  weatherMain?: string;
  weatherDescription?: string;
  weatherIcon?: string;
  temperatureCelsius?: number;
  feelsLikeCelsius?: number;
  humidityPercent?: number;
  windSpeedKmh?: number;
  windDirectionDegrees?: number;
  visibilityKm?: number;
}

interface FireWeatherConditions {
  state?: string; // normal | elevated | red-flag
  headline?: string;
  zones?: string[];
}

interface ConditionsResponse {
  weather?: WeatherConditionsApi[];
  fireWeather?: FireWeatherConditions;
  lastUpdated?: string;
}

// The common event envelope carries everything a card needs; the typed detail
// blocks (roadIncident / weatherAlert) add the kind-specific fields.
interface GridEvent {
  id?: string;
  layer?: string;
  category?: string;
  severity?: string;
  status?: string;
  headline?: string;
  summary?: string;
  description?: string;
  areaLabel?: string;
  canonicalUrl?: string;
  effective?: string;
  expires?: string;
  observedAt?: string;
  roadIncident?: {
    logNumber?: string;
    impact?: string;
    duration?: string;
    metadata?: Record<string, string>;
  };
  weatherAlert?: {
    nwsSeverity?: string;
    certainty?: string;
    urgency?: string;
    instruction?: string;
    areaDesc?: string;
    zones?: string[];
  };
}

interface GridEventList {
  events?: GridEvent[];
  nextPageToken?: string;
}

interface ApiData {
  roadIncidents: Alert[];
  weather: WeatherLocation[];
  alerts: Alert[];
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

const getIncidentIcon = (alert: Alert) => {
  const category = (alert.incidentType || '').toLowerCase();
  const isClosure = category.includes('closure') || category.includes('closed');

  if (alert.severity === 'CRITICAL' || isClosure) {
    return <OctagonX className="h-5 w-5 text-red-600" />;
  }
  if (alert.severity === 'WARNING') {
    return <CircleAlert className="h-5 w-5 text-yellow-600" />;
  }
  return <AlertTriangle className="h-5 w-5 text-blue-600" />;
};

// S.I.E.R.R.A. Grid data feeds.
const GRID_API_BASE = 'https://data.sierragridteam.org/api/v1';
const GRID_AREA = 'ebbetts-pass';

// Map the Grid's unified 5-level severity scale (EXTREME/SEVERE/MODERATE/MINOR/INFO)
// down to the widget's 3-level display scale.
const mapGridSeverity = (severity: string | undefined): Alert['severity'] => {
  switch ((severity || '').toUpperCase()) {
    case 'EXTREME':
    case 'SEVERE':
    case 'CRITICAL':
      return 'CRITICAL';
    case 'MODERATE':
    case 'WARNING':
      return 'WARNING';
    default:
      return 'INFO';
  }
};

// A road_incident Grid event → display Alert. The incident type is the envelope
// `category`, the location is `areaLabel`, and the kind-specific extras live in
// the roadIncident detail block.
const transformRoadIncident = (event: GridEvent): Alert => {
  const road = event.roadIncident;
  return {
    id: event.id,
    type: 'road',
    severity: mapGridSeverity(event.severity),
    title: event.headline || event.areaLabel || 'Road Incident',
    description: event.summary || event.description || event.headline || 'No description available',
    // The verbatim upstream log is the detail view.
    details: event.description,
    condensedSummary: event.summary || event.headline,
    location: event.areaLabel,
    locationDescription: event.areaLabel,
    incidentType: event.category || road?.metadata?.incident_type,
    impact: road?.impact,
    startTime: event.effective || event.observedAt,
    expectedEnd: event.expires,
    metadata: road?.metadata,
  };
};

// A weather_alert Grid event → display Alert. `category` is the NWS event type
// (e.g. "Extreme Heat Warning"); the weatherAlert block carries the NWS specifics.
const transformWeatherEvent = (event: GridEvent): Alert => {
  const wx = event.weatherAlert;
  return {
    id: event.id,
    type: 'weather',
    severity: mapGridSeverity(event.severity),
    title: event.category || event.headline || 'Weather Alert',
    description: event.summary || event.description || event.headline || 'No description available',
    headline: event.headline,
    summary: event.summary,
    // The verbatim upstream text (WHAT/WHERE/WHEN sections) is the detail view.
    details: event.description,
    condensedSummary: event.headline,
    location: event.areaLabel || wx?.areaDesc,
    locationDescription: wx?.areaDesc || event.areaLabel,
    startTime: event.effective,
    expectedEnd: event.expires,
    metadata: wx as Record<string, unknown> | undefined,
  };
};

// Elevated / red-flag fire-weather now rides on the conditions payload rather
// than a separate feed. Surface it as an alert only when it's not normal.
const transformFireWeather = (fw: FireWeatherConditions | undefined): Alert | null => {
  const state = (fw?.state || '').toLowerCase();
  if (!state || state === 'normal') return null;

  const isRedFlag = state === 'red-flag';
  return {
    id: 'fire-weather',
    type: 'weather',
    severity: isRedFlag ? 'CRITICAL' : 'WARNING',
    title: isRedFlag ? 'Red Flag Warning' : 'Elevated Fire Weather',
    description:
      fw?.headline ||
      (isRedFlag
        ? 'Critical fire-weather conditions are in effect.'
        : 'Fire-weather conditions are elevated.'),
    condensedSummary: fw?.headline,
    location: fw?.zones && fw.zones.length > 0 ? fw.zones.join(', ') : undefined,
  };
};

export default function RoadWeatherStatus() {
  const [data, setData] = useState<ApiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWeather, setSelectedWeather] = useState<WeatherLocation | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);

      const [conditionsResponse, roadIncidentsResponse, weatherAlertsResponse] = await Promise.all([
        fetch(`${GRID_API_BASE}/conditions?place=${GRID_AREA}`, {
          method: 'GET',
          mode: 'cors',
        }),
        fetch(`${GRID_API_BASE}/events?place=${GRID_AREA}&layer=road_incident`, {
          method: 'GET',
          mode: 'cors',
        }),
        fetch(`${GRID_API_BASE}/events?place=${GRID_AREA}&layer=weather_alert`, {
          method: 'GET',
          mode: 'cors',
        }),
      ]);

      if (!conditionsResponse.ok || !roadIncidentsResponse.ok || !weatherAlertsResponse.ok) {
        const errorDetails = {
          conditions: `${conditionsResponse.status} ${conditionsResponse.statusText}`,
          roadIncidents: `${roadIncidentsResponse.status} ${roadIncidentsResponse.statusText}`,
          weatherAlerts: `${weatherAlertsResponse.status} ${weatherAlertsResponse.statusText}`,
        };
        throw new Error(`API Error: ${JSON.stringify(errorDetails)}`);
      }

      const conditions: ConditionsResponse = await conditionsResponse.json();
      const roadIncidentEvents: GridEventList = await roadIncidentsResponse.json();
      const weatherAlertEvents: GridEventList = await weatherAlertsResponse.json();

      // Collect all alerts across sources for the aggregated "Active Alerts" list.
      const allAlerts: Alert[] = [];

      // Fire-weather advisory (from conditions) leads the list when active.
      const fireWeatherAlert = transformFireWeather(conditions.fireWeather);
      if (fireWeatherAlert) allAlerts.push(fireWeatherAlert);

      // Road incidents are events on the road_incident layer.
      const roadIncidents: Alert[] = (roadIncidentEvents.events || []).map(transformRoadIncident);
      allAlerts.push(...roadIncidents);

      // Weather alerts are area-wide events; one alert can cover several zones, so
      // dedupe by title. The deduped set is shown against every weather location.
      const seenWeatherTitles = new Set<string>();
      const weatherAlerts: Alert[] = (weatherAlertEvents.events || [])
        .map(transformWeatherEvent)
        .filter((alert) => {
          if (seenWeatherTitles.has(alert.title)) return false;
          seenWeatherTitles.add(alert.title);
          return true;
        });
      allAlerts.push(...weatherAlerts);

      const transformedData: ApiData = {
        roadIncidents,
        weather: (conditions.weather || []).map((w) => ({
          name: w.locationName || w.locationId || 'Unknown',
          temperature: Math.round(((w.temperatureCelsius ?? 0) * 9) / 5 + 32), // Convert to Fahrenheit
          condition: w.weatherDescription || w.weatherMain || '',
          icon: w.weatherIcon || '',
          // Extended weather data
          locationId: w.locationId,
          temperatureCelsius: w.temperatureCelsius,
          feelsLikeCelsius: w.feelsLikeCelsius,
          humidityPercent: w.humidityPercent,
          windSpeedKmh: w.windSpeedKmh,
          windDirectionDegrees: w.windDirectionDegrees,
          visibilityKm: w.visibilityKm,
          weatherMain: w.weatherMain,
          // Weather alerts are area-wide on the Grid — surface them on each location.
          alerts: weatherAlerts,
        })),
        alerts: allAlerts
          // Deduplicate by title (same alert may cover multiple locations)
          .filter((alert, index, self) => index === self.findIndex((a) => a.title === alert.title))
          .sort((a, b) => {
            // Sort by severity: CRITICAL > WARNING > INFO > ALERT_SEVERITY_UNSPECIFIED
            const severityOrder = {
              CRITICAL: 0,
              WARNING: 1,
              INFO: 2,
              ALERT_SEVERITY_UNSPECIFIED: 3,
            };
            return severityOrder[a.severity] - severityOrder[b.severity];
          }),
        lastUpdated: conditions.lastUpdated || new Date().toISOString(),
      };

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
    // Refresh every 15 minutes
    const interval = setInterval(fetchData, 15 * 60 * 1000);
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

  // Show all alerts - trust the API to send only relevant ones
  const allAlerts = data.alerts;

  return (
    <div className="my-8">
      {/* Active Alerts Section - Displayed prominently at top */}
      {allAlerts.length > 0 && (
        <div className="mb-6 bg-white border border-stone-300 rounded-sm overflow-hidden">
          <div className="p-4 sm:p-6">
            <div className="flex items-center space-x-3 mb-4">
              <AlertTriangle className="h-5 w-5 text-amber-600" aria-hidden="true" />
              <h3 className="text-lg sm:text-xl font-serif text-stone-800">Active Alerts</h3>
              <span className="text-xs text-stone-500 bg-stone-100 px-2 py-1 rounded">
                {allAlerts.length}
              </span>
            </div>

            <div className="space-y-3">
              {allAlerts.map((alert, index) => {
                const isCritical = alert.severity === 'CRITICAL';
                const isWarning = alert.severity === 'WARNING';
                const bgColor = isCritical
                  ? 'bg-red-50 border-red-200'
                  : isWarning
                    ? 'bg-yellow-50 border-yellow-200'
                    : 'bg-blue-50 border-blue-200';
                const textColor = isCritical
                  ? 'text-red-800'
                  : isWarning
                    ? 'text-yellow-800'
                    : 'text-blue-800';
                const summaryColor = isCritical
                  ? 'text-red-700'
                  : isWarning
                    ? 'text-yellow-700'
                    : 'text-blue-700';
                const iconColor = isCritical
                  ? 'text-red-600'
                  : isWarning
                    ? 'text-yellow-600'
                    : 'text-blue-600';

                return (
                  <button
                    type="button"
                    key={alert.id || `alert-${index}`}
                    onClick={() => setSelectedAlert(alert)}
                    className={`w-full text-left p-3 rounded-md border ${bgColor} hover:opacity-90 transition-opacity cursor-pointer`}
                  >
                    <div className="flex items-start space-x-2">
                      {isCritical ? (
                        <OctagonX className={`h-4 w-4 ${iconColor} mt-0.5 flex-shrink-0`} />
                      ) : (
                        <AlertTriangle className={`h-4 w-4 ${iconColor} mt-0.5 flex-shrink-0`} />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className={`font-medium ${textColor} text-sm`}>{alert.title}</div>
                        {alert.condensedSummary && alert.condensedSummary !== alert.title && (
                          <div className={`${summaryColor} text-xs mt-1 line-clamp-2`}>
                            {alert.condensedSummary}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border border-stone-300 rounded-sm overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
          {/* Road Conditions */}
          <div className="p-4 sm:p-6 border-b lg:border-b-0 lg:border-r border-stone-200">
            <div className="flex items-center space-x-3 mb-4">
              <MapPin className="h-5 w-5 text-stone-700" aria-hidden="true" />
              <h3 className="text-lg sm:text-xl font-serif text-stone-800">Road Conditions</h3>
            </div>

            <div className="space-y-1">
              {data.roadIncidents.length === 0 ? (
                <div className="flex items-center space-x-2 py-3 px-2">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span className="text-sm text-stone-600">No active road incidents reported.</span>
                </div>
              ) : (
                data.roadIncidents.map((incident, index) => {
                  const categoryLabel = formatEnumValue(incident.incidentType);
                  const title = incident.location || incident.title;
                  const showHeadline = incident.title && incident.title !== title;

                  return (
                    <div
                      key={incident.id || `incident-${index}`}
                      className="border-b border-stone-100 last:border-b-0"
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedAlert(incident)}
                        className="w-full cursor-pointer flex items-center justify-between py-3 px-2 hover:bg-stone-50 transition-colors rounded-sm touch-manipulation"
                      >
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          {getIncidentIcon(incident)}
                          <div className="text-left flex-1 min-w-0">
                            <div className="font-medium text-stone-800 truncate">{title}</div>
                            {showHeadline && (
                              <div className="text-xs text-stone-500 truncate">
                                {incident.title}
                              </div>
                            )}
                          </div>
                        </div>
                        {categoryLabel && (
                          <div className="text-sm text-stone-600 flex-shrink-0 ml-2 capitalize">
                            {categoryLabel}
                          </div>
                        )}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Weather Status */}
          <div className="p-4 sm:p-6">
            <div className="flex items-center space-x-3 mb-4">
              <Cloud className="h-5 w-5 text-stone-700" aria-hidden="true" />
              <h3 className="text-lg sm:text-xl font-serif text-stone-800">Weather Status</h3>
            </div>

            <div className="space-y-1">
              {data.weather.length === 0 ? (
                <p className="text-stone-600 text-sm italic">No weather data available</p>
              ) : (
                data.weather.map((location) => (
                  <div key={location.name} className="border-b border-stone-100 last:border-b-0">
                    <button
                      type="button"
                      onClick={() => setSelectedWeather(location)}
                      className="w-full cursor-pointer flex items-center justify-between py-3 px-2 hover:bg-stone-50 transition-colors rounded-sm touch-manipulation"
                    >
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        {getWeatherIcon(location.icon)}
                        <div className="font-medium text-stone-800 truncate">{location.name}</div>
                      </div>
                      <div className="text-sm flex-shrink-0 ml-2">
                        <span className="text-stone-500 capitalize">{location.condition}</span> •{' '}
                        <span className="font-medium text-stone-700">{location.temperature}°F</span>
                      </div>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        <div className="m-4 p-3 bg-stone-50 rounded border border-stone-200">
          <p className="text-xs text-stone-600 text-center">
            <strong>Source:</strong> Caltrans / CHP • OpenWeather • NWS
            <br />
            <strong>Last Updated:</strong> {formatHumanTime(data.lastUpdated)} •{' '}
            <strong>Update Frequency:</strong> Every 15 minutes
          </p>
          <p className="mt-2 text-center text-[11px] text-stone-400">
            Powered by{' '}
            <a
              href="https://data.sierragridteam.org"
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-dotted underline-offset-2 hover:text-stone-600"
            >
              S.I.E.R.R.A. Grid
            </a>
          </p>
        </div>
      </div>

      {/* Weather Details Dialog */}
      {selectedWeather && (
        <WeatherDetailsDialog
          selectedWeather={selectedWeather}
          onClose={() => setSelectedWeather(null)}
        />
      )}

      {/* Alert Details Dialog */}
      {selectedAlert && (
        <AlertDetailsDialog alert={selectedAlert} onClose={() => setSelectedAlert(null)} />
      )}
    </div>
  );
}
