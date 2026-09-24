import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Wallet, CreditCard, History, CheckCircle2, AlertCircle, RefreshCw, Send, ShieldCheck, Check, X, ArrowUpRight, LogOut } from 'lucide-react';

export const WalletView: React.FC = () => {
  const { 
    balance, 
    deposits, 
    pendingDeposits, 
    withdrawals, 
    pendingWithdrawals, 
    isAdmin, 
    submitDepositReference, 
    approvePendingDeposit, 
    rejectPendingDeposit, 
    requestWithdrawal, 
    approvePendingWithdrawal, 
    rejectPendingWithdrawal, 
    claimAdmin, 
    adminLogout, 
    refreshBalance, 
    refreshDeposits, 
    refreshPendingDeposits, 
    refreshWithdrawals, 
    refreshPendingWithdrawals 
  } = useAuth();

  const [activeTab, setActiveTab] = useState<'real' | 'withdraw' | 'history' | 'admin'>('real');
  
  // Real deposit form state
  const [paymentMethod, setPaymentMethod] = useState<'TELEBIRR' | 'CBE_BIRR' | 'BANK_TRANSFER'>('TELEBIRR');
  const [realAmount, setRealAmount] = useState<number>(100);
  const [refCode, setRefCode] = useState<string>('');
  const [realLoading, setRealLoading] = useState<boolean>(false);

  // Withdrawal form state
  const [wdrMethod, setWdrMethod] = useState<'TELEBIRR' | 'CBE_BIRR' | 'BANK_TRANSFER'>('TELEBIRR');
  const [wdrAmount, setWdrAmount] = useState<number>(100);
  const [wdrAccountNum, setWdrAccountNum] = useState<string>('');
  const [wdrAccountName, setWdrAccountName] = useState<string>('');
  const [wdrLoading, setWdrLoading] = useState<boolean>(false);

  // Admin state
  const [adminSubTab, setAdminSubTab] = useState<'deposits' | 'withdrawals'>('deposits');
  const [adminSecretInput, setAdminSecretInput] = useState<string>('');
  const [adminLoading, setAdminLoading] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Status message state
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleRealSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!refCode.trim()) {
      setMessage({ type: 'error', text: 'Please enter your payment reference code' });
      return;
    }

    if (realAmount <= 0) {
      setMessage({ type: 'error', text: 'Amount must be greater than 0 ETB' });
      return;
    }

    setRealLoading(true);
    try {
      await submitDepositReference(realAmount, paymentMethod, refCode.trim());
      setMessage({
        type: 'success',
        text: `✅ Reference '${refCode.trim().toUpperCase()}' submitted successfully! Pending admin verification.`
      });
      setRefCode('');
      setActiveTab('history');
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to submit payment reference' });
    } finally {
      setRealLoading(false);
    }
  };

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!wdrAccountNum.trim() || !wdrAccountName.trim()) {
      setMessage({ type: 'error', text: 'Please enter receiver account number and account holder name' });
      return;
    }

    if (wdrAmount < 50) {
      setMessage({ type: 'error', text: 'Minimum withdrawal amount is 50 ETB' });
      return;
    }

    if (wdrAmount > balance) {
      setMessage({ type: 'error', text: 'Insufficient balance' });
      return;
    }

    setWdrLoading(true);
    try {
      await requestWithdrawal(wdrAmount, wdrMethod, wdrAccountNum.trim(), wdrAccountName.trim());
      setMessage({
        type: 'success',
        text: `💸 Withdrawal request of ${wdrAmount} ETB submitted! Pending admin payout.`
      });
      setWdrAccountNum('');
      setWdrAccountName('');
      setActiveTab('history');
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to submit withdrawal request' });
    } finally {
      setWdrLoading(false);
    }
  };

  const handleClaimAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (!adminSecretInput.trim()) return;

    setAdminLoading(true);
    try {
      await claimAdmin(adminSecretInput.trim());
      setMessage({ type: 'success', text: '👑 Admin privileges granted!' });
      setAdminSecretInput('');
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Invalid admin secret key' });
    } finally {
      setAdminLoading(false);
    }
  };

  const handleApproveDeposit = async (ref: string) => {
    setMessage(null);
    setActionLoading(ref);
    try {
      await approvePendingDeposit(ref);
      setMessage({ type: 'success', text: `✅ Deposit '${ref}' approved!` });
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
      setMessage({ type: 'success', text: `❌ Deposit '${ref}' rejected.` });
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
      setMessage({ type: 'success', text: `✅ Withdrawal marked as PAID and COMPLETED!` });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to approve withdrawal' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectWdr = async (id: string) => {
    setMessage(null);
    setActionLoading(id);
    try {
      await rejectPendingWithdrawal(id);
      setMessage({ type: 'success', text: `❌ Withdrawal rejected and funds refunded to user!` });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to reject withdrawal' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRefresh = async () => {
    await refreshBalance();
    await refreshDeposits();
    await refreshWithdrawals();
    if (isAdmin) {
      await refreshPendingDeposits();
      await refreshPendingWithdrawals();
    }
  };

  return (
    <div style={{ padding: '16px', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary-gold)', margin: 0 }}>
          💰 Wallet & Cashier
        </h2>
        <button
          onClick={handleRefresh}
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '8px',
            padding: '6px 12px',
            color: '#FFF',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
            fontSize: '0.8rem'
          }}
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Balance Banner */}
      <div className="glass-card gold-border animate-pop" style={{ textAlign: 'center', padding: '20px', marginBottom: '16px' }}>
        <Wallet style={{ width: '40px', height: '40px', color: 'var(--primary-gold)', margin: '0 auto 6px auto' }} />
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Available Game Balance
        </div>
        <div style={{ fontSize: '2.2rem', fontWeight: 900, fontFamily: 'var(--font-heading)', color: '#FFF', margin: '4px 0' }}>
          {balance.toFixed(2)} <span style={{ fontSize: '1.1rem', color: 'var(--primary-gold)' }}>ETB</span>
        </div>
      </div>

      {/* Feedback Toast Banner */}
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

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', background: 'rgba(15, 23, 42, 0.6)', padding: '4px', borderRadius: '10px' }}>
        <button
          onClick={() => { setActiveTab('real'); setMessage(null); }}
          style={{
            flex: 1,
            padding: '10px 4px',
            borderRadius: '8px',
            border: 'none',
            background: activeTab === 'real' ? 'var(--primary-gold)' : 'transparent',
            color: activeTab === 'real' ? '#000' : '#94A3B8',
            fontWeight: 700,
            fontSize: '0.8rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            transition: 'all 0.2s'
          }}
        >
          <CreditCard className="w-3.5 h-3.5" /> Deposit
        </button>
        <button
          onClick={() => { setActiveTab('withdraw'); setMessage(null); }}
          style={{
            flex: 1,
            padding: '10px 4px',
            borderRadius: '8px',
            border: 'none',
            background: activeTab === 'withdraw' ? '#10B981' : 'transparent',
            color: activeTab === 'withdraw' ? '#FFF' : '#94A3B8',
            fontWeight: 700,
            fontSize: '0.8rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            transition: 'all 0.2s'
          }}
        >
          <ArrowUpRight className="w-3.5 h-3.5" /> Withdraw
        </button>
        <button
          onClick={() => { setActiveTab('history'); setMessage(null); }}
          style={{
            flex: 1,
            padding: '10px 4px',
            borderRadius: '8px',
            border: 'none',
            background: activeTab === 'history' ? 'var(--primary-gold)' : 'transparent',
            color: activeTab === 'history' ? '#000' : '#94A3B8',
            fontWeight: 700,
            fontSize: '0.8rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            transition: 'all 0.2s'
          }}
        >
          <History className="w-3.5 h-3.5" /> History
        </button>
        { (isAdmin || new URLSearchParams(window.location.search).get('admin') === '1') && (
          <button
            onClick={() => { 
              setActiveTab('admin'); 
              setMessage(null); 
              if (isAdmin) {
                refreshPendingDeposits();
                refreshPendingWithdrawals();
              }
            }}
            style={{
              flex: 1,
              padding: '10px 4px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'admin' ? '#3B82F6' : 'transparent',
              color: activeTab === 'admin' ? '#FFF' : '#94A3B8',
              fontWeight: 700,
              fontSize: '0.8rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              position: 'relative',
              transition: 'all 0.2s'
            }}
          >
            <ShieldCheck className="w-3.5 h-3.5" /> Approval
            {isAdmin && (pendingDeposits.length + pendingWithdrawals.length) > 0 && (
              <span style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                background: '#EF4444',
                color: '#FFF',
                borderRadius: '50%',
                width: '18px',
                height: '18px',
                fontSize: '0.7rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {pendingDeposits.length + pendingWithdrawals.length}
              </span>
            )}
          </button>
        )}
      </div>

      {/* TAB 1: REAL MONEY DEPOSIT */}
      {activeTab === 'real' && (
        <div className="glass-card">
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CreditCard className="w-5 h-5 text-yellow-400" /> Real Money Payment Submission
          </h3>

          {/* Account Details Box */}
          <div style={{ background: 'rgba(30, 41, 59, 0.7)', borderRadius: '8px', padding: '12px', border: '1px solid rgba(255,215,0,0.2)', marginBottom: '16px' }}>
            <div style={{ fontSize: '0.82rem', color: 'var(--primary-gold)', fontWeight: 700, marginBottom: '8px' }}>
              🏦 Official Transfer Accounts:
            </div>
            <div style={{ fontSize: '0.82rem', color: '#E2E8F0', lineHeight: 1.5 }}>
              📱 <strong>Telebirr</strong>: <code style={{ color: '#FFD700', background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '4px' }}>0911000000</code> (Bingo Admin)<br />
              🏦 <strong>CBE Bank</strong>: <code style={{ color: '#FFD700', background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '4px' }}>1000123456789</code> (Bingo Admin)
            </div>
          </div>

          <form onSubmit={handleRealSubmit}>
            {/* Select Method */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>
                1. Select Payment Method
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {(['TELEBIRR', 'CBE_BIRR', 'BANK_TRANSFER'] as const).map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    style={{
                      flex: 1,
                      padding: '8px 4px',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      background: paymentMethod === method ? 'rgba(255, 215, 0, 0.2)' : 'rgba(15, 23, 42, 0.6)',
                      color: paymentMethod === method ? '#FFD700' : '#94A3B8',
                      border: `1px solid ${paymentMethod === method ? '#FFD700' : 'rgba(255,255,255,0.1)'}`,
                      cursor: 'pointer'
                    }}
                  >
                    {method === 'TELEBIRR' ? '📱 Telebirr' : method === 'CBE_BIRR' ? '🏦 CBE Birr' : '💳 Bank'}
                  </button>
                ))}
              </div>
            </div>

            {/* Select/Enter Amount */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>
                2. Deposit Amount (ETB)
              </label>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                {[50, 100, 250, 500].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setRealAmount(amt)}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: '6px',
                      background: realAmount === amt ? 'var(--primary-gold)' : 'rgba(30, 41, 59, 0.8)',
                      color: realAmount === amt ? '#000' : '#FFF',
                      border: `1px solid ${realAmount === amt ? '#FFD700' : 'rgba(255,255,255,0.1)'}`,
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: 'pointer'
                    }}
                  >
                    {amt} ETB
                  </button>
                ))}
              </div>
              <input
                type="number"
                min="1"
                step="any"
                value={realAmount}
                onChange={(e) => setRealAmount(parseFloat(e.target.value) || 0)}
                placeholder="Enter custom amount"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#FFF',
                  fontSize: '0.9rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Reference Code Input */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>
                3. Payment Reference / Transaction ID
              </label>
              <input
                type="text"
                value={refCode}
                onChange={(e) => setRefCode(e.target.value)}
                placeholder="e.g. FT2409191234 or TXN987654"
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '6px',
                  background: 'rgba(15, 23, 42, 0.9)',
                  border: '1px solid var(--primary-gold)',
                  color: '#FFF',
                  fontSize: '1rem',
                  letterSpacing: '1px',
                  boxSizing: 'border-box',
                  textTransform: 'uppercase'
                }}
              />
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Copy the transaction reference from your Telebirr / Bank SMS receipt.
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={realLoading}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <Send className="w-4 h-4" />
              {realLoading ? 'Submitting Reference...' : `Submit ${realAmount} ETB Deposit`}
            </button>
          </form>
        </div>
      )}

      {/* TAB 2: REAL MONEY WITHDRAWAL */}
      {activeTab === 'withdraw' && (
        <div className="glass-card">
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ArrowUpRight className="w-5 h-5 text-emerald-400" /> Request ETB Withdrawal
          </h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
            Withdraw your winnings directly to your Telebirr or CBE Bank account. Minimum: <strong>50 ETB</strong>.
          </p>

          <form onSubmit={handleWithdrawSubmit}>
            {/* Select Method */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>
                1. Select Payout Method
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {(['TELEBIRR', 'CBE_BIRR', 'BANK_TRANSFER'] as const).map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setWdrMethod(method)}
                    style={{
                      flex: 1,
                      padding: '8px 4px',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      background: wdrMethod === method ? 'rgba(16, 185, 129, 0.2)' : 'rgba(15, 23, 42, 0.6)',
                      color: wdrMethod === method ? '#34D399' : '#94A3B8',
                      border: `1px solid ${wdrMethod === method ? '#10B981' : 'rgba(255,255,255,0.1)'}`,
                      cursor: 'pointer'
                    }}
                  >
                    {method === 'TELEBIRR' ? '📱 Telebirr' : method === 'CBE_BIRR' ? '🏦 CBE Birr' : '💳 Bank'}
                  </button>
                ))}
              </div>
            </div>

            {/* Select/Enter Amount */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>
                2. Withdrawal Amount (ETB)
              </label>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                {[50, 100, 250, 500].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setWdrAmount(amt)}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: '6px',
                      background: wdrAmount === amt ? '#10B981' : 'rgba(30, 41, 59, 0.8)',
                      color: wdrAmount === amt ? '#FFF' : '#FFF',
                      border: `1px solid ${wdrAmount === amt ? '#10B981' : 'rgba(255,255,255,0.1)'}`,
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: 'pointer'
                    }}
                  >
                    {amt} ETB
                  </button>
                ))}
              </div>
              <input
                type="number"
                min="50"
                step="any"
                value={wdrAmount}
                onChange={(e) => setWdrAmount(parseFloat(e.target.value) || 0)}
                placeholder="Enter custom amount"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#FFF',
                  fontSize: '0.9rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Receiver Account Details */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>
                3. Receiver Account / Phone Number
              </label>
              <input
                type="text"
                value={wdrAccountNum}
                onChange={(e) => setWdrAccountNum(e.target.value)}
                placeholder="e.g. 0912345678 or 1000123456789"
                required
                style={{
                  width: '100%',
                  padding: '11px',
                  borderRadius: '6px',
                  background: 'rgba(15, 23, 42, 0.9)',
                  border: '1px solid #10B981',
                  color: '#FFF',
                  fontSize: '0.95rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>
                4. Account Holder Name
              </label>
              <input
                type="text"
                value={wdrAccountName}
                onChange={(e) => setWdrAccountName(e.target.value)}
                placeholder="e.g. Abebe Bikila"
                required
                style={{
                  width: '100%',
                  padding: '11px',
                  borderRadius: '6px',
                  background: 'rgba(15, 23, 42, 0.9)',
                  border: '1px solid #10B981',
                  color: '#FFF',
                  fontSize: '0.95rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={wdrLoading}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                background: '#10B981',
                color: '#FFF',
                fontWeight: 800,
                border: 'none',
                fontSize: '0.95rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <Send className="w-4 h-4" />
              {wdrLoading ? 'Processing Request...' : `Submit ${wdrAmount} ETB Withdrawal`}
            </button>
          </form>
        </div>
      )}



      {/* TAB 4: TRANSACTION HISTORY */}
      {activeTab === 'history' && (
        <div className="glass-card">
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <History className="w-5 h-5 text-yellow-400" /> Transaction History
          </h3>

          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--primary-gold)', marginBottom: '8px' }}>
              📥 Deposits ({deposits.length})
            </div>
            {deposits.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '12px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                No deposit transactions found.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {deposits.map((dep) => (
                  <div
                    key={dep.id}
                    style={{
                      background: 'rgba(15, 23, 42, 0.6)',
                      borderRadius: '8px',
                      padding: '10px 12px',
                      border: '1px solid rgba(255,255,255,0.08)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#FFF' }}>
                        {dep.payment_method} &bull; <span style={{ color: 'var(--primary-gold)' }}>+{dep.amount.toFixed(2)} ETB</span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Ref: <code style={{ color: '#E2E8F0' }}>{dep.reference_code}</code>
                      </div>
                    </div>
                    <div>
                      {dep.status === 'COMPLETED' && <span style={{ color: '#34D399', fontSize: '0.75rem', fontWeight: 700 }}>Approved</span>}
                      {dep.status === 'PENDING' && <span style={{ color: '#FBBF24', fontSize: '0.75rem', fontWeight: 700 }}>Pending</span>}
                      {dep.status === 'REJECTED' && <span style={{ color: '#F87171', fontSize: '0.75rem', fontWeight: 700 }}>Rejected</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#34D399', marginBottom: '8px' }}>
              📤 Withdrawals ({withdrawals.length})
            </div>
            {withdrawals.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '12px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                No withdrawal requests found.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {withdrawals.map((wdr) => (
                  <div
                    key={wdr.id}
                    style={{
                      background: 'rgba(15, 23, 42, 0.6)',
                      borderRadius: '8px',
                      padding: '10px 12px',
                      border: '1px solid rgba(255,255,255,0.08)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#FFF' }}>
                        {wdr.payment_method} &bull; <span style={{ color: '#EF4444' }}>-{wdr.amount.toFixed(2)} ETB</span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Acc: <code style={{ color: '#E2E8F0' }}>{wdr.account_number}</code> ({wdr.account_name})
                      </div>
                    </div>
                    <div>
                      {wdr.status === 'COMPLETED' && <span style={{ color: '#34D399', fontSize: '0.75rem', fontWeight: 700 }}>Paid</span>}
                      {wdr.status === 'PENDING' && <span style={{ color: '#FBBF24', fontSize: '0.75rem', fontWeight: 700 }}>Processing</span>}
                      {wdr.status === 'REJECTED' && <span style={{ color: '#F87171', fontSize: '0.75rem', fontWeight: 700 }}>Refunded</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: ADMIN APPROVAL PANEL */}
      {activeTab === 'admin' && (
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck className="w-5 h-5 text-blue-400" /> 👑 Admin Portal
            </h3>
            {isAdmin && (
              <button
                onClick={() => {
                  adminLogout();
                  setActiveTab('real');
                  setMessage({ type: 'success', text: 'Logged out of Admin Portal' });
                }}
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid #EF4444',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  color: '#F87171',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer'
                }}
              >
                <LogOut className="w-3.5 h-3.5" /> Log Out
              </button>
            )}
          </div>

          {!isAdmin ? (
            <div>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                Enter your Admin Secret Passcode to view and manage pending deposits and payouts.
              </p>
              <form onSubmit={handleClaimAdmin}>
                <div style={{ marginBottom: '14px' }}>
                  <input
                    type="password"
                    value={adminSecretInput}
                    onChange={(e) => setAdminSecretInput(e.target.value)}
                    placeholder="Enter Admin Secret (default: admin123)"
                    required
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '6px',
                      background: 'rgba(15, 23, 42, 0.9)',
                      border: '1px solid #3B82F6',
                      color: '#FFF',
                      fontSize: '0.9rem',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={adminLoading}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    background: '#2563EB',
                    color: '#FFF',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.9rem'
                  }}
                >
                  {adminLoading ? 'Unlocking Admin...' : 'Unlock Admin Approval Panel'}
                </button>
              </form>
            </div>
          ) : (
            <div>
              {/* Admin Sub-Tabs */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <button
                  onClick={() => setAdminSubTab('deposits')}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '6px',
                    background: adminSubTab === 'deposits' ? '#3B82F6' : 'rgba(15, 23, 42, 0.6)',
                    color: adminSubTab === 'deposits' ? '#FFF' : '#94A3B8',
                    border: '1px solid rgba(59, 130, 246, 0.4)',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: 'pointer'
                  }}
                >
                  📥 Deposits ({pendingDeposits.length})
                </button>
                <button
                  onClick={() => setAdminSubTab('withdrawals')}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '6px',
                    background: adminSubTab === 'withdrawals' ? '#10B981' : 'rgba(15, 23, 42, 0.6)',
                    color: adminSubTab === 'withdrawals' ? '#FFF' : '#94A3B8',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: 'pointer'
                  }}
                >
                  📤 Payouts ({pendingWithdrawals.length})
                </button>
              </div>

              {/* SECTION A: PENDING DEPOSITS */}
              {adminSubTab === 'deposits' && (
                <div>
                  {pendingDeposits.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px 12px', color: '#10B981', fontWeight: 600, fontSize: '0.9rem' }}>
                      🎉 No pending deposit requests!
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {pendingDeposits.map((pDep) => (
                        <div
                          key={pDep.id}
                          style={{
                            background: 'rgba(15, 23, 42, 0.8)',
                            borderRadius: '10px',
                            padding: '14px',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
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
                              <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#FFD700' }}>
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
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Ref Code:</span>
                            <code style={{ fontSize: '1rem', fontWeight: 800, color: '#FFD700' }}>
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

              {/* SECTION B: PENDING WITHDRAWALS */}
              {adminSubTab === 'withdrawals' && (
                <div>
                  {pendingWithdrawals.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px 12px', color: '#10B981', fontWeight: 600, fontSize: '0.9rem' }}>
                      🎉 No pending payout requests!
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {pendingWithdrawals.map((pWdr) => (
                        <div
                          key={pWdr.id}
                          style={{
                            background: 'rgba(15, 23, 42, 0.8)',
                            borderRadius: '10px',
                            padding: '14px',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
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
                              <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#EF4444' }}>
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
                            <div>📱 Payout Account: <strong style={{ color: '#34D399' }}>{pWdr.account_number}</strong></div>
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
            </div>
          )}
        </div>
      )}
    </div>
  );
};
