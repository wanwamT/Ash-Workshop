# 星语 · 任务群聊版 · 非官方修改版

源码归档；旧 Actions APK 附件下载被拒绝，暂不附 APK。

源码固定提交：`ab930c6a9eab378b038e9a837c5701e02e8d6cd7`。原作者及贡献者版权、许可证和第三方声明保留；本归档不代表上游发布或背书。

许可：原版分段双重许可，见 source/LICENSE。橘瓣/星语的旧版许可含非商业、人数与商业授权条件；请先阅读原文，不能视为无限制商用许可。各工程许可证分别适用，Ash-Workshop 根目录 LICENSE 不替换这些工程的许可。

## 构建

进入 source/，使用 Android Studio/JDK 17 与 Gradle wrapper；按 source/.github/workflows/build-debug.yml 准备构建配置，再执行 ./gradlew assembleDebug。星语品牌位于 debug 资源，需构建 debug 变体。子模块已展开。

未包含聊天记录、账号/API 密钥、个人配置或私人签名证书。原工程中公开的 Android debug 测试签名仅用于测试，不应作为正式发布签名。自行签名的安装包可能无法覆盖既有安装，请先备份。

## 验证范围

本次为源码/已有产物归档，检查源码 ZIP 完整性、文件校验与明显凭据文件；未重新构建或在设备上重新做功能测试。完整源码已直接提交在本仓库 projects/xingyu-task-group/，可在线查看或下载仓库 Source code 压缩包；无需访问私人仓库。

[查看完整源码](../../projects/xingyu-task-group/)
