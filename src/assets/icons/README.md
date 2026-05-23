# SVG 资产需求清单

> SVG 建议统一放在本目录：`src/assets/icons/`
>
> 建议使用 `24x24` viewBox，图标优先使用 `stroke="currentColor"` 或 `fill="currentColor"`，方便跟随按钮和主题颜色。

| 序号 | 建议文件名 | 界面位置 | 用途说明 | 优先级 |
|---:|---|---|---|---|
| 1 | `app-logo.svg` | 首页顶部、应用品牌区 | 抽题助手品牌标识，替换当前方块 Q 标识 | P0 |
| 2 | `settings.svg` | 首页右上角、设置页入口 | 设置按钮图标 | P0 |
| 3 | `plus.svg` | 新建项目按钮、新建弹窗确认按钮 | 新增/创建操作 | P0 |
| 4 | `project-folder.svg` | 首页空状态 | 无项目时的空状态视觉 | P1 |
| 5 | `trash.svg` | 首页项目卡片删除按钮 | 删除项目 | P0 |
| 6 | `chevron-right.svg` | 首页项目卡片悬浮状态 | 表示进入项目详情 | P2 |
| 7 | `book-open.svg` | 首页项目卡片统计 | 题目数量 | P1 |
| 8 | `check-square.svg` | 首页项目卡片统计 | 已选择题目数量 | P1 |
| 9 | `layers.svg` | 首页项目卡片统计、品牌辅助 | 题型数量/层级 | P1 |
| 10 | `arrow-left.svg` | 项目工作区顶部、活动页顶部、设置页顶部 | 返回上一层 | P0 |
| 11 | `save-file.svg` | 项目工作区顶部保存按钮 | 保存当前项目 | P0 |
| 12 | `shuffle.svg` | 项目工作区顶部开始抽题按钮 | 随机抽题入口 | P0 |
| 13 | `config.svg` | 项目工作区侧边导航：项目信息 | 配置页导航 | P1 |
| 14 | `question-type.svg` | 项目工作区侧边导航：题型设置 | 题型页导航 | P1 |
| 15 | `difficulty.svg` | 项目工作区侧边导航：难度设置 | 难度页导航 | P1 |
| 16 | `countdown.svg` | 项目工作区侧边导航：倒计时 | 倒计时页导航 | P0 |
| 17 | `upload.svg` | 题目导入、设置页上传音效 | 导入文件、上传音效 | P0 |
| 18 | `check-list.svg` | 项目工作区侧边导航：题目管理 | 题目管理页导航 | P1 |
| 19 | `play.svg` | 活动页继续按钮、音效试听 | 播放/继续 | P0 |
| 20 | `pause.svg` | 活动页暂停按钮 | 暂停倒计时 | P0 |
| 21 | `rotate-ccw.svg` | 活动页重置按钮、完成页再来一次 | 重置倒计时/重新开始 | P0 |
| 22 | `eye.svg` | 活动页显示答案按钮 | 显示正确答案 | P0 |
| 23 | `eye-off.svg` | 活动页隐藏答案按钮 | 隐藏正确答案 | P1 |
| 24 | `skip-forward.svg` | 活动页下一题按钮 | 进入下一题 | P0 |
| 25 | `bell.svg` | 活动页时间到提示、音效设置 | 倒计时结束提示音 | P0 |
| 26 | `check.svg` | 答案正确标记、保存成功状态、完成页 | 成功/正确 | P0 |
| 27 | `award.svg` | 活动完成页顶部 | 活动完成视觉强调 | P1 |
| 28 | `home.svg` | 完成页返回首页按钮 | 回到项目首页 | P1 |
| 29 | `download.svg` | 设置页数据备份、导出备份 | 导出文件 | P0 |
| 30 | `volume.svg` | 设置页音效区 | 音效/音量 | P0 |
| 31 | `x.svg` | 弹窗关闭、删除确认取消入口 | 关闭弹窗 | P0 |
| 32 | `alert-circle.svg` | 导入错误、校验失败提示 | 异常/警告 | P1 |
| 33 | `search.svg` | 题目管理筛选区 | 搜索题目 | P2 |
| 34 | `edit.svg` | 后续题目编辑、题型编辑入口 | 编辑 | P2 |

## 后续替换位置

| 组件 | 替换说明 |
|---|---|
| `src/components/ProjectHome.vue` | 首页品牌、设置、新建、删除、项目统计、空状态图标 |
| `src/components/AppSidebar.vue` | 项目工作区侧边导航图标 |
| `src/components/AppTopbar.vue` | 返回、保存、开始抽题图标 |
| `src/components/ActivityPanel.vue` | 暂停、继续、重置、显示答案、下一题、时间到图标 |
| `src/components/FinishView.vue` | 完成奖章、返回首页、再来一次图标 |
| `src/components/SettingsPanel.vue` | 主题、音效、上传、下载、试听图标 |
| `src/components/NewProjectModal.vue` | 关闭、新建项目图标 |
