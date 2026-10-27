import {createContext, useCallback, useContext, useMemo, useState} from 'react';
import React from 'react';
import {zhCN} from './locales/zh-CN';
import {en} from './locales/en';

export type Locale = 'en' | 'zh-CN';

const dictionaries: Record<Locale, Record<string, string>> = {
	en,
	'zh-CN': zhCN,
};

type I18nContextValue = {
	locale: Locale;
	setLocale: (locale: Locale) => void;
};

const I18nContext = createContext<I18nContextValue>({
	locale: 'zh-CN',
	setLocale: () => undefined,
});

export const I18nProvider: React.FC<{readonly children: React.ReactNode}> = ({
	children,
}) => {
	const [locale, setLocaleState] = useState<Locale>(
		() => (localStorage.getItem('remotion.locale') as Locale) || 'zh-CN',
	);

	const setLocale = useCallback((next: Locale) => {
		setLocaleState(next);
		localStorage.setItem('remotion.locale', next);
	}, []);

	const value = useMemo(() => ({locale, setLocale}), [locale, setLocale]);

	return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useLocale = (): Locale => {
	return useContext(I18nContext).locale;
};

export const useSetLocale = (): ((locale: Locale) => void) => {
	return useContext(I18nContext).setLocale;
};

const interpolate = (
	template: string,
	params: Record<string, string | number>,
): string => {
	return template.replace(/\{(\w+)\}/g, (match, key: string) => {
		return key in params ? String(params[key]) : match;
	});
};

export const useTranslation = () => {
	const {locale} = useContext(I18nContext);

	const translate = useCallback(
		(key: string, params?: Record<string, string | number>): string => {
			const dict = dictionaries[locale] ?? dictionaries.en;
			const fallback = dictionaries.en[key] ?? key;
			const text = dict[key] ?? fallback;
			return params ? interpolate(text, params) : text;
		},
		[locale],
	);

	return {t: translate, locale};
};

export const getStaticT = (): ((key: string) => string) => {
	const stored = localStorage.getItem('remotion.locale') as Locale | null;
	const locale = stored ?? 'zh-CN';
	const dict = dictionaries[locale] ?? dictionaries.en;
	return (key: string) => dict[key] ?? dictionaries.en[key] ?? key;
};
