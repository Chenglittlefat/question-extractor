# 离线抽题工作台

基于 Electron + Vue 3 + TypeScript + Vite 的离线桌面抽题应用。

## 功能

- 项目创建、保存、删除和 JSON 备份恢复
- 自定义题型、基础题型绑定、题型独立倒计时
- 自定义难度、排序、启用和禁用
- `.xlsx/.xls/.csv/.tsv` 题目导入，导入前预览校验
- Excel `.xlsx` 导入模板生成
- 题目筛选、批量选择、批量启用禁用和批量删除
- 随机不重复抽题、倒计时、提示音、显示答案、下一题和结束页
- 黑白简约和彩色主题切换
- 本地 SQLite 持久化，数据文件位于 Electron `userData` 目录

## 开发

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
npm run make
```

如果 Electron 二进制下载失败，可重试：

```bash
ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ npx install-electron --no
```

## 第三方字体

- Source Han Sans SC 字体随 SIL Open Font License 1.1 分发，许可证见 `src/assets/fonts/LICENSE-SourceHanSansSC.txt`。
- JetBrains Mono 字体随 SIL Open Font License 1.1 分发，许可证见 `src/assets/fonts/LICENSE-JetBrainsMono.txt`。

## 许可证

本项目代码基于 MIT License 开源，详见 `LICENSE`。第三方字体按各自许可证分发。
