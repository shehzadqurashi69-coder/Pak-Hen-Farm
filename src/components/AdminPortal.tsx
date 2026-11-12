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
  FarmBanner,
  FarmGalleryItem,
  FarmProfileSettings,
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
  subscribeToBanners,
  cloudSaveBanners,
  cloudUpdateBanner,
  subscribeToGallery,
  cloudSaveGallery,
  cloudAddGalleryItem,
  cloudDeleteGalleryItem,
  cloudToggleGalleryItemActive,
  cloudSaveFarmProfile,
  cloudToggleTicketRead,
  cleanFakeUsers,
} from '../services/api';
import { INITIAL_SHEDS, SHED_CAPACITY, MEDICAL_FEE_PKR, calculateShedDynamicSum, DEFAULT_BANNERS, DEFAULT_GALLERY_ITEMS, DEFAULT_FARM_PROFILE } from '../utils/farmRules';
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
  EyeOff,
  CheckCheck,
  Filter,
  RotateCcw,
  Images,
  Film,
  Video,
  Play,
} from 'lucide-react';

interface AdminPortalProps {
  adminUser: UserAccount;
  lang: 'en' | 'ur';
  farmProfile?: FarmProfileSettings;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({ adminUser, lang, farmProfile }) => {
  const strings = t[lang];
  const isUr = lang === 'ur';

  const [activeTab, setActiveTab] = useState<
    'orders' | 'withdrawals' | 'payment_methods' | 'banners' | 'gallery' | 'sos_inbox' | 'medical' | 'sheds' | 'users' | 'stats'
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

  // Ads Banner Management State (Requirement 1: Admin Image Banner Slider / Ads System)
  const [bannersList, setBannersList] = useState<FarmBanner[]>(DEFAULT_BANNERS);
  const [isSavingBanners, setIsSavingBanners] = useState(false);
  const [bannerFeedbackMsg, setBannerFeedbackMsg] = useState<string | null>(null);
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null);

  // Farm Gallery Management State (Requirement 2: Admin Media & Video Management)
  const [galleryList, setGalleryList] = useState<FarmGalleryItem[]>(DEFAULT_GALLERY_ITEMS);
  const [isSavingGallery, setIsSavingGallery] = useState(false);
  const [galleryFeedbackMsg, setGalleryFeedbackMsg] = useState<string | null>(null);
  const [galleryFilterTab, setGalleryFilterTab] = useState<'all' | 'photo' | 'video'>('all');
  const [newGalleryType, setNewGalleryType] = useState<'photo' | 'video'>('photo');
  const [newGalleryTitle, setNewGalleryTitle] = useState('');
  const [newGalleryTitleUr, setNewGalleryTitleUr] = useState('');
  const [newGalleryMediaUrl, setNewGalleryMediaUrl] = useState('');
  const [newGalleryThumbnailUrl, setNewGalleryThumbnailUrl] = useState('');
  const [newGalleryCaption, setNewGalleryCaption] = useState('');
  const [newGalleryCaptionUr, setNewGalleryCaptionUr] = useState('');
  const [newGalleryDuration, setNewGalleryDuration] = useState('');
  const [newGalleryLocation, setNewGalleryLocation] = useState('Islamabad Physical Farm (Shed-101)');
  const [isUploadingGalleryFile, setIsUploadingGalleryFile] = useState(false);

  // Farm Profile & Header State (Requirement 1: Fully Manual Admin Profile - No Forced Sargodha)
  const [profileFarmName, setProfileFarmName] = useState(farmProfile?.farmName || 'Pak Hen Farm');
  const [profileBio, setProfileBio] = useState(farmProfile?.farmBio || 'Real Physical Poultry Farming Across Pakistan • 100% Shariah Mudarabah Partnership');
  const [profileBioUr, setProfileBioUr] = useState(farmProfile?.farmBioUr || 'پاکستان بھر میں حقیقی فارمنگ • 100٪ شرعی مضاربہ شراکت داری');
  const [profileLocation, setProfileLocation] = useState(farmProfile?.location || '');
  const [profileHelpline, setProfileHelpline] = useState(farmProfile?.helpline || '03105625924');
  const [profileAvatar, setProfileAvatar] = useState(farmProfile?.avatar || '/golden-hen.svg');
  const [profileCover, setProfileCover] = useState(farmProfile?.coverUrl || '/banners/banner-1.jpg');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileFeedbackMsg, setProfileFeedbackMsg] = useState<string | null>(null);

  useEffect(() => {
    if (farmProfile) {
      setProfileFarmName(farmProfile.farmName || 'Pak Hen Farm');
      setProfileBio(farmProfile.farmBio || '');
      setProfileBioUr(farmProfile.farmBioUr || '');
      setProfileLocation(farmProfile.location || '');
      setProfileHelpline(farmProfile.helpline || '03105625924');
      setProfileAvatar(farmProfile.avatar || '/golden-hen.svg');
      setProfileCover(farmProfile.coverUrl || '/banners/banner-1.jpg');
    }
  }, [farmProfile]);

  // Custom Admin Greeting for User Checkout Screen (Requirement 2)
  const [customGreeting, setCustomGreeting] = useState('');
  const [customGreetingUr, setCustomGreetingUr] = useState('');
  const [isSavingGreeting, setIsSavingGreeting] = useState(false);
  const [greetingActionMessage, setGreetingActionMessage] = useState<string | null>(null);

  // SOS Helpdesk Tickets State (Admin SOS Inbox)
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [sosFilter, setSosFilter] = useState<'all' | 'unread' | 'read'>('all');
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

    // 10. Live Ads Banners subscription
    const unsubBanners = subscribeToBanners((liveBanners) => {
      if (liveBanners && liveBanners.length > 0) {
        setBannersList(liveBanners);
      }
    });

    // 11. Live Farm Gallery subscription (Photos & Videos)
    const unsubGallery = subscribeToGallery((liveItems) => {
      if (liveItems && liveItems.length > 0) {
        setGalleryList(liveItems);
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
      unsubBanners();
      unsubGallery();
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

  const openTicketsList = tickets.filter((t) => t.status === 'open');
  const unreadTicketsList = tickets.filter((t) => !t.read && t.status === 'open');
  const readTicketsList = tickets.filter((t) => !!t.read || t.status === 'resolved');

  const filteredTickets = tickets.filter((t) => {
    if (sosFilter === 'unread') return !t.read && t.status === 'open';
    if (sosFilter === 'read') return !!t.read || t.status === 'resolved';
    return true;
  });

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

  // Ads Banner Management Handlers (Requirement 1: Admin Panel Ads System)
  const handleUpdateBannerField = (bannerId: string, field: keyof FarmBanner, value: any) => {
    setBannersList((prev) =>
      prev.map((b) => (b.id === bannerId ? { ...b, [field]: value } : b))
    );
  };

  const handleBannerFileUpload = (bannerId: string, file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (dataUrl) {
        handleUpdateBannerField(bannerId, 'imageUrl', dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveBanner = async (banner: FarmBanner) => {
    try {
      setIsSavingBanners(true);
      await cloudUpdateBanner(banner);
      setBannerFeedbackMsg(isUr ? 'بینر کامیابی سے اپ ڈیٹ ہو گیا!' : `Banner #${banner.order} saved successfully!`);
      setTimeout(() => setBannerFeedbackMsg(null), 3500);
    } catch (err: any) {
      alert(err.message || 'Error updating banner');
    } finally {
      setIsSavingBanners(false);
    }
  };

  const handleSaveAllBanners = async () => {
    try {
      setIsSavingBanners(true);
      await cloudSaveBanners(bannersList);
      setBannerFeedbackMsg(isUr ? 'تمام بینرز کامیابی سے محفوظ ہو گئے!' : 'All 4 banners saved and synced live!');
      setTimeout(() => setBannerFeedbackMsg(null), 3500);
    } catch (err: any) {
      alert(err.message || 'Error saving banners');
    } finally {
      setIsSavingBanners(false);
    }
  };

  const handleResetBanners = async () => {
    try {
      setIsSavingBanners(true);
      await cloudSaveBanners(DEFAULT_BANNERS);
      setBannersList(DEFAULT_BANNERS);
      setBannerFeedbackMsg(isUr ? 'بینرز اصل حالت پر بحال کر دیے گئے۔' : 'Banners reset to default high-definition images.');
      setTimeout(() => setBannerFeedbackMsg(null), 3500);
    } catch (err: any) {
      setBannerFeedbackMsg(err.message || 'Error resetting banners');
    } finally {
      setIsSavingBanners(false);
    }
  };

  // 1. Increase Video Upload Size Limit (Remove 1MB restriction, allow up to 50MB)
  const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB limit for smooth uploads

  // Farm Gallery Management Handlers (Admin Media & Video Management)
  const handleGalleryFileUpload = (file: File) => {
    if (!file) return;
    if (file.size > MAX_VIDEO_SIZE) {
      setGalleryFeedbackMsg(
        isUr
          ? 'ویڈیو کا سائز بہت بڑا ہے۔ براہ کرم 50MB سے کم کی ویڈیو اپ لوڈ کریں۔'
          : 'Video size is too large. Please upload a video under 50MB.'
      );
      return;
    }
    setIsUploadingGalleryFile(true);
    setGalleryFeedbackMsg(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        setNewGalleryMediaUrl(result);
        if (newGalleryType === 'photo') {
          setNewGalleryThumbnailUrl(result);
        }
      }
      setIsUploadingGalleryFile(false);
    };
    reader.onerror = () => {
      setIsUploadingGalleryFile(false);
      setGalleryFeedbackMsg('Failed to read file from device.');
    };
    reader.readAsDataURL(file);
  };

  const handleAddGalleryMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGalleryTitle.trim()) {
      setGalleryFeedbackMsg(isUr ? 'براہ کرم میڈیا کا عنوان درج کریں' : 'Please enter a title for this media.');
      return;
    }
    if (!newGalleryMediaUrl.trim()) {
      setGalleryFeedbackMsg(isUr ? 'براہ کرم تصویر/ویڈیو فائل منتخب کریں یا URL درج کریں' : 'Please provide a media URL or upload a file.');
      return;
    }

    try {
      setIsSavingGallery(true);
      const newItem: FarmGalleryItem = {
        id: `media_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        type: newGalleryType,
        title: newGalleryTitle.trim(),
        titleUr: newGalleryTitleUr.trim() || undefined,
        mediaUrl: newGalleryMediaUrl.trim(),
        thumbnailUrl: newGalleryThumbnailUrl.trim() || (newGalleryType === 'photo' ? newGalleryMediaUrl.trim() : undefined),
        caption: newGalleryCaption.trim() || undefined,
        captionUr: newGalleryCaptionUr.trim() || undefined,
        duration: newGalleryType === 'video' ? (newGalleryDuration.trim() || '01:30') : undefined,
        location: newGalleryLocation.trim() || 'Pak Hen Farm (Official)',
        uploadedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        active: true,
        isActive: true,
        order: galleryList.length + 1,
        likesCount: 0,
      };

      await cloudAddGalleryItem(newItem);
      setGalleryFeedbackMsg(isUr ? 'میڈیا کامیابی سے فارم گیلری میں شامل کر دیا گیا!' : 'New media added to Farm Gallery successfully!');
      // Reset form
      setNewGalleryTitle('');
      setNewGalleryTitleUr('');
      setNewGalleryMediaUrl('');
      setNewGalleryThumbnailUrl('');
      setNewGalleryCaption('');
      setNewGalleryCaptionUr('');
      setNewGalleryDuration('');
      setTimeout(() => setGalleryFeedbackMsg(null), 3500);
    } catch (err: any) {
      setGalleryFeedbackMsg(err.message || 'Error adding media to gallery');
    } finally {
      setIsSavingGallery(false);
    }
  };

  const handleDeleteGalleryMedia = async (id: string) => {
    try {
      setIsSavingGallery(true);
      await cloudDeleteGalleryItem(id);
      setGalleryList((prev) => prev.filter((item) => item.id !== id));
      setGalleryFeedbackMsg(isUr ? 'میڈیا آئٹم گیلری سے حذف کر دیا گیا۔' : 'Media item deleted successfully from gallery.');
      setTimeout(() => setGalleryFeedbackMsg(null), 3500);
    } catch (err: any) {
      setGalleryFeedbackMsg(err.message || 'Error deleting media');
    } finally {
      setIsSavingGallery(false);
    }
  };

  const handleToggleGalleryMediaActive = async (id: string, active: boolean) => {
    try {
      await cloudToggleGalleryItemActive(id, active);
      setGalleryList((prev) =>
        prev.map((item) => (item.id === id ? { ...item, active, isActive: active } : item))
      );
    } catch (err: any) {
      setGalleryFeedbackMsg(err.message || 'Error updating media visibility');
    }
  };

  // Farm Profile Actions (Requirement 1: Fully Manual Admin Profile & Header - No forced Sargodha)
  const handleSaveFarmProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileFeedbackMsg(null);
    try {
      const updatedProfile: FarmProfileSettings = {
        farmName: profileFarmName.trim() || 'Pak Hen Farm',
        farmBio: profileBio.trim(),
        farmBioUr: profileBioUr.trim(),
        location: profileLocation.trim(), // Blank if empty: strictly NO FORCED SARGODHA!
        helpline: profileHelpline.trim() || '03105625924',
        avatar: profileAvatar.trim() || '/golden-hen.svg',
        coverUrl: profileCover.trim() || '/banners/banner-1.jpg',
        updatedAt: new Date().toISOString(),
      };
      await cloudSaveFarmProfile(updatedProfile);
      setProfileFeedbackMsg(isUr ? 'فارم پروفائل اور ہیڈر کامیابی سے محفوظ ہو گیا!' : 'Official farm profile & header saved successfully!');
      setTimeout(() => setProfileFeedbackMsg(null), 4000);
    } catch (err: any) {
      console.error('Failed to save farm profile', err);
      setProfileFeedbackMsg(err.message || 'Error saving farm profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleResetProfileToDefaults = async () => {
    try {
      setIsSavingProfile(true);
      await cloudSaveFarmProfile(DEFAULT_FARM_PROFILE);
      setProfileFarmName(DEFAULT_FARM_PROFILE.farmName);
      setProfileBio(DEFAULT_FARM_PROFILE.farmBio);
      setProfileBioUr(DEFAULT_FARM_PROFILE.farmBioUr || '');
      setProfileLocation(DEFAULT_FARM_PROFILE.location);
      setProfileHelpline(DEFAULT_FARM_PROFILE.helpline);
      setProfileAvatar(DEFAULT_FARM_PROFILE.avatar);
      setProfileCover(DEFAULT_FARM_PROFILE.coverUrl || '');
      setProfileFeedbackMsg(isUr ? 'فارم پروفائل اصل حالت پر بحال ہو گئی!' : 'Farm profile reset to clean defaults (location blank).');
      setTimeout(() => setProfileFeedbackMsg(null), 3500);
    } catch (err: any) {
      setProfileFeedbackMsg(err.message || 'Error resetting farm profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleAvatarFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setProfileAvatar(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCoverFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setProfileCover(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleResetGalleryToDefaults = async () => {
    try {
      setIsSavingGallery(true);
      await cloudSaveGallery(DEFAULT_GALLERY_ITEMS);
      setGalleryList(DEFAULT_GALLERY_ITEMS);
      setGalleryFeedbackMsg(isUr ? 'تمام ویڈیوز اور تصاویر اصل حالت پر بحال کر دی گئیں۔' : 'Gallery reset to factory 5 authentic videos and HD photos.');
      setTimeout(() => setGalleryFeedbackMsg(null), 3500);
    } catch (err: any) {
      setGalleryFeedbackMsg(err.message || 'Error resetting gallery');
    } finally {
      setIsSavingGallery(false);
    }
  };

  // 2. SOS Notification Read/Unread Toggle Logic (Requirement 2)
  const markSOSAsRead = async (notificationId: string, readState: boolean = true) => {
    setTickets((prev) =>
      prev.map((item) => (item.id === notificationId ? { ...item, read: readState } : item))
    );

    try {
      let sosList: any[] = JSON.parse(localStorage.getItem('adminSOSInbox') || '[]');
      const idx = sosList.findIndex((item) => item.id === notificationId);
      if (idx >= 0) {
        sosList[idx].read = readState;
      } else {
        sosList.push({ id: notificationId, read: readState });
      }
      localStorage.setItem('adminSOSInbox', JSON.stringify(sosList));
    } catch (e) {}

    try {
      await cloudToggleTicketRead(notificationId, readState);
    } catch (e) {
      console.warn('Error syncing SOS read status to cloud:', e);
    }
  };

  const markAllSOSAsRead = async () => {
    const updated = tickets.map((t) => ({ ...t, read: true }));
    setTickets(updated);
    try {
      localStorage.setItem(
        'adminSOSInbox',
        JSON.stringify(updated.map((t) => ({ id: t.id, read: true })))
      );
    } catch (e) {}

    const unreadOnes = tickets.filter((t) => !t.read);
    for (const t of unreadOnes) {
      cloudToggleTicketRead(t.id, true).catch(() => {});
    }
  };

  // 3. Remove Fake Demo Users & Keep Only Real Registered Users (Requirement 3)
  const handleCleanFakeUsers = () => {
    cleanFakeUsers();
    setUsersList((prev) =>
      prev.filter(
        (user) =>
          user.email &&
          !user.email.toLowerCase().includes('ai-studio-dummy') &&
          !user.email.toLowerCase().includes('dummy') &&
          !user.email.toLowerCase().includes('testmember99@')
      )
    );
    setUserActionMessage(
      isUr
        ? 'جعلی اور ڈمی صارفین کامیابی سے صاف کر دیے گئے۔ صرف حقیقی رجسٹرڈ سرمایہ کار باقی ہیں۔'
        : 'Fake and dummy studio users cleaned successfully. Only verified real registered accounts preserved.'
    );
    setTimeout(() => setUserActionMessage(null), 4000);
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
  const pendingMedicalList = medicalPayments.filter((m) => m.status === 'pending');

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
      {/* Admin Tabs (9 Dedicated Control Tabs) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2 rounded-2xl bg-[#0a2618] p-1.5 border border-[#d4af37]/30">
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

        {/* Ads Banner Management Tab (Requirement 1: Admin Panel Ads System) */}
        <button
          onClick={() => setActiveTab('banners')}
          className={`relative rounded-xl py-2 text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'banners'
              ? 'bg-[#d4af37] text-[#051a10] shadow-md shadow-[#d4af37]/25'
              : 'text-[#f4efe6]/70 hover:text-[#f4efe6]'
          }`}
        >
          <span className="flex items-center justify-center gap-1">
            <ImageIcon className="h-3.5 w-3.5" />
            <span>{isUr ? 'اشتہارات' : 'Banners'}</span>
            <span className="rounded-full bg-[#051a10]/60 px-1 text-[10px]">
              {bannersList.length}
            </span>
          </span>
        </button>

        {/* Farm Gallery Management Tab (Requirement 2: Farm Photos & Videos Management) */}
        <button
          onClick={() => setActiveTab('gallery')}
          className={`relative rounded-xl py-2 text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'gallery'
              ? 'bg-[#d4af37] text-[#051a10] shadow-md shadow-[#d4af37]/25'
              : 'text-[#f4efe6]/70 hover:text-[#f4efe6]'
          }`}
        >
          <span className="flex items-center justify-center gap-1">
            <Images className="h-3.5 w-3.5" />
            <span>{isUr ? 'فارم گیلری' : 'Gallery'}</span>
            <span className="rounded-full bg-[#051a10]/60 px-1 text-[10px]">
              {galleryList.length}
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
            {unreadTicketsList.length > 0 ? (
              <span className="inline-flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white animate-pulse">
                {unreadTicketsList.length}
              </span>
            ) : openTicketsList.length > 0 ? (
              <span className="inline-flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-[#051a10]/60 text-[10px] font-bold text-[#f3df88]">
                {openTicketsList.length}
              </span>
            ) : null}
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

            {/* Search filter input, Clean Dummy Users & Broadcast button */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <button
                type="button"
                onClick={handleCleanFakeUsers}
                className="admin-btn text-xs font-bold whitespace-nowrap"
                title="Remove dummy and fake studio accounts and keep only real registered users"
              >
                <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                <span>{isUr ? 'ڈمی اکاؤنٹس صاف کریں' : 'Clean Dummy Users'}</span>
              </button>

              <button
                type="button"
                onClick={() => setMessageModalTarget('ALL')}
                className="admin-btn-primary text-xs font-bold whitespace-nowrap"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{strings.adminBroadcastBtn}</span>
              </button>

              <div className="relative min-w-[180px] flex-1">
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
                            type="button"
                            onClick={() => setMessageModalTarget(u)}
                            className="admin-btn text-xs"
                          >
                            <Send className="h-3 w-3 text-[#d4af37]" />
                            <span>{strings.adminSendMessageBtn}</span>
                          </button>

                          {/* REVERSIBLE TOGGLE 1: SUSPEND <-> UNSUSPEND */}
                          {isSuspended ? (
                            <button
                              type="button"
                              onClick={() => handleSetUserStatus(u, 'active')}
                              disabled={isUpdating}
                              className="admin-btn-primary text-xs disabled:opacity-50"
                            >
                              <UserCheck className="h-3.5 w-3.5" />
                              <span>{isUpdating ? '...' : strings.actionUnsuspend}</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSetUserStatus(u, 'suspended')}
                              disabled={isUpdating}
                              className="admin-btn text-xs text-amber-300 border-amber-500/50 hover:bg-amber-950/40 disabled:opacity-50"
                            >
                              <UserX className="h-3.5 w-3.5" />
                              <span>{isUpdating ? '...' : strings.actionSuspend}</span>
                            </button>
                          )}

                          {/* REVERSIBLE TOGGLE 2: BAN <-> UNBAN */}
                          {isBanned ? (
                            <button
                              type="button"
                              onClick={() => handleSetUserStatus(u, 'active')}
                              disabled={isUpdating}
                              className="admin-btn-primary text-xs disabled:opacity-50"
                            >
                              <UserCheck className="h-3.5 w-3.5" />
                              <span>{isUpdating ? '...' : strings.actionUnban}</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSetUserStatus(u, 'banned')}
                              disabled={isUpdating}
                              className="admin-btn-danger text-xs disabled:opacity-50"
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
                          type="button"
                          onClick={() => handleOpenRejectOrder(ord)}
                          disabled={!!approvingOrderIds[ord.id]}
                          className="admin-btn-danger text-xs disabled:opacity-50"
                        >
                          <XCircle className="h-4 w-4" />
                          <span>{strings.rejectBtn}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleApproveOrder(ord.id)}
                          disabled={!!approvingOrderIds[ord.id]}
                          className="admin-btn-primary text-xs disabled:opacity-50"
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
                        type="button"
                        onClick={() => handleOpenRejectWithdrawal(w)}
                        className="admin-btn-danger text-xs"
                      >
                        <XCircle className="h-4 w-4" />
                        <span>{isUr ? 'مسترد اور رقم والٹ میں واپس' : 'Reject & Refund'}</span>
                      </button>

                      {/* ACTIVATED MARK PAID BUTTON (NO window.prompt) */}
                      <button
                        type="button"
                        onClick={() => handleOpenMarkPaid(w)}
                        className="admin-btn-primary text-xs"
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

      {/* TAB: ADS & BANNER SLIDER SYSTEM (Requirement 1: Admin Image Banner Slider) */}
      {activeTab === 'banners' && (
        <div className="space-y-6">
          {/* Header & Status Card */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-[#0a2618] via-[#051a10] to-[#0a2618] p-5 rounded-3xl border border-[#d4af37]/40 shadow-xl">
            <div>
              <div className="flex items-center gap-2">
                <ImageIcon className="h-6 w-6 text-[#d4af37]" />
                <h3 className="text-lg font-extrabold text-[#f4efe6]">
                  {isUr ? 'اشتہارات و بینر سلائیڈر کنٹرول (Ads System)' : 'Ads & Banner Slider Management'}
                </h3>
              </div>
              <p className="text-xs text-[#f4efe6]/70 mt-1 max-w-2xl">
                {isUr
                  ? 'صارفین کی ہوم اسکرین کے ٹاپ پر چلنے والے 4 بینرز کا کنٹرول۔ آپ کسی بھی وقت نئی تصویر اپ لوڈ کر سکتے ہیں، عنوانات تبدیل کر سکتے ہیں یا ڈیفالٹ پر لا سکتے ہیں۔'
                  : 'Manage the 4 top image banner slides displayed in the auto-scrolling carousel on the user home screen. Upload custom images or update URLs.'}
              </p>
              <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-950/40 px-3 py-1 text-[11px] text-emerald-300 font-semibold">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span>{isUr ? '100% تصدیق شدہ فزیکل فارم نوٹیفکیشن مستقل فعال ہے' : '100% Verified Physical Farm notification is pinned above'}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleResetBanners}
                disabled={isSavingBanners}
                className="flex items-center gap-1.5 rounded-xl border border-stone-600 bg-stone-900/60 px-3.5 py-2 text-xs font-bold text-stone-300 hover:bg-stone-800 hover:text-white transition-all cursor-pointer disabled:opacity-50"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>{isUr ? 'ڈیفالٹ پر بحال کریں' : 'Reset Defaults'}</span>
              </button>

              <button
                type="button"
                onClick={handleSaveAllBanners}
                disabled={isSavingBanners}
                className="flex items-center gap-2 rounded-xl border border-[#d4af37] bg-gradient-to-r from-[#d4af37] to-[#b38f2a] px-4 py-2 text-xs font-black text-[#051a10] shadow-lg shadow-[#d4af37]/20 hover:brightness-110 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSavingBanners ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                <span>{isUr ? 'تمام بینرز محفوظ کریں' : 'Save All Banners'}</span>
              </button>
            </div>
          </div>

          {/* Feedback Message */}
          {bannerFeedbackMsg && (
            <div className="rounded-2xl border border-emerald-500/50 bg-emerald-950/50 p-4 text-xs font-bold text-emerald-200 flex items-center gap-2 shadow-lg animate-in fade-in">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>{bannerFeedbackMsg}</span>
            </div>
          )}

          {/* 4 Banner Slots Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {bannersList.map((banner, index) => (
              <div
                key={banner.id}
                className={`flex flex-col justify-between rounded-3xl border p-4 sm:p-5 transition-all shadow-xl ${
                  banner.active
                    ? 'border-[#d4af37]/40 bg-[#0a2618]/90'
                    : 'border-white/10 bg-[#071910]/60 opacity-70'
                }`}
              >
                <div className="space-y-4">
                  {/* Slot Header */}
                  <div className="flex items-center justify-between border-b border-[#d4af37]/20 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#d4af37] text-[#051a10] font-black text-xs">
                        #{banner.order || index + 1}
                      </span>
                      <h4 className="text-sm font-extrabold text-[#f3df88]">
                        {isUr ? `بینر سلاٹ #${banner.order || index + 1}` : `Banner Slide #${banner.order || index + 1}`}
                      </h4>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="text-[11px] text-[#f4efe6]/70 cursor-pointer flex items-center gap-1.5">
                        <span>{banner.active ? (isUr ? 'فعال' : 'Active') : (isUr ? 'غیر فعال' : 'Inactive')}</span>
                        <input
                          type="checkbox"
                          checked={banner.active}
                          onChange={(e) => handleUpdateBannerField(banner.id, 'active', e.target.checked)}
                          className="h-4 w-4 rounded accent-[#d4af37] cursor-pointer"
                        />
                      </label>
                    </div>
                  </div>

                  {/* 16:9 Banner Image Preview */}
                  <div className="relative aspect-video w-full overflow-hidden rounded-2xl border-2 border-[#d4af37]/30 bg-black/60 shadow-inner group">
                    <img
                      src={banner.imageUrl}
                      alt={banner.title}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent flex flex-col justify-end p-3">
                      <span className="text-xs font-bold text-[#f3df88] drop-shadow line-clamp-1">
                        {banner.title}
                      </span>
                      <span className="text-[10px] text-white/80 line-clamp-1">
                        {banner.subtitle}
                      </span>
                    </div>
                  </div>

                  {/* Upload Image / Custom URL Controls */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold text-[#d4af37] mb-1">
                        {isUr ? 'نئی تصویر اپ لوڈ کریں (Upload File)' : 'Upload New Image File'}
                      </label>
                      <label className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-[#d4af37]/50 bg-[#051a10]/60 p-3 hover:border-[#d4af37] hover:bg-[#051a10] transition-colors cursor-pointer text-xs text-[#f3df88] font-bold">
                        <Upload className="h-4 w-4 text-[#d4af37]" />
                        <span>{isUr ? 'کمپیوٹر / موبائل سے تصویر منتخب کریں' : 'Choose Image from Device'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleBannerFileUpload(banner.id, file);
                          }}
                        />
                      </label>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[#d4af37] mb-1">
                        {isUr ? 'یا تصویر کا URL درج کریں' : 'Or Image URL'}
                      </label>
                      <input
                        type="text"
                        value={banner.imageUrl}
                        onChange={(e) => handleUpdateBannerField(banner.id, 'imageUrl', e.target.value)}
                        placeholder="https://... or /banners/banner-1.jpg"
                        className="w-full rounded-xl border border-[#d4af37]/30 bg-[#051a10] px-3 py-2 text-xs text-[#f4efe6] focus:border-[#d4af37] focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-[#f4efe6]/80 mb-1">
                          {isUr ? 'سلائیڈ کا عنوان' : 'Slide Title'}
                        </label>
                        <input
                          type="text"
                          value={banner.title}
                          onChange={(e) => handleUpdateBannerField(banner.id, 'title', e.target.value)}
                          placeholder="Slide Title"
                          className="w-full rounded-xl border border-[#d4af37]/30 bg-[#051a10] px-3 py-2 text-xs text-[#f4efe6] focus:border-[#d4af37] focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-[#f4efe6]/80 mb-1">
                          {isUr ? 'ذیلی عنوان' : 'Subtitle'}
                        </label>
                        <input
                          type="text"
                          value={banner.subtitle}
                          onChange={(e) => handleUpdateBannerField(banner.id, 'subtitle', e.target.value)}
                          placeholder="Subtitle / details"
                          className="w-full rounded-xl border border-[#d4af37]/30 bg-[#051a10] px-3 py-2 text-xs text-[#f4efe6] focus:border-[#d4af37] focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Slot Footer Action */}
                <div className="mt-4 pt-3 border-t border-[#d4af37]/20 flex items-center justify-between">
                  <span className="text-[10px] text-[#f4efe6]/50">
                    {isUr ? 'فوری لائیو سنک' : 'Instant Cloud Sync'}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleSaveBanner(banner)}
                    disabled={isSavingBanners}
                    className="flex items-center gap-1.5 rounded-xl border border-[#d4af37]/50 bg-[#051a10] px-3 py-1.5 text-xs font-bold text-[#f3df88] hover:bg-[#d4af37] hover:text-[#051a10] transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Check className="h-3 w-3" />
                    <span>{isUr ? 'اس سلاٹ کو محفوظ کریں' : `Save Slot #${banner.order || index + 1}`}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB: FARM GALLERY MANAGEMENT (Requirement 2: Farm Photos & Videos Management) */}
      {activeTab === 'gallery' && (
        <div className="space-y-6">
          {/* REQUIREMENT 1: FULLY MANUAL ADMIN FARM PROFILE & HEADER (No forced Sargodha) */}
          <div className="rounded-3xl border-2 border-[#d4af37]/60 bg-gradient-to-b from-[#0e3522] via-[#092618] to-[#051a10] p-5 sm:p-6 shadow-2xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#d4af37]/30 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#d4af37] to-[#aa8010] text-[#051a10] shadow-md shadow-[#d4af37]/30">
                    <Feather className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-black text-[#f3df88]">
                    {isUr ? 'سرکاری فارم پروفائل اور ہیڈر سیٹنگز' : 'Official Farm Profile & Header Settings'}
                  </h3>
                </div>
                <p className="text-xs text-[#f4efe6]/70 mt-1">
                  {isUr
                    ? 'فارم کا نام، بائیو، ہیلپ لائن (03105625924)، لوگو اور کور کا انتظام کریں۔ لوکیشن خالی رکھی جا سکتی ہے (کوئی جبری سرگودھا نہیں)۔'
                    : 'Configure the public farm name, bio, official helpline (03105625924), avatar/logo, and cover banner. Location is completely optional: leave blank if not needed (no forced Sargodha).'}
                </p>
              </div>

              <button
                type="button"
                onClick={handleResetProfileToDefaults}
                disabled={isSavingProfile}
                className="flex items-center gap-1.5 rounded-xl border border-[#d4af37]/40 bg-[#051a10] px-3.5 py-2 text-xs font-bold text-[#d4af37] hover:bg-[#d4af37]/10 transition-colors cursor-pointer self-start sm:self-auto"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>{isUr ? 'اصل پروفائل پر بحال کریں' : 'Reset Profile Defaults'}</span>
              </button>
            </div>

            {profileFeedbackMsg && (
              <div className="flex items-center gap-2 rounded-2xl border border-[#d4af37]/50 bg-[#0a2618] p-3.5 text-xs sm:text-sm font-semibold text-[#f3df88] shadow-lg animate-in fade-in">
                <CheckCircle2 className="h-4 w-4 text-[#d4af37] shrink-0" />
                <span>{profileFeedbackMsg}</span>
              </div>
            )}

            {/* LIVE MINI PREVIEW OF PROFILE HEADER */}
            <div className="rounded-2xl border border-[#d4af37]/30 bg-[#051a10]/80 p-3 sm:p-4 overflow-hidden">
              <span className="text-[10px] uppercase font-black tracking-widest text-[#d4af37]/70 block mb-2">
                {isUr ? 'لائیو پریویو (سوشل ہیڈر)' : 'Live Public Header Preview'}
              </span>
              <div className="relative rounded-xl overflow-hidden border border-[#d4af37]/20 bg-[#0a2618]">
                {/* Cover Banner */}
                <div className="h-24 sm:h-28 w-full bg-[#051a10] relative overflow-hidden">
                  <img
                    src={profileCover || '/banners/banner-1.jpg'}
                    alt="Farm Cover"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = '/banners/banner-1.jpg';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#051a10] via-black/30 to-transparent" />
                </div>

                {/* Avatar & Info */}
                <div className="p-3 sm:p-4 -mt-10 flex flex-col sm:flex-row sm:items-end justify-between gap-3 relative z-10">
                  <div className="flex items-end gap-3">
                    <img
                      src={profileAvatar || '/golden-hen.svg'}
                      alt="Avatar"
                      className="h-16 w-16 sm:h-18 sm:w-18 rounded-2xl border-2 border-[#d4af37] bg-[#051a10] object-cover shadow-xl p-1"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = '/golden-hen.svg';
                      }}
                    />
                    <div className="pb-1">
                      <h4 className="text-base sm:text-lg font-black text-[#f3df88] flex items-center gap-1.5">
                        <span>{profileFarmName || 'Pak Hen Farm'}</span>
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                      </h4>
                      <p className="text-[11px] text-[#f4efe6]/80 max-w-md line-clamp-1">
                        {isUr && profileBioUr ? profileBioUr : profileBio || 'Real Physical Poultry Farming Across Pakistan'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-[#f4efe6]/80 pb-1">
                    {profileLocation.trim() && (
                      <span className="flex items-center gap-1 rounded-lg bg-[#0a2618] border border-[#d4af37]/30 px-2.5 py-1 text-[#f3df88]">
                        📍 {profileLocation.trim()}
                      </span>
                    )}
                    <span className="flex items-center gap-1 rounded-lg bg-[#0a2618] border border-[#d4af37]/30 px-2.5 py-1 text-emerald-400">
                      📞 {profileHelpline || '03105625924'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* FORM CONTROLS */}
            <form onSubmit={handleSaveFarmProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {/* Farm Name */}
                <div>
                  <label className="block text-xs font-bold text-[#f3df88] mb-1">
                    {isUr ? 'فارم کا نام (Farm Name) *' : 'Farm Display Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={profileFarmName}
                    onChange={(e) => setProfileFarmName(e.target.value)}
                    placeholder="Pak Hen Farm"
                    className="w-full rounded-xl border border-[#d4af37]/30 bg-[#051a10] px-3.5 py-2.5 text-xs text-[#f4efe6] focus:border-[#d4af37] focus:outline-none"
                  />
                </div>

                {/* Helpline */}
                <div>
                  <label className="block text-xs font-bold text-[#f3df88] mb-1">
                    {isUr ? 'سرکاری ہیلپ لائن (Helpline) *' : 'Official Helpline (WhatsApp/Call) *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={profileHelpline}
                    onChange={(e) => setProfileHelpline(e.target.value)}
                    placeholder="03105625924"
                    className="w-full rounded-xl border border-[#d4af37]/30 bg-[#051a10] px-3.5 py-2.5 text-xs text-[#f4efe6] font-mono focus:border-[#d4af37] focus:outline-none"
                  />
                </div>

                {/* Location (Completely Optional - No Forced Sargodha) */}
                <div>
                  <label className="block text-xs font-bold text-[#f3df88] mb-1">
                    {isUr ? 'لوکیشن (اختیاری - خالی رہنے دیں اگر شہر نہیں دکھانا)' : 'Location (Optional - Leave blank if none)'}
                  </label>
                  <input
                    type="text"
                    value={profileLocation}
                    onChange={(e) => setProfileLocation(e.target.value)}
                    placeholder="Leave blank or e.g. Islamabad / Nationwide"
                    className="w-full rounded-xl border border-[#d4af37]/30 bg-[#051a10] px-3.5 py-2.5 text-xs text-[#f4efe6] focus:border-[#d4af37] focus:outline-none"
                  />
                  <p className="text-[10px] text-[#f4efe6]/50 mt-1">
                    {isUr ? 'اگر خالی چھوڑا جائے تو ہیڈر میں کوئی شہر ظاہر نہیں ہوگا (کوئی جبری سرگودھا نہیں)۔' : 'No forced Sargodha! If left blank, location is cleanly hidden.'}
                  </p>
                </div>
              </div>

              {/* Bio English & Urdu */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#f3df88] mb-1">
                    {isUr ? 'بائیو انگریزی میں (Bio in English)' : 'Bio / Motto (English)'}
                  </label>
                  <textarea
                    rows={2}
                    value={profileBio}
                    onChange={(e) => setProfileBio(e.target.value)}
                    placeholder="Real Physical Poultry Farming Across Pakistan • 100% Shariah Mudarabah Partnership"
                    className="w-full rounded-xl border border-[#d4af37]/30 bg-[#051a10] px-3.5 py-2 text-xs text-[#f4efe6] focus:border-[#d4af37] focus:outline-none resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#f3df88] mb-1">
                    {isUr ? 'بائیو اردو میں (Bio in Urdu - اختیاری)' : 'Bio / Motto (Urdu - Optional)'}
                  </label>
                  <textarea
                    rows={2}
                    value={profileBioUr}
                    onChange={(e) => setProfileBioUr(e.target.value)}
                    placeholder="پاکستان بھر میں حقیقی فارمنگ • 100٪ شرعی مضاربہ شراکت داری"
                    className="w-full rounded-xl border border-[#d4af37]/30 bg-[#051a10] px-3.5 py-2 text-xs text-[#f4efe6] focus:border-[#d4af37] focus:outline-none resize-none text-right"
                    dir="rtl"
                  />
                </div>
              </div>

              {/* Avatar & Cover Photos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Avatar / Logo */}
                <div className="rounded-2xl border border-[#d4af37]/25 bg-[#051a10] p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#f3df88]">
                      {isUr ? 'پروفائل اوتار / فارم لوگو' : 'Farm Avatar / Logo'}
                    </label>
                    <label className="flex items-center gap-1 text-[11px] font-bold text-[#d4af37] hover:underline cursor-pointer">
                      <Upload className="h-3 w-3" />
                      <span>{isUr ? 'فائل منتخب کریں' : 'Upload File'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarFileUpload}
                      />
                    </label>
                  </div>
                  <input
                    type="text"
                    value={profileAvatar}
                    onChange={(e) => setProfileAvatar(e.target.value)}
                    placeholder="/golden-hen.svg or image URL"
                    className="w-full rounded-xl border border-[#d4af37]/30 bg-[#0a2618] px-3 py-2 text-xs text-[#f4efe6] focus:border-[#d4af37] focus:outline-none"
                  />
                </div>

                {/* Cover Banner */}
                <div className="rounded-2xl border border-[#d4af37]/25 bg-[#051a10] p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#f3df88]">
                      {isUr ? 'کور فوٹو بینر (Cover Banner)' : 'Cover Banner Photo'}
                    </label>
                    <label className="flex items-center gap-1 text-[11px] font-bold text-[#d4af37] hover:underline cursor-pointer">
                      <Upload className="h-3 w-3" />
                      <span>{isUr ? 'فائل منتخب کریں' : 'Upload File'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleCoverFileUpload}
                      />
                    </label>
                  </div>
                  <input
                    type="text"
                    value={profileCover}
                    onChange={(e) => setProfileCover(e.target.value)}
                    placeholder="/banners/banner-1.jpg or image URL"
                    className="w-full rounded-xl border border-[#d4af37]/30 bg-[#0a2618] px-3 py-2 text-xs text-[#f4efe6] focus:border-[#d4af37] focus:outline-none"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex items-center justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#d4af37] via-[#f3df88] to-[#aa8010] px-6 py-2.5 text-xs font-black text-[#051a10] shadow-lg shadow-[#d4af37]/30 hover:brightness-105 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Check className="h-4 w-4 stroke-[3]" />
                  <span>{isSavingProfile ? (isUr ? 'محفوظ ہو رہا ہے...' : 'Saving Profile...') : (isUr ? 'پروفائل محفوظ کریں' : 'Save Farm Profile & Header')}</span>
                </button>
              </div>
            </form>
          </div>
          {/* Header & Status Card */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-[#0a2618] via-[#051a10] to-[#0a2618] p-5 rounded-3xl border border-[#d4af37]/40 shadow-xl">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#d4af37] to-[#aa8010] text-[#051a10] shadow-md shadow-[#d4af37]/30">
                  <Images className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-black text-[#f4efe6]">
                  {isUr ? 'فارم میڈیا گیلری اور ویڈیو مینجمنٹ' : 'Farm Media & Video Gallery Management'}
                </h3>
              </div>
              <p className="text-xs text-[#f4efe6]/70 mt-1 max-w-xl">
                {isUr
                  ? 'فیس بک اسٹائل فارم پروفائل میں دکھائی جانے والی تمام تصاویر اور ویڈیوز (کم از کم ۵ ثبوتی ویڈیوز اور لامحدود تصاویر) کا انتظام کریں۔'
                  : 'Manage real farm photos and proof videos displayed in the Facebook-style profile for all investors (supports 5+ videos and unlimited photos).'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-xl border border-[#d4af37]/30 bg-[#051a10] px-3 py-1.5 text-xs font-bold text-[#f3df88]">
                {galleryList.filter((g) => g.type === 'video').length} {isUr ? 'ویڈیوز' : 'Videos'} • {galleryList.filter((g) => g.type === 'photo').length} {isUr ? 'تصاویر' : 'Photos'}
              </span>
              <button
                type="button"
                onClick={handleResetGalleryToDefaults}
                disabled={isSavingGallery}
                className="flex items-center gap-1.5 rounded-xl border border-[#d4af37]/40 bg-[#051a10] px-3 py-1.5 text-xs font-bold text-[#d4af37] hover:bg-[#d4af37]/10 transition-colors cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>{isUr ? 'اصل ۵ ویڈیوز پر بحال کریں' : 'Reset Factory Media'}</span>
              </button>
            </div>
          </div>

          {/* Feedback Message */}
          {galleryFeedbackMsg && (
            <div className="flex items-center gap-2 rounded-2xl border border-[#d4af37]/50 bg-gradient-to-r from-[#0a2618] to-[#051a10] p-4 text-xs sm:text-sm font-semibold text-[#f3df88] shadow-lg animate-in fade-in">
              <CheckCircle2 className="h-5 w-5 text-[#d4af37] shrink-0" />
              <span>{galleryFeedbackMsg}</span>
            </div>
          )}

          {/* ADD NEW MEDIA FORM */}
          <div className="rounded-3xl border border-[#d4af37]/30 bg-[#0a2618]/90 p-5 shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-[#d4af37]/20 mb-4">
              <div className="flex items-center gap-2">
                <Plus className="h-4 w-4 text-[#d4af37]" />
                <h4 className="text-sm font-black text-[#f4efe6] uppercase tracking-wider">
                  {isUr ? 'نیا میڈیا فارم میں شامل کریں' : 'Upload or Add Farm Media'}
                </h4>
              </div>
              {/* Type Switcher */}
              <div className="flex rounded-xl bg-[#051a10] p-1 border border-[#d4af37]/30">
                <button
                  type="button"
                  onClick={() => setNewGalleryType('photo')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    newGalleryType === 'photo'
                      ? 'bg-[#d4af37] text-[#051a10] shadow'
                      : 'text-[#f4efe6]/70 hover:text-[#f4efe6]'
                  }`}
                >
                  <ImageIcon className="h-3.5 w-3.5" />
                  <span>{isUr ? 'تصویر (Photo)' : 'Photo'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setNewGalleryType('video')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    newGalleryType === 'video'
                      ? 'bg-[#d4af37] text-[#051a10] shadow'
                      : 'text-[#f4efe6]/70 hover:text-[#f4efe6]'
                  }`}
                >
                  <Film className="h-3.5 w-3.5" />
                  <span>{isUr ? 'ویڈیو (Video)' : 'Video'}</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleAddGalleryMedia} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Title */}
                <div>
                  <label className="block text-xs font-bold text-[#d4af37] mb-1">
                    {isUr ? 'میڈیا کا عنوان (لازمی)' : 'Media Title (Required)'} *
                  </label>
                  <input
                    type="text"
                    required
                    value={newGalleryTitle}
                    onChange={(e) => setNewGalleryTitle(e.target.value)}
                    placeholder={newGalleryType === 'video' ? 'e.g. Modern Automated Feeding Lines in Action' : 'e.g. Free-Range Morning Pasture'}
                    className="w-full rounded-xl border border-[#d4af37]/30 bg-[#051a10] px-3.5 py-2.5 text-xs text-[#f4efe6] focus:border-[#d4af37] focus:outline-none"
                  />
                </div>

                {/* Title Urdu */}
                <div>
                  <label className="block text-xs font-bold text-[#f4efe6]/80 mb-1">
                    {isUr ? 'اردو عنوان (اختیاری)' : 'Urdu Title (Optional)'}
                  </label>
                  <input
                    type="text"
                    value={newGalleryTitleUr}
                    onChange={(e) => setNewGalleryTitleUr(e.target.value)}
                    placeholder="مثال: شیڈ نمبر ۱۰۱ میں جدید خودکار فیڈنگ سسٹم"
                    dir="rtl"
                    className="w-full rounded-xl border border-[#d4af37]/30 bg-[#051a10] px-3.5 py-2.5 text-xs text-[#f4efe6] focus:border-[#d4af37] focus:outline-none"
                  />
                </div>
              </div>

              {/* Media File Upload or URL */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#d4af37] mb-1">
                    {newGalleryType === 'photo'
                      ? (isUr ? 'ڈیوائس سے تصویر منتخب کریں' : 'Upload Photo from Device')
                      : (isUr ? 'ویڈیو فائل اپ لوڈ کریں' : 'Upload Video File')}
                  </label>
                  <label className="flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-[#d4af37]/50 bg-[#051a10] p-3 text-xs font-semibold text-[#f3df88] hover:border-[#d4af37] transition-colors cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Upload className="h-4 w-4 text-[#d4af37]" />
                      <span>
                        {isUploadingGalleryFile
                          ? (isUr ? 'اپ لوڈ ہو رہا ہے...' : 'Processing file...')
                          : (isUr ? 'فائل منتخب کریں (Max 50MB)' : 'Select Media File (Max 50MB)')}
                      </span>
                    </div>
                    <span className="text-[10px] text-[#f4efe6]/50">
                      {newGalleryType === 'video'
                        ? 'MP4, WebM, MOV, AVI — Smooth uploads up to 50MB'
                        : 'JPG, PNG, WebP — High-Resolution Photos up to 50MB'}
                    </span>
                    <input
                      type="file"
                      accept={newGalleryType === 'photo' ? 'image/*' : 'video/*'}
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleGalleryFileUpload(file);
                      }}
                    />
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#d4af37] mb-1">
                    {isUr ? 'یا براہ راست میڈیا URL درج کریں' : 'Or Direct Media URL'} *
                  </label>
                  <input
                    type="text"
                    value={newGalleryMediaUrl}
                    onChange={(e) => {
                      setNewGalleryMediaUrl(e.target.value);
                      if (newGalleryType === 'photo' && !newGalleryThumbnailUrl) {
                        setNewGalleryThumbnailUrl(e.target.value);
                      }
                    }}
                    placeholder={
                      newGalleryType === 'video'
                        ? 'https://...mp4 or YouTube video link'
                        : 'https://images.unsplash.com/... or /banners/...'
                    }
                    className="w-full rounded-xl border border-[#d4af37]/30 bg-[#051a10] px-3.5 py-2.5 text-xs text-[#f4efe6] focus:border-[#d4af37] focus:outline-none"
                  />
                </div>
              </div>

              {/* Video Specific: Thumbnail & Duration */}
              {newGalleryType === 'video' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#f4efe6]/80 mb-1">
                      {isUr ? 'ویڈیو تھمب نیل تصویر کا URL (اختیاری)' : 'Video Poster / Thumbnail Image URL (Optional)'}
                    </label>
                    <input
                      type="text"
                      value={newGalleryThumbnailUrl}
                      onChange={(e) => setNewGalleryThumbnailUrl(e.target.value)}
                      placeholder="https://images.unsplash.com/... (optional cover)"
                      className="w-full rounded-xl border border-[#d4af37]/30 bg-[#051a10] px-3.5 py-2.5 text-xs text-[#f4efe6] focus:border-[#d4af37] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#f4efe6]/80 mb-1">
                      {isUr ? 'ویڈیو کا دورانیہ (مثلاً 02:15)' : 'Video Duration (e.g. 02:15)'}
                    </label>
                    <input
                      type="text"
                      value={newGalleryDuration}
                      onChange={(e) => setNewGalleryDuration(e.target.value)}
                      placeholder="01:45"
                      className="w-full rounded-xl border border-[#d4af37]/30 bg-[#051a10] px-3.5 py-2.5 text-xs text-[#f4efe6] focus:border-[#d4af37] focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Location & Captions */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#f4efe6]/80 mb-1">
                    {isUr ? 'مقام / شیڈ' : 'Farm Location / Shed'}
                  </label>
                  <input
                    type="text"
                    value={newGalleryLocation}
                    onChange={(e) => setNewGalleryLocation(e.target.value)}
                    placeholder="Islamabad Physical Farm (Shed-101)"
                    className="w-full rounded-xl border border-[#d4af37]/30 bg-[#051a10] px-3.5 py-2.5 text-xs text-[#f4efe6] focus:border-[#d4af37] focus:outline-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-[#f4efe6]/80 mb-1">
                    {isUr ? 'تفصیل / کیپشن' : 'Caption / Description'}
                  </label>
                  <input
                    type="text"
                    value={newGalleryCaption}
                    onChange={(e) => setNewGalleryCaption(e.target.value)}
                    placeholder="Brief description of the farm routine or facility shown..."
                    className="w-full rounded-xl border border-[#d4af37]/30 bg-[#051a10] px-3.5 py-2.5 text-xs text-[#f4efe6] focus:border-[#d4af37] focus:outline-none"
                  />
                </div>
              </div>

              {/* Preview Thumbnail if available */}
              {newGalleryMediaUrl && (
                <div className="p-3 rounded-2xl bg-[#051a10] border border-[#d4af37]/20 flex items-center gap-3">
                  <div className="relative h-16 w-24 rounded-lg overflow-hidden bg-black shrink-0 border border-[#d4af37]/30">
                    {newGalleryType === 'photo' ? (
                      <img src={newGalleryMediaUrl} alt="Preview" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-emerald-950 text-[#d4af37]">
                        <Play className="h-6 w-6" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 text-xs">
                    <p className="font-bold text-[#f4efe6] truncate">{newGalleryTitle || 'Untitled Media'}</p>
                    <p className="text-[11px] text-[#f4efe6]/60 truncate">{newGalleryMediaUrl}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-[#d4af37]/20 text-[#d4af37] text-[10px] font-bold uppercase">
                      Ready to Publish
                    </span>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSavingGallery || !newGalleryTitle.trim() || !newGalleryMediaUrl.trim()}
                  className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#d4af37] to-[#aa8010] px-6 py-2.5 text-xs font-black text-[#051a10] hover:brightness-110 transition-all shadow-md shadow-[#d4af37]/30 cursor-pointer disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" />
                  <span>
                    {isSavingGallery
                      ? (isUr ? 'محفوظ ہو رہا ہے...' : 'Publishing...')
                      : (isUr ? 'گیلری میں شامل کریں' : 'Add to Farm Gallery')}
                  </span>
                </button>
              </div>
            </form>
          </div>

          {/* MEDIA LIST & FILTER */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-black text-[#f4efe6]">
                  {isUr ? 'موجودہ گیلری آئٹمز' : 'Active Farm Gallery Items'}
                </h4>
                <span className="rounded-full bg-[#0a2618] px-2 py-0.5 text-[11px] font-bold text-[#d4af37] border border-[#d4af37]/30">
                  {galleryList.length} Items
                </span>
              </div>

              {/* Filter Tabs */}
              <div className="flex rounded-xl bg-[#051a10] p-1 border border-[#d4af37]/30 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setGalleryFilterTab('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    galleryFilterTab === 'all'
                      ? 'bg-[#d4af37] text-[#051a10]'
                      : 'text-[#f4efe6]/70 hover:text-[#f4efe6]'
                  }`}
                >
                  {isUr ? 'تمام' : 'All'} ({galleryList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setGalleryFilterTab('video')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    galleryFilterTab === 'video'
                      ? 'bg-[#d4af37] text-[#051a10]'
                      : 'text-[#f4efe6]/70 hover:text-[#f4efe6]'
                  }`}
                >
                  {isUr ? 'ویڈیوز' : 'Videos'} ({galleryList.filter((g) => g.type === 'video').length})
                </button>
                <button
                  type="button"
                  onClick={() => setGalleryFilterTab('photo')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    galleryFilterTab === 'photo'
                      ? 'bg-[#d4af37] text-[#051a10]'
                      : 'text-[#f4efe6]/70 hover:text-[#f4efe6]'
                  }`}
                >
                  {isUr ? 'تصاویر' : 'Photos'} ({galleryList.filter((g) => g.type === 'photo').length})
                </button>
              </div>
            </div>

            {/* Grid of Current Media */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {galleryList
                .filter((item) => galleryFilterTab === 'all' || item.type === galleryFilterTab)
                .map((item, idx) => (
                  <div
                    key={`${item.id}_${idx}`}
                    className="relative flex flex-col justify-between rounded-2xl border border-[#d4af37]/30 bg-[#0a2618]/90 overflow-hidden shadow-lg hover:border-[#d4af37]/70 transition-all"
                  >
                    {/* Media Thumbnail */}
                    <div className="relative aspect-video w-full bg-black overflow-hidden group">
                      <img
                        src={item.thumbnailUrl || item.mediaUrl}
                        alt={item.title}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          // Fallback to high quality farm image if external url fails
                          (e.target as HTMLImageElement).src =
                            'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?auto=format&fit=crop&w=800&q=80';
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                      {/* Type Badge */}
                      <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 rounded-lg bg-black/70 backdrop-blur-md px-2 py-1 text-[11px] font-bold text-white border border-white/20">
                        {item.type === 'video' ? (
                          <>
                            <Film className="h-3 w-3 text-[#d4af37]" />
                            <span>Video</span>
                          </>
                        ) : (
                          <>
                            <ImageIcon className="h-3 w-3 text-emerald-400" />
                            <span>Photo</span>
                          </>
                        )}
                      </div>

                      {/* Video Duration or Active Status */}
                      <div className="absolute top-2.5 right-2.5 flex items-center gap-1">
                        {item.duration && (
                          <span className="rounded-lg bg-black/80 px-2 py-0.5 text-[10px] font-mono font-bold text-[#f3df88]">
                            {item.duration}
                          </span>
                        )}
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${
                            item.active !== false && item.isActive !== false
                              ? 'bg-emerald-500/80 text-white'
                              : 'bg-rose-500/80 text-white'
                          }`}
                        >
                          {item.active !== false && item.isActive !== false ? 'Active' : 'Hidden'}
                        </span>
                      </div>

                      {/* Play Icon Overlay for Videos */}
                      {item.type === 'video' && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="h-10 w-10 rounded-full bg-[#d4af37]/90 text-[#051a10] flex items-center justify-center shadow-lg">
                            <Play className="h-5 w-5 fill-current ml-0.5" />
                          </div>
                        </div>
                      )}

                      {/* Location bar */}
                      <div className="absolute bottom-2 left-2.5 right-2.5 text-[10px] text-[#f4efe6]/80 truncate">
                        📍 {item.location || 'Pak Hen Farm'}
                      </div>
                    </div>

                    {/* Content Details */}
                    <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                      <div>
                        <h5 className="text-xs font-black text-[#f4efe6] line-clamp-1">
                          {isUr && item.titleUr ? item.titleUr : item.title}
                        </h5>
                        {item.caption && (
                          <p className="text-[11px] text-[#f4efe6]/60 line-clamp-2 mt-0.5">
                            {isUr && item.captionUr ? item.captionUr : item.caption}
                          </p>
                        )}
                      </div>

                      {/* Action Bar */}
                      <div className="pt-2 border-t border-[#d4af37]/15 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const currentActive = item.active !== false && item.isActive !== false;
                              handleToggleGalleryMediaActive(item.id, !currentActive);
                            }}
                            className={`rounded-lg px-2 py-1 text-[10px] font-bold transition-colors cursor-pointer border ${
                              item.active !== false && item.isActive !== false
                                ? 'border-amber-500/50 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'
                                : 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                            }`}
                          >
                            {item.active !== false && item.isActive !== false ? (isUr ? 'چھپائیں' : 'Hide') : (isUr ? 'دکھائیں' : 'Show')}
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <a
                            href={item.mediaUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 rounded-lg text-[#f4efe6]/60 hover:text-[#d4af37] transition-colors"
                            title="Open Link"
                          >
                            <ArrowUpRight className="h-4 w-4" />
                          </a>
                          <button
                            type="button"
                            onClick={() => handleDeleteGalleryMedia(item.id)}
                            disabled={isSavingGallery}
                            className="p-1 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="Delete Media"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: DEDICATED ADMIN SOS INBOX & HELPDESK TICKETS (Requirement 2) */}
      {activeTab === 'sos_inbox' && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0a2618]/90 p-5 rounded-3xl border border-[#d4af37]/30">
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
                  : 'Central inbox for all user queries, emergency help alerts, and support tickets with read/unread tracking.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Filter Pills */}
              <div className="flex rounded-xl bg-[#051a10] p-1 border border-[#d4af37]/30">
                <button
                  type="button"
                  onClick={() => setSosFilter('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    sosFilter === 'all'
                      ? 'bg-[#d4af37] text-[#051a10] shadow'
                      : 'text-[#f4efe6]/70 hover:text-[#f4efe6]'
                  }`}
                >
                  {isUr ? 'تمام' : 'All'} ({tickets.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSosFilter('unread')}
                  className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    sosFilter === 'unread'
                      ? 'bg-rose-500 text-white shadow'
                      : 'text-[#f4efe6]/70 hover:text-[#f4efe6]'
                  }`}
                >
                  <span>{isUr ? 'ان ریڈ' : 'Unread'}</span>
                  {unreadTicketsList.length > 0 && (
                    <span className="rounded-full bg-rose-950 px-1.5 py-0.2 text-[10px] text-rose-200">
                      {unreadTicketsList.length}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setSosFilter('read')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    sosFilter === 'read'
                      ? 'bg-[#d4af37] text-[#051a10] shadow'
                      : 'text-[#f4efe6]/70 hover:text-[#f4efe6]'
                  }`}
                >
                  {isUr ? 'پڑھے ہوئے' : 'Read'} ({readTicketsList.length})
                </button>
              </div>

              {/* Mark All as Read button */}
              {unreadTicketsList.length > 0 && (
                <button
                  type="button"
                  onClick={markAllSOSAsRead}
                  className="admin-btn text-xs font-bold"
                  title="Mark all notifications and tickets as read"
                >
                  <CheckCheck className="h-3.5 w-3.5 text-[#d4af37]" />
                  <span>{isUr ? 'سب پڑھا ہوا نشان زد کریں' : 'Mark All Read'}</span>
                </button>
              )}
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
                    className="admin-btn"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isReplyingTicket}
                    className="admin-btn-primary disabled:opacity-50"
                  >
                    {isReplyingTicket ? 'Sending...' : 'Send Reply & Resolve Ticket'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {filteredTickets.length === 0 ? (
            <div className="rounded-3xl border border-[#d4af37]/20 bg-[#0a2618]/60 p-8 text-center text-xs text-[#f4efe6]/50">
              {sosFilter === 'unread'
                ? (isUr ? 'کوئی غیر پڑھا ہوا الرٹ نہیں ہے! تمام حل شدہ یا پڑھے جا چکے ہیں۔' : 'No unread SOS tickets! All inquiries are read or resolved.')
                : sosFilter === 'read'
                ? (isUr ? 'کوئی پڑھا ہوا الرٹ موجود نہیں ہے۔' : 'No read tickets found.')
                : (isUr ? 'کوئی SOS الرٹ موصول نہیں ہوا۔' : 'No SOS inquiries or support tickets submitted yet.')}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTickets.map((tkt) => {
                const isUnread = !tkt.read && tkt.status === 'open';

                return (
                  <div
                    key={tkt.id}
                    className={`rounded-3xl border p-5 shadow-xl space-y-3 transition-all ${
                      isUnread
                        ? 'border-[#d4af37] bg-gradient-to-br from-[#0e3522] via-[#0a2618] to-[#051a10] shadow-[#d4af37]/15 ring-1 ring-[#d4af37]/40'
                        : tkt.status === 'open'
                        ? 'border-[#d4af37]/40 bg-[#0a2618]/90'
                        : 'border-stone-800 bg-stone-900/40 opacity-75'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#d4af37]/20 pb-3">
                      <div className="space-y-0.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-base font-bold text-[#f4efe6]">{tkt.subject}</span>

                          {/* Read / Unread Status Badge */}
                          {isUnread ? (
                            <span className="flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase bg-rose-500/25 text-rose-300 border border-rose-500/50 animate-pulse">
                              <span className="h-1.5 w-1.5 rounded-full bg-rose-400"></span>
                              <span>{isUr ? 'نیا غیر پڑھا ہوا' : 'New Unread'}</span>
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold text-emerald-400/80 bg-emerald-950/40 border border-emerald-500/20">
                              <Check className="h-3 w-3" />
                              <span>{isUr ? 'پڑھا ہوا' : 'Read'}</span>
                            </span>
                          )}

                          {/* Ticket Status */}
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${
                              tkt.status === 'open'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            }`}
                          >
                            {tkt.status === 'open' ? (isUr ? 'کھلا ٹکٹ' : 'Open Ticket') : (isUr ? 'حل شدہ' : 'Resolved')}
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

                    {/* Action Bar with Sleek Admin Buttons */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/5">
                      <div className="flex items-center gap-1.5">
                        {isUnread ? (
                          <button
                            type="button"
                            onClick={() => markSOSAsRead(tkt.id, true)}
                            className="admin-btn text-xs"
                            title="Mark as read in admin inbox"
                          >
                            <Eye className="h-3.5 w-3.5 text-[#d4af37]" />
                            <span>{isUr ? 'پڑھا ہوا نشان زد کریں' : 'Mark as Read'}</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => markSOSAsRead(tkt.id, false)}
                            className="admin-btn text-xs text-[#f4efe6]/70"
                            title="Mark as unread"
                          >
                            <EyeOff className="h-3.5 w-3.5 text-[#f4efe6]/50" />
                            <span>{isUr ? 'غیر پڑھا ہوا کریں' : 'Mark as Unread'}</span>
                          </button>
                        )}
                      </div>

                      {tkt.status === 'open' && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTicketForReply(tkt);
                            setTicketReplyText('');
                          }}
                          className="admin-btn-primary text-xs"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                          <span>{isUr ? 'جواب ارسال کریں اور حل کریں' : 'Reply & Resolve'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
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
