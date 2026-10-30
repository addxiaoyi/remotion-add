import {afterEach, expect, mock, test} from 'bun:test';
import {cleanup, fireEvent, render} from '@testing-library/react';
import React from 'react';
import {I18nProvider} from '../i18n';

// A local edit must survive an external config revision arriving while the user
// is still editing. The mirroring effect resets local state from the external
// config, so without a guard it silently discards the pending edit.
//
// The mock must keep `studioRuntimeConfig` referentially stable between
// renders: the effect depends on it, and a fresh object per access would make
// the effect re-run forever and hang the test rather than fail it.
const RENDER_LIMIT = 200;
let renderCount = 0;
let currentRevision = 1;
let currentConfig = {
	configFileStudioSettings: {
		numberOfSharedAudioTags: null,
		defaultPremountInSeconds: null,
		sequenceActivityLimit: 100 as number | null,
	},
};

const settingsValue = {
	codingAgentInfo: null,
	editorInfo: null,
	error: null,
	publicLicenseKey: null,
	remotionSkillsInfo: null,
	renderDefaults: null,
	get revision() {
		return currentRevision;
	},
	get studioRuntimeConfig() {
		return currentConfig;
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

const findInputByValue = (container: HTMLElement, value: string) =>
	Array.from(container.querySelectorAll('input')).find(
		(element) => (element as HTMLInputElement).value === value,
	) as HTMLInputElement | undefined;

afterEach(() => {
	cleanup();
	renderCount = 0;
	currentRevision = 1;
	currentConfig = {
		configFileStudioSettings: {
			numberOfSharedAudioTags: null,
			defaultPremountInSeconds: null,
			sequenceActivityLimit: 100,
		},
	};
});

test('an external revision does not discard an unsaved local edit', async () => {
	const {container, rerender} = render(wrap(await loadStudioSettings()));

	await new Promise((resolve) => setTimeout(resolve, 50));

	const input = findInputByValue(container, '100');
	expect(input).toBeDefined();

	// The user types a new value, which marks the field as edited.
	fireEvent.change(input as HTMLInputElement, {target: {value: '250'}});

	await new Promise((resolve) => setTimeout(resolve, 20));

	// The typed value must have landed in the panel before the external
	// revision arrives, otherwise this test would pass or fail for a reason
	// unrelated to the guard.
	expect(findInputByValue(container, '250')).toBeDefined();

	// Another Studio client saves the config, bumping the revision and shipping
	// a new external object.
	currentRevision = 2;
	currentConfig = {
		configFileStudioSettings: {
			numberOfSharedAudioTags: null,
			defaultPremountInSeconds: null,
			sequenceActivityLimit: 300,
		},
	};
	rerender(wrap(await loadStudioSettings()));

	await new Promise((resolve) => setTimeout(resolve, 50));

	// The pending local edit must still be there.
	expect(findInputByValue(container, '250')).toBeDefined();
});

test('a clean panel still adopts the external config on a new revision', async () => {
	const {container, rerender} = render(wrap(await loadStudioSettings()));

	await new Promise((resolve) => setTimeout(resolve, 50));
	expect(findInputByValue(container, '100')).toBeDefined();

	currentRevision = 3;
	currentConfig = {
		configFileStudioSettings: {
			numberOfSharedAudioTags: null,
			defaultPremountInSeconds: null,
			sequenceActivityLimit: 400,
		},
	};
	rerender(wrap(await loadStudioSettings()));

	await new Promise((resolve) => setTimeout(resolve, 50));

	expect(findInputByValue(container, '400')).toBeDefined();
});
