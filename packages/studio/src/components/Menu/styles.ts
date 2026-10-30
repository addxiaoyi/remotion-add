import type React from 'react';
import {
	BLUE,
	OVERLAY_BACKGROUND,
	OVERLAY_BORDER,
	SHADOW_BLACK_ALPHA_50_TOWARDS_BOTTOM,
	SHADOW_BLACK_ALPHA_50_TOWARDS_TOP,
	WHITE,
} from '../../helpers/colors';

export const MENU_VERTICAL_PADDING = 4;
export const SUBMENU_LEFT_INSET = -8;

export const MAX_MENU_WIDTH = 400;
export const MAX_MOBILE_MENU_WIDTH = 300;

const menuContainer: React.CSSProperties = {
	// Dedicated overlay surface, not the page background: a menu painted the same
	// colour as the surface behind it reads as unpainted instead of floating.
	backgroundColor: OVERLAY_BACKGROUND,
	border: `1px solid ${OVERLAY_BORDER}`,
	borderRadius: 6,
	position: 'fixed',
	color: WHITE,
	userSelect: 'none',
	WebkitUserSelect: 'none',
};

export const SHADOW_TOWARDS_BOTTOM = SHADOW_BLACK_ALPHA_50_TOWARDS_BOTTOM;
export const SHADOW_TOWARDS_TOP = SHADOW_BLACK_ALPHA_50_TOWARDS_TOP;

export const menuContainerTowardsBottom: React.CSSProperties = {
	...menuContainer,
	boxShadow: SHADOW_TOWARDS_BOTTOM,
};

export const menuContainerTowardsTop: React.CSSProperties = {
	...menuContainer,
	boxShadow: SHADOW_TOWARDS_TOP,
};

export const fullScreenOverlay: React.CSSProperties = {
	position: 'fixed',
	top: 0,
	left: 0,
	right: 0,
	bottom: 0,
};

export const outerPortal: React.CSSProperties = {
	position: 'fixed',
};

export const inlineCodeSnippet: React.CSSProperties = {
	fontSize: 14,
	color: BLUE,
	fontFamily: 'monospace',
};
