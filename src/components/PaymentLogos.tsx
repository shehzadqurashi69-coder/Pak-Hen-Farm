import React from 'react';

export type PaymentMethodKey = 'jazzcash' | 'easypaisa' | 'sadapay' | 'upaisa' | 'bank' | 'usdt' | 'other';

interface PaymentLogoProps {
  method: PaymentMethodKey | string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showLabel?: boolean;
}

export const PaymentLogo: React.FC<PaymentLogoProps> = ({
  method,
  size = 'md',
  className = '',
  showLabel = false,
}) => {
  const normalizedKey = (method || '').toLowerCase();

  const sizeDimensions = {
    sm: { container: 'h-7 w-7', badge: 'h-6 px-1.5 py-0.5 text-[10px]', icon: 'h-7 w-7' },
    md: { container: 'h-9 w-9', badge: 'h-8 px-2.5 py-1 text-xs', icon: 'h-9 w-9' },
    lg: { container: 'h-11 w-11', badge: 'h-10 px-3.5 py-1.5 text-sm', icon: 'h-11 w-11' },
  }[size];

  // 1. JazzCash Official Brand (Official User-Uploaded Brand Logo)
  if (normalizedKey.includes('jazz')) {
    const iconElement = (
      <div
        className={`${sizeDimensions.icon} flex items-center justify-center rounded-lg bg-white p-0.5 shadow-md border border-white/80 shrink-0 overflow-hidden`}
      >
        <img
          src="/assets/aistudio/download__2__550d514b.png"
          alt="JazzCash Official"
          className="h-full w-full object-contain select-none"
          loading="eager"
        />
      </div>
    );

    if (showLabel) {
      return (
        <div
          className={`inline-flex items-center gap-1.5 rounded-xl font-black bg-[#0d0d0d] border border-[#ff2a3b]/50 text-[#ff334b] shadow-sm select-none shrink-0 ${sizeDimensions.badge} ${className}`}
          title="JazzCash Official"
        >
          {iconElement}
          <span className="tracking-tight text-white font-extrabold">
            Jazz<span className="text-[#FFC20E]">Cash</span>
          </span>
        </div>
      );
    }

    return (
      <div className={`inline-flex shrink-0 ${className}`} title="JazzCash Official">
        {iconElement}
      </div>
    );
  }

  // 2. Easypaisa Official Brand (Authentic Emerald Green #00A859 & White Circular Spiral/Leaf Swoosh)
  if (normalizedKey.includes('easy')) {
    const iconElement = (
      <svg
        viewBox="0 0 40 40"
        className={`${sizeDimensions.icon} shrink-0 drop-shadow`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Official Easypaisa Vibrant Emerald Green Base */}
        <rect width="40" height="40" rx="9" fill="#00A859" />
        <rect x="0.75" y="0.75" width="38.5" height="38.5" rx="8.25" stroke="#69F0AE" strokeWidth="1.2" strokeOpacity="0.5" />
        
        {/* Official Easypaisa Pure White Swirling Spiral / Leaf Swoosh */}
        {/* Upper swoosh / leaf curve */}
        <path
          d="M20 8.5C14.2 8.5 9.5 13.2 9.5 19C9.5 22 10.8 24.7 12.9 26.6C13.5 27.1 14.4 27 14.8 26.4C15.2 25.8 15.1 24.9 14.5 24.4C12.8 22.9 11.9 20.8 11.9 19C11.9 14.5 15.5 10.9 20 10.9C23.9 10.9 27.2 13.6 28 17.3C28.2 18.1 29 18.5 29.8 18.3C30.6 18.1 31.1 17.3 30.9 16.5C29.8 11.8 25.3 8.5 20 8.5Z"
          fill="#FFFFFF"
        />
        {/* Lower complementary swoosh / leaf curve completing dynamic loop */}
        <path
          d="M20 29.5C25.8 29.5 30.5 24.8 30.5 19C30.5 16 29.2 13.3 27.1 11.4C26.5 10.9 25.6 11 25.2 11.6C24.8 12.2 24.9 13.1 25.5 13.6C27.2 15.1 28.1 17.2 28.1 19C28.1 23.5 24.5 27.1 20 27.1C16.1 27.1 12.8 24.4 12 20.7C11.8 19.9 11 19.5 10.2 19.7C9.4 19.9 8.9 20.7 9.1 21.5C10.2 26.2 14.7 29.5 20 29.5Z"
          fill="#FFFFFF"
        />
        {/* Central Core Emblem */}
        <circle cx="20" cy="19" r="3" fill="#FFFFFF" />
        
        {/* Authentic Easypaisa Bottom Banner */}
        <rect x="6.5" y="31.5" width="27" height="5" rx="2" fill="#006837" />
        <text x="20" y="35.3" fill="#FFFFFF" fontSize="3.8" fontWeight="900" textAnchor="middle" letterSpacing="0.4" fontFamily="system-ui, sans-serif">
          EASYPAISA
        </text>
      </svg>
    );

    if (showLabel) {
      return (
        <div
          className={`inline-flex items-center gap-1.5 rounded-xl font-black bg-[#042414] border border-[#00c853]/60 text-[#00e676] shadow-sm select-none shrink-0 ${sizeDimensions.badge} ${className}`}
          title="Easypaisa Official"
        >
          {iconElement}
          <span className="tracking-tight text-white font-extrabold">
            easy<span className="text-[#69f0ae]">paisa</span>
          </span>
        </div>
      );
    }

    return <div className={`inline-flex shrink-0 ${className}`} title="Easypaisa Official">{iconElement}</div>;
  }

  // 3. SadaPay Official Brand (Teal & Coral Modern Neobank)
  if (normalizedKey.includes('sada')) {
    const iconElement = (
      <svg
        viewBox="0 0 40 40"
        className={`${sizeDimensions.icon} shrink-0 drop-shadow`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="40" height="40" rx="9" fill="#0D1E24" />
        <rect x="0.75" y="0.75" width="38.5" height="38.5" rx="8.25" stroke="#00BFA5" strokeWidth="1.2" strokeOpacity="0.5" />
        <circle cx="15" cy="19" r="7.5" fill="#FF5364" />
        <circle cx="25" cy="19" r="7.5" fill="#00BFA5" fillOpacity="0.88" />
        <rect x="8" y="31.5" width="24" height="5" rx="2" fill="#051217" />
        <text x="20" y="35.3" fill="#FFFFFF" fontSize="3.8" fontWeight="900" textAnchor="middle" letterSpacing="0.4" fontFamily="system-ui, sans-serif">
          SADAPAY
        </text>
      </svg>
    );

    if (showLabel) {
      return (
        <div
          className={`inline-flex items-center gap-1.5 rounded-xl font-black bg-[#0d232a] border border-[#00bfa5]/60 text-[#00e5ff] shadow-sm select-none shrink-0 ${sizeDimensions.badge} ${className}`}
          title="SadaPay Official"
        >
          {iconElement}
          <span className="tracking-tight text-white font-extrabold">
            Sada<span className="text-[#FF5364]">Pay</span>
          </span>
        </div>
      );
    }

    return <div className={`inline-flex shrink-0 ${className}`} title="SadaPay Official">{iconElement}</div>;
  }

  // 4. UPaisa Official Brand (Orange & Green)
  if (normalizedKey.includes('upaisa') || normalizedKey.includes('u-paisa') || normalizedKey.includes('ufone')) {
    const iconElement = (
      <svg
        viewBox="0 0 40 40"
        className={`${sizeDimensions.icon} shrink-0 drop-shadow`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="40" height="40" rx="9" fill="#FF8F00" />
        <rect x="0.75" y="0.75" width="38.5" height="38.5" rx="8.25" stroke="#FFA726" strokeWidth="1.2" />
        <path
          d="M12 11V21C12 25 15.5 28.5 20 28.5C24.5 28.5 28 25 28 21V11H23V21C23 22.7 21.7 24 20 24C18.3 24 17 22.7 17 21V11H12Z"
          fill="#FFF"
        />
        <circle cx="27" cy="9" r="3.5" fill="#2E7D32" stroke="#FFF" strokeWidth="1.2" />
        <rect x="8" y="31.5" width="24" height="5" rx="2" fill="#E65100" />
        <text x="20" y="35.3" fill="#FFFFFF" fontSize="3.8" fontWeight="900" textAnchor="middle" letterSpacing="0.4" fontFamily="system-ui, sans-serif">
          UPaisa
        </text>
      </svg>
    );

    if (showLabel) {
      return (
        <div
          className={`inline-flex items-center gap-1.5 rounded-xl font-black bg-[#261505] border border-[#ff9100]/60 text-[#ffab40] shadow-sm select-none shrink-0 ${sizeDimensions.badge} ${className}`}
          title="UPaisa Official"
        >
          {iconElement}
          <span className="tracking-tight text-white font-extrabold">
            U<span className="text-[#ffab40]">Paisa</span>
          </span>
        </div>
      );
    }

    return <div className={`inline-flex shrink-0 ${className}`} title="UPaisa Official">{iconElement}</div>;
  }

  // 5. USDT / Tether Crypto
  if (normalizedKey.includes('usdt') || normalizedKey.includes('tether') || normalizedKey.includes('crypto')) {
    const iconElement = (
      <svg
        viewBox="0 0 40 40"
        className={`${sizeDimensions.icon} shrink-0 drop-shadow`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="40" height="40" rx="9" fill="#26A17B" />
        <rect x="0.75" y="0.75" width="38.5" height="38.5" rx="8.25" stroke="#55D6AA" strokeWidth="1.2" />
        <path
          d="M22.5 17V12.5H28V9H12V12.5H17.5V17C12.5 17.4 9 18.6 9 20C9 21.4 12.5 22.6 17.5 23V29.5H22.5V23C27.5 22.6 31 21.4 31 20C31 18.6 27.5 17.4 22.5 17ZM20 21.8C15.8 21.8 12.8 20.8 12.8 20C12.8 19.2 15.8 18.2 20 18.2C24.2 18.2 27.2 19.2 27.2 20C27.2 20.8 24.2 21.8 20 21.8Z"
          fill="#FFF"
        />
        <rect x="9" y="31.5" width="22" height="5" rx="2" fill="#145E47" />
        <text x="20" y="35.3" fill="#FFFFFF" fontSize="3.8" fontWeight="900" textAnchor="middle" letterSpacing="0.4" fontFamily="system-ui, sans-serif">
          TRC-20
        </text>
      </svg>
    );

    if (showLabel) {
      return (
        <div
          className={`inline-flex items-center gap-1.5 rounded-xl font-black bg-[#04261d] border border-[#26a17b]/60 text-[#26a17b] shadow-sm select-none shrink-0 ${sizeDimensions.badge} ${className}`}
          title="USDT (TRC20)"
        >
          {iconElement}
          <span className="tracking-tight text-white font-extrabold">
            USDT <span className="text-[#55d6aa] text-[10px] font-mono">TRC20</span>
          </span>
        </div>
      );
    }

    return <div className={`inline-flex shrink-0 ${className}`} title="USDT (TRC20)">{iconElement}</div>;
  }

  // 6. Bank Account / Raast Instant Payment
  const iconElement = (
    <svg
      viewBox="0 0 40 40"
      className={`${sizeDimensions.icon} shrink-0 drop-shadow`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="40" height="40" rx="9" fill="#0A331E" />
      <rect x="0.75" y="0.75" width="38.5" height="38.5" rx="8.25" stroke="#D4AF37" strokeWidth="1.5" />
      <path d="M20 7L8 13.5V16H32V13.5L20 7Z" fill="#F3DF88" />
      <rect x="10" y="17.5" width="3" height="8.5" rx="0.75" fill="#FFF" />
      <rect x="15.3" y="17.5" width="3" height="8.5" rx="0.75" fill="#FFF" />
      <rect x="21.7" y="17.5" width="3" height="8.5" rx="0.75" fill="#FFF" />
      <rect x="27" y="17.5" width="3" height="8.5" rx="0.75" fill="#FFF" />
      <rect x="7" y="27" width="26" height="3" rx="0.75" fill="#F3DF88" />
      <rect x="8" y="31.5" width="24" height="5" rx="2" fill="#051A10" />
      <text x="20" y="35.3" fill="#D4AF37" fontSize="3.8" fontWeight="900" textAnchor="middle" letterSpacing="0.4" fontFamily="system-ui, sans-serif">
        BANK/RAAST
      </text>
    </svg>
  );

  if (showLabel) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 rounded-xl font-black bg-[#162514] border border-[#d4af37]/60 text-[#f3df88] shadow-sm select-none shrink-0 ${sizeDimensions.badge} ${className}`}
        title="Bank Account / Raast"
      >
        {iconElement}
        <span className="tracking-tight text-white font-extrabold">
          Bank <span className="text-[#d4af37]">/ Raast</span>
        </span>
      </div>
    );
  }

  return <div className={`inline-flex shrink-0 ${className}`} title="Bank Account / Raast">{iconElement}</div>;
};
