import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';

const Login = ({ showToast, onLoginSuccess }) => {
  const navigate = useNavigate();
  const [roleMode, setRoleMode] = useState('supervisor'); // 'supervisor' | 'worker'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('smartops_token');
    const userStr = localStorage.getItem('smartops_user');
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        if ((user.role || '').toLowerCase() === 'worker') {
          navigate('/worker');
        } else {
          navigate('/');
        }
      } catch (e) {
        navigate('/');
      }
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      showToast('Please fill in all fields', 'error');
      return;
    }

    try {
      setLoading(true);
      const res = await api.login({ username, password });
      if (res.success) {
        const userRole = (res.data.role || '').toLowerCase();

        // Enforce strict role mode validation
        if (roleMode === 'supervisor' && userRole === 'worker') {
          showToast('Access Denied: Worker accounts must log in using the "Worker Login" option.', 'error');
          return;
        } 
        if (roleMode === 'worker' && userRole !== 'worker') {
          showToast('Access Denied: Supervisor accounts must log in using the "Supervisor Login" option.', 'error');
          return;
        }

        localStorage.setItem('smartops_token', res.token);
        localStorage.setItem('smartops_user', JSON.stringify(res.data));
        showToast(`Logged in successfully as ${res.data.role}`, 'success');
        
        if (onLoginSuccess) {
          onLoginSuccess(res.data);
        }
        
        if (userRole === 'worker') {
          navigate('/worker', { replace: true });
        } else {
          navigate('/', { replace: true });
        }

      } else {
        showToast(res.error || 'Invalid credentials', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Failed to connect to authentication server', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row items-center justify-center p-0 md:p-0">
      {/* Left branding card */}
      <div className="w-full md:w-[45%] lg:w-[40%] min-h-[320px] md:min-h-screen bg-[#213145] text-white flex flex-col justify-between p-10 md:p-14 relative overflow-hidden flex-shrink-0">
        <div className="absolute top-[-20%] right-[-20%] w-[350px] h-[350px] bg-[#5dd9d8]/10 rounded-full blur-[80px]"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[250px] h-[250px] bg-primary/10 rounded-full blur-[60px]"></div>

        <div className="flex items-center gap-3 z-10">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-container to-tertiary-container rounded-[10px] flex items-center justify-center">
            <span className="material-symbols-outlined icon-filled text-[22px] text-white">inventory_2</span>
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">SmartOps</h1>
            <p className="text-[10px] text-[#5dd9d8] font-bold uppercase tracking-wider">Enterprise Operations Portal</p>
          </div>
        </div>

        <div className="my-8 md:my-0 z-10">
          <span className="inline-block px-3 py-1 bg-[#5dd9d8]/20 text-[#5dd9d8] text-[10px] font-extrabold rounded-full uppercase tracking-wider mb-3">
            {roleMode === 'supervisor' ? 'Supervisor Mode' : 'Worker Mode'}
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4 leading-tight">
            {roleMode === 'supervisor' ? 'Supervisor Control Center' : 'Worker Operations Portal'}
          </h2>
          <p className="text-sm text-secondary-fixed-dim/80 leading-relaxed max-w-[340px]">
            {roleMode === 'supervisor'
              ? 'Access live floor trackers, allocate tasks, manage staff attendance, and review payroll statistics.'
              : 'View assigned shift tasks, update work completion notes, check daily attendance logs, and view pay statements.'}
          </p>
        </div>

        <div className="text-[11px] text-secondary-fixed-dim/50 font-semibold z-10">
          &copy; 2026 SmartOps Enterprise · All rights reserved.
        </div>
      </div>

      {/* Right form container */}
      <div className="w-full md:w-[55%] lg:w-[60%] flex items-center justify-center p-8 md:p-14 min-h-[500px]">
        <div className="w-full max-w-[440px] animate-scale-up flex flex-col gap-6">
          
          {/* Role Selection Switcher (Supervisor vs Worker) */}
          <div className="flex bg-surface-container border border-outline-variant/60 rounded-lg p-1 shadow-inner">
            <button
              type="button"
              onClick={() => setRoleMode('supervisor')}
              className={`flex-1 py-2.5 px-3 rounded-md text-xs font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                roleMode === 'supervisor'
                  ? 'bg-primary text-white shadow-md'
                  : 'text-outline hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">admin_panel_settings</span>
              Supervisor Login
            </button>
            <button
              type="button"
              onClick={() => setRoleMode('worker')}
              className={`flex-1 py-2.5 px-3 rounded-md text-xs font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                roleMode === 'worker'
                  ? 'bg-[#213145] text-[#5dd9d8] shadow-md'
                  : 'text-outline hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">badge</span>
              Worker Login
            </button>
          </div>

          <div>
            <h3 className="text-2xl font-extrabold text-on-surface tracking-tight">
              {roleMode === 'supervisor' ? 'Supervisor Sign In' : 'Worker Sign In'}
            </h3>
            <p className="text-xs text-outline font-semibold mt-1">
              {roleMode === 'supervisor'
                ? 'Enter your supervisor account username or email.'
                : 'Enter worker credentials provided by your supervisor.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-outline uppercase tracking-widest">Username or Email</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-[18px]">person</span>
                <input
                  type="text"
                  placeholder={roleMode === 'supervisor' ? 'e.g. rajesh.kumar' : 'e.g. ram.patil'}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-surface border border-outline-variant rounded-sm text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all font-medium"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-outline uppercase tracking-widest">Password</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-[18px]">lock</span>
                <input
                  type="password"
                  placeholder="Enter account password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-surface border border-outline-variant rounded-sm text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                  disabled={loading}
                />
              </div>
            </div>

            <button
              type="submit"
              className={`btn font-extrabold py-3 px-4 rounded-sm transition-all active:scale-98 shadow-sm flex items-center justify-center gap-2 mt-2 disabled:opacity-50 cursor-pointer text-xs uppercase tracking-wider ${
                roleMode === 'supervisor'
                  ? 'bg-primary text-white hover:bg-primary-container'
                  : 'bg-[#213145] text-[#5dd9d8] hover:bg-[#1a2737]'
              }`}
              disabled={loading}
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Authenticating...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">login</span>
                  {roleMode === 'supervisor' ? 'Sign In to Supervisor Console' : 'Sign In to Worker Portal'}
                </>
              )}
            </button>
          </form>

          {roleMode === 'supervisor' ? (
            <div className="text-center text-xs font-semibold text-outline">
              New Supervisor Registration:{' '}
              <Link to="/register" className="text-primary hover:underline font-bold">
                Register Account
              </Link>
            </div>
          ) : (
            <div className="text-center text-xs text-outline font-medium">
              Only Supervisor-created Worker accounts can log in. Contact your supervisor if you require password assistance.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;


