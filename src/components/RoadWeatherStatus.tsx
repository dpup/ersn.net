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

// API Response Interfaces
interface RoadApiResponse {
  roads: {
    id: string;
    name: string;
    section: string;
    status: string;
    statusExplanation?: string;
    durationMinutes: number;
    distanceKm: number;
    congestionLevel: string;
    delayMinutes: number;
    chainControl: string;
    chainControlInfo?: ChainControlInfo;
    alerts: {
      id: string;
      severity: string;
      title: string;
      description: string;
      condensedSummary?: string;
      classification?: string;
      location?: string;
      locationDescription?: string;
      incidentType?: string;
      type?: string;
      impact?: string;
      startTime?: string;
      expectedEnd?: string;
      metadata?: Record<string, unknown>;
    }[];
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
    alerts: {
      id?: string;
      severity?: string;
      title?: string;
      description?: string;
      event?: string; // NWS event type e.g. "Winter Storm Warning", "Flood Watch"
      senderName?: string; // e.g. "NWS Sacramento CA"
      headline?: string; // Brief summary (125 chars max)
      summary?: string; // Concise overview of hazards and actions
      details?: string; // Formatted markdown with sections
      condensedSummary?: string;
      classification?: string;
      impact?: string;
      locationDescription?: string;
      startTime?: string;
      startTimestamp?: number; // Unix timestamp
      endTimestamp?: number; // Unix timestamp
      type?: string;
      tags?: string[]; // e.g. ["Flood"], ["Wind", "Snow/Ice"]
      metadata?: Record<string, unknown>;
    }[];
  }[];
  lastUpdated: string;
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

      // Helper function to infer severity from NWS event types
      const inferSeverityFromEvent = (event: string | undefined): Alert['severity'] | null => {
        if (!event) return null;
        const eventLower = event.toLowerCase();

        // Critical: Emergencies and extreme events
        if (
          eventLower.includes('emergency') ||
          eventLower.includes('extreme') ||
          eventLower.includes('tornado warning') ||
          eventLower.includes('flash flood warning') ||
          eventLower.includes('blizzard warning')
        ) {
          return 'CRITICAL';
        }

        // Warning: NWS "Warning" level events indicate imminent danger
        if (eventLower.includes('warning')) {
          return 'WARNING';
        }

        // Watch: NWS "Watch" level events indicate potential danger
        if (eventLower.includes('watch')) {
          return 'WARNING'; // Treat watches as warnings for visibility
        }

        // Advisory: Less severe but notable
        if (eventLower.includes('advisory') || eventLower.includes('statement')) {
          return 'INFO';
        }

        return null;
      };

      // Helper function to transform alerts
      const transformAlert = (alert: unknown, type: 'road' | 'weather'): Alert => {
        const alertObj = alert as Record<string, unknown>;

        // Handle location field - could be string or object with lat/lng
        let locationText: string | undefined;
        if (typeof alertObj.location === 'string') {
          locationText = alertObj.location;
        } else if (alertObj.location && typeof alertObj.location === 'object') {
          const loc = alertObj.location as Record<string, unknown>;
          if (loc.name && typeof loc.name === 'string') {
            locationText = loc.name;
          } else if (typeof loc.latitude === 'number' && typeof loc.longitude === 'number') {
            locationText = `${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}`;
          }
        }

        // Get event type for NWS alerts (weather)
        const eventType = alertObj.event as string | undefined;

        // Get severity from multiple possible fields
        const rawSeverity =
          (alertObj.severity as string) ||
          (alertObj.priority as string) ||
          (alertObj.urgency as string) ||
          (alertObj.level as string);

        // Normalize severity values to match API spec
        let normalizedSeverity: Alert['severity'] = 'INFO';

        // First try to infer from event type (for NWS weather alerts)
        const eventSeverity = inferSeverityFromEvent(eventType);
        if (eventSeverity) {
          normalizedSeverity = eventSeverity;
        } else if (rawSeverity) {
          const severityUpper = rawSeverity.toUpperCase();
          if (
            ['CRITICAL', 'WARNING', 'INFO', 'ALERT_SEVERITY_UNSPECIFIED'].includes(severityUpper)
          ) {
            normalizedSeverity = severityUpper as Alert['severity'];
          } else {
            // Fallback mapping for non-standard values
            const severityLower = rawSeverity.toLowerCase();
            if (
              severityLower.includes('critical') ||
              severityLower.includes('severe') ||
              severityLower.includes('emergency')
            ) {
              normalizedSeverity = 'CRITICAL';
            } else if (
              severityLower.includes('warning') ||
              severityLower.includes('major') ||
              severityLower.includes('high') ||
              severityLower.includes('important')
            ) {
              normalizedSeverity = 'WARNING';
            } else if (
              severityLower.includes('info') ||
              severityLower.includes('advisory') ||
              severityLower.includes('minor')
            ) {
              normalizedSeverity = 'INFO';
            }
          }
        }

        // Get classification
        const rawClassification = (alertObj.classification as string) || undefined;
        let classification: Alert['classification'];
        if (rawClassification) {
          const classificationUpper = rawClassification.toUpperCase();
          if (
            ['ON_ROUTE', 'NEARBY', 'DISTANT', 'ALERT_CLASSIFICATION_UNSPECIFIED'].includes(
              classificationUpper,
            )
          ) {
            classification = classificationUpper as Alert['classification'];
          }
        }

        return {
          id: (alertObj.id as string) || (alertObj.alertId as string) || undefined,
          type,
          severity: normalizedSeverity,
          classification,
          title:
            (alertObj.title as string) ||
            (alertObj.event as string) ||
            (alertObj.description as string) ||
            'Alert',
          // For weather alerts, prefer summary over raw description
          description:
            (alertObj.summary as string) ||
            (alertObj.description as string) ||
            (alertObj.title as string) ||
            (alertObj.event as string) ||
            'No description available',
          headline: (alertObj.headline as string) || undefined,
          summary: (alertObj.summary as string) || undefined,
          details: (alertObj.details as string) || undefined,
          condensedSummary:
            (alertObj.condensedSummary as string) || (alertObj.headline as string) || undefined,
          location: locationText,
          locationDescription: (alertObj.locationDescription as string) || undefined,
          incidentType: (alertObj.incidentType as string) || (alertObj.type as string) || undefined,
          impact: (alertObj.impact as string) || undefined,
          startTime: (alertObj.startTime as string) || undefined,
          expectedEnd: (alertObj.expectedEnd as string) || (alertObj.end as string) || undefined,
          distanceToRouteMeters: (alertObj.distanceToRouteMeters as number) || undefined,
          metadata: (alertObj.metadata as Record<string, unknown>) || undefined,
        };
      };

      // Collect all alerts from both sources
      const allAlerts: Alert[] = [];

      // Transform API data to our format
      const transformedData: ApiData = {
        roads: roads.roads.map((road) => {
          // Parse the section to extract from/to (e.g., "Angels Camp to Murphys")
          const sectionParts = road.section.split(' to ');
          const from = sectionParts[0] || road.name;
          const to = sectionParts[1] || 'Destination';

          // Transform road alerts
          const roadAlerts = road.alerts.map((alert) => transformAlert(alert, 'road'));
          allAlerts.push(...roadAlerts);

          // Map status to our expected values (factor in alerts)
          let status: 'clear' | 'delays' | 'restrictions' | 'closed' = 'clear';
          if (road.status?.toLowerCase() === 'closed') {
            status = 'closed';
          } else if (roadAlerts.some((alert) => alert.severity === 'CRITICAL')) {
            status = 'restrictions';
          } else if (road.delayMinutes > 0) {
            status = 'delays';
          } else if (road.chainControl && road.chainControl.toLowerCase() !== 'none') {
            status = 'restrictions';
          } else if (
            road.congestionLevel?.toLowerCase() === 'clear' &&
            road.status?.toLowerCase() === 'open'
          ) {
            status = 'clear';
          }

          return {
            from,
            to,
            status,
            delayMinutes: road.delayMinutes,
            description:
              road.chainControl && road.chainControl.toLowerCase() !== 'none'
                ? `Chain control: ${road.chainControl}`
                : undefined,
            alertCount: roadAlerts.length,
            alerts: roadAlerts,
            // Additional metadata
            congestionLevel: road.congestionLevel,
            durationMinutes: road.durationMinutes,
            distanceKm: road.distanceKm,
            chainControl: road.chainControl,
            chainControlInfo: road.chainControlInfo,
            rawStatus: road.status,
            statusExplanation: road.statusExplanation,
          };
        }),
        weather: weather.weatherData.map((w) => {
          // Transform weather alerts and add to global collection
          const weatherAlerts = w.alerts.map((alert) => transformAlert(alert, 'weather'));
          allAlerts.push(...weatherAlerts);

          return {
            name: w.locationName,
            temperature: Math.round((w.temperatureCelsius * 9) / 5 + 32), // Convert to Fahrenheit
            condition: w.weatherDescription,
            icon: w.weatherIcon,
            // Extended weather data
            locationId: w.locationId,
            temperatureCelsius: w.temperatureCelsius,
            feelsLikeCelsius: w.feelsLikeCelsius,
            humidityPercent: w.humidityPercent,
            windSpeedKmh: w.windSpeedKmh,
            windDirectionDegrees: w.windDirectionDegrees,
            visibilityKm: w.visibilityKm,
            weatherMain: w.weatherMain,
            alerts: weatherAlerts,
          };
        }),
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
        lastUpdated: roads.lastUpdated || weather.lastUpdated || new Date().toISOString(),
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

  console.log('Rendering with data:', data);

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
