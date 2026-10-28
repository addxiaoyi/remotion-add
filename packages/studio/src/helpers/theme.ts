import {useCallback, useEffect, useState} from 'react';

export type StudioTheme = 'dark' | 'light';

export const THEME_STORAGE_KEY = 'remotion.studio.theme';
export const THEME_ATTRIBUTE = 'data-remotion-studio-theme';

// The Studio ships a dark palette by default, so 'dark' is the fallback.
export const getStoredTheme = (): StudioTheme => {
	if (typeof localStorage === 'undefined') {
		return 'dark';
	}

	const stored = localStorage.getItem(THEME_STORAGE_KEY);
	return stored === 'light' ? 'light' : 'dark';
};

export const applyTheme = (theme: StudioTheme) => {
	if (typeof document === 'undefined') {
		return;
	}

	// studio-css-variables.ts ships a light override for this attribute.
	document.documentElement.setAttribute(THEME_ATTRIBUTE, theme);
};

export const useStudioTheme = () => {
	const [theme, setTheme] = useState<StudioTheme>(getStoredTheme);

	useEffect(() => {
		applyTheme(theme);
	}, [theme]);

	const toggleTheme = useCallback(() => {
		setTheme((previous) => {
			const next: StudioTheme = previous === 'dark' ? 'light' : 'dark';
			localStorage.setItem(THEME_STORAGE_KEY, next);
			return next;
		});
	}, []);

	return {theme, toggleTheme};
};
