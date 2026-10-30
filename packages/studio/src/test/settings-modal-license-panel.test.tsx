import {afterEach, expect, mock, test} from 'bun:test';
import {cleanup, render, screen} from '@testing-library/react';
import React from 'react';
import {I18nProvider} from '../i18n';

// The license-key install flow asks the settings modal to open on the license
// tab. Reconnecting the panel means the tab must actually mount the license
// settings -- not just be listed as available.
// Keep `studioRuntimeConfig` referentially stable: sibling panels read it from
// an effect and a fresh object per access would re-run that effect forever.
const studioRuntimeConfig = {
	configFileStudioSettings: {
		keyboardShortcutsEnabled: false,
	},
};

const settingsValue = {
	error: null,
	publicLicenseKey: null,
	revision: 0,
	setPublicLicenseKey: () => undefined,
	studioRuntimeConfig,
};

mock.module('../components/SettingsContext', () => ({
	useSettings: () => settingsValue,
}));

mock.module('../components/UpdateStatusContext', () => ({
	useUpdateStatus: () => ({upgradeState: 'idle'}),
}));

mock.module('../helpers/can-show-updates', () => ({
	canShowUpdates: () => false,
}));

mock.module('../helpers/browser-studio-operations', () => ({
	getBrowserStudioOperations: () => null,
}));

mock.module('../helpers/client-id', () => ({
	StudioServerConnectionCtx: React.createContext({
		previewServerState: {type: 'connected'},
		subscribeToEvent: () => () => undefined,
	}),
}));

mock.module('../components/call-api', () => ({
	callApi: () => Promise.resolve({}),
}));

afterEach(() => {
	cleanup();
});

test('the license tab mounts the license settings panel', async () => {
	(
		window as unknown as {remotion_isReadOnlyStudio: boolean}
	).remotion_isReadOnlyStudio = false;
	(
		window as unknown as {remotion_packageManager: string}
	).remotion_packageManager = 'unknown';

	const {SettingsModal} = await import('../components/SettingsModal');

	render(
		React.createElement(
			I18nProvider,
			null,
			React.createElement(SettingsModal, {
				initialPublicLicenseKey: null,
				initialStudioPane: null,
				initialTab: 'license',
			}),
		),
	);

	expect(
		screen.queryByRole('radiogroup', {name: 'License type'}),
	).not.toBeNull();
	expect(
		screen.queryByText('I am eligible for the Free License'),
	).not.toBeNull();
	expect(screen.queryByText('I need a Company License')).not.toBeNull();
});

test('the license panel is not mounted when another tab is requested', async () => {
	(
		window as unknown as {remotion_isReadOnlyStudio: boolean}
	).remotion_isReadOnlyStudio = false;
	(
		window as unknown as {remotion_packageManager: string}
	).remotion_packageManager = 'unknown';

	const {SettingsModal} = await import('../components/SettingsModal');

	render(
		React.createElement(
			I18nProvider,
			null,
			React.createElement(SettingsModal, {
				initialPublicLicenseKey: null,
				initialStudioPane: null,
				initialTab: 'shortcuts',
			}),
		),
	);

	expect(screen.queryByRole('radiogroup', {name: 'License type'})).toBeNull();
});
