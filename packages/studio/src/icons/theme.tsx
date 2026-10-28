import type {SVGProps} from 'react';
import {CURRENT_COLOR_LOWERCASE} from '../helpers/colors';

const sunPath =
	'M256 128a128 128 0 1 1 0 256 128 128 0 1 1 0-256zm0 32a96 96 0 1 0 0 192 96 96 0 1 0 0-192zM240 0h32v96h-32V0zm0 416h32v96h-32v-96zM0 240h96v32H0v-32zm416 0h96v32h-96v-32zM50.7 73.5l22.6-22.6 67.9 67.9-22.6 22.6-67.9-67.9zm288.1 288.1 22.6-22.6 67.9 67.9-22.6 22.6-67.9-67.9zm67.9-310.7 22.6 22.6-67.9 67.9-22.6-22.6 67.9-67.9zM50.7 438.5l-22.6-22.6 67.9-67.9 22.6 22.6-67.9 67.9z';

const moonPath = 'M288 0a256 256 0 1 0 224 384A288 288 0 0 1 288 0z';

export const ThemeIcon = ({
	color,
	theme,
	...props
}: SVGProps<SVGSVGElement> & {readonly theme: 'dark' | 'light'}) => (
	<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" {...props}>
		<path
			fill={color ?? CURRENT_COLOR_LOWERCASE}
			d={theme === 'dark' ? sunPath : moonPath}
		/>
	</svg>
);
