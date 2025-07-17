import React, { useState } from "react";
import CBOR from "cbor-js";

function LoginPage() {
  const [fcn, setFcn] = useState("");

  const handleProceed = async () => {
    if (fcn.length !== 16) {
      alert("Please enter a valid 16-character FCN number");
      return;
    }

    try {
      const response = await fetch("/api/register/begin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: fcn })
      });

      const optionsBuffer = await response.arrayBuffer();
      const decodedCBOR = CBOR.decode(optionsBuffer);

      const publicKey = decodedCBOR.publicKey;

      if (!publicKey || !publicKey.challenge || !publicKey.user?.id) {
        throw new Error("Invalid publicKey options received");
      }

      const base64urlToUint8Array = (base64url) => {
        const padding = "=".repeat((4 - base64url.length % 4) % 4);
        const base64 = (base64url + padding).replace(/-/g, "+").replace(/_/g, "/");
        const raw = window.atob(base64);
        const output = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
        return output;
      };

      publicKey.challenge = base64urlToUint8Array(publicKey.challenge);
      publicKey.user.id = base64urlToUint8Array(publicKey.user.id);

      if (publicKey.excludeCredentials) {
        publicKey.excludeCredentials = publicKey.excludeCredentials.map((cred) => ({
          ...cred,
          id: base64urlToUint8Array(cred.id)
        }));
      }

      const credential = await navigator.credentials.create({ publicKey });

      const attestationResponse = {
        id: credential.id,
        rawId: credential.rawId,
        response: {
          clientDataJSON: credential.response.clientDataJSON,
          attestationObject: credential.response.attestationObject
        },
        type: credential.type,
        username: fcn
      };

      const completeResponse = await fetch("/api/register/complete", {
        method: "POST",
        headers: { "Content-Type": "application/cbor" },
        body: CBOR.encode(attestationResponse)
      });

      const resultBuffer = await completeResponse.arrayBuffer();
      const decoded = CBOR.decode(resultBuffer);

      console.log("Registration complete response:", decoded);
      alert("Registration successful!");
    } catch (error) {
      console.error("Error:", error);
      alert("Registration failed. See console.");
    }
  };

  return (
    <div className="container">
      <p>Fido/passkey testing portal</p>

      <div className="login-form">
        <h3>Register passkey</h3>
        <label>Enter Your FCN Number</label>
        <input
          type="text"
          maxLength="16"
          value={fcn}
          onChange={(e) => setFcn(e.target.value)}
          placeholder="16-digit FCN"
        />
        <button onClick={handleProceed}>Register</button>
      </div>
    </div>  
  );
}

export default LoginPage;




