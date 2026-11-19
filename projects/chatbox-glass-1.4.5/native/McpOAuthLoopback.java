package xyz.chatboxapp.ashglass;

import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;

/** A single, short-lived OAuth callback receiver. Never accepts remote connections. */
public final class McpOAuthLoopback implements AutoCloseable {
  private final ServerSocket server;
  private final String expectedState;
  private final long deadline;
  public static final class Callback {
    public final String code, issuer;
    Callback(String code, String issuer) { this.code = code; this.issuer = issuer; }
  }
  public static final class AuthorizationDenied extends IOException {
    AuthorizationDenied() { super("登录授权被取消或拒绝，请重新连接"); }
  }
  public McpOAuthLoopback(int port, String state, int timeoutMillis) throws IOException {
    if (state == null || state.length() < 16) throw new IllegalArgumentException("Invalid OAuth state");
    expectedState = state;
    deadline = System.currentTimeMillis() + timeoutMillis;
    server = new ServerSocket();
    try { server.bind(new InetSocketAddress(InetAddress.getByName("127.0.0.1"), port), 4); }
    catch (IOException e) { server.close(); throw e; }
  }
  public int port() { return server.getLocalPort(); }
  public InetAddress address() { return server.getInetAddress(); }
  public boolean isClosed() { return server.isClosed(); }
  @Override public void close() throws IOException { server.close(); }

  public Callback awaitCallback() throws IOException {
    try {
      while (true) {
        long remaining = deadline - System.currentTimeMillis();
        if (remaining <= 0) throw new SocketTimeoutException("登录等待超时，请返回 Chatbox 重新连接");
        server.setSoTimeout((int)Math.min(remaining, Integer.MAX_VALUE));
        try (Socket socket = server.accept()) {
          socket.setSoTimeout((int)Math.min(remaining, 3000));
          String requestLine = readLine(socket.getInputStream(), 8192);
          int headerBytes = 0;
          String header;
          while (!(header = readLine(socket.getInputStream(), 8192)).isEmpty()) {
            headerBytes += header.length();
            if (headerBytes > 16384) throw new IOException("Oversized callback headers");
          }
          try {
            Callback callback = parse(requestLine, expectedState);
            respond(socket, 200, "授权已接收，请返回 Chatbox。", true);
            return callback;
          } catch (AuthorizationDenied e) {
            respond(socket, 200, "授权已取消，可以返回 Chatbox。", true);
            throw e;
          } catch (IllegalArgumentException e) {
            // An invalid state/path must not consume the real authorization flow.
            respond(socket, 400, "无效的登录回调，请回到原登录页面继续。", false);
          }
        } catch (SocketTimeoutException e) {
          if (System.currentTimeMillis() >= deadline) throw e;
        }
      }
    } finally { close(); }
  }
  static Callback parse(String line, String state) throws AuthorizationDenied {
    try {
      String[] request = line.split(" ", 3);
      if (request.length != 3 || !request[0].equals("GET")) throw new IllegalArgumentException();
      URI uri = new URI(request[1]);
      if (uri.isAbsolute() || uri.getRawAuthority() != null || !"/callback".equals(uri.getPath()) || uri.getRawQuery() == null) throw new IllegalArgumentException();
      Map<String,String> parameters = new HashMap<>();
      for (String part : uri.getRawQuery().split("&")) {
        String[] pair = part.split("=", 2);
        String key = URLDecoder.decode(pair[0], "UTF-8");
        String value = URLDecoder.decode(pair.length == 2 ? pair[1] : "", "UTF-8");
        if (parameters.put(key, value) != null) throw new IllegalArgumentException();
      }
      String receivedState = parameters.get("state");
      if (receivedState == null || !MessageDigest.isEqual(state.getBytes(StandardCharsets.UTF_8), receivedState.getBytes(StandardCharsets.UTF_8))) throw new IllegalArgumentException();
      if (parameters.containsKey("error")) throw new AuthorizationDenied();
      String code = parameters.get("code");
      if (code == null || code.isEmpty()) throw new IllegalArgumentException();
      return new Callback(code, parameters.get("iss"));
    } catch (URISyntaxException | UnsupportedEncodingException e) { throw new IllegalArgumentException("Invalid callback"); }
  }
  private static String readLine(InputStream in, int max) throws IOException {
    ByteArrayOutputStream out = new ByteArrayOutputStream();
    int b;
    while ((b = in.read()) != -1 && b != '\n') {
      if (out.size() >= max) throw new IOException("Oversized callback line");
      if (b != '\r') out.write(b);
    }
    if (b == -1 && out.size() == 0) throw new EOFException();
    return out.toString("UTF-8");
  }
  private static void respond(Socket socket, int status, String message, boolean returnLink) throws IOException {
    String html = "<!doctype html><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width\"><title>Chatbox 授权</title><p>" + message + "</p>" +
      (returnLink ? "<p><a href=\"ashglass://oauth/complete\">返回 Chatbox</a></p>" : "");
    byte[] body = html.getBytes(StandardCharsets.UTF_8);
    String headers = "HTTP/1.1 " + status + (status == 200 ? " OK" : " Bad Request") + "\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: " + body.length + "\r\nCache-Control: no-store\r\nReferrer-Policy: no-referrer\r\nContent-Security-Policy: default-src 'none'; base-uri 'none'\r\nConnection: close\r\n\r\n";
    socket.getOutputStream().write(headers.getBytes(StandardCharsets.US_ASCII));
    socket.getOutputStream().write(body);
    socket.getOutputStream().flush();
  }
}
