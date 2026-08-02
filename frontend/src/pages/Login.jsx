import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';

const Login = ({ showToast, onLoginSuccess }) => {
  const navigate = useNavigate();
  const [roleMode, setRoleMode] = useState('supervisor'); // 'supervisor' | 'worker'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Forgot Password State (ONLY for Supervisors)
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [resetStep, setResetStep] = useState(1); // 1: Email Request, 2: OTP & New Password
  const [resetEmail, setResetEmail] = useState('');
  const [resetOTP, setResetOTP] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [generatedOTP, setGeneratedOTP] = useState('');

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

  // Step 1: Request Password Reset OTP (Supervisor Only)
  const handleRequestOTP = async (e) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      showToast('Please enter your registered email address.', 'error');
      return;
    }

    try {
      setResetLoading(true);
      const res = await api.forgotPassword(resetEmail.trim());
      if (res.success) {
        showToast(res.message || 'OTP sent to your registered email address.', 'success');
        if (res.otp) {
          setGeneratedOTP(res.otp);
          setResetOTP(res.otp); // Pre-fill for quick testing ease
        }
        setResetStep(2);
      } else {
        showToast(res.error || 'Failed to process password reset request.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error connecting to authentication server.', 'error');
    } finally {
      setResetLoading(false);
    }
  };

  // Step 2: Confirm OTP & Set New Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetOTP.trim() || !newPassword.trim()) {
      showToast('Please enter the OTP code and your new password.', 'error');
      return;
    }

    if (newPassword.trim().length < 6) {
      showToast('New password must be at least 6 characters long.', 'error');
      return;
    }

    try {
      setResetLoading(true);
      const res = await api.resetPassword({
        email: resetEmail.trim(),
        otp: resetOTP.trim(),
        newPassword: newPassword.trim()
      });

      if (res.success) {
        showToast(res.message || 'Password updated successfully! Please sign in.', 'success');
        setForgotModalOpen(false);
        setResetStep(1);
        setResetEmail('');
        setResetOTP('');
        setNewPassword('');
        setGeneratedOTP('');
      } else {
        showToast(res.error || 'Failed to reset password.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error resetting password.', 'error');
    } finally {
      setResetLoading(false);
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
            <p className="text-[10px] text-teal-300 font-bold uppercase tracking-wider">Enterprise Operations Portal</p>
          </div>
        </div>

        <div className="my-8 md:my-0 z-10">
          <span className="inline-block px-3 py-1 bg-white/20 text-white text-[10px] font-extrabold rounded-full uppercase tracking-wider mb-3">
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
                  ? 'bg-primary text-white shadow-md'
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
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-outline uppercase tracking-widest">Password</label>
                
                {/* Forgot Password Link - ONLY visible on Supervisor Login page */}
                {roleMode === 'supervisor' && (
                  <button
                    type="button"
                    onClick={() => {
                      setForgotModalOpen(true);
                      setResetStep(1);
                    }}
                    className="text-[11px] text-primary hover:underline font-extrabold cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>

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
              className="btn font-extrabold py-3 px-4 rounded-sm transition-all active:scale-98 shadow-sm flex items-center justify-center gap-2 mt-2 disabled:opacity-50 cursor-pointer text-xs uppercase tracking-wider bg-primary text-white hover:bg-primary-container"
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

      {/* Forgot Password Modal (Supervisor Only) */}
      {forgotModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#0b1c30]/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-lowest border border-outline-variant rounded-md max-w-md w-full p-6 shadow-xl flex flex-col gap-5 text-on-surface animate-scale-up">
            <div className="flex items-center justify-between border-b border-outline-variant/40 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">lock_reset</span>
                <h3 className="text-base font-extrabold text-on-surface">Supervisor Password Reset</h3>
              </div>
              <button
                onClick={() => setForgotModalOpen(false)}
                className="text-outline hover:text-on-surface cursor-pointer p-1 rounded hover:bg-surface-low"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {resetStep === 1 ? (
              /* Step 1: Request Email */
              <form onSubmit={handleRequestOTP} className="flex flex-col gap-4">
                <p className="text-xs text-outline font-medium">
                  Enter your registered supervisor email address to receive a password reset OTP code.
                </p>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-outline uppercase tracking-widest">Registered Email</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-[18px]">mail</span>
                    <input
                      type="email"
                      placeholder="e.g. supervisor@factory.com"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-surface border border-outline-variant rounded-sm text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all font-medium"
                      disabled={resetLoading}
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={resetLoading}
                  className="btn bg-primary hover:bg-primary-container text-white text-xs font-bold py-2.5 px-4 rounded-sm shadow-sm uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-1"
                >
                  {resetLoading ? 'Generating OTP...' : 'Send Reset OTP Code'}
                </button>
              </form>
            ) : (
              /* Step 2: Input OTP & New Password */
              <form onSubmit={handleResetPassword} className="flex flex-col gap-4">
                <div className="p-3 bg-primary/10 border border-primary/20 rounded-sm text-xs text-primary font-medium">
                  OTP reset code sent to <strong>{resetEmail}</strong>.
                  {generatedOTP && (
                    <span className="block font-mono font-bold mt-1 text-on-surface">
                      Your Reset OTP Code: <span className="text-primary tracking-widest text-sm bg-surface-lowest px-2 py-0.5 rounded border border-primary/30">{generatedOTP}</span>
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-outline uppercase tracking-widest">6-Digit OTP Code</label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="Enter 6-digit OTP"
                    value={resetOTP}
                    onChange={(e) => setResetOTP(e.target.value)}
                    className="w-full px-3 py-2.5 bg-surface border border-outline-variant rounded-sm text-sm font-mono font-bold text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all tracking-widest"
                    disabled={resetLoading}
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-outline uppercase tracking-widest">New Password</label>
                  <input
                    type="password"
                    placeholder="Enter new password (min 6 characters)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2.5 bg-surface border border-outline-variant rounded-sm text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                    disabled={resetLoading}
                    required
                  />
                </div>

                <div className="flex items-center justify-between gap-3 mt-1">
                  <button
                    type="button"
                    onClick={() => setResetStep(1)}
                    className="text-xs text-outline hover:text-on-surface font-bold cursor-pointer"
                  >
                    &larr; Back to Email
                  </button>
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="btn bg-primary hover:bg-primary-container text-white text-xs font-bold py-2.5 px-4 rounded-sm shadow-sm uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {resetLoading ? 'Updating Password...' : 'Reset Password'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
