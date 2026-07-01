import { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { api } from '../services/api';
import PrintableLabel from '../components/PrintableLabel';

const ScanItemQR = ({ showToast, triggerRefresh, onReorderClick, user }) => {
  const [scannerActive, setScannerActive] = useState(true);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  
  const [scannedItem, setScannedItem] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [notFoundSku, setNotFoundSku] = useState('');
  const [itemHistory, setItemHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  // Manual Search States
  const [manualQuery, setManualQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchingManual, setSearchingManual] = useState(false);
  const [isManualSearchTab, setIsManualSearchTab] = useState(false);
  
  // Stock Update States
  const [updatingStock, setUpdatingStock] = useState(false);
  const [updateQty, setUpdateQty] = useState(0);
  const [updateType, setUpdateType] = useState('add'); // 'add' or 'dispatch'
  const [updatingServer, setUpdatingServer] = useState(false);

  // Label print modal
  const [showPrintModal, setShowPrintModal] = useState(false);

  const html5QrCodeRef = useRef(null);

  const fetchItemHistory = useCallback(async (sku) => {
    setLoadingHistory(true);
    try {
      const res = await api.getHistory();
      if (res.success && res.data) {
        const filtered = res.data.filter(log => log.sku === sku);
        setItemHistory(filtered);
      }
    } catch (err) {
      console.error("Failed to fetch item history logs:", err);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  const lookupSku = useCallback(async (sku) => {
    try {
      setNotFound(false);
      setScannedItem(null);
      setItemHistory([]);
      
      const res = await api.getItemBySku(sku);
      if (res.success && res.data) {
        setScannedItem(res.data);
        fetchItemHistory(res.data.sku);
        setUpdatingStock(false);
      } else {
        setNotFound(true);
        setNotFoundSku(sku);
      }
    } catch (err) {
      console.error("Lookup SKU failed:", err);
      setNotFound(true);
      setNotFoundSku(sku);
    }
  }, [fetchItemHistory]);

  const handleScanSuccess = useCallback(async (decodedText) => {
    showToast(`Successfully scanned SKU: ${decodedText}`, 'success');
    
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
      } catch (e) {
        console.error("Failed to stop scanner", e);
      }
    }
    setScannerActive(false);
    await lookupSku(decodedText);
  }, [showToast, lookupSku]);

  // Initialize camera and start scanning
  useEffect(() => {
    let html5QrCodeInstance = null;

    if (scannerActive && !isManualSearchTab) {
      setTimeout(() => {
        setCameraLoading(true);
        setCameraError(null);
        setNotFound(false);
      }, 0);

      // Create a fresh instance
      html5QrCodeInstance = new Html5Qrcode("reader");
      html5QrCodeRef.current = html5QrCodeInstance;

      Html5Qrcode.getCameras().then(devices => {
        setCameras(devices);
        if (devices.length > 0) {
          let deviceId = selectedCameraId;
          if (!deviceId) {
            const backCam = devices.find(device => device.label.toLowerCase().includes('back') || device.label.toLowerCase().includes('environment'));
            deviceId = backCam ? backCam.id : devices[0].id;
            setSelectedCameraId(deviceId);
          }

          html5QrCodeInstance.start(
            deviceId,
            {
              fps: 12,
              qrbox: (width, height) => {
                const size = Math.min(width, height) * 0.65;
                return { width: size, height: size };
              }
            },
            (decodedText) => {
              handleScanSuccess(decodedText);
            },
            () => {
              // silently ignore scanning frame noise
            }
          ).then(() => {
            setCameraLoading(false);
          }).catch(err => {
            console.error("Error starting camera stream:", err);
            setCameraError("Could not start camera feed. Please verify camera permissions and availability.");
            setCameraLoading(false);
          });
        } else {
          setCameraError("No video input devices (cameras) detected.");
          setCameraLoading(false);
        }
      }).catch(() => {
        setCameraError("Camera permission denied. Enable browser camera access.");
        setCameraLoading(false);
      });
    }

    return () => {
      if (html5QrCodeInstance) {
        if (html5QrCodeInstance.isScanning) {
          html5QrCodeInstance.stop().catch(err => console.error("Error stopping scanner:", err));
        }
      }
    };
  }, [scannerActive, selectedCameraId, isManualSearchTab, handleScanSuccess]);

  const handleManualSearch = async (e) => {
    e.preventDefault();
    if (!manualQuery.trim()) return;

    setSearchingManual(true);
    setSearchResults([]);
    try {
      const res = await api.searchInventory(manualQuery);
      if (res.success && res.data) {
        setSearchResults(res.data);
        if (res.data.length === 0) {
          showToast('No matching items found', 'error');
        }
      } else {
        showToast('Search query failed', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Search request failed', 'error');
    } finally {
      setSearchingManual(false);
    }
  };

  const selectManualItem = (item) => {
    setScannedItem(item);
    setNotFound(false);
    fetchItemHistory(item.sku);
    setIsManualSearchTab(false);
    setScannerActive(false);
    setUpdatingStock(false);
  };

  const handleStockUpdate = async (e) => {
    e.preventDefault();
    if (updateQty <= 0) {
      showToast('Quantity must be greater than zero', 'error');
      return;
    }

    setUpdatingServer(true);
    try {
      const currentQty = scannedItem.qty;
      let newQty = currentQty;
      
      if (updateType === 'add') {
        newQty += updateQty;
      } else {
        newQty -= updateQty;
        if (newQty < 0) {
          showToast('Insufficient stock. Quantity cannot drop below zero.', 'error');
          setUpdatingServer(false);
          return;
        }
      }

      const res = await api.updateItem(scannedItem._id, {
        qty: newQty,
        op: user?.worker?.name || user?.username || 'User'
      });

      if (res.success) {
        showToast(`Stock updated successfully. New quantity: ${newQty}`, 'success');
        setScannedItem(res.data);
        fetchItemHistory(res.data.sku);
        setUpdatingStock(false);
        setUpdateQty(0);
        if (triggerRefresh) triggerRefresh();
      } else {
        showToast(res.error || 'Failed to update stock', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error connecting to database server', 'error');
    } finally {
      setUpdatingServer(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const resetScanner = () => {
    setScannedItem(null);
    setNotFound(false);
    setNotFoundSku('');
    setItemHistory([]);
    setScannerActive(true);
    setIsManualSearchTab(false);
  };

  // Check inventory stock status
  const getStockStatus = (item) => {
    if (item.qty === 0) return { label: 'Out Of Stock', color: 'bg-error text-white border-error' };
    if (item.qty <= item.threshold) return { label: 'Low Stock', color: 'bg-tertiary-container/30 text-tertiary border-tertiary/20' };
    return { label: 'In Stock', color: 'bg-primary/10 text-primary border-primary/20' };
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Dynamic styles for print layout and glow animation */}
      <style>{`
        @keyframes scanBeam {
          0%, 100% { top: 0%; opacity: 0.3; }
          50% { top: 97%; opacity: 1; }
        }
        .scanner-beam {
          animation: scanBeam 3s ease-in-out infinite;
        }
      `}</style>

      {/* Main Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Scanner or Manual Search Panel */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="bg-surface-lowest border border-outline-variant rounded-md shadow-sm overflow-hidden">
            {/* Action Tabs */}
            <div className="flex border-b border-outline-variant">
              <button 
                onClick={() => {
                  setIsManualSearchTab(false);
                  setScannerActive(true);
                }}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors duration-150 flex items-center justify-center gap-2 ${!isManualSearchTab ? 'bg-primary/5 text-primary border-b-2 border-primary' : 'text-on-surface-variant hover:bg-surface-low'}`}
              >
                <span className="material-symbols-outlined icon-sm">photo_camera</span>Scan QR Code
              </button>
              <button 
                onClick={() => {
                  setIsManualSearchTab(true);
                  setScannerActive(false);
                }}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors duration-150 flex items-center justify-center gap-2 ${isManualSearchTab ? 'bg-primary/5 text-primary border-b-2 border-primary' : 'text-on-surface-variant hover:bg-surface-low'}`}
              >
                <span className="material-symbols-outlined icon-sm">search</span>Search Manually
              </button>
            </div>

            {/* TAB 1: Camera Scanner */}
            {!isManualSearchTab && (
              <div className="p-6 flex flex-col items-center justify-center min-h-[360px]">
                {scannerActive ? (
                  <div className="w-full max-w-xs flex flex-col gap-4 items-center">
                    {/* Camera Select Dropdown */}
                    {cameras.length > 1 && (
                      <div className="w-full flex items-center gap-2">
                        <span className="material-symbols-outlined icon-xs text-outline">switch_camera</span>
                        <select 
                          value={selectedCameraId}
                          onChange={(e) => setSelectedCameraId(e.target.value)}
                          className="flex-1 bg-surface-low border border-outline-variant rounded-sm text-[11px] font-semibold text-on-surface-variant py-1 px-2.5 outline-none"
                        >
                          {cameras.map(device => (
                            <option key={device.id} value={device.id}>
                              {device.label || `Camera ${cameras.indexOf(device) + 1}`}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Camera Display Box */}
                    <div className="relative w-full aspect-square bg-black border border-outline rounded-md overflow-hidden flex items-center justify-center">
                      <div id="reader" className="w-full h-full object-cover"></div>
                      
                      {cameraLoading && (
                        <div className="absolute inset-0 bg-[#0b1c30]/80 flex flex-col items-center justify-center gap-2 text-white z-10">
                          <span className="material-symbols-outlined text-cyan-400 animate-spin text-[32px]">sync</span>
                          <span className="text-[11px] font-bold tracking-wider uppercase opacity-85">Initializing Camera...</span>
                        </div>
                      )}

                      {!cameraLoading && !cameraError && (
                        <>
                          {/* Cyan scanning beam overlay */}
                          <div className="absolute left-1 right-1 h-1 bg-cyan-400 rounded-full shadow-[0_0_8px_rgba(34,211,238,0.8)] scanner-beam z-10 pointer-events-none"></div>
                          
                          {/* Corner brackets frame */}
                          <div className="absolute inset-4 border-2 border-cyan-400/25 pointer-events-none rounded-md">
                            <div className="absolute -top-1.5 -left-1.5 w-4 h-4 border-t-4 border-l-4 border-cyan-400"></div>
                            <div className="absolute -top-1.5 -right-1.5 w-4 h-4 border-t-4 border-r-4 border-cyan-400"></div>
                            <div className="absolute -bottom-1.5 -left-1.5 w-4 h-4 border-b-4 border-l-4 border-cyan-400"></div>
                            <div className="absolute -bottom-1.5 -right-1.5 w-4 h-4 border-b-4 border-r-4 border-cyan-400"></div>
                          </div>
                        </>
                      )}
                    </div>
                    
                    <button 
                      onClick={() => setScannerActive(false)}
                      className="btn btn-ghost text-xs text-outline hover:text-on-surface flex items-center gap-1.5 py-2"
                    >
                      <span className="material-symbols-outlined icon-xs">block</span>Pause Camera
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-4 text-center p-6">
                    <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                      <span className="material-symbols-outlined text-[36px]">qr_code_2</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-on-surface">Camera Scanner Paused</h3>
                      <p className="text-xs text-on-surface-variant mt-1.5 max-w-[240px]">
                        Scan QR code labels printed on warehouse inventory boxes.
                      </p>
                    </div>
                    <button 
                      onClick={() => setScannerActive(true)}
                      className="btn btn-primary bg-primary text-white text-xs font-semibold px-5 py-2.5 rounded-sm hover:bg-primary-container transition-colors flex items-center gap-1.5 mt-2"
                    >
                      <span className="material-symbols-outlined icon-xs text-white">photo_camera</span>Start Scanner
                    </button>
                  </div>
                )}

                {/* Permissions or loading error */}
                {cameraError && (
                  <div className="mt-4 mx-4 p-3.5 bg-error-container/20 border border-error/25 rounded text-center text-xs text-error flex flex-col items-center gap-2.5">
                    <div className="flex items-center gap-1.5 font-bold">
                      <span className="material-symbols-outlined icon-xs text-error">warning</span>
                      <span>Camera Access Error</span>
                    </div>
                    <p className="leading-relaxed opacity-90">{cameraError}</p>
                    <button 
                      onClick={() => {
                        setCameraError(null);
                        setScannerActive(true);
                      }}
                      className="btn btn-outline border-error/30 text-error hover:bg-error/5 text-[10px] font-semibold py-1.5 px-3.5 rounded"
                    >
                      Retry Connection
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: Manual Search */}
            {isManualSearchTab && (
              <div className="p-6 min-h-[360px] flex flex-col">
                <form onSubmit={handleManualSearch} className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[16px]">search</span>
                    <input 
                      type="text" 
                      placeholder="Enter SKU Code or Item Name..."
                      value={manualQuery}
                      onChange={(e) => setManualQuery(e.target.value)}
                      className="w-full h-[36px] pl-9 pr-3 bg-surface-low border border-outline-variant rounded-sm text-xs text-on-surface outline-none focus:border-primary transition-all"
                    />
                  </div>
                  <button 
                    type="submit"
                    disabled={searchingManual}
                    className="btn btn-primary bg-primary text-white text-xs font-semibold px-4 py-2 rounded-sm hover:bg-primary-container disabled:opacity-50"
                  >
                    {searchingManual ? 'Searching...' : 'Search'}
                  </button>
                </form>

                {/* Results list */}
                <div className="mt-4 flex-1 overflow-y-auto max-h-[260px] divide-y divide-outline-variant/30">
                  {searchResults.map(item => (
                    <div 
                      key={item._id}
                      onClick={() => selectManualItem(item)}
                      className="py-3 px-2.5 flex items-center justify-between hover:bg-surface-low cursor-pointer transition-colors duration-150 rounded"
                    >
                      <div>
                        <p className="text-xs font-bold text-on-surface leading-tight">{item.name}</p>
                        <span className="text-[10px] text-outline font-mono mt-0.5 block">{item.skuCode || item.sku} · {item.loc}</span>
                      </div>
                      <span className="material-symbols-outlined text-[16px] text-outline hover:text-primary">chevron_right</span>
                    </div>
                  ))}
                  {searchResults.length === 0 && !searchingManual && (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 text-outline text-xs">
                      <span className="material-symbols-outlined text-[32px] mb-2 opacity-50">search_off</span>
                      No manual search results matching your query.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Scanned status indicator / Reset button */}
          {(scannedItem || notFound) && (
            <button 
              onClick={resetScanner}
              className="btn btn-outline border-outline-variant text-on-surface-variant hover:bg-surface-low w-full py-2.5 rounded-sm text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              <span className="material-symbols-outlined icon-sm">restart_alt</span>Clear & Scan Again
            </button>
          )}
        </div>

        {/* Right Side: Results Details and History Logs */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          
          {/* STATE 1: Item Not Found warning */}
          {notFound && (
            <div className="bg-surface-lowest border border-error/20 rounded-md p-10 shadow-sm text-center flex flex-col items-center justify-center gap-4 animate-scale-up">
              <div className="w-16 h-16 rounded-full bg-error/10 text-error flex items-center justify-center">
                <span className="material-symbols-outlined text-[36px]">inventory_2</span>
              </div>
              <div>
                <h2 className="text-lg font-bold text-on-surface">Item Not Found</h2>
                <p className="text-xs text-on-surface-variant mt-1.5 leading-relaxed max-w-sm">
                  The scanned SKU code <strong className="font-mono text-error">"{notFoundSku}"</strong> was not found in the MongoDB Atlas database. Please verify the code or search for the item manually.
                </p>
              </div>
              <div className="flex gap-2.5 mt-2">
                <button 
                  onClick={resetScanner} 
                  className="btn btn-primary bg-primary text-white text-xs font-semibold px-4.5 py-2.5 rounded-sm hover:bg-primary-container transition-colors flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined icon-xs text-white">photo_camera</span>Scan Again
                </button>
                <button 
                  onClick={() => {
                    setIsManualSearchTab(true);
                    setScannerActive(false);
                    setManualQuery(notFoundSku);
                    setNotFound(false);
                  }}
                  className="btn btn-outline border-outline-variant text-on-surface-variant hover:bg-surface-low text-xs font-semibold px-4.5 py-2.5 rounded-sm flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined icon-xs">search</span>Search Manually
                </button>
              </div>
            </div>
          )}

          {/* STATE 2: Display Scanned/Found Item Details */}
          {scannedItem && (
            <div className="flex flex-col gap-5 animate-scale-up">
              {/* Main Card info */}
              <div className="bg-surface-lowest border border-outline-variant rounded-md shadow-sm p-6 flex flex-col gap-6">
                
                {/* Header Card */}
                <div className="flex items-start justify-between flex-wrap gap-4 border-b border-outline-variant/30 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-[22px]">
                      {scannedItem.emoji || '📦'}
                    </div>
                    <div>
                      <h2 className="text-xl font-extrabold text-on-surface leading-tight">{scannedItem.name}</h2>
                      <p className="text-[11px] text-outline font-mono mt-1">SKU Code: {scannedItem.skuCode || scannedItem.sku}</p>
                    </div>
                  </div>
                  
                  {/* Stock Status Badge */}
                  <div className="flex items-center gap-2">
                    {scannedItem.qty <= scannedItem.threshold && (
                      <span className="px-2.5 py-1 rounded bg-error/10 border border-error/25 text-error text-[10px] font-black uppercase flex items-center gap-1 animate-pulse">
                        <span className="material-symbols-outlined text-[12px] text-error icon-filled">warning</span>Low Stock Alert
                      </span>
                    )}
                    <span className={`px-2.5 py-1 border rounded text-[10px] font-black uppercase ${getStockStatus(scannedItem).color}`}>
                      {getStockStatus(scannedItem).label}
                    </span>
                  </div>
                </div>

                {/* Details layout Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-outline uppercase tracking-wider">Category</span>
                    <span className="text-xs font-bold text-on-surface-variant">{scannedItem.cat}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-outline uppercase tracking-wider">Safety Threshold</span>
                    <span className="text-xs font-bold text-on-surface-variant">{scannedItem.threshold.toLocaleString('en-IN')} units</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-outline uppercase tracking-wider">Unit Value (INR)</span>
                    <span className="text-xs font-extrabold text-on-surface">₹{scannedItem.val.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-outline uppercase tracking-wider">GST Rate</span>
                    <span className="text-xs font-bold text-on-surface-variant">{scannedItem.gst}% GST</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-outline uppercase tracking-wider">Current Quantity</span>
                    <span className="text-xs font-black text-primary">{scannedItem.qty.toLocaleString('en-IN')} units</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-outline uppercase tracking-wider">Last Sync Date</span>
                    <span className="text-xs font-bold text-on-surface-variant">
                      {new Date(scannedItem.updatedAt).toLocaleDateString('en-IN', {
                        day: '2-digit', month: 'short', year: 'numeric'
                      })}
                    </span>
                  </div>
                  <div className="col-span-2 sm:col-span-3 flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-outline uppercase tracking-wider">Supplier</span>
                    <span className="text-xs font-semibold text-on-surface-variant">{scannedItem.supplier || 'Bharat components Ltd.'}</span>
                  </div>
                </div>

                {/* Storage Location callout */}
                <div className="bg-surface-low border border-outline-variant rounded-md p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-cyan-400/10 text-cyan-400 flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-[20px]">location_on</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-outline uppercase tracking-widest block leading-none">Storage Location</span>
                      <strong className="text-lg font-black text-cyan-400 uppercase tracking-tight block mt-1">
                        {scannedItem.storageLocation || scannedItem.loc || 'Unassigned'}
                      </strong>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold text-outline tracking-wider bg-surface-lowest px-2.5 py-1 border border-outline-variant/30 rounded">
                    Pune Sector A-12
                  </span>
                </div>

                {/* Inline Action Bar */}
                <div className="flex flex-wrap gap-2.5 border-t border-outline-variant/30 pt-4.5">
                  <button 
                    onClick={() => setUpdatingStock(!updatingStock)}
                    className="btn btn-outline border-outline-variant hover:bg-surface-low text-on-surface-variant text-xs font-bold py-2 px-3.5 rounded-sm flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    <span className="material-symbols-outlined icon-xs">sync_alt</span>Update Stock Quantity
                  </button>
                  <button 
                    onClick={() => setShowPrintModal(true)}
                    className="btn btn-outline border-outline-variant hover:bg-surface-low text-on-surface-variant text-xs font-bold py-2 px-3.5 rounded-sm flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    <span className="material-symbols-outlined icon-xs">print</span>Print QR Label
                  </button>
                  {scannedItem.qty <= scannedItem.threshold && (
                    <button 
                      onClick={() => onReorderClick(scannedItem)}
                      className="btn btn-error bg-error text-white hover:brightness-110 text-xs font-bold py-2 px-3.5 rounded-sm flex items-center gap-1.5 shadow-sm transition-all ml-auto"
                    >
                      <span className="material-symbols-outlined icon-xs text-white font-filled">bolt</span>Replenish Catalog
                    </button>
                  )}
                </div>
              </div>

              {/* Inline Stock Update Form panel */}
              {updatingStock && (
                <div className="bg-surface-lowest border border-outline-variant rounded-md shadow-sm p-5 animate-scale-up">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface border-b border-outline-variant/30 pb-2 mb-4">
                    Quick Stock Update Flow
                  </h3>
                  <form onSubmit={handleStockUpdate} className="flex flex-col sm:flex-row gap-4 items-end">
                    <div className="flex-1 flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-outline uppercase tracking-wider">Action Type</label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setUpdateType('add')}
                          className={`flex-1 py-2 text-xs font-bold rounded-sm border transition-all ${updateType === 'add' ? 'bg-primary/10 border-primary text-primary' : 'bg-surface-low border-outline-variant text-on-surface-variant'}`}
                        >
                          Add Stock (Inflow)
                        </button>
                        <button
                          type="button"
                          onClick={() => setUpdateType('dispatch')}
                          className={`flex-1 py-2 text-xs font-bold rounded-sm border transition-all ${updateType === 'dispatch' ? 'bg-secondary/10 border-secondary text-secondary' : 'bg-surface-low border-outline-variant text-on-surface-variant'}`}
                        >
                          Dispatch Stock (Outflow)
                        </button>
                      </div>
                    </div>
                    <div className="w-full sm:w-[140px] flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-outline uppercase tracking-wider">Quantity (Units)</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={updateQty || ''}
                        onChange={(e) => setUpdateQty(Math.max(1, parseInt(e.target.value) || 0))}
                        placeholder="e.g. 50"
                        className="w-full h-[36px] px-3 bg-surface-low border border-outline-variant rounded-sm text-xs text-on-surface outline-none focus:border-primary"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={updatingServer}
                        className="btn btn-primary bg-primary text-white text-xs font-semibold px-5 h-[36px] rounded-sm hover:bg-primary-container disabled:opacity-50"
                      >
                        {updatingServer ? 'Saving...' : 'Apply Update'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setUpdatingStock(false)}
                        className="btn btn-ghost px-3.5 h-[36px] text-xs font-semibold text-outline"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* History logs block */}
              <div className="bg-surface-lowest border border-outline-variant rounded-md shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b border-outline-variant flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface">
                    Activity History logs for SKU: {scannedItem.sku}
                  </h3>
                  <span className="bg-surface-low px-2 py-0.5 rounded text-[10px] font-semibold text-outline">
                    {itemHistory.length} records found
                  </span>
                </div>
                
                <div className="p-4 max-h-[280px] overflow-y-auto">
                  {loadingHistory ? (
                    <div className="text-center p-8 text-outline text-xs animate-pulse">Loading transaction logs...</div>
                  ) : itemHistory.length > 0 ? (
                    <div className="flex flex-col">
                      {itemHistory.map((log) => {
                        const isIn = log.type === 'in';
                        const badgeColor = isIn ? 'bg-primary/10 text-primary border-primary/20' : 'bg-secondary/10 text-secondary border-secondary/20';
                        return (
                          <div 
                            key={log._id}
                            className="flex items-center justify-between py-2.5 border-b border-outline-variant/30 last:border-b-0 hover:bg-surface-low/30 rounded px-1.5 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <span className={`px-2.5 py-0.5 border text-[9px] font-black uppercase rounded ${badgeColor}`}>
                                {isIn ? '+ Added' : '- Dispatched'}
                              </span>
                              <div>
                                <p className="text-xs font-bold text-on-surface-variant">{log.qty.toLocaleString('en-IN')} units</p>
                                <span className="text-[10px] text-outline">By {log.op} · {log.loc}</span>
                              </div>
                            </div>
                            <span className="text-[10px] font-semibold text-outline">
                              {new Date(log.date).toLocaleString('en-IN', {
                                day: '2-digit', month: '2-digit', year: 'numeric',
                                hour: '2-digit', minute: '2-digit', hour12: false
                              })}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-10 text-outline text-xs">
                      No matching activity history found for this inventory item.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STATE 3: No Item scanned state */}
          {!scannedItem && !notFound && (
            <div className="bg-surface-lowest border border-outline-variant/60 rounded-md p-14 shadow-sm text-center flex flex-col items-center justify-center gap-3.5 min-h-[460px]">
              <div className="w-16 h-16 rounded-full bg-surface-low text-outline flex items-center justify-center">
                <span className="material-symbols-outlined text-[36px]">qr_code_scanner</span>
              </div>
              <div>
                <h2 className="text-base font-bold text-on-surface">Awaiting QR Code Scan</h2>
                <p className="text-xs text-on-surface-variant mt-2 leading-relaxed max-w-sm">
                  Supervisors can scan a product's barcode label using the device's camera. This instantly pulls location, inventory count, and pricing records.
                </p>
              </div>
              <div className="mt-2.5 bg-surface-low border border-outline-variant rounded-[10px] p-4.5 max-w-xs text-left text-xs text-on-surface-variant flex flex-col gap-2">
                <div className="flex items-center gap-1.5 font-bold uppercase text-[10px] text-outline tracking-wider">
                  <span className="material-symbols-outlined text-[14px]">tips_and_updates</span>Supervisor Tips:
                </div>
                <ul className="list-disc pl-4 space-y-1 opacity-90 text-[11px]">
                  <li>Align the QR Code tag in the middle of the frame.</li>
                  <li>Ensure warehouse lighting is adequate.</li>
                  <li>If the camera fails, use manual fallback lookup tab.</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* PRINT PREVIEW OVERLAY MODAL */}
      {showPrintModal && scannedItem && (
        <div className="fixed inset-0 bg-[#0b1c30]/75 backdrop-blur-sm z-[9999] flex items-center justify-center p-6 transition-all duration-300">
          <div className="bg-surface-lowest rounded-lg shadow-2xl border border-outline-variant w-full max-w-md animate-scale-up overflow-hidden">
            <div className="px-6 py-4.5 border-b border-outline-variant flex items-center justify-between">
              <h2 className="text-sm font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary">print</span>Print QR barcode label
              </h2>
              <button 
                className="w-[32px] h-[32px] flex items-center justify-center rounded-full hover:bg-surface-low text-on-surface-variant transition-colors" 
                onClick={() => setShowPrintModal(false)}
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Render Printable Label Layout */}
            <div className="p-6 bg-surface-low flex justify-center">
              <div className="border border-outline-variant rounded p-1 bg-white">
                <PrintableLabel item={scannedItem} />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-outline-variant bg-surface-lowest flex justify-end gap-2.5">
              <button 
                type="button" 
                className="btn btn-ghost text-xs px-4 py-2 font-semibold border border-outline-variant rounded-sm hover:bg-surface-low" 
                onClick={() => setShowPrintModal(false)}
              >
                Close Preview
              </button>
              <button 
                type="button" 
                className="btn btn-primary bg-primary text-white text-xs font-bold px-5 py-2.5 rounded-sm hover:bg-primary-container flex items-center gap-1.5 shadow"
                onClick={handlePrint}
              >
                <span className="material-symbols-outlined icon-xs text-white">print</span>Trigger System Print / PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScanItemQR;
