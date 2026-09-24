/** Canonical WebSocket event names for NWIS */
export const WS_EVENTS = {
  // Connection lifecycle
  CONNECT:    'connection',
  DISCONNECT: 'disconnect',

  // Well-level updates
  WELL_UPDATE:     'well:update',
  DRILLING_UPDATE: 'drilling:update',

  // Risks (implementation.md §9.1 / READEME §34)
  RISK_DETECTED: 'risk:detected',
  RISK_UPDATED:  'risk:updated',

  // Alerts
  ALERT_NEW:    'alert:new',
  ALERT_UPDATE: 'alert:update',

  // Recommendations
  RECOMMENDATION_NEW: 'recommendation:new',

  // Knowledge search results pushed to subscribers
  KNOWLEDGE_RESULT: 'knowledge:result',

  // Client → Server: subscribe to a well room
  JOIN_WELL:  'well:join',
  LEAVE_WELL: 'well:leave',
} as const;

export type WsEventName = (typeof WS_EVENTS)[keyof typeof WS_EVENTS];
