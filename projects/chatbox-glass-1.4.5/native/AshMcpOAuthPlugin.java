package xyz.chatboxapp.ashglass;

import android.content.Intent;
import android.net.Uri;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.net.BindException;
import java.net.SocketTimeoutException;

@CapacitorPlugin(name = "AshMcpOAuth")
public class AshMcpOAuthPlugin extends Plugin {
  private volatile McpOAuthLoopback active;
  private volatile boolean destroyed;
  private boolean busy;
  @PluginMethod
  public synchronized void authorize(PluginCall call) {
    if (destroyed) { call.reject("应用已关闭，请重新打开后连接"); return; }
    if (busy) { call.reject("已有登录授权正在进行，请先完成或稍后重试"); return; }
    String url = call.getString("authorizationUrl");
    String state = call.getString("state");
    Uri uri = url == null ? null : Uri.parse(url);
    if (uri == null || !"https".equals(uri.getScheme()) || uri.getHost() == null ||
        state == null || state.length() < 16 || !state.equals(uri.getQueryParameter("state")) ||
        !"http://127.0.0.1:1456/callback".equals(uri.getQueryParameter("redirect_uri"))) {
      call.reject("无效的 OAuth 登录请求，请重新连接"); return;
    }
    busy = true;
    new Thread(() -> {
      try (McpOAuthLoopback listener = new McpOAuthLoopback(1456, state, 180000)) {
        active = listener;
        if (destroyed) throw new java.io.IOException("Activity closed");
        // Bind first; only then open the browser. No listener exists outside a user-started sign-in.
        getActivity().runOnUiThread(() -> {
          if (destroyed) { try { listener.close(); } catch (Exception ignored) {} return; }
          try { getActivity().startActivity(new Intent(Intent.ACTION_VIEW, uri)); }
          catch (Exception e) { try { listener.close(); } catch (Exception ignored) {} }
        });
        McpOAuthLoopback.Callback callback = listener.awaitCallback();
        JSObject result = new JSObject();
        result.put("code", callback.code);
        if (callback.issuer != null) result.put("iss", callback.issuer);
        call.resolve(result);
        getActivity().runOnUiThread(() -> {
          try {
            Intent back = getContext().getPackageManager().getLaunchIntentForPackage(getContext().getPackageName());
            if (back != null) getActivity().startActivity(back.addFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT | Intent.FLAG_ACTIVITY_SINGLE_TOP));
          } catch (Exception ignored) { /* Browser page also has a return link. */ }
        });
      } catch (BindException e) { call.reject("本机 1456 端口被占用，请结束其他登录流程后重试"); }
      catch (SocketTimeoutException e) { call.reject("登录等待超时，请返回 Chatbox 重新连接"); }
      catch (McpOAuthLoopback.AuthorizationDenied e) { call.reject(e.getMessage()); }
      catch (Exception e) { call.reject("浏览器授权未完成，请返回 Chatbox 重新连接"); }
      finally { active = null; synchronized (this) { busy = false; } }
    }, "ash-mcp-oauth").start();
  }
  @Override protected void handleOnDestroy() {
    destroyed = true;
    McpOAuthLoopback listener = active;
    if (listener != null) try { listener.close(); } catch (Exception ignored) {}
    super.handleOnDestroy();
  }
}
