import React, { useEffect, useState } from 'react';
import { userApi } from '../services/api';

const emptyForm = { full_name: '', email: '', role: 'HR Staff', password: '' };

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [passwords, setPasswords] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const response = await userApi.getAll();
      setUsers(response.data || []);
      setError('');
    } catch (loadError) {
      setError(loadError.message || 'Unable to load user accounts.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreate = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setIsSaving(true);
    try {
      await userApi.create({ ...form, email: form.email.trim().toLowerCase() });
      setForm(emptyForm);
      setMessage('Account created.');
      await loadUsers();
    } catch (createError) {
      setError(createError.message || 'Unable to create the account.');
    } finally {
      setIsSaving(false);
    }
  };

  const updateUser = async (id, changes) => {
    setError('');
    setMessage('');
    try {
      const response = await userApi.update(id, changes);
      setUsers((current) => current.map((user) => user.id === id ? response.data : user));
      if (changes.password) {
        setPasswords((current) => ({ ...current, [id]: '' }));
        setMessage('Password updated; existing sessions were signed out.');
      } else {
        setMessage('Account updated; existing sessions were signed out.');
      }
    } catch (updateError) {
      setError(updateError.message || 'Unable to update the account.');
    }
  };

  return (
    <div className="tab-users-view">
      <div className="page-intro">
        <h2>User Accounts</h2>
        <p>Create administrator and HR staff accounts and manage their access.</p>
      </div>

      <form className="user-create-form table-card" onSubmit={handleCreate}>
        <h3>Create account</h3>
        <label className="user-form-field">
          <span>Full name</span>
          <input required minLength={2} maxLength={100} value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })} />
        </label>
        <label className="user-form-field">
          <span>Email</span>
          <input type="email" required maxLength={190} autoComplete="off" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
        </label>
        <label className="user-form-field">
          <span>Role</span>
          <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
            <option value="HR Staff">HR Staff</option>
            <option value="Administrator">Administrator</option>
          </select>
        </label>
        <label className="user-form-field">
          <span>Password</span>
          <input type="password" required minLength={12} maxLength={72} autoComplete="new-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
        </label>
        <button className="btn-primary user-create-button" type="submit" disabled={isSaving}>
          {isSaving ? 'Creating…' : 'Create account'}
        </button>
      </form>

      {(error || message) && <p className={error ? 'user-feedback user-feedback-error' : 'user-feedback'} role={error ? 'alert' : 'status'}>{error || message}</p>}

      <section className="table-card user-list-card">
        <div className="user-list-header">
          <h3>Accounts</h3>
          <span>{users.length} account{users.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="table-responsive-wrapper">
          <table className="employee-table user-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>New Password</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan="6" className="report-empty-state">Loading user accounts…</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan="6" className="report-empty-state">No accounts found.</td></tr>
              ) : users.map((user) => (
                <tr key={user.id}>
                  <td>{user.full_name}</td>
                  <td>{user.email}</td>
                  <td>
                    <select aria-label={`Role for ${user.email}`} value={user.role} onChange={(event) => updateUser(user.id, { role: event.target.value })}>
                      <option value="Administrator">Administrator</option>
                      <option value="HR Staff">HR Staff</option>
                    </select>
                  </td>
                  <td>{user.is_active ? 'Active' : 'Inactive'}</td>
                  <td>
                    <input
                      aria-label={`New password for ${user.email}`}
                      type="password"
                      autoComplete="new-password"
                      minLength={12}
                      maxLength={72}
                      value={passwords[user.id] || ''}
                      onChange={(event) => setPasswords((current) => ({ ...current, [user.id]: event.target.value }))}
                    />
                  </td>
                  <td>
                    <div className="user-actions">
                      <button className="btn-secondary" type="button" onClick={() => updateUser(user.id, { is_active: !user.is_active })}>
                        {user.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button className="btn-secondary" type="button" disabled={(passwords[user.id] || '').length < 12} onClick={() => updateUser(user.id, { password: passwords[user.id] })}>
                        Set password
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
