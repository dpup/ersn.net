import { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Construction,
  Ban,
  Truck,
  Snowflake,
  CheckCircle,
  AlertTriangle,
  Link,
  MapPin,
  Clock,
} from 'lucide-react';
import Dialog, { DialogHeader, DialogContent } from './Dialog';
import {
  type Alert,
  type RoadSegment,
  type ChainControlInfo,
  formatHumanTime,
  formatEnumValue,
} from './types';

interface RouteDetailsDialogProps {
  selectedRoute: RoadSegment;
  onClose: () => void;
}

// Helper functions
const formatMetadataValue = (value: string): string => {
  const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
  if (isoDateRegex.test(value)) {
    return formatHumanTime(value) || value;
  }
  return formatEnumValue(value);
};

const getChainControlDisplay = (info: ChainControlInfo) => {
  const levelMap: Record<string, { label: string; color: string; description: string }> = {
    CHAIN_CONTROL_LEVEL_R1: {
      label: 'R1',
      color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      description: 'Chains required except for vehicles with snow tires',
    },
    CHAIN_CONTROL_LEVEL_R2: {
      label: 'R2',
      color: 'bg-orange-100 text-orange-800 border-orange-300',
      description: 'Chains required except 4WD/AWD with snow tires on all wheels',
    },
    CHAIN_CONTROL_LEVEL_R3: {
      label: 'R3',
      color: 'bg-red-100 text-red-800 border-red-300',
      description: 'Chains required on all vehicles, no exceptions',
    },
  };
  return levelMap[info.level] || null;
};

const getIncidentChip = (alert: Alert) => {
  const type = alert.incidentType?.toLowerCase() || '';

  if (type.includes('closure') || type.includes('closed')) {
    return { label: 'Closure', color: 'bg-red-100 text-red-800', icon: Ban };
  } else if (type.includes('construction') || type.includes('work')) {
    return { label: 'Construction', color: 'bg-orange-100 text-orange-800', icon: Construction };
  } else if (type.includes('hazard') || type.includes('debris')) {
    return { label: 'Hazard', color: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle };
  } else if (type.includes('weather') || type.includes('snow') || type.includes('ice')) {
    return { label: 'Weather', color: 'bg-blue-100 text-blue-800', icon: Snowflake };
  } else if (type.includes('vehicle') || type.includes('accident')) {
    return { label: 'Incident', color: 'bg-purple-100 text-purple-800', icon: Truck };
  }

  if (alert.severity === 'CRITICAL') {
    return { label: 'Critical', color: 'bg-red-100 text-red-800', icon: AlertTriangle };
  } else if (alert.severity === 'WARNING') {
    return { label: 'Warning', color: 'bg-orange-100 text-orange-800', icon: AlertTriangle };
  } else {
    return { label: 'Info', color: 'bg-blue-100 text-blue-800', icon: AlertTriangle };
  }
};

const getImpactChip = (impact: string | undefined) => {
  if (!impact) return null;

  const impactLower = impact.toLowerCase();
  if (impactLower.includes('severe') || impactLower.includes('major')) {
    return { label: 'Severe impact', color: 'bg-red-100 text-red-800' };
  } else if (impactLower.includes('moderate')) {
    return { label: 'Moderate impact', color: 'bg-orange-100 text-orange-800' };
  } else if (impactLower.includes('light') || impactLower.includes('minor')) {
    return { label: 'Light impact', color: 'bg-yellow-100 text-yellow-800' };
  }
  return { label: formatEnumValue(impact), color: 'bg-gray-100 text-gray-800' };
};

// Helper function to calculate average speed
const calculateAverageSpeed = (distanceKm: number | undefined, durationMinutes: number | undefined): string => {
  if (!distanceKm || !durationMinutes || durationMinutes === 0) return '';

  const speedKmh = (distanceKm / durationMinutes) * 60;
  const speedMph = speedKmh * 0.621371; // Convert to mph

  return `${Math.round(speedMph)} mph (${Math.round(speedKmh)} km/h)`;
};

const formatDistanceToRoute = (distanceMeters: number | undefined): string => {
  if (!distanceMeters) return '';

  const distanceMiles = distanceMeters * 0.000621371; // Convert meters to miles

  if (distanceMiles < 0.1) {
    return 'Very close';
  } else if (distanceMiles < 1) {
    return `${(distanceMiles * 5280).toFixed(0)} ft away`;
  } else {
    return `${distanceMiles.toFixed(1)} mi away`;
  }
};

export default function RouteDetailsDialog({ selectedRoute, onClose }: RouteDetailsDialogProps) {
  const [nearbyExpanded, setNearbyExpanded] = useState(true);

  const onRouteAlerts = selectedRoute.alerts.filter((alert) => alert.classification === 'ON_ROUTE');
  const nearbyAlerts = selectedRoute.alerts.filter((alert) => alert.classification === 'NEARBY');

  return (
    <Dialog onClose={onClose} maxWidth="2xl">
      <DialogHeader onClose={onClose}>
        <div className="flex-1 min-w-0">
          {/* Outcome-first header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 text-base sm:text-lg font-medium text-stone-800">
            <div className="font-semibold truncate">
              {selectedRoute.from} → {selectedRoute.to}
            </div>
            <div className="flex flex-wrap items-center text-sm sm:text-base mt-1 sm:mt-0">
              <span className="mx-2 text-stone-400 hidden sm:inline">•</span>
              {typeof selectedRoute.delayMinutes === 'number' && selectedRoute.delayMinutes > 0 && (
                <>
                  <span className="text-orange-600 bg-orange-50 px-2 py-1 rounded text-xs sm:text-sm font-medium">
                    +{selectedRoute.delayMinutes} min delay
                  </span>
                  {(selectedRoute.congestionLevel || selectedRoute.rawStatus) && (
                    <span className="mx-2 text-stone-400 hidden sm:inline">•</span>
                  )}
                </>
              )}
              {selectedRoute.congestionLevel && (
                <>
                  <span
                    className={`px-2 py-1 rounded text-xs sm:text-sm font-medium ${
                      selectedRoute.congestionLevel.toLowerCase() === 'clear'
                        ? 'text-green-700 bg-green-50'
                        : selectedRoute.congestionLevel.toLowerCase() === 'moderate'
                          ? 'text-yellow-700 bg-yellow-50'
                          : 'text-red-700 bg-red-50'
                    }`}
                  >
                    {formatEnumValue(selectedRoute.congestionLevel)} traffic
                  </span>
                  {selectedRoute.rawStatus && (
                    <span className="mx-2 text-stone-400 hidden sm:inline">•</span>
                  )}
                </>
              )}
              {selectedRoute.rawStatus && (
                <span
                  className={`px-2 py-1 rounded text-xs sm:text-sm font-medium ${
                    selectedRoute.rawStatus.toLowerCase() === 'closed'
                      ? 'text-red-700 bg-red-50'
                      : selectedRoute.rawStatus.toLowerCase() === 'restricted'
                        ? 'text-orange-700 bg-orange-50'
                        : 'text-green-700 bg-green-50'
                  }`}
                >
                  {formatEnumValue(selectedRoute.rawStatus)}
                </span>
              )}
            </div>
          </div>
        </div>
      </DialogHeader>

      <DialogContent>
        <div className="space-y-4 sm:space-y-6">
            {/* Route Metadata */}
            <div className="bg-stone-50 border border-stone-200 rounded-lg p-3 sm:p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 text-sm">
                {selectedRoute.distanceKm && (
                  <div>
                    <span className="text-stone-500 uppercase tracking-wide text-xs">Distance</span>
                    <div className="text-stone-700 font-medium">
                      {Math.round(selectedRoute.distanceKm * 0.621371)} mi ({selectedRoute.distanceKm} km)
                    </div>
                  </div>
                )}
                {calculateAverageSpeed(selectedRoute.distanceKm, selectedRoute.durationMinutes) && (
                  <div>
                    <span className="text-stone-500 uppercase tracking-wide text-xs">Average speed</span>
                    <div className="text-stone-700 font-medium">
                      {calculateAverageSpeed(selectedRoute.distanceKm, selectedRoute.durationMinutes)}
                    </div>
                  </div>
                )}
                {selectedRoute.statusExplanation && (
                  <div className="sm:col-span-2 lg:col-span-2">
                    <span className="text-stone-500 uppercase tracking-wide text-xs">Status details</span>
                    <div className="text-stone-700 font-medium">
                      {selectedRoute.statusExplanation}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Chain Control Section */}
            {selectedRoute.chainControlInfo &&
              selectedRoute.chainControlInfo.level !== 'CHAIN_CONTROL_LEVEL_NONE' &&
              selectedRoute.chainControlInfo.level !== 'CHAIN_CONTROL_LEVEL_UNSPECIFIED' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <Link className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-medium text-blue-900 text-lg">Chain Control</h3>
                        {(() => {
                          const display = getChainControlDisplay(selectedRoute.chainControlInfo!);
                          return display ? (
                            <span
                              className={`px-2 py-0.5 text-xs font-bold rounded border ${display.color}`}
                            >
                              {display.label}
                            </span>
                          ) : null;
                        })()}
                      </div>

                      {/* Description from API or fallback */}
                      <p className="text-blue-800 text-sm mb-3">
                        {selectedRoute.chainControlInfo.description ||
                          getChainControlDisplay(selectedRoute.chainControlInfo)?.description}
                      </p>

                      {/* Location and timing details */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        {selectedRoute.chainControlInfo.locationName && (
                          <div className="flex items-start space-x-2">
                            <MapPin className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <span className="text-blue-600 text-xs uppercase tracking-wide block">
                                Location
                              </span>
                              <span className="text-blue-800">
                                {selectedRoute.chainControlInfo.locationName}
                                {selectedRoute.chainControlInfo.direction &&
                                  ` (${selectedRoute.chainControlInfo.direction})`}
                              </span>
                            </div>
                          </div>
                        )}
                        {selectedRoute.chainControlInfo.effectiveTime && (
                          <div className="flex items-start space-x-2">
                            <Clock className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <span className="text-blue-600 text-xs uppercase tracking-wide block">
                                Effective
                              </span>
                              <span className="text-blue-800">
                                {formatHumanTime(selectedRoute.chainControlInfo.effectiveTime)}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Map link if coordinates available */}
                      {selectedRoute.chainControlInfo.latitude &&
                        selectedRoute.chainControlInfo.longitude && (
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${selectedRoute.chainControlInfo.latitude},${selectedRoute.chainControlInfo.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center space-x-1 text-blue-700 hover:text-blue-900 text-xs mt-3 underline"
                          >
                            <MapPin className="h-3 w-3" />
                            <span>View on map</span>
                          </a>
                        )}
                    </div>
                  </div>
                </div>
              )}

            {/* On Route Alerts */}
            {onRouteAlerts.length > 0 && (
              <div>
                <h3 className="font-medium text-stone-900 mb-4 text-lg">Affects your route</h3>
                <div className="space-y-3 sm:space-y-4">
                  {onRouteAlerts.map((alert, index) => {
                    const incidentChip = getIncidentChip(alert);
                    const impactChip = getImpactChip(alert.impact);
                    const IconComponent = incidentChip.icon;

                    return (
                      <div key={alert.id || index} className="border border-stone-200 rounded-lg p-3 sm:p-4 bg-white">
                        {/* Card title line */}
                        <div className="flex items-start space-x-3 mb-3">
                          <IconComponent className="h-5 w-5 text-stone-600 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <h4 className="font-medium text-stone-900 leading-tight capitalize">
                              {alert.locationDescription ? (
                                <>
                                  {alert.locationDescription}
                                  {alert.incidentType && ` (${formatEnumValue(alert.incidentType)})`}
                                </>
                              ) : (
                                alert.title
                              )}
                            </h4>

                            {/* Meta row with chips */}
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                              <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded ${incidentChip.color}`}>
                                {incidentChip.label}
                              </span>
                              {impactChip && (
                                <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded ${impactChip.color}`}>
                                  {impactChip.label}
                                </span>
                              )}
                              {alert.startTime && (
                                <span className="text-xs text-stone-500">
                                  {formatHumanTime(alert.startTime)}
                                </span>
                              )}
                              {alert.expectedEnd && (
                                <span className="text-xs text-stone-500">
                                  Est. {formatHumanTime(alert.expectedEnd)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Body text */}
                        <p className="text-stone-700 text-sm mb-3 ml-8">
                          {alert.description}
                        </p>


                        {/* More details - only show non-N/A fields */}
                        {(alert.location || alert.metadata || (alert.distanceToRouteMeters && alert.classification !== 'ON_ROUTE')) && (
                          <div className="mt-2 ml-4 sm:ml-8 p-2 sm:p-3 bg-stone-50 rounded text-xs">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {alert.location && (
                                <div>
                                  <span className="text-stone-500 uppercase tracking-wide text-xs">Coordinates</span>
                                  <div>
                                    <a
                                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(alert.location)}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:text-blue-700 underline"
                                    >
                                      {alert.location}
                                    </a>
                                  </div>
                                </div>
                              )}
                              {alert.distanceToRouteMeters && alert.classification !== 'ON_ROUTE' && (
                                <div>
                                  <span className="text-stone-500 uppercase tracking-wide text-xs">Distance</span>
                                  <div className="text-stone-700">{formatDistanceToRoute(alert.distanceToRouteMeters)}</div>
                                </div>
                              )}
                              {alert.metadata && Object.entries(alert.metadata).map(([key, value]) => {
                                const formattedValue = formatMetadataValue(String(value));
                                if (!formattedValue || formattedValue.toLowerCase() === 'none' || formattedValue.toLowerCase() === 'n/a') {
                                  return null;
                                }
                                return (
                                  <div key={key}>
                                    <span className="text-stone-500 uppercase tracking-wide text-xs">{formatEnumValue(key)}</span>
                                    <div className="text-stone-700">{formattedValue}</div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Nearby Alerts (Collapsible) */}
            {nearbyAlerts.length > 0 && (
              <div>
                <button
                  type="button"
                  onClick={() => setNearbyExpanded(!nearbyExpanded)}
                  className="flex items-center space-x-2 w-full text-left font-medium text-stone-900 hover:text-stone-700 transition-colors p-2 -m-2 rounded touch-manipulation"
                >
                  <span className="text-lg">Nearby ({nearbyAlerts.length})</span>
                  {nearbyExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>

                {nearbyExpanded && (
                  <div className="mt-4 space-y-2 sm:space-y-3">
                    {nearbyAlerts
                      .sort((a, b) => {
                        const severityOrder = { CRITICAL: 0, WARNING: 1, INFO: 2, ALERT_SEVERITY_UNSPECIFIED: 3 };
                        return severityOrder[a.severity] - severityOrder[b.severity];
                      })
                      .map((alert, index) => {
                        const incidentChip = getIncidentChip(alert);
                        const impactChip = getImpactChip(alert.impact);
                        const IconComponent = incidentChip.icon;

                        return (
                          <div key={alert.id || index} className="border border-stone-100 rounded-lg p-2 sm:p-3 bg-stone-50">
                            <div className="flex items-start space-x-3">
                              <IconComponent className="h-4 w-4 text-stone-500 mt-0.5 flex-shrink-0" />
                              <div className="flex-1">
                                <h4 className="font-medium text-stone-800 text-sm leading-tight capitalize">
                                  {alert.locationDescription ? (
                                    <>
                                      {alert.locationDescription}
                                      {alert.incidentType && ` (${formatEnumValue(alert.incidentType)})`}
                                    </>
                                  ) : (
                                    alert.title
                                  )}
                                </h4>

                                <div className="flex items-center space-x-2 mt-1">
                                  <span className={`inline-flex items-center px-1.5 py-0.5 text-xs font-medium rounded ${incidentChip.color}`}>
                                    {incidentChip.label}
                                  </span>
                                  {impactChip && (
                                    <span className={`inline-flex items-center px-1.5 py-0.5 text-xs font-medium rounded ${impactChip.color}`}>
                                      {impactChip.label}
                                    </span>
                                  )}
                                  {alert.startTime && (
                                    <span className="text-xs text-stone-500">
                                      {formatHumanTime(alert.startTime)}
                                    </span>
                                  )}
                                </div>

                                <p className="text-stone-600 text-xs mt-1 leading-relaxed">
                                  {alert.description}
                                </p>

                                {/* More details for nearby (smaller and de-emphasized) */}
                                {(alert.location || alert.metadata || (alert.distanceToRouteMeters && alert.classification !== 'ON_ROUTE')) && (
                                  <div className="mt-1 p-2 bg-stone-100 rounded text-xs">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                      {alert.location && (
                                        <div>
                                          <span className="text-stone-400 uppercase tracking-wide text-xs">Coordinates</span>
                                          <div>
                                            <a
                                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(alert.location)}`}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-blue-600 hover:text-blue-700 underline text-xs"
                                            >
                                              {alert.location}
                                            </a>
                                          </div>
                                        </div>
                                      )}
                                      {alert.distanceToRouteMeters && alert.classification !== 'ON_ROUTE' && (
                                        <div>
                                          <span className="text-stone-400 uppercase tracking-wide text-xs">Distance</span>
                                          <div className="text-stone-600 text-xs">{formatDistanceToRoute(alert.distanceToRouteMeters)}</div>
                                        </div>
                                      )}
                                      {alert.metadata && Object.entries(alert.metadata).map(([key, value]) => {
                                        const formattedValue = formatMetadataValue(String(value));
                                        if (!formattedValue || formattedValue.toLowerCase() === 'none' || formattedValue.toLowerCase() === 'n/a') {
                                          return null;
                                        }
                                        return (
                                          <div key={key}>
                                            <span className="text-stone-400 uppercase tracking-wide text-xs">{formatEnumValue(key)}</span>
                                            <div className="text-stone-600 text-xs">{formattedValue}</div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            )}

          {/* No alerts state */}
          {onRouteAlerts.length === 0 && nearbyAlerts.length === 0 && (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
              <h3 className="font-medium text-stone-900 mb-1">All clear on your route</h3>
              <p className="text-stone-600 text-sm">No incidents or alerts affecting this route.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}