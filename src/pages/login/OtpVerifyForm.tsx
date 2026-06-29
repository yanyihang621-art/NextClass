import React from 'react';

interface OtpVerifyFormProps {
  otpCode: string;
  setOtpCode: (val: string) => void;
  successMsg: string;
  error: string;
  submitting: boolean;
  resendCooldown: number;
  handleSubmit: (e: React.FormEvent) => void;
  handleResendOtp: () => void;
  submitLabel: string;
  submittingLabel: string;
}

export default function OtpVerifyForm({
  otpCode,
  setOtpCode,
  successMsg,
  error,
  submitting,
  resendCooldown,
  handleSubmit,
  handleResendOtp,
  submitLabel,
  submittingLabel,
}: OtpVerifyFormProps) {
  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 animate-in fade-in duration-200">
      {/* OTP illustration */}
      <div className="flex justify-center mb-2">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <span className="material-symbols-outlined text-primary text-3xl">verified</span>
        </div>
      </div>

      {/* OTP input */}
      <div>
        <label className="block text-sm font-bold text-slate-500 mb-1.5 pl-1">验证码</label>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 text-xl">pin</span>
          <input
            id="otp-input"
            type="text"
            value={otpCode}
            onChange={(e) => {
              const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
              setOtpCode(val);
            }}
            placeholder="输入验证码"
            autoComplete="one-time-code"
            inputMode="numeric"
            maxLength={6}
            className="w-full bg-white border border-slate-200 rounded-xl py-3.5 pl-11 pr-4 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all text-slate-800 placeholder:text-slate-300 text-center text-lg tracking-[0.5em] font-mono"
          />
        </div>
      </div>

      {/* Success message */}
      {successMsg && (
        <div className="flex items-center gap-2 bg-primary/10 text-primary text-sm py-3 px-4 rounded-xl border border-primary/20">
          <span className="material-symbols-outlined text-lg">check_circle</span>
          <span className="font-medium">{successMsg}</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 bg-primary/10 text-primary text-sm py-3 px-4 rounded-xl border border-primary/20">
          <span className="material-symbols-outlined text-lg">error</span>
          <span className="font-medium">{error}</span>
        </div>
      )}

      {/* Submit */}
      <button
        id="verify-submit-btn"
        type="submit"
        disabled={submitting || otpCode.length !== 6}
        className="w-full py-3.5 bg-primary text-white rounded-xl font-bold text-base hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {submitting ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span>{submittingLabel}...</span>
          </>
        ) : (
          <span>{submitLabel}</span>
        )}
      </button>

      {/* Resend OTP */}
      <div className="text-center">
        <button
          type="button"
          onClick={handleResendOtp}
          disabled={resendCooldown > 0}
          className="text-sm text-primary font-medium hover:underline disabled:text-slate-300 disabled:no-underline disabled:cursor-not-allowed"
        >
          {resendCooldown > 0 ? `${resendCooldown}s 后可重新发送` : '重新发送验证码'}
        </button>
      </div>
    </form>
  );
}
