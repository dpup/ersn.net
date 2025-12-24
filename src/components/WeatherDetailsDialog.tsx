import type { ReactElement } from 'react';
import {
  Thermometer,
  Wind,
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
import Dialog, {
  DialogHeader,
  DialogContent,
  StatBox,
  InfoCard,
  CollapsibleSection,
} from './Dialog';
import { type Alert, type WeatherLocation } from './types';

interface WeatherDetailsDialogProps {
  selectedWeather: WeatherLocation;
  onClose: () => void;
}

// Helper functions

const getWeatherIcon = (iconCode: string, size: 'sm' | 'lg' = 'sm') => {
  const sizeClass = size === 'lg' ? 'h-7 w-7' : 'h-5 w-5';

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
    '50d': <Cloud className={`${sizeClass} text-gray-400`} />,
    '50n': <Cloud className={`${sizeClass} text-gray-500`} />,
  };

  return iconMap[iconCode] || <Cloud className={`${sizeClass} text-gray-500`} />;
};

// Format details text: **text** to bold, \n\n to paragraphs, \n to <br>
const formatDetails = (details: string): React.ReactNode => {
  const paragraphs = details.split(/\n\n/);

  return paragraphs.map((paragraph, pIndex) => {
    const lines = paragraph.split(/\n/);

    const formattedLines = lines.map((line, lIndex) => {
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
  if (degrees === undefined || degrees === null) return '';

  const directions = [
    'N',
    'NNE',
    'NE',
    'ENE',
    'E',
    'ESE',
    'SE',
    'SSE',
    'S',
    'SSW',
    'SW',
    'WSW',
    'W',
    'WNW',
    'NW',
    'NNW',
  ];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
};

const convertCelsiusToFahrenheit = (celsius: number | undefined): number => {
  if (celsius === undefined) return 0;
  return Math.round((celsius * 9) / 5 + 32);
};

const convertKmhToMph = (kmh: number | undefined): number => {
  if (kmh === undefined) return 0;
  return Math.round(kmh * 0.621371);
};

const getAlertCountVariant = (alerts: Alert[]): 'warning' | 'danger' | 'info' => {
  if (alerts.some((a) => a.severity === 'CRITICAL')) return 'danger';
  if (alerts.some((a) => a.severity === 'WARNING')) return 'warning';
  return 'info';
};

export default function WeatherDetailsDialog({
  selectedWeather,
  onClose,
}: WeatherDetailsDialogProps) {
  const alerts = selectedWeather.alerts || [];
  const routeAlerts = alerts.filter((alert) => alert.classification === 'ON_ROUTE');
  const generalAlerts = alerts.filter((alert) => alert.classification !== 'ON_ROUTE');

  const windDirection = getWindDirection(selectedWeather.windDirectionDegrees);
  const windLabel = windDirection ? `Wind ${windDirection}` : 'Wind';

  return (
    <Dialog onClose={onClose} maxWidth="2xl">
      <DialogHeader onClose={onClose}>
        <div className="bg-stone-100 rounded-lg w-11 h-11 flex items-center justify-center flex-shrink-0">
          {getWeatherIcon(selectedWeather.icon, 'lg')}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-stone-800 truncate">{selectedWeather.name}</h2>
          <p className="text-stone-500 text-sm capitalize">{selectedWeather.condition}</p>
        </div>
      </DialogHeader>

      <DialogContent>
        <div className="space-y-4">
          {/* Current Conditions */}
          <div>
            <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-3">
              What to expect right now
            </h3>

            {/* Temperature Section */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <StatBox
                label="Temperature"
                value={`${selectedWeather.temperature}°F`}
                icon={<Thermometer className="h-5 w-5 text-red-500 mx-auto" />}
              />
              {selectedWeather.feelsLikeCelsius !== undefined && (
                <StatBox
                  label="Feels like"
                  value={`${convertCelsiusToFahrenheit(selectedWeather.feelsLikeCelsius)}°F`}
                  icon={<Thermometer className="h-5 w-5 text-orange-500 mx-auto" />}
                />
              )}
            </div>

            {/* Other Weather Stats */}
            <div className="grid grid-cols-2 gap-3">
              {selectedWeather.humidityPercent !== undefined && (
                <StatBox
                  label="Humidity"
                  value={`${selectedWeather.humidityPercent}%`}
                  icon={<Droplets className="h-5 w-5 text-blue-500 mx-auto" />}
                />
              )}
              {selectedWeather.windSpeedKmh !== undefined && (
                <StatBox
                  label={windLabel}
                  value={`${convertKmhToMph(selectedWeather.windSpeedKmh)} mph`}
                  icon={<Wind className="h-5 w-5 text-stone-500 mx-auto" />}
                />
              )}
            </div>
          </div>

          {/* Route-Relevant Alerts */}
          {routeAlerts.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-3">
                Affects your route
              </h3>
              <div className="space-y-3">
                {routeAlerts.map((alert, index) => {
                  const cardVariant = alert.severity === 'CRITICAL' ? 'danger' : 'warning';

                  return (
                    <InfoCard key={alert.id || index} variant={cardVariant}>
                      <div className="flex gap-3">
                        <div
                          className={`${alert.severity === 'CRITICAL' ? 'bg-red-600' : 'bg-yellow-600'} rounded-lg w-9 h-9 flex items-center justify-center flex-shrink-0`}
                        >
                          <AlertTriangle className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className={`text-sm font-bold ${alert.severity === 'CRITICAL' ? 'text-red-900' : 'text-yellow-900'}`}
                            >
                              {alert.title}
                            </span>
                          </div>
                          <div
                            className={`text-sm leading-relaxed ${alert.severity === 'CRITICAL' ? 'text-red-800' : 'text-yellow-800'}`}
                          >
                            {alert.details ? formatDetails(alert.details) : alert.description}
                          </div>
                        </div>
                      </div>
                    </InfoCard>
                  );
                })}
              </div>
            </div>
          )}

          {/* General Weather Alerts */}
          {generalAlerts.length > 0 && (
            <CollapsibleSection
              title="Area Alerts"
              count={generalAlerts.length}
              countVariant={getAlertCountVariant(generalAlerts)}
            >
              {generalAlerts.map((alert, index) => {
                const cardVariant = alert.severity === 'CRITICAL' ? 'danger' : 'warning';

                return (
                  <InfoCard key={alert.id || index} variant={cardVariant}>
                    <div className="flex gap-3 items-start">
                      <AlertTriangle
                        className={`h-5 w-5 flex-shrink-0 mt-0.5 ${alert.severity === 'CRITICAL' ? 'text-red-600' : 'text-yellow-600'}`}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`text-sm font-bold ${alert.severity === 'CRITICAL' ? 'text-red-900' : 'text-yellow-900'}`}
                          >
                            {alert.title}
                          </span>
                        </div>
                        <div
                          className={`text-sm leading-relaxed ${alert.severity === 'CRITICAL' ? 'text-red-800' : 'text-yellow-800'}`}
                        >
                          {alert.details ? formatDetails(alert.details) : alert.description}
                        </div>
                      </div>
                    </div>
                  </InfoCard>
                );
              })}
            </CollapsibleSection>
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
