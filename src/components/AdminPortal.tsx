import React, { useState, useEffect } from 'react';
import {
  UserAccount,
  HenOrder,
  WithdrawalRequest,
  GlobalFarmStats,
  FarmShed,
  MedicalPaymentOrder,
  PaymentAccount,
  PaymentMethodType,
  PaymentSettings,
  SupportTicket,
} from '../types/farm';
import {
  apiGetOrders,
  apiApproveOrder,
  apiRejectOrder,
  apiGetWithdrawals,
  apiMarkWithdrawalPaid,
  apiRejectWithdrawal,
  apiGetStats,
  apiUpdateStats,
  apiGetUsers,
  subscribeToOrders,
  subscribeToUsers,
  subscribeToWithdrawals,
  subscribeToGlobalStats,
  subscribeToSheds,
  subscribeToMedicalPayments,
  subscribeToPaymentMethods,
  subscribeToPaymentSettings,
  subscribeToTickets,
  apiAddPaymentMethod,
  apiUpdatePaymentMethod,
  apiDeletePaymentMethod,
  apiUpdatePaymentSettings,
  apiReplyTicket,
  apiApplyShedMortality,
  apiUpdateShedCracking,
  apiDeclareShedSickness,
  apiSetUserStatus,
  apiApproveMedicalPayment,
  apiRejectMedicalPayment,
  apiSendAdminCustomMessage,
} from '../services/api';
import { INITIAL_SHEDS, SHED_CAPACITY, MEDICAL_FEE_PKR, calculateShedDynamicSum } from '../utils/farmRules';
import { t } from '../utils/translations';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Wallet,
  Sparkles,
  ArrowUpRight,
  ArrowDownLeft,
  Users,
  Search,
  Feather,
  Mail,
  Phone,
  Calendar,
  CreditCard,
  RefreshCw,
  ChevronRight,
  ArrowLeft,
  Warehouse,
  AlertTriangle,
  HeartPulse,
  Activity,
  Percent,
  UserCheck,
  UserX,
  Ban,
  ShieldAlert,
  Stethoscope,
  Send,
  MessageSquare,
  QrCode,
  Upload,
  ZoomIn,
  X,
  Trash2,
  Edit2,
  Plus,
  LifeBuoy,
  Check,
  AlertCircle,
  Image as ImageIcon,
  Landmark,
  Smartphone,
  Eye,
  RotateCcw,
} from 'lucide-react';

interface AdminPortalProps {
  adminUser: UserAccount;
  lang: 'en' | 'ur';
}

export const AdminPortal: React.FC<AdminPortalProps> = ({ adminUser, lang }) => {
  const strings = t[lang];
  const isUr = lang === 'ur';

  const [activeTab, setActiveTab] = useState<
    'orders' | 'withdrawals' | 'payment_methods' | 'sos_inbox' | 'medical' | 'sheds' | 'users' | 'stats'
  >('orders');

  const [orders, setOrders] = useState<HenOrder[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [globalStats, setGlobalStats] = useState<GlobalFarmStats>({
    totalCollected: 0,
    cracked: 0,
    netFresh: 0,
    lastUpdated: new Date().toISOString(),
  });
  const [usersList, setUsersList] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);

  // Dynamic Payment Methods State (Admin Control)
  const [paymentMethods, setPaymentMethods] = useState<PaymentAccount[]>([]);
  const [isEditingPm, setIsEditingPm] = useState(false);
  const [editingPmId, setEditingPmId] = useState<string | null>(null);
  const [pmType, setPmType] = useState<PaymentMethodType>('jazzcash');
  const [pmTitle, setPmTitle] = useState('');
  const [pmTitleUr, setPmTitleUr] = useState('');
  const [pmAccountTitle, setPmAccountTitle] = useState('');
  const [pmAccountNumber, setPmAccountNumber] = useState('');
  const [pmBankName, setPmBankName] = useState('');
  const [pmInstructions, setPmInstructions] = useState('');
  const [pmInstructionsUr, setPmInstructionsUr] = useState('');
  const [pmQrCodeBase64, setPmQrCodeBase64] = useState('');
  const [pmActive, setPmActive] = useState(true);
  const [pmActionMessage, setPmActionMessage] = useState<string | null>(null);
  const [pmErrorMessage, setPmErrorMessage] = useState<string | null>(null);
  const [isSavingPm, setIsSavingPm] = useState(false);

  // Custom Admin Greeting for User Checkout Screen (Requirement 2)
  const [customGreeting, setCustomGreeting] = useState('');
  const [customGreetingUr, setCustomGreetingUr] = useState('');
  const [isSavingGreeting, setIsSavingGreeting] = useState(false);
  const [greetingActionMessage, setGreetingActionMessage] = useState<string | null>(null);

  // SOS Helpdesk Tickets State (Admin SOS Inbox)
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicketForReply, setSelectedTicketForReply] = useState<SupportTicket | null>(null);
  const [ticketReplyText, setTicketReplyText] = useState('');
  const [isReplyingTicket, setIsReplyingTicket] = useState(false);
  const [ticketSuccessMsg, setTicketSuccessMsg] = useState<string | null>(null);

  // Search filter for Orders (Search by TxID / Name)
  const [orderTxidSearch, setOrderTxidSearch] = useState('');
  const [slipZoomUrl, setSlipZoomUrl] = useState<string | null>(null);

  // In-App Action Modals (REPLACE BLOCKING window.prompt)
  const [rejectOrderTarget, setRejectOrderTarget] = useState<HenOrder | null>(null);
  const [rejectWithdrawalTarget, setRejectWithdrawalTarget] = useState<WithdrawalRequest | null>(null);
  const [markPaidTarget, setMarkPaidTarget] = useState<WithdrawalRequest | null>(null);
  const [actionReasonNote, setActionReasonNote] = useState('');
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // Shed Management State
  const [sheds, setSheds] = useState<FarmShed[]>(INITIAL_SHEDS);
  const [selectedShedId, setSelectedShedId] = useState<string>('Shed-101');
  const [mortalityDeathsInput, setMortalityDeathsInput] = useState<string>('');
  const [crackedRateInput, setCrackedRateInput] = useState<string>('0');
  const [shedActionLoading, setShedActionLoading] = useState(false);
  const [shedSuccessMessage, setShedSuccessMessage] = useState<string | null>(null);
  const [shedErrorMessage, setShedErrorMessage] = useState<string | null>(null);

  // Live stats form state
  const [totalCollectedInput, setTotalCollectedInput] = useState('0');
  const [crackedInput, setCrackedInput] = useState('0');
  const [statsSuccess, setStatsSuccess] = useState(false);

  // Search filter for Users Directory
  const [searchQuery, setSearchQuery] = useState('');

  // Prevent multiple package approvals for a single TID / double clicking
  const [approvingOrderIds, setApprovingOrderIds] = useState<Record<string, boolean>>({});

  // User Management state
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [userActionMessage, setUserActionMessage] = useState<string | null>(null);

  // Custom Admin Message Modal state
  const [messageModalTarget, setMessageModalTarget] = useState<UserAccount | 'ALL' | null>(null);
  const [customMsgSubject, setCustomMsgSubject] = useState('');
  const [customMsgBody, setCustomMsgBody] = useState('');
  const [isSendingCustomMsg, setIsSendingCustomMsg] = useState(false);

  // Phase 3: Medical Approvals state
  const [medicalPayments, setMedicalPayments] = useState<MedicalPaymentOrder[]>([]);
  const [approvingMedId, setApprovingMedId] = useState<Record<string, boolean>>({});
  const [medicalActionMessage, setMedicalActionMessage] = useState<string | null>(null);

  const loadAllAdminData = async () => {
    try {
      setLoading(true);
      const [fetchedOrders, fetchedWithdrawals, fetchedStats, fetchedUsers] = await Promise.all([
        apiGetOrders(adminUser),
        apiGetWithdrawals(adminUser),
        apiGetStats(),
        apiGetUsers(adminUser),
      ]);
      setOrders(fetchedOrders);
      setWithdrawals(fetchedWithdrawals);
      setGlobalStats(fetchedStats);
      setTotalCollectedInput(String(fetchedStats.totalCollected || 0));
      setCrackedInput(String(fetchedStats.cracked || 0));
      setUsersList(fetchedUsers);
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);

    // 1. Live Orders subscription
    const unsubOrders = subscribeToOrders('admin', adminUser.id, (liveOrders) => {
      setOrders(liveOrders);
      setLoading(false);
    });

    // 2. Live Users Directory subscription
    const unsubUsers = subscribeToUsers((liveUsers) => {
      setUsersList(liveUsers);
    });

    // 3. Live Withdrawals subscription
    const unsubWithdrawals = subscribeToWithdrawals('admin', adminUser.id, (liveWithdrawals) => {
      setWithdrawals(liveWithdrawals);
    });

    // 4. Live Global Stats subscription
    const unsubStats = subscribeToGlobalStats((liveStats) => {
      setGlobalStats(liveStats);
      setTotalCollectedInput(String(liveStats.totalCollected || 0));
      setCrackedInput(String(liveStats.cracked || 0));
    });

    // 5. Live Sheds subscription
    const unsubSheds = subscribeToSheds((liveSheds) => {
      setSheds(liveSheds);
      const current = liveSheds.find((s) => s.id === selectedShedId);
      if (current) {
        setCrackedRateInput(String(typeof current.crackedEggsCount === 'number' ? current.crackedEggsCount : (current.crackedEggRate || 0)));
      }
    });

    // 6. Live Medical Payments subscription
    const unsubMedical = subscribeToMedicalPayments((liveMed) => {
      setMedicalPayments(liveMed);
    });

    // 7. Live Payment Methods subscription (Admin Managed Accounts)
    const unsubPm = subscribeToPaymentMethods((liveMethods) => {
      setPaymentMethods(liveMethods);
    });

    // 8. Live Support / SOS Tickets subscription
    const unsubTickets = subscribeToTickets('admin', adminUser.id, (liveTickets) => {
      setTickets(liveTickets);
    });

    // 9. Live Payment Settings subscription (Custom Greeting)
    const unsubSettings = subscribeToPaymentSettings((settings) => {
      if (settings) {
        setCustomGreeting(settings.customGreeting || '');
        setCustomGreetingUr(settings.customGreetingUr || '');
      }
    });

    return () => {
      unsubOrders();
      unsubUsers();
      unsubWithdrawals();
      unsubStats();
      unsubSheds();
      unsubMedical();
      unsubPm();
      unsubTickets();
      unsubSettings();
    };
  }, [adminUser.id, selectedShedId]);

  // Financial calculations
  const totalApprovedDeposits = orders
    .filter((o) => o.status === 'approved')
    .reduce((sum, o) => sum + o.amount, 0);

  const totalPaidOut = withdrawals
    .filter((w) => w.status === 'paid')
    .reduce((sum, w) => sum + w.amount, 0);

  const pendingPayouts = withdrawals
    .filter((w) => w.status === 'pending')
    .reduce((sum, w) => sum + w.amount, 0);

  const pendingMedicalList = medicalPayments.filter((m) => m.status === 'pending');
  const openTicketsList = tickets.filter((t) => t.status === 'open');

  const netFarmBalance = totalApprovedDeposits - totalPaidOut;

  // Actions without window.prompt
  const handleApproveMedical = async (orderId: string) => {
    if (approvingMedId[orderId]) return;
    setApprovingMedId((prev) => ({ ...prev, [orderId]: true }));
    setMedicalActionMessage(null);
    try {
      await apiApproveMedicalPayment(adminUser, orderId);
      setMedicalActionMessage(strings.medicalTidApprovedSuccess);
    } catch (err: any) {
      alert(err.message || 'Error approving medical payment');
    } finally {
      setApprovingMedId((prev) => {
        const next = { ...prev };
        delete next[orderId];
        return next;
      });
    }
  };

  const handleRejectMedical = async (orderId: string) => {
    try {
      await apiRejectMedicalPayment(adminUser, orderId, 'Payment could not be verified on farm accounts');
      setMedicalActionMessage(strings.medicalTidRejectedSuccess);
    } catch (err: any) {
      alert(err.message || 'Error rejecting medical payment');
    }
  };

  const handleApproveOrder = async (orderId: string) => {
    if (approvingOrderIds[orderId]) return;
    setApprovingOrderIds((prev) => ({ ...prev, [orderId]: true }));
    try {
      await apiApproveOrder(adminUser, orderId, 'Verified and approved by Admin');
      await loadAllAdminData();
    } catch (err: any) {
      alert(err.message || 'Error approving order');
    } finally {
      setApprovingOrderIds((prev) => {
        const next = { ...prev };
        delete next[orderId];
        return next;
      });
    }
  };

  const handleOpenRejectOrder = (order: HenOrder) => {
    setRejectOrderTarget(order);
    setActionReasonNote('Payment slip or TxID could not be verified');
  };

  const handleConfirmRejectOrder = async () => {
    if (!rejectOrderTarget) return;
    try {
      setIsProcessingAction(true);
      await apiRejectOrder(adminUser, rejectOrderTarget.id, actionReasonNote || 'Payment not verified');
      setRejectOrderTarget(null);
      await loadAllAdminData();
    } catch (err: any) {
      alert(err.message || 'Error rejecting order');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleOpenMarkPaid = (w: WithdrawalRequest) => {
    setMarkPaidTarget(w);
    setActionReasonNote(`Dispatched via Easypaisa to ${w.easypaisaNumber}`);
  };

  const handleConfirmMarkPaid = async () => {
    if (!markPaidTarget) return;
    try {
      setIsProcessingAction(true);
      await apiMarkWithdrawalPaid(adminUser, markPaidTarget.id, actionReasonNote || 'Dispatched via Easypaisa');
      setMarkPaidTarget(null);
      await loadAllAdminData();
    } catch (err: any) {
      alert(err.message || 'Error marking withdrawal as paid');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleOpenRejectWithdrawal = (w: WithdrawalRequest) => {
    setRejectWithdrawalTarget(w);
    setActionReasonNote('Account details mismatched or verification failed');
  };

  const handleConfirmRejectWithdrawal = async () => {
    if (!rejectWithdrawalTarget) return;
    try {
      setIsProcessingAction(true);
      await apiRejectWithdrawal(adminUser, rejectWithdrawalTarget.id, actionReasonNote || 'Rejected by Admin');
      setRejectWithdrawalTarget(null);
      await loadAllAdminData();
    } catch (err: any) {
      alert(err.message || 'Error rejecting withdrawal');
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Payment Methods Form Actions
  const handleOpenNewPaymentMethod = () => {
    setPmErrorMessage(null);
    if (paymentMethods.length >= 10) {
      setPmErrorMessage('Maximum of 10 payment accounts allowed. Please delete or edit an existing account.');
      return;
    }
    setEditingPmId(null);
    setPmType('jazzcash');
    setPmTitle('JazzCash Merchant');
    setPmTitleUr('جاز کیش مرچنٹ');
    setPmAccountTitle('Pak Hen Farm Official');
    setPmAccountNumber('');
    setPmBankName('');
    setPmInstructions('Transfer via JazzCash app and submit TID');
    setPmInstructionsUr('جاز کیش کے ذریعے رقم بھیج کر رسید جمع کروائیں');
    setPmQrCodeBase64('');
    setPmActive(true);
    setIsEditingPm(true);
  };

  const handleOpenEditPaymentMethod = (pm: PaymentAccount) => {
    setPmErrorMessage(null);
    setEditingPmId(pm.id);
    setPmType(pm.type);
    setPmTitle(pm.title);
    setPmTitleUr(pm.titleUr || '');
    setPmAccountTitle(pm.accountTitle);
    setPmAccountNumber(pm.accountNumber);
    setPmBankName(pm.bankName || '');
    setPmInstructions(pm.instructions || '');
    setPmInstructionsUr(pm.instructionsUr || '');
    setPmQrCodeBase64(pm.qrCodeUrl || '');
    setPmActive(pm.active);
    setIsEditingPm(true);
  };

  const handleQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setPmErrorMessage('Please upload an image file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPmQrCodeBase64(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSavePaymentMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingPm) return; // Strict debouncing
    setPmErrorMessage(null);
    if (!pmTitle.trim() || !pmAccountTitle.trim() || !pmAccountNumber.trim()) {
      setPmErrorMessage('Please fill in Title, Account Title, and Account Number.');
      return;
    }

    try {
      setIsSavingPm(true);
      if (editingPmId) {
        await apiUpdatePaymentMethod(adminUser, editingPmId, {
          type: pmType,
          title: pmTitle.trim(),
          titleUr: pmTitleUr.trim(),
          accountTitle: pmAccountTitle.trim(),
          accountNumber: pmAccountNumber.trim(),
          bankName: pmBankName.trim() || undefined,
          instructions: pmInstructions.trim(),
          instructionsUr: pmInstructionsUr.trim(),
          qrCodeUrl: pmQrCodeBase64 || undefined,
          active: pmActive,
        });
        setPmActionMessage('Payment method updated successfully.');
      } else {
        await apiAddPaymentMethod(adminUser, {
          type: pmType,
          title: pmTitle.trim(),
          titleUr: pmTitleUr.trim(),
          accountTitle: pmAccountTitle.trim(),
          accountNumber: pmAccountNumber.trim(),
          bankName: pmBankName.trim() || undefined,
          instructions: pmInstructions.trim(),
          instructionsUr: pmInstructionsUr.trim(),
          qrCodeUrl: pmQrCodeBase64 || undefined,
          active: pmActive,
          displayOrder: paymentMethods.length + 1,
        });
        setPmActionMessage('New payment method added successfully.');
      }
      setIsEditingPm(false);
      setTimeout(() => setPmActionMessage(null), 3500);
    } catch (err: any) {
      setPmErrorMessage(err.message || 'Error saving payment method');
    } finally {
      setIsSavingPm(false);
    }
  };

  const handleSaveCustomGreeting = async (e: React.FormEvent) => {
    e.preventDefault();
    setPmErrorMessage(null);
    try {
      setIsSavingGreeting(true);
      await apiUpdatePaymentSettings(adminUser, {
        customGreeting: customGreeting.trim(),
        customGreetingUr: customGreetingUr.trim(),
      });
      setGreetingActionMessage('Custom checkout greeting saved live!');
      setTimeout(() => setGreetingActionMessage(null), 3500);
    } catch (err: any) {
      setPmErrorMessage(err.message || 'Error saving checkout greeting');
    } finally {
      setIsSavingGreeting(false);
    }
  };

  const handleDeletePaymentMethod = async (id: string) => {
    setPmErrorMessage(null);
    if (paymentMethods.length <= 1) {
      setPmErrorMessage('At least one payment method must remain active for user deposits.');
      return;
    }
    try {
      await apiDeletePaymentMethod(adminUser, id);
      setPmActionMessage('Payment account deleted.');
      setTimeout(() => setPmActionMessage(null), 3500);
    } catch (err: any) {
      setPmErrorMessage(err.message || 'Error deleting payment method');
    }
  };

  const handleTogglePaymentMethodActive = async (pm: PaymentAccount) => {
    try {
      await apiUpdatePaymentMethod(adminUser, pm.id, { active: !pm.active });
    } catch (err: any) {
      setPmErrorMessage(err.message || 'Error toggling payment method');
    }
  };

  // SOS Ticket Reply Action
  const handleSendTicketReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicketForReply || !ticketReplyText.trim()) return;

    try {
      setIsReplyingTicket(true);
      await apiReplyTicket(adminUser, selectedTicketForReply.id, ticketReplyText.trim());
      setTicketSuccessMsg('Reply sent and ticket resolved successfully!');
      setSelectedTicketForReply(null);
      setTicketReplyText('');
      setTimeout(() => setTicketSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Error replying to ticket');
    } finally {
      setIsReplyingTicket(false);
    }
  };

  const handleUpdateStats = async (e: React.FormEvent) => {
    e.preventDefault();
    const total = parseInt(totalCollectedInput, 10) || 0;
    const cracked = parseInt(crackedInput, 10) || 0;
    const net = Math.max(0, total - cracked);

    try {
      const updated = await apiUpdateStats(adminUser, {
        totalCollected: total,
        cracked: cracked,
        netFresh: net,
      });
      setGlobalStats(updated);
      setStatsSuccess(true);
      setTimeout(() => setStatsSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Error updating stats');
    }
  };

  // Shed Management Handlers - Dynamic SUM Formula (SUM of active hens from users assigned to this shed)
  const selectedShedRaw = sheds.find((s) => s.id === selectedShedId) || sheds[0] || INITIAL_SHEDS[0];
  const selectedShedLiveHens = Math.max(selectedShedRaw.totalHens || 0, calculateShedDynamicSum(selectedShedRaw.id, usersList));
  const selectedShed = { ...selectedShedRaw, totalHens: selectedShedLiveHens };

  const handleSelectShed = (shedId: string) => {
    setSelectedShedId(shedId);
    const target = sheds.find((s) => s.id === shedId);
    if (target) {
      setCrackedRateInput(String(typeof target.crackedEggsCount === 'number' ? target.crackedEggsCount : (target.crackedEggRate || 0)));
    }
    setMortalityDeathsInput('');
    setShedSuccessMessage(null);
    setShedErrorMessage(null);
  };

  const handleApplyMortality = async (e: React.FormEvent) => {
    e.preventDefault();
    setShedSuccessMessage(null);
    setShedErrorMessage(null);
    const deaths = parseInt(mortalityDeathsInput, 10);
    if (isNaN(deaths) || deaths <= 0) {
      setShedErrorMessage(isUr ? 'براہ کرم درست تعداد درج کریں۔' : 'Please enter a valid death count greater than 0.');
      return;
    }
    try {
      setShedActionLoading(true);
      await apiApplyShedMortality(adminUser, selectedShedId, deaths);
      setShedSuccessMessage(
        strings.mortalityAppliedSuccess.replace('{count}', String(deaths))
      );
      setMortalityDeathsInput('');
    } catch (err: any) {
      setShedErrorMessage(err.message || 'Failed to apply mortality deduction');
    } finally {
      setShedActionLoading(false);
    }
  };

  const handleUpdateCracking = async (e: React.FormEvent) => {
    e.preventDefault();
    setShedSuccessMessage(null);
    setShedErrorMessage(null);
    const count = parseInt(crackedRateInput, 10);
    if (isNaN(count) || count < 0) {
      setShedErrorMessage(isUr ? 'براہ کرم ٹوٹے ہوئے انڈوں کی درست تعداد درج کریں (مثلاً: 8)' : 'Please enter a valid number of cracked eggs (e.g. 8).');
      return;
    }
    try {
      setShedActionLoading(true);
      await apiUpdateShedCracking(adminUser, selectedShedId, count);
      setShedSuccessMessage(
        isUr
          ? `${selectedShedId} کے لیے ٹوٹے ہوئے انڈوں کی تعداد ${count} انڈے محفوظ کر دی گئی۔`
          : `Cracked eggs recorded as ${count} eggs for ${selectedShedId}. Proportional loss will be deducted during user collections.`
      );
    } catch (err: any) {
      setShedErrorMessage(err.message || 'Failed to update cracked eggs');
    } finally {
      setShedActionLoading(false);
    }
  };

  const handleToggleSickness = async (isSick: boolean) => {
    setShedSuccessMessage(null);
    setShedErrorMessage(null);
    try {
      setShedActionLoading(true);
      await apiDeclareShedSickness(adminUser, selectedShedId, isSick);
      if (isSick) {
        setShedSuccessMessage(
          strings.sicknessAlertSentSuccess.replace('{shedId}', selectedShedId)
        );
      } else {
        setShedSuccessMessage(
          strings.sicknessResolvedSuccess.replace('{shedId}', selectedShedId)
        );
      }
    } catch (err: any) {
      setShedErrorMessage(err.message || 'Failed to update sickness status');
    } finally {
      setShedActionLoading(false);
    }
  };

  const handleSetUserStatus = async (targetUser: UserAccount, newStatus: 'active' | 'suspended' | 'banned') => {
    if (targetUser.role === 'admin') {
      setUserActionMessage('Cannot change status of an Administrator account.');
      setTimeout(() => setUserActionMessage(null), 3000);
      return;
    }

    const defaultReason =
      newStatus === 'banned'
        ? 'Account banned by Administrator (Violation of Farm Terms)'
        : newStatus === 'suspended'
        ? 'Account suspended by Administrator'
        : '';

    try {
      setUpdatingUserId(targetUser.id);
      // Direct backend Firestore database workflow
      await apiSetUserStatus(adminUser, targetUser.id, newStatus, defaultReason);
      
      const msg = isUr
        ? `صارف ${targetUser.fullName} کی حیثیت کامیابی سے ${newStatus === 'active' ? 'بحال' : newStatus === 'suspended' ? 'معطل' : 'بین'} کر دی گئی۔`
        : `User ${targetUser.fullName} status updated to ${newStatus.toUpperCase()}.`;
      setUserActionMessage(msg);
      
      // Update UI state immediately
      setUsersList((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, status: newStatus, statusReason: defaultReason } : u))
      );
      setTimeout(() => setUserActionMessage(null), 4000);
    } catch (err: any) {
      console.error('Failed to update user status:', err);
      setUserActionMessage(err.message || 'Error updating user status');
      setTimeout(() => setUserActionMessage(null), 4000);
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleSendCustomMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customMsgSubject.trim() || !customMsgBody.trim()) {
      alert(isUr ? 'براہ کرم عنوان اور پیغام درج کریں۔' : 'Please provide both subject and message body.');
      return;
    }
    try {
      setIsSendingCustomMsg(true);
      const targetUserId = messageModalTarget === 'ALL' ? 'ALL' : messageModalTarget?.id;
      const res = await apiSendAdminCustomMessage(adminUser, {
        targetUserId,
        subject: customMsgSubject.trim(),
        message: customMsgBody.trim(),
      });
      setUserActionMessage(
        isUr
          ? `پیغام کامیابی سے ${res.count} صارف(ین) کے ان باکس میں بھیج دیا گیا!`
          : `Official message dispatched to ${res.count} user inbox(es)!`
      );
      setMessageModalTarget(null);
      setCustomMsgSubject('');
      setCustomMsgBody('');
      setTimeout(() => setUserActionMessage(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Error sending custom message');
    } finally {
      setIsSendingCustomMsg(false);
    }
  };

  const pendingOrders = orders.filter((o) => o.status === 'pending');
  const pendingWithdrawalsList = withdrawals.filter((w) => w.status === 'pending');

  // Filtered users for Users Directory
  const filteredUsers = usersList.filter((u) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.fullName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.id.toLowerCase().includes(q) ||
      u.phone.includes(q) ||
      u.easypaisaNumber.includes(q)
    );
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#d4af37]/30 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#d4af37] text-[#051a10]">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-[#d4af37] font-serif">
              {strings.adminPortalTitle}
            </h2>
          </div>
          <p className="text-xs text-[#f4efe6]/70 mt-1">
            {isUr ? 'ایڈمن کنٹرول روم — مرکزی ڈیٹا بیس لائیو مطابقت پذیری (Centralized Cloud Sync)' : 'Admin Control Room — Real-Time Centralized Cloud Sync Across All Devices'}
          </p>
        </div>

        <button
          onClick={loadAllAdminData}
          className="flex items-center gap-1.5 rounded-xl border border-[#d4af37]/40 bg-[#0a2618] px-3 py-1.5 text-xs font-bold text-[#f3df88] hover:bg-[#0f3422] cursor-pointer self-start sm:self-auto active:scale-95 transition-all"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>{isUr ? 'تازہ کریں' : 'Refresh Data'}</span>
        </button>
      </div>

      {/* Admin Financial Overview ('My Wallet') & Users Statistics Box */}
      <div className="rounded-3xl border border-[#d4af37]/40 bg-gradient-to-br from-[#0a2618] via-[#0d3420] to-[#051a10] p-6 shadow-2xl backdrop-blur-md space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-[#d4af37]" />
            <h3 className="text-base font-bold text-[#f4efe6]">{strings.adminWalletOverview}</h3>
          </div>
          <span className="text-[11px] font-semibold text-[#d4af37] bg-[#051a10] px-2.5 py-1 rounded-full border border-[#d4af37]/30">
            {isUr ? 'مرکزی کلاؤڈ ڈیٹا بیس' : 'Centralized Cloud Database'}
          </span>
        </div>

        {/* 5 Statistics Boxes Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {/* Total Approved Deposits */}
          <div className="rounded-2xl border border-[#d4af37]/20 bg-[#051a10]/70 p-3.5 space-y-1">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400">
              <ArrowDownLeft className="h-3.5 w-3.5" />
              <span>{strings.adminTotalDeposits}</span>
            </div>
            <div className="text-lg sm:text-xl font-black text-emerald-300">
              Rs. {totalApprovedDeposits.toLocaleString()}
            </div>
          </div>

          {/* Total Payouts Completed */}
          <div className="rounded-2xl border border-[#d4af37]/20 bg-[#051a10]/70 p-3.5 space-y-1">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-400">
              <ArrowUpRight className="h-3.5 w-3.5" />
              <span>{strings.adminTotalPaidOut}</span>
            </div>
            <div className="text-lg sm:text-xl font-black text-amber-300">
              Rs. {totalPaidOut.toLocaleString()}
            </div>
          </div>

          {/* Pending Payouts */}
          <div className="rounded-2xl border border-[#d4af37]/20 bg-[#051a10]/70 p-3.5 space-y-1">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-rose-400">
              <Clock className="h-3.5 w-3.5" />
              <span>{strings.adminPendingPayouts}</span>
            </div>
            <div className="text-lg sm:text-xl font-black text-rose-300">
              Rs. {pendingPayouts.toLocaleString()}
            </div>
          </div>

          {/* Net Farm Reserve */}
          <div className="rounded-2xl border border-[#d4af37]/40 bg-[#051a10]/90 p-3.5 space-y-1">
            <div className="text-[11px] font-bold text-[#f3df88]">
              {isUr ? 'خالص فارم فنڈز' : 'Net Farm Reserve'}
            </div>
            <div className="text-lg sm:text-xl font-black text-[#d4af37]">
              Rs. {netFarmBalance.toLocaleString()}
            </div>
          </div>

          {/* REQUIREMENT 3 & 4: TOTAL USERS STATISTICS BOX WITH DRILL-DOWN ACTION */}
          <div
            onClick={() => setActiveTab('users')}
            role="button"
            tabIndex={0}
            className={`rounded-2xl border p-3.5 space-y-1 cursor-pointer transition-all duration-200 group active:scale-95 shadow-md ${
              activeTab === 'users'
                ? 'border-[#f3df88] bg-[#0f3823] ring-2 ring-[#d4af37]'
                : 'border-[#d4af37]/50 bg-gradient-to-br from-[#0c311e] to-[#051a10] hover:border-[#d4af37] hover:bg-[#0f3422]'
            }`}
          >
            <div className="flex items-center justify-between text-[11px] font-bold text-[#f3df88]">
              <div className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-[#d4af37] group-hover:scale-110 transition-transform" />
                <span>{strings.adminTotalUsers}</span>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-[#d4af37] group-hover:translate-x-1 transition-transform" />
            </div>
            <div className="text-lg sm:text-xl font-black text-white group-hover:text-[#f3df88] transition-colors">
              {usersList.length} {isUr ? 'صارفین' : 'Users'}
            </div>
            <div className="text-[10px] text-[#d4af37]/80 flex items-center gap-1 font-semibold">
              <span>{strings.clickToViewUsers}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Tabs (Phase 3: 6 Dedicated Tabs) */}
      {/* Admin Tabs (8 Dedicated Control Tabs) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 rounded-2xl bg-[#0a2618] p-1.5 border border-[#d4af37]/30">
        <button
          onClick={() => setActiveTab('orders')}
          className={`relative rounded-xl py-2 text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'orders'
              ? 'bg-[#d4af37] text-[#051a10] shadow-md shadow-[#d4af37]/25'
              : 'text-[#f4efe6]/70 hover:text-[#f4efe6]'
          }`}
        >
          <span>{strings.adminNavOrders}</span>
          {pendingOrders.length > 0 && (
            <span className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white">
              {pendingOrders.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('withdrawals')}
          className={`relative rounded-xl py-2 text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'withdrawals'
              ? 'bg-[#d4af37] text-[#051a10] shadow-md shadow-[#d4af37]/25'
              : 'text-[#f4efe6]/70 hover:text-[#f4efe6]'
          }`}
        >
          <span>{strings.adminNavWithdrawals}</span>
          {pendingWithdrawalsList.length > 0 && (
            <span className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-black text-[#051a10]">
              {pendingWithdrawalsList.length}
            </span>
          )}
        </button>

        {/* Dynamic Payment Methods Management Tab (Admin Controlled Accounts) */}
        <button
          onClick={() => setActiveTab('payment_methods')}
          className={`relative rounded-xl py-2 text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'payment_methods'
              ? 'bg-[#d4af37] text-[#051a10] shadow-md shadow-[#d4af37]/25'
              : 'text-[#f4efe6]/70 hover:text-[#f4efe6]'
          }`}
        >
          <span className="flex items-center justify-center gap-1">
            <CreditCard className="h-3.5 w-3.5" />
            <span>{isUr ? 'اکاؤنٹس' : 'Payments'}</span>
            <span className="rounded-full bg-[#051a10]/60 px-1 text-[10px]">
              {paymentMethods.length}
            </span>
          </span>
        </button>

        {/* Dedicated Admin SOS Inbox Tab */}
        <button
          onClick={() => setActiveTab('sos_inbox')}
          className={`relative rounded-xl py-2 text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'sos_inbox'
              ? 'bg-[#d4af37] text-[#051a10] shadow-md shadow-[#d4af37]/25'
              : 'text-[#f4efe6]/70 hover:text-[#f4efe6]'
          }`}
        >
          <span className="flex items-center justify-center gap-1">
            <LifeBuoy className="h-3.5 w-3.5" />
            <span>{isUr ? 'SOS ان باکس' : 'SOS Inbox'}</span>
            {openTicketsList.length > 0 && (
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white animate-pulse">
                {openTicketsList.length}
              </span>
            )}
          </span>
        </button>

        {/* Medical Approvals Tab */}
        <button
          onClick={() => setActiveTab('medical')}
          className={`relative rounded-xl py-2 text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'medical'
              ? 'bg-[#d4af37] text-[#051a10] shadow-md shadow-[#d4af37]/25'
              : 'text-[#f4efe6]/70 hover:text-[#f4efe6]'
          }`}
        >
          <span className="flex items-center justify-center gap-1">
            <Stethoscope className="h-3.5 w-3.5" />
            <span>{isUr ? 'میڈیکل' : 'Medical'}</span>
            {pendingMedicalList.length > 0 && (
              <span className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white">
                {pendingMedicalList.length}
              </span>
            )}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('sheds')}
          className={`relative rounded-xl py-2 text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'sheds'
              ? 'bg-[#d4af37] text-[#051a10] shadow-md shadow-[#d4af37]/25'
              : 'text-[#f4efe6]/70 hover:text-[#f4efe6]'
          }`}
        >
          <span className="flex items-center justify-center gap-1">
            <Warehouse className="h-3.5 w-3.5" />
            <span>{strings.adminNavSheds}</span>
            {sheds.some((s) => s.hasSicknessAlert) && (
              <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping"></span>
            )}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`relative rounded-xl py-2 text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'users'
              ? 'bg-[#d4af37] text-[#051a10] shadow-md shadow-[#d4af37]/25'
              : 'text-[#f4efe6]/70 hover:text-[#f4efe6]'
          }`}
        >
          <span className="flex items-center justify-center gap-1">
            <Users className="h-3.5 w-3.5" />
            <span>{isUr ? 'صارفین' : 'Users'}</span>
          </span>
        </button>

        <button
          onClick={() => setActiveTab('stats')}
          className={`rounded-xl py-2 text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'stats'
              ? 'bg-[#d4af37] text-[#051a10] shadow-md shadow-[#d4af37]/25'
              : 'text-[#f4efe6]/70 hover:text-[#f4efe6]'
          }`}
        >
          <span>{strings.adminNavStats}</span>
        </button>
      </div>

      {/* TAB: USER MANAGEMENT (REQUIREMENT 3: Ban, Suspend, Search) */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0a2618]/90 p-4 rounded-3xl border border-[#d4af37]/30">
            <div>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-[#d4af37]" />
                <h3 className="text-base font-extrabold text-[#f4efe6]">
                  {strings.adminNavUserManagement} ({usersList.length})
                </h3>
              </div>
              <p className="text-xs text-[#f4efe6]/60 mt-0.5">
                {strings.userManagementSubtitle}
              </p>
            </div>

            {/* Search filter input & Broadcast button */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <button
                onClick={() => setMessageModalTarget('ALL')}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#b38f20] px-3.5 py-2 text-xs font-black text-[#051a10] hover:brightness-105 active:scale-95 transition-all cursor-pointer shadow-md whitespace-nowrap"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{strings.adminBroadcastBtn}</span>
              </button>

              <div className="relative min-w-[200px] flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#d4af37]/60" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={strings.searchUsersPlaceholder}
                  className="w-full rounded-xl border border-[#d4af37]/30 bg-[#051a10] py-2 pl-9 pr-3 text-xs text-[#f4efe6] placeholder-[#f4efe6]/40 focus:border-[#d4af37] focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* User Status Action Toast */}
          {userActionMessage && (
            <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/50 bg-emerald-950/80 p-3.5 text-xs sm:text-sm font-semibold text-emerald-200">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>{userActionMessage}</span>
            </div>
          )}

          {usersList.length === 0 ? (
            <div className="rounded-3xl border border-[#d4af37]/20 bg-[#0a2618]/60 p-8 text-center text-xs text-[#f4efe6]/50">
              {isUr ? 'کوئی صارف رجسٹر نہیں ہوا (ڈیٹا بیس خالی ہے)۔' : 'No registered users in the database yet.'}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredUsers.map((u) => {
                const isBanned = u.status === 'banned';
                const isSuspended = u.status === 'suspended';
                const isUpdating = updatingUserId === u.id;

                return (
                  <div
                    key={u.id}
                    className={`rounded-3xl border p-5 shadow-xl space-y-3 transition-all ${
                      isBanned
                        ? 'border-rose-500/50 bg-gradient-to-br from-rose-950/30 via-[#0a2618] to-[#051a10]'
                        : isSuspended
                        ? 'border-amber-500/50 bg-gradient-to-br from-amber-950/30 via-[#0a2618] to-[#051a10]'
                        : 'border-[#d4af37]/30 bg-[#0a2618]/90'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#d4af37]/20 pb-3">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-base font-bold text-[#f4efe6]">{u.fullName}</span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${
                              u.role === 'admin'
                                ? 'bg-[#d4af37] text-[#051a10]'
                                : u.role === 'staff'
                                ? 'bg-emerald-500 text-[#051a10]'
                                : 'bg-[#051a10] text-[#f3df88] border border-[#d4af37]/30'
                            }`}
                          >
                            {u.role}
                          </span>

                          {/* Account Status Badge */}
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase flex items-center gap-1 ${
                              isBanned
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                : isSuspended
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            }`}
                          >
                            {isBanned && <Ban className="h-3 w-3" />}
                            {isSuspended && <ShieldAlert className="h-3 w-3" />}
                            {isBanned
                              ? strings.statusBanned
                              : isSuspended
                              ? strings.statusSuspended
                              : strings.statusActive}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-mono text-[#d4af37]">
                          <span>User ID: {u.id}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-[10px] text-[#f4efe6]/60 uppercase block">Active Hens</span>
                          <span className="text-sm font-black text-[#d4af37] flex items-center justify-end gap-1">
                            <Feather className="h-3.5 w-3.5" />
                            {u.activeHens}
                          </span>
                        </div>
                        <div className="text-right border-l border-[#d4af37]/20 pl-3">
                          <span className="text-[10px] text-[#f4efe6]/60 uppercase block">Wallet Balance</span>
                          <span className="text-sm font-black text-emerald-400">
                            Rs. {u.walletBalance.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-[#f4efe6]/80 pt-1">
                      <div className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-[#d4af37] shrink-0" />
                        <span className="truncate">{u.email}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-[#d4af37] shrink-0" />
                        <span>{u.phone}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <CreditCard className="h-3.5 w-3.5 text-[#d4af37] shrink-0" />
                        <span>
                          EP: {u.easypaisaTitle} ({u.easypaisaNumber})
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between text-[11px] text-[#f4efe6]/50 pt-2 border-t border-white/5 gap-2">
                      <span>
                        Referral Code: <span className="font-mono text-[#f3df88]">{u.referralCode}</span>
                      </span>
                      <span>
                        Registered: {new Date(u.createdAt).toLocaleDateString(isUr ? 'ur-PK' : 'en-US')}
                      </span>
                    </div>

                    {/* Admin Action Bar (Requirement 3: Apply Ban or Suspend status) */}
                    {u.role !== 'admin' && (
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-white/10">
                        <div className="text-[11px] text-[#f4efe6]/70">
                          {u.statusReason && (
                            <span>
                              {isUr ? 'نوٹ / وجہ:' : 'Note:'} <span className="text-amber-300 font-mono">{u.statusReason}</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Send Official Farm Message button */}
                          <button
                            onClick={() => setMessageModalTarget(u)}
                            className="flex items-center gap-1 rounded-xl border border-[#d4af37]/40 bg-[#051a10] px-3 py-1.5 text-xs font-bold text-[#f3df88] hover:bg-[#d4af37]/20 active:scale-95 transition-all cursor-pointer shadow-sm"
                          >
                            <Send className="h-3 w-3 text-[#d4af37]" />
                            <span>{strings.adminSendMessageBtn}</span>
                          </button>

                          {/* REVERSIBLE TOGGLE 1: SUSPEND <-> UNSUSPEND */}
                          {isSuspended ? (
                            <button
                              onClick={() => handleSetUserStatus(u, 'active')}
                              disabled={isUpdating}
                              className="flex items-center gap-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-3 py-1.5 text-xs font-black text-[#051a10] hover:brightness-105 active:scale-95 transition-all cursor-pointer shadow-md disabled:opacity-50"
                            >
                              <UserCheck className="h-3.5 w-3.5" />
                              <span>{isUpdating ? '...' : strings.actionUnsuspend}</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleSetUserStatus(u, 'suspended')}
                              disabled={isUpdating}
                              className="flex items-center gap-1 rounded-xl border border-amber-500/50 bg-amber-950/40 px-3 py-1.5 text-xs font-bold text-amber-300 hover:bg-amber-900/60 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                            >
                              <UserX className="h-3.5 w-3.5" />
                              <span>{isUpdating ? '...' : strings.actionSuspend}</span>
                            </button>
                          )}

                          {/* REVERSIBLE TOGGLE 2: BAN <-> UNBAN */}
                          {isBanned ? (
                            <button
                              onClick={() => handleSetUserStatus(u, 'active')}
                              disabled={isUpdating}
                              className="flex items-center gap-1 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-3 py-1.5 text-xs font-black text-[#051a10] hover:brightness-105 active:scale-95 transition-all cursor-pointer shadow-md disabled:opacity-50"
                            >
                              <UserCheck className="h-3.5 w-3.5" />
                              <span>{isUpdating ? '...' : strings.actionUnban}</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleSetUserStatus(u, 'banned')}
                              disabled={isUpdating}
                              className="flex items-center gap-1 rounded-xl border border-rose-500/50 bg-rose-950/50 px-3 py-1.5 text-xs font-bold text-rose-300 hover:bg-rose-900/70 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                            >
                              <Ban className="h-3.5 w-3.5" />
                              <span>{isUpdating ? '...' : strings.actionBan}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 1: ORDER APPROVALS (TIDs & PROOF SLIPS) */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0a2618]/90 p-4 rounded-3xl border border-[#d4af37]/30">
            <div>
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-[#d4af37]" />
                <h3 className="text-base font-extrabold text-[#f4efe6]">
                  {isUr ? 'جمع شدہ پیکج آرڈرز کی تصدیق (TIDs و رسیدیں)' : 'Submitted Package Orders & Payment Slips'}
                </h3>
              </div>
              <p className="text-xs text-[#f4efe6]/60 mt-0.5">
                {isUr ? 'TxID یا نام سے تلاش کریں، منسلک رسیدوں کا جائزہ لیں اور منظور یا مسترد کریں۔' : 'Search by TxID or Name, inspect attached payment slips, and approve or reject.'}
              </p>
            </div>

            {/* MANDATORY REQUIREMENT: Search by TxID Search Bar */}
            <div className="relative min-w-[240px] flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#d4af37]/60" />
              <input
                type="text"
                value={orderTxidSearch}
                onChange={(e) => setOrderTxidSearch(e.target.value)}
                placeholder={isUr ? 'TxID، صارف یا نام سے تلاش کریں...' : 'Search by TxID or Name...'}
                className="w-full rounded-xl border border-[#d4af37]/30 bg-[#051a10] py-2 pl-9 pr-3 text-xs text-[#f4efe6] placeholder-[#f4efe6]/40 focus:border-[#d4af37] focus:outline-none"
              />
            </div>
          </div>

          {orders.length === 0 ? (
            <div className="rounded-3xl border border-[#d4af37]/20 bg-[#0a2618]/60 p-8 text-center text-xs text-[#f4efe6]/50">
              {isUr ? 'کوئی آرڈر جمع نہیں ہوا (ڈیٹا بیس خالی ہے)۔' : 'No package orders submitted yet (Database starts empty).'}
            </div>
          ) : (
            <div className="space-y-3">
              {orders
                .filter((ord) => {
                  if (!orderTxidSearch.trim()) return true;
                  const q = orderTxidSearch.trim().toLowerCase();
                  return (
                    (ord.tid || '').toLowerCase().includes(q) ||
                    (ord.userName || '').toLowerCase().includes(q) ||
                    (ord.userEmail || '').toLowerCase().includes(q) ||
                    (ord.userId || '').toLowerCase().includes(q)
                  );
                })
                .map((ord) => (
                  <div
                    key={ord.id}
                    className="rounded-3xl border border-[#d4af37]/30 bg-[#0a2618]/90 p-5 shadow-xl space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#d4af37]/20 pb-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-base font-extrabold text-[#d4af37]">
                            Rs. {ord.amount.toLocaleString()} ({ord.hensCount} {isUr ? 'مرغیاں' : 'Hens'})
                          </span>
                          <span className="rounded-lg bg-[#051a10] border border-[#d4af37]/30 px-2 py-0.5 font-mono text-xs text-[#f3df88]">
                            TID: {ord.tid}
                          </span>
                          {ord.paymentMethodTitle && (
                            <span className="rounded-lg bg-[#d4af37]/15 border border-[#d4af37]/30 px-2 py-0.5 text-[10px] font-bold text-[#f3df88]">
                              {ord.paymentMethodTitle}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#f4efe6]/60 mt-0.5">
                          {ord.userName} ({ord.userEmail}) • User ID: {ord.userId} • Phone: {ord.userPhone}
                        </p>
                      </div>

                      <div>
                        {ord.status === 'pending' && (
                          <span className="rounded-full bg-amber-500/20 border border-amber-500/40 px-3 py-1 text-xs font-bold text-amber-300">
                            {strings.statusPending}
                          </span>
                        )}
                        {ord.status === 'approved' && (
                          <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 px-3 py-1 text-xs font-bold text-emerald-300">
                            Approved
                          </span>
                        )}
                        {ord.status === 'rejected' && (
                          <span className="rounded-full bg-rose-500/20 border border-rose-500/40 px-3 py-1 text-xs font-bold text-rose-300">
                            Rejected
                          </span>
                        )}
                      </div>
                    </div>

                    {/* MANDATORY REQUIREMENT: Display Uploaded Payment Slip Thumbnail with Zoom */}
                    {ord.proofSlipUrl ? (
                      <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-[#051a10] border border-[#d4af37]/40">
                        <div
                          onClick={() => setSlipZoomUrl(ord.proofSlipUrl || null)}
                          className="relative group cursor-pointer shrink-0 rounded-xl overflow-hidden border border-[#d4af37]/60 p-0.5 bg-black"
                        >
                          <img
                            src={ord.proofSlipUrl}
                            alt="Payment Slip"
                            className="h-16 w-16 object-cover rounded-lg group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                            <ZoomIn className="h-5 w-5" />
                          </div>
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-[#f3df88]">
                            <ImageIcon className="h-3.5 w-3.5 text-[#d4af37]" />
                            <span>{isUr ? 'ادائیگی کی رسید منسلک ہے' : 'Attached Payment Slip / Transfer Screenshot'}</span>
                          </div>
                          <p className="text-[11px] text-[#f4efe6]/70 mt-0.5">
                            {isUr ? 'مکمل تصویر دیکھنے کے لیے کلک کریں۔' : 'Click image to inspect full high-resolution slip.'}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => setSlipZoomUrl(ord.proofSlipUrl || null)}
                          className="flex items-center gap-1 rounded-xl border border-[#d4af37]/40 bg-[#0a2618] px-3 py-1.5 text-xs font-bold text-[#f3df88] hover:bg-[#d4af37]/20 transition-all cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>{isUr ? 'بڑا دیکھیں' : 'Zoom Slip'}</span>
                        </button>
                      </div>
                    ) : (
                      <div className="text-[11px] text-[#f4efe6]/50 bg-[#051a10]/50 p-2.5 rounded-xl border border-white/5">
                        {isUr ? 'رسید کی تصویر منسلک نہیں ہے۔' : 'No screenshot attached.'}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#f4efe6]/70">
                      <div>
                        <span className="text-[#f4efe6]/50">Sender:</span>{' '}
                        <span className="text-[#f4efe6] font-semibold">{ord.senderEasypaisaTitle} ({ord.senderEasypaisaNumber})</span>
                      </div>
                      <div>
                        <span className="text-[#f4efe6]/50">Submitted At:</span>{' '}
                        <span className="text-[#f4efe6]">{new Date(ord.submittedAt).toLocaleString()}</span>
                      </div>
                    </div>

                    {ord.adminNote && (
                      <div className="text-xs text-amber-300/80 bg-[#051a10]/60 p-2 rounded-xl">
                        Admin Note: {ord.adminNote}
                      </div>
                    )}

                    {ord.status === 'pending' && (
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
                        {/* ACTIVATED REJECT BUTTON (NO window.prompt) */}
                        <button
                          onClick={() => handleOpenRejectOrder(ord)}
                          disabled={!!approvingOrderIds[ord.id]}
                          className="flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-950/40 px-4 py-2 text-xs font-bold text-rose-200 hover:bg-rose-900/60 cursor-pointer active:scale-95 transition-all"
                        >
                          <XCircle className="h-4 w-4" />
                          <span>{strings.rejectBtn}</span>
                        </button>

                        <button
                          onClick={() => handleApproveOrder(ord.id)}
                          disabled={!!approvingOrderIds[ord.id]}
                          className={`flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#b38f20] px-4 py-2 text-xs font-black text-[#051a10] shadow-md shadow-[#d4af37]/20 transition-all ${
                            approvingOrderIds[ord.id]
                              ? 'opacity-60 cursor-not-allowed scale-95'
                              : 'hover:brightness-105 cursor-pointer active:scale-95'
                          }`}
                        >
                          {approvingOrderIds[ord.id] ? (
                            <>
                              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#051a10] border-t-transparent" />
                              <span>{isUr ? 'منظوری جاری ہے...' : 'Approving...'}</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="h-4 w-4" />
                              <span>{strings.approveBtn}</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: WITHDRAWAL REQUESTS */}
      {activeTab === 'withdrawals' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-[#f4efe6]">
              {isUr ? 'ایزی پیسہ نکلوائی کی درخواستیں' : 'Easypaisa Withdrawal Requests'}
            </h3>
            <span className="text-xs text-amber-300 font-bold">
              {pendingWithdrawalsList.length} {isUr ? 'زیرِ التواء' : 'Pending'}
            </span>
          </div>

          {withdrawals.length === 0 ? (
            <div className="rounded-3xl border border-[#d4af37]/20 bg-[#0a2618]/60 p-8 text-center text-xs text-[#f4efe6]/50">
              {isUr ? 'کوئی نکلوائی کی درخواست موصول نہیں ہوئی۔' : 'No withdrawal requests in database yet.'}
            </div>
          ) : (
            <div className="space-y-3">
              {withdrawals.map((w) => (
                <div
                  key={w.id}
                  className="rounded-3xl border border-[#d4af37]/30 bg-[#0a2618]/90 p-5 shadow-xl space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#d4af37]/20 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-extrabold text-[#d4af37]">
                          Rs. {w.amount.toLocaleString()}
                        </span>
                        <span className="text-xs text-[#f3df88]">
                          ({w.eggsEquivalent} Eggs)
                        </span>
                      </div>
                      <p className="text-xs text-[#f4efe6]/60 mt-0.5">
                        {w.userName} ({w.userEmail}) • User ID: {w.userId}
                      </p>
                    </div>

                    <div>
                      {w.status === 'pending' && (
                        <span className="rounded-full bg-amber-500/20 border border-amber-500/40 px-3 py-1 text-xs font-bold text-amber-300">
                          Pending Payout
                        </span>
                      )}
                      {w.status === 'paid' && (
                        <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 px-3 py-1 text-xs font-bold text-emerald-300">
                          Paid
                        </span>
                      )}
                      {w.status === 'rejected' && (
                        <span className="rounded-full bg-rose-500/20 border border-rose-500/40 px-3 py-1 text-xs font-bold text-rose-300">
                          Rejected & Refunded
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-[#051a10]/70 p-3 text-xs space-y-1">
                    <div className="text-[#f3df88] font-bold">
                      Easypaisa Payout Target:
                    </div>
                    <div className="font-mono text-sm text-[#f4efe6] font-bold">
                      {w.easypaisaNumber} ({w.easypaisaTitle})
                    </div>
                    <div className="text-[11px] text-[#f4efe6]/50">
                      Requested: {new Date(w.requestedAt).toLocaleString()}
                    </div>
                  </div>

                  {w.adminNote && (
                    <div className="text-xs text-[#f3df88]/80 bg-[#051a10]/60 p-2 rounded-xl">
                      Payout Note: {w.adminNote}
                    </div>
                  )}

                  {w.status === 'pending' && (
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
                      {/* ACTIVATED REJECT & REFUND BUTTON (NO window.prompt) */}
                      <button
                        onClick={() => handleOpenRejectWithdrawal(w)}
                        className="flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-950/40 px-4 py-2 text-xs font-bold text-rose-200 hover:bg-rose-900/60 cursor-pointer active:scale-95 transition-all"
                      >
                        <XCircle className="h-4 w-4" />
                        <span>{isUr ? 'مسترد اور رقم والٹ میں واپس' : 'Reject & Refund'}</span>
                      </button>

                      {/* ACTIVATED MARK PAID BUTTON (NO window.prompt) */}
                      <button
                        onClick={() => handleOpenMarkPaid(w)}
                        className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2 text-xs font-black text-[#051a10] hover:brightness-105 cursor-pointer shadow-md shadow-emerald-500/20 active:scale-95 transition-all"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        <span>{strings.markAsPaidBtn}</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: DYNAMIC PAYMENT METHODS (ADMIN CONTROL UP TO 10 ACCOUNTS) */}
      {activeTab === 'payment_methods' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0a2618]/90 p-5 rounded-3xl border border-[#d4af37]/30">
            <div>
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-[#d4af37]" />
                <h3 className="text-lg font-extrabold text-[#f4efe6]">
                  {isUr ? 'سرکاری ادائیگی کے اکاؤنٹس اور کیو آر کوڈ (Payment Methods)' : 'Official Payment Methods & QR Code Management'}
                </h3>
              </div>
              <p className="text-xs text-[#f4efe6]/60 mt-1">
                {isUr
                  ? 'زیادہ سے زیادہ 10 فعال اکاؤنٹس (JazzCash, Easypaisa, Bank, USDT)۔ ہر اکاؤنٹ پر اپنا کیو آر کوڈ اپ لوڈ کریں۔'
                  : 'Manage up to 10 active payment accounts with live QR code image upload from PC.'}
              </p>
            </div>

            <button
              onClick={handleOpenNewPaymentMethod}
              disabled={paymentMethods.length >= 10}
              className={`flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#b38f20] px-4 py-2.5 text-xs font-black text-[#051a10] shadow-md transition-all ${
                paymentMethods.length >= 10
                  ? 'opacity-40 cursor-not-allowed'
                  : 'hover:brightness-105 active:scale-95 cursor-pointer shadow-[#d4af37]/20'
              }`}
            >
              <Plus className="h-4 w-4 stroke-[3]" />
              <span>{isUr ? 'نیا اکاؤنٹ شامل کریں (میکس 10)' : 'Add Payment Method (Max 10)'}</span>
            </button>
          </div>

          {/* Requirement 2: Custom Admin Greeting on Payment Screen Input Form */}
          <div className="rounded-3xl border border-[#d4af37]/40 bg-gradient-to-r from-[#0d3420] via-[#0a2618] to-[#071d12] p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-[#d4af37]/20 pb-2.5">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#d4af37]" />
                <h4 className="text-sm font-bold text-[#f3df88]">
                  {isUr ? 'صارفین کی پیمنٹ اسکرین کے لیے کسٹم پیغام (Greeting)' : 'Custom Checkout Greeting (Top of Payment Screen)'}
                </h4>
              </div>
              <span className="text-[11px] text-[#d4af37]/80 font-semibold">
                {isUr ? 'کسٹمر اعتماد و رہنمائی' : 'Builds Customer Trust'}
              </span>
            </div>

            <p className="text-xs text-[#f4efe6]/70 leading-relaxed">
              {isUr
                ? 'یہ پیغام صارف کی پیمنٹ اور چیک آؤٹ اسکرین پر بالکل اوپر نمایاں نظر آئے گا (مثلاً: "Thanks for trusting us!")'
                : 'This custom greeting text appears dynamically at the very top of the user checkout screen outside the main payment details box.'}
            </p>

            <form onSubmit={handleSaveCustomGreeting} className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#f3df88] mb-1">
                    Greeting in English
                  </label>
                  <input
                    type="text"
                    value={customGreeting}
                    onChange={(e) => setCustomGreeting(e.target.value)}
                    placeholder="e.g. Thanks for trusting us! We look forward to serving your flock."
                    className="w-full rounded-xl border border-[#d4af37]/30 bg-[#051a10] px-3.5 py-2.5 text-xs text-[#f4efe6] focus:border-[#d4af37] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#f3df88] mb-1">
                    Greeting in Urdu (Optional)
                  </label>
                  <input
                    type="text"
                    value={customGreetingUr}
                    onChange={(e) => setCustomGreetingUr(e.target.value)}
                    placeholder="e.g. ہم پر اعتماد کرنے کا شکریہ! ہم آپ کے فلاک کی دیکھ بھال کے منتظر ہیں۔"
                    className="w-full rounded-xl border border-[#d4af37]/30 bg-[#051a10] px-3.5 py-2.5 text-xs text-[#f4efe6] focus:border-[#d4af37] focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                {greetingActionMessage ? (
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 animate-in fade-in">
                    <CheckCircle2 className="h-4 w-4" /> {greetingActionMessage}
                  </span>
                ) : (
                  <span className="text-[11px] text-[#f4efe6]/50">
                    Live updates sync instantly across all user devices.
                  </span>
                )}
                <button
                  type="submit"
                  disabled={isSavingGreeting}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#b38f20] px-5 py-2 text-xs font-black text-[#051a10] hover:brightness-105 active:scale-95 cursor-pointer shadow-md disabled:opacity-50"
                >
                  <Check className="h-3.5 w-3.5 stroke-[3]" />
                  <span>{isSavingGreeting ? 'Saving...' : 'Save Greeting'}</span>
                </button>
              </div>
            </form>
          </div>

          {pmActionMessage && (
            <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/50 bg-emerald-950/80 p-3.5 text-xs sm:text-sm font-semibold text-emerald-200">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>{pmActionMessage}</span>
            </div>
          )}

          {pmErrorMessage && (
            <div className="flex items-center gap-2 rounded-2xl border border-rose-500/50 bg-rose-950/80 p-3.5 text-xs sm:text-sm font-semibold text-rose-200">
              <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
              <span>{pmErrorMessage}</span>
            </div>
          )}

          {/* Form to Add / Edit Payment Account */}
          {isEditingPm && (
            <div className="rounded-3xl border-2 border-[#d4af37] bg-gradient-to-b from-[#0d3420] via-[#0a2618] to-[#051a10] p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#d4af37]/30 pb-3">
                <h4 className="text-base font-bold text-[#f3df88]">
                  {editingPmId
                    ? isUr ? 'ادائیگی کا اکاؤنٹ تبدیل کریں' : 'Edit Payment Account'
                    : isUr ? 'نیا سرکاری اکاؤنٹ شامل کریں' : 'Add New Official Payment Account'}
                </h4>
                <button
                  type="button"
                  onClick={() => setIsEditingPm(false)}
                  className="rounded-lg p-1 text-[#f3df88] hover:bg-[#d4af37]/20 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSavePaymentMethod} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#f3df88] mb-1">
                      Method Type
                    </label>
                    <select
                      value={pmType}
                      onChange={(e) => setPmType(e.target.value as PaymentMethodType)}
                      className="w-full rounded-xl border border-[#d4af37]/30 bg-[#051a10] py-2 px-3 text-xs text-[#f4efe6] focus:border-[#d4af37] focus:outline-none"
                    >
                      <option value="jazzcash">JazzCash</option>
                      <option value="easypaisa">Easypaisa</option>
                      <option value="bank">Bank Account / Raast</option>
                      <option value="usdt">USDT (Crypto)</option>
                      <option value="other">Other Official</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#f3df88] mb-1">
                      Account Display Title (En) *
                    </label>
                    <input
                      type="text"
                      required
                      value={pmTitle}
                      onChange={(e) => setPmTitle(e.target.value)}
                      placeholder="e.g. JazzCash Merchant"
                      className="w-full rounded-xl border border-[#d4af37]/30 bg-[#051a10] py-2 px-3 text-xs text-[#f4efe6] focus:border-[#d4af37] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#f3df88] mb-1">
                      Title in Urdu (Optional)
                    </label>
                    <input
                      type="text"
                      value={pmTitleUr}
                      onChange={(e) => setPmTitleUr(e.target.value)}
                      placeholder="e.g. جاز کیش مرچنٹ"
                      className="w-full rounded-xl border border-[#d4af37]/30 bg-[#051a10] py-2 px-3 text-xs text-[#f4efe6] focus:border-[#d4af37] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#f3df88] mb-1">
                      Account Title / Beneficiary Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={pmAccountTitle}
                      onChange={(e) => setPmAccountTitle(e.target.value)}
                      placeholder="e.g. Pak Hen Farm Official"
                      className="w-full rounded-xl border border-[#d4af37]/30 bg-[#051a10] py-2 px-3 text-xs text-[#f4efe6] focus:border-[#d4af37] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#f3df88] mb-1">
                      Account Number / TILL ID / IBAN / TRC20 Address *
                    </label>
                    <input
                      type="text"
                      required
                      value={pmAccountNumber}
                      onChange={(e) => setPmAccountNumber(e.target.value)}
                      placeholder="e.g. 03009988776, Till: 102938, or Address"
                      className="w-full rounded-xl border border-[#d4af37]/30 bg-[#051a10] py-2 px-3 text-xs text-[#f4efe6] font-mono focus:border-[#d4af37] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#f3df88] mb-1">
                      Bank Name (If applicable)
                    </label>
                    <input
                      type="text"
                      value={pmBankName}
                      onChange={(e) => setPmBankName(e.target.value)}
                      placeholder="e.g. Meezan Bank Ltd"
                      className="w-full rounded-xl border border-[#d4af37]/30 bg-[#051a10] py-2 px-3 text-xs text-[#f4efe6] focus:border-[#d4af37] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Upload QR Code Field */}
                <div className="rounded-2xl border-2 border-dashed border-[#d4af37]/40 bg-[#051a10] p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#f3df88] flex items-center gap-1.5">
                      <QrCode className="h-4 w-4 text-[#d4af37]" />
                      <span>Upload QR Code Image (PC File Upload)</span>
                    </label>
                    {pmQrCodeBase64 && (
                      <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                        <Check className="h-3 w-3" /> QR Attached
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    {pmQrCodeBase64 ? (
                      <div className="relative group shrink-0">
                        <img
                          src={pmQrCodeBase64}
                          alt="QR Code"
                          className="h-24 w-24 object-contain rounded-xl border-2 border-[#d4af37] p-1 bg-white shadow-md"
                        />
                        <button
                          type="button"
                          onClick={() => setPmQrCodeBase64('')}
                          className="absolute -top-2 -right-2 rounded-full bg-rose-600 p-1 text-white hover:bg-rose-700 shadow"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="h-24 w-24 rounded-xl border border-dashed border-[#d4af37]/30 flex flex-col items-center justify-center text-[#f4efe6]/40 text-center p-2 shrink-0">
                        <QrCode className="h-8 w-8 text-[#d4af37]/50 mb-1" />
                        <span className="text-[10px]">No QR Yet</span>
                      </div>
                    )}

                    <div className="space-y-1.5 flex-1">
                      <label className="inline-flex items-center gap-1.5 rounded-xl border border-[#d4af37]/50 bg-[#0a2618] px-4 py-2 text-xs font-bold text-[#f3df88] hover:bg-[#d4af37]/20 transition-all cursor-pointer">
                        <Upload className="h-3.5 w-3.5" />
                        <span>{pmQrCodeBase64 ? 'Change QR Image' : 'Select QR Code from PC'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleQrUpload}
                          className="hidden"
                        />
                      </label>
                      <p className="text-[11px] text-[#f4efe6]/60">
                        Upload official JazzCash/Easypaisa/Bank/USDT QR image. Saved as Base64 in cloud.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Instructions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#f3df88] mb-1">
                      Payment Instructions (English)
                    </label>
                    <input
                      type="text"
                      value={pmInstructions}
                      onChange={(e) => setPmInstructions(e.target.value)}
                      placeholder="e.g. Send to this mobile account and enter TID"
                      className="w-full rounded-xl border border-[#d4af37]/30 bg-[#051a10] py-2 px-3 text-xs text-[#f4efe6] focus:border-[#d4af37] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#f3df88] mb-1">
                      Payment Instructions (Urdu)
                    </label>
                    <input
                      type="text"
                      value={pmInstructionsUr}
                      onChange={(e) => setPmInstructionsUr(e.target.value)}
                      placeholder="e.g. اس اکاؤنٹ پر رقم بھیج کر رسید جمع کروائیں"
                      className="w-full rounded-xl border border-[#d4af37]/30 bg-[#051a10] py-2 px-3 text-xs text-[#f4efe6] focus:border-[#d4af37] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pmActive}
                      onChange={(e) => setPmActive(e.target.checked)}
                      className="h-4 w-4 rounded accent-[#d4af37]"
                    />
                    <span className="text-xs font-semibold text-[#f4efe6]">Active for User Checkout</span>
                  </label>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingPm(false)}
                      className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-xs font-bold text-[#f4efe6] hover:bg-white/10 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingPm}
                      className={`rounded-xl bg-gradient-to-r from-[#d4af37] to-[#b38f20] px-5 py-2 text-xs font-black text-[#051a10] shadow-md transition-all ${
                        isSavingPm
                          ? 'opacity-50 cursor-not-allowed'
                          : 'hover:brightness-105 active:scale-95 cursor-pointer'
                      }`}
                    >
                      {isSavingPm ? 'Saving Account...' : 'Save Account'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* List of Configured Payment Methods */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {paymentMethods.map((pm, idx) => (
              <div
                key={pm.id}
                className={`rounded-3xl border p-5 shadow-xl space-y-3 transition-all ${
                  pm.active
                    ? 'border-[#d4af37]/40 bg-[#0a2618]/90'
                    : 'border-stone-700 bg-stone-900/40 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between border-b border-[#d4af37]/20 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#d4af37]/20 text-[#f3df88] font-bold text-xs">
                      #{idx + 1}
                    </span>
                    <div>
                      <h4 className="text-sm font-extrabold text-[#f3df88]">{pm.title}</h4>
                      {pm.bankName && <p className="text-[11px] text-[#f4efe6]/60">{pm.bankName}</p>}
                    </div>
                  </div>

                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${
                      pm.active
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-stone-700 text-stone-400'
                    }`}
                  >
                    {pm.active ? 'Active' : 'Disabled'}
                  </span>
                </div>

                <div className="flex items-start gap-4">
                  {pm.qrCodeUrl ? (
                    <div
                      onClick={() => setSlipZoomUrl(pm.qrCodeUrl || null)}
                      className="relative group cursor-pointer shrink-0 rounded-xl overflow-hidden border border-[#d4af37] p-1 bg-white shadow"
                    >
                      <img
                        src={pm.qrCodeUrl}
                        alt="QR"
                        className="h-20 w-20 object-contain"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                        <ZoomIn className="h-4 w-4" />
                      </div>
                    </div>
                  ) : (
                    <div className="h-20 w-20 rounded-xl border border-dashed border-[#d4af37]/20 flex flex-col items-center justify-center text-[#f4efe6]/30 text-center p-1 shrink-0">
                      <QrCode className="h-6 w-6 mb-1 text-[#d4af37]/40" />
                      <span className="text-[9px]">No QR</span>
                    </div>
                  )}

                  <div className="space-y-1 text-xs text-[#f4efe6]/80 flex-1 overflow-hidden">
                    <div>
                      <span className="text-[#f4efe6]/50">Title:</span>{' '}
                      <span className="font-bold text-[#f4efe6]">{pm.accountTitle}</span>
                    </div>
                    <div>
                      <span className="text-[#f4efe6]/50">Number:</span>{' '}
                      <span className="font-mono text-[#f3df88] font-bold break-all">{pm.accountNumber}</span>
                    </div>
                    {pm.instructions && (
                      <p className="text-[11px] text-[#f4efe6]/60 italic truncate mt-1">
                        "{pm.instructions}"
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => handleTogglePaymentMethodActive(pm)}
                    className="rounded-xl border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-semibold text-[#f4efe6] hover:bg-white/10 cursor-pointer"
                  >
                    {pm.active ? 'Disable' : 'Enable'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenEditPaymentMethod(pm)}
                    className="flex items-center gap-1 rounded-xl border border-[#d4af37]/40 bg-[#051a10] px-3 py-1.5 text-xs font-bold text-[#f3df88] hover:bg-[#d4af37]/20 cursor-pointer"
                  >
                    <Edit2 className="h-3 w-3" />
                    <span>Edit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeletePaymentMethod(pm.id)}
                    className="flex items-center gap-1 rounded-xl border border-rose-500/40 bg-rose-950/40 px-3 py-1.5 text-xs font-bold text-rose-300 hover:bg-rose-900/60 cursor-pointer"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: DEDICATED ADMIN SOS INBOX & HELPDESK TICKETS */}
      {activeTab === 'sos_inbox' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0a2618]/90 p-5 rounded-3xl border border-[#d4af37]/30">
            <div>
              <div className="flex items-center gap-2">
                <LifeBuoy className="h-5 w-5 text-[#d4af37]" />
                <h3 className="text-lg font-extrabold text-[#f4efe6]">
                  {isUr ? 'کسٹمر SOS الرٹس اور انکوائری ان باکس' : 'Admin SOS Alerts & Helpdesk Inbox'}
                </h3>
              </div>
              <p className="text-xs text-[#f4efe6]/60 mt-1">
                {isUr
                  ? 'صارفین کی جانب سے SOS یا ہیلپ فارم سے بھیجے گئے تمام پیغامات اور شکایات کا مرکزی ان باکس۔'
                  : 'Central inbox for all user queries, emergency help alerts, and support tickets.'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="rounded-full bg-[#051a10] border border-[#d4af37]/30 px-3 py-1 text-xs font-bold text-[#f3df88]">
                {openTicketsList.length} Open Inquiries
              </span>
            </div>
          </div>

          {ticketSuccessMsg && (
            <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/50 bg-emerald-950/80 p-3.5 text-xs sm:text-sm font-semibold text-emerald-200">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>{ticketSuccessMsg}</span>
            </div>
          )}

          {/* Ticket Reply Modal */}
          {selectedTicketForReply && (
            <div className="rounded-3xl border-2 border-[#d4af37] bg-gradient-to-b from-[#0d3420] to-[#051a10] p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#d4af37]/30 pb-3">
                <h4 className="text-base font-bold text-[#f3df88]">
                  Reply to SOS Ticket from {selectedTicketForReply.userName}
                </h4>
                <button
                  type="button"
                  onClick={() => setSelectedTicketForReply(null)}
                  className="rounded-lg p-1 text-[#f3df88] hover:bg-[#d4af37]/20 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="bg-[#051a10] p-4 rounded-2xl border border-[#d4af37]/20 space-y-1 text-xs">
                <div className="font-bold text-[#f3df88]">Subject: {selectedTicketForReply.subject}</div>
                <div className="text-[#f4efe6]/80 italic">"{selectedTicketForReply.message}"</div>
                <div className="text-[11px] text-[#f4efe6]/50 pt-1">
                  User ID: {selectedTicketForReply.userId} • Phone: {selectedTicketForReply.userPhone} • Email: {selectedTicketForReply.userEmail}
                </div>
              </div>

              <form onSubmit={handleSendTicketReply} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-[#f3df88] mb-1">
                    Staff / Admin Official Response:
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={ticketReplyText}
                    onChange={(e) => setTicketReplyText(e.target.value)}
                    placeholder="Enter official resolution or assistance message..."
                    className="w-full rounded-xl border border-[#d4af37]/30 bg-[#051a10] p-3 text-xs text-[#f4efe6] focus:border-[#d4af37] focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedTicketForReply(null)}
                    className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-xs font-bold text-[#f4efe6] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isReplyingTicket}
                    className="rounded-xl bg-gradient-to-r from-[#d4af37] to-[#b38f20] px-5 py-2 text-xs font-black text-[#051a10] hover:brightness-105 active:scale-95 cursor-pointer shadow-md disabled:opacity-50"
                  >
                    {isReplyingTicket ? 'Sending...' : 'Send Reply & Resolve Ticket'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {tickets.length === 0 ? (
            <div className="rounded-3xl border border-[#d4af37]/20 bg-[#0a2618]/60 p-8 text-center text-xs text-[#f4efe6]/50">
              {isUr ? 'کوئی SOS الرٹ موصول نہیں ہوا۔' : 'No SOS inquiries or support tickets submitted yet.'}
            </div>
          ) : (
            <div className="space-y-3">
              {tickets.map((tkt) => (
                <div
                  key={tkt.id}
                  className={`rounded-3xl border p-5 shadow-xl space-y-3 transition-all ${
                    tkt.status === 'open'
                      ? 'border-[#d4af37]/50 bg-gradient-to-br from-[#0c311e] via-[#0a2618] to-[#051a10]'
                      : 'border-stone-800 bg-stone-900/40 opacity-75'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#d4af37]/20 pb-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-[#f4efe6]">{tkt.subject}</span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${
                            tkt.status === 'open'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          }`}
                        >
                          {tkt.status === 'open' ? 'Open Ticket' : 'Resolved'}
                        </span>
                      </div>
                      <p className="text-xs text-[#f4efe6]/60">
                        From: <span className="text-[#f3df88] font-bold">{tkt.userName}</span> (ID: {tkt.userId}) • Phone: {tkt.userPhone} • Email: {tkt.userEmail}
                      </p>
                    </div>

                    <span className="text-[11px] text-[#f4efe6]/50">
                      {new Date(tkt.createdAt).toLocaleString()}
                    </span>
                  </div>

                  <div className="rounded-2xl bg-[#051a10]/70 p-3.5 text-xs text-[#f4efe6]/90 space-y-1">
                    <span className="text-[10px] font-bold uppercase text-[#d4af37] block">User Message:</span>
                    <p className="leading-relaxed">{tkt.message}</p>
                  </div>

                  {tkt.staffReply && (
                    <div className="rounded-2xl bg-emerald-950/40 border border-emerald-500/30 p-3.5 text-xs text-emerald-200 space-y-1">
                      <span className="text-[10px] font-bold uppercase text-emerald-400 block">
                        Admin / Staff Resolution ({tkt.repliedAt ? new Date(tkt.repliedAt).toLocaleString() : ''}):
                      </span>
                      <p className="leading-relaxed">{tkt.staffReply}</p>
                    </div>
                  )}

                  {tkt.status === 'open' && (
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
                      <button
                        onClick={() => {
                          setSelectedTicketForReply(tkt);
                          setTicketReplyText('');
                        }}
                        className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#b38f20] px-4 py-2 text-xs font-black text-[#051a10] hover:brightness-105 active:scale-95 cursor-pointer shadow-md shadow-[#d4af37]/20"
                      >
                        <MessageSquare className="h-4 w-4" />
                        <span>{isUr ? 'جواب ارسال کریں اور حل کریں' : 'Reply & Resolve'}</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: MEDICAL APPROVALS (PHASE 3) */}
      {activeTab === 'medical' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0a2618]/90 p-5 rounded-3xl border border-[#d4af37]/30">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-amber-600 text-white shadow-md shadow-rose-900/40">
                  <Stethoscope className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-lg font-extrabold text-[#f4efe6]">
                    {strings.adminNavMedicalApprovals}
                  </h3>
                  <p className="text-xs text-[#f3df88]/80 mt-0.5">
                    {strings.medicalApprovalsSubtitle}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="rounded-full bg-rose-500/20 border border-rose-500/40 px-3 py-1 text-xs font-bold text-rose-300">
                {pendingMedicalList.length} {isUr ? 'زیر التواء درخواستیں' : 'Pending Verification'}
              </span>
            </div>
          </div>

          {/* Critical Guarantee Notice */}
          <div className="flex items-center gap-3 rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-950/40 to-[#0a2618] p-4 text-xs text-[#f3df88]">
            <ShieldCheck className="h-5 w-5 shrink-0 text-[#d4af37]" />
            <span>
              {isUr
                ? 'اہم ضابطہ: میڈیکل فیس کی تصدیق سے صارف کا 24 گھنٹے کا انڈوں کا ٹائمر ان لاک ہو جاتا ہے۔ یہ منظوری صارف کے فلاک میں نئی مرغیاں شامل نہیں کرتی اور اصل سرمایہ کاری برقرار رہتی ہے۔'
                : 'Isolated Medical Protocol: Approving a medical fee clears the sickness alert and unlocks the user\'s daily collection timer. It strictly DOES NOT add any new hens or modify package equity.'}
            </span>
          </div>

          {/* Feedback messages */}
          {medicalActionMessage && (
            <div className="flex items-center gap-2.5 rounded-2xl border border-emerald-500/50 bg-emerald-950/80 p-4 text-emerald-200">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
              <span className="text-xs sm:text-sm font-semibold">{medicalActionMessage}</span>
            </div>
          )}

          {medicalPayments.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[#d4af37]/30 bg-[#051a10]/50 p-12 text-center">
              <Stethoscope className="mx-auto h-12 w-12 text-[#d4af37]/40 mb-3" />
              <h4 className="text-base font-bold text-[#f4efe6]">
                {strings.noPendingMedical}
              </h4>
              <p className="text-xs text-[#f4efe6]/60 mt-1 max-w-md mx-auto">
                {isUr
                  ? 'جب شیڈ میں بیماری کا الرٹ جاری ہوتا ہے اور کم بیلنس والے صارفین جاز کیش یا USDT کے ذریعے فیس ادا کرتے ہیں تو ان کے TID یہاں ظاہر ہوں گے۔'
                  : 'When a shed sickness alert is declared and users with low wallet balances pay via JazzCash or USDT, submitted payment TIDs will appear here for verification.'}
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {medicalPayments.map((med) => {
                const isApproving = !!approvingMedId[med.id];
                return (
                  <div
                    key={med.id}
                    className={`rounded-3xl border p-5 backdrop-blur-md transition-all ${
                      med.status === 'pending'
                        ? 'border-amber-500/50 bg-gradient-to-br from-[#0c311e] via-[#082215] to-[#051a10] shadow-lg shadow-amber-500/10'
                        : med.status === 'approved'
                        ? 'border-emerald-500/30 bg-[#051a10]/80 opacity-80'
                        : 'border-rose-500/30 bg-[#051a10]/80 opacity-70'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-[#f4efe6] text-base">
                            {med.userName}
                          </span>
                          <span className="rounded-lg bg-[#d4af37]/20 border border-[#d4af37]/40 px-2 py-0.5 text-[11px] font-bold text-[#f3df88]">
                            {med.shedId}
                          </span>
                          <span className="rounded-lg bg-teal-500/20 border border-teal-500/40 px-2 py-0.5 text-[11px] font-bold text-teal-300">
                            {med.paymentMethod.toUpperCase()}
                          </span>
                        </div>
                        <div className="text-xs text-[#f4efe6]/60 mt-0.5 flex items-center gap-3 flex-wrap">
                          <span>{med.userEmail}</span>
                          {med.userPhone && <span>• {med.userPhone}</span>}
                          <span>• {new Date(med.submittedAt).toLocaleString()}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        {med.status === 'pending' && (
                          <span className="rounded-full bg-amber-500/20 border border-amber-500/40 px-3 py-1 text-xs font-black text-amber-300 animate-pulse">
                            {isUr ? 'زیر تصدیق' : 'Pending Verification'}
                          </span>
                        )}
                        {med.status === 'approved' && (
                          <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 px-3 py-1 text-xs font-bold text-emerald-300 flex items-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>{isUr ? 'منظور شدہ (ان لاک)' : 'Approved & Unlocked'}</span>
                          </span>
                        )}
                        {med.status === 'rejected' && (
                          <span className="rounded-full bg-rose-500/20 border border-rose-500/40 px-3 py-1 text-xs font-bold text-rose-300">
                            {isUr ? 'مسترد شدہ' : 'Rejected'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Tiered Fee Calculation Breakdown */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-3.5">
                      <div className="rounded-2xl bg-[#051a10]/70 p-3 border border-white/5">
                        <div className="text-[10px] text-[#f4efe6]/60 font-medium">
                          {isUr ? 'صارف کی مرغیاں' : 'Flock Size'}
                        </div>
                        <div className="text-sm font-black text-white mt-0.5">
                          {med.hensCount} {isUr ? 'مرغیاں' : 'Hens'}
                        </div>
                      </div>

                      <div className="rounded-2xl bg-[#051a10]/70 p-3 border border-white/5">
                        <div className="text-[10px] text-[#f4efe6]/60 font-medium">
                          {isUr ? 'رعایتی شرح فی مرغی' : 'Tiered Rate / Hen'}
                        </div>
                        <div className="text-sm font-black text-[#f3df88] mt-0.5">
                          Rs. {med.perHenRate}
                        </div>
                      </div>

                      <div className="rounded-2xl bg-[#051a10]/70 p-3 border border-white/5">
                        <div className="text-[10px] text-[#f4efe6]/60 font-medium">
                          {isUr ? 'کل میڈیکل فیس' : 'Total Medical Fee'}
                        </div>
                        <div className="text-sm font-black text-[#d4af37] mt-0.5">
                          Rs. {med.amount.toLocaleString()}
                        </div>
                      </div>

                      <div className="rounded-2xl bg-[#051a10]/70 p-3 border border-white/5">
                        <div className="text-[10px] text-[#f4efe6]/60 font-medium">
                          {isUr ? 'طریقہ ادائیگی' : 'Channel'}
                        </div>
                        <div className="text-sm font-black text-teal-300 mt-0.5 flex items-center gap-1.5">
                          {med.paymentMethod === 'jazzcash' ? (
                            <>
                              <img
                                src="/assets/aistudio/download__2__550d514b.png"
                                alt="JazzCash"
                                className="h-4 w-4 rounded bg-white p-0.5 object-contain shadow-sm"
                              />
                              <span>JazzCash</span>
                            </>
                          ) : (
                            'USDT TRC20'
                          )}
                        </div>
                      </div>
                    </div>

                    {/* TID & Sender Details Box */}
                    <div className="rounded-2xl bg-[#051a10]/90 p-3.5 border border-[#d4af37]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="space-y-0.5">
                        <div className="text-[10px] font-bold text-[#f3df88] uppercase tracking-wider">
                          {isUr ? 'جمع کرائی گئی ٹرانزیکشن شناختی علامت (TID)' : 'Submitted Transaction ID (TID)'}
                        </div>
                        <div className="font-mono text-sm sm:text-base font-black text-[#f4efe6] select-all tracking-wider">
                          {med.tid}
                        </div>
                        {med.senderName && (
                          <div className="text-[11px] text-[#f4efe6]/70">
                            {isUr ? 'بھیجنے والا:' : 'Sender:'} <span className="font-semibold text-white">{med.senderName}</span>
                            {med.senderNumber && <span> ({med.senderNumber})</span>}
                          </div>
                        )}
                      </div>

                      {med.adminNote && (
                        <div className="text-xs text-rose-300 bg-rose-950/40 p-2 rounded-xl border border-rose-500/20">
                          {isUr ? 'ایڈمن نوٹ:' : 'Admin Note:'} {med.adminNote}
                        </div>
                      )}
                    </div>

                    {/* Pending Action Buttons */}
                    {med.status === 'pending' && (
                      <div className="flex items-center justify-end gap-2.5 pt-3 mt-3 border-t border-white/5">
                        <button
                          onClick={() => handleRejectMedical(med.id)}
                          className="flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-950/40 px-4 py-2 text-xs font-bold text-rose-200 hover:bg-rose-900/60 cursor-pointer active:scale-95 transition-all"
                        >
                          <XCircle className="h-4 w-4" />
                          <span>{strings.rejectMedicalBtn}</span>
                        </button>

                        <button
                          onClick={() => handleApproveMedical(med.id)}
                          disabled={isApproving}
                          className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-2 text-xs font-black text-[#051a10] hover:brightness-105 cursor-pointer shadow-md shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-50"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          <span>
                            {isApproving
                              ? isUr ? 'تصدیق ہو رہی ہے...' : 'Unlocking...'
                              : strings.approveMedicalBtn}
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB: LIVE SHED MANAGEMENT */}
      {activeTab === 'sheds' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0a2618]/90 p-5 rounded-3xl border border-[#d4af37]/30">
            <div>
              <div className="flex items-center gap-2.5">
                <Warehouse className="h-6 w-6 text-[#d4af37]" />
                <h3 className="text-lg font-extrabold text-[#f4efe6]">
                  {strings.shedManagementTitle}
                </h3>
              </div>
              <p className="text-xs text-[#f3df88]/80 mt-1">
                {strings.shedManagementSubtitle}
              </p>
            </div>
          </div>

          {/* Feedback messages */}
          {shedSuccessMessage && (
            <div className="flex items-center gap-2.5 rounded-2xl border border-emerald-500/50 bg-emerald-950/80 p-4 text-emerald-200">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
              <span className="text-xs sm:text-sm font-semibold">{shedSuccessMessage}</span>
            </div>
          )}
          {shedErrorMessage && (
            <div className="flex items-center gap-2.5 rounded-2xl border border-rose-500/50 bg-rose-950/80 p-4 text-rose-200">
              <XCircle className="h-5 w-5 shrink-0 text-rose-400" />
              <span className="text-xs sm:text-sm font-semibold">{shedErrorMessage}</span>
            </div>
          )}

          {/* 5 Virtual Sheds Selector Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {sheds.map((shed) => {
              const isSelected = shed.id === selectedShedId;
              const liveHens = Math.max(shed.totalHens || 0, calculateShedDynamicSum(shed.id, usersList));
              const percent = Math.min(100, Math.round((liveHens / SHED_CAPACITY) * 100));
              return (
                <button
                  key={shed.id}
                  onClick={() => handleSelectShed(shed.id)}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                    isSelected
                      ? 'border-[#d4af37] bg-gradient-to-b from-[#143d28] to-[#0a2618] shadow-lg shadow-[#d4af37]/20 ring-1 ring-[#d4af37]'
                      : 'border-[#d4af37]/20 bg-[#051a10]/70 hover:border-[#d4af37]/50 hover:bg-[#0a2618]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-sm font-black text-[#f3df88]">
                      {shed.id}
                    </span>
                    {shed.hasSicknessAlert ? (
                      <span className="flex h-2.5 w-2.5 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                      </span>
                    ) : (
                      <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
                    )}
                  </div>
                  <div className="text-[11px] text-[#f4efe6]/70 mb-2">
                    {liveHens.toLocaleString()} / {SHED_CAPACITY.toLocaleString()} {isUr ? 'مرغیاں' : 'Hens'}
                  </div>
                  <div className="w-full bg-[#051a10] rounded-full h-1.5 overflow-hidden border border-[#d4af37]/20">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        percent > 85 ? 'bg-amber-400' : 'bg-gradient-to-r from-emerald-500 to-[#d4af37]'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selected Shed Overview Card */}
          <div className="rounded-3xl border border-[#d4af37]/35 bg-[#0a2618]/90 p-5 sm:p-6 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#d4af37]/20 pb-4">
              <div>
                <div className="flex items-center gap-3">
                  <h4 className="text-xl font-black text-[#f3df88] font-mono">
                    {selectedShed.id}
                  </h4>
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                      selectedShed.hasSicknessAlert
                        ? 'border border-rose-500/50 bg-rose-950/70 text-rose-300'
                        : 'border border-emerald-500/50 bg-emerald-950/70 text-emerald-300'
                    }`}
                  >
                    {selectedShed.hasSicknessAlert ? (
                      <>
                        <AlertTriangle className="h-3.5 w-3.5 text-rose-400 animate-pulse" />
                        <span>{strings.urgentSickness}</span>
                      </>
                    ) : (
                      <>
                        <HeartPulse className="h-3.5 w-3.5 text-emerald-400" />
                        <span>{strings.healthyFlock}</span>
                      </>
                    )}
                  </span>
                </div>
                <p className="text-xs text-[#f4efe6]/60 mt-1">
                  {isUr ? selectedShed.nameUr : selectedShed.nameEn} • {isUr ? 'گنجائش: 5,000 مرغیاں' : 'Capacity: 5,000 Hens'}
                </p>
              </div>

              {/* Sickness Action Button */}
              <div>
                {selectedShed.hasSicknessAlert ? (
                  <button
                    onClick={() => handleToggleSickness(false)}
                    disabled={shedActionLoading}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-xs font-bold text-white hover:brightness-110 active:scale-95 transition-all cursor-pointer shadow-md"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{strings.resolveSicknessBtn}</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleToggleSickness(true)}
                    disabled={shedActionLoading}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-700 px-4 py-2.5 text-xs font-bold text-white hover:brightness-110 active:scale-95 transition-all cursor-pointer shadow-md"
                  >
                    <AlertTriangle className="h-4 w-4" />
                    <span>{strings.declareSicknessBtn}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Shed Statistics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-2xl border border-[#d4af37]/20 bg-[#051a10]/70 p-3.5">
                <span className="text-[10px] uppercase font-bold text-[#f3df88]/80 block mb-1">
                  {strings.shedCurrentHens}
                </span>
                <span className="text-xl sm:text-2xl font-black text-[#d4af37]">
                  {selectedShed.totalHens.toLocaleString()}
                </span>
              </div>

              <div className="rounded-2xl border border-[#d4af37]/20 bg-[#051a10]/70 p-3.5">
                <span className="text-[10px] uppercase font-bold text-[#f3df88]/80 block mb-1">
                  {strings.shedAvailableSlots}
                </span>
                <span className="text-xl sm:text-2xl font-black text-emerald-400">
                  {Math.max(0, SHED_CAPACITY - selectedShed.totalHens).toLocaleString()}
                </span>
              </div>

              <div className="rounded-2xl border border-[#d4af37]/20 bg-[#051a10]/70 p-3.5">
                <span className="text-[10px] uppercase font-bold text-rose-300/80 block mb-1">
                  {strings.shedMortalityTotal}
                </span>
                <span className="text-xl sm:text-2xl font-black text-rose-400">
                  {(selectedShed.mortalityCount || 0).toLocaleString()}
                </span>
              </div>

              <div className="rounded-2xl border border-[#d4af37]/20 bg-[#051a10]/70 p-3.5">
                <span className="text-[10px] uppercase font-bold text-amber-300/80 block mb-1">
                  {isUr ? 'ٹوٹے ہوئے انڈے (تعداد)' : 'Cracked Eggs (Count)'}
                </span>
                <span className="text-xl sm:text-2xl font-black text-amber-300">
                  {typeof selectedShed.crackedEggsCount === 'number'
                    ? selectedShed.crackedEggsCount
                    : Math.round(((selectedShed.totalHens || 5000) * (selectedShed.crackedEggRate || 0)) / 100)}{' '}
                  <span className="text-xs font-semibold text-amber-400/80">Eggs</span>
                </span>
              </div>
            </div>

            {/* Action Forms Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pt-2">
              {/* 1. Mortality Input Form */}
              <div className="rounded-2xl border border-rose-500/30 bg-[#051a10]/80 p-5 space-y-3.5">
                <div className="flex items-center gap-2">
                  <HeartPulse className="h-5 w-5 text-rose-400" />
                  <h5 className="text-sm font-bold text-[#f4efe6]">
                    {strings.mortalityInputLabel}
                  </h5>
                </div>
                <p className="text-xs text-[#f4efe6]/60">
                  {strings.mortalityExplanation}
                </p>
                <form onSubmit={handleApplyMortality} className="space-y-3">
                  <div>
                    <input
                      type="number"
                      min="1"
                      max={selectedShed.totalHens || 1}
                      disabled={selectedShed.totalHens <= 0 || shedActionLoading}
                      placeholder={strings.mortalityInputPlaceholder}
                      value={mortalityDeathsInput}
                      onChange={(e) => setMortalityDeathsInput(e.target.value)}
                      className="w-full rounded-xl border border-rose-500/30 bg-[#0a2618] px-3.5 py-2.5 text-sm text-[#f4efe6] focus:border-rose-400 focus:outline-none font-mono"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={selectedShed.totalHens <= 0 || shedActionLoading || !mortalityDeathsInput}
                    className="w-full rounded-xl bg-gradient-to-r from-rose-700 to-rose-600 py-2.5 px-4 text-xs font-bold text-white hover:brightness-110 active:scale-98 transition-all cursor-pointer shadow-md disabled:opacity-50"
                  >
                    {strings.applyMortalityBtn}
                  </button>
                </form>
              </div>

              {/* 2. Cracked Eggs Raw Number Update Form (Requirement 3: Raw Number, e.g. 8) */}
              <div className="rounded-2xl border border-amber-500/30 bg-[#051a10]/80 p-5 space-y-3.5">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-amber-400" />
                  <h5 className="text-sm font-bold text-[#f4efe6]">
                    {isUr ? 'ٹوٹے ہوئے انڈوں کی تعداد (Raw Number)' : 'Number of Cracked Eggs (Raw Number)'}
                  </h5>
                </div>
                <p className="text-xs text-[#f4efe6]/60 leading-relaxed">
                  {isUr
                    ? 'اس شیڈ میں ٹوٹے ہوئے انڈوں کی اصل تعداد درج کریں (مثلاً: 8)۔ کوئی فیصد حساب نہیں ہے۔ مالی نقصان (تعداد × 30 روپے) تمام سرمایہ کاروں کے یومیہ انڈوں کے منافع سے منہا ہو گا۔'
                    : 'Enter the raw number of cracked eggs for this shed (e.g. 8). Total loss (Count × Rs. 30) is divided proportionally among investors in this shed and deducted from daily collection profit.'}
                </p>
                <form onSubmit={handleUpdateCracking} className="space-y-3">
                  <div>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      disabled={shedActionLoading}
                      placeholder="e.g. 8"
                      value={crackedRateInput}
                      onChange={(e) => setCrackedRateInput(e.target.value)}
                      className="w-full rounded-xl border border-amber-500/30 bg-[#0a2618] px-3.5 py-2.5 text-sm text-[#f4efe6] focus:border-amber-400 focus:outline-none font-mono"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={shedActionLoading}
                    className="w-full rounded-xl bg-gradient-to-r from-[#d4af37] to-[#b38f20] py-2.5 px-4 text-xs font-bold text-[#051a10] hover:brightness-110 active:scale-98 transition-all cursor-pointer shadow-md"
                  >
                    {isUr ? 'ٹوٹے ہوئے انڈے محفوظ کریں' : 'Save Cracked Eggs Count'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: LIVE STATS INPUT */}
      {activeTab === 'stats' && (
        <div className="rounded-3xl border border-[#d4af37]/40 bg-[#0a2618]/95 p-6 sm:p-7 shadow-2xl backdrop-blur-md max-w-xl mx-auto space-y-5">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-[#f4efe6]">
              {isUr ? 'گلوبل فارم انڈے پروڈکشن کی تازہ ترین اپ ڈیٹ' : 'Update Global Egg Production Records'}
            </h3>
            <p className="text-xs text-[#f4efe6]/60">
              {isUr
                ? 'ایڈمن کے درج کردہ اعدادوشمار تمام صارفین کے ڈیش بورڈ پر براہِ راست لائیو فارم گلوبل ڈیٹا کے طور پر ظاہر ہوں گے۔'
                : 'Inputs here display live to all users on their dashboard as Nationwide Farm Global Stats.'}
            </p>
          </div>

          {statsSuccess && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/50 bg-emerald-950/70 p-3 text-xs text-emerald-200">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>{isUr ? 'اعدادوشمار کامیابی سے اپ ڈیٹ ہو گئے!' : 'Stats updated globally!'}</span>
            </div>
          )}

          <form onSubmit={handleUpdateStats} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#f3df88] mb-1">
                {strings.statTotalCollected} (Eggs) *
              </label>
              <input
                type="number"
                min="0"
                required
                value={totalCollectedInput}
                onChange={(e) => setTotalCollectedInput(e.target.value)}
                className="w-full rounded-xl border border-[#d4af37]/30 bg-[#051a10] py-2.5 px-3.5 text-sm font-mono text-[#f4efe6] focus:border-[#d4af37] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#f3df88] mb-1">
                {strings.statCracked} (Eggs) *
              </label>
              <input
                type="number"
                min="0"
                required
                value={crackedInput}
                onChange={(e) => setCrackedInput(e.target.value)}
                className="w-full rounded-xl border border-[#d4af37]/30 bg-[#051a10] py-2.5 px-3.5 text-sm font-mono text-[#f4efe6] focus:border-[#d4af37] focus:outline-none"
              />
            </div>

            <div className="rounded-2xl bg-[#051a10] p-4 border border-[#d4af37]/20 flex items-center justify-between">
              <span className="text-xs font-semibold text-[#f4efe6]/80">{strings.statNetFresh}:</span>
              <span className="text-xl font-black text-[#d4af37]">
                {Math.max(0, (parseInt(totalCollectedInput, 10) || 0) - (parseInt(crackedInput, 10) || 0))} Eggs
              </span>
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#d4af37] via-[#f3df88] to-[#d4af37] py-3 text-sm font-black text-[#051a10] hover:brightness-105 active:scale-98 transition-all cursor-pointer shadow-lg shadow-[#d4af37]/20"
            >
              <Sparkles className="h-4 w-4" />
              <span>{strings.updateStatsBtn}</span>
            </button>
          </form>
        </div>
      )}

      {/* Requirement 4: Send Official Message Modal */}
      {messageModalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl border border-[#d4af37]/50 bg-gradient-to-b from-[#0e3320] to-[#071c11] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#d4af37]/20 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#d4af37]/20 text-[#f3df88] border border-[#d4af37]/30">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#f4efe6]">
                    {strings.adminMessageModalTitle}
                  </h3>
                  <p className="text-[11px] text-[#f3df88]/80">
                    {messageModalTarget === 'ALL'
                      ? isUr ? 'تمام رجسٹرڈ فارم ممبران کے لیے' : 'Broadcasting to ALL registered farm members'
                      : `${isUr ? 'برائے صارف:' : 'Target User:'} ${messageModalTarget.fullName} (${messageModalTarget.email})`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setMessageModalTarget(null)}
                className="rounded-xl p-1.5 text-[#f4efe6]/60 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSendCustomMessage} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#f3df88] mb-1">
                  {strings.messageSubjectLabel} *
                </label>
                <input
                  type="text"
                  required
                  placeholder={isUr ? 'مثلاً: فارم کی اہم پیش رفت و انتظامی نوٹس' : 'e.g. Important Farm Operations Notice'}
                  value={customMsgSubject}
                  onChange={(e) => setCustomMsgSubject(e.target.value)}
                  className="w-full rounded-xl border border-[#d4af37]/30 bg-[#051a10] px-3.5 py-2.5 text-sm text-[#f4efe6] focus:border-[#d4af37] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#f3df88] mb-1">
                  {strings.messageBodyLabel} *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder={isUr ? 'سرکاری نوٹس یا پیغام کی تفصیل یہاں درج کریں...' : 'Type official message content here. Will be delivered to user farm inbox with "From: Pak Hen Farm" header.'}
                  value={customMsgBody}
                  onChange={(e) => setCustomMsgBody(e.target.value)}
                  className="w-full rounded-xl border border-[#d4af37]/30 bg-[#051a10] px-3.5 py-2.5 text-sm text-[#f4efe6] focus:border-[#d4af37] focus:outline-none resize-none"
                />
              </div>

              <div className="rounded-xl bg-[#051a10]/80 border border-[#d4af37]/20 p-3 text-xs text-[#f4efe6]/80 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-[#d4af37] shrink-0" />
                <span>
                  {isUr
                    ? 'یہ پیغام صارف کے فارم ان باکس میں سرکاری تصدیقی بیج "From: Pak Hen Farm" کے ساتھ ظاہر ہو گا۔'
                    : 'Recipient inbox displays header: "From: Pak Hen Farm" with official verified badge.'}
                </span>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setMessageModalTarget(null)}
                  className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-bold text-[#f4efe6]/70 hover:bg-white/5 transition-colors cursor-pointer"
                >
                  {isUr ? 'منسوخ کریں' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSendingCustomMsg}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#d4af37] via-[#f3df88] to-[#d4af37] px-5 py-2.5 text-xs font-black text-[#051a10] hover:brightness-105 active:scale-95 transition-all cursor-pointer shadow-lg disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                  <span>{isSendingCustomMsg ? (isUr ? 'ارسال ہو رہا ہے...' : 'Sending...') : strings.sendOfficialNoticeBtn}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Order Modal (No window.prompt) */}
      {rejectOrderTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl border border-rose-500/40 bg-gradient-to-b from-[#1a0a0f] to-[#0d0508] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-rose-500/20 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  <XCircle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-rose-200">
                    {isUr ? 'آرڈر مسترد کریں' : 'Reject Hen Order'}
                  </h3>
                  <p className="text-xs text-rose-300/70 font-mono">
                    ID: {rejectOrderTarget.id.slice(0, 10)}... • {rejectOrderTarget.userName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setRejectOrderTarget(null)}
                className="rounded-xl p-1.5 text-white/60 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-[#f4efe6]/80 leading-relaxed">
              {isUr
                ? 'کیا آپ واقعی اس آرڈر کو مسترد کرنا چاہتے ہیں؟ مسترد کرنے پر صارف کے کھاتے میں مرغیاں شامل نہیں ہوں گی۔'
                : 'Are you sure you want to reject this order? The order status will be marked as Rejected and no hens will be added to the user account.'}
            </p>

            <div>
              <label className="block text-xs font-bold text-rose-300 mb-1">
                {isUr ? 'مسترد کرنے کی وجہ / تفتیشی نوٹ:' : 'Reason for Rejection / Note:'}
              </label>
              <input
                type="text"
                value={actionReasonNote}
                onChange={(e) => setActionReasonNote(e.target.value)}
                placeholder="e.g. Invalid TxID or screenshot unreadable"
                className="w-full rounded-xl border border-rose-500/30 bg-black/50 px-3.5 py-2.5 text-sm text-[#f4efe6] focus:border-rose-400 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setRejectOrderTarget(null)}
                className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-bold text-[#f4efe6]/70 hover:bg-white/5 transition-colors cursor-pointer"
              >
                {isUr ? 'منسوخ' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={isProcessingAction}
                onClick={handleConfirmRejectOrder}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 px-5 py-2.5 text-xs font-black text-white hover:brightness-110 active:scale-95 transition-all cursor-pointer shadow-lg shadow-rose-900/40 disabled:opacity-50"
              >
                <XCircle className="h-4 w-4" />
                <span>{isProcessingAction ? (isUr ? 'عمل جاری ہے...' : 'Rejecting...') : (isUr ? 'تصدیق و مسترد' : 'Confirm Reject')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject & Refund Withdrawal Modal (No window.prompt, atomic balance refund) */}
      {rejectWithdrawalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl border border-amber-500/40 bg-gradient-to-b from-[#1c1204] to-[#0c0802] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-amber-500/20 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  <RotateCcw className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-amber-200">
                    {isUr ? 'رقم کی واپسی و مستردگی' : 'Reject & Refund Withdrawal'}
                  </h3>
                  <p className="text-xs text-amber-300/70 font-mono">
                    Rs. {rejectWithdrawalTarget.amount.toLocaleString()} • {rejectWithdrawalTarget.userName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setRejectWithdrawalTarget(null)}
                className="rounded-xl p-1.5 text-white/60 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-2xl bg-amber-950/40 border border-amber-500/30 p-3.5 text-xs text-amber-100/90 space-y-1">
              <p className="font-bold flex items-center gap-1.5 text-amber-300">
                <AlertCircle className="h-4 w-4" />
                <span>{isUr ? 'خودکار والیٹ ریفنڈ گارنٹی:' : 'Automatic Balance Refund:'}</span>
              </p>
              <p>
                {isUr
                  ? `مسترد کرنے پر Rs. ${rejectWithdrawalTarget.amount.toLocaleString()} فوراً صارف کے والیٹ میں واپس کریڈٹ کر دیے جائیں گے۔`
                  : `Rejecting this request will immediately credit Rs. ${rejectWithdrawalTarget.amount.toLocaleString()} back to ${rejectWithdrawalTarget.userName}'s wallet balance.`}
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-amber-300 mb-1">
                {isUr ? 'مسترد کرنے کی وجہ:' : 'Rejection Reason:'}
              </label>
              <input
                type="text"
                value={actionReasonNote}
                onChange={(e) => setActionReasonNote(e.target.value)}
                placeholder="e.g. Account name mismatch or phone number inactive"
                className="w-full rounded-xl border border-amber-500/30 bg-black/50 px-3.5 py-2.5 text-sm text-[#f4efe6] focus:border-amber-400 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setRejectWithdrawalTarget(null)}
                className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-bold text-[#f4efe6]/70 hover:bg-white/5 transition-colors cursor-pointer"
              >
                {isUr ? 'منسوخ' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={isProcessingAction}
                onClick={handleConfirmRejectWithdrawal}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 px-5 py-2.5 text-xs font-black text-[#0c0802] hover:brightness-110 active:scale-95 transition-all cursor-pointer shadow-lg shadow-amber-900/40 disabled:opacity-50"
              >
                <RotateCcw className="h-4 w-4" />
                <span>{isProcessingAction ? (isUr ? 'عمل جاری ہے...' : 'Refunding...') : (isUr ? 'مسترد اور ریفنڈ کریں' : 'Confirm Reject & Refund')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mark Paid Withdrawal Modal (No window.prompt) */}
      {markPaidTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl border border-emerald-500/40 bg-gradient-to-b from-[#0a1e12] to-[#040e08] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-emerald-200">
                    {isUr ? 'ادائیگی مکمل قرار دیں' : 'Mark Withdrawal as Paid'}
                  </h3>
                  <p className="text-xs text-emerald-300/70 font-mono">
                    Rs. {markPaidTarget.amount.toLocaleString()} • {markPaidTarget.userName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setMarkPaidTarget(null)}
                className="rounded-xl p-1.5 text-white/60 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-[#f4efe6]/80 leading-relaxed">
              {isUr
                ? `صارف کے اکاؤنٹ (${markPaidTarget.easypaisaNumber}) پر رقم روانہ کر دی گئی ہے۔ کیا آپ اسٹیٹس "Paid" کرنا چاہتے ہیں؟`
                : `Confirm that Rs. ${markPaidTarget.amount.toLocaleString()} has been sent to ${markPaidTarget.easypaisaTitle} (${markPaidTarget.easypaisaNumber}).`}
            </p>

            <div>
              <label className="block text-xs font-bold text-emerald-300 mb-1">
                {isUr ? 'ادائیگی کی رسید / بینک ٹرانزیکشن نوٹ:' : 'Payout Transaction Reference / Note:'}
              </label>
              <input
                type="text"
                value={actionReasonNote}
                onChange={(e) => setActionReasonNote(e.target.value)}
                placeholder="e.g. Dispatched via Easypaisa TID 9928381923"
                className="w-full rounded-xl border border-emerald-500/30 bg-black/50 px-3.5 py-2.5 text-sm text-[#f4efe6] focus:border-emerald-400 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setMarkPaidTarget(null)}
                className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-bold text-[#f4efe6]/70 hover:bg-white/5 transition-colors cursor-pointer"
              >
                {isUr ? 'منسوخ' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={isProcessingAction}
                onClick={handleConfirmMarkPaid}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-5 py-2.5 text-xs font-black text-white hover:brightness-110 active:scale-95 transition-all cursor-pointer shadow-lg shadow-emerald-900/40 disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>{isProcessingAction ? (isUr ? 'محفوظ ہو رہا ہے...' : 'Processing...') : (isUr ? 'تصدیق و محفوظ' : 'Confirm Paid')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Slip Zoom Modal */}
      {slipZoomUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200 cursor-pointer"
          onClick={() => setSlipZoomUrl(null)}
        >
          <div
            className="relative max-w-3xl w-full max-h-[90vh] bg-[#0a2618] border border-[#d4af37]/50 rounded-3xl p-4 overflow-hidden flex flex-col items-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between pb-3 border-b border-[#d4af37]/20">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-[#d4af37]" />
                <span className="text-sm font-black text-[#f4efe6]">
                  {isUr ? 'صارف کی بھیجی گئی پیمنٹ سلپ' : 'Payment Slip / Transfer Proof'}
                </span>
              </div>
              <button
                onClick={() => setSlipZoomUrl(null)}
                className="rounded-xl p-1.5 text-[#f4efe6]/70 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>
            <div className="w-full flex items-center justify-center p-2 overflow-auto max-h-[75vh]">
              <img
                src={slipZoomUrl}
                alt="Payment Slip Full View"
                className="max-h-[70vh] w-auto rounded-xl object-contain border border-[#d4af37]/30 shadow-lg"
              />
            </div>
            <div className="w-full text-center pt-2">
              <button
                onClick={() => setSlipZoomUrl(null)}
                className="rounded-xl bg-[#d4af37] px-5 py-2 text-xs font-black text-[#051a10] hover:brightness-105 cursor-pointer shadow-md"
              >
                {isUr ? 'بند کریں' : 'Close Preview'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
