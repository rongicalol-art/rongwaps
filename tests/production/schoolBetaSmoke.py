"""Exercise the built Express static-file gate without real accounts or progress."""
import http.client
import os
import socket
import subprocess
import time

with socket.socket() as available:
    available.bind(('127.0.0.1', 0))
    port = available.getsockname()[1]

process = subprocess.Popen(
    ['node', 'dist-server/server.js'],
    env={**os.environ, 'NODE_ENV': 'production', 'PORT': str(port)},
    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
)


def request(path, method='GET'):
    connection = http.client.HTTPConnection('127.0.0.1', port, timeout=5)
    connection.request(method, path)
    response = connection.getresponse()
    status, headers = response.status, dict(response.getheaders())
    response.read()
    connection.close()
    return status, headers


try:
    for attempt in range(100):
        try:
            if request('/healthz')[0] == 200:
                break
        except OSError:
            if process.poll() is not None:
                raise RuntimeError('Built server exited during startup')
            time.sleep(0.1)
    else:
        raise RuntimeError('Built server did not become ready')

    gated = [
        '/data/grammar/book-1.json',
        '/%64ata/grammar/book-1.json',
        '//data/grammar/book-1.json',
        '/%64ata/%67rammar/book-1.json',
        '/data%2fgrammar%2fbook-1.json',
        '/data/vocabulary/../grammar/book-1.json',
        '/data/vocabulary/book-1.json',
        '/data/study/manifest.json',
        '/%64ata/study/manifest.json.br',
        '/data/study/manifest.json.gz',
        '/data/book-pages/modern-chinese-1/manifest.json',
    ]
    for method in ['GET', 'HEAD']:
        for path in gated:
            status, headers = request(path, method)
            assert status == 401, (method, path, status)
            assert 'no-store' in headers.get('Cache-Control', ''), (path, headers)
    assert request('/data/dictionary/manifest.json')[0] == 401
    assert request('/api/dictionary/search?q=teacher')[0] == 401
    assert request('/data/decomposition-runtime/manifest.json')[0] == 401
    assert request('/')[0] == 200
    assert request('/%xx')[0] == 400
    print('Production smoke passed: 24 protected path/method cases; public shell and malformed-path checks.')
finally:
    process.terminate()
    process.wait(timeout=10)
