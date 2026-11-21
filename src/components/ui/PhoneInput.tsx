"use client";

import { useState } from "react";
import { maskPhone, nationalDigits } from "@/lib/utils/phone-mask";
import { inputCls } from "./styles";

const PATTERN = String.raw`\+7\(\d{3}\)-\d{3}-\d{2}-\d{2}`;

/** Поле телефона с маской +7(999)-999-99-99. Префикс +7 нельзя убрать. */
export function PhoneInput({
  id,
  name,
  defaultValue = "",
  required = false,
}: {
  id: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
}) {
  const [value, setValue] = useState(defaultValue);

  return (
    <input
      id={id}
      name={name}
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      placeholder="+7(999)-999-99-99"
      value={value}
      maxLength={17}
      required={required}
      pattern={PATTERN}
      title="Формат: +7(999)-999-99-99"
      className={inputCls}
      onChange={(e) => setValue(maskPhone(e.target.value, value))}
      onFocus={() => {
        if (value === "") setValue("+7(");
      }}
      onBlur={() => {
        // Пустую «заготовку» +7( не оставляем в поле
        if (nationalDigits(value).length === 0) setValue("");
      }}
    />
  );
}
