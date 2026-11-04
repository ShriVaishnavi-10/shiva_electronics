import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { apiUrl } from "../config/urls";
import { User, Lock, Eye, EyeOff, ArrowRight, Check } from "lucide-react";

const Login = () => {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(apiUrl("auth/login"), { username, password });

      if (response.data && response.data.message === "Login successful") {
        toast.success("Login successful!");

        if (response.data.token) {
          localStorage.setItem("token", response.data.token);
        }

        if (response.data.user) {
          const storedUser = {
            ...response.data.user,
            displayName:
              response.data.user.full_name ||
              response.data.user.username ||
              username,
          };
          localStorage.setItem("user", JSON.stringify(storedUser));

          const branches = response.data.user.branches || [];
          if (branches.length > 0) {
            localStorage.setItem("activeBranchId", String(branches[0].branch_id));
          } else {
            localStorage.setItem("activeBranchId", "2");
          }
        } else {
          localStorage.setItem(
            "user",
            JSON.stringify({ username, displayName: username }),
          );
        }

        const roleLower = String(response.data.user?.role_name || response.data.user?.role || "").toLowerCase();
        const isSales = roleLower.includes("sales") || response.data.user?.role_id === 7;
        const isCashierUser = response.data.user?.is_cashier || roleLower.includes("cashier") || response.data.user?.role_id === 8;

        if (response.data.redirect) {
          navigate(response.data.redirect);
        } else if (isSales) {
          navigate("/hrms/dashboard");
        } else if (isCashierUser) {
          navigate("/index/salesList");
        } else {
          navigate("/index/overview");
        }
      } else {
        toast.error(response.data.message || "Login failed. Please try again.");
      }
    } catch (error) {
      console.error("Login API error:", error);
      toast.error(
        error.response?.data?.message ||
          "Login failed. Please check your credentials.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="shiva-login-root">
      {/* High-Visibility Showroom Background with Slow Cinematic Zoom */}
      <div className="showroom-bg-layer" />

      {/* Light Ultra-Subtle Vignette to Keep Showroom Vividly Visible */}
      <div className="light-vignette-layer" />

      {/* Golden Floor Uplights Mirroring Panels */}
      <div className="floor-glow-left" />
      <div className="floor-glow-right" />

      {/* Main Two-Panel Center Container */}
      <div className="panels-container">
        {/* ============================================================== */}
        {/* LEFT PANEL: Login Credentials (Ultra-Clear Glassmorphism)      */}
        {/* ============================================================== */}
        <div className="glass-panel left-panel">
          {/* Prismatic Top Edge Highlight */}
          <div className="panel-top-highlight" />

          {/* Diagonal Glass Sheen Reflection */}
          <div className="glass-reflection-sweep" />

          {/* Heading */}
          <div className="panel-header">
            <h1 className="welcome-title">
              Welcome <span className="gold-highlight">Back</span>
            </h1>
            <p className="welcome-subtitle">
              Sign in to access the management portal
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="login-form">
            {/* Username / Operator ID Field */}
            <div className="input-group-container">
              <label htmlFor="username" className="input-label">
                Username / Operator ID
              </label>
              <div className="input-capsule">
                <User className="input-icon" size={19} />
                <input
                  id="username"
                  type="text"
                  placeholder="9626394336"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                  autoFocus
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="input-group-container">
              <label htmlFor="password" className="input-label">
                Password
              </label>
              <div className="input-capsule">
                <Lock className="input-icon" size={19} />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="eye-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="controls-row">
              <label className="remember-me-label" onClick={() => setRememberMe(!rememberMe)}>
                <div className={`custom-checkbox ${rememberMe ? "checked" : ""}`}>
                  {rememberMe && <Check size={13} strokeWidth={3.5} className="check-icon" />}
                </div>
                <span>Remember me</span>
              </label>
            </div>

            {/* Large Golden Gradient Sign-In Button */}
            <button
              type="submit"
              className="gold-signin-button"
              disabled={loading}
            >
              <span className="button-text">
                {loading ? "Authenticating..." : "Sign In to Portal"}
              </span>
              <ArrowRight className="button-arrow" size={20} />
            </button>
          </form>
        </div>

        {/* ============================================================== */}
        {/* RIGHT PANEL: Large Shiva Electronics Logo (Ultra-Clear Glass)  */}
        {/* ============================================================== */}
        <div className="glass-panel right-panel">
          {/* Prismatic Top Edge Highlight */}
          <div className="panel-top-highlight" />

          {/* Diagonal Glass Sheen Reflection */}
          <div className="glass-reflection-sweep" />

          {/* Decorative Golden Filament Waves in the Glass */}
          <svg
            className="golden-filament-waves"
            viewBox="0 0 500 500"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M-40 280 C 140 160, 260 380, 520 220"
              stroke="url(#goldWaveGrad1)"
              strokeWidth="1.6"
              strokeOpacity="0.45"
            />
            <path
              d="M-20 340 C 160 220, 280 440, 540 280"
              stroke="url(#goldWaveGrad2)"
              strokeWidth="1.2"
              strokeOpacity="0.35"
            />
            <path
              d="M100 -50 C 220 180, 160 320, 480 490"
              stroke="url(#goldWaveGrad1)"
              strokeWidth="0.9"
              strokeOpacity="0.3"
            />
            <defs>
              <linearGradient id="goldWaveGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFD700" stopOpacity="0.85" />
                <stop offset="50%" stopColor="#D49A00" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#FFD700" stopOpacity="0.9" />
              </linearGradient>
              <linearGradient id="goldWaveGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFF275" stopOpacity="0.7" />
                <stop offset="70%" stopColor="#D49A00" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#FFD700" stopOpacity="0.8" />
              </linearGradient>
            </defs>
          </svg>

          {/* Center Large Circular Shiva Emblem (75-80% of Panel Width) */}
          <div className="large-logo-center-wrapper">
            {/* Concentric Golden Outer Rings with Specular Flare */}
            <div className="concentric-ring outer-bevel-ring">
              {/* Golden Lens Flare / Starburst Glint on top-right rim */}
              <div className="specular-lens-flare" />

              <div className="concentric-ring mid-metallic-ring">
                <div className="concentric-ring inner-dark-ring">
                  <img
                    src="/shiva_logo.png"
                    alt="Shiva Electronics"
                    className="shiva-circular-logo-img"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{shivaShowroomLoginStyles}</style>
    </div>
  );
};

const shivaShowroomLoginStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

  *, *::before, *::after {
    box-sizing: border-box;
  }

  html, body {
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
    background-color: #08090D;
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    overflow: hidden;
  }

  /* Full-Screen 100vw × 100vh Root */
  .shiva-login-root {
    position: relative;
    width: 100vw;
    height: 100vh;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #08090D;
    overflow: hidden;
  }

  /* Bright & Vivid Showroom Background with Slow Cinematic Zoom */
  .showroom-bg-layer {
    position: absolute;
    inset: -30px;
    background-image: url('/showroom_bg.jpg');
    background-size: cover;
    background-position: center center;
    background-repeat: no-repeat;
    animation: slowCinematicZoom 28s ease-in-out infinite alternate;
    z-index: 0;
    filter: brightness(1.06) contrast(1.08) saturate(1.1);
  }

  @keyframes slowCinematicZoom {
    0% {
      transform: scale(1.0);
    }
    100% {
      transform: scale(1.05);
    }
  }

  /* Very Light, Transparent Vignette - Keeps the Showroom Products Distinct & Bright */
  .light-vignette-layer {
    position: absolute;
    inset: 0;
    background: radial-gradient(
      ellipse at center,
      rgba(8, 9, 13, 0.08) 0%,
      rgba(8, 9, 13, 0.22) 65%,
      rgba(8, 9, 13, 0.45) 100%
    );
    z-index: 1;
    pointer-events: none;
  }

  /* Ambient Floor Uplights Mirroring Panels onto Glossy Floor */
  .floor-glow-left {
    position: absolute;
    bottom: 2%;
    left: 24%;
    width: 320px;
    height: 90px;
    background: radial-gradient(ellipse, rgba(255, 215, 0, 0.35) 0%, rgba(212, 154, 0, 0.1) 60%, transparent 80%);
    filter: blur(24px);
    z-index: 2;
    pointer-events: none;
  }

  .floor-glow-right {
    position: absolute;
    bottom: 2%;
    right: 24%;
    width: 320px;
    height: 90px;
    background: radial-gradient(ellipse, rgba(255, 215, 0, 0.38) 0%, rgba(212, 154, 0, 0.1) 60%, transparent 80%);
    filter: blur(24px);
    z-index: 2;
    pointer-events: none;
  }

  /* Two Glass Panels Main Container */
  .panels-container {
    position: relative;
    z-index: 10;
    width: 92%;
    max-width: 1140px;
    height: 82vh;
    max-height: 620px;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    gap: 32px;
  }

  /* ============================================================== */
  /* TRUE ULTRA-TRANSPARENT GLASSMORPHISM PANELS                    */
  /* ============================================================== */
  .glass-panel {
    position: relative;
    flex: 1;
    height: 100%;
    max-width: 530px;
    /* Highly translucent frosted glass with soft sheen */
    background: linear-gradient(
      135deg,
      rgba(255, 255, 255, 0.12) 0%,
      rgba(255, 255, 255, 0.03) 40%,
      rgba(10, 12, 20, 0.22) 100%
    );
    /* Delicate blur so the showroom is clearly visible behind the cards */
    backdrop-filter: blur(9px) saturate(135%);
    -webkit-backdrop-filter: blur(9px) saturate(135%);
    border: 1.5px solid rgba(255, 215, 0, 0.48);
    border-radius: 28px;
    box-shadow:
      0 20px 50px rgba(0, 0, 0, 0.55),
      0 0 35px rgba(255, 215, 0, 0.22),
      inset 0 1px 2px rgba(255, 255, 255, 0.3),
      inset 0 -1px 2px rgba(255, 215, 0, 0.2);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    animation: panelArrival 0.85s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }

  @keyframes panelArrival {
    0% {
      opacity: 0;
      transform: translateY(24px) scale(0.98);
    }
    100% {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  /* Diagonal Glass Reflection Sweep */
  .glass-reflection-sweep {
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: linear-gradient(
      120deg,
      transparent 38%,
      rgba(255, 255, 255, 0.07) 45%,
      rgba(255, 255, 255, 0.14) 50%,
      rgba(255, 255, 255, 0.04) 54%,
      transparent 60%
    );
    pointer-events: none;
    z-index: 3;
  }

  /* Prismatic Top Edge Specular Reflection */
  .panel-top-highlight {
    position: absolute;
    top: 0;
    left: 10%;
    right: 10%;
    height: 2px;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(255, 215, 0, 0.5) 25%,
      rgba(255, 255, 255, 0.95) 50%,
      rgba(255, 215, 0, 0.5) 75%,
      transparent 100%
    );
    pointer-events: none;
    z-index: 5;
  }

  /* ============================================================== */
  /* LEFT PANEL STYLES                                              */
  /* ============================================================== */
  .left-panel {
    padding: 50px 48px 44px 48px;
    justify-content: center;
  }

  .panel-header {
    margin-bottom: 26px;
    position: relative;
    z-index: 4;
  }

  .welcome-title {
    font-size: 34px;
    font-weight: 800;
    color: #FFFFFF;
    margin: 0 0 8px 0;
    letter-spacing: -0.6px;
    line-height: 1.2;
    text-shadow: 0 2px 14px rgba(0, 0, 0, 0.85);
  }

  .gold-highlight {
    color: #FFD700;
    text-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
  }

  .welcome-subtitle {
    font-size: 13.5px;
    color: #CBD5E1;
    margin: 0;
    font-weight: 500;
    letter-spacing: 0.1px;
    text-shadow: 0 1px 8px rgba(0, 0, 0, 0.8);
  }

  .login-form {
    display: flex;
    flex-direction: column;
    gap: 18px;
    position: relative;
    z-index: 4;
  }

  .input-group-container {
    display: flex;
    flex-direction: column;
    gap: 7px;
  }

  .input-label {
    font-size: 12.5px;
    font-weight: 600;
    color: #F8FAFC;
    margin: 0;
    letter-spacing: 0.2px;
    text-shadow: 0 1px 6px rgba(0, 0, 0, 0.85);
  }

  /* Translucent Glass Input Capsule */
  .input-capsule {
    display: flex;
    align-items: center;
    position: relative;
    height: 48px;
    background: rgba(10, 12, 18, 0.45);
    backdrop-filter: blur(8px);
    border: 1.5px solid rgba(255, 215, 0, 0.38);
    border-radius: 12px;
    padding: 0 15px;
    transition: all 0.22s ease-in-out;
  }

  .input-capsule:hover {
    border-color: rgba(255, 215, 0, 0.65);
    background: rgba(15, 18, 26, 0.55);
  }

  .input-capsule:focus-within {
    border-color: #FFD700;
    background: rgba(18, 22, 32, 0.75);
    box-shadow:
      0 0 0 3px rgba(255, 215, 0, 0.25),
      0 0 22px rgba(255, 215, 0, 0.3);
  }

  .input-icon {
    color: #FFD700;
    flex-shrink: 0;
    margin-right: 12px;
    opacity: 0.95;
    filter: drop-shadow(0 0 4px rgba(255, 215, 0, 0.4));
  }

  .input-capsule input {
    width: 100%;
    height: 100%;
    border: none;
    outline: none;
    background: transparent;
    font-size: 14px;
    font-weight: 600;
    color: #FFFFFF;
    font-family: inherit;
    padding: 0;
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
  }

  .input-capsule input::placeholder {
    color: #94A3B8;
    font-weight: 400;
  }

  .eye-toggle-btn {
    border: none;
    background: transparent;
    color: #CBD5E1;
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.2s ease;
  }

  .eye-toggle-btn:hover {
    color: #FFD700;
  }

  /* Remember Me & Forgot Password Row */
  .controls-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 2px;
    margin-bottom: 6px;
  }

  .remember-me-label {
    display: flex;
    align-items: center;
    gap: 9px;
    cursor: pointer;
    user-select: none;
    font-size: 13px;
    color: #E2E8F0;
    font-weight: 500;
    text-shadow: 0 1px 4px rgba(0, 0, 0, 0.8);
  }

  .custom-checkbox {
    width: 18px;
    height: 18px;
    border-radius: 4px;
    border: 1.5px solid rgba(255, 215, 0, 0.6);
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
  }

  .custom-checkbox.checked {
    background: #FFD700;
    border-color: #FFD700;
    box-shadow: 0 0 12px rgba(255, 215, 0, 0.55);
  }

  .check-icon {
    color: #08090D;
  }

  .forgot-password-link {
    border: none;
    background: transparent;
    color: #FFD700;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    padding: 0;
    transition: all 0.2s ease;
    text-shadow: 0 1px 5px rgba(0, 0, 0, 0.8);
  }

  .forgot-password-link:hover {
    color: #FFF275;
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  /* Large Golden Gradient Button */
  .gold-signin-button {
    position: relative;
    width: 100%;
    height: 50px;
    margin-top: 8px;
    border: none;
    border-radius: 12px;
    background: linear-gradient(135deg, #FFD700 0%, #F5B000 50%, #D49A00 100%);
    color: #08090D;
    font-size: 15px;
    font-weight: 800;
    letter-spacing: 0.2px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    box-shadow:
      0 12px 28px -4px rgba(255, 215, 0, 0.55),
      inset 0 1px 1px rgba(255, 255, 255, 0.6);
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .gold-signin-button:hover:not(:disabled) {
    background: linear-gradient(135deg, #FFF275 0%, #FFD700 45%, #E5A500 100%);
    box-shadow:
      0 16px 36px -2px rgba(255, 215, 0, 0.75),
      0 0 24px rgba(255, 215, 0, 0.45);
    transform: translateY(-2px);
  }

  .gold-signin-button:active:not(:disabled) {
    transform: translateY(0);
    box-shadow: 0 6px 18px rgba(255, 215, 0, 0.4);
  }

  .gold-signin-button:disabled {
    opacity: 0.68;
    cursor: not-allowed;
  }

  .button-arrow {
    transition: transform 0.22s ease;
  }

  .gold-signin-button:hover:not(:disabled) .button-arrow {
    transform: translateX(4px);
  }

  /* ============================================================== */
  /* RIGHT PANEL: Large Shiva Electronics Logo                      */
  /* ============================================================== */
  .right-panel {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    /* Extra crystalline feel for the logo card */
    background: linear-gradient(
      135deg,
      rgba(255, 255, 255, 0.10) 0%,
      rgba(255, 255, 255, 0.02) 40%,
      rgba(10, 12, 20, 0.18) 100%
    );
    backdrop-filter: blur(7px) saturate(125%);
    -webkit-backdrop-filter: blur(7px) saturate(125%);
  }

  /* Decorative Filament Waves in Glass */
  .golden-filament-waves {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 2;
    opacity: 0.75;
  }

  /* Centered Large Circular Logo Container (75-80% of panel width) */
  .large-logo-center-wrapper {
    position: relative;
    z-index: 4;
    width: 78%;
    max-width: 380px;
    aspect-ratio: 1 / 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* Multi-tier Concentric Golden Metallic Rings */
  .concentric-ring {
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .outer-bevel-ring {
    position: relative;
    width: 100%;
    height: 100%;
    padding: 7px;
    background: linear-gradient(
      135deg,
      #FFF685 0%,
      #FFD700 25%,
      #B37D00 50%,
      #FFD700 75%,
      #664600 100%
    );
    box-shadow:
      0 0 50px rgba(255, 215, 0, 0.45),
      0 20px 40px rgba(0, 0, 0, 0.8),
      inset 0 0 15px rgba(255, 255, 255, 0.4);
    animation: emblemGlowPulse 6s ease-in-out infinite alternate;
  }

  @keyframes emblemGlowPulse {
    0% {
      box-shadow:
        0 0 40px rgba(255, 215, 0, 0.35),
        0 20px 40px rgba(0, 0, 0, 0.75),
        inset 0 0 10px rgba(255, 255, 255, 0.3);
    }
    100% {
      box-shadow:
        0 0 70px rgba(255, 215, 0, 0.6),
        0 25px 45px rgba(0, 0, 0, 0.85),
        inset 0 0 20px rgba(255, 255, 255, 0.5);
    }
  }

  /* Realistic Specular Lens Flare / Starburst on Golden Rim */
  .specular-lens-flare {
    position: absolute;
    top: 10%;
    right: 12%;
    width: 22px;
    height: 22px;
    background: radial-gradient(circle, #FFFFFF 0%, rgba(255, 246, 133, 0.95) 35%, transparent 70%);
    filter: drop-shadow(0 0 10px #FFD700) drop-shadow(0 0 22px #FFFFFF);
    border-radius: 50%;
    z-index: 10;
    pointer-events: none;
    animation: flareGlint 4s ease-in-out infinite alternate;
  }

  .specular-lens-flare::before {
    content: '';
    position: absolute;
    top: 50%;
    left: -14px;
    right: -14px;
    height: 2px;
    background: linear-gradient(90deg, transparent, #FFFFFF 50%, transparent);
    transform: translateY(-50%) rotate(45deg);
  }

  .specular-lens-flare::after {
    content: '';
    position: absolute;
    left: 50%;
    top: -14px;
    bottom: -14px;
    width: 2px;
    background: linear-gradient(180deg, transparent, #FFFFFF 50%, transparent);
    transform: translateX(-50%) rotate(45deg);
  }

  @keyframes flareGlint {
    0% {
      transform: scale(0.85);
      opacity: 0.75;
    }
    100% {
      transform: scale(1.25);
      opacity: 1;
    }
  }

  .mid-metallic-ring {
    width: 100%;
    height: 100%;
    padding: 4px;
    background: linear-gradient(225deg, #2A1D00 0%, #7A5700 50%, #FFD700 100%);
    box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.7);
  }

  .inner-dark-ring {
    width: 100%;
    height: 100%;
    background: #000000;
    overflow: hidden;
    position: relative;
    box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.9);
  }

  .shiva-circular-logo-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    transition: transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .large-logo-center-wrapper:hover .shiva-circular-logo-img {
    transform: scale(1.04);
  }

  /* ============================================================== */
  /* RESPONSIVE DESIGN                                              */
  /* ============================================================== */
  @media (max-width: 992px) {
    .shiva-login-root {
      overflow-y: auto;
      height: auto;
      min-height: 100vh;
      padding: 30px 16px;
    }

    .panels-container {
      flex-direction: column;
      height: auto;
      max-height: none;
      width: 100%;
      max-width: 500px;
      gap: 24px;
    }

    .glass-panel {
      width: 100%;
      max-width: 100%;
      height: auto;
    }

    .left-panel {
      padding: 38px 30px;
    }

    .right-panel {
      padding: 36px 20px;
      order: -1; /* Display brand logo on top for mobile */
    }

    .large-logo-center-wrapper {
      width: 65%;
      max-width: 240px;
    }

    .floor-glow-left, .floor-glow-right {
      display: none;
    }
  }

  @media (max-width: 480px) {
    .shiva-login-root {
      padding: 18px 12px;
    }

    .left-panel {
      padding: 30px 20px;
      border-radius: 22px;
    }

    .welcome-title {
      font-size: 26px;
    }

    .large-logo-center-wrapper {
      width: 75%;
      max-width: 200px;
    }
  }
`;

export default Login;
