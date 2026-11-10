import React from 'react';
import { OFFICIAL_INFO, MIN_WITHDRAWAL_PKR, MAX_WITHDRAWAL_PKR, MIN_WITHDRAWAL_EGGS, MAX_WITHDRAWAL_EGGS, EGG_PRICE_PKR, PACKAGE_VALIDITY_DAYS } from '../utils/farmRules';
import { t } from '../utils/translations';
import { ShieldCheck, MapPin, Clock, Calendar, CheckCircle, Scale } from 'lucide-react';

interface TermsViewProps {
  lang: 'en' | 'ur';
}

export const TermsView: React.FC<TermsViewProps> = ({ lang }) => {
  const strings = t[lang];
  const isUr = lang === 'ur';

  return (
    <div className="space-y-6 pb-10">
      <div className="space-y-1 text-center sm:text-left">
        <h2 className="text-2xl sm:text-3xl font-black text-[#d4af37] font-serif">
          {strings.termsTitle}
        </h2>
        <p className="text-xs sm:text-sm text-[#f4efe6]/70">
          {strings.termsSubtitle}
        </p>
      </div>

      <div className="rounded-3xl border border-[#d4af37]/35 bg-[#0a2618]/90 p-6 sm:p-8 shadow-2xl backdrop-blur-md space-y-6 text-[#f4efe6]">
        {/* Section 1: Physical Farm Identity */}
        <div className="space-y-2 border-b border-[#d4af37]/20 pb-5">
          <div className="flex items-center gap-2 text-[#d4af37]">
            <MapPin className="h-5 w-5" />
            <h3 className="text-lg font-bold">
              {isUr ? '1. فزیکل فارم کا دائرہ کار اور قانونی شناخت' : '1. Physical Farm Operations & Nationwide Identity'}
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-[#f4efe6]/80 leading-relaxed">
            {isUr
              ? 'پاک ہین فارم ایک 100% حقیقی فزیکل پولٹری فارم ہے جو پورے پاکستان میں اپنی خدمات فراہم کر رہا ہے۔ فارم میں فزیکل مرغیوں کے شیڈز، فیڈ کا نظام، اور تربیت یافتہ عملہ موجود ہے۔'
              : 'Pak Hen Farm is a 100% real physical poultry farm providing services all over Pakistan. All flocks are managed on-site with real poultry housing, organic feed, and veterinarian supervision.'}
          </p>
        </div>

        {/* Section 2: 90-Day Validity & Accumulation */}
        <div className="space-y-2 border-b border-[#d4af37]/20 pb-5">
          <div className="flex items-center gap-2 text-[#d4af37]">
            <Calendar className="h-5 w-5" />
            <h3 className="text-lg font-bold">
              {isUr ? '2. 90 روزہ میعاد اور پیکج جمع کرنے کا قانون' : '2. 90-Day Package Validity & Flock Accumulation'}
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-[#f4efe6]/80 leading-relaxed">
            {isUr
              ? `تمام پیکجز کی مدت ایڈمن کی طرف سے ادائیگی کی تصدیق کے دن سے لے کر ٹھیک 90 دن تک مؤثر رہتی ہے۔ اگر کوئی ممبر نیا پیکج خریدتا ہے، تو پچھلی مرغیاں ختم نہیں ہوتیں بلکہ نئی مرغیاں پچھلی مرغیوں میں جمع (Add up) ہو جاتی ہیں اور انڈوں کی روزانہ پیداوار بڑھ جاتی ہے۔`
              : `All purchased packages operate on a strict ${PACKAGE_VALIDITY_DAYS}-day validity window starting from the admin approval date. In accordance with farm accumulation rules, subsequent package purchases add to existing active hens (total_hens = existing_hens + new_hens), never overwriting or canceling previous active contracts.`}
          </p>
        </div>

        {/* Section 3: Daily Egg Collection Rules */}
        <div className="space-y-2 border-b border-[#d4af37]/20 pb-5">
          <div className="flex items-center gap-2 text-[#d4af37]">
            <Clock className="h-5 w-5" />
            <h3 className="text-lg font-bold">
              {isUr ? '3. 24 گھنٹے بعد انڈوں کی دستی وصولی (Manual Collection)' : '3. 24-Hour Manual Egg Collection Policy'}
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-[#f4efe6]/80 leading-relaxed">
            {isUr
              ? `فارم خودکار طریقے سے انڈے جمع نہیں کرتا۔ ممبران کو ہر 24 گھنٹے بعد پورٹل میں آ کر "روزانہ کے انڈے وصول کریں" کا بٹن دبانا لازمی ہے۔ ہر انڈے کی نقد قیمت 30 روپے ہے جو فورا آپ کے والٹ بیلنس میں شامل ہو جاتی ہے۔`
              : `To simulate active flock tending, egg collection is strictly manual. Members must log in and click "Collect Daily Eggs" once every 24 hours. Each egg converts immediately to Rs. ${EGG_PRICE_PKR} and is credited directly to the member's wallet balance.`}
          </p>
        </div>

        {/* Section 4: Withdrawal Limits */}
        <div className="space-y-2 border-b border-[#d4af37]/20 pb-5">
          <div className="flex items-center gap-2 text-[#d4af37]">
            <Scale className="h-5 w-5" />
            <h3 className="text-lg font-bold">
              {isUr ? '4. ایزی پیسہ نکلوائی کی حدود و شرائط' : '4. Easypaisa Withdrawal Policy & Strict Limits'}
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-[#f4efe6]/80 leading-relaxed">
            {isUr
              ? `نکلوائی کی رقم کے لیے سخت قوانین لاگو ہیں: کم از کم رقم ${MIN_WITHDRAWAL_EGGS} انڈے (Rs. ${MIN_WITHDRAWAL_PKR}) اور زیادہ سے زیادہ رقم ${MAX_WITHDRAWAL_EGGS} انڈے (Rs. ${MAX_WITHDRAWAL_PKR.toLocaleString()}) فی درخواست ہے۔ ادائیگیاں ایڈمن کی تصدیق کے بعد براہِ راست آپ کے ایزی پیسہ اکاؤنٹ میں بھیجی جاتی ہیں۔`
              : `Payouts are subject to strict limits: Minimum withdrawal is ${MIN_WITHDRAWAL_EGGS} Eggs (Rs. ${MIN_WITHDRAWAL_PKR}) and maximum is ${MAX_WITHDRAWAL_EGGS} Eggs (Rs. ${MAX_WITHDRAWAL_PKR.toLocaleString()}) per request. Payouts are manually disbursed by the farm administrator to verified Easypaisa accounts.`}
          </p>
        </div>

        {/* Section 5: Official Contact & Dispute Resolution */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[#d4af37]">
            <ShieldCheck className="h-5 w-5" />
            <h3 className="text-lg font-bold">
              {isUr ? '5. ادائیگی اور آفیشل سپورٹ' : '5. Deposit Verification & Official Support'}
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-[#f4efe6]/80 leading-relaxed">
            {isUr
              ? `ڈپازٹ کی تمام ادائیگیاں صرف آفیشل یو ایس ڈی ٹی TRC20 والٹ ایڈریس (${OFFICIAL_INFO.usdtTrc20Address}) پر قبول کی جاتی ہیں۔ کسی بھی سوال یا مسئلے کی صورت میں فارم سپورٹ ڈیسک پر انکوائری جمع کروائیں۔`
              : `All payments must be submitted exclusively to the official USDT (TRC20) address: ${OFFICIAL_INFO.usdtTrc20Address}. For any assistance, submit a support inquiry through our dedicated farm helpdesk.`}
          </p>
        </div>
      </div>
    </div>
  );
};
