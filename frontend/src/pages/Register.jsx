import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';

const Register = ({ showToast }) => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('Supervisor');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('smartops_token')) {
      navigate('/');
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim() || !name.trim()) {
      showToast('Please fill in all required fields (username, password, name)', 'error');
      return;
    }

    try {
      setLoading(true);
      const res = await api.register({
        username,
        password,
        name,
        phone,
        role
      });

      if (res.success) {
        showToast('Account registered successfully! Please sign in.', 'success');
        navigate('/login');
      } else {
        showToast(res.error || 'Registration failed', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to connect to authentication server', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row items-center justify-center p-0 md:p-0">
      {/* Left branding card: Sidebar matching style */}
      <div className="w-full md:w-[45%] lg:w-[40%] min-h-[300px] md:min-h-screen bg-[#213145] text-white flex flex-col justify-between p-10 md:p-14 relative overflow-hidden flex-shrink-0">
        {/* Glow decoration */}
        <div className="absolute top-[-20%] right-[-20%] w-[350px] h-[350px] bg-[#5dd9d8]/10 rounded-full blur-[80px]"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[250px] h-[250px] bg-primary/10 rounded-full blur-[60px]"></div>

        <div className="flex items-center gap-3 z-10">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-container to-tertiary-container rounded-[10px] flex items-center justify-center">
            <span className="material-symbols-outlined icon-filled text-[22px] text-white">inventory_2</span>
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">SmartOps</h1>
            <p className="text-[10px] text-secondary-fixed-dim/70 tracking-wider uppercase">Inventory Management</p>
          </div>
        </div>

        <div className="my-10 md:my-0 z-10">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4 leading-tight">
            Create <br />
            Supervisor Account
          </h2>
          <p className="text-sm text-secondary-fixed-dim/80 leading-relaxed max-w-[340px]">
            Join SmartOps to manage inventory logs, assign worker tasks, audit GST records, and replenish catalog stocks immediately.
          </p>
        </div>

        <div className="text-[11px] text-secondary-fixed-dim/50 font-semibold z-10">
          &copy; 2026 SmartOps Co.in · All rights reserved.
        </div>
      </div>

      {/* Right form container */}
      <div className="w-full md:w-[55%] lg:w-[60%] flex items-center justify-center p-8 md:p-14 min-h-[500px]">
        <div className="w-full max-w-[420px] animate-scale-up flex flex-col gap-5">
          <div>
            <h3 className="text-2xl font-extrabold text-on-surface tracking-tight">Register Credentials</h3>
            <p className="text-xs text-outline font-semibold mt-1">Please enter your staff details to register a console profile.</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-outline uppercase tracking-widest">Full Name (Required)</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-[18px]">badge</span>
                <input
                  type="text"
                  placeholder="e.g. Rajesh Kumar"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-surface border border-outline-variant rounded-sm text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all font-medium"
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-outline uppercase tracking-widest">Username (Required)</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-[18px]">person</span>
                <input
                  type="text"
                  placeholder="e.g. rajesh.kumar"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-surface border border-outline-variant rounded-sm text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all font-medium font-mono"
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-outline uppercase tracking-widest">Password (Required)</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-[18px]">lock</span>
                <input
                  type="password"
                  placeholder="Create a strong account password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-surface border border-outline-variant rounded-sm text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-outline uppercase tracking-widest">Mobile Phone (+91)</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-[18px]">phone</span>
                <input
                  type="text"
                  placeholder="e.g. 9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-surface border border-outline-variant rounded-sm text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-outline uppercase tracking-widest">Assigned Role</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-[18px]">assignment_ind</span>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-surface border border-outline-variant rounded-sm text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all font-medium"
                  disabled={loading}
                >
                  <option value="Supervisor">Supervisor (Full Console Rights)</option>
                  <option value="Worker">Worker (Limited Rights)</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary bg-primary text-white font-bold py-3 px-4 rounded-sm hover:bg-primary-container transition-all active:scale-98 shadow-sm flex items-center justify-center gap-2 mt-3 disabled:opacity-50 cursor-pointer text-xs uppercase tracking-wider"
              disabled={loading}
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Registering account...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px] text-white">how_to_reg</span>
                  Create Console Account
                </>
              )}
            </button>
          </form>

          <div className="text-center text-xs font-semibold text-outline">
            Already have a supervisor account?{' '}
            <Link to="/login" className="text-primary hover:underline font-bold">
              Sign In Here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
