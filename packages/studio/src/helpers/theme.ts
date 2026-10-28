import {useCallback, useEffect, useState} from 'react';

export type StudioTheme = 'dark' | 'light';

export const THEME_STORAGE_KEY = 'remotion.studio.theme';
export const THEME_ATTRIBUTE = 'data-remotion-studio-theme';

// The Studio ships a dark palette by default, so 'dark' is the fallback.
export const getStoredTheme = (): StudioTheme => {
	if (typeof localStorage === 'undefined') {
		return 'dark';
	}

	const stored = (() => {
		try {
			return localStorage.getItem(THEME_STORAGE_KEY);
		} catch {
			return null;
		}
	})();

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

	useEffect(() => {
		// Keep other Studio tabs in sync when one of them toggles.
		const onStorage = (event: StorageEvent) => {
			if (event.key !== THEME_STORAGE_KEY) {
				return;
			}

			setTheme(event.newValue === 'light' ? 'light' : 'dark');
		};

		window.addEventListener('storage', onStorage);
		return () => window.removeEventListener('storage', onStorage);
	}, []);

	const toggleTheme = useCallback(() => {
		setTheme((previous) => {
			const next: StudioTheme = previous === 'dark' ? 'light' : 'dark';
			try {
				localStorage.setItem(THEME_STORAGE_KEY, next);
			} catch {
				// Storage can be unavailable (private mode, quota). The theme still
				// applies for this session.
			}

			return next;
		});
	}, []);

	return {theme, toggleTheme};
};
