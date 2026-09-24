export function mapEventTypeToEnum(type: string): "mud_loss" | "kick" | "stuck_pipe" | "fishing" | "npt" | "torque_spike" | "pressure_anomaly" | "cementing_issue" | "casing_issue" | "well_control" | "blowout" | "other" {
  const lower = type.toLowerCase();
  if (lower.includes('mud loss')) return 'mud_loss';
  if (lower.includes('stuck pipe')) return 'stuck_pipe';
  if (lower.includes('kick') || lower.includes('well control')) return 'kick';
  if (lower.includes('torque spike')) return 'torque_spike';
  if (lower.includes('pressure') || lower.includes('overpressure')) return 'pressure_anomaly';
  if (lower.includes('cementing')) return 'cementing_issue';
  if (lower.includes('casing')) return 'casing_issue';
  if (lower.includes('fishing')) return 'fishing';
  if (lower.includes('npt') || lower.includes('non productive time')) return 'npt';
  if (lower.includes('blowout')) return 'blowout';
  return 'other';
}

export function mapSeverityToEnum(severity: string | undefined): "low" | "medium" | "high" | "critical" {
  if (!severity) return 'medium';
  const lower = severity.toLowerCase();
  if (lower.includes('critical') || lower.includes('severe')) return 'critical';
  if (lower.includes('high')) return 'high';
  if (lower.includes('low')) return 'low';
  return 'medium';
}
