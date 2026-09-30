'use strict';

/**
 * Generate a cute, white-and-blue themed HTML page for expired or already-used one-time links.
 * @param {object} options
 * @param {string} [options.code='410'] - Error code to display
 * @param {string} [options.title] - Friendly cute title
 * @param {string} [options.message] - Explanatory cute message
 * @param {string} [options.backUrl='http://localhost:5173/signin'] - Target URL for the go-back button
 * @param {string} [options.backLabel='Về trang đăng nhập'] - Button label
 * @returns {string} HTML page string
 */
const renderExpiredLinkPage = ({
  code = '410',
  title = 'Ối... Hình như bạn bị lạc rồi! (｡•́︿•̀｡)',
  message = 'Liên kết này là liên kết dùng 1 lần và đã được sử dụng trước đó, hoặc đã hết hạn rồi nè.',
  backUrl = 'http://localhost:5173/signin',
  backLabel = 'Về trang đăng nhập',
} = {}) => {
  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Liên kết đã hết hạn - AVORA</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #f8fafc 100%);
      color: #1e293b;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px 16px;
      overflow-x: hidden;
      position: relative;
    }

    /* Cute background decorative floating bubbles */
    .bubble {
      position: absolute;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(14, 165, 233, 0.15) 0%, rgba(56, 189, 248, 0.05) 70%, transparent 100%);
      pointer-events: none;
      animation: float 6s ease-in-out infinite alternate;
    }
    .bubble-1 { width: 320px; height: 320px; top: -80px; left: -60px; animation-duration: 7s; }
    .bubble-2 { width: 260px; height: 260px; bottom: -60px; right: -40px; animation-duration: 5s; }
    .bubble-3 { width: 140px; height: 140px; top: 20%; right: 10%; animation-duration: 8s; }

    @keyframes float {
      0% { transform: translateY(0px) rotate(0deg); }
      100% { transform: translateY(-25px) rotate(8deg); }
    }

    /* Main Cute Card */
    .card {
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(12px);
      border: 2px solid #e0f2fe;
      border-radius: 28px;
      padding: 48px 36px 40px;
      max-width: 480px;
      width: 100%;
      text-align: center;
      box-shadow: 0 20px 45px -10px rgba(14, 165, 233, 0.18), 0 0 0 1px rgba(255, 255, 255, 0.8) inset;
      position: relative;
      z-index: 10;
      animation: popIn 0.45s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    @keyframes popIn {
      0% { opacity: 0; transform: scale(0.9) translateY(20px); }
      100% { opacity: 1; transform: scale(1) translateY(0); }
    }

    /* Stylized Brand Logo */
    .brand-logo {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: #f0fdf4;
      background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
      padding: 8px 18px;
      border-radius: 999px;
      border: 1.5px solid #bae6fd;
      margin-bottom: 24px;
      box-shadow: 0 4px 12px rgba(14, 165, 233, 0.1);
    }
    .brand-text {
      font-size: 20px;
      font-weight: 800;
      letter-spacing: 1px;
      background: linear-gradient(135deg, #0284c7 0%, #2563eb 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      text-transform: uppercase;
    }
    .brand-badge {
      font-size: 10px;
      font-weight: 700;
      color: #0369a1;
      background: #ffffff;
      padding: 2px 8px;
      border-radius: 12px;
      border: 1px solid #7dd3fc;
      letter-spacing: 0.5px;
    }

    /* Cute Character Illustration */
    .cute-illustration {
      width: 130px;
      height: 130px;
      margin: 0 auto 16px;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .cute-svg {
      width: 100%;
      height: 100%;
      filter: drop-shadow(0 10px 15px rgba(2, 132, 199, 0.2));
      animation: cuteWiggle 3s ease-in-out infinite alternate;
    }
    @keyframes cuteWiggle {
      0% { transform: translateY(0) rotate(-3deg); }
      50% { transform: translateY(-8px) rotate(0deg); }
      100% { transform: translateY(0) rotate(3deg); }
    }

    /* Error Code Pill Badge */
    .error-code-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #fee2e2;
      color: #ef4444;
      border: 1px solid #fecaca;
      font-size: 13px;
      font-weight: 800;
      padding: 4px 14px;
      border-radius: 999px;
      margin-bottom: 14px;
      letter-spacing: 0.5px;
    }
    .error-code-pill span.code-num {
      font-family: monospace;
      font-size: 14px;
    }

    /* Title & Text */
    .title {
      font-size: 22px;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 12px;
      line-height: 1.35;
    }
    .desc {
      font-size: 14.5px;
      color: #64748b;
      line-height: 1.6;
      margin-bottom: 28px;
    }
    .tip-box {
      background: #f8fafc;
      border: 1px dashed #cbd5e1;
      border-radius: 14px;
      padding: 12px 16px;
      font-size: 13px;
      color: #475569;
      margin-bottom: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    /* Action Button - Cute & Clickable */
    .btn-action {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      background: linear-gradient(135deg, #0284c7 0%, #2563eb 100%);
      color: #ffffff !important;
      text-decoration: none;
      font-weight: 700;
      font-size: 15px;
      padding: 14px 34px;
      border-radius: 16px;
      box-shadow: 0 10px 25px -5px rgba(37, 99, 235, 0.45);
      transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
      width: 100%;
    }
    .btn-action:hover {
      transform: translateY(-3px) scale(1.02);
      box-shadow: 0 14px 30px -5px rgba(37, 99, 235, 0.55);
    }
    .btn-action:active {
      transform: translateY(0) scale(0.98);
    }

    .footer-note {
      margin-top: 24px;
      font-size: 12px;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <!-- Floating Background Bubbles -->
  <div class="bubble bubble-1"></div>
  <div class="bubble bubble-2"></div>
  <div class="bubble bubble-3"></div>

  <div class="card">
    <!-- Stylized Brand Header -->
    <div class="brand-logo">
      <span class="brand-text">Avora</span>
      <span class="brand-badge">VIỆT NAM</span>
    </div>

    <!-- Cute Explorer Cloud / Compass SVG -->
    <div class="cute-illustration">
      <svg class="cute-svg" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        <!-- Soft Glow Circle -->
        <circle cx="60" cy="60" r="52" fill="#E0F2FE" />
        <circle cx="60" cy="60" r="44" fill="#BAE6FD" />
        <!-- Cute Compass Face / Character -->
        <circle cx="60" cy="60" r="36" fill="#FFFFFF" stroke="#0284C7" stroke-width="3" />
        <!-- Compass Needle -->
        <polygon points="60,34 66,60 60,54 54,60" fill="#EF4444" />
        <polygon points="60,86 66,60 60,66 54,60" fill="#0284C7" />
        <circle cx="60" cy="60" r="4" fill="#0F172A" />
        <!-- Cute Eyes -->
        <circle cx="48" cy="50" r="3" fill="#0F172A" />
        <circle cx="72" cy="50" r="3" fill="#0F172A" />
        <!-- Blushing Cheeks -->
        <ellipse cx="44" cy="56" rx="3.5" ry="2" fill="#FDA4AF" opacity="0.8" />
        <ellipse cx="76" cy="56" rx="3.5" ry="2" fill="#FDA4AF" opacity="0.8" />
        <!-- Cute Confused / Lost Mouth -->
        <path d="M57 66 Q60 63 63 66" stroke="#0F172A" stroke-width="2" stroke-linecap="round" fill="none" />
        <!-- Little floating sparkles -->
        <path d="M22 36 L24 42 L30 44 L24 46 L22 52 L20 46 L14 44 L20 42 Z" fill="#FBBF24" />
        <circle cx="94" cy="38" r="4" fill="#38BDF8" />
        <circle cx="98" cy="74" r="3" fill="#818CF8" />
      </svg>
    </div>

    <!-- Error Code Badge -->
    <div class="error-code-pill">
      <span>MÃ SỐ:</span>
      <span class="code-num">${code}</span>
      <span>• LINK KHÔNG HỢP LỆ</span>
    </div>

    <!-- Cute Message -->
    <h1 class="title">${title}</h1>
    <p class="desc">${message}</p>

    <div class="tip-box">
      <span>💡</span>
      <span>Nếu bạn đã kích hoạt trước đó, tài khoản của bạn đã sẵn sàng sử dụng rồi nhé!</span>
    </div>

    <!-- Go Back Action Button -->
    <a href="${backUrl}" class="btn-action">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="m12 19-7-7 7-7"/>
        <path d="M19 12H5"/>
      </svg>
      <span>${backLabel}</span>
    </a>

    <div class="footer-note">
      Avora Booking &bull; Nền tảng du lịch và đặt phòng thông minh
    </div>
  </div>
</body>
</html>`;
};

module.exports = {
  renderExpiredLinkPage,
};
