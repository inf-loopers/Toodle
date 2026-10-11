import { Link } from 'react-router-dom';
import Badge from './ui/Badge';

const labels = {
  yearOfStudy: 'Add your year of study',
  availability: 'Add availability',
  courseMark: 'Add or resubmit your course mark',
};
export default function OpportunityEligibility({
  eligibility,
  courseId,
  links = true,
  label = 'Eligible to submit',
}) {
  if (!eligibility)
    return <p className="text-xs text-slate-500">Eligibility has not been checked.</p>;
  const { status, reasons = [], missing = [], approvalReasons = [] } = eligibility;
  return (
    <div className="my-3 space-y-2 text-xs">
      <Badge
        tone={
          status === 'eligible'
            ? 'success'
            : status === 'profile_incomplete'
              ? 'warning'
              : 'neutral'
        }
      >
        {status === 'eligible'
          ? label
          : status === 'profile_incomplete'
            ? 'Profile incomplete'
            : 'Ineligible'}
      </Badge>
      {reasons.map((reason) => (
        <p key={reason}>{reason}</p>
      ))}
      {missing.map((item) => (
        <p key={item}>
          {labels[item] ?? item}
          {links && (
            <>
              :{' '}
              <Link
                className="text-primary underline"
                to={item === 'courseMark' ? `/courses/${courseId}` : '/profile'}
              >
                {item === 'courseMark' ? 'Add marks' : 'Complete profile'}
              </Link>
            </>
          )}
        </p>
      ))}
      {approvalReasons.map((reason) => (
        <p key={reason}>{reason}.</p>
      ))}
      {eligibility.hoursPerWeek != null && <p>Checked for {eligibility.hoursPerWeek}h per week.</p>}
      {status === 'eligible' && (
        <p>Checks use your current profile. Final approval rechecks eligibility.</p>
      )}
    </div>
  );
}
