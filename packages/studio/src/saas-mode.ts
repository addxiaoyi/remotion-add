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

const isSaaSMode =
	typeof window !== 'undefined' &&
	(window.remotion_saasMode === true ||
		new URLSearchParams(window.location.search).get('saas') === '1');

export const isSaasMode = (): boolean => {
	return isSaaSMode;
};
