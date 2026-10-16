/**
 * API Service for Lode Hexosa Administration System
 * Backend target: http://localhost:5000/api
 */

const API_ORIGIN = import.meta.env.VITE_API_ORIGIN
  || `${window.location.protocol}//${window.location.hostname}:5000`;
const BASE_URL = `${API_ORIGIN.replace(/\/$/, '')}/api`;

async function apiFetch(url, options = {}) {
  return fetch(url, { ...options, credentials: 'include' });
}

/**
 * Helper to handle fetch responses and error messages
 */
async function handleResponse(response) {
  let data;
  try {
    data = await response.json();
  } catch (err) {
    throw new Error(`Server returned status ${response.status} (${response.statusText})`);
  }

  if (!response.ok) {
    const errorMsg = data?.message || `Request failed with status ${response.status}`;
    const error = new Error(errorMsg);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const employeeApi = {
  /**
   * Fetch all employees with optional query filters (search, department, status)
   */
  async getAll({ search = '', department = '', status = '' } = {}) {
    const params = new URLSearchParams();
    if (search.trim()) params.append('search', search.trim());
    if (department.trim()) params.append('department', department.trim());
    if (status.trim()) params.append('status', status.trim());

    const queryString = params.toString() ? `?${params.toString()}` : '';
    const res = await apiFetch(`${BASE_URL}/employees${queryString}`);
    return handleResponse(res);
  },

  /**
   * Fetch single employee by id
   */
  async getById(id) {
    const res = await apiFetch(`${BASE_URL}/employees/${id}`);
    return handleResponse(res);
  },

  /**
   * Create new employee
   * Required fields: employee_id, first_name, last_name
   */
  async create(employeeData) {
    const res = await apiFetch(`${BASE_URL}/employees`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(employeeData)
    });
    return handleResponse(res);
  },

  /**
   * Update existing employee by id
   */
  async update(id, employeeData) {
    const res = await apiFetch(`${BASE_URL}/employees/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(employeeData)
    });
    return handleResponse(res);
  },

  /**
   * Update employee status (Active or Inactive)
   */
  async updateStatus(id, newStatus) {
    const res = await apiFetch(`${BASE_URL}/employees/${id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: newStatus })
    });
    return handleResponse(res);
  }
};

export const authApi = {
  async login(credentials) {
    const res = await apiFetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    return handleResponse(res);
  },

  async getCurrentUser() {
    const res = await apiFetch(`${BASE_URL}/auth/me`);
    return handleResponse(res);
  },

  async logout() {
    const res = await apiFetch(`${BASE_URL}/auth/logout`, { method: 'POST' });
    return handleResponse(res);
  }
};

export const userApi = {
  async getAll() {
    const res = await apiFetch(`${BASE_URL}/users`);
    return handleResponse(res);
  },

  async create(userData) {
    const res = await apiFetch(`${BASE_URL}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    return handleResponse(res);
  },

  async update(id, userData) {
    const res = await apiFetch(`${BASE_URL}/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    return handleResponse(res);
  }
};

export const attendanceApi = {
  /**
   * Fetch attendance records with optional filters
   */
  async getAll({ date = '', startDate = '', endDate = '', employeeId = '', status = '', search = '' } = {}) {
    const params = new URLSearchParams();
    if (date && date.trim()) params.append('date', date.trim());
    if (startDate && startDate.trim()) params.append('start_date', startDate.trim());
    if (endDate && endDate.trim()) params.append('end_date', endDate.trim());
    if (employeeId && employeeId.trim()) params.append('employee_id', employeeId.trim());
    if (status && status.trim()) params.append('status', status.trim());
    if (search && search.trim()) params.append('search', search.trim());

    const queryString = params.toString() ? `?${params.toString()}` : '';
    const res = await apiFetch(`${BASE_URL}/attendance${queryString}`);
    return handleResponse(res);
  },

  /**
   * Fetch attendance summary statistics for a given date (defaults to today)
   */
  async getSummary(date = '') {
    const params = new URLSearchParams();
    if (date && date.trim()) params.append('date', date.trim());
    const queryString = params.toString() ? `?${params.toString()}` : '';
    const res = await apiFetch(`${BASE_URL}/attendance/summary${queryString}`);
    return handleResponse(res);
  },

  /**
   * Fetch attendance report statistics and records for a date range
   */
  async getReport({ startDate, endDate }) {
    const params = new URLSearchParams({ start_date: startDate, end_date: endDate });
    const res = await apiFetch(`${BASE_URL}/attendance/reports?${params.toString()}`);
    return handleResponse(res);
  },

  /**
   * Fetch single attendance record by ID
   */
  async getById(id) {
    const res = await apiFetch(`${BASE_URL}/attendance/${id}`);
    return handleResponse(res);
  },

  /**
   * Record Check-In
   */
  async checkIn({ employee_id, date, time, status, notes }) {
    const res = await apiFetch(`${BASE_URL}/attendance/check-in`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ employee_id, date, time, status, notes })
    });
    return handleResponse(res);
  },

  /**
   * Record Check-Out
   */
  async checkOut({ employee_id, date, time, notes }) {
    const res = await apiFetch(`${BASE_URL}/attendance/check-out`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ employee_id, date, time, notes })
    });
    return handleResponse(res);
  },

  /**
   * Create attendance record manually
   */
  async create(attendanceData) {
    const res = await apiFetch(`${BASE_URL}/attendance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(attendanceData)
    });
    return handleResponse(res);
  },

  /**
   * Update attendance record by ID
   */
  async update(id, attendanceData) {
    const res = await apiFetch(`${BASE_URL}/attendance/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(attendanceData)
    });
    return handleResponse(res);
  },

  /**
   * Delete attendance record by ID
   */
  async delete(id) {
    const res = await apiFetch(`${BASE_URL}/attendance/${id}`, {
      method: 'DELETE'
    });
    return handleResponse(res);
  }
};

