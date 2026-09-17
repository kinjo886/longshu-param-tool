# 数据治理平台作业入参处理工具（longshu-param-tool）

[![Chrome Extension](https://img.shields.io/badge/Chrome-MV3-blue)](https://developer.chrome.com/docs/extensions/mv3/)
[![License](https://img.shields.io/badge/license-MIT-blue)](#license)

> **开源脱敏版。** 原项目为某政务数据治理平台的「作业入参处理浏览器扩展」。本仓库仅保留通用功能代码，已移除所有内部域名与平台专有字段，可独立安装使用。

一个 Chrome / Edge 浏览器扩展（Manifest V3），**批量解析云表格中逗号分隔的参数，生成标准二维数组 JSON**，方便直接粘贴进数据开发平台的作业入参框。

---

## 功能特性

- **侧边栏面板**：通过 `sidePanel` 常驻侧边栏，不占用页面空间
- **批量分片**：按 `batchSize` 将长参数自动切分为多组（与 Python `chunk_rows` 逻辑一致），便于分批提交
- **二维数组生成**：将多行逗号分隔文本转换为标准二维数组 JSON
- **批量下载**：每组结果可单独或批量导出为 JSON 文件
- **本地持久化**：通过 `chrome.storage.local` 保存输入、分组、预览与日志，侧边栏销毁也不丢失
- **一键复制**：生成结果直接写入剪贴板（`clipboardWrite` 权限）

## 技术栈

- Manifest V3（`background.service_worker` + `side_panel`）
- 纯原生 HTML / CSS / JS，无构建步骤、无第三方依赖
- 权限：`clipboardWrite`、`downloads`、`sidePanel`、`tabs`、`storage`

## 目录结构

```
longshu-param-tool/
├── longshu_param_tool/
│   ├── manifest.json      # 扩展清单（MV3）
│   ├── background.js       # 后台 Service Worker
│   ├── panel.html          # 侧边栏页面
│   ├── logic.js            # 核心逻辑：分片 / 二维数组生成 / 持久化
│   ├── tool.css            # 面板样式
│   └── icon.png            # 扩展图标
└── 龙数作业入参处理工具 安装使用说明.docx   # 图文安装说明
```

## 本地安装（开发者模式）

1. 打开浏览器扩展管理页：
   - Chrome：`chrome://extensions`
   - Edge：`edge://extensions`
2. 右上角打开 **「开发者模式」**（Developer mode）
3. 点击 **「加载已解压的扩展程序」**（Load unpacked）
4. 选择本仓库的 `longshu_param_tool/` 文件夹
5. 安装后点击工具栏拼图图标 → 固定扩展；在任意页面点击扩展图标即可打开侧边栏面板

> 如需更详细的图文步骤，参阅仓库内的 `龙数作业入参处理工具 安装使用说明.docx`。

## 使用流程

1. 在云表格中选中参数列，复制为「每行一条、逗号分隔」的文本
2. 粘贴进侧边栏输入框，设置 `batchSize`（默认 10）
3. 点击「生成」→ 得到多组分片二维数组
4. 逐组「复制」或「批量下载」JSON，粘贴进作业入参框

## 说明

- 本扩展只做**本地文本 → 二维数组 JSON** 的转换与导出，不发起任何外部网络请求。
- 仓库内已不含任何平台专有配置；如对接具体数据开发平台，请在你自己的环境中按需扩展。

## License



本项目基于 [MIT License](./LICENSE) 开源，可自由使用、修改和分发。欢迎按需二次开发。
