// SaaS 模式功能开关
// 根据许可证条款，SaaS 化部署时需禁用以下能力：
// - 让用户导出完整 Remotion 工程（含代码）
// - 让用户使用自己的 AI 编码智能体直接改代码
// - 暴露原生代码重构入口
// 模板化、参数化编辑、AI 由服务端生成的代码不受影响。

declare global {
	interface Window {
		remotion_saasMode?: boolean;
	}
}

// 商用白标构建默认启用 SaaS 模式，由 studio-html.ts 注入 remotion_saasMode。
// 本地开发需要完整 Remotion 能力时，两种方式退出：
// - 首次加载的地址带 ?saas=0（Studio 跳转到具体合成后会丢掉查询参数）
// - 或在控制台执行 localStorage.setItem('remotion.studio.saasMode', 'off') 后刷新
const SAAS_STORAGE_KEY = 'remotion.studio.saasMode';

const saasQueryParam =
	typeof window === 'undefined'
		? null
		: new URLSearchParams(window.location.search).get('saas');

const saasOptedOut = (() => {
	if (typeof localStorage === 'undefined') {
		return false;
	}

	try {
		return localStorage.getItem(SAAS_STORAGE_KEY) === 'off';
	} catch {
		// Storage can be unavailable (private mode, quota). Keep SaaS mode on.
		return false;
	}
})();

const isSaaSMode =
	typeof window !== 'undefined' &&
	saasQueryParam !== '0' &&
	!saasOptedOut &&
	window.remotion_saasMode !== false;

export const isSaasMode = (): boolean => {
	return isSaaSMode;
};
