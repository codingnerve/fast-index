// Serves the IndexNow key as a plain-text file so you don't have to host the
// `<key>.txt` file manually. Set INDEXNOW_KEY_LOCATION to this route's full URL,
// e.g. https://yourdomain.com/api/indexnow-key
//
// IndexNow allows the key file to live at any path on the host as long as
// `keyLocation` points to it.
export async function GET() {
  const key = process.env.INDEXNOW_KEY;
  if (!key) {
    return new Response("IndexNow key not configured", { status: 404 });
  }
  return new Response(key, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
