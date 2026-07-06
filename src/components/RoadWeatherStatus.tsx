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
  MapPin,
  CircleAlert,
  OctagonX,
  Link,
} from 'lucide-react';
import RouteDetailsDialog from './RouteDetailsDialog';
import WeatherDetailsDialog from './WeatherDetailsDialog';
import AlertDetailsDialog from './AlertDetailsDialog';

// Alert interfaces
interface Alert {
  id?: string;
  type: 'road' | 'weather';
  severity: 'CRITICAL' | 'WARNING' | 'INFO' | 'ALERT_SEVERITY_UNSPECIFIED';
  classification?: 'ON_ROUTE' | 'NEARBY' | 'DISTANT' | 'ALERT_CLASSIFICATION_UNSPECIFIED';
  title: string;
  description: string;
  headline?: string; // Brief summary for weather alerts
  summary?: string; // Concise overview
  details?: string; // Formatted markdown details
  condensedSummary?: string;
  location?: string;
  locationDescription?: string;
  incidentType?: string;
  impact?: string;
  startTime?: string;
  expectedEnd?: string;
  distanceToRouteMeters?: number;
  metadata?: Record<string, unknown>;
}

// Chain Control Info from API
interface ChainControlInfo {
  level:
    | 'CHAIN_CONTROL_LEVEL_UNSPECIFIED'
    | 'CHAIN_CONTROL_LEVEL_NONE'
    | 'CHAIN_CONTROL_LEVEL_R1'
    | 'CHAIN_CONTROL_LEVEL_R2'
    | 'CHAIN_CONTROL_LEVEL_R3';
  locationName?: string;
  latitude?: number;
  longitude?: number;
  effectiveTime?: string;
  direction?: string;
  description?: string;
}

// API Response Interfaces — S.I.E.R.R.A. Grid /v1 (snake_case fields).
// Roads keep their inline `alerts`; weather conditions no longer carry alerts —
// weather alerts are events, queried from /v1/events?layer=weather_alert.
interface RoadAlertApi {
  id?: string;
  type?: string;
  severity?: string;
  classification?: string;
  title?: string;
  description?: string;
  condensed_summary?: string;
  location?: { latitude?: number; longitude?: number } | string;
  location_description?: string;
  incident_type?: string;
  impact?: string;
  start_time?: string;
  expected_end?: string;
  distance_to_route_meters?: number;
  metadata?: Record<string, unknown>;
}

interface RoadApiResponse {
  roads: {
    id: string;
    name: string;
    section: string;
    status: string;
    status_explanation?: string;
    duration_minutes: number;
    distance_km: number;
    congestion_level: string;
    delay_minutes?: number;
    chain_control: string;
    chain_control_info?: ChainControlInfo;
    // Omitted entirely when empty — the Grid's protojson drops empty arrays.
    alerts?: RoadAlertApi[];
  }[];
  last_updated: string;
}

interface WeatherApiResponse {
  weather_data: {
    location_id: string;
    location_name: string;
    weather_main: string;
    weather_description: string;
    weather_icon: string;
    temperature_celsius: number;
    feels_like_celsius: number;
    humidity_percent: number;
    wind_speed_kmh: number;
    wind_direction_degrees: number;
    visibility_km: number;
  }[];
  last_updated: string;
}

// Weather alerts are Grid events (GET /v1/events?layer=weather_alert). The common
// event envelope is enough to render an alert card; the typed weather_alert block
// carries the NWS specifics.
interface GridEvent {
  id?: string;
  layer?: string;
  category?: string;
  severity?: string;
  status?: string;
  headline?: string;
  summary?: string;
  description?: string;
  area_label?: string;
  effective?: string;
  expires?: string;
  observed_at?: string;
  weather_alert?: {
    nws_severity?: string;
    certainty?: string;
    urgency?: string;
    instruction?: string;
    area_desc?: string;
    zones?: string[];
  };
}

interface GridEventList {
  events?: GridEvent[];
}

// Display Interfaces
interface RoadSegment {
  from: string;
  to: string;
  status: 'clear' | 'delays' | 'restrictions' | 'closed';
  delayMinutes?: number;
  description?: string;
  alertCount: number;
  alerts: Alert[];
  // Raw road data for metadata display
  congestionLevel?: string;
  durationMinutes?: number;
  distanceKm?: number;
  chainControl?: string;
  chainControlInfo?: ChainControlInfo;
  rawStatus?: string;
  statusExplanation?: string;
}

interface WeatherLocation {
  name: string;
  temperature: number;
  condition: string;
  icon: string;
  // Extended weather data
  locationId?: string;
  temperatureCelsius?: number;
  feelsLikeCelsius?: number;
  humidityPercent?: number;
  windSpeedKmh?: number;
  windDirectionDegrees?: number;
  visibilityKm?: number;
  weatherMain?: string;
  alerts?: Alert[];
}

interface ApiData {
  roads: RoadSegment[];
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

const getRoadStatusIcon = (status: string) => {
  switch (status) {
    case 'clear':
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    case 'delays':
      return <Clock className="h-5 w-5 text-yellow-600" />;
    case 'restrictions':
      return <CircleAlert className="h-5 w-5 text-yellow-600" />;
    case 'closed':
      return <OctagonX className="h-5 w-5 text-red-600" />;
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
      return segment.delayMinutes ? `${segment.delayMinutes} min delays` : 'Restrictions';
    case 'closed':
      return 'Closed';
    default:
      return 'Unknown';
  }
};

// Helper function to humanize timestamps (simplified version for main component)
const formatHumanTime = (timestamp: string | undefined): string => {
  if (!timestamp) return '';

  try {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMs > 0 && diffMins < 60) {
      return diffMins <= 1 ? 'Just now' : `${diffMins} min ago`;
    }

    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch (error) {
    return timestamp;
  }
};

// S.I.E.R.R.A. Grid data feeds.
const GRID_API_BASE = 'https://data.sierragridteam.org/v1';
const GRID_AREA = 'ebbetts-pass';

// Map the Grid's unified 5-level severity scale (EXTREME/SEVERE/MODERATE/MINOR/INFO)
// down to the widget's 3-level display scale. Legacy road-alert severities
// (CRITICAL/WARNING/INFO) pass through unchanged.
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

// A road's inline alert → display Alert.
const transformRoadAlert = (alert: RoadAlertApi): Alert => {
  let locationText: string | undefined;
  if (typeof alert.location === 'string') {
    locationText = alert.location;
  } else if (alert.location && typeof alert.location === 'object') {
    const { latitude, longitude } = alert.location;
    if (typeof latitude === 'number' && typeof longitude === 'number') {
      locationText = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    }
  }

  const classification = alert.classification?.toUpperCase();
  const metadata = alert.metadata;

  return {
    id: alert.id,
    type: 'road',
    severity: mapGridSeverity(alert.severity),
    classification:
      classification &&
      ['ON_ROUTE', 'NEARBY', 'DISTANT', 'ALERT_CLASSIFICATION_UNSPECIFIED'].includes(classification)
        ? (classification as Alert['classification'])
        : undefined,
    title: alert.title || alert.description || 'Alert',
    description:
      alert.description || alert.condensed_summary || alert.title || 'No description available',
    condensedSummary: alert.condensed_summary,
    location: locationText || alert.location_description,
    locationDescription: alert.location_description,
    incidentType: alert.incident_type || (metadata?.incident_type as string | undefined),
    impact: alert.impact,
    startTime: alert.start_time,
    expectedEnd: alert.expected_end || (metadata?.expected_end as string | undefined),
    distanceToRouteMeters: alert.distance_to_route_meters,
    metadata,
  };
};

// A weather_alert Grid event → display Alert.
const transformWeatherEvent = (event: GridEvent): Alert => {
  const wx = event.weather_alert;
  return {
    id: event.id,
    type: 'weather',
    severity: mapGridSeverity(event.severity),
    // `category` is the NWS event type (e.g. "Extreme Heat Warning").
    title: event.category || event.headline || 'Weather Alert',
    description: event.summary || event.description || event.headline || 'No description available',
    headline: event.headline,
    summary: event.summary,
    // The verbatim upstream text (WHAT/WHERE/WHEN sections) is the detail view.
    details: event.description,
    condensedSummary: event.headline,
    location: event.area_label || wx?.area_desc,
    locationDescription: wx?.area_desc,
    startTime: event.effective,
    expectedEnd: event.expires,
    metadata: wx as Record<string, unknown> | undefined,
  };
};

export default function RoadWeatherStatus() {
  const [data, setData] = useState<ApiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<RoadSegment | null>(null);
  const [selectedWeather, setSelectedWeather] = useState<WeatherLocation | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);

      const [roadsResponse, weatherResponse, weatherAlertsResponse] = await Promise.all([
        fetch(`${GRID_API_BASE}/roads?place=${GRID_AREA}`, {
          method: 'GET',
          mode: 'cors',
        }),
        fetch(`${GRID_API_BASE}/weather`, {
          method: 'GET',
          mode: 'cors',
        }),
        fetch(`${GRID_API_BASE}/events?place=${GRID_AREA}&layer=weather_alert`, {
          method: 'GET',
          mode: 'cors',
        }),
      ]);

      if (!roadsResponse.ok || !weatherResponse.ok || !weatherAlertsResponse.ok) {
        const errorDetails = {
          roads: `${roadsResponse.status} ${roadsResponse.statusText}`,
          weather: `${weatherResponse.status} ${weatherResponse.statusText}`,
          weatherAlerts: `${weatherAlertsResponse.status} ${weatherAlertsResponse.statusText}`,
        };
        throw new Error(`API Error: ${JSON.stringify(errorDetails)}`);
      }

      const roads: RoadApiResponse = await roadsResponse.json();
      const weather: WeatherApiResponse = await weatherResponse.json();
      const weatherAlertEvents: GridEventList = await weatherAlertsResponse.json();

      // Collect all alerts across sources for the aggregated "Active Alerts" list.
      const allAlerts: Alert[] = [];

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

      // Transform API data to our format
      const transformedData: ApiData = {
        roads: (roads.roads || []).map((road) => {
          // Parse the section to extract from/to (e.g., "Angels Camp to Murphys")
          const sectionParts = road.section.split(' to ');
          const from = sectionParts[0] || road.name;
          const to = sectionParts[1] || 'Destination';

          // Transform road alerts (the Grid omits `alerts` entirely when empty)
          const roadAlerts = (road.alerts || []).map(transformRoadAlert);
          allAlerts.push(...roadAlerts);

          // Map status to our expected values (factor in alerts)
          let status: 'clear' | 'delays' | 'restrictions' | 'closed' = 'clear';
          if (road.status?.toLowerCase() === 'closed') {
            status = 'closed';
          } else if (roadAlerts.some((alert) => alert.severity === 'CRITICAL')) {
            status = 'restrictions';
          } else if ((road.delay_minutes ?? 0) > 0) {
            status = 'delays';
          } else if (road.chain_control && road.chain_control.toLowerCase() !== 'none') {
            status = 'restrictions';
          } else if (
            road.congestion_level?.toLowerCase() === 'clear' &&
            road.status?.toLowerCase() === 'open'
          ) {
            status = 'clear';
          }

          return {
            from,
            to,
            status,
            delayMinutes: road.delay_minutes,
            description:
              road.chain_control && road.chain_control.toLowerCase() !== 'none'
                ? `Chain control: ${road.chain_control}`
                : undefined,
            alertCount: roadAlerts.length,
            alerts: roadAlerts,
            // Additional metadata
            congestionLevel: road.congestion_level,
            durationMinutes: road.duration_minutes,
            distanceKm: road.distance_km,
            chainControl: road.chain_control,
            chainControlInfo: road.chain_control_info,
            rawStatus: road.status,
            statusExplanation: road.status_explanation,
          };
        }),
        weather: (weather.weather_data || []).map((w) => ({
          name: w.location_name,
          temperature: Math.round(((w.temperature_celsius ?? 0) * 9) / 5 + 32), // Convert to Fahrenheit
          condition: w.weather_description,
          icon: w.weather_icon,
          // Extended weather data
          locationId: w.location_id,
          temperatureCelsius: w.temperature_celsius,
          feelsLikeCelsius: w.feels_like_celsius,
          humidityPercent: w.humidity_percent,
          windSpeedKmh: w.wind_speed_kmh,
          windDirectionDegrees: w.wind_direction_degrees,
          visibilityKm: w.visibility_km,
          weatherMain: w.weather_main,
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
        lastUpdated: roads.last_updated || weather.last_updated || new Date().toISOString(),
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
              {data.roads.length === 0 ? (
                <p className="text-stone-600 text-sm italic">No road data available</p>
              ) : (
                data.roads.map((segment) => {
                  const roadKey = `${segment.from}-${segment.to}`;

                  return (
                    <div key={roadKey} className="border-b border-stone-100 last:border-b-0">
                      <button
                        type="button"
                        onClick={() => setSelectedRoute(segment)}
                        className="w-full cursor-pointer flex items-center justify-between py-3 px-2 hover:bg-stone-50 transition-colors rounded-sm touch-manipulation"
                      >
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          {getRoadStatusIcon(segment.status)}
                          <div className="text-left flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium text-stone-800 truncate">
                                {segment.from} → {segment.to}
                              </span>
                              {/* Chain Control Icon */}
                              {segment.chainControlInfo &&
                                segment.chainControlInfo.level !== 'CHAIN_CONTROL_LEVEL_NONE' &&
                                segment.chainControlInfo.level !==
                                  'CHAIN_CONTROL_LEVEL_UNSPECIFIED' && (
                                  <div
                                    className="flex items-center flex-shrink-0 text-blue-600"
                                    title="Chain control in effect"
                                  >
                                    <Link className="h-4 w-4" />
                                  </div>
                                )}
                              {segment.alertCount > 0 &&
                                (() => {
                                  const onRouteAlerts = segment.alerts.filter(
                                    (alert) => alert.classification === 'ON_ROUTE',
                                  );
                                  const hasOnRoute = onRouteAlerts.length > 0;

                                  return (
                                    <div
                                      className={`flex items-center space-x-1 flex-shrink-0 ${
                                        hasOnRoute ? 'text-red-600' : 'text-yellow-600'
                                      }`}
                                    >
                                      <AlertTriangle className="h-4 w-4" />
                                      {hasOnRoute && (
                                        <span className="text-xs font-medium bg-red-100 px-1.5 py-0.5 rounded">
                                          {onRouteAlerts.length > 9 ? '9+' : onRouteAlerts.length}
                                        </span>
                                      )}
                                    </div>
                                  );
                                })()}
                            </div>
                          </div>
                        </div>
                        <div className="text-sm text-stone-600 flex-shrink-0 ml-2">
                          {getRoadStatusText(segment)}
                        </div>
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
            <strong>Source:</strong> Google Maps • Caltrans • OpenWeather
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

      {/* Route Details Dialog */}
      {selectedRoute && (
        <RouteDetailsDialog selectedRoute={selectedRoute} onClose={() => setSelectedRoute(null)} />
      )}

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
