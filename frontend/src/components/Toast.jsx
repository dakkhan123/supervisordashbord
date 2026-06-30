import { useEffect, useState } from 'react';

export const ToastContainer = ({ toasts, removeToast }) => {
  return (
    <div className="fixed top-20 right-6 z-[600] flex flex-col gap-2.5 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={() => removeToast(toast.id)} />
      ))}
    </div>
  );
};

const ToastItem = ({ toast, onRemove }) => {
  const [isRemoving, setIsRemoving] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsRemoving(true);
      setTimeout(onRemove, 300); // match fadeOut animation delay
    }, 3000);

    return () => clearTimeout(timer);
  }, [onRemove]);

  const { msg, type } = toast;
  const icon = type === 'success' ? 'check_circle' : 'error';
  const iconColor = type === 'success' ? 'text-primary-fixed-dim' : 'text-red-300';

  return (
    <div 
      className={`flex items-center gap-2.5 px-4 py-3 bg-[#213145] text-[#eaf1ff] shadow-md text-[13px] font-medium pointer-events-auto rounded-sm max-w-[320px] transition-all duration-300 ${isRemoving ? 'opacity-0 translate-x-5 scale-95' : 'opacity-100 translate-x-0 scale-100 animate-slide-in'}`}
      style={{
        animation: 'toastIn 0.3s ease forwards'
      }}
    >
      <span className={`material-symbols-outlined text-[18px] ${iconColor}`}>{icon}</span>
      <span>{msg}</span>
    </div>
  );
};

// Add keyframes styling directly
const style = document.createElement('style');
style.textContent = `
  @keyframes toastIn {
    from { opacity: 0; transform: translateX(20px); }
    to { opacity: 1; transform: none; }
  }
`;
document.head.appendChild(style);
