function percentage(value, targetValue) {
  return targetValue > 0 ? (value / targetValue) * 100 : 0;
}

export function getGoalProgress(goal) {
  const entries = [...(goal.entries ?? [])].sort((a, b) => (
    new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime()
  ));
  const current = goal.aggregation === 'LATEST'
    ? (entries[0]?.value ?? 0)
    : entries.reduce((sum, entry) => sum + entry.value, 0);
  const rawPercentage = percentage(current, goal.targetValue);

  return {
    current,
    percentage: Math.max(0, rawPercentage),
    exceeded: rawPercentage > 100,
  };
}

export function getProjectProgress(project) {
  const goals = (project.goals ?? []).map((goal) => ({
    goalId: goal.id,
    metricKey: goal.metricKey,
    ...getGoalProgress(goal),
  }));
  const mean = goals.length
    ? goals.reduce((sum, goal) => sum + Math.min(goal.percentage, 100), 0) / goals.length
    : 0;

  return {
    percentage: mean,
    goals,
  };
}

export function getScheduleHealth(project, progress = getProjectProgress(project)) {
  if (project.status === 'COMPLETED') return 'COMPLETED';

  const now = new Date();
  const start = new Date(project.startDate);
  const end = new Date(project.endDate);
  if (now < start) return 'NOT_STARTED';
  if (now > end) return 'OVERDUE';

  const duration = end.getTime() - start.getTime();
  const elapsed = now.getTime() - start.getTime();
  const expected = duration > 0 ? (elapsed / duration) * 100 : 100;
  return progress.percentage < expected - 15 ? 'AT_RISK' : 'ON_TRACK';
}

export function getProjectProgressSummary(project) {
  const progress = getProjectProgress(project);
  return {
    ...progress,
    scheduleHealth: getScheduleHealth(project, progress),
  };
}
