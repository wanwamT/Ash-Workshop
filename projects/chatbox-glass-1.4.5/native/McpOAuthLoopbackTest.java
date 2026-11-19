package xyz.chatboxapp.ashglass;
import java.net.*;
import java.io.*;
import java.util.concurrent.*;

public final class McpOAuthLoopbackTest {
  static final String STATE = "test-only-random-state-123456789";
  static int checks;
  static void check(boolean ok) { if (!ok) throw new AssertionError(); checks++; }
  static String line(String query) { return "GET /callback?" + query + " HTTP/1.1"; }
  static void invalid(String request) throws Exception {
    try { McpOAuthLoopback.parse(request, STATE); throw new AssertionError("Accepted invalid callback"); }
    catch (IllegalArgumentException expected) { checks++; }
  }
  static int get(int port, String path) throws Exception {
    HttpURLConnection c = (HttpURLConnection)new URL("http://127.0.0.1:" + port + path).openConnection();
    c.setConnectTimeout(2000); c.setReadTimeout(2000);
    try { return c.getResponseCode(); } finally { c.disconnect(); }
  }
  static FutureTask<McpOAuthLoopback.Callback> waitFor(McpOAuthLoopback l) {
    FutureTask<McpOAuthLoopback.Callback> task = new FutureTask<>(l::awaitCallback);
    Thread t = new Thread(task); t.setDaemon(true); t.start(); return task;
  }
  public static void main(String[] args) throws Exception {
    McpOAuthLoopback.Callback callback = McpOAuthLoopback.parse(line("state="+STATE+"&code=a%2Bb&iss=https%3A%2F%2Fissuer.example"), STATE);
    check(callback.code.equals("a+b") && callback.issuer.equals("https://issuer.example"));
    invalid(line("state=wrong&code=x"));
    invalid(line("code=x"));
    invalid(line("state="+STATE));
    invalid(line("state="+STATE+"&code=a&code=b"));
    invalid("GET /other?state="+STATE+"&code=x HTTP/1.1");
    invalid("GET https://example.com/callback?state="+STATE+"&code=x HTTP/1.1");
    invalid("POST /callback?state="+STATE+"&code=x HTTP/1.1");
    try { McpOAuthLoopback.parse(line("state="+STATE+"&error=access_denied"),STATE); throw new AssertionError(); }
    catch (McpOAuthLoopback.AuthorizationDenied expected) { checks++; }
    McpOAuthLoopback listener = new McpOAuthLoopback(0,STATE,5000);
    check(listener.address().getHostAddress().equals("127.0.0.1"));
    int port=listener.port(); FutureTask<McpOAuthLoopback.Callback> pending=waitFor(listener);
    check(get(port,"/favicon.ico")==400);
    check(get(port,"/callback?state=wrong&code=x")==400);
    check(get(port,"/callback?state="+STATE+"&code=verified")==200);
    check(pending.get(2,TimeUnit.SECONDS).code.equals("verified"));
    check(listener.isClosed());
    listener = new McpOAuthLoopback(0,STATE,5000); pending=waitFor(listener);
    check(get(listener.port(),"/callback?state="+STATE+"&error=access_denied")==200);
    try { pending.get(2,TimeUnit.SECONDS); throw new AssertionError(); }
    catch (ExecutionException e) { check(e.getCause() instanceof McpOAuthLoopback.AuthorizationDenied); }
    check(listener.isClosed());
    listener = new McpOAuthLoopback(0,STATE,100); pending=waitFor(listener);
    try { pending.get(2,TimeUnit.SECONDS); throw new AssertionError(); }
    catch (ExecutionException e) { check(e.getCause() instanceof SocketTimeoutException); }
    check(listener.isClosed());
    listener = new McpOAuthLoopback(0,STATE,5000); pending=waitFor(listener); listener.close();
    try { pending.get(2,TimeUnit.SECONDS); throw new AssertionError(); }
    catch (ExecutionException e) { check(e.getCause() instanceof IOException); }
    check(listener.isClosed());
    System.out.println("Native OAuth loopback checks passed: " + checks);
  }
}
