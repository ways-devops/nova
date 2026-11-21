// Константы и русские подписи. Файл без серверного кода — можно импортировать
// и в серверных, и в клиентских компонентах (из @prisma/client только типы).
import type {
  BusinessType,
  ContractStatus,
  LeadSource,
  LeadStatus,
  ServiceType,
  TaxSystem,
} from "@prisma/client";

export const LEAD_STATUSES = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "PROPOSAL",
  "NEGOTIATION",
  "WON",
  "LOST",
] as const satisfies readonly LeadStatus[];

export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  NEW: "Новая заявка",
  CONTACTED: "Связались",
  QUALIFIED: "Потребность выяснена",
  PROPOSAL: "Предложение отправлено",
  NEGOTIATION: "Переговоры",
  WON: "Стал клиентом",
  LOST: "Потеряна",
};

export const LEAD_STATUS_BADGE: Record<LeadStatus, string> = {
  NEW: "bg-slate-100 text-slate-700",
  CONTACTED: "bg-sky-100 text-sky-700",
  QUALIFIED: "bg-indigo-100 text-indigo-700",
  PROPOSAL: "bg-amber-100 text-amber-700",
  NEGOTIATION: "bg-orange-100 text-orange-700",
  WON: "bg-emerald-100 text-emerald-700",
  LOST: "bg-rose-100 text-rose-700",
};

export const LEAD_SOURCES = [
  "AVITO",
  "WEBSITE",
  "REFERRAL",
  "TELEGRAM",
  "ADS",
  "OTHER",
] as const satisfies readonly LeadSource[];

export const SOURCE_LABEL: Record<LeadSource, string> = {
  AVITO: "Авито",
  WEBSITE: "Сайт",
  REFERRAL: "Рекомендация",
  TELEGRAM: "Telegram",
  ADS: "Реклама",
  OTHER: "Другое",
};

export const BUSINESS_TYPES = ["IP", "OOO"] as const satisfies readonly BusinessType[];

export const BUSINESS_TYPE_LABEL: Record<BusinessType, string> = {
  IP: "ИП",
  OOO: "ООО",
};

export const SERVICES = [
  "FULL_ACCOUNTING",
  "TAX_REPORTING",
  "PAYROLL",
  "REGISTRATION",
  "CONSULTING",
  "OTHER",
] as const satisfies readonly ServiceType[];

export const SERVICE_LABEL: Record<ServiceType, string> = {
  FULL_ACCOUNTING: "Ведение бухгалтерии",
  TAX_REPORTING: "Сдача отчётности",
  PAYROLL: "Зарплата и кадры",
  REGISTRATION: "Регистрация / ликвидация",
  CONSULTING: "Консультации",
  OTHER: "Другое",
};

export const TAX_SYSTEMS = [
  "USN_INCOME",
  "USN_INCOME_EXPENSE",
  "PATENT",
  "OSNO",
  "AUSN",
  "NPD",
  "OTHER",
] as const satisfies readonly TaxSystem[];

export const TAX_SYSTEM_LABEL: Record<TaxSystem, string> = {
  USN_INCOME: "УСН «Доходы»",
  USN_INCOME_EXPENSE: "УСН «Доходы – расходы»",
  PATENT: "Патент",
  OSNO: "ОСНО",
  AUSN: "АУСН",
  NPD: "НПД",
  OTHER: "Другая",
};

export const CONTRACT_STATUSES = [
  "ACTIVE",
  "PAUSED",
  "TERMINATED",
] as const satisfies readonly ContractStatus[];

export const CONTRACT_STATUS_LABEL: Record<ContractStatus, string> = {
  ACTIVE: "Действует",
  PAUSED: "Приостановлен",
  TERMINATED: "Расторгнут",
};

export const LOST_REASON_SUGGESTIONS = [
  "Дорого",
  "Выбрали другого",
  "Не отвечает",
  "Не актуально",
  "Ведёт бухгалтерию сам",
];

export const TASK_PRIORITIES = ["LOW", "MEDIUM", "HIGH"] as const;

export const TASK_PRIORITY_LABEL: Record<(typeof TASK_PRIORITIES)[number], string> = {
  LOW: "Низкий",
  MEDIUM: "Обычный",
  HIGH: "Высокий",
};

export const TASK_PRIORITY_BADGE: Record<(typeof TASK_PRIORITIES)[number], string> = {
  LOW: "bg-slate-100 text-slate-600",
  MEDIUM: "bg-sky-100 text-sky-700",
  HIGH: "bg-rose-100 text-rose-700",
};
