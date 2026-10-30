# Remotion Studio 状态可靠性与现有改动增量收口设计

## 目标

以 `_upstream` 为唯一工作仓库，在保留现有未提交修改的前提下，继续收口 Remotion Studio 的状态可靠性细节，并审查根目录候选文件与菜单浮层视觉改动。最终结果必须通过新增回归测试、既有测试、TypeScript 类型检查和格式检查验证；不得以编译通过替代行为验证。

## 已确认范围

### 处理范围

1. Updates 能力状态统一：capability、请求生命周期、错误与 Retry、已有信息后的错误优先展示、初始 Updates tab 安全回退。
2. Studio 设置同步可靠性：外部 revision、dirty/saving 冲突、明确的加载外部版本/保留本地版本选择、保存 generation 防旧响应覆盖。
3. Agent Skills 异步竞态：同一技能操作互斥或淘汰旧操作、操作与 refresh 的错误组合、卸载后禁止异步回写、busy/error/unknown 反馈。
4. 根目录 8 个候选文件与 `_upstream/packages/studio/src/components/` 对应文件逐一差异审查；仅合并有证据属于上述范围且能通过测试、类型和格式检查的内容。
5. 菜单浮层视觉改动单独审查，保留与浮层可辨识性直接相关的改动；不借机改动无关视觉 token、Modal 焦点或无障碍结构。

### 不处理

- 不改变后端更新 API 或响应格式。
- 不处理渲染队列持久化。
- 不删除或放宽既有断言。
- 不回滚或覆盖 `_upstream` 中与本轮无关的既有未提交修改。
- 不将根目录候选文件整体覆盖到基线。
- 不以推测、总结或代理报告替代真实命令输出。

## 工作目录与变更保护

- 唯一实现目录为 `D:/qwq/项目/remotion/_upstream`。
- 操作前保留 `git status --short`、`git diff --stat` 与关键文件差异证据。
- `_upstream` 当前已有大量未提交修改；所有编辑必须基于最新文件内容进行，避免覆盖已有变更。
- 设计文档和实施计划属于本轮新增文档；生产代码变更按文件域拆分并逐步验证。

## 实施顺序

### 阶段 1：基线与候选审查

记录仓库状态，定位现有更新、设置、Skills 测试入口，逐一比较根目录候选文件与基线对应文件，并检查实际引用关系。候选内容只有在明确属于本轮目标时才进入后续实现。

### 阶段 2：测试先行

在任何生产实现修改前，先新增或补充最小回归测试，并实际运行确认失败原因对应缺失行为：

- Updates：capability 关闭不发请求；请求失败进入 error；Retry 重新发起请求；已有 info 时 error 优先可见；初始 Updates tab 在 capability 关闭时安全回退。
- Studio 设置：clean/dirty/saving 接收外部 revision；冲突选择语义；旧保存响应不能覆盖新编辑；保存失败保留本地编辑并可重试。
- Skills：同一技能并发操作竞态；操作失败但 refresh 成功时同时保留错误和最新状态；双失败为 unknown 并提供 Retry；Provider 卸载后不回写状态；操作中暴露 busy/status。
- 菜单视觉：若没有稳定的渲染测试基础，只做静态类型/格式检查和代码证据审查，不宣称已完成视觉验证。

### 阶段 3：最小实现与整合

将 capability、revision 和 action generation 收敛到现有 Context/Settings 状态边界。展示组件只消费状态并派发动作，不重复推导。所有异步 continuation 在提交 React state、通知或刷新结果前检查 generation、取消状态和 mounted 状态。

共享的 `SettingsContext.tsx` 修改由主代理串行整合，避免设置同步与 Skills 竞态互相覆盖。每轮实现后先运行对应定向测试，再进入下一轮。

### 阶段 4：完整验证

至少执行并保留真实输出：

```bash
bun test --preload ./happydom.ts <Updates/Settings/Skills 定向测试>
bunx tsc -p packages/studio/tsconfig.json --noEmit
bunx oxfmt <所有本轮修改的 TS/TSX 文件> --check
```

根据定向测试结果决定是否执行 Studio 相关全量测试。任何失败都必须记录实际退出码、文件行号和原始错误；未执行的检查不得写成通过。

## 成功标准

- 所有新增回归测试先观察到预期失败，再由最小实现使其通过。
- Updates、Studio 设置、Skills 的目标行为均有测试证据；既有断言未被删除或放宽。
- TypeScript 检查与格式检查的退出码为 0，或明确记录与本轮无关的环境阻塞。
- 根目录候选文件逐一完成“合并/不合并”判定，并有差异或测试证据支撑。
- 菜单视觉改动的保留或回退有文件差异证据；不把静态检查描述为视觉验收。
- 最终工作树只包含经过审查的本轮变更和原有未提交修改，不覆盖无关工作。

## 风险与处置

- **现有工作树混杂大量格式化修改**：不执行全仓格式化；只对本轮文件运行格式检查。
- **根目录候选文件版本漂移**：以 `_upstream` 当前文件为准，逐文件 rebase，不直接复制覆盖。
- **异步请求测试不稳定**：使用仓库已有 happy-dom preload 和测试模式，优先用可控 Promise/真实状态流，避免只断言 mock 调用次数。
- **视觉验收能力不足**：诚实标注未进行像素级验收，不编造截图或人工结果。
