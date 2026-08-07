import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';

const Register = ({ showToast }) => {
  const navigate = useNavigate();

  // Registration Form State
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('Supervisor');
  const [branch, setBranch] = useState('Pune Head Office');
  const [dateOfJoining, setDateOfJoining] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

  // OTP Verification Step State
  const [step, setStep] = useState(1); // Step 1: Form details, Step 2: OTP Verification
  const [otp, setOtp] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [timer, setTimer] = useState(30); // 30-second resend countdown
  const [canResend, setCanResend] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (localStorage.getItem('smartops_token')) {
      navigate('/');
    }
  }, [navigate]);

  // 30-second Resend Timer countdown effect
  useEffect(() => {
    let interval = null;
    if (step === 2 && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (timer === 0) {
      setCanResend(true);
      if (interval) clearInterval(interval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [step, timer]);

  // Step 1 Submit: Create Console Account (Triggers OTP Email)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    // 1. Mandatory Fields Validation
    if (!name.trim() || !username.trim() || !email.trim() || !password.trim() || !branch.trim()) {
      showToast('Please fill in all required fields (Full Name, Username, Email, Password, Branch / Office).', 'error');
      setErrorMessage('Full Name, Username, Email, Password, and Branch / Office are mandatory.');
      return;
    }

    // 2. Email Format Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      showToast('Please enter a valid email address (e.g. user@example.com).', 'error');
      setErrorMessage('Please enter a valid email address format.');
      return;
    }

    // 3. Mobile Number 10-Digit Numeric Validation
    if (phone.trim() && (!/^\d+$/.test(phone.trim()) || phone.trim().length !== 10)) {
      showToast('Mobile number must be exactly 10 numeric digits.', 'error');
      setErrorMessage('Mobile number must be exactly 10 numeric digits.');
      return;
    }

    try {
      setLoading(true);
      const res = await api.register({
        name: name.trim(),
        username: username.trim(),
        email: email.trim(),
        password: password.trim(),
        phone: phone.trim(),
        role,
        branch: branch.trim(),
        dateOfJoining
      });

      if (res.success) {
        const targetEmail = res.email || email.trim();
        setRegisteredEmail(targetEmail);
        setStep(2);
        setTimer(30);
        setCanResend(false);
        setSuccessMessage(`6-digit OTP sent to ${targetEmail}. Please check your inbox.`);
        showToast(`Verification OTP sent to ${targetEmail}`, 'success');
      } else {
        setErrorMessage(res.error || 'Registration request failed');
        showToast(res.error || 'Registration request failed', 'error');
      }
    } catch (err) {
      console.error(err);
      setErrorMessage('Failed to connect to authentication server');
      showToast('Failed to connect to authentication server', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Step 2 Submit: Verify 6-digit OTP
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!otp.trim() || otp.trim().length !== 6) {
      setErrorMessage('Please enter a 6-digit OTP code.');
      showToast('Please enter a valid 6-digit OTP.', 'error');
      return;
    }

    try {
      setVerifyLoading(true);
      const res = await api.verifyOTP({
        email: registeredEmail,
        otp: otp.trim()
      });

      if (res.success) {
        showToast(res.message || 'Supervisor account verified & created successfully!', 'success');
        if (res.token) {
          localStorage.setItem('smartops_token', res.token);
          if (res.data) {
            localStorage.setItem('smartops_user', JSON.stringify(res.data));
          }
          navigate('/');
        } else {
          navigate('/login');
        }
      } else {
        setErrorMessage(res.error || 'Verification failed');
        showToast(res.error || 'Verification failed', 'error');
      }
    } catch (err) {
      console.error(err);
      setErrorMessage('Error verifying OTP code.');
      showToast('Error verifying OTP code.', 'error');
    } finally {
      setVerifyLoading(false);
    }
  };

  // Resend OTP Action
  const handleResendOTP = async () => {
    if (!canResend || resendLoading) return;
    setErrorMessage('');
    setSuccessMessage('');

    try {
      setResendLoading(true);
      const res = await api.resendOTP(registeredEmail);

      if (res.success) {
        setTimer(30);
        setCanResend(false);
        setSuccessMessage('A new 6-digit OTP code has been sent to your email address.');
        showToast('New OTP sent to email!', 'success');
      } else {
        setErrorMessage(res.error || 'Failed to resend OTP code.');
        showToast(res.error || 'Failed to resend OTP.', 'error');
      }
    } catch (err) {
      console.error(err);
      setErrorMessage('Error requesting new OTP.');
      showToast('Error requesting new OTP.', 'error');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row items-center justify-center p-0 md:p-0">
      {/* Left branding card */}
      <div className="w-full md:w-[45%] lg:w-[40%] min-h-[300px] md:min-h-screen bg-[#213145] text-white flex flex-col justify-between p-10 md:p-14 relative overflow-hidden flex-shrink-0">
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

        <div className="my-10 md:my-0 z-10">
          <span className="inline-block px-3 py-1 bg-teal-500/20 text-teal-300 text-[10px] font-extrabold rounded-full uppercase tracking-wider mb-3">
            {step === 1 ? 'Step 1: Account Info' : 'Step 2: Email Verification'}
          </span>
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
          
          {step === 1 ? (
            /* STEP 1: Registration Form */
            <>
              <div>
                <h3 className="text-2xl font-extrabold text-on-surface tracking-tight">Register Credentials</h3>
                <p className="text-xs text-outline font-semibold mt-1">
                  Enter details to register your supervisor console profile. You will receive an OTP via email to verify your account.
                </p>
              </div>

              {errorMessage && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-400 font-medium">
                  ⚠️ {errorMessage}
                </div>
              )}

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
                  <label className="text-[10px] font-bold text-outline uppercase tracking-widest">Email Address (Required)</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-[18px]">mail</span>
                    <input
                      type="email"
                      placeholder="e.g. rajesh.kumar@factory.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-surface border border-outline-variant rounded-sm text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all font-medium"
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
                  <label className="text-[10px] font-bold text-outline uppercase tracking-widest">Mobile Phone (10 Digits)</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-[18px]">phone</span>
                    <input
                      type="text"
                      maxLength={10}
                      placeholder="e.g. 9876543210"
                      value={phone}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        if (val.length <= 10) setPhone(val);
                      }}
                      className="w-full pl-10 pr-4 py-2.5 bg-surface border border-outline-variant rounded-sm text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all font-mono"
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

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-outline uppercase tracking-widest">Branch / Office (Required)</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-[18px]">domain</span>
                    <select
                      value={branch}
                      onChange={(e) => setBranch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-surface border border-outline-variant rounded-sm text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all font-medium"
                      disabled={loading}
                      required
                    >
                      <option value="Pune Head Office">Pune Head Office</option>
                      <option value="Pune Unit A12">Pune Unit A12</option>
                      <option value="Mumbai Branch">Mumbai Branch</option>
                      <option value="Nashik Branch">Nashik Branch</option>
                      <option value="Bangalore Office">Bangalore Office</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-outline uppercase tracking-widest">Date of Joining</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-[18px]">calendar_month</span>
                    <input
                      type="date"
                      value={dateOfJoining}
                      onChange={(e) => setDateOfJoining(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-surface border border-outline-variant rounded-sm text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all font-medium"
                      disabled={loading}
                      required
                    />
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
                      Sending Verification OTP...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px] text-white">mark_email_read</span>
                      Create Console Account
                    </>
                  )}
                </button>
              </form>
            </>
          ) : (
            /* STEP 2: OTP Verification Form */
            <>
              <div>
                <h3 className="text-2xl font-extrabold text-on-surface tracking-tight">Verify Your Email</h3>
                <p className="text-xs text-outline font-semibold mt-1">
                  We sent a 6-digit OTP verification code to <strong className="text-primary font-bold">{registeredEmail}</strong>.
                </p>
              </div>

              {successMessage && (
                <div className="p-3 bg-teal-500/10 border border-teal-500/30 rounded text-xs text-teal-300 font-medium">
                  ✅ {successMessage}
                </div>
              )}

              {errorMessage && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-400 font-medium">
                  ⚠️ {errorMessage}
                </div>
              )}

              <form onSubmit={handleVerifyOTP} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-outline uppercase tracking-widest">Enter 6-Digit OTP</label>
                    <span className="text-[11px] text-outline font-medium">Valid for 10 minutes</span>
                  </div>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-[18px]">pin</span>
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="e.g. 123456"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      className="w-full pl-10 pr-4 py-3 bg-surface border border-outline-variant rounded-sm text-lg font-mono font-bold text-on-surface tracking-[6px] outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all text-center"
                      disabled={verifyLoading}
                      autoFocus
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between bg-surface-low p-3 rounded border border-outline-variant/40">
                  <div className="text-xs text-outline font-medium">
                    {!canResend ? (
                      <span>Resend code in <strong className="text-primary font-bold font-mono">{timer}s</strong></span>
                    ) : (
                      <span className="text-teal-400 font-semibold">You can now request a new OTP</span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleResendOTP}
                    disabled={!canResend || resendLoading}
                    className="text-xs font-bold text-primary hover:underline cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    {resendLoading ? 'Resending...' : 'Resend OTP'}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={verifyLoading}
                  className="btn bg-primary text-white font-bold py-3 px-4 rounded-sm hover:bg-primary-container transition-all active:scale-98 shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer text-xs uppercase tracking-wider"
                >
                  {verifyLoading ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Verifying OTP...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px] text-white">verified</span>
                      Verify OTP & Create Account
                    </>
                  )}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setStep(1);
                      setErrorMessage('');
                      setSuccessMessage('');
                    }}
                    className="text-xs text-outline hover:text-on-surface font-semibold underline cursor-pointer"
                  >
                    &larr; Change Registration Details
                  </button>
                </div>
              </form>
            </>
          )}

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
