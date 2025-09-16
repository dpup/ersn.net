import { useState } from 'react';
import {
  X,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Copy,
  Construction,
  Ban,
  Truck,
  Snowflake,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';

// Import types and helper functions from the main component
interface Alert {
  id?: string;
  type: 'road' | 'weather';
  severity: 'CRITICAL' | 'WARNING' | 'INFO' | 'ALERT_SEVERITY_UNSPECIFIED';
  classification?: 'ON_ROUTE' | 'NEARBY' | 'DISTANT' | 'ALERT_CLASSIFICATION_UNSPECIFIED';
  title: string;
  description: string;
  condensedSummary?: string;
  location?: string;
  locationDescription?: string;
  incidentType?: string;
  impact?: string;
  startTime?: string;
  expectedEnd?: string;
  metadata?: Record<string, unknown>;
}

interface RoadSegment {
  from: string;
  to: string;
  status: 'clear' | 'delays' | 'restrictions' | 'closed';
  delayMinutes?: number;
  description?: string;
  alertCount: number;
  alerts: Alert[];
  congestionLevel?: string;
  durationMinutes?: number;
  distanceKm?: number;
  chainControl?: string;
  rawStatus?: string;
  statusExplanation?: string;
}

interface RouteDetailsDialogProps {
  selectedRoute: RoadSegment;
  onClose: () => void;
}

// Helper functions (duplicated from main component - could be moved to utils)
const formatEnumValue = (value: string | undefined | null): string => {
  if (!value) return '';

  let formatted = value
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .replace(/^\w/, c => c.toUpperCase())
    .trim();

  if (formatted.toLowerCase() === 'restricted') {
    formatted = 'Restrictions';
  }

  return formatted;
};

const formatHumanTime = (timestamp: string | undefined): string => {
  if (!timestamp) return '';

  try {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMs > 0) {
      if (diffMins < 60) {
        return diffMins <= 1 ? 'Just now' : `${diffMins} min ago`;
      } else if (diffHours < 24) {
        return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      } else if (diffDays < 7) {
        return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
      }
    }

    const isToday = date.toDateString() === now.toDateString();
    const isThisYear = date.getFullYear() === now.getFullYear();

    if (isToday) {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } else if (isThisYear) {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    }
  } catch (error) {
    return timestamp;
  }
};

const formatMetadataValue = (value: string): string => {
  const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
  if (isoDateRegex.test(value)) {
    return formatHumanTime(value) || value;
  }
  return formatEnumValue(value);
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

export default function RouteDetailsDialog({ selectedRoute, onClose }: RouteDetailsDialogProps) {
  const [nearbyExpanded, setNearbyExpanded] = useState(true);

  const onRouteAlerts = selectedRoute.alerts.filter(alert => alert.classification === 'ON_ROUTE');
  const nearbyAlerts = selectedRoute.alerts.filter(alert => alert.classification === 'NEARBY');

  return (
    <div
      className="fixed inset-0 bg-black/20 flex items-center justify-center p-2 sm:p-4 z-50 backdrop-blur-sm"
      onClick={onClose}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white rounded-lg w-full max-w-4xl max-h-[95vh] sm:max-h-[85vh] flex flex-col sm:min-w-[600px]"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        role="document"
      >
        {/* Header Section - Fixed */}
        <div className="p-4 sm:p-6 border-b border-stone-200 flex-shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              {/* Outcome-first header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 text-base sm:text-lg font-medium text-stone-800">
                <div className="font-semibold">{selectedRoute.from} → {selectedRoute.to}</div>
                <div className="flex flex-wrap items-center text-sm sm:text-base mt-1 sm:mt-0">
                  <span className="mx-2 text-stone-400">•</span>
                  {typeof selectedRoute.delayMinutes === 'number' && selectedRoute.delayMinutes > 0 && (
                    <>
                      <span className="text-orange-600">+{selectedRoute.delayMinutes} min delay</span>
                      {(selectedRoute.congestionLevel || selectedRoute.rawStatus) && <span className="mx-2 text-stone-400">•</span>}
                    </>
                  )}
                  {selectedRoute.congestionLevel && (
                    <>
                      <span className={`${selectedRoute.congestionLevel.toLowerCase() === 'clear' ? 'text-green-600' :
                        selectedRoute.congestionLevel.toLowerCase() === 'moderate' ? 'text-yellow-600' : 'text-red-600'}`}>
                        {formatEnumValue(selectedRoute.congestionLevel)} traffic
                      </span>
                      {selectedRoute.rawStatus && <span className="mx-2 text-stone-400">•</span>}
                    </>
                  )}
                  {selectedRoute.rawStatus && (
                    <span className={`${selectedRoute.rawStatus.toLowerCase() === 'closed' ? 'text-red-600' :
                      selectedRoute.rawStatus.toLowerCase() === 'restricted' ? 'text-orange-600' : 'text-green-600'}`}>
                      {formatEnumValue(selectedRoute.rawStatus)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="text-stone-400 hover:text-stone-600 transition-colors ml-4"
              aria-label="Close dialog"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
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
                            <h4 className="font-medium text-stone-900 leading-tight">
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
                                  Started {formatHumanTime(alert.startTime)}
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

                        {/* Action buttons */}
                        <div className="flex items-center space-x-4 text-sm ml-8">
                          <button
                            type="button"
                            className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 transition-colors"
                          >
                            <ExternalLink className="h-3 w-3" />
                            <span>Open on map</span>
                          </button>
                        </div>

                        {/* More details - only show non-N/A fields */}
                        {(alert.location || alert.metadata) && (
                          <div className="mt-2 ml-4 sm:ml-8 p-2 sm:p-3 bg-stone-50 rounded text-xs">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {alert.location && (
                                <div>
                                  <div className="flex items-center space-x-2">
                                    <span className="text-stone-500 uppercase tracking-wide text-xs">Coordinates</span>
                                    <button
                                      type="button"
                                      className="text-stone-400 hover:text-stone-600"
                                      aria-label="Copy coordinates"
                                    >
                                      <Copy className="h-3 w-3" />
                                    </button>
                                  </div>
                                  <div className="text-stone-700">{alert.location}</div>
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
                  className="flex items-center space-x-2 w-full text-left font-medium text-stone-900 hover:text-stone-700 transition-colors"
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
                                <h4 className="font-medium text-stone-800 text-sm leading-tight">
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
                                {(alert.location || alert.metadata) && (
                                  <div className="mt-1 p-2 bg-stone-100 rounded text-xs">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                                      {alert.location && (
                                        <div>
                                          <div className="flex items-center space-x-1">
                                            <span className="text-stone-400 uppercase tracking-wide text-xs">Coordinates</span>
                                            <button
                                              type="button"
                                              className="text-stone-300 hover:text-stone-500"
                                              aria-label="Copy coordinates"
                                            >
                                              <Copy className="h-2 w-2" />
                                            </button>
                                          </div>
                                          <div className="text-stone-600 text-xs">{alert.location}</div>
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
        </div>
      </div>
    </div>
  );
}