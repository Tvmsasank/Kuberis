import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  QrCode,
  Camera,
  Upload,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Zap,
  CheckCircle2,
  ExternalLink,
  Lock,
  ArrowRight,
  RefreshCw,
  Info,
  Mail,
  Loader2,
  ChevronRight,
  Sparkles,
  Smartphone
} from 'lucide-react';
import jsQR from 'jsqr';

export default function SmartPayModal({
  isOpen,
  onClose,
  budgets = [],
  categories = [],
  transactions = [],
  onSaveTransaction,
  isPrivacyMode = false,
  token,
  user
}) {
  if (!isOpen) return null;

  // Active Flow Step: 'input' | 'waiting' | 'success'
  const [step, setStep] = useState('input');

  // Input Tabs: 'manual' | 'scan'
  const [activeTab, setActiveTab] = useState('manual');

  // Payment Form State
  const [vpa, setVpa] = useState('');
  const [payeeName, setPayeeName] = useState('');
  const [rawAmount, setRawAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [notes, setNotes] = useState('');

  // Waiting / In-Progress State
  const [activeAppName, setActiveAppName] = useState('');
  const [refNumber, setRefNumber] = useState('');
  const [waitingElapsedSeconds, setWaitingElapsedSeconds] = useState(0);
  const [isConfirming, setIsConfirming] = useState(false);
  const [emailStatus, setEmailStatus] = useState(''); // 'sending' | 'sent' | 'failed' | ''

  // Scanner States
  const [isScanningCamera, setIsScanningCamera] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  // Success Summary State
  const [completedPayment, setCompletedPayment] = useState(null);

  // Initialize Category
  useEffect(() => {
    if (categories && categories.length > 0 && !selectedCategory) {
      const defaultCat = categories.find(c => c.toLowerCase() !== 'salary' && c.toLowerCase() !== 'income') || categories[0];
      setSelectedCategory(defaultCat);
    }
  }, [categories, selectedCategory]);

  // Clean camera stream on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Timer during 'waiting' step
  useEffect(() => {
    let interval = null;
    if (step === 'waiting') {
      setWaitingElapsedSeconds(0);
      interval = setInterval(() => {
        setWaitingElapsedSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [step]);

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

    if (!navigator?.mediaDevices?.getUserMedia) {
      setCameraError('Direct live stream is not supported in this browser environment. Use the "Take Photo with Camera" or "Upload QR" button below.');
      setIsScanningCamera(false);
      return;
    }

    try {
      let stream;
      // 1. Try rear environment camera first
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } },
          audio: false
        });
      } catch (errEnv) {
        // 2. Fallback to basic environment camera
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' },
            audio: false
          });
        } catch (errBasicEnv) {
          // 3. Fallback to any camera
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false
          });
        }
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        scanVideoFrame();
      }
    } catch (err) {
      console.error('Camera stream error:', err);
      let errMsg = 'Unable to launch camera stream directly.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errMsg = 'Camera permission was denied. Tap browser address bar / settings → Allow Camera, or use the "Take Photo with Camera" button below.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errMsg = 'No camera found on this device. Please upload a QR screenshot.';
      } else {
        errMsg = 'Camera could not be accessed directly. Tap "Take Photo with Camera" button below for 100% reliable native capture.';
      }
      setCameraError(errMsg);
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
      parseUpiPayload(code.data);
      stopCamera();
      return;
    }

    animFrameRef.current = requestAnimationFrame(scanVideoFrame);
  };

  const handleImageFileScan = (file) => {
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
          setCameraError('No valid UPI QR code detected in this photo. Please make sure the QR code is clearly visible and well-lit.');
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
        if (urlStr.includes('@')) {
          setVpa(urlStr);
          setActiveTab('manual');
          return;
        }
        setCameraError('Scanned image is not an official UPI QR code.');
        return;
      }

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

      // Auto-suggest category
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

      setActiveTab('manual');
    } catch (err) {
      console.error('Failed to parse UPI payload:', err);
      setCameraError('Failed to parse QR code format.');
    }
  };

  // Calculations
  const numericAmount = Math.max(0, parseFloat(rawAmount) || 0);

  // Budget Shield
  const currentCategoryBudget = budgets.find(
    b => b.category?.toLowerCase() === selectedCategory?.toLowerCase()
  );

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
  const remainingAfter = budgetLimit - projectedSpent;
  const spentPctAfter = isBudgetConfigured ? (projectedSpent / budgetLimit) * 100 : 0;

  let shieldStatus = 'safe';
  let shieldMessage = '';

  if (!isBudgetConfigured) {
    shieldStatus = 'safe';
    shieldMessage = `No budget limit set for ${selectedCategory || 'this category'}. Spending is unconstrained.`;
  } else if (projectedSpent > budgetLimit) {
    shieldStatus = 'over';
    shieldMessage = `Exceeds monthly ${selectedCategory} budget by ₹${Math.abs(remainingAfter).toLocaleString('en-IN', { minimumFractionDigits: 2 })}!`;
  } else if (spentPctAfter >= 85) {
    shieldStatus = 'warning';
    shieldMessage = `Caution: this payment utilizes ${spentPctAfter.toFixed(0)}% of your monthly ${selectedCategory} budget.`;
  } else {
    shieldStatus = 'safe';
    shieldMessage = `Safe to spend. Uses ${spentPctAfter.toFixed(0)}% of your monthly ${selectedCategory} budget.`;
  }

  // Generate UPI Intent URLs
  const encodedPn = encodeURIComponent(payeeName || 'Merchant');
  const encodedTn = encodeURIComponent(notes || 'Payment via Kuberis');
  const baseUpiParams = `pa=${encodeURIComponent(vpa)}&pn=${encodedPn}&am=${numericAmount.toFixed(2)}&cu=INR&tn=${encodedTn}`;

  const standardUpiUrl = `upi://pay?${baseUpiParams}`;
  const gpayUrl = `tez://upi/pay?${baseUpiParams}`;
  const phonepeUrl = `phonepe://pay?${baseUpiParams}`;
  const paytmUrl = `paytmmp://pay?${baseUpiParams}`;

  // STEP 1: Launch Native UPI Intent & switch to Waiting Screen
  const handleLaunchPayment = (intentUrl, appName) => {
    if (!vpa || numericAmount <= 0) {
      alert('Please enter a valid receiver UPI ID and Amount.');
      return;
    }

    setActiveAppName(appName);

    // Launch native UPI app on Android / iOS
    if (intentUrl.startsWith('upi://') || intentUrl.startsWith('tez://') || intentUrl.startsWith('phonepe://') || intentUrl.startsWith('paytmmp://')) {
      window.location.href = intentUrl;
    }

    // Switch view to in-progress waiting screen
    setStep('waiting');
  };

  // STEP 2: Confirm Payment & Record in Ledger & Trigger Email Receipt
  const handleConfirmPaymentCompletion = async () => {
    setIsConfirming(true);
    setEmailStatus('sending');

    const paymentTimestamp = new Date().toISOString();
    const newTx = {
      type: 'expense',
      category: selectedCategory || 'Shopping',
      amount: numericAmount,
      date: paymentTimestamp.split('T')[0],
      description: `UPI to ${payeeName || vpa} (${activeAppName || 'UPI'})`,
      paymentMethod: 'UPI',
      notes: [
        notes || `Smart-Pay to ${vpa}`,
        refNumber ? `UTR/Ref: ${refNumber}` : null
      ].filter(Boolean).join(' • '),
      tags: ['SmartPay', 'UPI']
    };

    // 1. Record into personal ledger
    if (onSaveTransaction) {
      try {
        await onSaveTransaction(newTx);
      } catch (err) {
        console.error('Error saving transaction:', err);
      }
    }

    // 2. Dispatch Email Receipt to user
    try {
      const emailPayload = {
        payeeName: payeeName || vpa,
        vpa,
        amount: numericAmount,
        category: selectedCategory,
        refNumber: refNumber || '',
        date: paymentTimestamp,
        appName: activeAppName || 'UPI'
      };

      const res = await fetch('/api/payments/send-receipt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify(emailPayload)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setEmailStatus('sent');
      } else {
        setEmailStatus('failed');
      }
    } catch (err) {
      console.warn('Could not send email receipt:', err);
      setEmailStatus('failed');
    }

    setIsConfirming(false);
    setCompletedPayment({
      vpa,
      payeeName: payeeName || vpa,
      amount: numericAmount,
      category: selectedCategory,
      refNumber,
      appName: activeAppName || 'UPI App'
    });
    setStep('success');
  };

  const formatInr = (n) =>
    isPrivacyMode
      ? '₹••••'
      : '₹' +
        Number(n || 0).toLocaleString('en-IN', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        });

  const resetAll = () => {
    stopCamera();
    setStep('input');
    setRawAmount('');
    setVpa('');
    setPayeeName('');
    setNotes('');
    setRefNumber('');
    setCompletedPayment(null);
    setEmailStatus('');
    onClose();
  };

  return (
    <div className="modal-backdrop" style={{ zIndex: 10050, padding: '12px' }}>
      <div
        className="modal-content"
        style={{
          maxWidth: '460px',
          width: '100%',
          maxHeight: '92vh',
          overflowY: 'auto',
          padding: '20px 18px',
          borderRadius: '24px',
          background: 'var(--bg-card, #0B132B)',
          border: '1px solid var(--border-glass, rgba(255, 255, 255, 0.1))',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8), 0 0 30px rgba(16, 185, 129, 0.12)'
        }}
      >
        {/* ===================== HEADER ===================== */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                color: '#000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 14px rgba(16, 185, 129, 0.45)',
                flexShrink: 0
              }}
            >
              <Zap size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '900', margin: 0, color: 'var(--text-main)', letterSpacing: '-0.3px' }}>
                  Smart-Pay
                </h2>
                <span
                  style={{
                    fontSize: '9.5px',
                    fontWeight: '800',
                    padding: '2px 6px',
                    borderRadius: '8px',
                    background: 'rgba(16, 185, 129, 0.15)',
                    color: '#10B981',
                    border: '1px solid rgba(16, 185, 129, 0.3)'
                  }}
                >
                  DIRECT UPI
                </span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Budget Shield • Zero Storage of Bank PIN or Passwords
              </div>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-ghost"
            onClick={resetAll}
            style={{ padding: '6px', borderRadius: '50%', color: 'var(--text-muted)' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Security Assurance Banner */}
        <div
          style={{
            padding: '7px 11px',
            borderRadius: '10px',
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '14px',
            fontSize: '11px',
            color: 'var(--text-main)'
          }}
        >
          <Lock size={13} style={{ color: '#10B981', flexShrink: 0 }} />
          <span>
            <strong>100% Authorized & Safe:</strong> Payment executes directly in your installed bank app (CRED, GPay, PhonePe).
          </span>
        </div>

        {/* ===================== VIEW 1: WAITING FOR COMPLETION ===================== */}
        {step === 'waiting' && (
          <div style={{ textAlign: 'center', padding: '10px 4px', animation: 'fadeIn 0.3s ease' }}>
            {/* Radar / Shield Glowing Animation */}
            <div style={{ position: 'relative', width: '110px', height: '110px', margin: '14px auto 20px auto' }}>
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(16, 185, 129, 0.25) 0%, rgba(16, 185, 129, 0) 70%)',
                  animation: 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite'
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: '8px',
                  borderRadius: '50%',
                  border: '2px dashed rgba(16, 185, 129, 0.6)',
                  animation: 'spin 12s linear infinite'
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: '16px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(6, 78, 59, 0.4) 100%)',
                  border: '2px solid #10B981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#10B981',
                  boxShadow: '0 0 25px rgba(16, 185, 129, 0.5)'
                }}
              >
                <Smartphone size={38} style={{ animation: 'bounce 2s infinite' }} />
              </div>
            </div>

            <h3 style={{ fontSize: '19px', fontWeight: '900', color: 'var(--text-main)', margin: '0 0 6px 0' }}>
              Payment in Progress in {activeAppName || 'UPI App'}
            </h3>
            <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: '0 0 16px 0', lineHeight: '1.4' }}>
              Complete the payment of <strong style={{ color: '#10B981' }}>{formatInr(numericAmount)}</strong> to{' '}
              <strong style={{ color: 'var(--text-main)' }}>{payeeName || vpa}</strong> in your UPI app.
            </p>

            {/* Live Timer Pill */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 12px',
                borderRadius: '20px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-glass)',
                fontSize: '11.5px',
                color: 'var(--text-muted)',
                marginBottom: '18px'
              }}
            >
              <RefreshCw size={12} style={{ animation: 'spin 4s linear infinite', color: '#10B981' }} />
              <span>Waiting for confirmation: {waitingElapsedSeconds}s</span>
            </div>

            {/* Optional UTR / Reference Input */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '14px',
                border: '1px solid var(--border-glass)',
                padding: '14px',
                textAlign: 'left',
                marginBottom: '16px'
              }}
            >
              <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                UPI Reference No / UTR (Optional, 12 Digits)
              </label>
              <input
                type="text"
                className="input"
                placeholder="e.g. 4287XXXXXXXX"
                value={refNumber}
                onChange={e => setRefNumber(e.target.value.replace(/[^0-9]/g, '').slice(0, 16))}
                style={{ width: '100%', fontSize: '13px', padding: '9px 12px', borderRadius: '10px' }}
              />
              <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '5px' }}>
                Found in your UPI app receipt or SMS after successful debit.
              </div>
            </div>

            {/* Confirmation Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConfirmPaymentCompletion}
                disabled={isConfirming}
                style={{
                  width: '100%',
                  padding: '13px',
                  borderRadius: '13px',
                  fontWeight: '800',
                  fontSize: '14px',
                  gap: '8px',
                  justifyContent: 'center',
                  boxShadow: '0 4px 18px rgba(16, 185, 129, 0.4)'
                }}
              >
                {isConfirming ? (
                  <>
                    <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                    Verifying & Syncing Ledger...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={18} />
                    I've Completed the Payment
                  </>
                )}
              </button>

              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setStep('input')}
                disabled={isConfirming}
                style={{ width: '100%', padding: '9px', fontSize: '12px', color: 'var(--text-muted)' }}
              >
                Back / Cancel Payment
              </button>
            </div>
          </div>
        )}

        {/* ===================== VIEW 2: FINAL CONFIRMATION & RECEIPT ===================== */}
        {step === 'success' && completedPayment && (
          <div style={{ textAlign: 'center', padding: '12px 4px', animation: 'fadeIn 0.3s ease' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#10B981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px auto',
                border: '2px solid #10B981',
                boxShadow: '0 0 25px rgba(16, 185, 129, 0.4)'
              }}
            >
              <CheckCircle2 size={36} />
            </div>

            <h3 style={{ fontSize: '20px', fontWeight: '900', color: 'var(--text-main)', margin: '0 0 4px 0' }}>
              Payment Recorded & Verified!
            </h3>
            <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: '0 0 16px 0' }}>
              Deducted from budget and saved in your personal ledger.
            </p>

            {/* Email Status Indicator */}
            {user?.email && (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 12px',
                  borderRadius: '20px',
                  background: emailStatus === 'sent' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.05)',
                  border: emailStatus === 'sent' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border-glass)',
                  fontSize: '11px',
                  color: emailStatus === 'sent' ? '#10B981' : 'var(--text-muted)',
                  marginBottom: '16px'
                }}
              >
                <Mail size={12} />
                <span>
                  {emailStatus === 'sent'
                    ? `Receipt emailed to ${user.email}`
                    : emailStatus === 'sending'
                    ? `Sending receipt to ${user.email}...`
                    : `Receipt scheduled for ${user.email}`}
                </span>
              </div>
            )}

            {/* Summary Details Card */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '16px',
                border: '1px solid var(--border-glass)',
                padding: '16px',
                textAlign: 'left',
                marginBottom: '18px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Payee:</span>
                <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)' }}>
                  {completedPayment.payeeName}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>UPI ID:</span>
                <span style={{ fontSize: '12.5px', fontFamily: 'monospace', color: '#38BDF8', fontWeight: '700' }}>
                  {completedPayment.vpa}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Category:</span>
                <span style={{ fontSize: '12.5px', fontWeight: '700', color: 'var(--text-main)' }}>
                  {completedPayment.category}
                </span>
              </div>
              {completedPayment.refNumber && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>UTR / Ref:</span>
                  <span style={{ fontSize: '12px', fontFamily: 'monospace', color: '#F59E0B', fontWeight: '700' }}>
                    {completedPayment.refNumber}
                  </span>
                </div>
              )}
              <div style={{ height: '1px', background: 'var(--border-glass)', margin: '10px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12.5px', fontWeight: '700', color: 'var(--text-main)' }}>Amount Deducted:</span>
                <span style={{ fontSize: '20px', fontWeight: '900', color: '#10B981' }}>
                  {formatInr(completedPayment.amount)}
                </span>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-primary"
              style={{ width: '100%', padding: '13px', borderRadius: '13px', fontWeight: '800', fontSize: '14px' }}
              onClick={resetAll}
            >
              Done & Return to Ledger
            </button>
          </div>
        )}

        {/* ===================== VIEW 3: PAYMENT INPUT FORM ===================== */}
        {step === 'input' && (
          <>
            {/* 2 Clean Tabs (Enter UPI ID & Scan QR) */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '6px',
                background: 'rgba(255, 255, 255, 0.05)',
                padding: '4px',
                borderRadius: '14px',
                marginBottom: '16px'
              }}
            >
              <button
                type="button"
                className={`btn btn-sm ${activeTab === 'manual' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => {
                  stopCamera();
                  setActiveTab('manual');
                }}
                style={{ borderRadius: '10px', fontSize: '12.5px', fontWeight: '700', gap: '6px', padding: '8px' }}
              >
                <Zap size={15} /> Enter UPI ID
              </button>
              <button
                type="button"
                className={`btn btn-sm ${activeTab === 'scan' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => {
                  setActiveTab('scan');
                  startCamera();
                }}
                style={{ borderRadius: '10px', fontSize: '12.5px', fontWeight: '700', gap: '6px', padding: '8px' }}
              >
                <QrCode size={15} /> Scan / Photo QR
              </button>
            </div>

            {/* TAB 1: Camera QR Scanner */}
            {activeTab === 'scan' && (
              <div>
                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    height: '220px',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    background: '#040914',
                    border: '2px dashed rgba(16, 185, 129, 0.4)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '12px'
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

                  {isScanningCamera && (
                    <div
                      style={{
                        position: 'absolute',
                        width: '160px',
                        height: '160px',
                        border: '2px solid #10B981',
                        borderRadius: '14px',
                        boxShadow: '0 0 20px rgba(16, 185, 129, 0.4)',
                        pointerEvents: 'none',
                        animation: 'pulse 1.8s infinite'
                      }}
                    >
                      <div style={{ position: 'absolute', top: '50%', left: '0', right: '0', height: '2px', background: '#10B981', opacity: 0.8 }} />
                    </div>
                  )}

                  {!isScanningCamera && (
                    <div style={{ textAlign: 'center', padding: '16px' }}>
                      <Camera size={36} style={{ color: 'var(--text-muted)', marginBottom: '8px', opacity: 0.6 }} />
                      <div style={{ fontSize: '13.5px', fontWeight: '800', color: 'var(--text-main)' }}>
                        Scan Any UPI Merchant QR
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>
                        PhonePe, Google Pay, Paytm, BharatPe
                      </div>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={startCamera}
                        style={{ marginTop: '12px', borderRadius: '10px', padding: '8px 16px', fontSize: '12px', fontWeight: '800' }}
                      >
                        <Camera size={14} /> Start Live Camera
                      </button>
                    </div>
                  )}
                </div>

                {cameraError && (
                  <div
                    style={{
                      padding: '10px 12px',
                      borderRadius: '12px',
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: '#FCA5A5',
                      fontSize: '11.5px',
                      marginBottom: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#EF4444', fontWeight: '800' }}>
                      <AlertTriangle size={15} />
                      <span>Camera Access Tip</span>
                    </div>
                    <div style={{ lineHeight: '1.4', color: 'var(--text-main)', fontSize: '11px' }}>
                      {cameraError}
                    </div>
                  </div>
                )}

                {/* 100% Mobile Compatible Native Capture Options */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {/* Native Mobile Shutter: Launches native phone camera app directly */}
                  <input
                    type="file"
                    ref={cameraInputRef}
                    accept="image/*"
                    capture="environment"
                    style={{ display: 'none' }}
                    onChange={e => handleImageFileScan(e.target.files?.[0])}
                  />
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => cameraInputRef.current?.click()}
                    style={{ width: '100%', padding: '11px', fontSize: '13px', borderRadius: '12px', gap: '8px', justifyContent: 'center', fontWeight: '800' }}
                  >
                    <Camera size={16} /> Take Photo of QR (Phone Camera)
                  </button>

                  {/* Gallery Upload */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={e => handleImageFileScan(e.target.files?.[0])}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => fileInputRef.current?.click()}
                    style={{ width: '100%', padding: '10px', fontSize: '12px', borderRadius: '12px', gap: '8px', justifyContent: 'center' }}
                  >
                    <Upload size={14} /> Upload QR Screenshot from Gallery
                  </button>

                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => {
                      stopCamera();
                      setActiveTab('manual');
                    }}
                    style={{ width: '100%', fontSize: '12px', borderRadius: '10px', padding: '6px', color: 'var(--text-muted)' }}
                  >
                    Or Enter UPI ID Manually <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: Manual VPA & Payment Confirmation */}
            {activeTab === 'manual' && (
              <div>
                {/* Responsive Inputs */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '14px' }}>
                  <div>
                    <label style={{ fontSize: '11.5px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '5px', display: 'block' }}>
                      Receiver UPI ID / VPA *
                    </label>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g. mobile@upi, merchant@okhdfcbank"
                      value={vpa}
                      onChange={e => setVpa(e.target.value.trim())}
                      style={{ width: '100%', borderRadius: '12px', fontSize: '13.5px', padding: '11px 12px' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '11.5px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '5px', display: 'block' }}>
                        Amount (₹) *
                      </label>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', fontWeight: '800', color: 'var(--text-main)', fontSize: '15px' }}>
                          ₹
                        </span>
                        <input
                          type="number"
                          step="any"
                          className="input"
                          placeholder="0.00"
                          value={rawAmount}
                          onChange={e => setRawAmount(e.target.value)}
                          style={{ width: '100%', paddingLeft: '26px', fontSize: '15px', fontWeight: '800', borderRadius: '12px', padding: '11px 12px 11px 26px' }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ fontSize: '11.5px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '5px', display: 'block' }}>
                        Category
                      </label>
                      <select
                        className="input"
                        value={selectedCategory}
                        onChange={e => setSelectedCategory(e.target.value)}
                        style={{ width: '100%', borderRadius: '12px', fontSize: '13px', padding: '11px 10px' }}
                      >
                        {categories.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '11.5px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '5px', display: 'block' }}>
                      Receiver Name / Merchant (Optional)
                    </label>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g. Swiggy, Friend, Chai Point"
                      value={payeeName}
                      onChange={e => setPayeeName(e.target.value)}
                      style={{ width: '100%', borderRadius: '12px', fontSize: '13px', padding: '10px 12px' }}
                    />
                  </div>
                </div>

                {/* 🛡️ PRE-PAYMENT BUDGET SHIELD BANNER */}
                <div
                  style={{
                    padding: '11px 13px',
                    borderRadius: '13px',
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
                    gap: '10px'
                  }}
                >
                  <div
                    style={{
                      color: shieldStatus === 'safe' ? '#10B981' : shieldStatus === 'warning' ? '#F59E0B' : '#EF4444',
                      marginTop: '2px'
                    }}
                  >
                    {shieldStatus === 'safe' ? (
                      <ShieldCheck size={18} />
                    ) : shieldStatus === 'warning' ? (
                      <AlertTriangle size={18} />
                    ) : (
                      <ShieldAlert size={18} />
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span
                        style={{
                          fontSize: '10.5px',
                          fontWeight: '800',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          color: shieldStatus === 'safe' ? '#10B981' : shieldStatus === 'warning' ? '#F59E0B' : '#EF4444'
                        }}
                      >
                        Budget Shield: {shieldStatus.toUpperCase()}
                      </span>
                      {isBudgetConfigured && (
                        <span style={{ fontSize: '10.5px', fontWeight: '700', color: 'var(--text-muted)' }}>
                          Budget: {formatInr(budgetLimit)}/mo
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '11.5px', fontWeight: '600', color: 'var(--text-main)', marginTop: '2px' }}>
                      {shieldMessage}
                    </div>

                    {isBudgetConfigured && (
                      <div style={{ marginTop: '6px' }}>
                        <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
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

                {/* 🚀 1-TAP UNIVERSAL UPI APP LAUNCHERS */}
                <div>
                  <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                    Pay via Installed UPI App
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '8px' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => handleLaunchPayment(phonepeUrl, 'PhonePe')}
                      disabled={!vpa || numericAmount <= 0}
                      style={{ padding: '11px 8px', fontSize: '12px', borderRadius: '12px', gap: '6px', fontWeight: '800', justifyContent: 'center' }}
                    >
                      <Zap size={14} style={{ color: '#5F259F' }} /> PhonePe
                    </button>

                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => handleLaunchPayment(gpayUrl, 'Google Pay')}
                      disabled={!vpa || numericAmount <= 0}
                      style={{ padding: '11px 8px', fontSize: '12px', borderRadius: '12px', gap: '6px', fontWeight: '800', justifyContent: 'center' }}
                    >
                      <Zap size={14} style={{ color: '#4285F4' }} /> Google Pay
                    </button>

                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => handleLaunchPayment(paytmUrl, 'Paytm')}
                      disabled={!vpa || numericAmount <= 0}
                      style={{ padding: '11px 8px', fontSize: '12px', borderRadius: '12px', gap: '6px', fontWeight: '800', justifyContent: 'center' }}
                    >
                      <Zap size={14} style={{ color: '#00BAF2' }} /> Paytm
                    </button>

                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => handleLaunchPayment(standardUpiUrl, 'CRED / Any UPI App')}
                      disabled={!vpa || numericAmount <= 0}
                      style={{ padding: '11px 8px', fontSize: '12px', borderRadius: '12px', gap: '6px', fontWeight: '800', justifyContent: 'center' }}
                    >
                      <ExternalLink size={14} /> CRED / Any App
                    </button>
                  </div>

                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => handleLaunchPayment('#manual', 'Direct UPI')}
                    disabled={!vpa || numericAmount <= 0}
                    style={{ width: '100%', fontSize: '11px', color: 'var(--text-muted)', padding: '7px' }}
                  >
                    Paid via web/desktop? Click to verify & log in ledger
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
