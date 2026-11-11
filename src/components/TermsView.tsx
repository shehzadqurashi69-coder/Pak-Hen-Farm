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

        {/* Section 4: Withdrawal Limits & Supported Gateways */}
        <div className="space-y-2 border-b border-[#d4af37]/20 pb-5">
          <div className="flex items-center gap-2 text-[#d4af37]">
            <Scale className="h-5 w-5" />
            <h3 className="text-lg font-bold">
              {isUr ? '4. فنڈز نکلوائی کی حدود و طریقہ کار (تمام گیٹ ویز)' : '4. Fund Withdrawal Policy & Gateway Limits'}
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-[#f4efe6]/80 leading-relaxed">
            {isUr
              ? `نکلوائی کی رقم کے لیے شفاف قوانین لاگو ہیں: کم از کم رقم ${MIN_WITHDRAWAL_EGGS} انڈے (Rs. ${MIN_WITHDRAWAL_PKR}) اور زیادہ سے زیادہ رقم ${MAX_WITHDRAWAL_EGGS} انڈے (Rs. ${MAX_WITHDRAWAL_PKR.toLocaleString()}) فی درخواست ہے۔ ممبران اپنے تمام فعال پیمنٹ اکاؤنٹس بشمول ایزی پیسہ (Easypaisa)، جاز کیش (JazzCash)، سادہ پے (SadaPay)، یو پیسہ (UPaisa)، اور بینک اکاؤنٹ / راست (Raast) پر بغیر کسی تاخیر کے براہِ راست ادائیگیاں حاصل کر سکتے ہیں۔ ادائیگیاں فارم ایڈمنسٹریشن کی تصدیق کے بعد فوری بھیجی جاتی ہیں۔`
              : `Payouts are subject to clear policy limits: Minimum withdrawal is ${MIN_WITHDRAWAL_EGGS} Eggs (Rs. ${MIN_WITHDRAWAL_PKR}) and maximum is ${MAX_WITHDRAWAL_EGGS} Eggs (Rs. ${MAX_WITHDRAWAL_PKR.toLocaleString()}) per request. Members can request instant payouts to any active payment gateway of their choice, including Easypaisa, JazzCash, SadaPay, UPaisa, or direct Bank Account / Raast. All verified payout requests are processed seamlessly by farm administration.`}
          </p>
        </div>

        {/* Section 5: Deposit Verification & Support */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[#d4af37]">
            <ShieldCheck className="h-5 w-5" />
            <h3 className="text-lg font-bold">
              {isUr ? '5. ڈپازٹ، پیکج ایکٹیویشن اور آفیشل سپورٹ' : '5. Deposit Verification, Package Activation & Support'}
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-[#f4efe6]/80 leading-relaxed">
            {isUr
              ? `مرغیوں کے پیکج کی خریداری کے لیے تمام ادائیگیاں فارم کی طرف سے فراہم کردہ مصدقہ آفیشل پیمنٹ اکاؤنٹس (جاز کیش، ایزی پیسہ، سادہ پے، یو پیسہ، بینک ٹرانسفر / راست) پر کی جاتی ہیں۔ ادائیگی کے بعد ٹرانزیکشن آئی ڈی (TID) اور رسید کا اسکرین شاٹ پورٹل میں درج کرنا لازمی ہے۔ ایڈمن کی تصدیق کے فوری بعد آپ کا پیکج اور روزانہ کی انڈوں کی پیداوار فعال ہو جاتی ہے۔ کسی بھی مدد کے لیے فارم کے SOS ہیلپ ڈیسک پر رابطہ کریں۔`
              : `Flock package purchases may be funded via any official farm payment gateway displayed during checkout (including JazzCash, Easypaisa, SadaPay, UPaisa, or direct Bank Transfer / Raast). Users must submit their valid Transaction ID (TID) or transfer screenshot for instant verification. Upon administrative approval, your active hens and daily egg yield cycle begin immediately. For any assistance, reach out via our 24/7 Farm SOS Support.`}
          </p>
        </div>
      </div>
    </div>
  );
};
