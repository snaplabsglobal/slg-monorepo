#!/usr/bin/env python3
import http.server
import ssl

# HTTPS server configuration
server_address = ('0.0.0.0', 8443)
httpd = http.server.HTTPServer(server_address, http.server.SimpleHTTPRequestHandler)

# Create SSL context (Python 3.10+ compatible)
context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
context.load_cert_chain('cert.pem', 'key.pem')

# Wrap socket with SSL
httpd.socket = context.wrap_socket(httpd.socket, server_side=True)

print('✅ HTTPS Server running on:')
print('   https://192.168.1.82:8443')
print('   https://localhost:8443')
print('')
print('📱 On your phone:')
print('   1. Visit: https://192.168.1.82:8443')
print('   2. Accept the security warning (self-signed certificate)')
print('   3. Click "Advanced" → "Proceed to 192.168.1.82"')
print('')
print('Press Ctrl+C to stop')

httpd.serve_forever()
