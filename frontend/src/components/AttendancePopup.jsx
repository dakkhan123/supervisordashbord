import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

const OFFICE_LAT = 18.56075;
const OFFICE_LON = 73.94442;
const MAX_RADIUS_METERS = 100;

const AttendancePopup = ({ user, onLoginSuccess, showToast, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [gpsData, setGpsData] = useState(null);
  const [address, setAddress] = useState('');
  const [gpsError, setGpsError] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [ipAddress, setIpAddress] = useState('');
  const [deviceInfo, setDeviceInfo] = useState('Desktop');
  const [distanceFromOffice, setDistanceFromOffice] = useState(null);
  const [isWithinRange, setIsWithinRange] = useState(false);
  const [attendanceRecord, setAttendanceRecord] = useState(null);
  const [simulateOffice, setSimulateOffice] = useState(false);

  // Live Digital Clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Online / Offline Detection
  useEffect(() => {
    const goOnline = () => {
      setIsOnline(true);
      showToast('Connection restored. System is online.', 'success');
    };
    const goOffline = () => {
      setIsOnline(false);
      showToast('You are offline. Offline attendance will sync when connection restores.', 'warning');
    };

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, [showToast]);

  // Fetch IP & Device detection
  useEffect(() => {
    const detectDevice = () => {
      const ua = navigator.userAgent.toLowerCase();
      if (/mobile|android|iphone|ipad|phone/i.test(ua)) {
        setDeviceInfo('Mobile Device');
      } else {
        setDeviceInfo('Desktop Console');
      }
    };

    const getIp = async () => {
      try {
        const res = await fetch('https://api.ipify.org?format=json');
        if (res.ok) {
          const data = await res.json();
          setIpAddress(data.ip);
        }
      } catch (e) {
        setIpAddress('192.168.1.15'); // local router placeholder
      }
    };

    detectDevice();
    getIp();
  }, []);

  // Haversine distance calculator
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371000; // metres
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // in meters
  };

  // Reverse Geocoding via Nominatim
  const getAddress = async (lat, lon) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`,
        {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'SmartOps/1.0'
          }
        }
      );
      if (response.ok) {
        const data = await response.json();
        return data.display_name || `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
      }
    } catch (e) {
      console.error('Nominatim reverse geocode failed', e);
    }
    return `Kharadi, Pune, Maharashtra, India (Resolved from GPS: ${lat.toFixed(4)}, ${lon.toFixed(4)})`;
  };

  // Fetch coordinates
  const fetchLocation = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }

    setGpsLoading(true);
    setGpsError('');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        let finalLat = latitude;
        let finalLon = longitude;

        if (simulateOffice) {
          finalLat = OFFICE_LAT;
          finalLon = OFFICE_LON;
        }

        setGpsData({ latitude: finalLat, longitude: finalLon });

        // Calculate distance
        const dist = calculateDistance(finalLat, finalLon, OFFICE_LAT, OFFICE_LON);
        setDistanceFromOffice(Math.round(dist));
        setIsWithinRange(dist <= MAX_RADIUS_METERS || simulateOffice);

        // Fetch address
        const addr = await getAddress(finalLat, finalLon);
        setAddress(addr);
        setGpsLoading(false);
      },
      (error) => {
        console.error(error);
        if (simulateOffice) {
          // Allow simulation even if gps is denied
          const mockLat = OFFICE_LAT;
          const mockLon = OFFICE_LON;
          setGpsData({ latitude: mockLat, longitude: mockLon });
          setDistanceFromOffice(0);
          setIsWithinRange(true);
          setAddress('Kharadi, Pune, Maharashtra, India (Simulated Office Center)');
          setGpsLoading(false);
          return;
        }
        setGpsError('Location permission denied. GPS access is required to log shifts.');
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Trigger location fetch automatically
  useEffect(() => {
    if (user && isOpen) {
      fetchLocation();
    }
  }, [user, isOpen, simulateOffice]);

  // Check if today's attendance is already marked
  const checkTodayStatus = async () => {
    if (!user) return;
    try {
      const res = await api.getTodayAttendance();
      if (res.success) {
        setAttendanceRecord(res.data);
        // If not checked in, we open the modal
        if (!res.data || !res.data.checkIn) {
          setIsOpen(true);
        } else {
          setIsOpen(false);
        }
      }
    } catch (err) {
      console.error('Failed to get today attendance', err);
    }
  };

  useEffect(() => {
    checkTodayStatus();
  }, [user]);

  // Handle Simulate Office checkbox change
  useEffect(() => {
    if (user && isOpen) {
      fetchLocation();
    }
  }, [simulateOffice]);

  // Submit check-in
  const handleCheckIn = async () => {
    if (!isOnline) {
      showToast('Cannot mark attendance while offline.', 'error');
      return;
    }
    if (!gpsData) {
      showToast('GPS coordinates are required to check in.', 'error');
      return;
    }
    if (!isWithinRange) {
      showToast(`Out of range. You must be within ${MAX_RADIUS_METERS} meters of Pune office.`, 'error');
      return;
    }

    try {
      setLoading(true);
      const res = await api.checkIn({
        latitude: gpsData.latitude,
        longitude: gpsData.longitude,
        address,
        ipAddress,
        device: deviceInfo,
        isWithinRange,
        shift: user.worker?.shiftTiming || '9:00 AM - 6:00 PM',
        remarks: simulateOffice ? 'Checked in via location simulator' : ''
      });

      if (res.success) {
        showToast('Shift checked in successfully!', 'success');
        setAttendanceRecord(res.data);
        setIsOpen(false);
        if (onLoginSuccess) {
          // Trigger parent dashboard refreshes
          onLoginSuccess(user);
        }
      } else {
        showToast(res.error || 'Failed to check in', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Connection to auth server failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Submit check-out
  const handleCheckOut = async () => {
    if (!isOnline) {
      showToast('Cannot mark checkout while offline.', 'error');
      return;
    }
    if (!gpsData) {
      showToast('GPS coordinates are required to check out.', 'error');
      return;
    }

    try {
      setLoading(true);
      const res = await api.checkOut({
        latitude: gpsData.latitude,
        longitude: gpsData.longitude,
        address,
        ipAddress,
        device: deviceInfo,
        isWithinRange
      });

      if (res.success) {
        showToast('Shift checked out successfully!', 'success');
        setAttendanceRecord(res.data);
        setIsOpen(false);
      } else {
        showToast(res.error || 'Failed to check out', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Connection to auth server failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!user || !isOpen) return null;

  // Formatting strings
  const formattedDate = currentTime.toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const formattedTime = currentTime.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  const profileChar = (user.worker?.name || user.username || 'S').charAt(0);
  const employeeName = user.worker?.name || user.username || 'Employee';
  const employeeId = user.worker?.employeeId || user.employeeId || 'EMP-TEMP';
  const department = user.worker?.department || user.department || 'Operations';
  const role = user.worker?.role || user.role || 'Worker';
  const assignedSite = user.worker?.assignedSite || 'Pune Head Office';
  const shiftTiming = user.worker?.shiftTiming || '9:00 AM - 6:00 PM';

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-[640px] bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto transition-all animate-scale-up">
        
        {/* Top Header Section */}
        <div className="bg-teal-950/40 px-8 py-6 border-b border-teal-900/40 relative">
          <div className="absolute top-0 right-0 p-4">
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${isOnline ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`}></span>
              {isOnline ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>

          <h2 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span className="material-symbols-outlined text-teal-400 text-2xl animate-pulse">fingerprint</span>
            Mark Today's Attendance
          </h2>
          <p className="text-xs text-teal-300/80 font-medium mt-1">
            Please log your shift check-in to begin operational workflow access.
          </p>
        </div>

        {/* Info Grid Container */}
        <div className="p-6 md:p-8 flex flex-col gap-6">

          {/* User Profile Card */}
          <div className="bg-slate-950/50 border border-slate-800/80 rounded-2xl p-4 flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-teal-500/10 border-2 border-teal-500/30 flex items-center justify-center font-extrabold text-teal-400 text-xl shadow-inner">
              {profileChar}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-sm md:text-base text-white truncate">{employeeName}</h4>
              <p className="text-[10px] text-teal-300 font-bold uppercase tracking-wider mt-0.5">{role} • {department}</p>
              
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-2.5 text-[11px] font-semibold text-slate-400 border-t border-slate-800/50 pt-2.5">
                <div className="flex items-center gap-1">
                  <span className="text-[9px] text-slate-500 uppercase">ID:</span>
                  <span className="text-slate-300 font-mono">{employeeId}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[9px] text-slate-500 uppercase">Shift:</span>
                  <span className="text-slate-300">{shiftTiming}</span>
                </div>
                <div className="flex items-center gap-1 col-span-2">
                  <span className="text-[9px] text-slate-500 uppercase">Site:</span>
                  <span className="text-slate-300 truncate">{assignedSite}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Live Date, Time & Status Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Clock & Date */}
            <div className="bg-slate-950/30 border border-slate-800/40 rounded-2xl p-4.5 flex flex-col justify-between gap-3">
              <div>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">LIVE SESSION CHRONOMETER</span>
                <h3 className="text-2xl font-black font-mono text-teal-400 tracking-tight mt-1">{formattedTime}</h3>
              </div>
              <p className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                {formattedDate}
              </p>
            </div>

            {/* Attendance Status */}
            <div className="bg-slate-950/30 border border-slate-800/40 rounded-2xl p-4.5 flex flex-col justify-between gap-3">
              <div>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">CURRENT SHIFT STATUS</span>
                <h3 className={`text-base font-extrabold tracking-tight mt-1 flex items-center gap-1.5 ${
                  attendanceRecord?.checkOut ? 'text-rose-400' : attendanceRecord?.checkIn ? 'text-emerald-400' : 'text-amber-400'
                }`}>
                  <span className="w-2 h-2 rounded-full bg-current animate-pulse"></span>
                  {attendanceRecord?.checkOut ? 'Checked Out' : attendanceRecord?.checkIn ? 'Checked In' : 'Awaiting Check-In'}
                </h3>
              </div>
              <div className="text-[11px] font-semibold text-slate-400 border-t border-slate-800/40 pt-2 flex justify-between items-center">
                <span>IP: <span className="font-mono text-slate-300">{ipAddress || 'Resolving...'}</span></span>
                <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-mono">{deviceInfo}</span>
              </div>
            </div>
          </div>

          {/* GPS Coordinates & Geofencing Card */}
          <div className="bg-slate-950/50 border border-slate-800/60 rounded-2xl p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">my_location</span>
                GPS Geolocation & Geofencing
              </span>
              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                gpsData ? (isWithinRange ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400') : 'bg-slate-800 text-slate-400'
              }`}>
                {gpsData ? (isWithinRange ? 'Within Office Range' : 'Out of Geofence') : 'GPS Awaiting'}
              </span>
            </div>

            {gpsError ? (
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl flex items-start gap-2">
                <span className="material-symbols-outlined text-[18px] mt-0.5">warning</span>
                <div>
                  <p className="font-bold">Geolocation Required</p>
                  <p className="font-medium mt-0.5 text-rose-300/80">{gpsError}</p>
                </div>
              </div>
            ) : gpsLoading ? (
              <div className="py-4 text-center flex flex-col items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-teal-400"></div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Syncing GPS coordinates with satellite...</p>
              </div>
            ) : gpsData ? (
              <div className="flex flex-col gap-2.5 text-xs">
                <div className="grid grid-cols-2 gap-2 text-slate-400 font-mono text-[11px]">
                  <div>Latitude: <span className="text-white">{gpsData.latitude.toFixed(5)}</span></div>
                  <div>Longitude: <span className="text-white">{gpsData.longitude.toFixed(5)}</span></div>
                </div>
                {distanceFromOffice !== null && (
                  <p className="text-[11px] text-slate-400">
                    Distance from office: <span className={`font-bold ${isWithinRange ? 'text-emerald-400' : 'text-rose-400'}`}>{distanceFromOffice} meters</span> 
                    <span className="text-slate-500"> (Allowed limit: {MAX_RADIUS_METERS}m)</span>
                  </p>
                )}
                {address && (
                  <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-300 leading-relaxed font-semibold text-[11px]">
                    {address}
                  </div>
                )}
              </div>
            ) : (
              <div className="py-3 text-center text-xs text-slate-500 font-medium italic">
                Awaiting GPS coordinate check. Click "Get Current Location" to retrieve location data.
              </div>
            )}

            {/* Simulation controls for test runs */}
            <div className="flex items-center gap-2 border-t border-slate-800/40 pt-3 mt-1">
              <input
                type="checkbox"
                id="simulateOfficeCheckbox"
                checked={simulateOffice}
                onChange={(e) => setSimulateOffice(e.target.checked)}
                className="w-3.5 h-3.5 accent-teal-500 cursor-pointer"
              />
              <label htmlFor="simulateOfficeCheckbox" className="text-[11px] text-teal-300 font-bold cursor-pointer select-none">
                Simulate Office Location coordinates (Developers / Testing)
              </label>
            </div>
          </div>
        </div>

        {/* Action Controls Section */}
        <div className="bg-slate-950/80 px-8 py-5 border-t border-slate-800/60 flex items-center justify-between flex-wrap gap-4">
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-4.5 py-2.5 rounded-lg border border-rose-500/20 text-rose-400 hover:bg-rose-500/10 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">logout</span>
            Logout
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchLocation}
              disabled={gpsLoading || loading}
              className="flex items-center gap-1.5 px-4.5 py-2.5 rounded-lg border border-slate-800 text-slate-300 hover:bg-slate-800 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[16px]">refresh</span>
              Sync Location
            </button>

            {!attendanceRecord?.checkIn ? (
              <button
                onClick={handleCheckIn}
                disabled={loading || gpsLoading || !gpsData || !isWithinRange}
                className="flex items-center gap-1.5 px-6 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-black uppercase tracking-wider transition-all shadow-md cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Verifying...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">login</span>
                    Mark Check-In
                  </>
                )}
              </button>
            ) : !attendanceRecord?.checkOut ? (
              <button
                onClick={handleCheckOut}
                disabled={loading || gpsLoading || !gpsData}
                className="flex items-center gap-1.5 px-6 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-black uppercase tracking-wider transition-all shadow-md cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Verifying...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">logout</span>
                    Mark Check-Out
                  </>
                )}
              </button>
            ) : (
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Shift Complete</span>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default AttendancePopup;
