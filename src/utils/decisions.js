// Review decisions (approvals, rejections, disputes, reversals) always name the
// reviewer who made them, so co-coordinators can see who decided what.

export const formatDecisionTime = (value) =>
  new Date(value).toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' });

export const decisionLine = (verb, reviewer, at) =>
  reviewer?.name ? `${verb} by ${reviewer.name}${at ? ` · ${formatDecisionTime(at)}` : ''}` : null;
