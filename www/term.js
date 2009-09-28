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
            TERM = window.TERM = function (n)
            {
                return new TERM.fn.init(n);
            };
//----------------------------------------------------------------------------
// terminator
//----------------------------------------------------------------------------

TERM.fn = TERM.prototype = {
    init: function (n)
    {
        if (n != undefined)
            this._n = n;
    },
    _d_dfg:  '#ffffff', // display default fg
    _d_dbg:  '#000000', // display default bg
    _d_cfg:  '#ffffff', // display current fg
    _d_cbg:  '#000000', // display current bg
    _d_tbg:  '#0000bb', // display title bg
    _a_bo:   false,     // attr font bold
    _a_hl:   false,     // attr hight light
    _a_ul:   false,     // attr under line
    _a_bl:   false,     // attr blink
    _a_bf:   false,     // attr change bg & fg
    _a_hi:   false,     // attr hide
    __text:  '',        // current cssText
    __title: 'NeoTerm', // window title
    __ct: [
        '#000000', '#BB0000', '#00BB00', '#BBBB00',
        '#0000BB', '#BB00BB', '#00BBBB', '#BBBBBB',
        '', ''
    ],
    disp_init: function ()
    {
        this._d_cfg = this._d_dfg;
        this._d_cbg = this._d_dbg;
        this._a_bo = false;
        this._a_hl = false;
        this._a_ul = false;
        this._a_bl = false;
        this._a_bf = false;
        this._a_hi = false;
        this.__text = '';
    },
    set_title: function (s)
    {
        if (s === undefined)
            s = this.__title;
        else
            s = '[*] ' + s;
        if (s.length != this._col + 2) {
            if (s.length > this._col + 2)
                s = s.substr(0, this._col - 2) + '... ';
            else {
                for (var i = 0; i < this._col + 2; ++i)
                    s += ' ';
                s = s.substr(0, this._col + 2);
            }
        }
        this.__title = this.$('title').innerText = s;
    },
    set_bg: function (i)
    {
        if (i < '0' || i > '9' || i == '8')
            return;
        this.__text = '';
        this[this._a_bf ? '_cfg' : '_cbg'] = this.__ct[i];
    },
    set_fg: function (i)
    {
        if (i < '0' || i > '9' || i == '8')
            return;
        this.__text = '';
        this[this._a_bf ? '_cbg' : '_cfg'] = this.__ct[i];
    },
    set_attr: function (k, b)
    {
        var i = '_a_' + k;
        if (this[i] !== undefined) {
            this.__text = '';
            this[i] = b;
        }
    },
    get_text: function ()
    {
        if (this.__text === '') {
            var fg = this._d_cfg;
            var bg = this._d_cbg;
            var t, s = ' ';
            if (this._a_bf) {
                t  = fg || this._d_dbg;
                fg = bg || this._d_dfg;
                bg = t;
            }
            if (fg) s += 'color: ' + fg + ';';
            if (bg) s += 'background-colr: ' + bg + ';';
            if (this._a_bo) s += 'font-weight:bold;';
            //if (this._a_hl) s += '';
            if (this._a_ul) s += 'text-decoration: underline;';
            //if (this._a_bl) s += '';
            //if (this._a_hi) s += '';
            this.__text = s;
        }
        return this.__text;
    },
    _c_nln:  0,         // new line no
    _c_clr:  '#00ff00', // cursor color
    _c_svc:  '#00ff00', // cursor save color
    _c_row:  0,         // cursor current row
    _c_col:  0,         // cursor current col
    _c_shw:  true,      // cursor show (false is hide)
    _c_svp:  [],        // cursor save
    cur_hide: function (b)
    {
        if (b)
            this._c_shw = false;
        if (this._c_clr != this._c_svc) {
            var p = this._a[this._c_row][this._c_col];
            var t = p.style.backgroundColor;
            p.style.backgroundColor = this._c_svc;
            this._c_svc = t;
        }
    },
    cur_show: function (b)
    {
        if (b)
            this._c_shw = true;
        if (this._c_shw && this._c_clr == this._c_svc) {
            var p = this._a[this._c_row][this._c_col];
            var t = p.style.backgroundColor;
            p.style.backgroundColor = this._c_svc;
            this._c_svc = t;
        }
    },
    cur_tidy: function ()
    {
        if (this._c_col < 0) {
            while (this._c_col < 0 && this._c_row > 0) {
                this._c_col += this._col;
                this._c_row --;
            }
            if (this._c_col < 0)
                this._c_col = 0;
        } else if (this._c_col >= this._col) {
            var t = this._c_col % this._col;
            this._c_col -= t;
            this._c_row += this._c_col / this._col;
            this._c_col = t;
            while (this._c_row >= this._row) {
                this.cur_scroll();
                this._c_row --;
            }
        }
    },
    cur_scroll: function (x, t, b)
    {
        b = (b === undefined ? this._row : b);
        t = (t === undefined ? 0 : t);
        x = (x === undefined ? 1 : x);
        if (b <= t || x == 0)
            return;
        var n, o, a, i;
        if (x > 0)
            for (i = 0; i < x; ++i) {
                n = this.cur_line();
                o = this._df.childNodes[t];
                a = this._a.pop();
                this._a.splice(b, 0, a);
                this._a.splice(t, 1);
                this._df.insertBefore(n, this._df.childNodes[b] || null);
                this._df.removeChild(o);
                n.style.display = 'block';
            }
        else
            for (i = 0; i < -x; ++i) {
                n = this.cur_line();
                o = this._df.childNodes[b - 1];
                a = this._a.pop();
                this._a.splice(t, 0, a);
                this._a.splice(b, 1);
                this._df.insertBefore(n, this._df.childNodes[t]);
                this._df.removeChild(o);
                n.style.display = 'block';
            }
    },
    cur_line: function ()
    {
        var o = document.createElement('DIV');
        var a = [];
        a.lf = 0;           // tail is not \n
        a.root = o;
        var n = this._c_nln++;
        o.id = this._n + '_' + n;
        o.appendChild(document.createTextNode('|'));
        for (var i = 0; i < this._col; ++i) {
            var s = this.cur_char();
            o.appendChild(s);
            a.push(s);
        }
        o.appendChild(document.createTextNode('|'));
        o.style.display = 'none';
        this._a.push(a);
        return o;
    },
    cur_char: function ()
    {
        var r = document.createElement('SPAN');
        r.appendChild(document.createTextNode(' '));
        return r;
    },
    cur_set_lf: function (r, b)
    {
        this.log("cur_set_lf: " + r + " -> " + b);
        if (r >= 0 && r < this._row)
            this._a[r].lf = b ? 1 : 0;
    },
    cur_get_lf: function (r)
    {
        this.log("cur_get_lf: " + r + " -> " + (this._a[r] && this._a[r].lf));
        return this._a[r] && this._a[r].lf;
    },
    cur_save: function ()
    {
        this._c_svp = [this._c_row, this._c_col];
    },
    cur_restore: function ()
    {
        if (this._c_svp) {
            this.cur_hide();
            this._c_row = this._c_svp[0];
            this._c_col = this._c_svp[1];
            this.cur_show();
        }
    },
    cur_ins: function (i)
    {
        var c = this._c_col;
        var a = this._a[this._c_row];
        var r = a.root;
        while (i-- > 0 && c < this._col) {
            
        }
    },
    cur_del: function (i)
    {
        var c = this._c_col;
        var a = this._a[this._c_row];
        var r = a.root;
        while (i-- > 0 && c < this._col) {
            
        }
    },
    _n:      'NeoTerm', // display div id
    _a:      [],        // display data
    _row:    24,        // screen rows
    _col:    80,        // screen cols
    _r:      [],        // register listener list
    register: function (o, f)
    {
        this._r.push([o, f]);
    },
    $: function (n)
    {
        n = (n === undefined ? '' : '_' + n);
        return document.getElementById(this._n + n);
    },
    __sct: { ' ': '&nbsp;', '<': '&lt;', '>': '&gt;', '&': '&amp;' },
    set_char: function (i, r, c)
    {
        this._a[r][c].style.cssText = this.get_text();
        this._a[r][c].innerHTML = (this.__sct[i] || i);
    },
    set_char_next: function (i)
    {
        switch (i) {
        case ' ':
            this.set_char(' ', this._c_row, this._c_col);
            this._a[this._c_row][this._c_col].tab = 9;
            this._c_col++;
            this.cur_tidy();
            break;
        case '\t':
            for (var n = 8 - (this._c_col % 8); n > 0; --n) {
                this.set_chr(' ', this._c_row, this._c_col);
                this._a[this._c_row][this._c_col].tab = n;
                this._c_col++;
                this.cur_tidy();
            }
            break;
        default:
            this.set_char(i, this._c_row, this._c_col);
            this._c_col++;
            this.cur_tidy();
            break;
        }
    },
    display: function (log)
    {
        this.set_log(log);
        this._d = this.$();
        if (this._d !== null)
            return;
        this._d = document.createElement('div');
        this._d.id = this._n;
        this._c_nln = 0;
        this._c_svc = this._c_clr;
        this.disp_init();
        document.body.appendChild(this._d);
        var s = [
            "<center><table border=1 bgcolor='[%d_dbg%]' ",
            "id='[%n%]_d_dbg' style='white-space: pre; ",
            "font-family: Courier New;'><tr><td>",
            "<span id='[%n%]_title' style='background-color: [%d_tbg%]; ",
            "color:[%d_dfg%];'>&lt;&gt;</span></td></tr>",
            "<tr><td><div id='[%n%]_df' ",
            "style='background-color: [%d_dbg%]; color:[%d_dfg%];'>",
            "</div></td></tr></table></center>"
        ];
        var self = this;
        s = s.join('').replace(
            /\[%\w+%\]/g,
            function (x)
            {
                var k = '_' + x.substring(2, x.length - 2);
                return self[k] == undefined ? '' : self[k];
            }
        );
        this._d.innerHTML = s;
        this.set_title();
        this._df = this.$('df');
        for (var i = 0; i < this._row; ++i) {
            var n = this.cur_line()
            this._df.appendChild(n);
            n.style.display = 'block';
        }
        this._d.onkeydown = function ()
        {
            self.key_down(window.event);
            return false;
        };
        this._d.onkeyup = function ()
        {
            self.key_up(window.event);
            return false;
        };
        this.stat_init();
    },
    disp_clear: function (l, h, t)
    {
        var b, e;
        if (l) {
            b = [this._c_row, 0];
            e = (this._c_row + 1) * this._col;
        } else {
            b = [0, 0];
            e = this._row * this._col;
        }
        if (!h)
            b = [this._c_row, this._c_col];
        if (!t)
            e = this._c_row * this._col + this._c_col;
        var i = b[0] * this._col + b[1];
        while (i < e) {
            this.set_char(' ', b[0], b[1]++);
            if (b[1] == this._col) {
                b[1] = 0;
                b[0]++;
            }
            i++;
        }
    },
    _ctrl_t: {
        50:   0,  192: 0, 219: 27, 220: 28,
        221: 29,  54: 30, 189: 31, 191: 127
    },
    _shift_t: {
        48: [48, 41], 49: [49, 33], 50: [50, 64], 51: [51, 35], 52: [52, 36],
        53: [53, 37], 54: [54, 94], 55: [55, 38], 56: [56, 42], 57: [57, 40],
        37: [ 2,  2], 38: [16, -2], 39: [ 6,  6], 40: [14, -3], // l u r d
        192: [96, 126],     // ` ~
        189: [45,  95],     // - _
        187: [61,  43],     // = +
        219: [91, 123],     // [ {
        221: [93, 125],     // ] }
        220: [92, 124],     // \ |
        186: [59,  58],     // ; :
        222: [39,  34],     // ' "
        188: [44,  60],     // , <
        190: [46,  62],     // . >
        191: [47,  63]      // / ?
    },
    key_down: function ()
    {
        var e = window.event;
        var c = e.keyCode;
        var i = -1;
        if (c < 16 || c > 18) {
            if (e.ctrlKey) {
                if (c > 64 && c < 91)
                    i = c - 64;
                else if (this._ctrl_t[c] != undefined)
                    i = this._ctrl_t[c];
            } else if (this._shift_t[c] != undefined) {
                i = this._shift_t[c][e.shiftKey ? 1 : 0];
            } else if (c > 64 && c < 91 && !e.shiftKey) {
                i = c + 32;
            } else {
                i = c;
            }
            if (i >= 0)
                this.send(String.fromCharCode(i));
            else if (i == -2)
                this.set_log(false);
            else if (i == -3)
                this.set_log(true);
        }
        try { e.returnValue = false; } catch (x) {}
        try { e.keyCode = 0; } catch (x) {}
        try { e.cancelBubble = true; } catch (x) {}
    },
    key_up: function ()
    {
        try { e.returnValue = false; } catch (x) {}
        try { e.keyCode = 0; } catch (x) {}
        try { e.cancelBubble = true; } catch (x) {}
    },
    send: function (s)
    {
        this.log(s, '>');
        for (var i = 0; i < this._r.length; ++i) {
            var r = this._r[i];
            r[0][r[1]](s);
        }
    },
    _l_cur: false,      // current log status
    _l_def: true,       // default log status
    _l_tbl: { '\r': '\\r', '\n': '\\n', '\t': '\\t', '\\': '\\\\' },
    _l_log: '',
    set_log: function (e)
    {
        this._l_cur = (e ? this._l_def : false);
        if (this._l_cur && !this._l_log) {
            var d = document.createElement('DIV');
            d.id = this._n + '_log';
            d.innerHTML = '';
            document.body.appendChild(d);
            d.style.cssText = [
                'border: 1px solid blue',
                'overflow-y: scroll',
                'height: 200px'
            ].join('; ');
            this._l_log = d;
        }
        if (this._l_log)
            this._l_log.style.display = (this._l_cur ? 'block' : 'none');
    },
    log: function (s, rw)
    {
        if (!this._l_cur)
            return;
        if (rw !== '>' && rw !== '<')
            rw = '*';
        var self = this;
        this._l_log.innerHTML += rw + rw + '&nbsp;(' + s.replace(
            /.|\s/g,
            function (x)
            {
                return self._l_tbl[x] || (
                    x >= ' ' && x <= '~'
                        ? x
                        : '\\x' + (
                            x < '\x10' ? '0' : ''
                        ) + x.charCodeAt(0).toString(16)
                );
            }
        ) + ')<br>\n';
        this._l_log.scrollTop = this._l_log.scrollHeight;
    },
    _s_no: 0,   //  0: BASIC
                //  1: SEEN_OSC_W
                //  2: SEEN_ESC
                //  3: SEEN_CSI
                //  4: SEEN_OSC
                //  5: OSC_STRING
                //  6: SEEN_OSC_P
                //  7: OSC_MAYBE_ST
                //  8: VT52_ESC
                //  9: VT52_Y1
                // 10: VT52_Y2
                // 11: VT52_FG
                // 12: VT52_BG
    _s_q: 0,
    _s_i: 0,
    _s_b: [],
    stat_init: function ()
    {
        this._s_no = 0;
    },
    push: function (s)
    {
        this.log(s, '<');
        this.cur_hide();
        var c, i;
        for (var _x_ = 0; _x_ < s.length; ++_x_) {
            c = s.charAt(_x_);
            i = c.charCodeAt(0);
            if (i < 32 && this._s_no < 5) {
                switch (c) {
                case '\005': break; // type query
                case '\007': break; // bell
                case '\b':          // back space \008
                    this._c_col--;
                    this.cur_tidy();
                    break;
                case '\016': break; //lock-shift 1
                case '\017': break; //lock-shift 0
                case '\033':        // ESC
                    this._s_no = 2;
                    break;
                case '\015':        // CR
                    this._c_col = 0;
                    break;
                case '\014':        // FF clear screen
                    this._c_row = this._c_col = 0;
                    this.disp_clear(0, 0, 1);
                    break;
                case '\013':        // VT
                    this._c_col = 0;
                case '\012':        // LF
                    this._c_col += this._col;
                    this.cur_tidy();
                    break;
                    if (!this._c_col && this.cur_get_lf(this._c_row - 1) === 0)
                        this.cur_set_lf(this._c_row - 1, 1);
                    else {
                        this.cur_set_lf(this._c_row, 1);
                        this._c_col += this._col;
                        this.cur_tidy();
                    }
                    break;
                case '\t':          // TAB
                    this.set_char_next('\t');
                    break;
                }
            } else {
                switch (this._s_no) {
                case 0:
                    if (i < 127)
                        this.set_char_next(c);
                    else {
                        this.set_char_next('?');
                        if (i >= 256)
                            this.set_char_next('?');
                    }
                    break;
                case 1:
                    if (c >= '0' && c <= '9') {
                        this._s_i *= 10;
                        this._s_i += parseInt(c);
                    } else {
                        this._s_b = [];
                        this._s_no = 0;
                    }
                    break;
                case 7:
                    if (c == '\\')
                        break;
                case 2:
                    if (c >= ' ' && c <= '/') {
                        this._s_q = (this._s_q ? -1 : c);
                        break;
                    }
                    this._s_no = 0;
                    switch (c) {
                    case '[':
                        this._s_no = 3;
                        this._s_q = 0;
                        this._s_b = [];
                        break;
                    case ']':
                        this._s_no = 4;
                        this._s_i = 0;
                        break;
                    case '7':
                        this.cur_save();
                        break;
                    case '8':
                        this.cur_restore();
                        break;
                    }
                    break;
                case 3:
                    if (c >= '0' && c <= '9' || c == ';')
                        this._s_b.push(c);
                    else if (c < '@')
                        this._s_q = (this._s_q ? -1 : c == '?' ? 1 : c);
                    else {
                        this._s_no = 0;
                        var _s = this._s_b.join('');
                        switch (c) {
                        case 'F':
                            this._c_col = 0;
                        case 'A':   // up n lines
                            this._c_row -= parseInt(_s) || 1;
                            if (this._c_row < 0)
                                this._c_row = 0;
                            break;
                        case 'E':
                            this._c_col = 0;
                        case 'e':
                        case 'B':   // down n lines
                            this._c_row += parseInt(_s) || 1;
                            if (this._c_row >= this._row)
                                this._c_row = this._row - 1;
                            break;
                        case 'a':
                        case 'C':   // move right n cols
                            this._c_col += parseInt(_s) || 1;
                            if (this._c_col >= this._col)
                                this._c_col = this._col - 1;
                            break;
                        case 'D':   // move left n cols
                            this._c_col -= parseInt(_s) || 1;
                            if (this._c_col < 0)
                                this._c_col = 0;
                            break;
                        case 'G':
                        case '`':   // horizontal pos n
                            _s = parseInt(_s) || 1;
                            if (_s < 1)
                                _s = 1;
                            else if (_s > this._col)
                                _s = this._col;
                            this._c_col = _s - 1;
                            break;
                        case 'd':   // vertical pos n
                            _s = parseInt(_s) || 1;
                            if (_s < 1)
                                _s = 1;
                            else if (_s > this._row)
                                _s = this._row;
                            this._c_row = _s - 1;
                            break;
                        case 'f':
                        case 'H':   // cursor pos
                            _s = (_s + ';').split(';')
                            var r = parseInt(_s[0]) || 1;
                            var c = parseInt(_s[1]) || 1;
                            if (r < 1)
                                r = 1;
                            else if (r > this._row)
                                r = this._row;
                            if (c < 1)
                                c = 1;
                            else if (c > this._col)
                                c = this._col;
                            this._c_row = r - 1;
                            this._c_col = c - 1;
                            break;
                        case 'J':   // clear sceen
                            switch (parseInt(_s) || 0) {
                            case 0:
                                this.disp_clear(0, 0, 1);
                                break;
                            case 1:
                                this.disp_clear(0, 1, 0);
                                break;
                            case 2:
                                this.disp_clear(0, 1, 1);
                                break;
                            }
                            break;
                        case 'K':   // kill line
                            switch (parseInt(_s) || 0) {
                            case 0:
                                this.disp_clear(1, 0, 1);
                                break;
                            case 1:
                                this.disp_clear(1, 1, 0);
                                break;
                            case 2:
                                this.disp_clear(1, 1, 1);
                                break;
                            }
                            break;
                        case 'L':   // insert lines
                            this.cur_scroll(-(parseInt(_s) || 1), this._c_row)
                            break;
                        case 'M':   // delete lines
                            this.cur_scroll(parseInt(_s) || 1, this._c_row)
                            break;
                        case '@':   // insert chars
                            this.cur_ins(parseInt(_s) || 1);
                            break;
                        case 'P':   // delete chars
                            this.cur_del(parseInt(_s) || 1);
                            break;
                        case 'c':   // terminal type query
                        case 'n':   // cursor pos query
                            break;
                        case 'm':
                            _s = _s.split(';')
                            for (var a = 0; a < _s.length; ++a) {
                                i = parseInt(_s[a]) || 0;
                                switch (i) {
                                case 0:
                                    this.disp_init();
                                    break;
                                case 1:
                                    this.set_attr('bo', true);
                                    break;
                                case 21:
                                case 4:
                                    this.set_attr('ul', true);
                                    break;
                                case 5:
                                    this.set_attr('bl', true);
                                    break;
                                case 7:
                                    this.set_attr('bf', true);
                                    break;
                                case 22:
                                    this.set_attr('bo', false);
                                    break;
                                case 24:
                                    this.set_attr('ul', false);
                                    break;
                                case 25:
                                    this.set_attr('bl', false);
                                    break;
                                case 27:
                                    this.set_attr('bf', false);
                                    break;
                                case 30:
                                case 31:
                                case 32:
                                case 33:
                                case 34:
                                case 35:
                                case 36:
                                case 37:
                                case 39:
                                    this._d_cfg = this.__ct[i - 30];
                                    break;
                                case 40:
                                case 41:
                                case 42:
                                case 43:
                                case 44:
                                case 45:
                                case 46:
                                case 47:
                                case 49:
                                    this._d_cbg = this.__ct[i - 40];
                                    break;
                                }
                            }
                            break;
                        case 's':
                            this.cur_save();
                            break;
                        case 'u':
                            this.cur_restore();
                            break;
                        case 't':
                            break;
                        }
                    }
                    break;
                case 4:
                    this._s_q = 0;
                    switch (c) {
                    case 'P':
                        this._s_no = 6;
                        this._s_b = [];
                        break;
                    case 'R':
                        this._s_no = 0;
                        break;
                    case 'W':
                        this._s_no = 1;
                        this._s_q = 1;
                        break;
                    case '0':
                    case '1':
                    case '2':
                    case '3':
                    case '4':
                    case '5':
                    case '6':
                    case '7':
                    case '8':
                    case '9':
                        this._s_i *= 10;
                        this._s_i += parseInt(c);
                        break;
                    case 'L':
                        if (this._s_i == 2)
                            this._s_i = 1;
                        break;
                    default:
                        this._s_no = 5;
                        this._s_b = [];
                        break;
                    }
                    break;
                case 5:
                    if (c == '\012' || c == '\015')
                        this._s_no = 0;
                    else if (c == '\x9c' || c == '\007') {
                        this.do_osc();
                        this._s_no = 0;
                    } else if (c == '\033')
                        this._s_no = 7;
                    else
                        this._s_b.push(c);
                    break;
                case 6:
                    var m = (this._s_b.length == 0 ? 21 : 15);
                    var v;
                    if (c >= '0' && c <= '9')
                        v = parseInt(c);
                    else if (i >= 65 && i <= 55 + m)
                        v = i - 55;
                    else if (i >= 97 && i <= 87 + m)
                        v = i - 87;
                    else {
                        this._s_no = 0;
                        break;
                    }
                    this._s_b.push(String.fromCharCode(v));
                    if (this._s_b.length >= 7) {
                        ;
                        this._s_no = 0;
                    }
                    break;
                }
            }
        }
        this.cur_show();
    },
    do_osc: function ()
    {
        if (this._s_q) {
            this._s_b = [];
            return;
        }
        switch (this._s_i) {
        case 0:
        case 2:
        case 21:
            this.set_title(this._s_b.join(''));
            break;
        }
    }
};
TERM.fn.init.prototype = TERM.fn;

//----------------------------------------------------------------------------
    }
) ();
//----------------------------------------------------------------------------
// THE END
//----------------------------------------------------------------------------
