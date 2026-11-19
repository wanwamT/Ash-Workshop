# 橘瓣 Liquid Glass 2.2.3 · 非官方修改版

附原 CI 发布的 ARM64 debug APK，未重新编译。

源码固定提交：`cfb65d555c1137c85483a0e893d91e5f4d04f180`。原作者及贡献者版权、许可证和第三方声明保留；本归档不代表上游发布或背书。

许可：原版分段双重许可，见工程 LICENSE。橘瓣/星语的旧版许可含非商业、人数与商业授权条件；请先阅读原文，不能视为无限制商用许可。各工程许可证分别适用，Ash-Workshop 根目录 LICENSE 不替换这些工程的许可。

## 构建

使用 JDK 17、Android SDK 及 Gradle wrapper。先按 .github/workflows/build-debug.yml 准备 SDK 和 Firebase 构建配置，再运行 ./gradlew assembleDebug。material-color-utilities 已按 6fd88eb3e95ba1d457842e2a2bf847d06b3a018a 展开，无需访问私人仓库。原发布标签错误指向 master，本归档按成功构建 run 38586145351 的实际 head SHA 配源码。

未包含聊天记录、账号/API 密钥、个人配置或私人签名证书。原工程中公开的 Android debug 测试签名仅用于测试，不应作为正式发布签名。自行签名的安装包可能无法覆盖既有安装，请先备份。

## 验证范围

本次为源码/已有产物归档，检查源码 ZIP 完整性、文件校验与明显凭据文件；未重新构建或在设备上重新做功能测试。完整源码已直接提交在本仓库 projects/orangechat-glass-2.2.3/，可在线查看或下载仓库 Source code 压缩包；无需访问私人仓库。

[查看完整源码](../../projects/orangechat-glass-2.2.3/)

[下载原发布 ARM64 debug APK](https://github.com/wanwamT/orangechat/releases/download/liquidglass-build-20261014-150947/app-arm64-v8a-debug.apk)
