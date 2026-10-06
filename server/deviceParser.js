/**
 * Server-side Device and Client Parser
 * Parses User-Agent and headers into clean device strings matching CoinDCX:
 * e.g. "Samsung SM-A166P - Android 16.0" or "Windows 11 PC - Chrome 124"
 */

export function parseDeviceDetails(req) {
  // Check if client explicitly sent custom device headers
  const headerDeviceId = req.headers['x-device-id'] || req.body?.deviceId || '';
  const headerDeviceName = req.headers['x-device-name'] || req.body?.deviceName || '';

  const userAgent = (req.headers['user-agent'] || '').trim();

  let model = '';
  let os = 'Unknown OS';
  let browser = 'Unknown Browser';

  // 1. Android model detection
  const androidMatch = userAgent.match(/Android\s+([0-9\.]+);(?:\s+[^;]+;\s+)?([^;\)\/]+)/i);
  if (androidMatch) {
    os = `Android ${androidMatch[1]}`;
    let extractedModel = androidMatch[2].split('Build/')[0].trim();
    if (extractedModel && !extractedModel.toLowerCase().includes('wv')) {
      model = extractedModel;
      if (model.startsWith('SM-')) {
        model = `Samsung ${model}`;
      }
    }
  }

  // 2. iOS Devices
  if (/iPhone/i.test(userAgent)) {
    model = 'Apple iPhone';
    const match = userAgent.match(/OS\s+([0-9_]+)/i);
    os = match ? `iOS ${match[1].replace(/_/g, '.')}` : 'iOS';
  } else if (/iPad/i.test(userAgent)) {
    model = 'Apple iPad';
    const match = userAgent.match(/OS\s+([0-9_]+)/i);
    os = match ? `iPadOS ${match[1].replace(/_/g, '.')}` : 'iPadOS';
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

  // 3. Browser detection
  if (/Edg\/([0-9]+)/i.test(userAgent)) {
    const v = userAgent.match(/Edg\/([0-9]+)/i);
    browser = `Edge ${v ? v[1] : ''}`.trim();
  } else if (/Chrome\/([0-9]+)/i.test(userAgent) && !/Edg\//i.test(userAgent)) {
    const v = userAgent.match(/Chrome\/([0-9]+)/i);
    browser = `Chrome ${v ? v[1] : ''}`.trim();
  } else if (/Safari\//i.test(userAgent) && !/Chrome\//i.test(userAgent)) {
    browser = 'Safari';
  } else if (/Firefox\/([0-9]+)/i.test(userAgent)) {
    const v = userAgent.match(/Firefox\/([0-9]+)/i);
    browser = `Firefox ${v ? v[1] : ''}`.trim();
  } else if (/SamsungBrowser/i.test(userAgent)) {
    browser = 'Samsung Internet';
  }

  // Prioritize client header if provided and detailed
  let deviceName = headerDeviceName;
  if (!deviceName) {
    if (model && os && os !== 'Unknown OS') {
      deviceName = `${model} - ${os}`;
    } else if (model) {
      deviceName = `${model} - ${browser}`;
    } else if (os && os !== 'Unknown OS') {
      deviceName = `${os} - ${browser}`;
    } else {
      deviceName = `Web Browser - ${browser}`;
    }
  }

  return {
    deviceId: headerDeviceId || 'unknown_device',
    deviceName,
    model: model || 'Device',
    os,
    browser
  };
}
