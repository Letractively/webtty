#!/usr/bin/env python
###############################################################################
## Author:  Tomas Wang <tomas.89.wang@gmail.com>
## Date:    2009-09-15
## Version: 0.1
##
##=============================================================================
## read file proxy & write file proxy
##=============================================================================

class rfile_proxy:

	def __init__(self):
		self.data = []

	def readline(self):
		if self.data:
			return self.data.pop()
		return ''

	def push(self, line):
		self.data.insert(0, line)


class wfile_proxy:

	def __init__(self, out):
		self.out = out

	def write(self, s):
		l = len(s)
		self.out.push(s)
		return l

	def close(self):
		self.out.close_when_done()


##=============================================================================
## comet http handler class
##=============================================================================

import cgi
from SimpleHTTPServer import SimpleHTTPRequestHandler


class http_comet_hander(SimpleHTTPRequestHandler):
	"Tomas Comet Web Server - 0.1"
	server_version = 'tcws'
	sys_version = '0.1'

	def setup(self): pass
	def handle(self): pass
	def finish(self): pass

	def __init__(self, sock, addr, server, parent):
		self.modules = server.modules
		SimpleHTTPRequestHandler.__init__(self, sock, addr, server)
		self.rfile = rfile_proxy()
		self.wfile = wfile_proxy(parent)
		self._comet = {}

	def one_page(self):
		self._comet = {}
		self.close_connection = 1
		self.handle_one_request()
		r = int(self._comet.get('read_len', '-1'))
		if r > 0:
			return r
		self._comet = {}
		if self.close_connection:
			self.wfile.close()
		return -1

	def do_POST(self):
		p = self.path.split('/')
		if not (len(p) == 4 and p[1] == 'comet' and p[2] in ('S', 'L')):
			return self.send_error(404, 'Not found 1')
		rl = int(self.headers.getheader('content-length'))
		if rl < 0:
			return self.send_error(404, 'Not found 2')
		self._comet = {
			'read_len': rl,
			'director': p[2],
			'session':  p[3],
			'headers': self.headers,
		}

	def comet(self, body):
		self._comet['body'] = cgi.parse_qs(body)
		self.modules(self._comet, self)
		if self.close_connection:
			self.wfile.close()

	def no_cache(self):
		self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
		#self.send_header('Cache-Control', 'post-check=0, pre-check=0')
		self.send_header('Pragma', 'no-cache')

##=============================================================================
## THE END
##=============================================================================
