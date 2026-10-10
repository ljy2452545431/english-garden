package cn.englishgarden.app;

import android.app.Activity;
import android.content.Intent;
import android.os.Handler;
import android.os.Looper;
import android.util.Base64;
import android.webkit.WebView;
import android.widget.Toast;
import org.json.JSONObject;
import org.json.JSONTokener;
import java.io.OutputStream;

/** One user-initiated blob export, bounded in size/time; no native JavaScript bridge. */
final class BlobDownload {
    private static final int SAVE_REQUEST = 12, MAX_BYTES = 20 * 1024 * 1024;
    private final Activity activity;
    private final WebView web;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private byte[] pending;
    private boolean busy;
    private boolean destroyed;
    private long generation;
    private Runnable watchdog;
    private String slot;
    BlobDownload(Activity activity, WebView web) { this.activity = activity; this.web = web; }
    void save(String url, String advertisedMime) {
        if (busy || destroyed) return;
        busy = true;
        long operation = ++generation;
        watchdog = () -> { if (active(operation)) fail(); };
        handler.postDelayed(watchdog, 20000);
        slot = "__gardenExport" + Long.toHexString(System.nanoTime());
        String key = JSONObject.quote(slot);
        String script = "(()=>{const k=" + key + ";window[k]=null;fetch(" + JSONObject.quote(url)
                + ").then(r=>r.blob()).then(b=>{if(b.size>" + MAX_BYTES + ")throw Error();const f=new FileReader();f.onload=()=>window[k]={data:f.result,mime:b.type};f.onerror=()=>window[k]={error:true};f.readAsDataURL(b)}).catch(()=>window[k]={error:true})})()";
        web.evaluateJavascript(script, result -> { if (active(operation)) poll(0, operation); });
    }
    private boolean active(long operation) { return !destroyed && busy && generation == operation; }
    private void poll(int count, long operation) {
        if (!active(operation)) return;
        if (count >= 100) { fail(); return; }
        web.evaluateJavascript("JSON.stringify(window[" + JSONObject.quote(slot) + "]||null)", value -> {
            if (!active(operation)) return;
            try {
                Object decoded = new JSONTokener(value).nextValue();
                if (!(decoded instanceof String) || "null".equals(decoded)) { handler.postDelayed(() -> poll(count + 1, operation), 200); return; }
                JSONObject result = new JSONObject((String) decoded);
                if (result.optBoolean("error")) { fail(); return; }
                String data = result.optString("data");
                String mime = result.optString("mime").split(";")[0];
                String extension = extension(mime);
                if (extension == null || !data.startsWith("data:") || !data.contains(";base64,") || data.length() > MAX_BYTES * 1.4 + 1024) { fail(); return; }
                pending = Base64.decode(data.substring(data.indexOf(',') + 1), Base64.DEFAULT);
                if (pending.length > MAX_BYTES) { fail(); return; }
                clearSlot();
                handler.removeCallbacks(watchdog);
                Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE)
                        .setType(mime).putExtra(Intent.EXTRA_TITLE, "English-Garden-" + System.currentTimeMillis() + extension);
                activity.startActivityForResult(intent, SAVE_REQUEST);
            } catch (Exception error) { fail(); }
        });
    }
    private String extension(String mime) {
        switch (mime) {
            case "image/png": return ".png";
            case "image/jpeg": return ".jpg";
            case "application/json": return ".json";
            case "text/plain": return ".txt";
            case "audio/webm": return ".webm";
            case "audio/ogg": return ".ogg";
            case "audio/mp4": return ".m4a";
            case "audio/mpeg": return ".mp3";
            default: return null;
        }
    }
    boolean onResult(int code, int result, Intent data) {
        if (code != SAVE_REQUEST) return false;
        if (destroyed) return true;
        if (result != Activity.RESULT_OK || data == null || data.getData() == null || pending == null) { reset(); return true; }
        byte[] bytes = pending;
        long operation = generation;
        pending = null;
        new Thread(() -> {
            boolean saved = false;
            try (OutputStream stream = activity.getContentResolver().openOutputStream(data.getData())) {
                if (stream != null) { stream.write(bytes); saved = true; }
            } catch (Exception ignored) { }
            boolean success = saved;
            handler.post(() -> { if (!active(operation)) return; reset(); Toast.makeText(activity, success ? R.string.export_saved : R.string.export_failed, Toast.LENGTH_LONG).show(); });
        }, "garden-export").start();
        return true;
    }
    private void clearSlot() { if (slot != null) web.evaluateJavascript("delete window[" + JSONObject.quote(slot) + "]", null); slot = null; }
    private void reset() { pending = null; busy = false; generation++; if (watchdog != null) handler.removeCallbacks(watchdog); clearSlot(); }
    private void fail() { reset(); Toast.makeText(activity, R.string.export_failed, Toast.LENGTH_LONG).show(); }
    void destroy() { destroyed = true; handler.removeCallbacksAndMessages(null); reset(); }
}
