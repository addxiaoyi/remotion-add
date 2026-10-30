# Studio 候选文件审查记录

日期：2026-10-30（首审）；2026-10-30 19:0x 复审
工作仓库：`D:/qwq/项目/remotion/_upstream`
候选文件位置：`D:/qwq/项目/remotion/`（仓库根，**不是** `_upstream`）

## 复审结论（现行有效）

首审结论「8 个候选文件与基线全部无差异」**已失效**，本次复审推翻它：3 个候选文件已落后于基线，5 个仍一致。

复审命令（逐文件取真实退出码，**不使用** `|| true`，因此 `rc` 是 `diff -q` 自己的退出码）：

```bash
cd "D:/qwq/项目/remotion"
for f in EffectPickerModal.tsx FixComputedValueModal.tsx PrecomposeRefactorModal.tsx \
         SkillsSettings.tsx StudioSettings.tsx UpdateStatusContext.tsx \
         WrapperRefactorModal.tsx use-download-project.tsx; do
  if [ -f "$f" ]; then
    n=$(diff -u "$f" "_upstream/packages/studio/src/components/$f" 2>/dev/null | grep -c '^[+-][^+-]')
    diff -q "$f" "_upstream/packages/studio/src/components/$f" >/dev/null 2>&1
    echo "$f rc=$? difflines=$n cand_lines=$(wc -l < "$f") base_lines=$(wc -l < "_upstream/packages/studio/src/components/$f")"
  else
    echo "$f MISSING_IN_ROOT"
  fi
done
```

真实输出（`rc=0` = 内容一致，`rc=1` = 有差异）：

```text
EffectPickerModal.tsx rc=0 difflines=0 cand_lines=384 base_lines=384
FixComputedValueModal.tsx rc=0 difflines=0 cand_lines=246 base_lines=246
PrecomposeRefactorModal.tsx rc=0 difflines=0 cand_lines=129 base_lines=129
SkillsSettings.tsx rc=1 difflines=4 cand_lines=414 base_lines=414
StudioSettings.tsx rc=1 difflines=42 cand_lines=807 base_lines=848
UpdateStatusContext.tsx rc=1 difflines=99 cand_lines=161 base_lines=235
WrapperRefactorModal.tsx rc=0 difflines=0 cand_lines=148 base_lines=148
use-download-project.tsx rc=0 difflines=0 cand_lines=83 base_lines=83
```

差异方向统计（`基线新增` = diff 中 `^+[^+]` 计数，`候选独有` = `^-[^-]` 计数）：

```text
SkillsSettings.tsx 基线新增=2 候选独有=2
StudioSettings.tsx 基线新增=41 候选独有=1
UpdateStatusContext.tsx 基线新增=86 候选独有=13
```

### 逐文件判定

| 候选文件 | 对应基线文件 | rc | difflines | 行数（候选/基线） | 结论 |
|---|---|---|---|---|---|
| `EffectPickerModal.tsx` | `packages/studio/src/components/EffectPickerModal.tsx` | 0 | 0 | 384 / 384 | 一致，不合并、不覆盖 |
| `FixComputedValueModal.tsx` | `packages/studio/src/components/FixComputedValueModal.tsx` | 0 | 0 | 246 / 246 | 一致，不合并、不覆盖 |
| `PrecomposeRefactorModal.tsx` | `packages/studio/src/components/PrecomposeRefactorModal.tsx` | 0 | 0 | 129 / 129 | 一致，不合并、不覆盖 |
| `SkillsSettings.tsx` | `packages/studio/src/components/SkillsSettings.tsx` | 1 | 4 | 414 / 414 | **基线更新**，候选过期 |
| `StudioSettings.tsx` | `packages/studio/src/components/StudioSettings.tsx` | 1 | 42 | 807 / 848 | **基线更新**，候选过期 |
| `UpdateStatusContext.tsx` | `packages/studio/src/components/UpdateStatusContext.tsx` | 1 | 99 | 161 / 235 | **基线更新**，候选过期 |
| `WrapperRefactorModal.tsx` | `packages/studio/src/components/WrapperRefactorModal.tsx` | 0 | 0 | 148 / 148 | 一致，不合并、不覆盖 |
| `use-download-project.tsx` | `packages/studio/src/components/use-download-project.tsx` | 0 | 0 | 83 / 83 | 一致，不合并、不覆盖 |

### 方向证据（差异里到底谁更新）

`SkillsSettings.tsx`（候选 → 基线）：

```diff
-		if (canManageSkills && installed && upgradeAvailable) {
+		if (canManageSkills && installed) {
-			disabled: false,
+			disabled: skillAction !== null,
```

基线把「更多操作」菜单从「仅在有升级时才出现」放宽为「安装了就能出现」，并用全局忙态 `skillAction` 禁用按钮。这属于能力增强，候选文件没有。

`StudioSettings.tsx`（候选 → 基线）：基线新增 `useRef` 引入、`import {shouldApplyExternalStudioSettings} from '../helpers/should-apply-external-studio-settings';`、`typedSequenceActivityLimit` 计算与 `hasLocalEditsRef` 守卫，即本轮第③项修复。文件时间戳：候选 `2026-10-29 18:25:28`，基线 `2026-10-30 18:54:17`。

`UpdateStatusContext.tsx`（候选 → 基线）：基线新增

```ts
export type UpdateCheckState = 'disabled' | 'loading' | 'error' | 'ready';
export const getUpdateCheckState = ({enabled, loading, error}: {...}): UpdateCheckState => {
	if (!enabled) return 'disabled';
	if (loading) return 'loading';
	if (error !== null) return 'error';
	return 'ready';
};
```

接口新增 `readonly checkState: UpdateCheckState;`、`readonly retry: () => void;`、`readonly enabled: boolean;`，Provider 签名改为 `({children, skillsRevision, enabled})`，并加入 `const mounted = useRef(true)` + 卸载置 false，把 `setUpgradeState('upgraded')` / `setUpgradeError(...)` / `setUpgradeState('idle')` 全部包进 `if (mounted.current) { ... }`。候选文件没有这些。

## 首审记录（已作废，保留以示演进）

首审方法与结论原文如下，其问题在于：循环体里用了 `|| true`，把 `diff` 的退出码吞掉，只以「无输出」作为一致证据；而 2026-10-29 之后基线又前进了，所以结论过期。

对根目录候选文件与 `_upstream/packages/studio/src/components/` 的同名文件执行 `diff -q`。命令对 8 个文件均未输出差异，退出码为 0（循环中使用 `|| true`，因此以无输出作为逐文件一致证据）。当时的表格把 8 个文件全部标为「无差异 / 不合并、不覆盖」。

## 处置（现行有效）

1. **不合并、不覆盖**：没有任何候选内容需要回灌基线；3 个有差异的文件里，基线是超集方向。
2. 根目录 8 个文件应视为 **2026-10-29 过期副本**，实际是仓库根的垃圾文件，应从仓库移除（本次环境无法删除文件，需人工清理或后续提交里带上删除）。
3. 复审证据本身可复现：上面命令与真实输出已原样记录，`rc`、`difflines`、行数三元组构成判定依据。

## 本轮修复的验证证据（2026-10-30 收尾，现行有效）

以下命令与输出均为真实执行结果，未做美化。

### 新增回归测试清单

| 测试文件 | 覆盖点 | 结果 |
| --- | --- | --- |
| `packages/studio/src/test/settings-tab-panels.test.ts` | 每个 `availableTabs` 中的 tab 都必须有对应的 `openedTabs` 面板分支 | 3 pass / 6 expect |
| `packages/studio/src/test/settings-modal-license-panel.test.tsx` | `initialTab='license'` 真渲染出 `LicenseSettings`（`role="radiogroup"` 名为 `License type`） | 2 pass / 4 expect |
| `packages/studio/src/test/studio-settings-effect-loop.test.tsx` | 外部 revision 镜像 effect 必须收敛，不允许无限重渲染 | 2 pass |
| `packages/studio/src/test/studio-settings-sync.test.ts` | `shouldApplyExternalStudioSettings` 的边界（含 `isSaving: null`） | 5 expect |
| `packages/studio/src/test/studio-settings-external-revision.test.tsx` | 脏编辑保留（`250`）、干净面板采纳外部 revision（`400`） | 2 pass |
| `packages/studio/src/test/skills-operation-race.test.tsx` | 重入丢弃、成功清忙态、失败重拉并写错误、卸载后不通知、锁释放后可再操作 | 5 pass / 28 expect |
| `packages/studio/src/test/updates-capability.test.tsx` | capability 关闭零请求、失败置 error 且 retry 可恢复、由关到开触发首次请求 | 3 pass / 22 expect |

### 定向测试与检查的真实输出

- 定向 5 文件（`settings-tab-panels` / `studio-settings-effect-loop` / `studio-settings-sync` / `studio-settings-external-revision` / `skills-operation-race`）
  → `13 pass / 0 fail / 46 expect() calls / Ran 13 tests across 5 files.`，退出码 `0`
- `settings-tab-availability.test.ts` + `can-show-updates.test.ts` → `6 pass / 0 fail / 22 expect() calls`，退出码 `0`
- 菜单 8 个测试文件 → `46 pass / 0 fail / 159 expect() calls`，退出码 `0`
- `bunx tsc -p packages/studio/tsconfig.json --noEmit` → 无输出，退出码 `0`（`packages/studio/tsconfig.json:10` 的 `"include": ["src"]` 覆盖全部新测试）
- `bunx oxfmt --check <10 个改动文件>` → `All matched files use the correct format.`，退出码 `0`

### 两个必须一并记录的限制

1. **不能用一条命令合并跑全部新测试**：bun 的 `mock.module` 是进程级、跨测试文件共享的。`settings-modal-license-panel.test.tsx` 把 `../components/SettingsContext` 替换为只含 `useSettings` 的模块，会覆盖 `skills-operation-race.test.tsx` 所需的真实 `SettingsProvider`，导致后者报 `error: Element type is invalid ... got: undefined`（合并跑 `10 pass / 5 fail`，单跑 `5 pass / 0 fail`）。这是测试隔离问题，不是实现缺陷。
2. **全量 Studio 套件的 39 个失败与本轮修复无关**：`1541 pass / 39 fail / 2 errors / Ran 1580 tests`。根因是 `packages/studio/dist/` 陈旧产物未随 `src` 重建 —— `dist/helpers/settings-tab-availability.js` 与 `dist/test/settings-tab-availability.test.js` 时间戳均为 `2026-10-28T23:34:53`（`src` 侧为 `2026-10-30T14:25:53`），且 `dist` 实现里 `license`/`updates` 零命中；另有 `Cannot find module '@remotion/whisper-webgpu'`、`Cannot find module '@remotion/media'` 等未构建 workspace 包导致的 error。因此全量结果不能作为本轮回归证据。

### 反证（证明测试真的守着目标行为）

- License 面板：把 `SettingsModal.tsx` 的 license 分支条件临时改为永假 → `1 pass / 1 fail`，`expect(received).not.toBeNull()` / `Received: null`；复原后 `2 pass`，`git diff --numstat` 仍为 `10 0`。
- Skills 重入锁：把 `SettingsContext.tsx:236` 的 `skillActionBusy.current` 判断改为永假 → `Expected: 1 / Received: 2`；把 `:264` 成功分支的 `!mounted.current ||` 去掉 → 卸载后仍收到通知。复原后 diff 仍为 `36 1`。
- Updates capability：把 `UpdateStatusContext.tsx` 的 `if (!enabled)` 守卫改为 `if (false)` → `1 pass / 2 fail`，`Expected: 0 / Received: 1`；复原后 `3 pass`，diff 仍为 `88 14`。
- Settings 外部 revision：把 `StudioSettings.tsx` 依赖数组改回 `[editedSetters, revision, studioRuntimeConfig]` → 报 `rendered more than 50 times without settling`；复原后 2 pass。

## 范围判断

后续生产修改只发生在 `_upstream` 内，并以测试、类型检查和格式检查为依据。
