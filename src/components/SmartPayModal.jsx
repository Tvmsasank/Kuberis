import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  QrCode,
  Camera,
  Upload,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Sparkles,
  Zap,
  TrendingUp,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Info,
  Layers,
  ArrowRight,
  PiggyBank,
  Check,
  Copy,
  RefreshCw,
  Coins
} from 'lucide-react';
import jsQR from 'jsqr';

export default function SmartPayModal({
  isOpen,
  onClose,
  budgets = [],
  categories = [],
  transactions = [],
  microWealthPot = {},
  onSaveTransaction,
  onSaveInvestment,
  onSavePreferences,
  isPrivacyMode = false
}) {
  if (!isOpen) return null;

  // Tabs: 'scan' | 'manual' | 'pot'
  const [activeTab, setActiveTab] = useState('scan');

  // Payment Form State
  const [vpa, setVpa] = useState('');
  const [payeeName, setPayeeName] = useState('');
  const [rawAmount, setRawAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [notes, setNotes] = useState('');

  // Round-Up Settings
  // 'nearest_10' | 'nearest_50' | 'pct_5' | 'none'
  const [roundUpMode, setRoundUpMode] = useState(microWealthPot?.roundUpMode || 'nearest_10');
  const [roundUpEnabled, setRoundUpEnabled] = useState(
    microWealthPot?.roundUpEnabled !== false
  );

  // Pot Sweeping state
  const [sweeping, setSweeping] = useState(false);
  const [sweepSuccess, setSweepSuccess] = useState(false);

  // Scanner States
  const [isScanningCamera, setIsScanningCamera] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const fileInputRef = useRef(null);

  // Payment Success View State
  const [paymentSuccessData, setPaymentSuccessData] = useState(null);

  // Initialize Category
  useEffect(() => {
    if (categories && categories.length > 0 && !selectedCategory) {
      // Pick first non-income or default to first
      const defaultCat = categories.find(c => c.toLowerCase() !== 'salary' && c.toLowerCase() !== 'income') || categories[0];
      setSelectedCategory(defaultCat);
    }
  }, [categories, selectedCategory]);

  // Clean camera stream when tab changes or modal closes
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject;
      const tracks = stream.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setIsScanningCamera(false);
  };

  const startCamera = async () => {
    setCameraError('');
    setIsScanningCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.play();
        scanVideoFrame();
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setCameraError('Unable to access camera. Please allow camera permissions or upload a QR image.');
      setIsScanningCamera(false);
    }
  };

  const scanVideoFrame = () => {
    if (!videoRef.current || videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) {
      animFrameRef.current = requestAnimationFrame(scanVideoFrame);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert'
    });

    if (code && code.data) {
      // Detected QR
      parseUpiPayload(code.data);
      stopCamera();
      return;
    }

    animFrameRef.current = requestAnimationFrame(scanVideoFrame);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, img.width, img.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code && code.data) {
          parseUpiPayload(code.data);
        } else {
          setCameraError('No valid UPI QR code detected in the selected image. Please try another image.');
        }
      };
      img.src = uploadEvent.target.result;
    };
    reader.readAsDataURL(file);
  };

  // UPI QR String Parser: upi://pay?pa=merchant@upi&pn=Merchant%20Name&am=150.00&cu=INR&tn=Notes
  const parseUpiPayload = (qrData) => {
    try {
      let urlStr = qrData.trim();
      if (!urlStr.toLowerCase().startsWith('upi://pay')) {
        // Fallback: check if it's a bare VPA
        if (urlStr.includes('@')) {
          setVpa(urlStr);
          setActiveTab('manual');
          return;
        }
        setCameraError('Scanned QR is not an official UPI payment code.');
        return;
      }

      // Format query string
      const queryIdx = urlStr.indexOf('?');
      if (queryIdx === -1) {
        setCameraError('Invalid UPI QR format.');
        return;
      }

      const queryString = urlStr.slice(queryIdx + 1);
      const params = new URLSearchParams(queryString);

      const parsedPa = params.get('pa') || '';
      const parsedPn = params.get('pn') || '';
      const parsedAm = params.get('am') || '';
      const parsedTn = params.get('tn') || '';

      setVpa(parsedPa);
      setPayeeName(parsedPn.replace(/\+/g, ' '));
      if (parsedAm && !isNaN(Number(parsedAm))) {
        setRawAmount(parsedAm);
      }
      if (parsedTn) {
        setNotes(parsedTn);
      }

      // Auto-suggest category based on merchant name or notes
      const combined = (parsedPn + ' ' + parsedTn).toLowerCase();
      if (combined.includes('swiggy') || combined.includes('zomato') || combined.includes('restaurant') || combined.includes('cafe') || combined.includes('food')) {
        setSelectedCategory('Food & Dining');
      } else if (combined.includes('uber') || combined.includes('ola') || combined.includes('fuel') || combined.includes('petrol') || combined.includes('metro')) {
        setSelectedCategory('Transportation');
      } else if (combined.includes('supermarket') || combined.includes('mart') || combined.includes('blinkit') || combined.includes('zepto') || combined.includes('grocery')) {
        setSelectedCategory('Groceries');
      } else if (combined.includes('cinema') || combined.includes('netflix') || combined.includes('prime') || combined.includes('hotstar')) {
        setSelectedCategory('Entertainment');
      }

      // Switch to manual confirmation tab
      setActiveTab('manual');
    } catch (err) {
      console.error('Failed to parse UPI payload:', err);
      setCameraError('Failed to parse QR code format.');
    }
  };

  // Real-Time Calculations
  const numericAmount = Math.max(0, parseFloat(rawAmount) || 0);

  // 1. Calculate Round-up
  const calculateRoundUp = (amount, mode) => {
    if (!roundUpEnabled || amount <= 0) return 0;
    if (mode === 'nearest_10') {
      const remainder = amount % 10;
      return remainder === 0 ? 10 : Number((10 - remainder).toFixed(2));
    }
    if (mode === 'nearest_50') {
      const remainder = amount % 50;
      return remainder === 0 ? 50 : Number((50 - remainder).toFixed(2));
    }
    if (mode === 'pct_5') {
      return Number(Math.max(1, amount * 0.05).toFixed(2));
    }
    return 0;
  };

  const roundUpSpare = calculateRoundUp(numericAmount, roundUpMode);
  const totalDeduction = Number((numericAmount + roundUpSpare).toFixed(2));

  // 2. Pre-Payment Budget Shield Evaluation
  const currentCategoryBudget = budgets.find(
    b => b.category?.toLowerCase() === selectedCategory?.toLowerCase()
  );

  // Calculate current month's spent for this category
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const spentThisMonth = (transactions || [])
    .filter(t => {
      if (t.type !== 'expense' && t.type !== 'debit') return false;
      if (t.category?.toLowerCase() !== selectedCategory?.toLowerCase()) return false;
      const d = new Date(t.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    })
    .reduce((sum, t) => sum + Math.abs(Number(t.amount) || 0), 0);

  const budgetLimit = Number(currentCategoryBudget?.limit) || 0;
  const projectedSpent = spentThisMonth + numericAmount;
  const isBudgetConfigured = budgetLimit > 0;
  const remainingBefore = Math.max(0, budgetLimit - spentThisMonth);
  const remainingAfter = budgetLimit - projectedSpent;
  const spentPctBefore = isBudgetConfigured ? (spentThisMonth / budgetLimit) * 100 : 0;
  const spentPctAfter = isBudgetConfigured ? (projectedSpent / budgetLimit) * 100 : 0;

  let shieldStatus = 'safe'; // 'safe' | 'warning' | 'over'
  let shieldMessage = '';

  if (!isBudgetConfigured) {
    shieldStatus = 'safe';
    shieldMessage = `No monthly budget set for ${selectedCategory || 'this category'}. Spending is unrestricted.`;
  } else if (projectedSpent > budgetLimit) {
    shieldStatus = 'over';
    shieldMessage = `Over-Budget Alert! This payment will exceed your ${selectedCategory} budget by ₹${Math.abs(remainingAfter).toLocaleString('en-IN', { minimumFractionDigits: 2 })}.`;
  } else if (spentPctAfter >= 85) {
    shieldStatus = 'warning';
    shieldMessage = `Budget Caution! After this ₹${numericAmount} payment, you will have utilized ${spentPctAfter.toFixed(0)}% of your ${selectedCategory} budget.`;
  } else {
    shieldStatus = 'safe';
    shieldMessage = `Safe to spend! Only ${spentPctAfter.toFixed(0)}% of your ${selectedCategory} budget will be utilized.`;
  }

  // 3. Generate Universal UPI Intent URLs
  const encodedPn = encodeURIComponent(payeeName || 'Merchant');
  const encodedTn = encodeURIComponent(notes || 'Payment via Kuberis Smart-Pay');
  const baseUpiParams = `pa=${encodeURIComponent(vpa)}&pn=${encodedPn}&am=${numericAmount.toFixed(2)}&cu=INR&tn=${encodedTn}`;

  const standardUpiUrl = `upi://pay?${baseUpiParams}`;
  const gpayUrl = `tez://upi/pay?${baseUpiParams}`;
  const phonepeUrl = `phonepe://pay?${baseUpiParams}`;
  const paytmUrl = `paytmmp://pay?${baseUpiParams}`;

  // 4. Handle Launching Payment & Ledger Recording
  const handleLaunchPayment = async (intentUrl, appName) => {
    if (!vpa || numericAmount <= 0) {
      alert('Please provide a valid UPI ID and Amount.');
      return;
    }

    // Try opening the UPI Intent URL if valid app scheme
    if (intentUrl.startsWith('upi://') || intentUrl.startsWith('tez://') || intentUrl.startsWith('phonepe://') || intentUrl.startsWith('paytmmp://')) {
      window.location.href = intentUrl;
    }

    // Record transaction in Ledger
    const paymentTimestamp = new Date().toISOString();
    const newTx = {
      type: 'expense',
      category: selectedCategory || 'Shopping',
      amount: numericAmount,
      date: paymentTimestamp.split('T')[0],
      description: `UPI to ${payeeName || vpa} (${appName || 'UPI'})`,
      paymentMethod: 'UPI',
      notes: notes || `Smart-Pay to ${vpa}`,
      tags: ['SmartPay', 'UPI']
    };

    if (onSaveTransaction) {
      try {
        await onSaveTransaction(newTx);
      } catch (err) {
        console.error('Error saving transaction:', err);
      }
    }

    // Accumulate Micro-Wealth Round-Up
    let updatedPot = {
      balance: (Number(microWealthPot?.balance) || 0) + roundUpSpare,
      totalSaved: (Number(microWealthPot?.totalSaved) || 0) + roundUpSpare,
      totalRoundsCount: (Number(microWealthPot?.totalRoundsCount) || 0) + (roundUpSpare > 0 ? 1 : 0),
      interestEarned: Number(microWealthPot?.interestEarned) || 0,
      roundUpMode,
      roundUpEnabled
    };

    if (roundUpSpare > 0 && onSavePreferences) {
      try {
        await onSavePreferences({ microWealthPot: updatedPot });
      } catch (err) {
        console.error('Error updating micro-wealth pot:', err);
      }
    }

    // Show instant success reconciliation screen
    setPaymentSuccessData({
      vpa,
      payeeName: payeeName || vpa,
      amount: numericAmount,
      roundUpSpare,
      totalDeduction,
      appName: appName || 'UPI App',
      category: selectedCategory,
      shieldStatus,
      newPotBalance: updatedPot.balance
    });
  };

  // 5. Sweep Pot into Fixed Deposit
  const handleSweepPotToFd = async () => {
    const currentBalance = Number(microWealthPot?.balance) || 0;
    if (currentBalance < 1000) {
      alert('Pot requires at least ₹1,000 to open a Government Fixed Deposit.');
      return;
    }

    setSweeping(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const maturityDate = new Date();
      maturityDate.setFullYear(maturityDate.getFullYear() + 1);

      // Create official 1-Year FD at 6.90%
      const newFdHolding = {
        name: 'Post Office Time Deposit (Micro-Wealth Sweep)',
        type: 'fd',
        accountHolder: 'Primary Account Holder',
        category: 'Post Office FD',
        buyPrice: 1000,
        quantity: 1,
        currentValuation: 1000,
        interestRate: 6.90,
        tenureYears: 1,
        tenureDays: 365,
        depositDate: todayStr,
        maturityDate: maturityDate.toISOString().split('T')[0],
        notes: 'Auto-swept milestone from Kuberis Micro-Wealth Spare Change Pot'
      };

      if (onSaveInvestment) {
        await onSaveInvestment(newFdHolding);
      }

      // Deduct ₹1,000 from pot
      const remainingBalance = Number((currentBalance - 1000).toFixed(2));
      const updatedPot = {
        ...microWealthPot,
        balance: remainingBalance
      };

      if (onSavePreferences) {
        await onSavePreferences({ microWealthPot: updatedPot });
      }

      setSweepSuccess(true);
      setTimeout(() => setSweepSuccess(false), 5000);
    } catch (err) {
      console.error('Failed to sweep to FD:', err);
      alert('Failed to sweep funds to FD. Please try again.');
    } finally {
      setSweeping(false);
    }
  };

  // Helper formatting
  const formatInr = (n) =>
    isPrivacyMode
      ? '₹••••'
      : '₹' +
        Number(n || 0).toLocaleString('en-IN', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        });

  return (
    <div className="modal-backdrop" style={{ zIndex: 10050 }}>
      <div
        className="modal-content"
        style={{
          maxWidth: '560px',
          width: '95%',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '24px 28px',
          borderRadius: '24px',
          background: 'var(--bg-card, #0B132B)',
          border: '1px solid var(--border-glass)',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7), 0 0 30px rgba(16, 185, 129, 0.15)'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                color: '#000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 15px rgba(16, 185, 129, 0.4)'
              }}
            >
              <Zap size={24} />
            </div>
            <div>
              <h2 style={{ fontSize: '19px', fontWeight: '900', margin: 0, color: 'var(--text-main)', letterSpacing: '-0.3px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                Kuberis Smart-Pay
                <span
                  style={{
                    fontSize: '10.5px',
                    fontWeight: '800',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    background: 'rgba(16, 185, 129, 0.15)',
                    color: '#10B981',
                    border: '1px solid rgba(16, 185, 129, 0.3)'
                  }}
                >
                  ⚡ LIVE UPI INTENT
                </span>
              </h2>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Pre-Payment Budget Shield • 7.10% Micro-Wealth Engine
              </div>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            style={{ padding: '6px', borderRadius: '50%', color: 'var(--text-muted)' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Payment Confirmation / Success Receipt Screen */}
        {paymentSuccessData ? (
          <div style={{ textAlign: 'center', padding: '16px 8px', animation: 'fadeIn 0.3s ease' }}>
            <div
              style={{
                width: '68px',
                height: '68px',
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#10B981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto',
                border: '2px solid #10B981',
                boxShadow: '0 0 25px rgba(16, 185, 129, 0.35)'
              }}
            >
              <CheckCircle2 size={40} />
            </div>

            <h3 style={{ fontSize: '22px', fontWeight: '900', color: 'var(--text-main)', marginBottom: '4px' }}>
              Payment Triggered via {paymentSuccessData.appName}!
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
              Ledger auto-updated & micro-wealth accumulated.
            </p>

            {/* Receipt Summary Card */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '16px',
                border: '1px solid var(--border-color)',
                padding: '18px 20px',
                textAlign: 'left',
                marginBottom: '20px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>Payee:</span>
                <span style={{ fontSize: '13.5px', fontWeight: '800', color: 'var(--text-main)' }}>
                  {paymentSuccessData.payeeName} ({paymentSuccessData.vpa})
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>Direct Bill Amount:</span>
                <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-main)' }}>
                  {formatInr(paymentSuccessData.amount)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '12.5px', color: '#10B981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Sparkles size={13} /> Micro-Wealth Round-Up:
                </span>
                <span style={{ fontSize: '14px', fontWeight: '800', color: '#10B981' }}>
                  +{formatInr(paymentSuccessData.roundUpSpare)}
                </span>
              </div>
              <div style={{ height: '1px', background: 'var(--border-color)', margin: '10px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)' }}>Total Outlay:</span>
                <span style={{ fontSize: '18px', fontWeight: '900', color: 'var(--primary)' }}>
                  {formatInr(paymentSuccessData.totalDeduction)}
                </span>
              </div>
            </div>

            {/* Micro-wealth Pot Milestone Banner */}
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(5, 150, 105, 0.08) 100%)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '16px',
                padding: '16px',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                textAlign: 'left'
              }}
            >
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: 'rgba(16, 185, 129, 0.2)',
                  color: '#10B981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <PiggyBank size={24} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)' }}>
                  Micro-Wealth Pot: {formatInr(paymentSuccessData.newPotBalance)}
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Earning 7.10% p.a. compound yield. Auto-sweepable to Post Office FD at ₹1,000.
                </div>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px', borderRadius: '12px', fontWeight: '800' }}
              onClick={() => {
                setPaymentSuccessData(null);
                setRawAmount('');
                setVpa('');
                setPayeeName('');
                setNotes('');
                onClose();
              }}
            >
              Back to Dashboard
            </button>
          </div>
        ) : (
          <>
            {/* Top Navigation Tabs */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '6px',
                background: 'rgba(255, 255, 255, 0.05)',
                padding: '4px',
                borderRadius: '14px',
                marginBottom: '20px'
              }}
            >
              <button
                type="button"
                className={`btn btn-sm ${activeTab === 'scan' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => {
                  setActiveTab('scan');
                  startCamera();
                }}
                style={{ borderRadius: '10px', fontSize: '12px', fontWeight: '700', gap: '6px' }}
              >
                <QrCode size={15} /> Scan QR
              </button>
              <button
                type="button"
                className={`btn btn-sm ${activeTab === 'manual' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => {
                  stopCamera();
                  setActiveTab('manual');
                }}
                style={{ borderRadius: '10px', fontSize: '12px', fontWeight: '700', gap: '6px' }}
              >
                <Zap size={15} /> Pay VPA
              </button>
              <button
                type="button"
                className={`btn btn-sm ${activeTab === 'pot' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => {
                  stopCamera();
                  setActiveTab('pot');
                }}
                style={{ borderRadius: '10px', fontSize: '12px', fontWeight: '700', gap: '6px' }}
              >
                <PiggyBank size={15} /> Pot ({formatInr(microWealthPot?.balance || 0)})
              </button>
            </div>

            {/* TAB 1: High-Speed QR Scanner */}
            {activeTab === 'scan' && (
              <div>
                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    height: '260px',
                    borderRadius: '18px',
                    overflow: 'hidden',
                    background: '#040914',
                    border: '2px dashed rgba(16, 185, 129, 0.4)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '16px'
                  }}
                >
                  <video
                    ref={videoRef}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: isScanningCamera ? 'block' : 'none'
                    }}
                  />
                  <canvas ref={canvasRef} style={{ display: 'none' }} />

                  {/* Aiming Reticle Overlay when scanning */}
                  {isScanningCamera && (
                    <div
                      style={{
                        position: 'absolute',
                        width: '180px',
                        height: '180px',
                        border: '2px solid #10B981',
                        borderRadius: '16px',
                        boxShadow: '0 0 20px rgba(16, 185, 129, 0.4), inset 0 0 15px rgba(16, 185, 129, 0.2)',
                        pointerEvents: 'none',
                        animation: 'pulse 1.8s infinite'
                      }}
                    >
                      <div style={{ position: 'absolute', top: '50%', left: '0', right: '0', height: '2px', background: '#10B981', opacity: 0.7 }} />
                    </div>
                  )}

                  {!isScanningCamera && (
                    <div style={{ textAlign: 'center', padding: '20px' }}>
                      <Camera size={44} style={{ color: 'var(--text-muted)', marginBottom: '12px', opacity: 0.6 }} />
                      <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main)' }}>
                        Point camera at any Merchant UPI QR
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Google Pay, PhonePe, BharatPe, Paytm, CRED
                      </div>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={startCamera}
                        style={{ marginTop: '16px', borderRadius: '10px' }}
                      >
                        <Camera size={14} /> Start Camera Scanner
                      </button>
                    </div>
                  )}
                </div>

                {cameraError && (
                  <div
                    style={{
                      padding: '10px 14px',
                      borderRadius: '10px',
                      background: 'rgba(239, 68, 68, 0.12)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: '#EF4444',
                      fontSize: '12px',
                      marginBottom: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <AlertTriangle size={16} />
                    <span>{cameraError}</span>
                  </div>
                )}

                {/* Upload Image Alternative */}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleImageUpload}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => fileInputRef.current?.click()}
                    style={{ flex: 1, padding: '10px', fontSize: '13px', borderRadius: '12px', gap: '6px' }}
                  >
                    <Upload size={16} /> Upload QR Screenshot / Image
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => {
                      stopCamera();
                      setActiveTab('manual');
                    }}
                    style={{ fontSize: '13px', borderRadius: '12px' }}
                  >
                    Type VPA Manually <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: Manual VPA & Payment Confirmation */}
            {activeTab === 'manual' && (
              <div>
                {/* Payee Info Inputs */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '5px', display: 'block' }}>
                      UPI ID / VPA *
                    </label>
                    <input
                      type="text"
                      className="input"
                      placeholder="merchant@upi"
                      value={vpa}
                      onChange={e => setVpa(e.target.value)}
                      style={{ width: '100%', borderRadius: '10px', fontSize: '13px', padding: '9px 12px' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '5px', display: 'block' }}>
                      Payee / Merchant Name
                    </label>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g. Swiggy, Starbucks"
                      value={payeeName}
                      onChange={e => setPayeeName(e.target.value)}
                      style={{ width: '100%', borderRadius: '10px', fontSize: '13px', padding: '9px 12px' }}
                    />
                  </div>
                </div>

                {/* Amount & Category */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '5px', display: 'block' }}>
                      Amount (₹) *
                    </label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontWeight: '800', color: 'var(--text-main)', fontSize: '15px' }}>
                        ₹
                      </span>
                      <input
                        type="number"
                        step="any"
                        className="input"
                        placeholder="0.00"
                        value={rawAmount}
                        onChange={e => setRawAmount(e.target.value)}
                        style={{ width: '100%', paddingLeft: '28px', fontSize: '16px', fontWeight: '800', borderRadius: '10px' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '5px', display: 'block' }}>
                      Category (for Shield)
                    </label>
                    <select
                      className="input"
                      value={selectedCategory}
                      onChange={e => setSelectedCategory(e.target.value)}
                      style={{ width: '100%', borderRadius: '10px', fontSize: '13px', padding: '10px 12px' }}
                    >
                      {categories.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 🛡️ PRE-PAYMENT BUDGET SHIELD BANNER */}
                <div
                  style={{
                    padding: '14px 16px',
                    borderRadius: '14px',
                    marginBottom: '16px',
                    border: shieldStatus === 'safe'
                      ? '1px solid rgba(16, 185, 129, 0.4)'
                      : shieldStatus === 'warning'
                      ? '1px solid rgba(245, 158, 11, 0.4)'
                      : '1px solid rgba(239, 68, 68, 0.5)',
                    background: shieldStatus === 'safe'
                      ? 'rgba(16, 185, 129, 0.08)'
                      : shieldStatus === 'warning'
                      ? 'rgba(245, 158, 11, 0.08)'
                      : 'rgba(239, 68, 68, 0.1)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px'
                  }}
                >
                  <div
                    style={{
                      color: shieldStatus === 'safe' ? '#10B981' : shieldStatus === 'warning' ? '#F59E0B' : '#EF4444',
                      marginTop: '2px'
                    }}
                  >
                    {shieldStatus === 'safe' ? (
                      <ShieldCheck size={22} />
                    ) : shieldStatus === 'warning' ? (
                      <AlertTriangle size={22} />
                    ) : (
                      <ShieldAlert size={22} />
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: '800',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          color: shieldStatus === 'safe' ? '#10B981' : shieldStatus === 'warning' ? '#F59E0B' : '#EF4444'
                        }}
                      >
                        Pre-Payment Budget Shield: {shieldStatus.toUpperCase()}
                      </span>
                      {isBudgetConfigured && (
                        <span style={{ fontSize: '11.5px', fontWeight: '700', color: 'var(--text-muted)' }}>
                          Budget: {formatInr(budgetLimit)}/mo
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '12.5px', fontWeight: '600', color: 'var(--text-main)', marginTop: '3px' }}>
                      {shieldMessage}
                    </div>

                    {isBudgetConfigured && (
                      <div style={{ marginTop: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', color: 'var(--text-muted)', marginBottom: '3px' }}>
                          <span>Current: {spentPctBefore.toFixed(0)}%</span>
                          <span>After Pay: {spentPctAfter.toFixed(0)}%</span>
                        </div>
                        <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${Math.min(100, spentPctAfter)}%`,
                              height: '100%',
                              background: shieldStatus === 'safe' ? '#10B981' : shieldStatus === 'warning' ? '#F59E0B' : '#EF4444',
                              transition: 'width 0.3s ease'
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 🪙 SPARE-CHANGE MICRO-WEALTH CALCULATOR */}
                <div
                  style={{
                    padding: '14px 16px',
                    borderRadius: '14px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-color)',
                    marginBottom: '18px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Coins size={17} style={{ color: '#10B981' }} />
                      <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)' }}>
                        Micro-Wealth Round-Up Pot
                      </span>
                    </div>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px', color: 'var(--text-muted)' }}>
                      <input
                        type="checkbox"
                        checked={roundUpEnabled}
                        onChange={e => setRoundUpEnabled(e.target.checked)}
                      />
                      <span>Auto-Save</span>
                    </label>
                  </div>

                  {roundUpEnabled && (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginBottom: '10px' }}>
                        {[
                          { id: 'nearest_10', label: 'Nearest ₹10' },
                          { id: 'nearest_50', label: 'Nearest ₹50' },
                          { id: 'pct_5', label: '5% Booster' }
                        ].map(m => (
                          <button
                            key={m.id}
                            type="button"
                            className={`btn btn-xs ${roundUpMode === m.id ? 'btn-primary' : 'btn-ghost'}`}
                            onClick={() => setRoundUpMode(m.id)}
                            style={{ borderRadius: '8px', fontSize: '11px', padding: '6px' }}
                          >
                            {m.label}
                          </button>
                        ))}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', background: 'rgba(16, 185, 129, 0.08)', padding: '8px 12px', borderRadius: '10px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                        <span style={{ color: 'var(--text-muted)' }}>
                          Spare Change: <strong style={{ color: '#10B981' }}>+{formatInr(roundUpSpare)}</strong>
                        </span>
                        <span style={{ color: 'var(--text-main)', fontWeight: '700' }}>
                          Total with Pot: <strong style={{ color: 'var(--primary)' }}>{formatInr(totalDeduction)}</strong>
                        </span>
                      </div>
                      <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '4px', textAlign: 'right' }}>
                        * Yields 7.10% p.a. compound growth in your Post Office sweep fund
                      </div>
                    </>
                  )}
                </div>

                {/* 🚀 1-TAP UNIVERSAL UPI APP LAUNCHERS */}
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                    Pay & Auto-Record via UPI App
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '10px' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => handleLaunchPayment(gpayUrl, 'Google Pay')}
                      disabled={!vpa || numericAmount <= 0}
                      style={{ padding: '10px', fontSize: '12.5px', borderRadius: '12px', gap: '8px', fontWeight: '800', justifyContent: 'center' }}
                    >
                      <Zap size={15} style={{ color: '#4285F4' }} /> Google Pay
                    </button>

                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => handleLaunchPayment(phonepeUrl, 'PhonePe')}
                      disabled={!vpa || numericAmount <= 0}
                      style={{ padding: '10px', fontSize: '12.5px', borderRadius: '12px', gap: '8px', fontWeight: '800', justifyContent: 'center' }}
                    >
                      <Zap size={15} style={{ color: '#5F259F' }} /> PhonePe
                    </button>

                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => handleLaunchPayment(paytmUrl, 'Paytm')}
                      disabled={!vpa || numericAmount <= 0}
                      style={{ padding: '10px', fontSize: '12.5px', borderRadius: '12px', gap: '8px', fontWeight: '800', justifyContent: 'center' }}
                    >
                      <Zap size={15} style={{ color: '#00BAF2' }} /> Paytm
                    </button>

                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => handleLaunchPayment(standardUpiUrl, 'Default UPI')}
                      disabled={!vpa || numericAmount <= 0}
                      style={{ padding: '10px', fontSize: '12.5px', borderRadius: '12px', gap: '8px', fontWeight: '800', justifyContent: 'center' }}
                    >
                      <ExternalLink size={15} /> CRED / Any UPI
                    </button>
                  </div>

                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => {
                      // Manual ledger only without opening app
                      handleLaunchPayment('#manual', 'Manual UPI');
                    }}
                    disabled={!vpa || numericAmount <= 0}
                    style={{ width: '100%', fontSize: '11.5px', color: 'var(--text-muted)' }}
                  >
                    Already paid? Just record in ledger & add spare change to pot
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: Micro-Wealth Pot & 7.10% FD Sweep */}
            {activeTab === 'pot' && (
              <div>
                <div
                  style={{
                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.05) 100%)',
                    border: '1px solid rgba(16, 185, 129, 0.35)',
                    borderRadius: '20px',
                    padding: '24px 20px',
                    textAlign: 'center',
                    marginBottom: '20px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.3)'
                  }}
                >
                  <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                    Micro-Wealth Pot Accumulated
                  </div>
                  <div style={{ fontSize: '36px', fontWeight: '900', color: 'var(--text-main)', margin: '8px 0', letterSpacing: '-0.5px' }}>
                    {formatInr(microWealthPot?.balance || 0)}
                  </div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '20px', background: 'rgba(16, 185, 129, 0.2)', color: '#10B981', fontSize: '12px', fontWeight: '800' }}>
                    <TrendingUp size={14} /> 7.10% p.a. Compounding Yield
                  </div>
                </div>

                {sweepSuccess && (
                  <div
                    style={{
                      padding: '12px 16px',
                      borderRadius: '12px',
                      background: 'rgba(16, 185, 129, 0.15)',
                      border: '1px solid #10B981',
                      color: '#10B981',
                      fontSize: '13px',
                      fontWeight: '700',
                      marginBottom: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <CheckCircle2 size={18} />
                    <span>Success! ₹1,000 swept into a 1-Year Post Office Fixed Deposit at 6.90%/7.10% p.a.!</span>
                  </div>
                )}

                {/* Pot Stats Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                  <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '12px 14px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Total Spare Change Saved</div>
                    <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)', marginTop: '2px' }}>
                      {formatInr(microWealthPot?.totalSaved || 0)}
                    </div>
                  </div>
                  <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '12px 14px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Payments Rounded Up</div>
                    <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)', marginTop: '2px' }}>
                      {microWealthPot?.totalRoundsCount || 0} times
                    </div>
                  </div>
                </div>

                {/* Milestone Progress Bar */}
                <div style={{ marginBottom: '22px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)' }}>
                      ₹1,000 Fixed Deposit Milestone
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: '800', color: '#10B981' }}>
                      {Math.min(100, (((microWealthPot?.balance || 0) / 1000) * 100)).toFixed(0)}%
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${Math.min(100, (((microWealthPot?.balance || 0) / 1000) * 100))}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #10B981 0%, #059669 100%)',
                        transition: 'width 0.4s ease'
                      }}
                    />
                  </div>
                </div>

                {/* Sweep 1-Tap Action */}
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSweepPotToFd}
                  disabled={sweeping || (microWealthPot?.balance || 0) < 1000}
                  style={{ width: '100%', padding: '13px', borderRadius: '14px', fontSize: '14px', fontWeight: '800', gap: '8px' }}
                >
                  <Sparkles size={16} />
                  {sweeping ? 'Sweeping Funds...' : '1-Tap Sweep ₹1,000 to Post Office FD'}
                </button>
                <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '8px' }}>
                  Automatically locks in the official Govt of India Q3 FY27 Post Office Rate (6.90% - 7.50%).
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
