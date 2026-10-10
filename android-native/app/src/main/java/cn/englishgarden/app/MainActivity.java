package cn.englishgarden.app;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.*;
import android.widget.*;
import androidx.webkit.WebViewAssetLoader;
import java.io.ByteArrayInputStream;
import java.util.Collections;

/** Isolated HTTPS app assets; no JavaScript-to-native bridge or arbitrary local files. */
public final class MainActivity extends Activity {
    private static final String HOST = "ljy2452545431.github.io";
    private static final String START = "https://" + HOST + "/english-garden/index.html";
    private static final int FILE_REQUEST = 10, MIC_REQUEST = 11;
    private WebView web;
    private ValueCallback<Uri[]> fileCallback;
    private PermissionRequest microphoneRequest;
    private FrameLayout frame;
    private LinearLayout errorPanel;
    private BlobDownload downloads;

    private boolean trusted(Uri uri) {
        return "https".equals(uri.getScheme()) && HOST.equals(uri.getHost())
                && uri.getPort() == -1 && uri.getUserInfo() == null
                && uri.getPath() != null && uri.getPath().startsWith("/english-garden/");
    }
    private boolean trustedOrigin(Uri uri) {
        return "https".equals(uri.getScheme()) && HOST.equals(uri.getHost())
                && uri.getPort() == -1 && uri.getUserInfo() == null;
    }
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        frame = new FrameLayout(this);
        frame.setBackgroundColor(Color.rgb(244,247,244));
        frame.setOnApplyWindowInsetsListener((v, insets) -> {
            if (android.os.Build.VERSION.SDK_INT >= 30) {
                android.graphics.Insets area = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.ime());
                v.setPadding(area.left, area.top, area.right, area.bottom);
            } else v.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(), insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
            return insets;
        });
        web = new WebView(this);
        frame.addView(web, new FrameLayout.LayoutParams(-1,-1));
        setContentView(frame);
        configureWebView();
        downloads = new BlobDownload(this, web);
        web.loadUrl(START);
    }
    private void configureWebView() {
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setSupportMultipleWindows(false);
        settings.setSafeBrowsingEnabled(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, false);
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);
        WebViewAssetLoader.AssetsPathHandler assets = new WebViewAssetLoader.AssetsPathHandler(this);
        WebViewAssetLoader loader = new WebViewAssetLoader.Builder().setDomain(HOST)
                .addPathHandler("/english-garden/", path -> {
                    WebResourceResponse response = assets.handle(path.isEmpty() ? "index.html" : path);
                    if (response == null || response.getData() == null) return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found", Collections.emptyMap(), new ByteArrayInputStream(new byte[0]));
                    return response;
                }).build();
        web.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return loader.shouldInterceptRequest(request.getUrl());
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (trusted(request.getUrl())) return false;
                if (request.isForMainFrame()) external(request.getUrl());
                return true;
            }
            @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) showError();
            }
            @Override public void onReceivedSslError(WebView view, SslErrorHandler handler, android.net.http.SslError error) {
                handler.cancel();
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (!trusted(Uri.parse(view.getUrl() == null ? "" : view.getUrl()))) return false;
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                String[] types = params.getAcceptTypes();
                String type = "image/*";
                for (String accepted : types) {
                    if (accepted.contains("json")) { type = "application/json"; break; }
                    if (accepted.startsWith("audio/")) type = "audio/*";
                }
                Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType(type);
                intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, params.getMode() == FileChooserParams.MODE_OPEN_MULTIPLE);
                try { startActivityForResult(intent, FILE_REQUEST); }
                catch (android.content.ActivityNotFoundException error) { fileCallback.onReceiveValue(null); fileCallback = null; }
                return true;
            }
            @Override public void onPermissionRequest(PermissionRequest request) {
                runOnUiThread(() -> requestMicrophone(request));
            }
            @Override public void onPermissionRequestCanceled(PermissionRequest request) {
                if (microphoneRequest == request) microphoneRequest = null;
            }
        });
        web.setDownloadListener((url, agent, disposition, mime, length) -> {
            Uri uri = Uri.parse(url);
            if (url.startsWith("blob:https://" + HOST + "/") && trusted(Uri.parse(web.getUrl()))) downloads.save(url, mime);
            else if ("https".equals(uri.getScheme())) external(uri);
            else Toast.makeText(this, R.string.download_local, Toast.LENGTH_LONG).show();
        });
    }
    private void requestMicrophone(PermissionRequest request) {
        if (!trustedOrigin(request.getOrigin()) || !trusted(Uri.parse(web.getUrl() == null ? "" : web.getUrl()))) { request.deny(); return; }
        boolean audio = false;
        for (String resource : request.getResources()) if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource)) audio = true;
        if (!audio) { request.deny(); return; }
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
            request.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE}); return;
        }
        if (microphoneRequest != null) microphoneRequest.deny();
        microphoneRequest = request;
        requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, MIC_REQUEST);
    }
    @Override public void onRequestPermissionsResult(int code, String[] permissions, int[] grants) {
        super.onRequestPermissionsResult(code, permissions, grants);
        if (code != MIC_REQUEST || microphoneRequest == null) return;
        if (grants.length > 0 && grants[0] == PackageManager.PERMISSION_GRANTED && trusted(Uri.parse(web.getUrl()))) microphoneRequest.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
        else { microphoneRequest.deny(); Toast.makeText(this, R.string.microphone_denied, Toast.LENGTH_LONG).show(); }
        microphoneRequest = null;
    }
    @Override protected void onActivityResult(int code, int result, Intent data) {
        super.onActivityResult(code, result, data);
        if (downloads != null && downloads.onResult(code, result, data)) return;
        if (code == FILE_REQUEST && fileCallback != null) {
            fileCallback.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(result, data));
            fileCallback = null;
        }
    }
    private void external(Uri uri) {
        if (!"https".equals(uri.getScheme()) && !"http".equals(uri.getScheme()) && !"mailto".equals(uri.getScheme())) return;
        try { startActivity(new Intent(Intent.ACTION_VIEW, uri).addCategory(Intent.CATEGORY_BROWSABLE)); }
        catch (android.content.ActivityNotFoundException error) { Toast.makeText(this, R.string.no_browser, Toast.LENGTH_LONG).show(); }
    }
    private void showError() {
        if (errorPanel != null) return;
        errorPanel = new LinearLayout(this);
        errorPanel.setOrientation(LinearLayout.VERTICAL);
        errorPanel.setGravity(android.view.Gravity.CENTER);
        errorPanel.setPadding(48,48,48,48);
        errorPanel.setBackgroundColor(Color.rgb(244,247,244));
        TextView message = new TextView(this); message.setText(R.string.load_error); message.setTextSize(18);
        Button retry = new Button(this); retry.setText(R.string.retry);
        retry.setOnClickListener(v -> { frame.removeView(errorPanel); errorPanel = null; web.loadUrl(START); });
        errorPanel.addView(message); errorPanel.addView(retry); frame.addView(errorPanel, new FrameLayout.LayoutParams(-1,-1));
    }
    @Override public void onBackPressed() {
        if (web.canGoBack()) web.goBack();
        else new AlertDialog.Builder(this).setTitle(R.string.exit_title).setMessage(R.string.exit_message)
                .setNegativeButton(R.string.stay, null).setPositiveButton(R.string.exit, (dialog, which) -> finish()).show();
    }
    @Override protected void onPause() { web.onPause(); super.onPause(); }
    @Override protected void onResume() { super.onResume(); if (web != null) web.onResume(); }
    @Override protected void onDestroy() {
        if (microphoneRequest != null) microphoneRequest.deny();
        if (fileCallback != null) fileCallback.onReceiveValue(null);
        if (downloads != null) downloads.destroy();
        web.destroy(); super.onDestroy();
    }
}
