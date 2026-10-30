import {expect, test} from 'bun:test';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import type {SettingsTab} from '../helpers/settings-tab-availability';

// Every tab that getAvailableSettingsTabs() can return must have a panel
// branch in SettingsModal.tsx. A tab with a sidebar button but no panel opens
// an empty dialog, which is worse than not offering the tab at all.
//
// This is checked by reading the source rather than rendering, because
// SettingsModal needs the full Studio runtime context (preview server
// connection, update status, settings provider) that no unit test provides.
const settingsModalPath = path.join(
	__dirname,
	'..',
	'components',
	'SettingsModal.tsx',
);

const getSettingsModalSource = () => readFileSync(settingsModalPath, 'utf8');

const getRenderedPanels = (source: string): SettingsTab[] => {
	const matches = source.matchAll(/openedTabs\.includes\('([a-z]+)'\)/g);
	const panels: SettingsTab[] = [];
	for (const match of matches) {
		panels.push(match[1] as SettingsTab);
	}

	return panels;
};

const getRenderedTabButtons = (source: string): SettingsTab[] => {
	const matches = source.matchAll(/availableTabs\.includes\('([a-z]+)'\)/g);
	const buttons: SettingsTab[] = [];
	for (const match of matches) {
		buttons.push(match[1] as SettingsTab);
	}

	return buttons;
};

test('every settings tab button has a matching panel branch', () => {
	const source = getSettingsModalSource();
	const panels = getRenderedPanels(source);
	const buttons = getRenderedTabButtons(source);

	expect(buttons.length).toBeGreaterThan(0);

	const missingPanels = buttons.filter((tab) => !panels.includes(tab));

	expect(missingPanels).toEqual([]);
});

test('the license tab renders a panel and not just a button', () => {
	const source = getSettingsModalSource();

	expect(getRenderedTabButtons(source)).toContain('license');
	expect(getRenderedPanels(source)).toContain('license');
});

test('the updates tab renders a panel and not just a button', () => {
	const source = getSettingsModalSource();

	expect(getRenderedTabButtons(source)).toContain('updates');
	expect(getRenderedPanels(source)).toContain('updates');
});
