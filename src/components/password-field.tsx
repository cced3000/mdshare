"use client";

import { Eye, EyeOff } from "lucide-react";
import { useId, useState } from "react";
import type { ChangeEvent } from "react";

import { useI18n } from "@/components/i18n-provider";

type PasswordFieldProps = {
  className?: string;
  disabled?: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  value: string;
};

export function PasswordField({
  className = "field-control",
  disabled = false,
  onChange,
  placeholder,
  value,
}: PasswordFieldProps) {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);
  const buttonId = useId();

  return (
    <div className="password-field">
      <input
        aria-describedby={buttonId}
        className={className}
        disabled={disabled}
        onChange={onChange}
        placeholder={placeholder}
        type={visible ? "text" : "password"}
        value={value}
      />
      <button
        id={buttonId}
        aria-label={visible ? t("password.hide") : t("password.show")}
        aria-pressed={visible}
        className="password-visibility-button"
        disabled={disabled}
        onClick={() => setVisible((current) => !current)}
        type="button"
      >
        {visible ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}
