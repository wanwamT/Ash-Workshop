# Chatbox Glass 1.4.5 · 非官方修改版

源码归档；暂不附未经核实的 APK。

源码固定提交：`aac4c65be17444bd6fd5ce37963f430bcf5406ad`。原作者及贡献者版权、许可证和第三方声明保留；本归档不代表上游发布或背书。

许可：GPL-3.0。橘瓣/星语的旧版许可含非商业、人数与商业授权条件；请先阅读原文，不能视为无限制商用许可。各工程许可证分别适用，Ash-Workshop 根目录 LICENSE 不替换这些工程的许可。

## 构建

完整修改源码在 source/；overlay/ 与 native/ 保留。按 BUILD_WORKFLOW.yml 执行（将原工作流 chatbox/ 路径替换为本目录），Node 22.14、pnpm、JDK 21、Android SDK 35。configure_android.py 实际设置 1.4.5/code13；旧 README 的 1.2/code3 为历史说明。自行构建需自行签名；未附维护者私有签名密钥。

未包含聊天记录、账号/API 密钥、个人配置或私人签名证书。原工程中公开的 Android debug 测试签名仅用于测试，不应作为正式发布签名。自行签名的安装包可能无法覆盖既有安装，请先备份。

## 验证范围

本次为源码/已有产物归档，检查源码 ZIP 完整性、文件校验与明显凭据文件；未重新构建或在设备上重新做功能测试。GitHub 自动生成的 Source code 压缩包仅含分享仓库说明，请下载附件中专门命名的 source.zip 完整工程。

[下载归档附件](https://github.com/wanwamT/Ash-Workshop/releases/tag/chatbox-glass-1.4.5)
