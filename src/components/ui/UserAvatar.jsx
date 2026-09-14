import { getInitials } from '../../utils/helpers';

export default function UserAvatar({ user, size = 'md', className = '' }) {
  const sizes = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-20 w-20 text-2xl',
  };

  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-subtle font-bold text-primary ${sizes[size] || sizes.md} ${className}`}
    >
      {user?.avatarUrl ? (
        <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        getInitials(user?.name || user?.email)
      )}
    </div>
  );
}
