#!/usr/bin/env python
###############################################################################
## Author:  Tomas Wang <tomas.89.wang@gmail.com>
## Date:    2009-09-15
## Version: 0.1
##
##=============================================================================

import os, sys
import signal, pty
import resource
import time
import socket
import asyncore
import struct
import termios
import fcntl
from collections import deque


##=============================================================================
## parse_command: parse command line to list
##=============================================================================

class parse_command:

    def which(self, file):
        if os.path.dirname(file) != '':
            if os.access(file, os.X_OK):
                return file
        p = os.environ.get('PATH', '') or os.defpath
        for i in p.split(os.pathsep):
            f = os.path.join(i, file)
            if os.access(f, os.X_OK):
                return f

    def split(self, s):
        self.init()
        for c in s:
            self.char(c)
        if self.a:
            self.l.append(''.join(self.a))
            self.a = []
        return self.l

    def init(self):
        self.s = 'basic'
        self.a = []
        self.l = []

    def char(self, c):
        assert hasattr(self, self.s), "bad state -> " + self.s
        self.s = getattr(self, self.s)(c) or self.s

    def whitespace(self, c):
        if c == '\\': return 'esc'
        if c == "'":  return 'singlequote'
        if c == '"':  return 'doublequote'
        if not c.isspace():
            self.a.append(c)
            return 'basic'

    def basic(self, c):
        if c == '\\': return 'esc'
        if c == "'":  return 'singlequote'
        if c == '"':  return 'doublequote'
        if c.isspace():
            self.l.append(''.join(self.a))
            self.a = []
            return 'whitespace'
        self.a.append(c)

    def esc(self, c):
        self.a.append(c)
        return 'basic'

    def singlequote(self, c):
        if c == r"'":
            return 'basic'
        self.a.append(c)

    def doublequote(self, c):
        if c == r'"':
            return 'basic'
        self.a.append(c)


##=============================================================================
## app_base: base class for all application class
##=============================================================================

class app_base:

    def __init__(self, command=None, args=[], log=None, cwd=None, env=None):
        self.terminated = True
        self.pid = None
        self.child_fd = -1
        self.closed = True
        self.eof_flag = False
        self.parse = parse_command()
        self.log = log
        self.cwd = cwd
        self.env = env
        if command:
            self.run(command, args)

    def __del__(self):
        if not self.closed:
            try:
                self.close()
            except AttributeError:
                pass

    def fileno(self):
        return self.child_fd

    def close(self, force=True):
        if not self.closed:
            self.flush()
            os.close(self.child_fd)
            self.child_fd = -1
            self.closed = True

    def flush(self):
        pass

    def recv(self, size=-1):
        if size == 0 or self.closed:
            return ''
        if size < 0:
            size = 10000
        r = os.read(self.child_fd, size)
        if r == 0:
            self.eof_flag = True
        return r
    read = recv

    def send(self, s):
        return os.write(self.child_fd, s)
    write = send

    def eof(self):
        return self.eof_flag

    def kill(self, sig=signal.SIGKILL):
        os.kill(self.pid, sig)

    def _parse_args(self, command, args=[]):
        assert type(command) == type("")
        assert type(args) == type([])
        if args == []:
            self.args = self.parse.split(command)
            self.command = self.args[0]
        else:
            self.args = args[:]
            self.args.insert(0, command)
            self.command = command
        self.command = self.parse.which(self.command)
        assert self.command is not None
        self.args[0] = self.command

    def run(self, command, args=[]):
        self._parse_args(command, args)
        self._run()
        self.terminated = self.closed = False

    def _run(self):
        raise "*run* is absolute method"

    def _exec_child(self, c=True):
        if c:
            max_fd = resource.getrlimit(resource.RLIMIT_NOFILE)[0]
            for i in range(3, max_fd):
                try:
                    os.close(i)
                except OSError:
                    pass
        if self.cwd is not None:
            os.chdir(self.cwd)
        if self.env is None:
            os.execv(self.command, self.args)
        else:
            os.execvpe(self.command, self.args, self.env)


##=============================================================================
## app_pty: pty application
##=============================================================================

class app_pty(app_base):

    _pf = sys.platform.lower()
    _n_pty = _pf.find('solaris') < 0 and _pf.find('sunos5') < 0

    def isatty(self):
        return os.isatty(self.child_fd)

    def sendcontrol(self, c):
        c = c.lower()
        a = ord(c)
        if 96 < a < 123:
            return self.send(chr(a - ord('a') + 1))
        d = {
            '@' :  0, '`':  0, '[': 27, '{': 27,
            '\\': 28, '|': 28, ']': 29, '}': 29,
            '^' : 30, '~': 30, '_': 31, '?': 127
        }
        return (c in d and [self.send(chr(d[c]))] or [0])[0]

    def sendeof(self):
        self.send(
            (not hasattr(termios, 'VEOF'))
            and chr(4)
            or termios.tcgetattr(self.child_fd)[6][termios.VEOF]
        )

    def sendintr(self):
        self.send(
            (not hasattr(termios, 'VINTR'))
            and chr(3)
            or termios.tcgetattr(self.child_fd)[6][termios.VINTR]
        )

    def _fork_pty(self):
        if self._n_pty:
            try:
                return pty.fork()
            except OSError, e:
                raise "Error: pty.fork() -> " + str(e)
        p, c = os.openpty()
        if p < 0 or c < 0:
            raise "Error: Could not open pty with os.openpty()"
        pid = os.fork()
        if pid < 0:
            raise "Error: Failed os.fork()"
        if pid:
            os.close(c)
        else:
            os.close(p)
            self._pty_control(c)
            map(lambda i: os.dup2(c, i), range(3))
            if c > 2:
                os.close(c)
        return pid, p

    def _pty_control(self, f):
        n = os.ttyname(f)
        self._test_tty("/dev/tty", os.O_RDWR | os.O_NOCTTY)
        os.setsid()
        try:
            self._test_tty("/dev/tty", os.O_RDWR | os.O_NOCTTY)
        except:
            pass
        assert self._test_tty(n, os.O_RDWR), "Error: Open child pty -> " + n
        assert self._test_tty("/dev/tty", os.O_WRONLY), "Error: Open /dev/tty"

    def _test_tty(self, name, flag):
        fd = os.open(name, flag)
        if fd >= 0:
            os.close(fd)
        return fd >= 0

    def _getwinsize(self):
        TIOCGWINSZ = getattr(termios, 'TIOCGWINSZ', 1074295912L)
        s = struct.pack('HHHH', 0, 0, 0, 0)
        x = fcntl.ioctl(self.fileno(), TIOCGWINSZ, s)
        return struct.unpack('HHHH', x)[0:2]

    def _setwinsize(self, r, c):
        TIOCSWINSZ = getattr(termios, 'TIOCSWINSZ', -2146929561)
        if TIOCSWINSZ == 2148037735L:
            TIOCSWINSZ = -2146929561
        s = struct.pack('HHHH', r, c, 0, 0)
        fcntl.ioctl(self.fileno(), TIOCSWINSZ, s)

    def _run(self):
        self.pid, c_fd = self._fork_pty()
        if self.pid == 0:
            try:
                self.child_fd = sys.stdout.fileno()
                self._setwinsize(24, 80)
            except:
                raise
            self._exec_child()
        self.child_fd = c_fd
        self.sock = socket.fromfd(c_fd, socket.AF_INET, socket.SOCK_STREAM)

    def __getattr__(self, attr):
        return getattr(self.sock, attr)


##=============================================================================
## app_exec: no pty application
##=============================================================================

class app_exec(app_base):

    def _run(self):
        self.sock, c = socket.socketpair()
        self.pid = os.fork()
        if self.pid == 0:
            self.sock.close()
            cf = c.fileno()
            for i in range(3):
                os.dup2(cf, i)
            self._exec_child(False)
        c.close()
        self.child_fd = self.sock.fileno()


##=============================================================================
## app_socket:
##=============================================================================

class app_socket(asyncore.dispatcher):

    ac_in_buffer_size       = 4096
    ac_out_buffer_size      = 4096
    spy = 0

    def __init__(self, command=None, args=[], log=None, cwd=None, env=None):
        self.ac_in_buffer = deque()
        self.ac_in_buffer_length = 0
        self.ac_out_buffer = deque()
        self.ac_over = False
        self.parent = None
        self.app = app_pty(command, args, log, cwd, env)
        asyncore.dispatcher.__init__(self, self.app)

    def handle_read(self):
        try:
            data = self.recv(self.ac_in_buffer_size)
        except socket.error, why:
            self.handle_error()
            return
        if self.spy:
            print 'RECV: (' + data + ')'
        if self.parent:
            self.parent.push(data)
        else:
            self.ac_in_buffer.append(data)
            self.ac_in_buffer_length += len(data)

	def handle_write(self):
		self.initiate_send()

	def handle_close(self):
		self.close()

    def push(self, data):
        if self.spy:
            print 'SEND: (' + data + ')'
        if data:
            self.ac_out_buffer.append(data)
            self.initiate_send()
        else:
            self.push(chr(4))
            #self.close_when_done()

    def readable(self):
        return self.ac_in_buffer_length <= self.ac_in_buffer_size

    def writable(self):
        return self.ac_out_buffer or not self.connected

    def close_when_done(self):
        self.ac_over = True
        self.initiate_send()

    def initiate_send(self):
        if self.ac_out_buffer and self.connected:
            data = self.ac_out_buffer[0]
            obs = min(self.ac_out_buffer_size, len(data))
            try:
                num_sent = self.send(data[:obs])
                if num_sent:
                    data = data[num_sent:]
                if data:
                    self.ac_out_buffer[0] = data
                else:
                    self.ac_out_buffer.popleft()
            except socket.error, why:
                self.handle_error()
        if self.ac_over and not self.ac_out_buffer:
            self.close()

    def shift(self):
        return self.ac_in_buffer and \
            (1, self.ac_in_buffer.popleft()) or (0, None)

    def set_parent(self, parent):
        if hasattr(parent, 'push'):
            self.parent = parent
            r, d = self.shift()
            while r:
                self.parent.push(d)
                r, d = self.shift()


##=============================================================================
## main
##=============================================================================

if __name__ == "__main__":
    p = app_exec()
    p.run('ls --color /')
    a = []
    while True:
        try:
            s = p.read(10000)
            if s == '':
                break
            a.append(s)
        except OSError, e:
            print "Error: " + str(e)
            time.sleep(0.5)
    print '=' * 78
    print ''.join(a)
    print '-' * 78

##=============================================================================
## THE END
##=============================================================================
