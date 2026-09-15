/// Returns the statuses an organizer can select from the current status.
///
/// This intentionally mirrors the mobile publish flow, not the complete API
/// state machine: completed and cancelled tournaments remain read-only here.
Set<String> enabledStatusOptions(String currentStatus) {
  switch (currentStatus.toUpperCase()) {
    case 'DRAFT':
      return {'DRAFT', 'OPEN'};
    case 'OPEN':
      return {'OPEN', 'IN_PROGRESS'};
    default:
      return {currentStatus};
  }
}
