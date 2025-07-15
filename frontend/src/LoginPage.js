import React, { useState } from "react";
import CBOR from "cbor-js";

function base64urlToUint8Array(base64url) {
  if (!base64url) {
    throw new Error("base64url is undefined");
  }
  const padding = '='.repeat((4 - base64url.length % 4) % 4);
  const base64 = (base64url + padding).replace(/-/g, '+').replace(/_/g, '/');
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
  const [loading, setLoading] = useState(false);

  const handleProceed = async () => {
    if (!/^\d{16}$/.test(fcn)) {
      alert("Please enter a valid 16-digit FCN number");
      return;
    }

    setLoading(true);
    try {
      // Step 1: Begin registration
      const response = await fetch("http://192.168.8.83:8080/register/begin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: fcn })
      });

      const optionsBuffer = await response.arrayBuffer();

      let decodedCBOR;
      try {
        decodedCBOR = CBOR.decode(optionsBuffer);
      } catch (err) {
        console.error("CBOR decoding failed:", err);
        throw new Error("Invalid CBOR response from server.");
      }

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

      // Step 2: Create credential
      const credential = await navigator.credentials.create({ publicKey });

      if (!credential) {
        throw new Error("Credential creation failed or was cancelled");
      }

      console.log("Credential created:", credential);

      const attestationResponse = {
        id: credential.id,
        rawId: arrayBufferToBase64Url(credential.rawId),
        response: {
          clientDataJSON: arrayBufferToBase64Url(credential.response.clientDataJSON),
          attestationObject: arrayBufferToBase64Url(credential.response.attestationObject),
        },
        type: credential.type,
        username: fcn,
        clientExtensionResults: credential.getClientExtensionResults?.() || {}
      };

      // Step 3: Send registration completion
      const completeResponse = await fetch("http://192.168.8.83:8080/register/complete", {
        method: "POST",
        headers: { "Content-Type": "application/cbor" },
        body: CBOR.encode(attestationResponse)
      });

      const completeResultBuffer = await completeResponse.arrayBuffer();
      const decoded = CBOR.decode(completeResultBuffer);

      console.log("Registration complete response:", decoded);

      if (decoded?.status === "Registration successful") {
        alert("Registration successful!");
      } else {
        alert("Unexpected response from server.");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error during registration. See console.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h1>Welcome to the</h1>
      <h2>Fayda Resident Portal!</h2>
      <p>
        Here, you can effortlessly manage your identity details, enroll for services,
        and update your personal information with just a few clicks.
      </p>

      <div className="login-form">
        <h3>Log In</h3>
        <label>Please Enter Your FCN Number</label>
        <input
          type="text"
          maxLength="16"
          value={fcn}
          onChange={(e) => setFcn(e.target.value)}
          placeholder="Enter 16-digit FCN Number"
        />
        <button onClick={handleProceed} disabled={loading}>
          {loading ? "Processing..." : "Proceed"}
        </button>
      </div>
    </div>
  );
}

export default LoginPage;


