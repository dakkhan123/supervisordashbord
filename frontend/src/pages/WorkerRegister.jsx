import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';

const WorkerRegister = ({ showToast }) => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    fullName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    mobile: '',
    dateOfBirth: '',
    address: '',
    joiningDate: new Date().toISOString().split('T')[0],
    department: 'Assembly',
    branch: 'Pune Head Office',
    photo: ''
  });

  const [loading, setLoading] = useState(false);
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [otp, setOtp] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setInterval(() => setCooldown((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        if (showToast) showToast('Image file size must be less than 2MB', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm((prev) => ({ ...prev, photo: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();

    if (!form.fullName.trim() || !form.username.trim() || !form.email.trim() || !form.password || !form.mobile.trim() || !form.branch.trim()) {
      if (showToast) showToast('Please fill in all mandatory fields (including Branch / Office).', 'error');
      return;
    }

    if (form.password !== form.confirmPassword) {
      if (showToast) showToast('Password and Confirm Password do not match.', 'error');
      return;
    }

    const cleanMobile = form.mobile.replace(/\D/g, '');
    if (cleanMobile.length !== 10) {
      if (showToast) showToast('Mobile number must be exactly 10 digits.', 'error');
      return;
    }

    try {
      setLoading(true);
      const res = await api.registerWorkerSendOTP({
        ...form,
        mobile: cleanMobile
      });

      if (res.success) {
        if (showToast) showToast(res.message || 'OTP sent to your email!', 'success');
        setOtpModalOpen(true);
        setCooldown(30);
      } else {
        if (showToast) showToast(res.error || 'Failed to send OTP', 'error');
      }
    } catch (err) {
      console.error(err);
      if (showToast) showToast('Error sending OTP', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (!otp || otp.trim().length !== 6) {
      if (showToast) showToast('Please enter the full 6-digit OTP code.', 'error');
      return;
    }

    try {
      setVerifying(true);
      const res = await api.registerWorkerVerifyOTP({
        email: form.email.trim(),
        otp: otp.trim()
      });

      if (res.success) {
        if (showToast) showToast('OTP Verified! Registration submitted for approval.', 'success');
        setOtpModalOpen(false);
        setSubmittedSuccess(true);
      } else {
        if (showToast) showToast(res.error || 'Invalid OTP', 'error');
      }
    } catch (err) {
      console.error(err);
      if (showToast) showToast('OTP Verification Failed', 'error');
    } finally {
      setVerifying(false);
    }
  };

  const handleResendOTP = async () => {
    if (cooldown > 0) return;
    try {
      const res = await api.registerWorkerSendOTP({
        ...form,
        mobile: form.mobile.replace(/\D/g, '')
      });
      if (res.success) {
        if (showToast) showToast('A new OTP has been sent to your email.', 'success');
        setCooldown(30);
      } else {
        if (showToast) showToast(res.error || 'Failed to resend OTP', 'error');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b1c30] text-on-surface flex items-center justify-center p-4 font-sans">
      <div className="max-w-2xl w-full bg-surface-lowest border border-outline-variant rounded-xl p-8 shadow-2xl my-8 animate-fade-in">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-primary-container to-tertiary-container rounded-xl flex items-center justify-center mx-auto mb-3 shadow-md">
            <span className="material-symbols-outlined text-[28px] text-white">badge</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-on-surface">Worker Registration Portal</h1>
          <p className="text-xs text-outline font-medium mt-1">
            Apply for factory console access. Submissions require Email OTP verification & Supervisor approval.
          </p>
        </div>

        {submittedSuccess ? (
          <div className="bg-surface-low border border-primary/30 rounded-lg p-6 text-center flex flex-col items-center gap-4 animate-scale-up">
            <div className="w-16 h-16 bg-primary/15 text-primary rounded-full flex items-center justify-center">
              <span className="material-symbols-outlined text-[40px]">task_alt</span>
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-on-surface">Registration Submitted Successfully!</h3>
              <p className="text-xs text-outline max-w-md mx-auto mt-2 leading-relaxed">
                Your application has been verified via OTP and submitted for Supervisor Review. You will receive an approval email once your monthly salary is assigned and account activated.
              </p>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 p-3 rounded text-xs font-semibold max-w-md w-full">
              ⏳ Status: <strong>Pending Supervisor Approval</strong>
            </div>
            <Link
              to="/login"
              className="btn bg-primary hover:bg-primary-container text-white font-bold px-6 py-2.5 rounded-sm text-xs shadow-md uppercase tracking-wider mt-2"
            >
              Return to Login Page
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmitForm} className="flex flex-col gap-4">
            
            {/* Photo Upload Section */}
            <div className="flex flex-col items-center justify-center gap-2 mb-2">
              <div className="relative w-20 h-20 rounded-full border-2 border-outline-variant overflow-hidden bg-surface-low flex items-center justify-center shadow-inner">
                {form.photo ? (
                  <img src={form.photo} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="material-symbols-outlined text-[36px] text-outline">account_circle</span>
                )}
              </div>
              <label className="text-xs font-bold text-primary hover:underline cursor-pointer">
                {form.photo ? 'Change Profile Photo' : 'Upload Profile Photo (Optional)'}
                <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-outline uppercase tracking-wider">Full Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Kumar"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  className="px-3 py-2 bg-surface-low border border-outline-variant rounded-sm text-xs font-medium text-on-surface outline-none focus:border-primary"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-outline uppercase tracking-wider">Username *</label>
                <input
                  type="text"
                  placeholder="e.g. ramesh_k"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  className="px-3 py-2 bg-surface-low border border-outline-variant rounded-sm text-xs font-medium text-on-surface outline-none focus:border-primary"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-outline uppercase tracking-wider">Email Address (OTP Verified) *</label>
                <input
                  type="email"
                  placeholder="e.g. ramesh@gmail.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="px-3 py-2 bg-surface-low border border-outline-variant rounded-sm text-xs font-medium text-on-surface outline-none focus:border-primary"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-outline uppercase tracking-wider">Mobile Number (10 Digits) *</label>
                <input
                  type="tel"
                  maxLength={10}
                  placeholder="9876543210"
                  value={form.mobile}
                  onChange={(e) => setForm({ ...form, mobile: e.target.value.replace(/\D/g, '') })}
                  className="px-3 py-2 bg-surface-low border border-outline-variant rounded-sm text-xs font-medium text-on-surface outline-none focus:border-primary font-mono"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-outline uppercase tracking-wider">Password *</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="px-3 py-2 bg-surface-low border border-outline-variant rounded-sm text-xs font-medium text-on-surface outline-none focus:border-primary"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-outline uppercase tracking-wider">Confirm Password *</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                  className="px-3 py-2 bg-surface-low border border-outline-variant rounded-sm text-xs font-medium text-on-surface outline-none focus:border-primary"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-outline uppercase tracking-wider">Branch / Office *</label>
                <select
                  value={form.branch}
                  onChange={(e) => setForm({ ...form, branch: e.target.value })}
                  className="px-3 py-2 bg-surface-low border border-outline-variant rounded-sm text-xs font-bold text-on-surface outline-none focus:border-primary cursor-pointer"
                  required
                >
                  <option value="Pune Head Office">Pune Head Office</option>
                  <option value="Pune Unit A12">Pune Unit A12</option>
                  <option value="Mumbai Branch">Mumbai Branch</option>
                  <option value="Nashik Branch">Nashik Branch</option>
                  <option value="Bangalore Office">Bangalore Office</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-outline uppercase tracking-wider">Department *</label>
                <select
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                  className="px-3 py-2 bg-surface-low border border-outline-variant rounded-sm text-xs font-bold text-on-surface outline-none focus:border-primary cursor-pointer"
                >
                  <option value="Assembly">Assembly</option>
                  <option value="Packaging">Packaging</option>
                  <option value="Logistics">Logistics</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Operations">Operations</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-outline uppercase tracking-wider">Date of Birth</label>
                <input
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                  className="px-3 py-2 bg-surface-low border border-outline-variant rounded-sm text-xs font-medium text-on-surface outline-none focus:border-primary"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-outline uppercase tracking-wider">Joining Date</label>
                <input
                  type="date"
                  value={form.joiningDate}
                  onChange={(e) => setForm({ ...form, joiningDate: e.target.value })}
                  className="px-3 py-2 bg-surface-low border border-outline-variant rounded-sm text-xs font-medium text-on-surface outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-outline uppercase tracking-wider">Residential Address</label>
              <textarea
                rows={2}
                placeholder="Enter complete residential address..."
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="px-3 py-2 bg-surface-low border border-outline-variant rounded-sm text-xs font-medium text-on-surface outline-none focus:border-primary resize-none"
              ></textarea>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn bg-primary hover:bg-primary-container text-white font-bold py-3 rounded-sm text-xs shadow-md uppercase tracking-wider mt-3 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">verified_user</span>
              {loading ? 'Sending Verification OTP...' : 'Send Verification OTP & Continue'}
            </button>

            <div className="text-center text-xs text-outline mt-2">
              Already have an active account?{' '}
              <Link to="/login" className="text-primary font-bold hover:underline">
                Sign In
              </Link>
            </div>
          </form>
        )}
      </div>

      {/* Email OTP Verification Modal */}
      {otpModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#0b1c30]/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-lowest border border-outline-variant rounded-xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-5 text-on-surface animate-scale-up">
            <div className="flex items-start justify-between border-b border-outline-variant/40 pb-3">
              <div>
                <h3 className="text-lg font-extrabold text-on-surface">Email OTP Verification</h3>
                <p className="text-xs text-outline mt-0.5">
                  Code sent to: <strong className="text-primary">{form.email}</strong>
                </p>
              </div>
              <button
                onClick={() => setOtpModalOpen(false)}
                className="w-7 h-7 rounded hover:bg-surface-low text-on-surface-variant flex items-center justify-center cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleVerifyOTP} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2 items-center">
                <label className="text-xs font-bold text-outline uppercase tracking-wider">Enter 6-Digit OTP Code</label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  className="w-48 text-center text-2xl font-mono font-black tracking-widest px-4 py-2 bg-surface-low border-2 border-primary/50 rounded-md outline-none text-primary"
                  autoFocus
                  required
                />
              </div>

              <div className="text-center">
                {cooldown > 0 ? (
                  <span className="text-xs text-outline font-medium">Resend OTP in <strong>{cooldown}s</strong></span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendOTP}
                    className="text-xs font-bold text-primary hover:underline cursor-pointer"
                  >
                    Resend OTP Code
                  </button>
                )}
              </div>

              <div className="flex justify-end gap-3 border-t border-outline-variant/40 pt-4">
                <button
                  type="button"
                  onClick={() => setOtpModalOpen(false)}
                  className="btn border border-outline-variant text-outline hover:text-on-surface text-xs font-bold py-2 px-4 rounded-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={verifying}
                  className="btn bg-primary hover:bg-primary-container text-white text-xs font-bold py-2 px-6 rounded-sm shadow-md uppercase tracking-wider flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {verifying ? 'Verifying...' : 'Verify OTP & Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkerRegister;
