import React, { useState } from "react";
import CBOR from "cbor-js";

function base64urlToUint8Array(base64url) {
  if (!base64url) {
    throw new Error("base64url is undefined");
  }
  const padding = '='.repeat((4 - base64url.length % 4) % 4);
  const base64 = (base64url + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

function arrayBufferToBase64Url(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  bytes.forEach(b => binary += String.fromCharCode(b));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function LoginPage() {
  const [fcn, setFcn] = useState("");

  const handleProceed = async () => {
    if (fcn.length !== 16) {
      alert("Please enter a valid 16-character FCN number");
      return;
    }

    try {
      const response = await fetch("https://fido-frontend-352144635977.us-central1.run.app/register/begin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: fcn })
      });

      const optionsBuffer = await response.arrayBuffer();
      const decodedCBOR = CBOR.decode(optionsBuffer);

      console.log("Decoded CBOR registration options:", decodedCBOR);

      const publicKey = decodedCBOR.publicKey;

      if (!publicKey || !publicKey.challenge || !publicKey.user || !publicKey.user.id) {
        throw new Error("Invalid publicKey options received");
      }

      publicKey.challenge = base64urlToUint8Array(publicKey.challenge);
      publicKey.user.id = base64urlToUint8Array(publicKey.user.id);

      if (publicKey.excludeCredentials) {
        publicKey.excludeCredentials = publicKey.excludeCredentials.map(cred => ({
          ...cred,
          id: base64urlToUint8Array(cred.id)
        }));
      }

      console.log("Processed registration options for navigator.credentials.create:", publicKey);

      const credential = await navigator.credentials.create({ publicKey });

      console.log("Credential created:", credential);

      const attestationResponse = {
        id: credential.id,
        rawId: arrayBufferToBase64Url(credential.rawId),
        response: {
          clientDataJSON: arrayBufferToBase64Url(credential.response.clientDataJSON),
          attestationObject: arrayBufferToBase64Url(credential.response.attestationObject),
        },
        type: credential.type,
        username: fcn
      };

      const completeResponse = await fetch("/register/complete", {
        method: "POST",
        headers: { "Content-Type": "application/cbor" },
        body: CBOR.encode(attestationResponse)
      });

      const completeResultBuffer = await completeResponse.arrayBuffer();
      const decoded = CBOR.decode(completeResultBuffer);

      console.log("Registration complete response:", decoded);
      alert("Registration successful!");

    } catch (error) {
      console.error("Error:", error);
      alert("Error during registration. See console.");
    }
  };

  return (
    <div className="container">
      <h1>Welcome to the</h1>
      <h2>Fayda Resident Portal!</h2>
      <p>Here, you can effortlessly manage your identity details, enroll for services, and update your personal information with just a few clicks.</p>

      <div className="login-form">
        <h3>Log In</h3>
        <label>Please Enter Your FCN Number</label>
        <input
          type="text"
          maxLength="16"
          value={fcn}
          onChange={(e) => setFcn(e.target.value)}
          placeholder="Enter 16-character FCN Number"
        />
        <button onClick={handleProceed}>Proceed</button>
      </div>
    </div>
  );
}

export default LoginPage;


