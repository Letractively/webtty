#!/usr/bin/env python
###############################################################################
## Author:  Tomas Wang <tomas.89.wang@gmail.com>
## Date:    2009-09-15
## Version: 0.1
##
##=============================================================================

"""
comet is a struct {
    'director': ('S' | 'L'), # S is short, L is long connection
    'session' : <string>,    # 'S' -> session, 'L' -> app name
    'headers' : <http input heads>,
    'body'    : <string>,    # POST data dict
    'read_len': <int>,       # POST data string length
}
handle is http request handler
body is a dict {
    'u' -> username,
    'a' -> auth_str,
    'n' -> seq_no,
    'i' -> input,
    't' -> tcws_obj,
}
"""
import md5, time
import urllib


##=============================================================================
## 
##=============================================================================

class comet_mod_echo:

    def __init__(self, name, sess, handle):
        self._name = name
        self._sess = sess
        self._handle = handle
        self._user = ''
        self._iwin = 0
        self._over = False
        self.setup()

    def setup(self):
        pass

    def _S(self, comet, h):
        s = comet['body'].get('a', [''])[0]
        ar = '/'.join((self._sess, 'password'))
        if md5.md5(ar).hexdigest() != s:
            return h.send_error(404, "Not found auth")
        self._S = self._SS
        self._s_send_ok(h)
        self._l_send_ok()

    def __call__(self, i):
        self.push(i)

    def close(self):
        self._cmd("C.O()")
        self._handle.wfile.write("</body>\r\n</html>\r\n")
        self._handle.wfile.close()
        self._over = True

    def push(self, i):
        if i:
            self._cmd("C.S('%s')" % urllib.quote(i))
        else:
            self.close()

    def _cmd(self, c, h=None):
        if h is None:
            h = self._handle
        h.wfile.write("<script>%s;</script>\r\n" % c)

    def _s_send_ok(self, h):
        h.send_response(200)
        h.send_header("Content-Type", "text/plain")
        h.send_header("Content-Length", "3")
        h.send_header("Connection", "close")
        h.no_cache();
        h.end_headers()
        h.wfile.write("1\r\n")

    def _l_send_ok(self):
        self._iwin += 1
        self._cmd('C.A(%d)' % self._iwin)

    def _SS(self, comet, h):
        body = comet['body']
        n = body.get('n', ['0'])[0]
        if n != str(self._iwin):
            return h.send_error(404, "Not found no")
        self._s_send_ok(h)
        self._l_send_ok()
        self(urllib.unquote(body.get('i', [''])[0]))

    def _L(self, comet):
        body = comet['body']
        self._user = body.get('u', [''])[0]
        self._tcws = body.get('t', ['C'])[0]
        self._handle.send_response(200)
        self._handle.send_header('Content-type', 'text/html')
        #self._handle.send_header('Connection', 'keep-alive')
        self._handle.close_connection = 0
        self._handle.no_cache();
        self._handle.end_headers()
        self._handle.wfile.write("""<html><body>
<script language='javascript'>
var C = parent.window.%s;
var D = {
    $: function (s) { alert("<*> session: (" + s + ")"); },
    A: function (s) { alert("<*> ack: (" + s + ")"); },
    S: function (s) { alert("<*> str: (" + s + ")"); },
    O: function ()  { alert("<*> over"); }
};
if (C == undefined)
    C = D;
for (var i in D)
    if (C[i] == undefined)
        C[i] = D[i];
C.$("%s");
</script>
""" % (self._tcws, self._sess))

##=============================================================================
## 
##=============================================================================

from app_comet import app_socket
from mods.mod_sh import mod_sh
mod_sh.APP_SOCKET_PTY = app_socket
mod_sh.__bases__ = (comet_mod_echo,) + mod_sh.__bases__

##=============================================================================
## 
##=============================================================================

class comet_modules:

    def __init__(self):
        self.mods = { 'echo': comet_mod_echo, 'sh': mod_sh }
        self.sess = {}

    def __call__(self, comet, handle):
        if comet['director'] == 'L':
            return self.L(comet, handle)
        return self.S(comet, handle)

    def S(self, comet, handle):
        sess = comet['session']
        if not self.sess.has_key(sess):
            return handle.send_error(404, "Not found session")
        self.sess[sess]._S(comet, handle)
        if self.sess[sess]._over:
            del self.sess[sess]

    def L(self, comet, handle):
        name = comet['session']
        if not self.mods.has_key(name):
            return handle.send_error(404, "Not found app")
        sess = md5.md5('[%s/%s]' % (name, time.time())).hexdigest()
        self.sess[sess] = self.mods[name](name, sess, handle)
        return self.sess[sess]._L(comet)

##=============================================================================
## THE END
##=============================================================================
