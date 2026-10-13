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
  Info
} from 'lucide-react';
import jsQR from 'jsqr';

export default function SmartPayModal({
  isOpen,
  onClose,
  budgets = [],
  categories = [],
  transactions = [],
  onSaveTransaction,
  isPrivacyMode = false
}) {
  if (!isOpen) return null;

  // Tabs: 'scan' | 'manual'
  const [activeTab, setActiveTab] = useState('scan');

  // Payment Form State
  const [vpa, setVpa] = useState('');
  const [payeeName, setPayeeName] = useState('');
  const [rawAmount, setRawAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [notes, setNotes] = useState('');

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

    if (!navigator?.mediaDevices?.getUserMedia) {
      setCameraError('Camera API is not supported in this browser or requires HTTPS. Use the Upload QR button or enter UPI ID manually.');
      setIsScanningCamera(false);
      return;
    }

    try {
      // First attempt environment (rear) camera
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false
        });
      } catch (errEnvironment) {
        // Fallback to any available video camera
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        scanVideoFrame();
      }
    } catch (err) {
      console.error('Camera access error:', err);
      let errMsg = 'Unable to access camera.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errMsg = 'Camera permission was denied. Tap browser settings (lock icon / address bar) → Site permissions → Allow Camera, or upload a QR screenshot.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errMsg = 'No camera found on this device. Please upload a QR screenshot.';
      } else {
        errMsg = 'Camera is in use by another app or permissions are blocked. Please upload a QR screenshot or type VPA.';
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
          setCameraError('No valid UPI QR code detected in the selected image. Please try another screenshot.');
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
        setCameraError('Scanned QR is not an official UPI payment QR code.');
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

  // Real-Time Calculations
  const numericAmount = Math.max(0, parseFloat(rawAmount) || 0);

  // Pre-Payment Budget Shield Evaluation
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
  const spentPctBefore = isBudgetConfigured ? (spentThisMonth / budgetLimit) * 100 : 0;
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

  // Generate Official UPI Intent URLs
  const encodedPn = encodeURIComponent(payeeName || 'Merchant');
  const encodedTn = encodeURIComponent(notes || 'Payment via Kuberis');
  const baseUpiParams = `pa=${encodeURIComponent(vpa)}&pn=${encodedPn}&am=${numericAmount.toFixed(2)}&cu=INR&tn=${encodedTn}`;

  const standardUpiUrl = `upi://pay?${baseUpiParams}`;
  const gpayUrl = `tez://upi/pay?${baseUpiParams}`;
  const phonepeUrl = `phonepe://pay?${baseUpiParams}`;
  const paytmUrl = `paytmmp://pay?${baseUpiParams}`;

  // Handle Launching Payment & Ledger Recording
  const handleLaunchPayment = async (intentUrl, appName) => {
    if (!vpa || numericAmount <= 0) {
      alert('Please enter a valid UPI ID and Amount.');
      return;
    }

    // Launch native UPI app via Android/iOS Intent
    if (intentUrl.startsWith('upi://') || intentUrl.startsWith('tez://') || intentUrl.startsWith('phonepe://') || intentUrl.startsWith('paytmmp://')) {
      window.location.href = intentUrl;
    }

    // Auto-record in personal ledger
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
        console.error('Error recording ledger entry:', err);
      }
    }

    setPaymentSuccessData({
      vpa,
      payeeName: payeeName || vpa,
      amount: numericAmount,
      appName: appName || 'UPI App',
      category: selectedCategory
    });
  };

  const formatInr = (n) =>
    isPrivacyMode
      ? '₹••••'
      : '₹' +
        Number(n || 0).toLocaleString('en-IN', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        });

  return (
    <div className="modal-backdrop" style={{ zIndex: 10050, padding: '12px' }}>
      <div
        className="modal-content"
        style={{
          maxWidth: '480px',
          width: '100%',
          maxHeight: '92vh',
          overflowY: 'auto',
          padding: '20px 18px',
          borderRadius: '20px',
          background: 'var(--bg-card, #0B132B)',
          border: '1px solid var(--border-glass)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.75), 0 0 25px rgba(16, 185, 129, 0.12)'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '11px',
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                color: '#000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 12px rgba(16, 185, 129, 0.45)',
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
                  SECURE UPI INTENT
                </span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Pre-Payment Budget Shield • Zero Bank Data Stored
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

        {/* Security & Regulatory Safety Assurance Pill */}
        <div
          style={{
            padding: '8px 12px',
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
            <strong>100% Authorized & Secure:</strong> Handled entirely by your device’s UPI apps (CRED, GPay, PhonePe). Kuberis never touches your bank balance or MPIN.
          </span>
        </div>

        {/* Payment Confirmation Receipt */}
        {paymentSuccessData ? (
          <div style={{ textAlign: 'center', padding: '16px 4px', animation: 'fadeIn 0.3s ease' }}>
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#10B981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 14px auto',
                border: '2px solid #10B981',
                boxShadow: '0 0 20px rgba(16, 185, 129, 0.35)'
              }}
            >
              <CheckCircle2 size={34} />
            </div>

            <h3 style={{ fontSize: '20px', fontWeight: '900', color: 'var(--text-main)', marginBottom: '4px' }}>
              Handed off to {paymentSuccessData.appName}!
            </h3>
            <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Transaction logged in your personal ledger automatically.
            </p>

            <div
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '14px',
                border: '1px solid var(--border-color)',
                padding: '16px',
                textAlign: 'left',
                marginBottom: '18px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Payee:</span>
                <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)' }}>
                  {paymentSuccessData.payeeName} ({paymentSuccessData.vpa})
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Category:</span>
                <span style={{ fontSize: '12.5px', fontWeight: '700', color: 'var(--text-main)' }}>
                  {paymentSuccessData.category}
                </span>
              </div>
              <div style={{ height: '1px', background: 'var(--border-color)', margin: '8px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12.5px', fontWeight: '700', color: 'var(--text-main)' }}>Amount Paid:</span>
                <span style={{ fontSize: '18px', fontWeight: '900', color: 'var(--primary)' }}>
                  {formatInr(paymentSuccessData.amount)}
                </span>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px', borderRadius: '12px', fontWeight: '800', fontSize: '13.5px' }}
              onClick={() => {
                setPaymentSuccessData(null);
                setRawAmount('');
                setVpa('');
                setPayeeName('');
                setNotes('');
                onClose();
              }}
            >
              Done & Return
            </button>
          </div>
        ) : (
          <>
            {/* 2 Clean Tabs (Scan QR & Pay VPA) */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '6px',
                background: 'rgba(255, 255, 255, 0.05)',
                padding: '4px',
                borderRadius: '12px',
                marginBottom: '16px'
              }}
            >
              <button
                type="button"
                className={`btn btn-sm ${activeTab === 'scan' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => {
                  setActiveTab('scan');
                  startCamera();
                }}
                style={{ borderRadius: '9px', fontSize: '12px', fontWeight: '700', gap: '6px', padding: '8px' }}
              >
                <QrCode size={15} /> Scan QR Code
              </button>
              <button
                type="button"
                className={`btn btn-sm ${activeTab === 'manual' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => {
                  stopCamera();
                  setActiveTab('manual');
                }}
                style={{ borderRadius: '9px', fontSize: '12px', fontWeight: '700', gap: '6px', padding: '8px' }}
              >
                <Zap size={15} /> Enter UPI ID
              </button>
            </div>

            {/* TAB 1: Camera QR Scanner */}
            {activeTab === 'scan' && (
              <div>
                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    height: '240px',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    background: '#040914',
                    border: '2px dashed rgba(16, 185, 129, 0.4)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '14px'
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
                        width: '170px',
                        height: '170px',
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
                      <Camera size={40} style={{ color: 'var(--text-muted)', marginBottom: '10px', opacity: 0.6 }} />
                      <div style={{ fontSize: '13.5px', fontWeight: '700', color: 'var(--text-main)' }}>
                        Point Camera at Any Merchant UPI QR
                      </div>
                      <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Scan PhonePe, GPay, Paytm, BharatPe
                      </div>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={startCamera}
                        style={{ marginTop: '14px', borderRadius: '10px', padding: '8px 16px', fontSize: '12.5px', fontWeight: '800' }}
                      >
                        <Camera size={14} /> Start Camera Scanner
                      </button>
                    </div>
                  )}
                </div>

                {cameraError && (
                  <div
                    style={{
                      padding: '12px 14px',
                      borderRadius: '12px',
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: '#FCA5A5',
                      fontSize: '12px',
                      marginBottom: '14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#EF4444', fontWeight: '700' }}>
                      <AlertTriangle size={16} />
                      <span>Camera Access Tip</span>
                    </div>
                    <div style={{ lineHeight: '1.45', color: 'var(--text-main)', fontSize: '11.5px' }}>
                      {cameraError}
                    </div>
                  </div>
                )}

                {/* Upload Image Alternative */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
                    style={{ width: '100%', padding: '10px', fontSize: '12.5px', borderRadius: '11px', gap: '6px', justifyContent: 'center' }}
                  >
                    <Upload size={15} /> Upload QR Screenshot from Gallery
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => {
                      stopCamera();
                      setActiveTab('manual');
                    }}
                    style={{ width: '100%', fontSize: '12px', borderRadius: '11px', padding: '8px' }}
                  >
                    Or Enter UPI ID Manually <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: Manual VPA & Payment Confirmation */}
            {activeTab === 'manual' && (
              <div>
                {/* Responsive Inputs: Stack vertically on mobile */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '14px' }}>
                  <div>
                    <label style={{ fontSize: '11.5px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                      Recipient UPI ID / VPA *
                    </label>
                    <input
                      type="text"
                      className="input"
                      placeholder="merchant@upi or mobile@okhdfcbank"
                      value={vpa}
                      onChange={e => setVpa(e.target.value)}
                      style={{ width: '100%', borderRadius: '10px', fontSize: '13px', padding: '10px 12px' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '11.5px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                        Amount (₹) *
                      </label>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontWeight: '800', color: 'var(--text-main)', fontSize: '14px' }}>
                          ₹
                        </span>
                        <input
                          type="number"
                          step="any"
                          className="input"
                          placeholder="0.00"
                          value={rawAmount}
                          onChange={e => setRawAmount(e.target.value)}
                          style={{ width: '100%', paddingLeft: '24px', fontSize: '15px', fontWeight: '800', borderRadius: '10px' }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ fontSize: '11.5px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                        Category
                      </label>
                      <select
                        className="input"
                        value={selectedCategory}
                        onChange={e => setSelectedCategory(e.target.value)}
                        style={{ width: '100%', borderRadius: '10px', fontSize: '12.5px', padding: '9px 10px' }}
                      >
                        {categories.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '11.5px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                      Payee / Merchant Name (Optional)
                    </label>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g. Swiggy, Groceries, Friend"
                      value={payeeName}
                      onChange={e => setPayeeName(e.target.value)}
                      style={{ width: '100%', borderRadius: '10px', fontSize: '12.5px', padding: '9px 12px' }}
                    />
                  </div>
                </div>

                {/* 🛡️ PRE-PAYMENT BUDGET SHIELD BANNER */}
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: '12px',
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
                      <ShieldCheck size={20} />
                    ) : shieldStatus === 'warning' ? (
                      <AlertTriangle size={20} />
                    ) : (
                      <ShieldAlert size={20} />
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
                        <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)' }}>
                          Budget: {formatInr(budgetLimit)}/mo
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-main)', marginTop: '2px' }}>
                      {shieldMessage}
                    </div>

                    {isBudgetConfigured && (
                      <div style={{ marginTop: '6px' }}>
                        <div style={{ width: '100%', height: '5px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
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
                  <div style={{ fontSize: '11.5px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                    Pay via Installed UPI App
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '8px' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => handleLaunchPayment(phonepeUrl, 'PhonePe')}
                      disabled={!vpa || numericAmount <= 0}
                      style={{ padding: '10px 8px', fontSize: '12px', borderRadius: '11px', gap: '6px', fontWeight: '800', justifyContent: 'center' }}
                    >
                      <Zap size={14} style={{ color: '#5F259F' }} /> PhonePe
                    </button>

                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => handleLaunchPayment(gpayUrl, 'Google Pay')}
                      disabled={!vpa || numericAmount <= 0}
                      style={{ padding: '10px 8px', fontSize: '12px', borderRadius: '11px', gap: '6px', fontWeight: '800', justifyContent: 'center' }}
                    >
                      <Zap size={14} style={{ color: '#4285F4' }} /> Google Pay
                    </button>

                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => handleLaunchPayment(paytmUrl, 'Paytm')}
                      disabled={!vpa || numericAmount <= 0}
                      style={{ padding: '10px 8px', fontSize: '12px', borderRadius: '11px', gap: '6px', fontWeight: '800', justifyContent: 'center' }}
                    >
                      <Zap size={14} style={{ color: '#00BAF2' }} /> Paytm
                    </button>

                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => handleLaunchPayment(standardUpiUrl, 'CRED / UPI')}
                      disabled={!vpa || numericAmount <= 0}
                      style={{ padding: '10px 8px', fontSize: '12px', borderRadius: '11px', gap: '6px', fontWeight: '800', justifyContent: 'center' }}
                    >
                      <ExternalLink size={14} /> CRED / Any App
                    </button>
                  </div>

                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => handleLaunchPayment('#manual', 'Manual UPI')}
                    disabled={!vpa || numericAmount <= 0}
                    style={{ width: '100%', fontSize: '11px', color: 'var(--text-muted)', padding: '6px' }}
                  >
                    Already paid? Click to record in ledger only
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
