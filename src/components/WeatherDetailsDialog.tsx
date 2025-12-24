import type { ReactElement } from 'react';
import {
  Thermometer,
  Wind,
  Eye,
  Droplets,
  Sun,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudDrizzle,
  Zap,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import Dialog, { DialogHeader, DialogContent, DialogQuickActions } from './Dialog';
import { type Alert, type WeatherLocation, getSeverityColors } from './types';

interface WeatherDetailsDialogProps {
  selectedWeather: WeatherLocation;
  onClose: () => void;
}

// Helper functions

const getWeatherIcon = (iconCode: string, size: 'sm' | 'lg' = 'sm') => {
  const sizeClass = size === 'lg' ? 'h-8 w-8' : 'h-5 w-5';

  const iconMap: Record<string, ReactElement> = {
    '01d': <Sun className={`${sizeClass} text-yellow-500`} />,
    '01n': <Sun className={`${sizeClass} text-yellow-400`} />,
    '02d': <Cloud className={`${sizeClass} text-gray-400`} />,
    '02n': <Cloud className={`${sizeClass} text-gray-500`} />,
    '03d': <Cloud className={`${sizeClass} text-gray-500`} />,
    '03n': <Cloud className={`${sizeClass} text-gray-600`} />,
    '04d': <Cloud className={`${sizeClass} text-gray-600`} />,
    '04n': <Cloud className={`${sizeClass} text-gray-700`} />,
    '09d': <CloudDrizzle className={`${sizeClass} text-blue-500`} />,
    '09n': <CloudDrizzle className={`${sizeClass} text-blue-600`} />,
    '10d': <CloudRain className={`${sizeClass} text-blue-500`} />,
    '10n': <CloudRain className={`${sizeClass} text-blue-600`} />,
    '11d': <Zap className={`${sizeClass} text-yellow-600`} />,
    '11n': <Zap className={`${sizeClass} text-yellow-500`} />,
    '13d': <CloudSnow className={`${sizeClass} text-blue-300`} />,
    '13n': <CloudSnow className={`${sizeClass} text-blue-400`} />,
    '50d': <Eye className={`${sizeClass} text-gray-400`} />,
    '50n': <Eye className={`${sizeClass} text-gray-500`} />,
  };

  return iconMap[iconCode] || <Cloud className={`${sizeClass} text-gray-500`} />;
};

const getSeverityIcon = (severity: Alert['severity']) => {
  const colors = getSeverityColors(severity);
  return <AlertTriangle className={`h-5 w-5 ${colors.icon}`} />;
};

const getSeverityBadge = (severity: Alert['severity']) => {
  return getSeverityColors(severity).badge;
};

// Format details text: **text** to bold, \n\n to paragraphs, \n to <br>
const formatDetails = (details: string): React.ReactNode => {
  // Split by double newlines to create paragraphs
  const paragraphs = details.split(/\n\n/);

  return paragraphs.map((paragraph, pIndex) => {
    // Split by single newlines within paragraph
    const lines = paragraph.split(/\n/);

    const formattedLines = lines.map((line, lIndex) => {
      // Convert **text** to bold
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      const formatted = parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        return part;
      });

      return (
        <span key={lIndex}>
          {formatted}
          {lIndex < lines.length - 1 && <br />}
        </span>
      );
    });

    return (
      <p key={pIndex} className={pIndex > 0 ? 'mt-2' : ''}>
        {formattedLines}
      </p>
    );
  });
};


const getWindDirection = (degrees: number | undefined): string => {
  if (degrees === undefined || degrees === null) return '—';

  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
};

const convertCelsiusToFahrenheit = (celsius: number | undefined): number => {
  if (celsius === undefined) return 0;
  return Math.round(celsius * 9/5 + 32);
};

const convertKmhToMph = (kmh: number | undefined): number => {
  if (kmh === undefined) return 0;
  return Math.round(kmh * 0.621371);
};

const convertKmToMiles = (km: number | undefined): number => {
  if (km === undefined) return 0;
  return Math.round(km * 0.621371);
};

export default function WeatherDetailsDialog({
  selectedWeather,
  onClose,
}: WeatherDetailsDialogProps) {
  const alerts = selectedWeather.alerts || [];
  const routeAlerts = alerts.filter((alert) => alert.classification === 'ON_ROUTE');
  const generalAlerts = alerts.filter((alert) => alert.classification !== 'ON_ROUTE');

  const showQuickActions =
    selectedWeather.windSpeedKmh && selectedWeather.windSpeedKmh > 25;

  return (
    <Dialog onClose={onClose} maxWidth="2xl">
      <DialogHeader onClose={onClose}>
        {getWeatherIcon(selectedWeather.icon, 'lg')}
        <div className="flex-1 min-w-0">
          <h2 className="text-lg sm:text-xl font-semibold text-stone-800 truncate">
            {selectedWeather.name}
          </h2>
          <p className="text-stone-600 text-sm capitalize">{selectedWeather.condition}</p>
        </div>
      </DialogHeader>

      {showQuickActions && (
        <DialogQuickActions>
          <span className="text-sm px-4 py-2 bg-orange-100 text-orange-800 rounded-lg border border-orange-200 font-medium">
            High winds - drive carefully
          </span>
        </DialogQuickActions>
      )}

      <DialogContent>
        <div className="space-y-4">
            {/* Current Conditions */}
            <div className="bg-stone-50 border border-stone-200 rounded-lg p-4">
              <h3 className="font-medium text-stone-900 mb-3 text-lg">What to expect right now</h3>

              {/* Temperature Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                <div className="text-center bg-white rounded-lg p-4 border border-stone-100">
                  <Thermometer className="h-6 w-6 text-red-500 mx-auto mb-2" />
                  <div className="text-2xl sm:text-xl font-bold text-stone-800">
                    {selectedWeather.temperature}°F
                  </div>
                  <div className="text-sm text-stone-500">Temperature</div>
                </div>

                {selectedWeather.feelsLikeCelsius && (
                  <div className="text-center bg-white rounded-lg p-4 border border-stone-100">
                    <Thermometer className="h-6 w-6 text-orange-500 mx-auto mb-2" />
                    <div className="text-2xl sm:text-xl font-bold text-stone-800">
                      {convertCelsiusToFahrenheit(selectedWeather.feelsLikeCelsius)}°F
                    </div>
                    <div className="text-sm text-stone-500">Feels like</div>
                  </div>
                )}
              </div>

              {/* Weather Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                {selectedWeather.humidityPercent && (
                  <div className="flex items-center space-x-3 p-2 bg-white rounded border border-stone-100">
                    <Droplets className="h-5 w-5 text-blue-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <span className="text-stone-500 uppercase tracking-wide text-xs block">Humidity</span>
                      <div className="text-stone-700 font-medium text-base">{selectedWeather.humidityPercent}%</div>
                    </div>
                  </div>
                )}

                {selectedWeather.windSpeedKmh !== undefined && (
                  <div className="flex items-center space-x-3 p-2 bg-white rounded border border-stone-100">
                    <Wind className="h-5 w-5 text-gray-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <span className="text-stone-500 uppercase tracking-wide text-xs block">Wind</span>
                      <div className="text-stone-700 font-medium text-base">
                        {convertKmhToMph(selectedWeather.windSpeedKmh)} mph
                        {selectedWeather.windDirectionDegrees !== undefined && selectedWeather.windDirectionDegrees !== null && (
                          <span className="text-stone-500 ml-1">
                            {getWindDirection(selectedWeather.windDirectionDegrees)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {selectedWeather.visibilityKm !== undefined && selectedWeather.visibilityKm > 0 && (
                  <div className="flex items-center space-x-3 p-2 bg-white rounded border border-stone-100">
                    <Eye className="h-5 w-5 text-gray-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <span className="text-stone-500 uppercase tracking-wide text-xs block">Visibility</span>
                      <div className="text-stone-700 font-medium text-base">
                        {convertKmToMiles(selectedWeather.visibilityKm)} mi
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Route-Relevant Alerts */}
            {routeAlerts.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <span className="text-lg font-medium text-red-900">Affects your route ({routeAlerts.length})</span>
                </div>

                <div className="space-y-3">
                  {routeAlerts.map((alert, index) => (
                    <div
                      key={alert.id || index}
                      className={`border rounded-lg p-4 bg-white ${
                        alert.severity === 'CRITICAL' ? 'border-red-300' :
                        alert.severity === 'WARNING' ? 'border-orange-300' :
                        'border-yellow-300'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex items-center space-x-2 mt-0.5">
                          {getSeverityIcon(alert.severity)}
                          <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getSeverityBadge(alert.severity)}`}>
                            {alert.severity.toLowerCase()}
                          </span>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-stone-900 leading-tight mb-1">
                            {alert.title}
                          </h4>
                          <div className="text-stone-700 text-sm leading-relaxed mb-2">
                            {alert.details ? formatDetails(alert.details) : alert.description}
                          </div>
                          {(alert.startTime || alert.expectedEnd) && (
                            <div className="bg-stone-50 rounded p-2 text-xs text-stone-600">
                              <div className="font-medium mb-1">Timing:</div>
                              {alert.startTime && (
                                <div>Starts: {new Date(alert.startTime).toLocaleString()}</div>
                              )}
                              {alert.expectedEnd && (
                                <div>Ends: {new Date(alert.expectedEnd).toLocaleString()}</div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* General Weather Alerts */}
            {generalAlerts.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-stone-900 mb-3">General area alerts ({generalAlerts.length})</h3>

                <div className="space-y-3">
                  {generalAlerts.map((alert, index) => (
                    <div
                      key={alert.id || index}
                      className={`border rounded-lg p-4 ${
                        alert.severity === 'CRITICAL' ? 'bg-red-50 border-red-200' :
                        alert.severity === 'WARNING' ? 'bg-orange-50 border-orange-200' :
                        'bg-yellow-50 border-yellow-200'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex items-center space-x-2 mt-0.5">
                          {getSeverityIcon(alert.severity)}
                          <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getSeverityBadge(alert.severity)}`}>
                            {alert.severity.toLowerCase()}
                          </span>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-stone-900 leading-tight mb-1">
                            {alert.title}
                          </h4>
                          <div className="text-stone-700 text-sm leading-relaxed mb-2">
                            {alert.details ? formatDetails(alert.details) : alert.description}
                          </div>
                          {(alert.startTime || alert.expectedEnd) && (
                            <div className="bg-stone-50 rounded p-2 text-xs text-stone-600">
                              <div className="font-medium mb-1">Timing:</div>
                              {alert.startTime && (
                                <div>Starts: {new Date(alert.startTime).toLocaleString()}</div>
                              )}
                              {alert.expectedEnd && (
                                <div>Ends: {new Date(alert.expectedEnd).toLocaleString()}</div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {/* No alerts state */}
          {alerts.length === 0 && (
            <div className="text-center py-6">
              <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-2" />
              <h3 className="font-medium text-stone-900 mb-1">All clear</h3>
              <p className="text-stone-600 text-sm">No weather alerts for this location.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}