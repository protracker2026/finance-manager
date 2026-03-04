$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add('http://localhost:8080/')
$listener.Start()
Write-Host "Server running at http://localhost:8080/"

while ($listener.IsListening) {
    $context = $listener.GetContext()
    $request = $context.Request
    $response = $context.Response
    $path = $request.Url.LocalPath

    if ($path -eq '/') { $path = '/index.html' }

    $basePath = 'c:\Users\usEr\Desktop\code2'
    $filePath = Join-Path $basePath ($path.TrimStart('/').Replace('/', '\'))

    # Strip query string from file path (important for ?v=4 cache busting)
    if ($filePath -match '^([^\?]+)') { $filePath = $matches[1] }

    if (Test-Path $filePath -PathType Leaf) {
        $bytes = [System.IO.File]::ReadAllBytes($filePath)
        $ext = [System.IO.Path]::GetExtension($filePath)
        $contentType = switch ($ext) {
            '.html' { 'text/html;charset=utf-8' }
            '.css'  { 'text/css;charset=utf-8' }
            '.js'   { 'application/javascript;charset=utf-8' }
            '.json' { 'application/json' }
            '.png'  { 'image/png' }
            '.jpg'  { 'image/jpeg' }
            '.svg'  { 'image/svg+xml' }
            '.ico'  { 'image/x-icon' }
            default { 'application/octet-stream' }
        }
        $response.ContentType = $contentType
        # Prevent ALL browser caching for development
        $response.Headers.Add("Cache-Control", "no-cache, no-store, must-revalidate")
        $response.Headers.Add("Pragma", "no-cache")
        $response.Headers.Add("Expires", "0")
        $response.ContentLength64 = $bytes.Length
        $response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
        $response.StatusCode = 404
        $msg = [System.Text.Encoding]::UTF8.GetBytes("Not Found: $path")
        $response.OutputStream.Write($msg, 0, $msg.Length)
        Write-Host "404: $path"
    }

    $response.Close()
}
