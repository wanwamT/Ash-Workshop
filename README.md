# Ash Workshop

个人作品与前端修改归档，保存安装包、对应源码及使用/恢复说明。后续项目按各自许可单独说明。

## Chatbox、橘瓣与星语

均为非官方修改版，按各自工程原有许可提供；各工程许可证不由本仓库根目录 LICENSE 替代。

| 项目 | 内容 | 下载与说明 |
| --- | --- | --- |
| Chatbox Glass 1.4.5 | 完整源码、移动端构建流程；暂未附 APK | [说明](archive/chatbox-glass-1.4.5/) · [附件](https://github.com/wanwamT/Ash-Workshop/releases/tag/chatbox-glass-1.4.5) |
| 橘瓣 Liquid Glass 2.2.3 | ARM64 debug APK、对应完整源码 | [说明](archive/orangechat-glass-2.2.3/) · [附件](https://github.com/wanwamT/Ash-Workshop/releases/tag/orangechat-glass-2.2.3) |
| 星语 · 任务群聊版 | 完整源码；暂未附 APK | [说明](archive/xingyu-task-group/) · [附件](https://github.com/wanwamT/Ash-Workshop/releases/tag/xingyu-task-group) |

这三个项目的完整工程与原许可证已直接保存在 **projects/** 目录，可以在线查看或下载整个仓库。橘瓣 APK 链接见项目说明。橘瓣、星语旧版采用分段双重许可，含使用人数及商业授权等条件，转发与使用前请阅读原文。

## Kelivo Glass · 非官方玻璃改版

基于 [Chevey339/Kelivo](https://github.com/Chevey339/kelivo) 的个人修改版。原项目版权归原作者及贡献者；不代表原作者发布、维护或背书。此仓库用于独立保存已签名 APK 和完整对应源码，不包含原私人仓库历史或其他项目。

当前版本：**1.3.2-glass.13.3 / code97**，Android ARM64，包名 `com.psyche.kelivo.ashglass`。

- [下载 APK](https://github.com/wan148700/Ash-Workshop/releases/download/glass13.3/Kelivo-Glass-1.3.2-glass13.3-arm64.apk)
- [下载完整对应源码 ZIP](https://github.com/wan148700/Ash-Workshop/releases/download/glass13.3/Kelivo-Glass-1.3.2-glass13.3-source.zip)
- [全部发布附件与校验信息](https://github.com/wan148700/Ash-Workshop/releases/tag/glass13.3)

**源码请下载上面专门命名的 source.zip 附件。GitHub 自动生成的 Source code (zip/tar.gz) 只包含归档说明和构建用文件，不是完整 Flutter 工程。** 完整附件含 Flutter 源码、锁文件、vendored 依赖、生成本地化、许可证与构建配置脚本；不需要访问其他私人仓库。

## 修改与使用

修改整理日期：2026-11-03。上游稳定版 1.3.2，commit `b1702b3a9ff35656c682a0818a9b44d8a8b72454`。本版包含可调玻璃界面、渠道/模型两行显示、工作流/QQ组件和可选自动云归档。自动云归档默认关闭，默认 500MB 或30天任一达到、可调整，使用现有 WebDAV 配置；真实云盘与设备效果仍需配置验证。首次测试 WebDAV 时需确认备份文件夹存在。

这是已验证版本的归档，没有重编译或混入尚未完成的新修复。295项相关测试、ARM64构建、Pigeon/Kotlin检查、维护证书v2/v3签名及原发布回下载验证通过；具体范围见 [VALIDATION_GLASS.md](VALIDATION_GLASS.md)。构建见 [BUILDING_GLASS.md](BUILDING_GLASS.md)。不同签名的自行构建包不能直接覆盖维护者签名包。

## 许可

继续采用 **[GNU AGPL-3.0](LICENSE)**。保留原有版权和第三方声明，分发修改版时提供对应源码并注明修改。各第三方组件的许可证和 NOTICE 保存在完整源码 ZIP 内。源码和APK不含用户聊天、API密钥、云盘密码或维护者私有签名密钥。安装包不提供额外担保。

自动 Actions 已关闭，此仓库不自动跟随上游更新。
