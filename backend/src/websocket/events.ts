/** Canonical WebSocket event names for NWIS */
export const WS_EVENTS = {
  // Connection lifecycle
  CONNECT:    'connection',
  DISCONNECT: 'disconnect',

  // Well-level updates
  WELL_UPDATE:     'well:update',
  DRILLING_UPDATE: 'drilling:update',

  // Alerts
  ALERT_NEW:    'alert:new',
  ALERT_UPDATE: 'alert:update',

  // Recommendations
  RECOMMENDATION_NEW: 'recommendation:new',

  // Client → Server: subscribe to a well room
  JOIN_WELL:  'well:join',
  LEAVE_WELL: 'well:leave',
} as const;

export type WsEventName = (typeof WS_EVENTS)[keyof typeof WS_EVENTS];
