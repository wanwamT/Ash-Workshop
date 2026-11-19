from pathlib import Path
import re
import xml.etree.ElementTree as ET

root = Path('android/app/src/main')
xml = root / 'res/xml/ash_network_security_config.xml'
xml.parent.mkdir(parents=True, exist_ok=True)
xml.write_text('''<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <base-config cleartextTrafficPermitted="false" />
  <domain-config cleartextTrafficPermitted="true">
    <domain>localhost</domain>
    <domain>127.0.0.1</domain>
    <domain>10.0.2.2</domain>
  </domain-config>
</network-security-config>
''')
manifest = root / 'AndroidManifest.xml'
android = 'http://schemas.android.com/apk/res/android'
ET.register_namespace('android', android)
tree = ET.parse(manifest)
application = tree.getroot().find('application')
assert application is not None
application.set(f'{{{android}}}networkSecurityConfig', '@xml/ash_network_security_config')
activity = application.find('activity')
assert activity is not None
intent = ET.SubElement(activity, 'intent-filter')
ET.SubElement(intent, 'action', {f'{{{android}}}name': 'android.intent.action.VIEW'})
for category in ['android.intent.category.DEFAULT', 'android.intent.category.BROWSABLE']:
    ET.SubElement(intent, 'category', {f'{{{android}}}name': category})
ET.SubElement(intent, 'data', {f'{{{android}}}scheme': 'ashglass', f'{{{android}}}host': 'oauth', f'{{{android}}}path': '/complete'})
tree.write(manifest, encoding='utf-8', xml_declaration=True)
gradle = Path('android/app/build.gradle')
s = gradle.read_text()
s, count = re.subn(r'versionCode\s+\d+', 'versionCode 13', s, count=1)
assert count == 1
s, count = re.subn(r'versionName\s+"[^"]+"', 'versionName "1.4.5"', s, count=1)
assert count == 1
gradle.write_text(s)
print('Android 1.4.5 configured: HTTPS and local-only cleartext MCP')

# Native callback receiver is built into the APK, only listening during user-started OAuth.
import shutil
native = Path(__file__).resolve().parent / 'native'
java = root / 'java/xyz/chatboxapp/ashglass'
java.mkdir(parents=True, exist_ok=True)
for name in ['AshMcpOAuthPlugin.java', 'McpOAuthLoopback.java']:
    shutil.copyfile(native / name, java / name)
(java / 'MainActivity.java').write_text("""package xyz.chatboxapp.ashglass;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
public class MainActivity extends BridgeActivity {
  @Override public void onCreate(Bundle state) {
    registerPlugin(AshMcpOAuthPlugin.class);
    super.onCreate(state);
  }
}
""")


