const PrintableLabel = ({ item }) => {
  if (!item) return null;

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-white border border-outline-variant rounded-md shadow-sm max-w-sm mx-auto text-on-surface font-sans" id="printable-label-area">
      <style>{`
        @media print {
          /* Hide everything in the body */
          body * {
            visibility: hidden !important;
          }
          /* Show only the printable label area */
          #printable-label-area, #printable-label-area * {
            visibility: visible !important;
          }
          #printable-label-area {
            position: absolute !important;
            left: 50% !important;
            top: 40% !important;
            transform: translate(-50%, -40%) scale(1.4) !important;
            border: none !important;
            box-shadow: none !important;
            width: 100% !important;
            max-width: 400px !important;
          }
        }
      `}</style>
      
      {/* Label Title */}
      <div className="text-center w-full">
        <h3 className="text-xs font-extrabold text-gray-500 uppercase tracking-widest">SmartOps Trackable Unit</h3>
        <div className="h-[2px] bg-gray-200 w-full my-2.5"></div>
      </div>
      
      {/* QR Code */}
      <div className="w-44 h-44 my-2 flex items-center justify-center border border-gray-200 p-2.5 bg-white rounded-md">
        <img 
          src={item.qrCodeImage} 
          alt={`QR Code for ${item.skuCode}`} 
          className="w-full h-full object-contain"
        />
      </div>

      {/* Item Metadata */}
      <div className="text-center w-full mt-2">
        <div className="text-base font-extrabold text-gray-900 line-clamp-2 leading-snug">{item.name}</div>
        <div className="text-xs font-bold text-gray-500 font-mono mt-1 mb-3.5">SKU: {item.skuCode || item.sku}</div>
        
        {/* Storage Location Badge */}
        <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-md px-3 py-2 w-full">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Storage Location</span>
          <div className="text-xl font-black text-gray-800 uppercase tracking-wide mt-0.5">
            {item.storageLocation || item.loc || 'N/A'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintableLabel;
