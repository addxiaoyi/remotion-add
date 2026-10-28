import React, {useCallback} from 'react';
import {WHITE_ALPHA_80} from '../helpers/colors';
import {useStudioTheme} from '../helpers/theme';
import {ThemeIcon} from '../icons/theme';
import {ActionTooltip} from './ActionTooltip';
import type {RenderInlineAction} from './InlineAction';
import {InlineAction} from './InlineAction';

export const StudioThemeToggle: React.FC = () => {
	const {theme, toggleTheme} = useStudioTheme();

	const renderThemeIcon: RenderInlineAction = useCallback(
		(color) => {
			return <ThemeIcon color={color} theme={theme} width={16} height={16} />;
		},
		[theme],
	);

	const label =
		theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';

	return (
		<ActionTooltip label={label} shortcut={null} delay={800} dismissOnClick>
			<InlineAction
				variant={null}
				onClick={toggleTheme}
				renderAction={renderThemeIcon}
				unhoveredColor={WHITE_ALPHA_80}
				aria-label={label}
			/>
		</ActionTooltip>
	);
};
