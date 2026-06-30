import { useState, useEffect } from 'react';

export function useProfilePhoto(userId) {
  const [photo, setPhoto] = useState(null);

  useEffect(() => {
    if (!userId) {
      setPhoto(null);
      return;
    }

    const key = `profilePhoto_${userId}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      setPhoto(stored);
    } else {
      setPhoto(null);
    }

    const handleStorageChange = (e) => {
      if (e.key === key) {
        setPhoto(e.newValue);
      }
    };

    const handleCustomEvent = (e) => {
      if (e.detail.userId === userId) {
        setPhoto(e.detail.photo);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('profilePhotoUpdated', handleCustomEvent);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('profilePhotoUpdated', handleCustomEvent);
    };
  }, [userId]);

  const updatePhoto = (newPhoto) => {
    if (!userId) return;
    const key = `profilePhoto_${userId}`;
    if (newPhoto) {
      localStorage.setItem(key, newPhoto);
    } else {
      localStorage.removeItem(key);
    }
    setPhoto(newPhoto);
    window.dispatchEvent(new CustomEvent('profilePhotoUpdated', { detail: { userId, photo: newPhoto } }));
  };

  return { photo, updatePhoto };
}
