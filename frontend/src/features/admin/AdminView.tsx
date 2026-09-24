import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, Check, X, CheckCircle2, AlertCircle, RefreshCw, Settings } from 'lucide-react';

export const AdminView: React.FC = () => {
  const { 
    isAdmin, 
    pendingDeposits, 
    pendingWithdrawals, 
    claimAdmin, 
    approvePendingDeposit, 
    rejectPendingDeposit, 
    approvePendingWithdrawal, 
    rejectPendingWithdrawal, 
    refreshPendingDeposits, 
    refreshPendingWithdrawals 
  } = useAuth();

  const [adminSubTab, setAdminSubTab] = useState<'deposits' | 'withdrawals' | 'rounds'>('deposits');
  const [adminSecretInput, setAdminSecretInput] = useState<string>('');
  const [loginLoading, setLoginLoading] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (isAdmin) {
      refreshPendingDeposits();
      refreshPendingWithdrawals();
    }
  }, [isAdmin]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (!adminSecretInput.trim()) return;

    setLoginLoading(true);
    try {
      await claimAdmin(adminSecretInput.trim());
      setMessage({ type: 'success', text: '👑 Admin privileges granted! Welcome to A Bingo Admin Dashboard.' });
      setAdminSecretInput('');
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Invalid admin secret key' });
    } finally {
      setLoginLoading(false);
    }
  };

  const handleApproveDeposit = async (ref: string) => {
    setMessage(null);
    setActionLoading(ref);
    try {
      await approvePendingDeposit(ref);
      setMessage({ type: 'success', text: `✅ Deposit reference '${ref}' approved and credited to user balance!` });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to approve deposit' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectDeposit = async (ref: string) => {
    setMessage(null);
    setActionLoading(ref);
    try {
      await rejectPendingDeposit(ref);
      setMessage({ type: 'success', text: `❌ Deposit reference '${ref}' rejected.` });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to reject deposit' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleApproveWdr = async (id: string) => {
    setMessage(null);
    setActionLoading(id);
    try {
      await approvePendingWithdrawal(id);
      setMessage({ type: 'success', text: `✅ Withdrawal payout approved and marked as COMPLETED!` });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to approve withdrawal payout' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectWdr = async (id: string) => {
    setMessage(null);
    setActionLoading(id);
    try {
      await rejectPendingWithdrawal(id);
      setMessage({ type: 'success', text: `❌ Withdrawal payout rejected. Funds refunded to user balance!` });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to reject withdrawal' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRefreshData = async () => {
    if (isAdmin) {
      await refreshPendingDeposits();
      await refreshPendingWithdrawals();
    }
  };

  return (
    <div style={{ padding: '16px', maxWidth: '600px', margin: '0 auto' }}>
      {/* Alert Message Toast */}
      {message && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '0.88rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: message.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            border: `1px solid ${message.type === 'success' ? '#10B981' : '#EF4444'}`,
            color: message.type === 'success' ? '#34D399' : '#F87171'
          }}
        >
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
          <div>{message.text}</div>
        </div>
      )}

      {/* LOGIN SCREEN IF NOT ADMIN */}
      {!isAdmin ? (
        <div className="glass-card gold-border animate-pop" style={{ padding: '24px' }}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <ShieldCheck style={{ width: '56px', height: '56px', color: '#60A5FA', margin: '0 auto 8px auto' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFF' }}>Admin Authentication</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Please enter your Secret Passcode to access the Admin Decision Dashboard.
            </p>
          </div>

          <form onSubmit={handleAdminLogin}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>
                Admin Secret Key
              </label>
              <input
                type="password"
                value={adminSecretInput}
                onChange={(e) => setAdminSecretInput(e.target.value)}
                placeholder="Enter secret (default: admin123)"
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  background: 'rgba(15, 23, 42, 0.9)',
                  border: '1px solid #3B82F6',
                  color: '#FFF',
                  fontSize: '0.95rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                color: '#FFF',
                fontWeight: 800,
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.95rem',
                boxShadow: '0 0 15px rgba(37, 99, 235, 0.4)'
              }}
            >
              {loginLoading ? 'Authenticating...' : 'Unlock Admin Portal'}
            </button>
          </form>
        </div>
      ) : (
        /* ADMIN DASHBOARD WHEN LOGGED IN */
        <div>
          {/* Sub Navigation Bar & Quick Refresh */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', alignItems: 'center' }}>
            <div style={{ display: 'flex', flex: 1, gap: '6px', background: 'rgba(15, 23, 42, 0.6)', padding: '4px', borderRadius: '10px' }}>
              <button
                onClick={() => { setAdminSubTab('deposits'); setMessage(null); }}
                style={{
                  flex: 1,
                  padding: '10px 4px',
                  borderRadius: '8px',
                  border: 'none',
                  background: adminSubTab === 'deposits' ? '#3B82F6' : 'transparent',
                  color: adminSubTab === 'deposits' ? '#FFF' : '#94A3B8',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  position: 'relative'
                }}
              >
                📥 Deposits ({pendingDeposits.length})
                {pendingDeposits.length > 0 && (
                  <span style={{ background: '#EF4444', color: '#FFF', borderRadius: '50%', padding: '1px 6px', fontSize: '0.68rem', fontWeight: 800 }}>
                    {pendingDeposits.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => { setAdminSubTab('withdrawals'); setMessage(null); }}
                style={{
                  flex: 1,
                  padding: '10px 4px',
                  borderRadius: '8px',
                  border: 'none',
                  background: adminSubTab === 'withdrawals' ? '#10B981' : 'transparent',
                  color: adminSubTab === 'withdrawals' ? '#FFF' : '#94A3B8',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  position: 'relative'
                }}
              >
                📤 Payouts ({pendingWithdrawals.length})
                {pendingWithdrawals.length > 0 && (
                  <span style={{ background: '#EF4444', color: '#FFF', borderRadius: '50%', padding: '1px 6px', fontSize: '0.68rem', fontWeight: 800 }}>
                    {pendingWithdrawals.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => { setAdminSubTab('rounds'); setMessage(null); }}
                style={{
                  flex: 1,
                  padding: '10px 4px',
                  borderRadius: '8px',
                  border: 'none',
                  background: adminSubTab === 'rounds' ? 'var(--primary-gold)' : 'transparent',
                  color: adminSubTab === 'rounds' ? '#000' : '#94A3B8',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px'
                }}
              >
                <Settings className="w-3.5 h-3.5" /> Rounds
              </button>
            </div>

            <button
              onClick={handleRefreshData}
              title="Refresh Data"
              style={{
                background: 'rgba(30, 41, 59, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '10px',
                padding: '10px 12px',
                color: '#60A5FA',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* TAB 1: PENDING DEPOSITS */}
          {adminSubTab === 'deposits' && (
            <div className="glass-card">
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                📥 Pending Real Money Deposits ({pendingDeposits.length})
              </h3>

              {pendingDeposits.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 12px', color: '#10B981', fontWeight: 700, fontSize: '0.95rem' }}>
                  🎉 All deposit requests have been reviewed!
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {pendingDeposits.map((pDep) => (
                    <div
                      key={pDep.id}
                      style={{
                        background: 'rgba(15, 23, 42, 0.85)',
                        borderRadius: '10px',
                        padding: '14px',
                        border: '1px solid rgba(59, 130, 246, 0.4)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#FFF' }}>
                            👤 {pDep.user_name}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            📱 Phone: <span style={{ color: '#E2E8F0' }}>{pDep.phone_number || 'N/A'}</span> &bull; TG ID: <span style={{ color: '#E2E8F0' }}>{pDep.telegram_id || 'N/A'}</span>
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#FFD700' }}>
                            +{pDep.amount.toFixed(2)} ETB
                          </div>
                          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94A3B8' }}>
                            {pDep.payment_method}
                          </div>
                        </div>
                      </div>

                      <div style={{
                        background: 'rgba(0,0,0,0.4)',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px dashed var(--primary-gold)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Payment Reference Code:</span>
                        <code style={{ fontSize: '1.05rem', fontWeight: 800, color: '#FFD700' }}>
                          {pDep.reference_code}
                        </code>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                        <button
                          onClick={() => handleApproveDeposit(pDep.reference_code)}
                          disabled={actionLoading === pDep.reference_code}
                          style={{
                            flex: 1,
                            padding: '10px',
                            borderRadius: '6px',
                            background: '#10B981',
                            color: '#FFF',
                            border: 'none',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px'
                          }}
                        >
                          <Check className="w-4 h-4" /> Approve & Credit
                        </button>
                        <button
                          onClick={() => handleRejectDeposit(pDep.reference_code)}
                          disabled={actionLoading === pDep.reference_code}
                          style={{
                            flex: 1,
                            padding: '10px',
                            borderRadius: '6px',
                            background: 'rgba(239, 68, 68, 0.2)',
                            color: '#EF4444',
                            border: '1px solid #EF4444',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px'
                          }}
                        >
                          <X className="w-4 h-4" /> Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PENDING WITHDRAWALS */}
          {adminSubTab === 'withdrawals' && (
            <div className="glass-card">
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                📤 Pending Payout Requests ({pendingWithdrawals.length})
              </h3>

              {pendingWithdrawals.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 12px', color: '#10B981', fontWeight: 700, fontSize: '0.95rem' }}>
                  🎉 All payout requests have been processed!
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {pendingWithdrawals.map((pWdr) => (
                    <div
                      key={pWdr.id}
                      style={{
                        background: 'rgba(15, 23, 42, 0.85)',
                        borderRadius: '10px',
                        padding: '14px',
                        border: '1px solid rgba(16, 185, 129, 0.4)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#FFF' }}>
                            👤 {pWdr.user_name}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            TG ID: <span style={{ color: '#E2E8F0' }}>{pWdr.telegram_id || 'N/A'}</span>
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#EF4444' }}>
                            -{pWdr.amount.toFixed(2)} ETB
                          </div>
                          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#34D399' }}>
                            {pWdr.payment_method}
                          </div>
                        </div>
                      </div>

                      <div style={{
                        background: 'rgba(0,0,0,0.4)',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        border: '1px solid rgba(16, 185, 129, 0.4)',
                        fontSize: '0.85rem',
                        color: '#E2E8F0'
                      }}>
                        <div>📱 Payout Receiver Acc: <strong style={{ color: '#34D399' }}>{pWdr.account_number}</strong></div>
                        <div style={{ marginTop: '2px' }}>👤 Account Name: <strong>{pWdr.account_name}</strong></div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                        <button
                          onClick={() => handleApproveWdr(pWdr.id)}
                          disabled={actionLoading === pWdr.id}
                          style={{
                            flex: 1,
                            padding: '10px',
                            borderRadius: '6px',
                            background: '#10B981',
                            color: '#FFF',
                            border: 'none',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px'
                          }}
                        >
                          <Check className="w-4 h-4" /> Mark Paid & Complete
                        </button>
                        <button
                          onClick={() => handleRejectWdr(pWdr.id)}
                          disabled={actionLoading === pWdr.id}
                          style={{
                            flex: 1,
                            padding: '10px',
                            borderRadius: '6px',
                            background: 'rgba(239, 68, 68, 0.2)',
                            color: '#EF4444',
                            border: '1px solid #EF4444',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px'
                          }}
                        >
                          <X className="w-4 h-4" /> Reject & Refund
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ROUND CONTROL & FUTURE CAPABILITIES */}
          {adminSubTab === 'rounds' && (
            <div className="glass-card">
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                ⚙️ Round Management & Bot Settings
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.5 }}>
                Admin management panel for creating live rounds, adjusting entry card prices, setting game patterns, and managing automatic bot player creation.
              </p>

              <div style={{ background: 'rgba(30, 41, 59, 0.6)', borderRadius: '8px', padding: '16px', border: '1px solid rgba(255,255,255,0.1)', marginBottom: '16px' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--primary-gold)', marginBottom: '8px' }}>
                  ⚡ Automated Round Engine
                </div>
                <div style={{ fontSize: '0.82rem', color: '#E2E8F0', lineHeight: 1.5 }}>
                  The backend bot automatically schedules rounds with 30-second start countdowns. Users purchase cards from the Card Store and wait for the live draw.
                </div>
              </div>

              <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '8px', padding: '14px' }}>
                <div style={{ fontSize: '0.85rem', color: '#60A5FA', fontWeight: 700, marginBottom: '4px' }}>
                  💡 Future Admin Enhancements
                </div>
                <div style={{ fontSize: '0.78rem', color: '#94A3B8' }}>
                  Hooks are prepared for manual round creation, custom prize pool overrides, and game pattern selection.
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
