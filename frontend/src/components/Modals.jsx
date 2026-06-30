import { useState, useEffect } from 'react';

/**
 * Add / Edit Stock Modal
 */
export const AddStockModal = ({ isOpen, onClose, onSubmit, editItem }) => {
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    cat: 'Electronics',
    qty: 0,
    threshold: 0,
    val: 0,
    loc: '',
    gst: 18,
    supplier: 'Tata Electronics Supply Co., Mumbai',
    emoji: '📦'
  });

  const categories = ['Electronics', 'Mechanical', 'Consumables', 'Raw Materials', 'Packaging'];
  const suppliers = [
    'Tata Electronics Supply Co., Mumbai',
    'Bharat Components Ltd., Pune',
    'Havells India Ltd., Noida',
    'Polycab India, Halol',
    'L&T Industrial Supply, Chennai'
  ];

  useEffect(() => {
    if (editItem) {
      setFormData({
        name: editItem.name || '',
        sku: editItem.sku || '',
        cat: editItem.cat || 'Electronics',
        qty: editItem.qty || 0,
        threshold: editItem.threshold || 0,
        val: editItem.val || 0,
        loc: editItem.loc || '',
        gst: editItem.gst || 18,
        supplier: editItem.supplier || 'Tata Electronics Supply Co., Mumbai',
        emoji: editItem.emoji || '📦'
      });
    } else {
      setFormData({
        name: '',
        sku: '',
        cat: 'Electronics',
        qty: 0,
        threshold: 0,
        val: 0,
        loc: '',
        gst: 18,
        supplier: 'Tata Electronics Supply Co., Mumbai',
        emoji: '📦'
      });
    }
  }, [editItem, isOpen]);

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id]: id === 'qty' || id === 'threshold' || id === 'val' || id === 'gst' 
        ? Number(value) 
        : value
    }));
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return alert('Item Name is required');
    if (!formData.sku.trim()) return alert('SKU Code is required');
    if (formData.qty < 0) return alert('Quantity cannot go below zero');
    if (formData.threshold < 0) return alert('Safety Threshold cannot be negative');
    if (formData.val < 0) return alert('Unit Price cannot be negative');
    
    // Choose dynamic emoji based on category if default is used
    let finalEmoji = formData.emoji;
    if (finalEmoji === '📦') {
      const emojiMap = {
        'Electronics': '🔋',
        'Mechanical': '🔩',
        'Consumables': '🧪',
        'Raw Materials': '🟤',
        'Packaging': '📦'
      };
      finalEmoji = emojiMap[formData.cat] || '📦';
    }

    onSubmit({ ...formData, emoji: finalEmoji });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[#0b1c30]/50 backdrop-blur-sm z-[500] flex items-center justify-center p-6 transition-all duration-300">
      <div className="bg-surface-lowest rounded-lg shadow-xl w-full max-w-[520px] max-h-[90vh] overflow-y-auto animate-scale-up">
        <div className="px-6 py-5 border-b border-outline-variant flex items-center justify-between">
          <h2 className="text-lg font-bold text-on-surface">
            {editItem ? 'Edit Inventory Item' : 'Add New Item'}
          </h2>
          <button className="w-[38px] h-[38px] flex items-center justify-center rounded-full hover:bg-surface-low text-on-surface-variant transition-colors" onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        
        <form onSubmit={handleFormSubmit}>
          <div className="p-6 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-bold text-surface-on-variant uppercase tracking-wider">Item Name</label>
              <input 
                type="text" 
                id="name" 
                value={formData.name} 
                onChange={handleChange} 
                placeholder="e.g. Exide Lithium Battery 4000mAh"
                className="w-full px-3 py-2.5 bg-surface-low border-1.5 border-outline-variant rounded-sm text-sm text-on-surface outline-none focus:border-primary focus:ring-3 focus:ring-primary/10 transition-all duration-150"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-bold text-surface-on-variant uppercase tracking-wider">SKU Code</label>
                <input 
                  type="text" 
                  id="sku" 
                  value={formData.sku} 
                  onChange={handleChange} 
                  placeholder="e.g. BAT-EX-4000"
                  disabled={!!editItem}
                  className="w-full px-3 py-2.5 bg-surface-low border-1.5 border-outline-variant rounded-sm text-sm text-on-surface outline-none focus:border-primary focus:ring-3 focus:ring-primary/10 transition-all duration-150 disabled:opacity-60"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-bold text-surface-on-variant uppercase tracking-wider">Category</label>
                <select 
                  id="cat" 
                  value={formData.cat} 
                  onChange={handleChange} 
                  className="w-full px-3 py-2.5 bg-surface-low border-1.5 border-outline-variant rounded-sm text-sm text-on-surface outline-none focus:border-primary focus:ring-3 focus:ring-primary/10 transition-all duration-150"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-bold text-surface-on-variant uppercase tracking-wider">Quantity (Units)</label>
                <input 
                  type="number" 
                  id="qty" 
                  value={formData.qty} 
                  onChange={handleChange} 
                  min="0"
                  className="w-full px-3 py-2.5 bg-surface-low border-1.5 border-outline-variant rounded-sm text-sm text-on-surface outline-none focus:border-primary focus:ring-3 focus:ring-primary/10 transition-all duration-150"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-bold text-surface-on-variant uppercase tracking-wider">Min Threshold</label>
                <input 
                  type="number" 
                  id="threshold" 
                  value={formData.threshold} 
                  onChange={handleChange} 
                  min="0"
                  className="w-full px-3 py-2.5 bg-surface-low border-1.5 border-outline-variant rounded-sm text-sm text-on-surface outline-none focus:border-primary focus:ring-3 focus:ring-primary/10 transition-all duration-150"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-bold text-surface-on-variant uppercase tracking-wider">Unit Price (₹)</label>
                <input 
                  type="number" 
                  id="val" 
                  value={formData.val} 
                  onChange={handleChange} 
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2.5 bg-surface-low border-1.5 border-outline-variant rounded-sm text-sm text-on-surface outline-none focus:border-primary focus:ring-3 focus:ring-primary/10 transition-all duration-150"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-bold text-surface-on-variant uppercase tracking-wider">Storage Location</label>
                <input 
                  type="text" 
                  id="loc" 
                  value={formData.loc} 
                  onChange={handleChange} 
                  placeholder="e.g. Rack C-12"
                  className="w-full px-3 py-2.5 bg-surface-low border-1.5 border-outline-variant rounded-sm text-sm text-on-surface outline-none focus:border-primary focus:ring-3 focus:ring-primary/10 transition-all duration-150"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-bold text-surface-on-variant uppercase tracking-wider">GST Rate (%)</label>
                <select 
                  id="gst" 
                  value={formData.gst} 
                  onChange={handleChange} 
                  className="w-full px-3 py-2.5 bg-surface-low border-1.5 border-outline-variant rounded-sm text-sm text-on-surface outline-none focus:border-primary focus:ring-3 focus:ring-primary/10 transition-all duration-150"
                >
                  <option value="5">5% GST</option>
                  <option value="12">12% GST</option>
                  <option value="18">18% GST</option>
                  <option value="28">28% GST</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-bold text-surface-on-variant uppercase tracking-wider">Supplier</label>
              <select 
                id="supplier" 
                value={formData.supplier} 
                onChange={handleChange} 
                className="w-full px-3 py-2.5 bg-surface-low border-1.5 border-outline-variant rounded-sm text-sm text-on-surface outline-none focus:border-primary focus:ring-3 focus:ring-primary/10 transition-all duration-150"
              >
                {suppliers.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-outline-variant flex justify-end gap-2.5">
            <button type="button" className="btn btn-ghost px-4 py-2" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary px-4 py-2 bg-primary text-white flex items-center gap-2 rounded-sm hover:bg-primary-container font-semibold transition-colors duration-150">
              <span className="material-symbols-outlined icon-xs text-white">save</span>Save Item
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/**
 * Reorder Stock Modal
 */
export const ReorderModal = ({ isOpen, onClose, onSubmit, item }) => {
  const [qty, setQty] = useState(100);
  const [priority, setPriority] = useState('Standard (5–7 Business Days)');
  const [gstType, setGstType] = useState('B2B — With GSTIN');
  const [supplier, setSupplier] = useState('');

  const suppliers = [
    'Tata Electronics Supply Co., Mumbai (Primary)',
    'Bharat Components Ltd., Pune',
    'Havells India Ltd., Noida',
    'Polycab India, Halol',
    'L&T Industrial Supply, Chennai'
  ];

  useEffect(() => {
    if (item) {
      const suggestQty = Math.max((item.threshold - item.qty) * 2, 100);
      setQty(suggestQty);
      setSupplier(item.supplier || 'Tata Electronics Supply Co., Mumbai (Primary)');
    }
  }, [item, isOpen]);

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (qty <= 0) return alert('Quantity must be greater than zero');
    onSubmit({
      sku: item.sku,
      qty,
      priority,
      gstType,
      supplier
    });
  };

  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 bg-[#0b1c30]/50 backdrop-blur-sm z-[500] flex items-center justify-center p-6 transition-all duration-300">
      <div className="bg-surface-lowest rounded-lg shadow-xl w-full max-w-[520px] max-h-[90vh] overflow-y-auto animate-scale-up">
        <div className="px-6 py-5 border-b border-outline-variant flex items-center justify-between">
          <h2>Reorder Item</h2>
          <button className="w-[38px] h-[38px] flex items-center justify-center rounded-full hover:bg-surface-low text-on-surface-variant transition-colors" onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleFormSubmit}>
          <div className="p-6 flex flex-col gap-4">
            <div className="bg-surface-low rounded-[10px] p-3.5 text-[13px] text-surface-on-variant leading-relaxed">
              <strong>{item.name}</strong> · SKU: <code className="font-mono text-outline font-semibold">{item.sku}</code><br />
              Suggested Order Quantity: <strong>{((item.threshold - item.qty) * 2) > 0 ? (item.threshold - item.qty) * 2 : 100} units</strong>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-bold text-surface-on-variant uppercase tracking-wider">Order Quantity (Units)</label>
              <input 
                type="number" 
                value={qty} 
                onChange={(e) => setQty(Number(e.target.value))} 
                min="1"
                className="w-full px-3 py-2.5 bg-surface-low border-1.5 border-outline-variant rounded-sm text-sm text-on-surface outline-none focus:border-primary focus:ring-3 focus:ring-primary/10 transition-all duration-150"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-bold text-surface-on-variant uppercase tracking-wider">Preferred Supplier</label>
              <select 
                value={supplier} 
                onChange={(e) => setSupplier(e.target.value)}
                className="w-full px-3 py-2.5 bg-surface-low border-1.5 border-outline-variant rounded-sm text-sm text-on-surface outline-none focus:border-primary focus:ring-3 focus:ring-primary/10 transition-all duration-150"
              >
                {suppliers.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-bold text-surface-on-variant uppercase tracking-wider">GST Invoice Type</label>
              <select 
                value={gstType} 
                onChange={(e) => setGstType(e.target.value)}
                className="w-full px-3 py-2.5 bg-surface-low border-1.5 border-outline-variant rounded-sm text-sm text-on-surface outline-none focus:border-primary focus:ring-3 focus:ring-primary/10 transition-all duration-150"
              >
                <option value="B2B — With GSTIN">B2B — With GSTIN</option>
                <option value="B2C — Without GSTIN">B2C — Without GSTIN</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-bold text-surface-on-variant uppercase tracking-wider">Delivery Priority</label>
              <select 
                value={priority} 
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2.5 bg-surface-low border-1.5 border-outline-variant rounded-sm text-sm text-on-surface outline-none focus:border-primary focus:ring-3 focus:ring-primary/10 transition-all duration-150"
              >
                <option value="Standard (5–7 Business Days)">Standard (5–7 Business Days)</option>
                <option value="Express (2–3 Business Days)">Express (2–3 Business Days)</option>
                <option value="Emergency — Next Day">Emergency — Next Day</option>
              </select>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-outline-variant flex justify-end gap-2.5">
            <button type="button" className="btn btn-ghost px-4 py-2" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-error px-4 py-2 bg-error text-white flex items-center gap-2 rounded-sm hover:bg-red-700 font-semibold transition-colors duration-150">
              <span className="material-symbols-outlined icon-xs text-white">shopping_cart</span>Place Order
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/**
 * Delete Confirmation Modal
 */
export const DeleteConfirmModal = ({ isOpen, onClose, onConfirm, itemName }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[#0b1c30]/50 backdrop-blur-sm z-[500] flex items-center justify-center p-6 transition-all duration-300">
      <div className="bg-surface-lowest rounded-lg shadow-xl w-full max-w-[440px] animate-scale-up">
        <div className="px-6 py-5 border-b border-outline-variant flex items-center justify-between">
          <h2 className="text-lg font-bold text-error flex items-center gap-2">
            <span className="material-symbols-outlined text-error">warning</span>Confirm Deletion
          </h2>
          <button className="w-[38px] h-[38px] flex items-center justify-center rounded-full hover:bg-surface-low text-on-surface-variant transition-colors" onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-6">
          <p className="text-sm text-on-surface-variant leading-relaxed text-left">
            Are you sure you want to permanently delete <strong>{itemName}</strong> from the inventory catalog? This action cannot be undone and will clean up all associated active alerts.
          </p>
        </div>

        <div className="px-6 py-4 border-t border-outline-variant flex justify-end gap-2.5 font-sans">
          <button type="button" className="btn btn-ghost px-4 py-2 text-xs font-semibold rounded-sm border border-outline-variant hover:bg-surface-low transition-colors" onClick={onClose}>
            Cancel
          </button>
          <button 
            type="button" 
            className="btn btn-error px-4 py-2 bg-error text-white flex items-center gap-1.5 rounded-sm hover:bg-red-700 font-semibold text-xs transition-colors"
            onClick={onConfirm}
          >
            <span className="material-symbols-outlined icon-xs text-white">delete</span>Confirm Delete
          </button>
        </div>
      </div>
    </div>
  );
};


// Add CSS animations
const styleEl = document.createElement('style');
styleEl.textContent = `
  @keyframes scaleUp {
    from { opacity: 0; transform: translateY(20px) scale(0.97); }
    to { opacity: 1; transform: none; }
  }
  .animate-scale-up {
    animation: scaleUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }
`;
document.head.appendChild(styleEl);
