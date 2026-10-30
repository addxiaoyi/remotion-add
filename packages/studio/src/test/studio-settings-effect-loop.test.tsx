import {afterEach, expect, mock, test} from 'bun:test';
import {cleanup, render} from '@testing-library/react';
import React from 'react';
import {I18nProvider} from '../i18n';

// StudioSettings mirrors external settings into local state inside an effect.
// That effect calls setEditedSetters(new Set()), and a freshly allocated Set is
// a new reference every time. If editedSetters is in the dependency array the
// effect re-arms itself on every pass, so React re-renders forever.
//
// useSettings() runs on every render, so counting its calls counts renders.
// Past RENDER_LIMIT we throw instead of letting the test hang: an unbounded
// render loop must surface as a failed assertion, not as a stuck process.
const RENDER_LIMIT = 50;

let renderCount = 0;

const settingsValue = {
	codingAgentInfo: null,
	editorInfo: null,
	error: null,
	publicLicenseKey: null,
	remotionSkillsInfo: null,
	renderDefaults: null,
	revision: 1,
	studioRuntimeConfig: {
		configFileStudioSettings: {
			numberOfSharedAudioTags: 5,
			defaultPremountInSeconds: 2,
			sequenceActivityLimit: 100,
		},
	},
	skillAction: null,
	skillActionError: null,
	setPublicLicenseKey: () => undefined,
	installSkill: () => Promise.resolve(),
	removeSkill: () => Promise.resolve(),
	upgradeSkill: () => Promise.resolve(),
};

mock.module('../components/SettingsContext', () => ({
	useSettings: () => {
		renderCount++;
		if (renderCount > RENDER_LIMIT) {
			throw new Error(
				`StudioSettings rendered more than ${RENDER_LIMIT} times without settling`,
			);
		}

		return settingsValue;
	},
}));

mock.module('../components/use-auto-save-config', () => ({
	useAutoSaveConfig: () => undefined,
}));

const loadStudioSettings = async () =>
	(await import('../components/StudioSettings')).StudioSettings;

const wrap = (StudioSettings: React.ComponentType) =>
	React.createElement(I18nProvider, null, React.createElement(StudioSettings));

afterEach(() => {
	cleanup();
	renderCount = 0;
});

test('mounting the settings panel settles instead of re-rendering forever', async () => {
	render(wrap(await loadStudioSettings()));

	await new Promise((resolve) => setTimeout(resolve, 50));

	expect(renderCount).toBeLessThanOrEqual(5);
});

test('mirrors the external config values into the rendered inputs', async () => {
	const {container} = render(wrap(await loadStudioSettings()));

	await new Promise((resolve) => setTimeout(resolve, 50));

	const inputValues = Array.from(container.querySelectorAll('input')).map(
		(input) => (input as HTMLInputElement).value,
	);

	// sequenceActivityLimit is rendered by ConfigNumber as a plain input, so it
	// is the stable witness that the effect copied the external config in.
	expect(inputValues).toContain('100');
});
