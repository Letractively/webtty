#!/usr/bin/env python
###############################################################################
## Author:  Tomas Wang <tomas.89.wang@gmail.com>
## Date:    2009-09-15
## Version: 0.1
##
##=============================================================================

import socket, asyncore, asynchat

from mod_comet import comet_modules
from http_comet_hander import http_comet_hander


##=============================================================================
## http_channel
##=============================================================================

class http_channel(asynchat.async_chat):

    def __init__(self, sock, addr, server):
        asynchat.async_chat.__init__(self, sock)
        self.server = server
        self.addr = addr
        self.handler = http_comet_hander(sock, addr, server, self)
        self.data = []
        self.found_terminator = self.found_terminator_head
        self.set_terminator('\n')

    def collect_incoming_data(self, data):
        self.data.append(data)

    def found_terminator_head(self):
        line = ''.join(self.data)
        self.data = []
        self.handler.rfile.push(line + '\n')
        if line in ('', '\r'):
            r = self.handler.one_page()
            if r > 0:
                self.set_terminator(r)
                self.found_terminator = self.found_terminator_body

    def found_terminator_body(self):
        line = ''.join(self.data)
        self.data = []
        self.set_terminator('\n')
        self.found_terminator = self.found_terminator_null
        self.handler.comet(line)

    def found_terminator_null(self):
        pass

    def handle_close(self):
        self.close()

    def close(self):
        del self.server.channels[self]
        asynchat.async_chat.close(self)


##=============================================================================
## http_socket
##=============================================================================

class http_server(asyncore.dispatcher):

    channel_class = http_channel

    def __init__ (self, ip='', port=8081):
        asyncore.dispatcher.__init__(self)
        self.port = port
        self.modules = comet_modules()
        self.create_socket(socket.AF_INET, socket.SOCK_STREAM)
        self.set_reuse_addr()
        self.bind((ip, port))
        self.listen(5)
        self.channels = {}

    def handle_accept(self):
        conn, addr = self.accept()
        self.channels[self.channel_class(conn, addr, self)] = 1

    def writable(self):
        return 0


##=============================================================================
## main
##=============================================================================

if __name__ == '__main__':
    port = 8081
    try:
        http_server('', port)
        print 'Tomas Comet Web Server started on port %d' % port
        asyncore.loop(timeout=0.2)
    except KeyboardInterrupt:
        print "Ctrl+C pressed. Shutting down."

##=============================================================================
## THE END
##=============================================================================
