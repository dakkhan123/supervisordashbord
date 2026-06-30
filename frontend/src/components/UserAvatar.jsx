import React from 'react';
import { useProfilePhoto } from '../hooks/useProfilePhoto';

const UserAvatar = ({ user, className, altText }) => {
  const { photo } = useProfilePhoto(user?.id);
  const userName = user?.worker?.name || user?.username || 'User';

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  if (photo) {
    return (
      <img
        src={photo}
        className={className}
        alt={altText || `Avatar of ${userName}`}
      />
    );
  }

  return (
    <div 
      className={`${className} flex items-center justify-center bg-gradient-to-br from-primary-container to-tertiary-container text-white font-bold tracking-widest`}
    >
      {getInitials(userName)}
    </div>
  );
};

export default UserAvatar;
