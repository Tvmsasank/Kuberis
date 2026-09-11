/**
 * WebAuthn Native Biometric & Passkey Helper
 * Supports Apple Face ID / Touch ID, Android Fingerprint, Windows Hello
 */

function bufferToBase64Url(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlToBuffer(base64url) {
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function isBiometricsAvailable() {
  if (window.PublicKeyCredential && typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
    try {
      return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch (e) {
      return false;
    }
  }
  return false;
}

export async function registerBiometricPasskey(user, token) {
  if (!window.PublicKeyCredential) {
    throw new Error('Biometric WebAuthn authentication is not supported on this browser');
  }

  const userIdBuffer = new TextEncoder().encode(user.id || user.email);
  const challengeBuffer = crypto.getRandomValues(new Uint8Array(32));

  // Current domain hostname for WebAuthn RP ID
  const hostname = window.location.hostname;
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';

  const creationOptions = {
    publicKey: {
      rp: {
        name: 'Kuberis Financial OS',
        ...(isLocalhost ? {} : { id: hostname })
      },
      user: {
        id: userIdBuffer,
        name: user.email,
        displayName: user.name || user.email
      },
      challenge: challengeBuffer,
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' },  // ES256
        { alg: -257, type: 'public-key' } // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'preferred',
        residentKey: 'preferred',
        requireResidentKey: false
      },
      timeout: 60000
    }
  };

  let credential;
  try {
    credential = await navigator.credentials.create(creationOptions);
  } catch (e) {
    if (e.name === 'NotAllowedError') {
      throw new Error('Passkey creation timed out or was cancelled. Please try again.');
    }
    throw new Error(e.message || 'Biometric registration cancelled');
  }

  if (!credential) throw new Error('Biometric registration cancelled or failed');

  const credentialId = credential.id;
  const rawIdBase64 = bufferToBase64Url(credential.rawId);

  const res = await fetch('/api/auth/webauthn/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      credentialId,
      rawId: rawIdBase64,
      publicKey: credentialId
    })
  });

  let json;
  try {
    json = await res.json();
  } catch (e) {
    throw new Error('API server connection lost.');
  }

  if (!res.ok) throw new Error(json.error || 'Failed to register biometrics');

  localStorage.setItem('kuberis_biometric_credential', credentialId);
  localStorage.setItem('kuberis_biometric_raw_id', rawIdBase64);
  localStorage.setItem('kuberis_has_biometrics', 'true');
  localStorage.setItem('kuberis_remembered_email', user.email);
  return json;
}

export async function authenticateWithBiometrics(targetEmail) {
  const email = targetEmail || localStorage.getItem('kuberis_remembered_email') || localStorage.getItem('wealthpulse_remembered_email') || localStorage.getItem('ledgerly_remembered_email');
  const rawIdBase64 = localStorage.getItem('kuberis_biometric_raw_id') || localStorage.getItem('wealthpulse_biometric_raw_id');
  const credentialId = localStorage.getItem('kuberis_biometric_credential') || localStorage.getItem('wealthpulse_biometric_credential') || localStorage.getItem('ledgerly_biometric_credential');

  if (!window.PublicKeyCredential) {
    throw new Error('Biometric WebAuthn passkeys are not supported on this device/browser');
  }

  if (!email) {
    throw new Error('Please enter your account email address first to use Face ID / Passkey');
  }

  if (!credentialId && !rawIdBase64) {
    throw new Error('No Passkey found on this device. Sign in with your password and enable Face ID in User Profile.');
  }

  const challengeBuffer = crypto.getRandomValues(new Uint8Array(32));
  const hostname = window.location.hostname;
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';

  const allowCredentials = [];
  if (rawIdBase64) {
    try {
      allowCredentials.push({
        id: base64UrlToBuffer(rawIdBase64),
        type: 'public-key',
        transports: ['internal']
      });
    } catch (e) {
      // Fallback
    }
  }

  const requestOptions = {
    publicKey: {
      challenge: challengeBuffer,
      ...(isLocalhost ? {} : { rpId: hostname }),
      ...(allowCredentials.length > 0 ? { allowCredentials } : {}),
      userVerification: 'preferred',
      timeout: 60000
    }
  };

  let assertion;
  try {
    assertion = await navigator.credentials.get(requestOptions);
  } catch (e) {
    if (e.name === 'NotAllowedError') {
      throw new Error('Passkey scan prompt was closed or cancelled.');
    }
    throw new Error(e.message || 'Biometric verification cancelled');
  }

  if (!assertion) throw new Error('Biometric verification cancelled');

  const finalCredentialId = assertion.id || credentialId;

  const res = await fetch('/api/auth/webauthn/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      credentialId: finalCredentialId
    })
  });

  let json;
  try {
    json = await res.json();
  } catch (e) {
    throw new Error('API server connection lost.');
  }

  if (!res.ok) throw new Error(json.error || 'Biometric authentication failed');

  return json;
}
