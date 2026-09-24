const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/api/v1`;
  }
  return 'http://localhost:8000/api/v1';
};

export const fetchApi = async (endpoint: string, options: RequestInit = {}, token?: string) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${getApiBaseUrl()}${endpoint}`, {
    ...options,
    headers
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail?.message || data.detail || 'API Request failed');
  }
  return data;
};

export const apiService = {
  loginTelegram: (initData: string) => 
    fetchApi('/auth/telegram', {
      method: 'POST',
      body: JSON.stringify({ init_data: initData })
    }),

  loginContact: (phoneNumber: string, telegramId: number, firstName: string, username: string = "") =>
    fetchApi('/auth/contact', {
      method: 'POST',
      body: JSON.stringify({
        phone_number: phoneNumber,
        telegram_id: telegramId,
        first_name: firstName,
        username
      })
    }),

  getUserProfile: (token: string) => 
    fetchApi('/users/me', {}, token),

  getWalletBalance: (token: string) => 
    fetchApi('/wallet/balance', {}, token),

  depositFunds: (token: string, amount: number = 100) =>
    fetchApi(`/wallet/deposit?amount=${amount}`, { method: 'POST' }, token),

  submitDepositReference: (token: string, amount: number, paymentMethod: string, referenceCode: string) =>
    fetchApi('/deposits/submit', {
      method: 'POST',
      body: JSON.stringify({
        amount,
        payment_method: paymentMethod,
        reference_code: referenceCode
      })
    }, token),

  getUserDeposits: (token: string) =>
    fetchApi('/deposits/my', {}, token),

  getPendingDeposits: (token: string) =>
    fetchApi('/deposits/pending', {}, token),

  approveDeposit: (token: string, referenceCode: string) =>
    fetchApi('/deposits/approve', {
      method: 'POST',
      body: JSON.stringify({ reference_code: referenceCode })
    }, token),

  rejectDeposit: (token: string, referenceCode: string) =>
    fetchApi('/deposits/reject', {
      method: 'POST',
      body: JSON.stringify({ reference_code: referenceCode })
    }, token),

  claimAdminAccess: (token: string, adminSecret: string) =>
    fetchApi('/auth/claim-admin', {
      method: 'POST',
      body: JSON.stringify({ admin_secret: adminSecret })
    }, token),

  requestWithdrawal: (token: string, amount: number, paymentMethod: string, accountNumber: string, accountName: string) =>
    fetchApi('/withdrawals/request', {
      method: 'POST',
      body: JSON.stringify({
        amount,
        payment_method: paymentMethod,
        account_number: accountNumber,
        account_name: accountName
      })
    }, token),

  getUserWithdrawals: (token: string) =>
    fetchApi('/withdrawals/my', {}, token),

  getPendingWithdrawals: (token: string) =>
    fetchApi('/withdrawals/pending', {}, token),

  approveWithdrawal: (token: string, withdrawalId: string) =>
    fetchApi('/withdrawals/approve', {
      method: 'POST',
      body: JSON.stringify({ withdrawal_id: withdrawalId })
    }, token),

  rejectWithdrawal: (token: string, withdrawalId: string) =>
    fetchApi('/withdrawals/reject', {
      method: 'POST',
      body: JSON.stringify({ withdrawal_id: withdrawalId })
    }, token),

  getUpcomingRounds: () => 
    fetchApi('/rounds/upcoming'),

  startRoundGameLoop: (token: string, roundId: string) =>
    fetchApi(`/rounds/${roundId}/start`, { method: 'POST' }, token),

  getRoundCards: (roundId: string, page: number = 1, limit: number = 50, search?: number) => {
    let url = `/rounds/${roundId}/cards?page=${page}&limit=${limit}`;
    if (search !== undefined) url += `&search=${search}`;
    return fetchApi(url);
  },

  buyCard: (token: string, roundId: string, cardNumber: number) =>
    fetchApi(`/rounds/${roundId}/buy-card`, {
      method: 'POST',
      body: JSON.stringify({ card_number: cardNumber })
    }, token),

  claimBingo: (token: string, roundId: string, cardId: string) =>
    fetchApi(`/rounds/${roundId}/claim-bingo`, {
      method: 'POST',
      body: JSON.stringify({ card_id: cardId })
    }, token)
};
