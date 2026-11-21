export type NavItem = {
  href: string;
  label: string;
  /** Показывать в нижней панели на телефоне */
  mobile: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Главная", mobile: true },
  { href: "/leads", label: "Заявки", mobile: true },
  { href: "/pipeline", label: "Воронка", mobile: true },
  { href: "/tasks", label: "Задачи", mobile: true },
  { href: "/clients", label: "Клиенты", mobile: false },
  { href: "/messages", label: "Сообщения", mobile: false },
  { href: "/analytics", label: "Аналитика", mobile: false },
  { href: "/settings", label: "Настройки", mobile: false },
];
