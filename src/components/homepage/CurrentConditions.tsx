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

// S.I.E.R.R.A. Grid data feeds.
const GRID_API_BASE = 'https://data.sierragridteam.org/api/v1';
const GRID_AREA = 'ebbetts-pass';

// Weather is served by /conditions (camelCase fields), with fire-weather state
// folded into the same payload.
interface ConditionsResponse {
  weather?: {
    locationId?: string;
    locationName?: string;
    weatherDescription?: string;
    weatherIcon?: string;
    temperatureCelsius?: number;
  }[];
  fireWeather?: {
    state?: string; // normal | elevated | red-flag
    headline?: string;
  };
  lastUpdated?: string;
}

// Road state (open/restricted/closed, travel time, delay) is the road_segment
// map-layer projection; chain control is the chain_control projection — both
// GeoJSON FeatureCollections.
interface RoadSegmentProps {
  id?: string;
  headline?: string;
  status?: string; // OPEN | RESTRICTED | CLOSED
  areaLabel?: string;
  road?: { roadId?: string; delayMinutes?: number };
}

interface ChainControlProps {
  id?: string;
  headline?: string;
  status?: string;
  category?: string;
  level?: string;
  road?: { roadId?: string };
  chainControl?: { level?: string };
}

interface GeoJsonFeatureCollection<P> {
  features?: { properties?: P }[];
}

// Road incidents and weather alerts are both events on the unified event feed
// (GET /api/v1/events?layer=…), sharing the common event envelope.
interface GridEvent {
  id?: string;
  category?: string; // NWS event type / road incident type
  severity?: string;
  headline?: string;
  summary?: string;
  description?: string;
  areaLabel?: string;
}

interface GridEventList {
  events?: GridEvent[];
  nextPageToken?: string;
}

// A road segment normalized for the compact widget.
interface RoadSeg {
  label: string;
  rawStatus: string;
  delayMinutes: number;
  chain: string; // 'none' | 'R1' | 'R2' | 'R3'
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
  { name: "Murphy's", frequency: '462.675', status: 'up' },
  { name: 'Arnold Summit', frequency: '462.675', status: 'up' },
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

// Map the Grid's unified 5-level severity scale down to the widget's 3 levels.
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

// Detect an R1/R2/R3 chain level from whichever free-text field carries it.
const detectChainShort = (...values: (string | undefined)[]): string => {
  const s = values.filter(Boolean).join(' ').toUpperCase();
  if (/\bR3\b/.test(s)) return 'R3';
  if (/\bR2\b/.test(s)) return 'R2';
  if (/\bR1\b/.test(s)) return 'R1';
  return 'none';
};

// Build roadId → chain level from the chain_control layer.
const buildChainMap = (
  fc: GeoJsonFeatureCollection<ChainControlProps> | undefined,
): Record<string, string> => {
  const map: Record<string, string> = {};
  for (const feature of fc?.features || []) {
    const p = feature.properties;
    if (!p) continue;
    const roadId = p.road?.roadId || (p.id || '').replace(/^[^:]+:/, '');
    const chain = detectChainShort(
      p.chainControl?.level,
      p.level,
      p.category,
      p.status,
      p.headline,
    );
    if (roadId && chain !== 'none') map[roadId] = chain;
  }
  return map;
};

// Normalize road_segment features into compact rows.
const buildRoadSegments = (
  fc: GeoJsonFeatureCollection<RoadSegmentProps> | undefined,
  chainMap: Record<string, string>,
): RoadSeg[] =>
  (fc?.features || []).map((feature) => {
    const p = feature.properties || {};
    const roadId = p.road?.roadId || (p.id || '').replace(/^[^:]+:/, '');
    return {
      label: p.areaLabel || p.headline || 'Route',
      rawStatus: (p.status || '').toLowerCase(),
      delayMinutes: p.road?.delayMinutes ?? 0,
      chain: (roadId && chainMap[roadId]) || 'none',
    };
  });

const getRoadStatusText = (road: RoadSeg): string => {
  if (road.rawStatus === 'closed') return 'Closed';
  if (road.delayMinutes > 0) return `${road.delayMinutes}min delays`;
  if (road.chain !== 'none') return 'Chain controls';
  if (road.rawStatus === 'restricted') return 'Restrictions';
  return 'Clear';
};

const getRoadStatusColor = (road: RoadSeg): string => {
  if (road.rawStatus === 'closed') return 'text-red-700';
  if (road.delayMinutes > 15) return 'text-red-700';
  if (road.delayMinutes > 0 || road.chain !== 'none' || road.rawStatus === 'restricted') {
    return 'text-yellow-700';
  }
  return 'text-green-700';
};

const hasRoadIssue = (road: RoadSeg): boolean =>
  road.rawStatus === 'closed' ||
  road.rawStatus === 'restricted' ||
  road.delayMinutes > 0 ||
  road.chain !== 'none';

// Collect alerts from the event feeds + fire weather (deduplicated by title).
const collectAlerts = (
  roadIncidents: GridEvent[],
  weatherAlertEvents: GridEvent[],
  fireWeather: ConditionsResponse['fireWeather'],
): Alert[] => {
  const alerts: Alert[] = [];
  const seenTitles = new Set<string>();

  const pushAlert = (alert: Alert) => {
    if (!alert.title || seenTitles.has(alert.title)) return;
    seenTitles.add(alert.title);
    alerts.push(alert);
  };

  // Fire-weather advisory (only when not normal).
  const fwState = (fireWeather?.state || '').toLowerCase();
  if (fwState && fwState !== 'normal') {
    pushAlert({
      id: 'fire-weather',
      severity: fwState === 'red-flag' ? 'CRITICAL' : 'WARNING',
      title: fwState === 'red-flag' ? 'Red Flag Warning' : 'Elevated Fire Weather',
      description: fireWeather?.headline,
      type: 'weather',
    });
  }

  // Road incidents.
  roadIncidents.forEach((event) => {
    pushAlert({
      id: event.id,
      severity: mapGridSeverity(event.severity),
      title: event.headline || event.areaLabel || event.summary || 'Road incident',
      description: event.summary || event.description,
      type: 'road',
    });
  });

  // Weather alerts (same alert may cover multiple zones — dedupe by title).
  weatherAlertEvents.forEach((event) => {
    pushAlert({
      id: event.id,
      severity: mapGridSeverity(event.severity),
      title: event.category || event.headline || event.description || '',
      description: event.summary || event.description,
      type: 'weather',
    });
  });

  return alerts;
};

export default function CurrentConditions() {
  const [weatherData, setWeatherData] = useState<ConditionsResponse | null>(null);
  const [roadSegments, setRoadSegments] = useState<RoadSeg[] | null>(null);
  const [roadIncidents, setRoadIncidents] = useState<GridEvent[]>([]);
  const [weatherAlertEvents, setWeatherAlertEvents] = useState<GridEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [
        conditionsResponse,
        roadSegmentsResponse,
        chainControlResponse,
        roadIncidentsResponse,
        weatherAlertsResponse,
      ] = await Promise.all([
        fetch(`${GRID_API_BASE}/conditions?place=${GRID_AREA}`, { method: 'GET', mode: 'cors' }),
        fetch(`${GRID_API_BASE}/places/${GRID_AREA}/map/road_segment.geojson`, {
          method: 'GET',
          mode: 'cors',
        }),
        fetch(`${GRID_API_BASE}/places/${GRID_AREA}/map/chain_control.geojson`, {
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

      if (
        !conditionsResponse.ok ||
        !roadSegmentsResponse.ok ||
        !chainControlResponse.ok ||
        !roadIncidentsResponse.ok ||
        !weatherAlertsResponse.ok
      ) {
        throw new Error('Failed to fetch data');
      }

      const conditions: ConditionsResponse = await conditionsResponse.json();
      const segments: GeoJsonFeatureCollection<RoadSegmentProps> =
        await roadSegmentsResponse.json();
      const chains: GeoJsonFeatureCollection<ChainControlProps> = await chainControlResponse.json();
      const roads: GridEventList = await roadIncidentsResponse.json();
      const weatherAlerts: GridEventList = await weatherAlertsResponse.json();

      setWeatherData(conditions);
      setRoadSegments(buildRoadSegments(segments, buildChainMap(chains)));
      setRoadIncidents(roads.events || []);
      setWeatherAlertEvents(weatherAlerts.events || []);
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

  const alerts = collectAlerts(roadIncidents, weatherAlertEvents, weatherData?.fireWeather);
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
              {alerts.length === 1 ? alerts[0].title : `${alerts.length} active alerts`}
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
                if (!roadSegments) {
                  return (
                    <div className="flex justify-between items-center">
                      <span className="text-stone-600">Status:</span>
                      <span className="font-medium text-stone-500">No data</span>
                    </div>
                  );
                }

                const roadsWithIssues = roadSegments.filter(hasRoadIssue);

                if (roadsWithIssues.length === 0) {
                  return (
                    <div className="flex justify-between items-center">
                      <span className="text-stone-600">All routes:</span>
                      <span className="font-medium text-green-700">Clear</span>
                    </div>
                  );
                }

                return roadsWithIssues.map((road) => (
                  <div key={road.label} className="flex justify-between items-center gap-2">
                    <span className="text-stone-600 truncate">{road.label}:</span>
                    <span className={`font-medium flex-shrink-0 ${getRoadStatusColor(road)}`}>
                      {getRoadStatusText(road)}
                    </span>
                  </div>
                ));
              })()}
            </div>
          </div>

          {/* Weather */}
          <div>
            <h4 className="font-medium text-stone-700 mb-1">Weather</h4>
            <div className="space-y-1 ml-2">
              {weatherData?.weather?.map((location) => (
                <div key={location.locationId} className="flex justify-between items-center">
                  <span className="text-stone-600 truncate">{location.locationName}:</span>
                  <div className="flex items-center space-x-1 flex-shrink-0">
                    {getWeatherIcon(location.weatherIcon || '')}
                    <span className="font-medium text-stone-700">
                      {Math.round(((location.temperatureCelsius ?? 0) * 9) / 5 + 32)}°F
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
    </div>
  );
}
