/**
 * Client-side Device Identification & Fingerprinting Helper
 * Detects Device Model, OS, Browser, and manages persistent Device UUID
 */

export function getOrCreateDeviceId() {
  const STORAGE_KEY = 'kuberis_device_id';
  let deviceId = localStorage.getItem(STORAGE_KEY);
  if (!deviceId) {
    deviceId = `dev_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem(STORAGE_KEY, deviceId);
  }
  return deviceId;
}

export async function detectDeviceDetails() {
  const userAgent = navigator.userAgent || '';
  let model = '';
  let platform = navigator.platform || '';
  let os = 'Unknown OS';
  let browser = 'Unknown Browser';

  // 1. High-Entropy User-Agent Client Hints (Supported on Chrome, Edge, Android Webview)
  if (navigator.userAgentData && typeof navigator.userAgentData.getHighEntropyValues === 'function') {
    try {
      const hints = await navigator.userAgentData.getHighEntropyValues(['model', 'platform', 'platformVersion']);
      if (hints.model) model = hints.model;
      if (hints.platform) platform = hints.platform;
      if (hints.platform === 'Windows') {
        const majorVer = parseInt(hints.platformVersion?.split('.')[0] || '0', 10);
        os = majorVer >= 13 ? 'Windows 11' : 'Windows 10';
      } else if (hints.platform === 'Android') {
        os = `Android ${hints.platformVersion || ''}`.trim();
      } else if (hints.platform === 'macOS') {
        os = 'macOS';
      }
    } catch (e) {
      // High-entropy hints failed or denied, proceed with UA parsing
    }
  }

  // 2. User-Agent Parsing Fallback
  if (!model || os === 'Unknown OS') {
    // Android Device Model extraction (e.g. "SM-A166P", "Pixel 8", "OnePlus 12")
    const androidModelMatch = userAgent.match(/Android\s+([0-9\.]+);(?:\s+[^;]+;\s+)?([^;\)\/]+)/i);
    if (androidModelMatch) {
      if (os === 'Unknown OS') os = `Android ${androidModelMatch[1]}`;
      if (!model) {
        let extractedModel = androidModelMatch[2].trim();
        // Remove build numbers e.g. "Build/UP1A.231005.007"
        extractedModel = extractedModel.split('Build/')[0].trim();
        if (extractedModel && !extractedModel.toLowerCase().includes('wv')) {
          model = extractedModel;
        }
      }
    }

    // Apple Devices (iPhone, iPad, Mac)
    if (/iPhone/i.test(userAgent)) {
      model = 'Apple iPhone';
      const iosMatch = userAgent.match(/OS\s+([0-9_]+)/i);
      os = iosMatch ? `iOS ${iosMatch[1].replace(/_/g, '.')}` : 'iOS';
    } else if (/iPad/i.test(userAgent)) {
      model = 'Apple iPad';
      const iosMatch = userAgent.match(/OS\s+([0-9_]+)/i);
      os = iosMatch ? `iPadOS ${iosMatch[1].replace(/_/g, '.')}` : 'iPadOS';
    } else if (/Macintosh|Mac OS X/i.test(userAgent)) {
      model = 'Apple Mac';
      os = 'macOS';
    } else if (/Windows NT 10.0/i.test(userAgent)) {
      model = 'Windows PC';
      os = 'Windows 10/11';
    } else if (/Windows NT/i.test(userAgent)) {
      model = 'Windows PC';
      os = 'Windows';
    } else if (/Linux/i.test(userAgent) && !/Android/i.test(userAgent)) {
      model = 'Linux PC';
      os = 'Linux';
    }
  }

  // 3. Browser Extraction
  if (/Edg\//i.test(userAgent)) {
    browser = 'Edge';
  } else if (/Chrome\//i.test(userAgent) && !/Edg\//i.test(userAgent)) {
    browser = 'Chrome';
  } else if (/Safari\//i.test(userAgent) && !/Chrome\//i.test(userAgent)) {
    browser = 'Safari';
  } else if (/Firefox\//i.test(userAgent)) {
    browser = 'Firefox';
  } else if (/SamsungBrowser\//i.test(userAgent)) {
    browser = 'Samsung Internet';
  }

  // Brand Name prefixes for common Android models
  if (model.startsWith('SM-')) {
    model = `Samsung ${model}`;
  }

  // Compose CoinDCX-style clean formatted device string
  // Examples: "Samsung SM-A166P - Android 14", "Windows 11 PC - Chrome", "Apple iPhone - iOS 17.4"
  let formattedDeviceName = '';
  if (model && os && os !== 'Unknown OS') {
    formattedDeviceName = `${model} - ${os}`;
  } else if (model) {
    formattedDeviceName = `${model} - ${browser}`;
  } else {
    formattedDeviceName = `${os} - ${browser}`;
  }

  return {
    deviceId: getOrCreateDeviceId(),
    deviceName: formattedDeviceName,
    model: model || 'PC/Mobile',
    os,
    browser
  };
}

export function getDeviceHeaders() {
  const deviceId = getOrCreateDeviceId();
  const cachedName = localStorage.getItem('kuberis_device_name') || '';
  return {
    'X-Device-Id': deviceId,
    ...(cachedName ? { 'X-Device-Name': cachedName } : {})
  };
}

// Automatically initialize and cache device name
if (typeof window !== 'undefined') {
  detectDeviceDetails().then(details => {
    if (details.deviceName) {
      localStorage.setItem('kuberis_device_name', details.deviceName);
    }
  }).catch(() => {});
}
