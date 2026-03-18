"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  DEFAULT_LANGUAGE,
  getHtmlLang,
  isLanguage,
  LANGUAGE_OPTIONS,
  LANGUAGE_STORAGE_KEY,
  translate,
  type Language,
  type TranslationKey,
} from "@/lib/i18n";

type I18nContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function getInitialLanguage() {
  if (typeof window === "undefined") {
    return DEFAULT_LANGUAGE;
  }

  const storedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return isLanguage(storedLanguage) ? storedLanguage : DEFAULT_LANGUAGE;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(getInitialLanguage);

  useEffect(() => {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    document.documentElement.lang = getHtmlLang(language);
  }, [language]);

  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>) =>
      translate(language, key, params),
    [language],
  );

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t,
    }),
    [language, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error("useI18n must be used within I18nProvider.");
  }

  return context;
}

export function AppFooter() {
  const { language, setLanguage, t } = useI18n();

  return (
    <footer className="app-footer">
      <div className="app-footer-inner">
        <span className="language-switcher-label">{t("footer.language")}</span>
        <div className="language-switcher" role="group" aria-label={t("footer.language")}>
          {LANGUAGE_OPTIONS.map((option) => (
            <button
              key={option.value}
              className={`language-switcher-button${language === option.value ? " is-active" : ""}`}
              onClick={() => setLanguage(option.value)}
              type="button"
            >
              {t(option.labelKey)}
            </button>
          ))}
        </div>
      </div>
    </footer>
  );
}
