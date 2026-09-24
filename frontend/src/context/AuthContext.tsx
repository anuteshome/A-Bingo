import React, { createContext, useContext, useState, useEffect } from 'react';
import { getTelegramInitData } from '../utils/telegram';
import { apiService } from '../services/api';

interface User {
  id: string;
  telegram_id: number;
  username: string;
  first_name: string;
  phone_number?: string;
  is_admin?: boolean;
}

export interface DepositRecord {
  id: string;
  amount: number;
  payment_method: string;
  reference_code: string;
  status: string;
  created_at: string;
  completed_at?: string;
}

export interface PendingDepositRecord {
  id: string;
  user_id: string;
  user_name: string;
  telegram_id?: number;
  phone_number?: string;
  amount: number;
  payment_method: string;
  reference_code: string;
  status: string;
  created_at: string;
}

export interface WithdrawalRecord {
  id: string;
  amount: number;
  payment_method: string;
  account_number: string;
  account_name: string;
  status: string;
  created_at: string;
  completed_at?: string;
}

export interface PendingWithdrawalRecord {
  id: string;
  user_id: string;
  user_name: string;
  telegram_id?: number;
  phone_number?: string;
  amount: number;
  payment_method: string;
  account_number: string;
  account_name: string;
  status: string;
  created_at: string;
}

interface AuthContextType {
  token: string | null;
  user: User | null;
  balance: number;
  loading: boolean;
  isAdmin: boolean;
  deposits: DepositRecord[];
  pendingDeposits: PendingDepositRecord[];
  withdrawals: WithdrawalRecord[];
  pendingWithdrawals: PendingWithdrawalRecord[];
  refreshBalance: () => Promise<void>;
  refreshDeposits: () => Promise<void>;
  refreshPendingDeposits: () => Promise<void>;
  refreshWithdrawals: () => Promise<void>;
  refreshPendingWithdrawals: () => Promise<void>;
  deposit: (amount?: number) => Promise<void>;
  submitDepositReference: (amount: number, paymentMethod: string, referenceCode: string) => Promise<any>;
  approvePendingDeposit: (referenceCode: string) => Promise<any>;
  rejectPendingDeposit: (referenceCode: string) => Promise<any>;
  requestWithdrawal: (amount: number, paymentMethod: string, accountNumber: string, accountName: string) => Promise<any>;
  approvePendingWithdrawal: (withdrawalId: string) => Promise<any>;
  rejectPendingWithdrawal: (withdrawalId: string) => Promise<any>;
  claimAdmin: (adminSecret: string) => Promise<any>;
  adminLogout: () => void;
  loginWithContact: (phone: string, tgId?: number, firstName?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('bingo_jwt'));
  const [user, setUser] = useState<User | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [deposits, setDeposits] = useState<DepositRecord[]>([]);
  const [pendingDeposits, setPendingDeposits] = useState<PendingDepositRecord[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRecord[]>([]);
  const [pendingWithdrawals, setPendingWithdrawals] = useState<PendingWithdrawalRecord[]>([]);
  const [isAdmin, setIsAdmin] = useState<boolean>(localStorage.getItem('bingo_is_admin') === 'true');
  const [loading, setLoading] = useState<boolean>(true);

  const refreshBalance = async () => {
    if (!token) return;
    try {
      const data = await apiService.getWalletBalance(token);
      setBalance(data.balance);
    } catch (e) {
      console.error("Failed to fetch balance", e);
    }
  };

  const refreshDeposits = async () => {
    if (!token) return;
    try {
      const data = await apiService.getUserDeposits(token);
      setDeposits(data);
    } catch (e) {
      console.error("Failed to fetch deposit history", e);
    }
  };

  const refreshPendingDeposits = async () => {
    if (!token) return;
    try {
      const data = await apiService.getPendingDeposits(token);
      setPendingDeposits(data);
    } catch (e) {
      console.error("Failed to fetch pending deposits", e);
    }
  };

  const refreshWithdrawals = async () => {
    if (!token) return;
    try {
      const data = await apiService.getUserWithdrawals(token);
      setWithdrawals(data);
    } catch (e) {
      console.error("Failed to fetch withdrawal history", e);
    }
  };

  const refreshPendingWithdrawals = async () => {
    if (!token) return;
    try {
      const data = await apiService.getPendingWithdrawals(token);
      setPendingWithdrawals(data);
    } catch (e) {
      console.error("Failed to fetch pending withdrawals", e);
    }
  };

  const deposit = async (amount: number = 100) => {
    if (!token) throw new Error("Not authenticated");
    try {
      const data = await apiService.depositFunds(token, amount);
      setBalance(data.balance);
      await refreshDeposits();
    } catch (e) {
      console.error("Deposit error", e);
      throw e;
    }
  };

  const submitDepositReference = async (amount: number, paymentMethod: string, referenceCode: string) => {
    if (!token) throw new Error("Not authenticated");
    try {
      const res = await apiService.submitDepositReference(token, amount, paymentMethod, referenceCode);
      await refreshDeposits();
      if (isAdmin) {
        await refreshPendingDeposits();
      }
      return res;
    } catch (e) {
      console.error("Submit deposit reference error", e);
      throw e;
    }
  };

  const approvePendingDeposit = async (referenceCode: string) => {
    if (!token) throw new Error("Not authenticated");
    try {
      const res = await apiService.approveDeposit(token, referenceCode);
      await refreshPendingDeposits();
      await refreshBalance();
      await refreshDeposits();
      return res;
    } catch (e) {
      console.error("Approve deposit error", e);
      throw e;
    }
  };

  const rejectPendingDeposit = async (referenceCode: string) => {
    if (!token) throw new Error("Not authenticated");
    try {
      const res = await apiService.rejectDeposit(token, referenceCode);
      await refreshPendingDeposits();
      return res;
    } catch (e) {
      console.error("Reject deposit error", e);
      throw e;
    }
  };

  const requestWithdrawal = async (amount: number, paymentMethod: string, accountNumber: string, accountName: string) => {
    if (!token) throw new Error("Not authenticated");
    try {
      const res = await apiService.requestWithdrawal(token, amount, paymentMethod, accountNumber, accountName);
      await refreshBalance();
      await refreshWithdrawals();
      if (isAdmin) {
        await refreshPendingWithdrawals();
      }
      return res;
    } catch (e) {
      console.error("Request withdrawal error", e);
      throw e;
    }
  };

  const approvePendingWithdrawal = async (withdrawalId: string) => {
    if (!token) throw new Error("Not authenticated");
    try {
      const res = await apiService.approveWithdrawal(token, withdrawalId);
      await refreshPendingWithdrawals();
      await refreshWithdrawals();
      return res;
    } catch (e) {
      console.error("Approve withdrawal error", e);
      throw e;
    }
  };

  const rejectPendingWithdrawal = async (withdrawalId: string) => {
    if (!token) throw new Error("Not authenticated");
    try {
      const res = await apiService.rejectWithdrawal(token, withdrawalId);
      await refreshPendingWithdrawals();
      await refreshBalance();
      await refreshWithdrawals();
      return res;
    } catch (e) {
      console.error("Reject withdrawal error", e);
      throw e;
    }
  };

  const claimAdmin = async (adminSecret: string) => {
    if (!token) throw new Error("Not authenticated");
    try {
      const res = await apiService.claimAdminAccess(token, adminSecret);
      setIsAdmin(true);
      localStorage.setItem('bingo_is_admin', 'true');
      if (user) {
        setUser({ ...user, is_admin: true });
      }
      await refreshPendingDeposits();
      await refreshPendingWithdrawals();
      return res;
    } catch (e) {
      console.error("Claim admin error", e);
      throw e;
    }
  };

  const adminLogout = () => {
    localStorage.removeItem('bingo_is_admin');
    setIsAdmin(false);
  };

  const loginWithContact = async (phone: string, tgId: number = 12345678, firstName: string = "Player") => {
    try {
      const authRes = await apiService.loginContact(phone, tgId, firstName);
      setToken(authRes.access_token);
      setUser(authRes.user);
      const isUserAdmin = !!authRes.user?.is_admin || localStorage.getItem('bingo_is_admin') === 'true';
      setIsAdmin(isUserAdmin);
      localStorage.setItem('bingo_jwt', authRes.access_token);
      const wData = await apiService.getWalletBalance(authRes.access_token);
      setBalance(wData.balance);
      try {
        const depData = await apiService.getUserDeposits(authRes.access_token);
        setDeposits(depData);
        const wdrData = await apiService.getUserWithdrawals(authRes.access_token);
        setWithdrawals(wdrData);
      } catch (e) {
        console.error("Failed to load deposits/withdrawals on login", e);
      }
      if (isUserAdmin) {
        refreshPendingDeposits();
        refreshPendingWithdrawals();
      }
    } catch (err) {
      console.error("Contact login failed", err);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const phoneParam = urlParams.get('phone');
        
        let authRes;
        if (phoneParam) {
          authRes = await apiService.loginContact(phoneParam, 12345678, 'Verified User');
        } else {
          const initData = getTelegramInitData();
          authRes = await apiService.loginTelegram(initData);
        }

        setToken(authRes.access_token);
        setUser(authRes.user);
        const isUserAdmin = !!authRes.user?.is_admin || localStorage.getItem('bingo_is_admin') === 'true';
        setIsAdmin(isUserAdmin);
        localStorage.setItem('bingo_jwt', authRes.access_token);
        
        // Fetch balance
        const wData = await apiService.getWalletBalance(authRes.access_token);
        setBalance(wData.balance);

        // Fetch deposits & withdrawals
        try {
          const depData = await apiService.getUserDeposits(authRes.access_token);
          setDeposits(depData);
          const wdrData = await apiService.getUserWithdrawals(authRes.access_token);
          setWithdrawals(wdrData);
        } catch (e) {
          console.error("Failed to load deposits/withdrawals on init", e);
        }

        if (isUserAdmin) {
          try {
            const pendData = await apiService.getPendingDeposits(authRes.access_token);
            setPendingDeposits(pendData);
            const pendWdr = await apiService.getPendingWithdrawals(authRes.access_token);
            setPendingWithdrawals(pendWdr);
          } catch (e) {
            console.error("Failed to load pending data on init", e);
          }
        }
      } catch (err) {
        console.error("Auth init failed", err);
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, []);

  return (
    <AuthContext.Provider value={{
      token,
      user,
      balance,
      loading,
      isAdmin,
      deposits,
      pendingDeposits,
      withdrawals,
      pendingWithdrawals,
      refreshBalance,
      refreshDeposits,
      refreshPendingDeposits,
      refreshWithdrawals,
      refreshPendingWithdrawals,
      deposit,
      submitDepositReference,
      approvePendingDeposit,
      rejectPendingDeposit,
      requestWithdrawal,
      approvePendingWithdrawal,
      rejectPendingWithdrawal,
      claimAdmin,
      adminLogout,
      loginWithContact
    }}>
      {children}
    </AuthContext.Provider>
  );
};


export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
