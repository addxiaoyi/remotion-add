import {useTranslation} from '../../i18n';
import React from 'react';
import {LIGHT_TEXT} from '../../helpers/colors';

const container: React.CSSProperties = {
	padding: 80,
	color: LIGHT_TEXT,
	textAlign: 'center',
	fontSize: 14,
};

export type QuickSwitcherMode = 'assets' | 'commands' | 'compositions' | 'docs';

const MODE_TO_STRING: {[key in QuickSwitcherMode]: string} = {
	assets: 'assets',
	commands: 'commands',
	compositions: 'compositions',
	docs: 'documentation',
};

export const QuickSwitcherNoResults: React.FC<{
	readonly query: string;
	readonly mode: QuickSwitcherMode;
}> = ({query, mode}) => {
	const {t} = useTranslation();
	return (
		<div style={container}>
			{t('No results matching')} {MODE_TO_STRING[mode]} {'"'}
			{query}
			{'"'}
		</div>
	);
};
