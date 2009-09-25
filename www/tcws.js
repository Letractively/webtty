//////////////////////////////////////////////////////////////////////////////
// Author:  Tomas Wang <tomas.89.wang@gmail.com>
// Date:    2009-09-15
// Version: 0.1
// 
//----------------------------------------------------------------------------

(
    function ()
    {
        var
            window = this,
            undefined,
            TCWS = window.TCWS = function (n, u, p)
            {
                return new TCWS.fn.init(n, u, p);
            };
//----------------------------------------------------------------------------
// TCWS Client
//----------------------------------------------------------------------------
TCWS.fn = TCWS.prototype = {
    init: function (n, u, p)
    {
        this._n = n;                        // app name (/comet/L/<n>)
        this._u = u;                        // user name
        this._p = p;                        // password
        this._s = '';                       // session
        this._q = new TCWS.NagleQueue();    // input queue
        this._t = new TCWS.Timer();         // timer
        this._r = [];                       // register listener list
        this.over = true;
    },
    $: function (s)
    {
        this._s = s;
        this.ajax = new TCWS.XHR('/comet/S/' + this._s, false);
        if (this._p)
            this.login(this._u, this._p);
    },
    login: function (u, p)
    {
        if (this._s === '')
            return -3;
        this._u = u;
        this._p = p;
        this.ajax.newRequest();
        this.ajax.addParam('u', this._u);
        this.ajax.addParam(
            'a',
            this._p ? (new TCWS.MD5()).hexdigest(this._s + '/' + this._p) : ''
        );
        this.ajax.sendRequest();
        i = this.ajax.isCompleted()
        while (i == 0)
            i = this.ajax.isCompleted()
        return i == 404 ? -1 : i != 200 ? -2 : this._p == '' ? 0 : 1;
    },
    send: function (i, n)
    {
        this.ajax.newRequest();
        this.ajax.addParam('i', i);
        this.ajax.addParam('n', n);
        this.ajax.sendRequest();
        i = this.ajax.isCompleted();
        while (i == 0)
            i = this.ajax.isCompleted();
        return i == 200;
    },
    register: function (o, f) { this._r.push([o, f]); },
    push: function (s) { this._q.push(s); },
    A: function (s)
    {
        if (s == 1)
            this._q.start('send', this);
        this._q.ack(s);
    },
    O: function (s) { this.push('', true); },
    S: function (s)
    {
        s = decodeURIComponent(s);
        for (var i = 0; i < this._r.length; ++i) {
            var r = this._r[i];
            r[0][r[1]](s);
        }
    },
    comet: function ()
    {
        var ifn = 'TCWS_IFR_' + this._n;
        var s = '<html><head></head><body>' + '<iframe id="' + ifn +
            '" name="' + ifn + '" width=10 height=10></iframe>' +
            '<form action="/comet/L/' + this._n + '" name="FORM_' + ifn +
            '" method="POST" target="' + ifn + '">' +
            '<input type="hidden" name="u" value="' + this._u + '">' +
            '<input type="hidden" name="t" ' +
            'value="document.parentWindow.parent.OBJ_' + ifn + '">' +
            '</form></body></html>';
try {
        this.doc = new ActiveXObject("htmlfile");
        this.doc.open();
        this.doc.write(s);
        this.doc.close();
        var ifr = this.doc.all[ifn].contentWindow.document.parentWindow.parent;
        ifr['OBJ_' + ifn] = this;
        this.doc.all[ifn].contentWindow.parent.document.forms[0].submit();
} catch (e) {}
    }
};
TCWS.fn.init.prototype = TCWS.fn;

//----------------------------------------------------------------------------
// MD5
//     (new MD5).hexdigest("abc") == "900150983cd24fb0d6963f7d28e17f72"
//----------------------------------------------------------------------------
TCWS.MD5 = function ()
{
};
TCWS.MD5.prototype = {
    bit_rol: function (num, cnt)
    {
        return (num << cnt) | (num >>> (32 - cnt));
    },
    safe_add: function (x, y)
    {
        var lsw = (x & 0xFFFF) + (y & 0xFFFF);
        var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
        return (msw << 16) | (lsw & 0xFFFF);
    },
    cmn: function (q, a, b, x, s, t)
    {
        return this.safe_add(
            this.bit_rol(
                this.safe_add(
                    this.safe_add(a, q),
                    this.safe_add(x, t)
                ), s
            ), b
        );
    },
    ff: function (a, b, c, d, x, s, t)
    {
        return this.cmn((b & c) | ((~b) & d), a, b, x, s, t);
    },
    gg: function (a, b, c, d, x, s, t)
    {
        return this.cmn((b & d) | (c & (~d)), a, b, x, s, t);
    },
    hh: function (a, b, c, d, x, s, t)
    {
        return this.cmn(b ^ c ^ d, a, b, x, s, t);
    },
    ii: function (a, b, c, d, x, s, t)
    {
        return this.cmn(c ^ (b | (~d)), a, b, x, s, t);
    },
    binl_md5: function (x, len)
    {
        x[len >> 5] |= 0x80 << ((len) % 32);
        x[(((len + 64) >>> 9) << 4) + 14] = len;

        var a =  1732584193;
        var b = -271733879;
        var c = -1732584194;
        var d =  271733878;

        for (var i = 0; i < x.length; i += 16) {
            var olda = a;
            var oldb = b;
            var oldc = c;
            var oldd = d;

            a = this.ff(a, b, c, d, x[i+ 0], 7 , -680876936);
            d = this.ff(d, a, b, c, x[i+ 1], 12, -389564586);
            c = this.ff(c, d, a, b, x[i+ 2], 17,  606105819);
            b = this.ff(b, c, d, a, x[i+ 3], 22, -1044525330);
            a = this.ff(a, b, c, d, x[i+ 4], 7 , -176418897);
            d = this.ff(d, a, b, c, x[i+ 5], 12,  1200080426);
            c = this.ff(c, d, a, b, x[i+ 6], 17, -1473231341);
            b = this.ff(b, c, d, a, x[i+ 7], 22, -45705983);
            a = this.ff(a, b, c, d, x[i+ 8], 7 ,  1770035416);
            d = this.ff(d, a, b, c, x[i+ 9], 12, -1958414417);
            c = this.ff(c, d, a, b, x[i+10], 17, -42063);
            b = this.ff(b, c, d, a, x[i+11], 22, -1990404162);
            a = this.ff(a, b, c, d, x[i+12], 7 ,  1804603682);
            d = this.ff(d, a, b, c, x[i+13], 12, -40341101);
            c = this.ff(c, d, a, b, x[i+14], 17, -1502002290);
            b = this.ff(b, c, d, a, x[i+15], 22,  1236535329);

            a = this.gg(a, b, c, d, x[i+ 1], 5 , -165796510);
            d = this.gg(d, a, b, c, x[i+ 6], 9 , -1069501632);
            c = this.gg(c, d, a, b, x[i+11], 14,  643717713);
            b = this.gg(b, c, d, a, x[i+ 0], 20, -373897302);
            a = this.gg(a, b, c, d, x[i+ 5], 5 , -701558691);
            d = this.gg(d, a, b, c, x[i+10], 9 ,  38016083);
            c = this.gg(c, d, a, b, x[i+15], 14, -660478335);
            b = this.gg(b, c, d, a, x[i+ 4], 20, -405537848);
            a = this.gg(a, b, c, d, x[i+ 9], 5 ,  568446438);
            d = this.gg(d, a, b, c, x[i+14], 9 , -1019803690);
            c = this.gg(c, d, a, b, x[i+ 3], 14, -187363961);
            b = this.gg(b, c, d, a, x[i+ 8], 20,  1163531501);
            a = this.gg(a, b, c, d, x[i+13], 5 , -1444681467);
            d = this.gg(d, a, b, c, x[i+ 2], 9 , -51403784);
            c = this.gg(c, d, a, b, x[i+ 7], 14,  1735328473);
            b = this.gg(b, c, d, a, x[i+12], 20, -1926607734);

            a = this.hh(a, b, c, d, x[i+ 5], 4 , -378558);
            d = this.hh(d, a, b, c, x[i+ 8], 11, -2022574463);
            c = this.hh(c, d, a, b, x[i+11], 16,  1839030562);
            b = this.hh(b, c, d, a, x[i+14], 23, -35309556);
            a = this.hh(a, b, c, d, x[i+ 1], 4 , -1530992060);
            d = this.hh(d, a, b, c, x[i+ 4], 11,  1272893353);
            c = this.hh(c, d, a, b, x[i+ 7], 16, -155497632);
            b = this.hh(b, c, d, a, x[i+10], 23, -1094730640);
            a = this.hh(a, b, c, d, x[i+13], 4 ,  681279174);
            d = this.hh(d, a, b, c, x[i+ 0], 11, -358537222);
            c = this.hh(c, d, a, b, x[i+ 3], 16, -722521979);
            b = this.hh(b, c, d, a, x[i+ 6], 23,  76029189);
            a = this.hh(a, b, c, d, x[i+ 9], 4 , -640364487);
            d = this.hh(d, a, b, c, x[i+12], 11, -421815835);
            c = this.hh(c, d, a, b, x[i+15], 16,  530742520);
            b = this.hh(b, c, d, a, x[i+ 2], 23, -995338651);

            a = this.ii(a, b, c, d, x[i+ 0], 6 , -198630844);
            d = this.ii(d, a, b, c, x[i+ 7], 10,  1126891415);
            c = this.ii(c, d, a, b, x[i+14], 15, -1416354905);
            b = this.ii(b, c, d, a, x[i+ 5], 21, -57434055);
            a = this.ii(a, b, c, d, x[i+12], 6 ,  1700485571);
            d = this.ii(d, a, b, c, x[i+ 3], 10, -1894986606);
            c = this.ii(c, d, a, b, x[i+10], 15, -1051523);
            b = this.ii(b, c, d, a, x[i+ 1], 21, -2054922799);
            a = this.ii(a, b, c, d, x[i+ 8], 6 ,  1873313359);
            d = this.ii(d, a, b, c, x[i+15], 10, -30611744);
            c = this.ii(c, d, a, b, x[i+ 6], 15, -1560198380);
            b = this.ii(b, c, d, a, x[i+13], 21,  1309151649);
            a = this.ii(a, b, c, d, x[i+ 4], 6 , -145523070);
            d = this.ii(d, a, b, c, x[i+11], 10, -1120210379);
            c = this.ii(c, d, a, b, x[i+ 2], 15,  718787259);
            b = this.ii(b, c, d, a, x[i+ 9], 21, -343485551);

            a = this.safe_add(a, olda);
            b = this.safe_add(b, oldb);
            c = this.safe_add(c, oldc);
            d = this.safe_add(d, oldd);
        }
        return Array(a, b, c, d);
    },
    str2rstr_utf8: function (input)
    {
        var output = "";
        var x, y;
        for (var i = 0; i < input.length; ++i) {
            x = input.charCodeAt(i);
            y = i + 1 < input.length ? input.charCodeAt(i + 1) : 0;
            if (0xD800 <= x && x <= 0xDBFF && 0xDC00 <= y && y <= 0xDFFF) {
                x = 0x10000 + ((x & 0x03FF) << 10) + (y & 0x03FF);
                i++;
            }
            if (x <= 0x7F)
                output += String.fromCharCode(x);
            else if (x <= 0x7FF)
                output += String.fromCharCode(
                    0xC0 | ((x >>> 6 ) & 0x1F),
                    0x80 | ( x         & 0x3F)
                );
            else if (x <= 0xFFFF)
                output += String.fromCharCode(
                    0xE0 | ((x >>> 12) & 0x0F),
                    0x80 | ((x >>> 6 ) & 0x3F),
                    0x80 | ( x         & 0x3F)
                );
            else if (x <= 0x1FFFFF)
                output += String.fromCharCode(
                    0xF0 | ((x >>> 18) & 0x07),
                    0x80 | ((x >>> 12) & 0x3F),
                    0x80 | ((x >>> 6 ) & 0x3F),
                    0x80 | ( x         & 0x3F)
                );
        }
        return output;
    },
    rstr2binl: function (input)
    {
        var output = Array(input.length >> 2);
        for (var i = 0; i < output.length; i++)
            output[i] = 0;
        for(var i = 0; i < input.length * 8; i += 8)
            output[i>>5] |= (input.charCodeAt(i / 8) & 0xFF) << (i%32);
        return output;
    },
    binl2rstr: function (input)
    {
        var output = "";
        for (var i = 0; i < input.length * 32; i += 8)
            output += String.fromCharCode((input[i>>5] >>> (i % 32)) & 0xFF);
        return output;
    },
    rstr_md5: function (s)
    {
        return this.binl2rstr(this.binl_md5(this.rstr2binl(s), s.length * 8));
    },
    rstr2hex: function (input)
    {
        var hex_tab = "0123456789abcdef";
        var output = "";
        var x;
        for(var i = 0; i < input.length; i++) {
          x = input.charCodeAt(i);
          output += hex_tab.charAt((x >>> 4) & 0x0F)
                 +  hex_tab.charAt( x        & 0x0F);
        }
        return output;
    },
    hexdigest: function (s)
    {
        return this.rstr2hex(this.rstr_md5(this.str2rstr_utf8(s)));
    }
};

//----------------------------------------------------------------------------
// Nagle Queue
//----------------------------------------------------------------------------
//     push : append to queue tail, null element is over
//     ack  : set queue head point to next
//     start: start to run timer
//----------------------------------------------------------------------------
TCWS.NagleQueue = function ()
{
    this.init();
}
TCWS.NagleQueue.prototype = {
    init: function ()
    {
        this._s = '';       // head value
        this._t = [];       // buffer
        this._h = 0;        // head point
        this._a = 0;        // ack point
        this._o = true;     // over
    },
    start: function (fun, obj)
    {
        if (obj === undefined)
            obj = window;
        this._obj = obj;    // callback obj
        this._fun = fun;    // callback fun
        this._o = false;    // over
        this.run();
    },
    run: function ()
    {
        var self = this;
        var f = function ()
        {
            var t = 200;
            if (self._h + 2 == self._a) {
                self.next();
                self._h++;
            }
            if (self._h + 1 == self._a && (self._s || self._t)) {
                if (!self._s)
                    self.next();
                if (self._s) {
                    if (self._obj[self._fun](self._s, self._h + 1)) {
                        self._s = '';
                        self._h++;
                    } else
                        t = 2500;
                }
            }
            if (self._s || self._t || !self._o)
                self._timer = setTimeout(f, t);
        };
        self._timer = setTimeout(f, 200);
    },
    next: function ()
    {
        this._s = this._t.join('');
        this._t = [];
    },
    push: function (x)
    {
        if (this._o)
            return false;
        if (x)
            this._t.push(x)
        else
            this._o = true;
        return true;
    },
    ack: function (a)
    {
        if (++this._a != a)
            alert('bad ack: ' + this._a + ' -> ' + a);
    }
};

//----------------------------------------------------------------------------
// Ajax Object
//----------------------------------------------------------------------------
TCWS.XHR = function (url, async)
{
    this.url = url;
    this.async = (async == undefined ? false : async);
}
TCWS.XHR.prototype = {
    newRequest: function()
    {
        var request = this.request;
        if (request) {
            request.onreadystatechange = function() { };
            if (request.readyState != 4)
                request.abort();
            delete request;
        }
        request = null;
        if (window.ActiveXObject)
            request = new ActiveXObject("Microsoft.XMLHTTP");
        else if (window.XMLHttpRequest)
            request = new XMLHttpRequest();
        this.request = request;
        this.sent = false;
        this.params = new Array();
        this.headers = new Array();
        return request;
    },
    checkRequest: function()
    {
        if (!this.request)
            throw "Request not created";
        if (this.sent)
            throw "Request already sent";
        return true;
    },
    addParam: function(pname, pvalue)
    {
        this.checkRequest();
        this.params.push({ name: pname, value: pvalue });
    },
    addHeader: function(hname, hvalue)
    {
        this.checkRequest();
        this.headers.push({ name: hname, value: hvalue });
    },
    sendRequest: function(callback)
    {
        this.checkRequest();
        if (callback == undefined)
            callback = function () { };
        var body = [];
        for (var i = 0; i < this.params.length; i++)
            body.push([
                encodeURIComponent(this.params[i].name),
                encodeURIComponent(this.params[i].value)
            ].join('='));
        this.request.open('POST', this.url, this.async);
        for (var i = 0; i < this.headers.length; i++)
            this.request.setRequestHeader(
                this.headers[i].name,
                this.headers[i].value
            );
        if (this.async)
            this.request.onreadystatechange = callback;
        this.request.setRequestHeader(
            "Content-Type",
            "application/x-www-form-urlencoded"
        );
        this.sent = true;
        this.request.send(body.join('&'));
        if (!this.async)
            callback();
    },
    isCompleted: function()
    {
        if (!(this.request && this.sent && this.request.readyState == 4))
            return 0;
        if (this.request.status == 200)
            return 200;
        if (this.request.status == 404)
            return 404;
        return -1;
    }
};

//----------------------------------------------------------------------------
// Timer Event
//----------------------------------------------------------------------------
TCWS.Timer = function ()
{
}
TCWS.Timer.prototype = {
    arr: {},
    add: function (obj, fun, msec)
    {
        if (msec <= 0)
            return;
        var self = this;
        var f = function ()
        {
            var o = f.obj[f.fun]();
            if (o === undefined)
                f.tid = setTimeout(f, msec);
            else if (o > 0)
                f.tid = setTimeout(f, o);
            else
                self.del(f.ret);
        };
        var r = setTimeout(f, msec);
        f.ret = r;
        f.tid = r;
        f.obj = obj;
        f.fun = fun;
        f.msec = msec;
        self.arr[r] = f;
        return r;
    },
    del: function (i)
    {
        if (i == undefined)
            for (var x in this.arr)
                this.del(x);
        else if (this.arr[i]) {
            clearTimeout(this.arr[i].tid);
            delete this.arr[i];
        }
    }
};

//----------------------------------------------------------------------------
    }
) ();
//----------------------------------------------------------------------------
// THE END
//----------------------------------------------------------------------------
