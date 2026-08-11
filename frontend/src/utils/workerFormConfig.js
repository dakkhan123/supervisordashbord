/**
 * Shared Worker Registration Configuration & Validation Utility
 * Used by both WorkerRegister.jsx (worker self-registration) and WorkerOverview.jsx (supervisor add worker)
 */

export const BRANCH_OPTIONS = [
  'Pune Head Office',
  'Pune Unit A12',
  'Mumbai Branch',
  'Nashik Branch',
  'Bangalore Office'
];

export const DEPARTMENT_OPTIONS = [
  'Assembly',
  'Packaging',
  'Logistics',
  'Maintenance',
  'Operations'
];

/**
 * Validates worker registration form fields
 * @param {Object} form - Form data object containing worker fields
 * @returns {Object} { isValid: boolean, error: string | null }
 */
export const validateWorkerRegistrationFields = (form, options = {}) => {
  const { requireDepartment = true } = options;
  const fullName = (form.fullName || form.name || '').trim();
  const username = (form.username || '').trim();
  const email = (form.email || '').trim();
  const mobile = (form.mobile || form.phone || '').toString().replace(/\D/g, '');
  const branch = (form.branch || '').trim();
  const department = (form.department || '').trim();

  if (!fullName) {
    return { isValid: false, error: 'Full Name is required.' };
  }

  if (!username) {
    return { isValid: false, error: 'Username is required.' };
  }

  if (!email) {
    return { isValid: false, error: 'Email address is required.' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Please enter a valid email address format.' };
  }

  if (!mobile || mobile.length !== 10) {
    return { isValid: false, error: 'Mobile number must be exactly 10 numeric digits.' };
  }

  if (!branch) {
    return { isValid: false, error: 'Branch / Office selection is required.' };
  }

  if (requireDepartment && !department) {
    return { isValid: false, error: 'Department selection is required.' };
  }

  return { isValid: true, error: null };
};
