
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function to_number(value) {
        return value === '' ? null : +value;
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.44.3' }, detail), true));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    let huizhouData = [
      {
        year: 1978,
        data: {
          name: "root",
          children: [
            {
              name: "Huiyang Prefecture",
              children: [
                { divisionID: 11, name: "Baoan", status: "County" },
                { divisionID: 9, name: "Dongguan", status: "County" },
                { divisionID: 1, name: "Huizhou", status: "countyLevelCity" },
                { divisionID: 2, name: "Huiyang", status: "County" },
                { divisionID: 3, name: "Boluo", status: "County" },
                { divisionID: 10, name: "Huidong", status: "County" },
                { divisionID: 4, name: "Heyuan", status: "County" },
                { divisionID: 5, name: "Lianping", status: "County" },
                { divisionID: 6, name: "Heping", status: "County" },
                { divisionID: 7, name: "Longchuan", status: "County" },
                { divisionID: 8, name: "Zijin", status: "County" },
              ],
            },
          ],
        },
      },
      {
        year: 1979,
        data: {
          name: "root",
          children: [
            {
              name: "Shenzen",
              status: "Prefecture-level city",
              children: [
                {
                  divisionID: 11,
                  name: "Shenzen",
                  status: "prefectureLevelCity",
                },
              ],
            },
            {
              name: "Huiyang Prefecture",
              status: "Prefecture",
              children: [
                { divisionID: 9, name: "Dongguan", status: "County" },
                { divisionID: 1, name: "Huizhou", status: "countyLevelCity" },
                { divisionID: 2, name: "Huiyang", status: "County" },
                { divisionID: 3, name: "Boluo", status: "County" },
                { divisionID: 10, name: "Huidong", status: "County" },
                { divisionID: 4, name: "Heyuan", status: "County" },
                { divisionID: 5, name: "Lianping", status: "County" },
                { divisionID: 6, name: "Heping", status: "County" },
                { divisionID: 7, name: "Longchuan", status: "County" },
                { divisionID: 8, name: "Zijin", status: "County" },
              ],
            },
          ],
        },
      },
      {
        year: 1983,
        data: {
          name: "root",
          children: [
            {
              name: "Shenzen",
              status: "Prefecture-level city",
              children: [
                {
                  divisionID: 11,
                  name: "Shenzen",
                  status: "prefectureLevelCity",
                },
              ],
            },
            {
              name: "Huiyang Prefecture",
              status: "Prefecture",
              children: [
                { divisionID: 9, name: "Dongguan", status: "County" },
                { divisionID: 1, name: "Huizhou", status: "countyLevelCity" },
                { divisionID: 2, name: "Huiyang", status: "County" },
                { divisionID: 3, name: "Boluo", status: "County" },
                { divisionID: 10, name: "Huidong", status: "County" },
                { divisionID: 4, name: "Heyuan", status: "County" },
                { divisionID: 5, name: "Lianping", status: "County" },
                { divisionID: 6, name: "Heping", status: "County" },
                { divisionID: 7, name: "Longchuan", status: "County" },
                { divisionID: 8, name: "Zijin", status: "County" },
                { divisionID: 12, name: "Haifeng", status: "County" },
                { divisionID: 13, name: "Lufeng", status: "County" },
              ],
            },
          ],
        },
      },
      {
        year: 1985,
        data: {
          name: "root",
          children: [
            {
              name: "Shenzen",
              status: "Prefecture-level city",
              children: [
                {
                  divisionID: 11,
                  name: "Shenzen",
                  status: "prefectureLevelCity",
                },
              ],
            },
            {
              name: "Huiyang Prefecture",
              status: "Prefecture",
              children: [
                { divisionID: 9, name: "Dongguan", status: "countyLevelCity" },
                { divisionID: 1, name: "Huizhou", status: "countyLevelCity" },
                { divisionID: 2, name: "Huiyang", status: "County" },
                { divisionID: 3, name: "Boluo", status: "County" },
                { divisionID: 10, name: "Huidong", status: "County" },
                { divisionID: 4, name: "Heyuan", status: "County" },
                { divisionID: 5, name: "Lianping", status: "County" },
                { divisionID: 6, name: "Heping", status: "County" },
                { divisionID: 7, name: "Longchuan", status: "County" },
                { divisionID: 8, name: "Zijin", status: "County" },
                { divisionID: 12, name: "Haifeng", status: "County" },
                { divisionID: 13, name: "Lufeng", status: "County" },
              ],
            },
          ],
        },
      },
      {
        year: 1988,
        data: {
          name: "root",
          children: [
            {
              name: "Shenzen",
              status: "Prefecture-level city",
              children: [
                {
                  divisionID: 11,
                  name: "Shenzen",
                  status: "prefectureLevelCity",
                },
              ],
            },
            {
              name: "Dongguan",
              status: "Prefecture-level city",
              children: [
                { divisionID: 9, name: "Dongguan", status: "prefectureLevelCity" },
              ],
            },
            {
              name: "Huiyang Prefecture",
              status: "Prefecture-level city",
              children: [
                { divisionID: 1, name: "Huicheng", status: "district" },
                { divisionID: 2, name: "Huiyang", status: "County" },
                { divisionID: 3, name: "Boluo", status: "County" },
                { divisionID: 10, name: "Huidong", status: "County" },
                { divisionID: 14, name: "Longmen", status: "County" },
              ],
            },
            {
              name: "Heyuan",
              status: "Prefecture-level city",
              children: [
                { divisionID: 15, name: "Yuancheng", status: "district" },
                { divisionID: 16, name: "Jiao", status: "district" },
              ],
            },
            {
              name: "Undetermined",
              status: "Undetermined",
              children: [
                { divisionID: 5, name: "Lianping", status: "County" },
                { divisionID: 6, name: "Heping", status: "County" },
                { divisionID: 7, name: "Longchuan", status: "County" },
                { divisionID: 8, name: "Zijin", status: "County" },
                { divisionID: 12, name: "Haifeng", status: "County" },
                { divisionID: 13, name: "Lufeng", status: "County" },
              ],
            },
          ],
        },
      },
      {
        year: 1994,
        data: {
          name: "root",
          children: [
            {
              name: "Shenzen",
              status: "Prefecture-level city",
              children: [
                {
                  divisionID: 11,
                  name: "Shenzen",
                  status: "prefectureLevelCity",
                },
              ],
            },
            {
              name: "Dongguan",
              status: "Prefecture-level city",
              children: [
                { divisionID: 9, name: "Dongguan", status: "prefectureLevelCity" },
              ],
            },
            {
              name: "Huiyang Prefecture",
              status: "Prefecture-level city",
              children: [
                { divisionID: 1, name: "Huicheng", status: "district" },
                { divisionID: 2, name: "Huiyang", status: "countyLevelCity" },
                { divisionID: 3, name: "Boluo", status: "County" },
                { divisionID: 10, name: "Huidong", status: "County" },
                { divisionID: 14, name: "Longmen", status: "County" },
              ],
            },
            {
              name: "Heyuan",
              status: "Prefecture-level city",
              children: [
                { divisionID: 15, name: "Yuancheng", status: "district" },
                { divisionID: 16, name: "Dongyuan", status: "district" },
              ],
            },
            {
              name: "Undetermined",
              status: "Undetermined",
              children: [
                { divisionID: 5, name: "Lianping", status: "County" },
                { divisionID: 6, name: "Heping", status: "County" },
                { divisionID: 7, name: "Longchuan", status: "County" },
                { divisionID: 8, name: "Zijin", status: "County" },
                { divisionID: 12, name: "Haifeng", status: "County" },
                { divisionID: 13, name: "Lufeng", status: "County" },
              ],
            },
          ],
        },
      },
      {
        year: 2003,
        data: {
          name: "root",
          children: [
            {
              name: "Shenzen",
              status: "Prefecture-level city",
              children: [
                {
                  divisionID: 11,
                  name: "Shenzen",
                  status: "prefectureLevelCity",
                },
              ],
            },
            {
              name: "Dongguan",
              status: "Prefecture-level city",
              children: [
                { divisionID: 9, name: "Dongguan", status: "prefectureLevelCity" },
              ],
            },
            {
              name: "Huiyang Prefecture",
              status: "Prefecture-level city",
              children: [
                { divisionID: 1, name: "Huicheng", status: "district" },
                { divisionID: 2, name: "Huiyang", status: "district" },
                { divisionID: 3, name: "Boluo", status: "County" },
                { divisionID: 10, name: "Huidong", status: "County" },
                { divisionID: 14, name: "Longmen", status: "County" },
              ],
            },
            {
              name: "Heyuan",
              status: "Prefecture-level city",
              children: [
                { divisionID: 15, name: "Yuancheng", status: "district" },
                { divisionID: 16, name: "Dongyuan", status: "district" },
              ],
            },
            {
              name: "Undetermined",
              status: "Undetermined",
              children: [
                { divisionID: 5, name: "Lianping", status: "County" },
                { divisionID: 6, name: "Heping", status: "County" },
                { divisionID: 7, name: "Longchuan", status: "County" },
                { divisionID: 8, name: "Zijin", status: "County" },
                { divisionID: 12, name: "Haifeng", status: "County" },
                { divisionID: 13, name: "Lufeng", status: "County" },
              ],
            },
          ],
        },
      },
    ];

    let kunmingData = [
        {
          year: 1978,
          data: {
            name: "root",
            children: [
              {
                name: "Kunming Prefecture-level City",
                children: [
                  { divisionID: 1, name: "Panlong", status: "district" },
                  { divisionID: 2, name: "Wuhua", status: "district" },
                  { divisionID: 3, name: "Guandu", status: "district" },
                  { divisionID: 4, name: "Xishan", status: "district" },
                  { divisionID: 5, name: "Chenggong", status: "County" },
                  { divisionID: 6, name: "Jinning", status: "County" },
                  { divisionID: 7, name: "Anning", status: "County" },
                  { divisionID: 8, name: "Fumin", status: "County" },
                ],
              },
            ],
          },
        },
        {
          year: 1983,
          data: {
            name: "root",
            children: [
                {
                  name: "Kunming Prefecture-level City",
                  children: [
                    { divisionID: 1, name: "Panlong", status: "district" },
                    { divisionID: 2, name: "Wuhua", status: "district" },
                    { divisionID: 3, name: "Guandu", status: "district" },
                    { divisionID: 4, name: "Xishan", status: "district" },
                    { divisionID: 5, name: "Chenggong", status: "County" },
                    { divisionID: 6, name: "Jinning", status: "County" },
                    { divisionID: 7, name: "Anning", status: "County" },
                    { divisionID: 8, name: "Fumin", status: "County" },
                    { divisionID: 9, name: "Yiliang", status: "County" },
                    { divisionID: 10, name: "Songming", status: "County" },
                    { divisionID: 11, name: "Luquan", status: "County" },
                    { divisionID: 12, name: "Lunan Yizu", status: "AutonomousCounty" },
                  ],
                },
              ],
          },
        },
        {
          year: 1985,
          data: {
            name: "root",
            children: [
                {
                  name: "Kunming Prefecture-level City",
                  children: [
                    { divisionID: 1, name: "Panlong", status: "district" },
                    { divisionID: 2, name: "Wuhua", status: "district" },
                    { divisionID: 3, name: "Guandu", status: "district" },
                    { divisionID: 4, name: "Xishan", status: "district" },
                    { divisionID: 5, name: "Chenggong", status: "County" },
                    { divisionID: 6, name: "Jinning", status: "County" },
                    { divisionID: 7, name: "Anning", status: "County" },
                    { divisionID: 8, name: "Fumin", status: "County" },
                    { divisionID: 9, name: "Yiliang", status: "County" },
                    { divisionID: 10, name: "Songming", status: "County" },
                    { divisionID: 11, name: "Luquan Yizu Miaozu", status: "AutonomousCounty" },
                    { divisionID: 12, name: "Lunan Yizu", status: "AutonomousCounty" },
                  ],
                },
              ],
          },
        },
        {
          year: 1995,
          data: {
            name: "root",
            children: [
                {
                  name: "Kunming Prefecture-level City",
                  children: [
                    { divisionID: 1, name: "Panlong", status: "district" },
                    { divisionID: 2, name: "Wuhua", status: "district" },
                    { divisionID: 3, name: "Guandu", status: "district" },
                    { divisionID: 4, name: "Xishan", status: "district" },
                    { divisionID: 5, name: "Chenggong", status: "County" },
                    { divisionID: 6, name: "Jinning", status: "County" },
                    { divisionID: 7, name: "Anning", status: "countyLevelCity" },
                    { divisionID: 8, name: "Fumin", status: "County" },
                    { divisionID: 9, name: "Yiliang", status: "County" },
                    { divisionID: 10, name: "Songming", status: "County" },
                    { divisionID: 11, name: "Luquan Yizu Miaozu", status: "AutonomousCounty" },
                    { divisionID: 12, name: "Lunan Yizu", status: "AutonomousCounty" },
                  ],
                },
              ],
          },
        },
        {
          year: 1998,
          data: {
            name: "root",
            children: [
                {
                  name: "Kunming Prefecture-level City",
                  children: [
                    { divisionID: 1, name: "Panlong", status: "district" },
                    { divisionID: 2, name: "Wuhua", status: "district" },
                    { divisionID: 3, name: "Guandu", status: "district" },
                    { divisionID: 4, name: "Xishan", status: "district" },
                    { divisionID: 5, name: "Chenggong", status: "County" },
                    { divisionID: 6, name: "Jinning", status: "County" },
                    { divisionID: 7, name: "Anning", status: "countyLevelCity" },
                    { divisionID: 8, name: "Fumin", status: "County" },
                    { divisionID: 9, name: "Yiliang", status: "County" },
                    { divisionID: 10, name: "Songming", status: "County" },
                    { divisionID: 11, name: "Luquan Yizu Miaozu", status: "AutonomousCounty" },
                    { divisionID: 12, name: "Lunan Yizu", status: "AutonomousCounty" },
                    { divisionID: 13, name: "Dongchuan", status: "district" },
                    { divisionID: 14, name: "Xundian Yizu Huizi", status: "AutonomousCounty" },
                  ],
                },
              ],
          },
        },
        {
          year: 2004,
          data: {
            name: "root",
            children: [
                {
                  name: "Kunming Prefecture-level City",
                  children: [
                    { divisionID: 1, name: "Panlong", status: "district" },
                    { divisionID: 2, name: "Wuhua", status: "district" },
                    { divisionID: 3, name: "Guandu", status: "district" },
                    { divisionID: 4, name: "Xishan", status: "district" },
                    { divisionID: 5, name: "Chenggong", status: "County" },
                    { divisionID: 6, name: "Jinning", status: "County" },
                    { divisionID: 7, name: "Anning", status: "countyLevelCity" },
                    { divisionID: 8, name: "Fumin", status: "County" },
                    { divisionID: 9, name: "Yiliang", status: "County" },
                    { divisionID: 10, name: "Songming", status: "County" },
                    { divisionID: 11, name: "Luquan Yizu Miaozu", status: "AutonomousCounty" },
                    { divisionID: 12, name: "Lunan Yizu", status: "AutonomousCounty" },
                    { divisionID: 13, name: "Dongchuan", status: "district" },
                    { divisionID: 14, name: "Xundian Yizu Huizi", status: "AutonomousCounty" },
                  ],
                },
              ],
          },
        },
        {
          year: 2011,
          data: {
            name: "root",
            children: [
                {
                  name: "Kunming Prefecture-level City",
                  children: [
                    { divisionID: 1, name: "Panlong", status: "district" },
                    { divisionID: 2, name: "Wuhua", status: "district" },
                    { divisionID: 3, name: "Guandu", status: "district" },
                    { divisionID: 4, name: "Xishan", status: "district" },
                    { divisionID: 5, name: "Chenggong", status: "district" },
                    { divisionID: 6, name: "Jinning", status: "County" },
                    { divisionID: 7, name: "Anning", status: "countyLevelCity" },
                    { divisionID: 8, name: "Fumin", status: "County" },
                    { divisionID: 9, name: "Yiliang", status: "County" },
                    { divisionID: 10, name: "Songming", status: "County" },
                    { divisionID: 11, name: "Luquan Yizu Miaozu", status: "AutonomousCounty" },
                    { divisionID: 12, name: "Lunan Yizu", status: "AutonomousCounty" },
                    { divisionID: 13, name: "Dongchuan", status: "district" },
                    { divisionID: 14, name: "Xundian Yizu Huizi", status: "AutonomousCounty" },
                  ],
                },
              ],
          },
        },
        {
            year: 2016,
            data: {
              name: "root",
              children: [
                  {
                    name: "Kunming Prefecture-level City",
                    children: [
                      { divisionID: 1, name: "Panlong", status: "district" },
                      { divisionID: 2, name: "Wuhua", status: "district" },
                      { divisionID: 3, name: "Guandu", status: "district" },
                      { divisionID: 4, name: "Xishan", status: "district" },
                      { divisionID: 5, name: "Chenggong", status: "district" },
                      { divisionID: 6, name: "Jinning", status: "district" },
                      { divisionID: 7, name: "Anning", status: "countyLevelCity" },
                      { divisionID: 8, name: "Fumin", status: "County" },
                      { divisionID: 9, name: "Yiliang", status: "County" },
                      { divisionID: 10, name: "Songming", status: "County" },
                      { divisionID: 11, name: "Luquan Yizu Miaozu", status: "AutonomousCounty" },
                      { divisionID: 12, name: "Lunan Yizu", status: "AutonomousCounty" },
                      { divisionID: 13, name: "Dongchuan", status: "district" },
                      { divisionID: 14, name: "Xundian Yizu Huizi", status: "AutonomousCounty" },
                    ],
                  },
                ],
            },
          },
          {
            year: 2017,
            data: {
              name: "root",
              children: [
                  {
                    name: "Kunming Prefecture-level City",
                    children: [
                      { divisionID: 1, name: "Panlong", status: "district" },
                      { divisionID: 2, name: "Wuhua", status: "district" },
                      { divisionID: 3, name: "Guandu", status: "district" },
                      { divisionID: 4, name: "Xishan", status: "district" },
                      { divisionID: 5, name: "Chenggong", status: "district" },
                      { divisionID: 6, name: "Jinning", status: "district" },
                      { divisionID: 7, name: "Anning", status: "countyLevelCity" },
                      { divisionID: 8, name: "Fumin", status: "County" },
                      { divisionID: 9, name: "Yiliang", status: "County" },
                      { divisionID: 10, name: "Songming", status: "County" },
                      { divisionID: 11, name: "Luquan Yizu Miaozu", status: "AutonomousCounty" },
                      { divisionID: 12, name: "Lunan Yizu", status: "AutonomousCounty" },
                      { divisionID: 13, name: "Dongchuan", status: "district" },
                      { divisionID: 14, name: "Xundian Yizu Huizi", status: "AutonomousCounty" },
                    ],
                  },
                ],
            },
          },
      ];

    function count(node) {
      var sum = 0,
          children = node.children,
          i = children && children.length;
      if (!i) sum = 1;
      else while (--i >= 0) sum += children[i].value;
      node.value = sum;
    }

    function node_count() {
      return this.eachAfter(count);
    }

    function node_each(callback, that) {
      let index = -1;
      for (const node of this) {
        callback.call(that, node, ++index, this);
      }
      return this;
    }

    function node_eachBefore(callback, that) {
      var node = this, nodes = [node], children, i, index = -1;
      while (node = nodes.pop()) {
        callback.call(that, node, ++index, this);
        if (children = node.children) {
          for (i = children.length - 1; i >= 0; --i) {
            nodes.push(children[i]);
          }
        }
      }
      return this;
    }

    function node_eachAfter(callback, that) {
      var node = this, nodes = [node], next = [], children, i, n, index = -1;
      while (node = nodes.pop()) {
        next.push(node);
        if (children = node.children) {
          for (i = 0, n = children.length; i < n; ++i) {
            nodes.push(children[i]);
          }
        }
      }
      while (node = next.pop()) {
        callback.call(that, node, ++index, this);
      }
      return this;
    }

    function node_find(callback, that) {
      let index = -1;
      for (const node of this) {
        if (callback.call(that, node, ++index, this)) {
          return node;
        }
      }
    }

    function node_sum(value) {
      return this.eachAfter(function(node) {
        var sum = +value(node.data) || 0,
            children = node.children,
            i = children && children.length;
        while (--i >= 0) sum += children[i].value;
        node.value = sum;
      });
    }

    function node_sort(compare) {
      return this.eachBefore(function(node) {
        if (node.children) {
          node.children.sort(compare);
        }
      });
    }

    function node_path(end) {
      var start = this,
          ancestor = leastCommonAncestor(start, end),
          nodes = [start];
      while (start !== ancestor) {
        start = start.parent;
        nodes.push(start);
      }
      var k = nodes.length;
      while (end !== ancestor) {
        nodes.splice(k, 0, end);
        end = end.parent;
      }
      return nodes;
    }

    function leastCommonAncestor(a, b) {
      if (a === b) return a;
      var aNodes = a.ancestors(),
          bNodes = b.ancestors(),
          c = null;
      a = aNodes.pop();
      b = bNodes.pop();
      while (a === b) {
        c = a;
        a = aNodes.pop();
        b = bNodes.pop();
      }
      return c;
    }

    function node_ancestors() {
      var node = this, nodes = [node];
      while (node = node.parent) {
        nodes.push(node);
      }
      return nodes;
    }

    function node_descendants() {
      return Array.from(this);
    }

    function node_leaves() {
      var leaves = [];
      this.eachBefore(function(node) {
        if (!node.children) {
          leaves.push(node);
        }
      });
      return leaves;
    }

    function node_links() {
      var root = this, links = [];
      root.each(function(node) {
        if (node !== root) { // Don???t include the root???s parent, if any.
          links.push({source: node.parent, target: node});
        }
      });
      return links;
    }

    function* node_iterator() {
      var node = this, current, next = [node], children, i, n;
      do {
        current = next.reverse(), next = [];
        while (node = current.pop()) {
          yield node;
          if (children = node.children) {
            for (i = 0, n = children.length; i < n; ++i) {
              next.push(children[i]);
            }
          }
        }
      } while (next.length);
    }

    function hierarchy(data, children) {
      if (data instanceof Map) {
        data = [undefined, data];
        if (children === undefined) children = mapChildren;
      } else if (children === undefined) {
        children = objectChildren;
      }

      var root = new Node(data),
          node,
          nodes = [root],
          child,
          childs,
          i,
          n;

      while (node = nodes.pop()) {
        if ((childs = children(node.data)) && (n = (childs = Array.from(childs)).length)) {
          node.children = childs;
          for (i = n - 1; i >= 0; --i) {
            nodes.push(child = childs[i] = new Node(childs[i]));
            child.parent = node;
            child.depth = node.depth + 1;
          }
        }
      }

      return root.eachBefore(computeHeight);
    }

    function node_copy() {
      return hierarchy(this).eachBefore(copyData);
    }

    function objectChildren(d) {
      return d.children;
    }

    function mapChildren(d) {
      return Array.isArray(d) ? d[1] : null;
    }

    function copyData(node) {
      if (node.data.value !== undefined) node.value = node.data.value;
      node.data = node.data.data;
    }

    function computeHeight(node) {
      var height = 0;
      do node.height = height;
      while ((node = node.parent) && (node.height < ++height));
    }

    function Node(data) {
      this.data = data;
      this.depth =
      this.height = 0;
      this.parent = null;
    }

    Node.prototype = hierarchy.prototype = {
      constructor: Node,
      count: node_count,
      each: node_each,
      eachAfter: node_eachAfter,
      eachBefore: node_eachBefore,
      find: node_find,
      sum: node_sum,
      sort: node_sort,
      path: node_path,
      ancestors: node_ancestors,
      descendants: node_descendants,
      leaves: node_leaves,
      links: node_links,
      copy: node_copy,
      [Symbol.iterator]: node_iterator
    };

    function ascending(a, b) {
      return a == null || b == null ? NaN : a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
    }

    function bisector(f) {
      let delta = f;
      let compare1 = f;
      let compare2 = f;

      if (f.length !== 2) {
        delta = (d, x) => f(d) - x;
        compare1 = ascending;
        compare2 = (d, x) => ascending(f(d), x);
      }

      function left(a, x, lo = 0, hi = a.length) {
        if (lo < hi) {
          if (compare1(x, x) !== 0) return hi;
          do {
            const mid = (lo + hi) >>> 1;
            if (compare2(a[mid], x) < 0) lo = mid + 1;
            else hi = mid;
          } while (lo < hi);
        }
        return lo;
      }

      function right(a, x, lo = 0, hi = a.length) {
        if (lo < hi) {
          if (compare1(x, x) !== 0) return hi;
          do {
            const mid = (lo + hi) >>> 1;
            if (compare2(a[mid], x) <= 0) lo = mid + 1;
            else hi = mid;
          } while (lo < hi);
        }
        return lo;
      }

      function center(a, x, lo = 0, hi = a.length) {
        const i = left(a, x, lo, hi - 1);
        return i > lo && delta(a[i - 1], x) > -delta(a[i], x) ? i - 1 : i;
      }

      return {left, center, right};
    }

    function number$1(x) {
      return x === null ? NaN : +x;
    }

    const ascendingBisect = bisector(ascending);
    const bisectRight = ascendingBisect.right;
    bisector(number$1).center;
    var bisect = bisectRight;

    function extent(values, valueof) {
      let min;
      let max;
      if (valueof === undefined) {
        for (const value of values) {
          if (value != null) {
            if (min === undefined) {
              if (value >= value) min = max = value;
            } else {
              if (min > value) min = value;
              if (max < value) max = value;
            }
          }
        }
      } else {
        let index = -1;
        for (let value of values) {
          if ((value = valueof(value, ++index, values)) != null) {
            if (min === undefined) {
              if (value >= value) min = max = value;
            } else {
              if (min > value) min = value;
              if (max < value) max = value;
            }
          }
        }
      }
      return [min, max];
    }

    class InternMap extends Map {
      constructor(entries, key = keyof) {
        super();
        Object.defineProperties(this, {_intern: {value: new Map()}, _key: {value: key}});
        if (entries != null) for (const [key, value] of entries) this.set(key, value);
      }
      get(key) {
        return super.get(intern_get(this, key));
      }
      has(key) {
        return super.has(intern_get(this, key));
      }
      set(key, value) {
        return super.set(intern_set(this, key), value);
      }
      delete(key) {
        return super.delete(intern_delete(this, key));
      }
    }

    function intern_get({_intern, _key}, value) {
      const key = _key(value);
      return _intern.has(key) ? _intern.get(key) : value;
    }

    function intern_set({_intern, _key}, value) {
      const key = _key(value);
      if (_intern.has(key)) return _intern.get(key);
      _intern.set(key, value);
      return value;
    }

    function intern_delete({_intern, _key}, value) {
      const key = _key(value);
      if (_intern.has(key)) {
        value = _intern.get(key);
        _intern.delete(key);
      }
      return value;
    }

    function keyof(value) {
      return value !== null && typeof value === "object" ? value.valueOf() : value;
    }

    var e10 = Math.sqrt(50),
        e5 = Math.sqrt(10),
        e2 = Math.sqrt(2);

    function ticks(start, stop, count) {
      var reverse,
          i = -1,
          n,
          ticks,
          step;

      stop = +stop, start = +start, count = +count;
      if (start === stop && count > 0) return [start];
      if (reverse = stop < start) n = start, start = stop, stop = n;
      if ((step = tickIncrement(start, stop, count)) === 0 || !isFinite(step)) return [];

      if (step > 0) {
        let r0 = Math.round(start / step), r1 = Math.round(stop / step);
        if (r0 * step < start) ++r0;
        if (r1 * step > stop) --r1;
        ticks = new Array(n = r1 - r0 + 1);
        while (++i < n) ticks[i] = (r0 + i) * step;
      } else {
        step = -step;
        let r0 = Math.round(start * step), r1 = Math.round(stop * step);
        if (r0 / step < start) ++r0;
        if (r1 / step > stop) --r1;
        ticks = new Array(n = r1 - r0 + 1);
        while (++i < n) ticks[i] = (r0 + i) / step;
      }

      if (reverse) ticks.reverse();

      return ticks;
    }

    function tickIncrement(start, stop, count) {
      var step = (stop - start) / Math.max(0, count),
          power = Math.floor(Math.log(step) / Math.LN10),
          error = step / Math.pow(10, power);
      return power >= 0
          ? (error >= e10 ? 10 : error >= e5 ? 5 : error >= e2 ? 2 : 1) * Math.pow(10, power)
          : -Math.pow(10, -power) / (error >= e10 ? 10 : error >= e5 ? 5 : error >= e2 ? 2 : 1);
    }

    function tickStep(start, stop, count) {
      var step0 = Math.abs(stop - start) / Math.max(0, count),
          step1 = Math.pow(10, Math.floor(Math.log(step0) / Math.LN10)),
          error = step0 / step1;
      if (error >= e10) step1 *= 10;
      else if (error >= e5) step1 *= 5;
      else if (error >= e2) step1 *= 2;
      return stop < start ? -step1 : step1;
    }

    function range(start, stop, step) {
      start = +start, stop = +stop, step = (n = arguments.length) < 2 ? (stop = start, start = 0, 1) : n < 3 ? 1 : +step;

      var i = -1,
          n = Math.max(0, Math.ceil((stop - start) / step)) | 0,
          range = new Array(n);

      while (++i < n) {
        range[i] = start + i * step;
      }

      return range;
    }

    function initRange(domain, range) {
      switch (arguments.length) {
        case 0: break;
        case 1: this.range(domain); break;
        default: this.range(range).domain(domain); break;
      }
      return this;
    }

    const implicit = Symbol("implicit");

    function ordinal() {
      var index = new InternMap(),
          domain = [],
          range = [],
          unknown = implicit;

      function scale(d) {
        let i = index.get(d);
        if (i === undefined) {
          if (unknown !== implicit) return unknown;
          index.set(d, i = domain.push(d) - 1);
        }
        return range[i % range.length];
      }

      scale.domain = function(_) {
        if (!arguments.length) return domain.slice();
        domain = [], index = new InternMap();
        for (const value of _) {
          if (index.has(value)) continue;
          index.set(value, domain.push(value) - 1);
        }
        return scale;
      };

      scale.range = function(_) {
        return arguments.length ? (range = Array.from(_), scale) : range.slice();
      };

      scale.unknown = function(_) {
        return arguments.length ? (unknown = _, scale) : unknown;
      };

      scale.copy = function() {
        return ordinal(domain, range).unknown(unknown);
      };

      initRange.apply(scale, arguments);

      return scale;
    }

    function band() {
      var scale = ordinal().unknown(undefined),
          domain = scale.domain,
          ordinalRange = scale.range,
          r0 = 0,
          r1 = 1,
          step,
          bandwidth,
          round = false,
          paddingInner = 0,
          paddingOuter = 0,
          align = 0.5;

      delete scale.unknown;

      function rescale() {
        var n = domain().length,
            reverse = r1 < r0,
            start = reverse ? r1 : r0,
            stop = reverse ? r0 : r1;
        step = (stop - start) / Math.max(1, n - paddingInner + paddingOuter * 2);
        if (round) step = Math.floor(step);
        start += (stop - start - step * (n - paddingInner)) * align;
        bandwidth = step * (1 - paddingInner);
        if (round) start = Math.round(start), bandwidth = Math.round(bandwidth);
        var values = range(n).map(function(i) { return start + step * i; });
        return ordinalRange(reverse ? values.reverse() : values);
      }

      scale.domain = function(_) {
        return arguments.length ? (domain(_), rescale()) : domain();
      };

      scale.range = function(_) {
        return arguments.length ? ([r0, r1] = _, r0 = +r0, r1 = +r1, rescale()) : [r0, r1];
      };

      scale.rangeRound = function(_) {
        return [r0, r1] = _, r0 = +r0, r1 = +r1, round = true, rescale();
      };

      scale.bandwidth = function() {
        return bandwidth;
      };

      scale.step = function() {
        return step;
      };

      scale.round = function(_) {
        return arguments.length ? (round = !!_, rescale()) : round;
      };

      scale.padding = function(_) {
        return arguments.length ? (paddingInner = Math.min(1, paddingOuter = +_), rescale()) : paddingInner;
      };

      scale.paddingInner = function(_) {
        return arguments.length ? (paddingInner = Math.min(1, _), rescale()) : paddingInner;
      };

      scale.paddingOuter = function(_) {
        return arguments.length ? (paddingOuter = +_, rescale()) : paddingOuter;
      };

      scale.align = function(_) {
        return arguments.length ? (align = Math.max(0, Math.min(1, _)), rescale()) : align;
      };

      scale.copy = function() {
        return band(domain(), [r0, r1])
            .round(round)
            .paddingInner(paddingInner)
            .paddingOuter(paddingOuter)
            .align(align);
      };

      return initRange.apply(rescale(), arguments);
    }

    function pointish(scale) {
      var copy = scale.copy;

      scale.padding = scale.paddingOuter;
      delete scale.paddingInner;
      delete scale.paddingOuter;

      scale.copy = function() {
        return pointish(copy());
      };

      return scale;
    }

    function point() {
      return pointish(band.apply(null, arguments).paddingInner(1));
    }

    function define(constructor, factory, prototype) {
      constructor.prototype = factory.prototype = prototype;
      prototype.constructor = constructor;
    }

    function extend(parent, definition) {
      var prototype = Object.create(parent.prototype);
      for (var key in definition) prototype[key] = definition[key];
      return prototype;
    }

    function Color() {}

    var darker = 0.7;
    var brighter = 1 / darker;

    var reI = "\\s*([+-]?\\d+)\\s*",
        reN = "\\s*([+-]?\\d*\\.?\\d+(?:[eE][+-]?\\d+)?)\\s*",
        reP = "\\s*([+-]?\\d*\\.?\\d+(?:[eE][+-]?\\d+)?)%\\s*",
        reHex = /^#([0-9a-f]{3,8})$/,
        reRgbInteger = new RegExp("^rgb\\(" + [reI, reI, reI] + "\\)$"),
        reRgbPercent = new RegExp("^rgb\\(" + [reP, reP, reP] + "\\)$"),
        reRgbaInteger = new RegExp("^rgba\\(" + [reI, reI, reI, reN] + "\\)$"),
        reRgbaPercent = new RegExp("^rgba\\(" + [reP, reP, reP, reN] + "\\)$"),
        reHslPercent = new RegExp("^hsl\\(" + [reN, reP, reP] + "\\)$"),
        reHslaPercent = new RegExp("^hsla\\(" + [reN, reP, reP, reN] + "\\)$");

    var named = {
      aliceblue: 0xf0f8ff,
      antiquewhite: 0xfaebd7,
      aqua: 0x00ffff,
      aquamarine: 0x7fffd4,
      azure: 0xf0ffff,
      beige: 0xf5f5dc,
      bisque: 0xffe4c4,
      black: 0x000000,
      blanchedalmond: 0xffebcd,
      blue: 0x0000ff,
      blueviolet: 0x8a2be2,
      brown: 0xa52a2a,
      burlywood: 0xdeb887,
      cadetblue: 0x5f9ea0,
      chartreuse: 0x7fff00,
      chocolate: 0xd2691e,
      coral: 0xff7f50,
      cornflowerblue: 0x6495ed,
      cornsilk: 0xfff8dc,
      crimson: 0xdc143c,
      cyan: 0x00ffff,
      darkblue: 0x00008b,
      darkcyan: 0x008b8b,
      darkgoldenrod: 0xb8860b,
      darkgray: 0xa9a9a9,
      darkgreen: 0x006400,
      darkgrey: 0xa9a9a9,
      darkkhaki: 0xbdb76b,
      darkmagenta: 0x8b008b,
      darkolivegreen: 0x556b2f,
      darkorange: 0xff8c00,
      darkorchid: 0x9932cc,
      darkred: 0x8b0000,
      darksalmon: 0xe9967a,
      darkseagreen: 0x8fbc8f,
      darkslateblue: 0x483d8b,
      darkslategray: 0x2f4f4f,
      darkslategrey: 0x2f4f4f,
      darkturquoise: 0x00ced1,
      darkviolet: 0x9400d3,
      deeppink: 0xff1493,
      deepskyblue: 0x00bfff,
      dimgray: 0x696969,
      dimgrey: 0x696969,
      dodgerblue: 0x1e90ff,
      firebrick: 0xb22222,
      floralwhite: 0xfffaf0,
      forestgreen: 0x228b22,
      fuchsia: 0xff00ff,
      gainsboro: 0xdcdcdc,
      ghostwhite: 0xf8f8ff,
      gold: 0xffd700,
      goldenrod: 0xdaa520,
      gray: 0x808080,
      green: 0x008000,
      greenyellow: 0xadff2f,
      grey: 0x808080,
      honeydew: 0xf0fff0,
      hotpink: 0xff69b4,
      indianred: 0xcd5c5c,
      indigo: 0x4b0082,
      ivory: 0xfffff0,
      khaki: 0xf0e68c,
      lavender: 0xe6e6fa,
      lavenderblush: 0xfff0f5,
      lawngreen: 0x7cfc00,
      lemonchiffon: 0xfffacd,
      lightblue: 0xadd8e6,
      lightcoral: 0xf08080,
      lightcyan: 0xe0ffff,
      lightgoldenrodyellow: 0xfafad2,
      lightgray: 0xd3d3d3,
      lightgreen: 0x90ee90,
      lightgrey: 0xd3d3d3,
      lightpink: 0xffb6c1,
      lightsalmon: 0xffa07a,
      lightseagreen: 0x20b2aa,
      lightskyblue: 0x87cefa,
      lightslategray: 0x778899,
      lightslategrey: 0x778899,
      lightsteelblue: 0xb0c4de,
      lightyellow: 0xffffe0,
      lime: 0x00ff00,
      limegreen: 0x32cd32,
      linen: 0xfaf0e6,
      magenta: 0xff00ff,
      maroon: 0x800000,
      mediumaquamarine: 0x66cdaa,
      mediumblue: 0x0000cd,
      mediumorchid: 0xba55d3,
      mediumpurple: 0x9370db,
      mediumseagreen: 0x3cb371,
      mediumslateblue: 0x7b68ee,
      mediumspringgreen: 0x00fa9a,
      mediumturquoise: 0x48d1cc,
      mediumvioletred: 0xc71585,
      midnightblue: 0x191970,
      mintcream: 0xf5fffa,
      mistyrose: 0xffe4e1,
      moccasin: 0xffe4b5,
      navajowhite: 0xffdead,
      navy: 0x000080,
      oldlace: 0xfdf5e6,
      olive: 0x808000,
      olivedrab: 0x6b8e23,
      orange: 0xffa500,
      orangered: 0xff4500,
      orchid: 0xda70d6,
      palegoldenrod: 0xeee8aa,
      palegreen: 0x98fb98,
      paleturquoise: 0xafeeee,
      palevioletred: 0xdb7093,
      papayawhip: 0xffefd5,
      peachpuff: 0xffdab9,
      peru: 0xcd853f,
      pink: 0xffc0cb,
      plum: 0xdda0dd,
      powderblue: 0xb0e0e6,
      purple: 0x800080,
      rebeccapurple: 0x663399,
      red: 0xff0000,
      rosybrown: 0xbc8f8f,
      royalblue: 0x4169e1,
      saddlebrown: 0x8b4513,
      salmon: 0xfa8072,
      sandybrown: 0xf4a460,
      seagreen: 0x2e8b57,
      seashell: 0xfff5ee,
      sienna: 0xa0522d,
      silver: 0xc0c0c0,
      skyblue: 0x87ceeb,
      slateblue: 0x6a5acd,
      slategray: 0x708090,
      slategrey: 0x708090,
      snow: 0xfffafa,
      springgreen: 0x00ff7f,
      steelblue: 0x4682b4,
      tan: 0xd2b48c,
      teal: 0x008080,
      thistle: 0xd8bfd8,
      tomato: 0xff6347,
      turquoise: 0x40e0d0,
      violet: 0xee82ee,
      wheat: 0xf5deb3,
      white: 0xffffff,
      whitesmoke: 0xf5f5f5,
      yellow: 0xffff00,
      yellowgreen: 0x9acd32
    };

    define(Color, color, {
      copy: function(channels) {
        return Object.assign(new this.constructor, this, channels);
      },
      displayable: function() {
        return this.rgb().displayable();
      },
      hex: color_formatHex, // Deprecated! Use color.formatHex.
      formatHex: color_formatHex,
      formatHsl: color_formatHsl,
      formatRgb: color_formatRgb,
      toString: color_formatRgb
    });

    function color_formatHex() {
      return this.rgb().formatHex();
    }

    function color_formatHsl() {
      return hslConvert(this).formatHsl();
    }

    function color_formatRgb() {
      return this.rgb().formatRgb();
    }

    function color(format) {
      var m, l;
      format = (format + "").trim().toLowerCase();
      return (m = reHex.exec(format)) ? (l = m[1].length, m = parseInt(m[1], 16), l === 6 ? rgbn(m) // #ff0000
          : l === 3 ? new Rgb((m >> 8 & 0xf) | (m >> 4 & 0xf0), (m >> 4 & 0xf) | (m & 0xf0), ((m & 0xf) << 4) | (m & 0xf), 1) // #f00
          : l === 8 ? rgba(m >> 24 & 0xff, m >> 16 & 0xff, m >> 8 & 0xff, (m & 0xff) / 0xff) // #ff000000
          : l === 4 ? rgba((m >> 12 & 0xf) | (m >> 8 & 0xf0), (m >> 8 & 0xf) | (m >> 4 & 0xf0), (m >> 4 & 0xf) | (m & 0xf0), (((m & 0xf) << 4) | (m & 0xf)) / 0xff) // #f000
          : null) // invalid hex
          : (m = reRgbInteger.exec(format)) ? new Rgb(m[1], m[2], m[3], 1) // rgb(255, 0, 0)
          : (m = reRgbPercent.exec(format)) ? new Rgb(m[1] * 255 / 100, m[2] * 255 / 100, m[3] * 255 / 100, 1) // rgb(100%, 0%, 0%)
          : (m = reRgbaInteger.exec(format)) ? rgba(m[1], m[2], m[3], m[4]) // rgba(255, 0, 0, 1)
          : (m = reRgbaPercent.exec(format)) ? rgba(m[1] * 255 / 100, m[2] * 255 / 100, m[3] * 255 / 100, m[4]) // rgb(100%, 0%, 0%, 1)
          : (m = reHslPercent.exec(format)) ? hsla(m[1], m[2] / 100, m[3] / 100, 1) // hsl(120, 50%, 50%)
          : (m = reHslaPercent.exec(format)) ? hsla(m[1], m[2] / 100, m[3] / 100, m[4]) // hsla(120, 50%, 50%, 1)
          : named.hasOwnProperty(format) ? rgbn(named[format]) // eslint-disable-line no-prototype-builtins
          : format === "transparent" ? new Rgb(NaN, NaN, NaN, 0)
          : null;
    }

    function rgbn(n) {
      return new Rgb(n >> 16 & 0xff, n >> 8 & 0xff, n & 0xff, 1);
    }

    function rgba(r, g, b, a) {
      if (a <= 0) r = g = b = NaN;
      return new Rgb(r, g, b, a);
    }

    function rgbConvert(o) {
      if (!(o instanceof Color)) o = color(o);
      if (!o) return new Rgb;
      o = o.rgb();
      return new Rgb(o.r, o.g, o.b, o.opacity);
    }

    function rgb$1(r, g, b, opacity) {
      return arguments.length === 1 ? rgbConvert(r) : new Rgb(r, g, b, opacity == null ? 1 : opacity);
    }

    function Rgb(r, g, b, opacity) {
      this.r = +r;
      this.g = +g;
      this.b = +b;
      this.opacity = +opacity;
    }

    define(Rgb, rgb$1, extend(Color, {
      brighter: function(k) {
        k = k == null ? brighter : Math.pow(brighter, k);
        return new Rgb(this.r * k, this.g * k, this.b * k, this.opacity);
      },
      darker: function(k) {
        k = k == null ? darker : Math.pow(darker, k);
        return new Rgb(this.r * k, this.g * k, this.b * k, this.opacity);
      },
      rgb: function() {
        return this;
      },
      displayable: function() {
        return (-0.5 <= this.r && this.r < 255.5)
            && (-0.5 <= this.g && this.g < 255.5)
            && (-0.5 <= this.b && this.b < 255.5)
            && (0 <= this.opacity && this.opacity <= 1);
      },
      hex: rgb_formatHex, // Deprecated! Use color.formatHex.
      formatHex: rgb_formatHex,
      formatRgb: rgb_formatRgb,
      toString: rgb_formatRgb
    }));

    function rgb_formatHex() {
      return "#" + hex(this.r) + hex(this.g) + hex(this.b);
    }

    function rgb_formatRgb() {
      var a = this.opacity; a = isNaN(a) ? 1 : Math.max(0, Math.min(1, a));
      return (a === 1 ? "rgb(" : "rgba(")
          + Math.max(0, Math.min(255, Math.round(this.r) || 0)) + ", "
          + Math.max(0, Math.min(255, Math.round(this.g) || 0)) + ", "
          + Math.max(0, Math.min(255, Math.round(this.b) || 0))
          + (a === 1 ? ")" : ", " + a + ")");
    }

    function hex(value) {
      value = Math.max(0, Math.min(255, Math.round(value) || 0));
      return (value < 16 ? "0" : "") + value.toString(16);
    }

    function hsla(h, s, l, a) {
      if (a <= 0) h = s = l = NaN;
      else if (l <= 0 || l >= 1) h = s = NaN;
      else if (s <= 0) h = NaN;
      return new Hsl(h, s, l, a);
    }

    function hslConvert(o) {
      if (o instanceof Hsl) return new Hsl(o.h, o.s, o.l, o.opacity);
      if (!(o instanceof Color)) o = color(o);
      if (!o) return new Hsl;
      if (o instanceof Hsl) return o;
      o = o.rgb();
      var r = o.r / 255,
          g = o.g / 255,
          b = o.b / 255,
          min = Math.min(r, g, b),
          max = Math.max(r, g, b),
          h = NaN,
          s = max - min,
          l = (max + min) / 2;
      if (s) {
        if (r === max) h = (g - b) / s + (g < b) * 6;
        else if (g === max) h = (b - r) / s + 2;
        else h = (r - g) / s + 4;
        s /= l < 0.5 ? max + min : 2 - max - min;
        h *= 60;
      } else {
        s = l > 0 && l < 1 ? 0 : h;
      }
      return new Hsl(h, s, l, o.opacity);
    }

    function hsl(h, s, l, opacity) {
      return arguments.length === 1 ? hslConvert(h) : new Hsl(h, s, l, opacity == null ? 1 : opacity);
    }

    function Hsl(h, s, l, opacity) {
      this.h = +h;
      this.s = +s;
      this.l = +l;
      this.opacity = +opacity;
    }

    define(Hsl, hsl, extend(Color, {
      brighter: function(k) {
        k = k == null ? brighter : Math.pow(brighter, k);
        return new Hsl(this.h, this.s, this.l * k, this.opacity);
      },
      darker: function(k) {
        k = k == null ? darker : Math.pow(darker, k);
        return new Hsl(this.h, this.s, this.l * k, this.opacity);
      },
      rgb: function() {
        var h = this.h % 360 + (this.h < 0) * 360,
            s = isNaN(h) || isNaN(this.s) ? 0 : this.s,
            l = this.l,
            m2 = l + (l < 0.5 ? l : 1 - l) * s,
            m1 = 2 * l - m2;
        return new Rgb(
          hsl2rgb(h >= 240 ? h - 240 : h + 120, m1, m2),
          hsl2rgb(h, m1, m2),
          hsl2rgb(h < 120 ? h + 240 : h - 120, m1, m2),
          this.opacity
        );
      },
      displayable: function() {
        return (0 <= this.s && this.s <= 1 || isNaN(this.s))
            && (0 <= this.l && this.l <= 1)
            && (0 <= this.opacity && this.opacity <= 1);
      },
      formatHsl: function() {
        var a = this.opacity; a = isNaN(a) ? 1 : Math.max(0, Math.min(1, a));
        return (a === 1 ? "hsl(" : "hsla(")
            + (this.h || 0) + ", "
            + (this.s || 0) * 100 + "%, "
            + (this.l || 0) * 100 + "%"
            + (a === 1 ? ")" : ", " + a + ")");
      }
    }));

    /* From FvD 13.37, CSS Color Module Level 3 */
    function hsl2rgb(h, m1, m2) {
      return (h < 60 ? m1 + (m2 - m1) * h / 60
          : h < 180 ? m2
          : h < 240 ? m1 + (m2 - m1) * (240 - h) / 60
          : m1) * 255;
    }

    var constant$1 = x => () => x;

    function linear$1(a, d) {
      return function(t) {
        return a + t * d;
      };
    }

    function exponential(a, b, y) {
      return a = Math.pow(a, y), b = Math.pow(b, y) - a, y = 1 / y, function(t) {
        return Math.pow(a + t * b, y);
      };
    }

    function gamma(y) {
      return (y = +y) === 1 ? nogamma : function(a, b) {
        return b - a ? exponential(a, b, y) : constant$1(isNaN(a) ? b : a);
      };
    }

    function nogamma(a, b) {
      var d = b - a;
      return d ? linear$1(a, d) : constant$1(isNaN(a) ? b : a);
    }

    var rgb = (function rgbGamma(y) {
      var color = gamma(y);

      function rgb(start, end) {
        var r = color((start = rgb$1(start)).r, (end = rgb$1(end)).r),
            g = color(start.g, end.g),
            b = color(start.b, end.b),
            opacity = nogamma(start.opacity, end.opacity);
        return function(t) {
          start.r = r(t);
          start.g = g(t);
          start.b = b(t);
          start.opacity = opacity(t);
          return start + "";
        };
      }

      rgb.gamma = rgbGamma;

      return rgb;
    })(1);

    function numberArray(a, b) {
      if (!b) b = [];
      var n = a ? Math.min(b.length, a.length) : 0,
          c = b.slice(),
          i;
      return function(t) {
        for (i = 0; i < n; ++i) c[i] = a[i] * (1 - t) + b[i] * t;
        return c;
      };
    }

    function isNumberArray(x) {
      return ArrayBuffer.isView(x) && !(x instanceof DataView);
    }

    function genericArray(a, b) {
      var nb = b ? b.length : 0,
          na = a ? Math.min(nb, a.length) : 0,
          x = new Array(na),
          c = new Array(nb),
          i;

      for (i = 0; i < na; ++i) x[i] = interpolate(a[i], b[i]);
      for (; i < nb; ++i) c[i] = b[i];

      return function(t) {
        for (i = 0; i < na; ++i) c[i] = x[i](t);
        return c;
      };
    }

    function date(a, b) {
      var d = new Date;
      return a = +a, b = +b, function(t) {
        return d.setTime(a * (1 - t) + b * t), d;
      };
    }

    function interpolateNumber(a, b) {
      return a = +a, b = +b, function(t) {
        return a * (1 - t) + b * t;
      };
    }

    function object(a, b) {
      var i = {},
          c = {},
          k;

      if (a === null || typeof a !== "object") a = {};
      if (b === null || typeof b !== "object") b = {};

      for (k in b) {
        if (k in a) {
          i[k] = interpolate(a[k], b[k]);
        } else {
          c[k] = b[k];
        }
      }

      return function(t) {
        for (k in i) c[k] = i[k](t);
        return c;
      };
    }

    var reA = /[-+]?(?:\d+\.?\d*|\.?\d+)(?:[eE][-+]?\d+)?/g,
        reB = new RegExp(reA.source, "g");

    function zero(b) {
      return function() {
        return b;
      };
    }

    function one(b) {
      return function(t) {
        return b(t) + "";
      };
    }

    function string(a, b) {
      var bi = reA.lastIndex = reB.lastIndex = 0, // scan index for next number in b
          am, // current match in a
          bm, // current match in b
          bs, // string preceding current number in b, if any
          i = -1, // index in s
          s = [], // string constants and placeholders
          q = []; // number interpolators

      // Coerce inputs to strings.
      a = a + "", b = b + "";

      // Interpolate pairs of numbers in a & b.
      while ((am = reA.exec(a))
          && (bm = reB.exec(b))) {
        if ((bs = bm.index) > bi) { // a string precedes the next number in b
          bs = b.slice(bi, bs);
          if (s[i]) s[i] += bs; // coalesce with previous string
          else s[++i] = bs;
        }
        if ((am = am[0]) === (bm = bm[0])) { // numbers in a & b match
          if (s[i]) s[i] += bm; // coalesce with previous string
          else s[++i] = bm;
        } else { // interpolate non-matching numbers
          s[++i] = null;
          q.push({i: i, x: interpolateNumber(am, bm)});
        }
        bi = reB.lastIndex;
      }

      // Add remains of b.
      if (bi < b.length) {
        bs = b.slice(bi);
        if (s[i]) s[i] += bs; // coalesce with previous string
        else s[++i] = bs;
      }

      // Special optimization for only a single match.
      // Otherwise, interpolate each of the numbers and rejoin the string.
      return s.length < 2 ? (q[0]
          ? one(q[0].x)
          : zero(b))
          : (b = q.length, function(t) {
              for (var i = 0, o; i < b; ++i) s[(o = q[i]).i] = o.x(t);
              return s.join("");
            });
    }

    function interpolate(a, b) {
      var t = typeof b, c;
      return b == null || t === "boolean" ? constant$1(b)
          : (t === "number" ? interpolateNumber
          : t === "string" ? ((c = color(b)) ? (b = c, rgb) : string)
          : b instanceof color ? rgb
          : b instanceof Date ? date
          : isNumberArray(b) ? numberArray
          : Array.isArray(b) ? genericArray
          : typeof b.valueOf !== "function" && typeof b.toString !== "function" || isNaN(b) ? object
          : interpolateNumber)(a, b);
    }

    function interpolateRound(a, b) {
      return a = +a, b = +b, function(t) {
        return Math.round(a * (1 - t) + b * t);
      };
    }

    function constants(x) {
      return function() {
        return x;
      };
    }

    function number(x) {
      return +x;
    }

    var unit = [0, 1];

    function identity$1(x) {
      return x;
    }

    function normalize(a, b) {
      return (b -= (a = +a))
          ? function(x) { return (x - a) / b; }
          : constants(isNaN(b) ? NaN : 0.5);
    }

    function clamper(a, b) {
      var t;
      if (a > b) t = a, a = b, b = t;
      return function(x) { return Math.max(a, Math.min(b, x)); };
    }

    // normalize(a, b)(x) takes a domain value x in [a,b] and returns the corresponding parameter t in [0,1].
    // interpolate(a, b)(t) takes a parameter t in [0,1] and returns the corresponding range value x in [a,b].
    function bimap(domain, range, interpolate) {
      var d0 = domain[0], d1 = domain[1], r0 = range[0], r1 = range[1];
      if (d1 < d0) d0 = normalize(d1, d0), r0 = interpolate(r1, r0);
      else d0 = normalize(d0, d1), r0 = interpolate(r0, r1);
      return function(x) { return r0(d0(x)); };
    }

    function polymap(domain, range, interpolate) {
      var j = Math.min(domain.length, range.length) - 1,
          d = new Array(j),
          r = new Array(j),
          i = -1;

      // Reverse descending domains.
      if (domain[j] < domain[0]) {
        domain = domain.slice().reverse();
        range = range.slice().reverse();
      }

      while (++i < j) {
        d[i] = normalize(domain[i], domain[i + 1]);
        r[i] = interpolate(range[i], range[i + 1]);
      }

      return function(x) {
        var i = bisect(domain, x, 1, j) - 1;
        return r[i](d[i](x));
      };
    }

    function copy(source, target) {
      return target
          .domain(source.domain())
          .range(source.range())
          .interpolate(source.interpolate())
          .clamp(source.clamp())
          .unknown(source.unknown());
    }

    function transformer() {
      var domain = unit,
          range = unit,
          interpolate$1 = interpolate,
          transform,
          untransform,
          unknown,
          clamp = identity$1,
          piecewise,
          output,
          input;

      function rescale() {
        var n = Math.min(domain.length, range.length);
        if (clamp !== identity$1) clamp = clamper(domain[0], domain[n - 1]);
        piecewise = n > 2 ? polymap : bimap;
        output = input = null;
        return scale;
      }

      function scale(x) {
        return x == null || isNaN(x = +x) ? unknown : (output || (output = piecewise(domain.map(transform), range, interpolate$1)))(transform(clamp(x)));
      }

      scale.invert = function(y) {
        return clamp(untransform((input || (input = piecewise(range, domain.map(transform), interpolateNumber)))(y)));
      };

      scale.domain = function(_) {
        return arguments.length ? (domain = Array.from(_, number), rescale()) : domain.slice();
      };

      scale.range = function(_) {
        return arguments.length ? (range = Array.from(_), rescale()) : range.slice();
      };

      scale.rangeRound = function(_) {
        return range = Array.from(_), interpolate$1 = interpolateRound, rescale();
      };

      scale.clamp = function(_) {
        return arguments.length ? (clamp = _ ? true : identity$1, rescale()) : clamp !== identity$1;
      };

      scale.interpolate = function(_) {
        return arguments.length ? (interpolate$1 = _, rescale()) : interpolate$1;
      };

      scale.unknown = function(_) {
        return arguments.length ? (unknown = _, scale) : unknown;
      };

      return function(t, u) {
        transform = t, untransform = u;
        return rescale();
      };
    }

    function continuous() {
      return transformer()(identity$1, identity$1);
    }

    function formatDecimal(x) {
      return Math.abs(x = Math.round(x)) >= 1e21
          ? x.toLocaleString("en").replace(/,/g, "")
          : x.toString(10);
    }

    // Computes the decimal coefficient and exponent of the specified number x with
    // significant digits p, where x is positive and p is in [1, 21] or undefined.
    // For example, formatDecimalParts(1.23) returns ["123", 0].
    function formatDecimalParts(x, p) {
      if ((i = (x = p ? x.toExponential(p - 1) : x.toExponential()).indexOf("e")) < 0) return null; // NaN, ??Infinity
      var i, coefficient = x.slice(0, i);

      // The string returned by toExponential either has the form \d\.\d+e[-+]\d+
      // (e.g., 1.2e+3) or the form \de[-+]\d+ (e.g., 1e+3).
      return [
        coefficient.length > 1 ? coefficient[0] + coefficient.slice(2) : coefficient,
        +x.slice(i + 1)
      ];
    }

    function exponent(x) {
      return x = formatDecimalParts(Math.abs(x)), x ? x[1] : NaN;
    }

    function formatGroup(grouping, thousands) {
      return function(value, width) {
        var i = value.length,
            t = [],
            j = 0,
            g = grouping[0],
            length = 0;

        while (i > 0 && g > 0) {
          if (length + g + 1 > width) g = Math.max(1, width - length);
          t.push(value.substring(i -= g, i + g));
          if ((length += g + 1) > width) break;
          g = grouping[j = (j + 1) % grouping.length];
        }

        return t.reverse().join(thousands);
      };
    }

    function formatNumerals(numerals) {
      return function(value) {
        return value.replace(/[0-9]/g, function(i) {
          return numerals[+i];
        });
      };
    }

    // [[fill]align][sign][symbol][0][width][,][.precision][~][type]
    var re = /^(?:(.)?([<>=^]))?([+\-( ])?([$#])?(0)?(\d+)?(,)?(\.\d+)?(~)?([a-z%])?$/i;

    function formatSpecifier(specifier) {
      if (!(match = re.exec(specifier))) throw new Error("invalid format: " + specifier);
      var match;
      return new FormatSpecifier({
        fill: match[1],
        align: match[2],
        sign: match[3],
        symbol: match[4],
        zero: match[5],
        width: match[6],
        comma: match[7],
        precision: match[8] && match[8].slice(1),
        trim: match[9],
        type: match[10]
      });
    }

    formatSpecifier.prototype = FormatSpecifier.prototype; // instanceof

    function FormatSpecifier(specifier) {
      this.fill = specifier.fill === undefined ? " " : specifier.fill + "";
      this.align = specifier.align === undefined ? ">" : specifier.align + "";
      this.sign = specifier.sign === undefined ? "-" : specifier.sign + "";
      this.symbol = specifier.symbol === undefined ? "" : specifier.symbol + "";
      this.zero = !!specifier.zero;
      this.width = specifier.width === undefined ? undefined : +specifier.width;
      this.comma = !!specifier.comma;
      this.precision = specifier.precision === undefined ? undefined : +specifier.precision;
      this.trim = !!specifier.trim;
      this.type = specifier.type === undefined ? "" : specifier.type + "";
    }

    FormatSpecifier.prototype.toString = function() {
      return this.fill
          + this.align
          + this.sign
          + this.symbol
          + (this.zero ? "0" : "")
          + (this.width === undefined ? "" : Math.max(1, this.width | 0))
          + (this.comma ? "," : "")
          + (this.precision === undefined ? "" : "." + Math.max(0, this.precision | 0))
          + (this.trim ? "~" : "")
          + this.type;
    };

    // Trims insignificant zeros, e.g., replaces 1.2000k with 1.2k.
    function formatTrim(s) {
      out: for (var n = s.length, i = 1, i0 = -1, i1; i < n; ++i) {
        switch (s[i]) {
          case ".": i0 = i1 = i; break;
          case "0": if (i0 === 0) i0 = i; i1 = i; break;
          default: if (!+s[i]) break out; if (i0 > 0) i0 = 0; break;
        }
      }
      return i0 > 0 ? s.slice(0, i0) + s.slice(i1 + 1) : s;
    }

    var prefixExponent;

    function formatPrefixAuto(x, p) {
      var d = formatDecimalParts(x, p);
      if (!d) return x + "";
      var coefficient = d[0],
          exponent = d[1],
          i = exponent - (prefixExponent = Math.max(-8, Math.min(8, Math.floor(exponent / 3))) * 3) + 1,
          n = coefficient.length;
      return i === n ? coefficient
          : i > n ? coefficient + new Array(i - n + 1).join("0")
          : i > 0 ? coefficient.slice(0, i) + "." + coefficient.slice(i)
          : "0." + new Array(1 - i).join("0") + formatDecimalParts(x, Math.max(0, p + i - 1))[0]; // less than 1y!
    }

    function formatRounded(x, p) {
      var d = formatDecimalParts(x, p);
      if (!d) return x + "";
      var coefficient = d[0],
          exponent = d[1];
      return exponent < 0 ? "0." + new Array(-exponent).join("0") + coefficient
          : coefficient.length > exponent + 1 ? coefficient.slice(0, exponent + 1) + "." + coefficient.slice(exponent + 1)
          : coefficient + new Array(exponent - coefficient.length + 2).join("0");
    }

    var formatTypes = {
      "%": (x, p) => (x * 100).toFixed(p),
      "b": (x) => Math.round(x).toString(2),
      "c": (x) => x + "",
      "d": formatDecimal,
      "e": (x, p) => x.toExponential(p),
      "f": (x, p) => x.toFixed(p),
      "g": (x, p) => x.toPrecision(p),
      "o": (x) => Math.round(x).toString(8),
      "p": (x, p) => formatRounded(x * 100, p),
      "r": formatRounded,
      "s": formatPrefixAuto,
      "X": (x) => Math.round(x).toString(16).toUpperCase(),
      "x": (x) => Math.round(x).toString(16)
    };

    function identity(x) {
      return x;
    }

    var map = Array.prototype.map,
        prefixes = ["y","z","a","f","p","n","??","m","","k","M","G","T","P","E","Z","Y"];

    function formatLocale(locale) {
      var group = locale.grouping === undefined || locale.thousands === undefined ? identity : formatGroup(map.call(locale.grouping, Number), locale.thousands + ""),
          currencyPrefix = locale.currency === undefined ? "" : locale.currency[0] + "",
          currencySuffix = locale.currency === undefined ? "" : locale.currency[1] + "",
          decimal = locale.decimal === undefined ? "." : locale.decimal + "",
          numerals = locale.numerals === undefined ? identity : formatNumerals(map.call(locale.numerals, String)),
          percent = locale.percent === undefined ? "%" : locale.percent + "",
          minus = locale.minus === undefined ? "???" : locale.minus + "",
          nan = locale.nan === undefined ? "NaN" : locale.nan + "";

      function newFormat(specifier) {
        specifier = formatSpecifier(specifier);

        var fill = specifier.fill,
            align = specifier.align,
            sign = specifier.sign,
            symbol = specifier.symbol,
            zero = specifier.zero,
            width = specifier.width,
            comma = specifier.comma,
            precision = specifier.precision,
            trim = specifier.trim,
            type = specifier.type;

        // The "n" type is an alias for ",g".
        if (type === "n") comma = true, type = "g";

        // The "" type, and any invalid type, is an alias for ".12~g".
        else if (!formatTypes[type]) precision === undefined && (precision = 12), trim = true, type = "g";

        // If zero fill is specified, padding goes after sign and before digits.
        if (zero || (fill === "0" && align === "=")) zero = true, fill = "0", align = "=";

        // Compute the prefix and suffix.
        // For SI-prefix, the suffix is lazily computed.
        var prefix = symbol === "$" ? currencyPrefix : symbol === "#" && /[boxX]/.test(type) ? "0" + type.toLowerCase() : "",
            suffix = symbol === "$" ? currencySuffix : /[%p]/.test(type) ? percent : "";

        // What format function should we use?
        // Is this an integer type?
        // Can this type generate exponential notation?
        var formatType = formatTypes[type],
            maybeSuffix = /[defgprs%]/.test(type);

        // Set the default precision if not specified,
        // or clamp the specified precision to the supported range.
        // For significant precision, it must be in [1, 21].
        // For fixed precision, it must be in [0, 20].
        precision = precision === undefined ? 6
            : /[gprs]/.test(type) ? Math.max(1, Math.min(21, precision))
            : Math.max(0, Math.min(20, precision));

        function format(value) {
          var valuePrefix = prefix,
              valueSuffix = suffix,
              i, n, c;

          if (type === "c") {
            valueSuffix = formatType(value) + valueSuffix;
            value = "";
          } else {
            value = +value;

            // Determine the sign. -0 is not less than 0, but 1 / -0 is!
            var valueNegative = value < 0 || 1 / value < 0;

            // Perform the initial formatting.
            value = isNaN(value) ? nan : formatType(Math.abs(value), precision);

            // Trim insignificant zeros.
            if (trim) value = formatTrim(value);

            // If a negative value rounds to zero after formatting, and no explicit positive sign is requested, hide the sign.
            if (valueNegative && +value === 0 && sign !== "+") valueNegative = false;

            // Compute the prefix and suffix.
            valuePrefix = (valueNegative ? (sign === "(" ? sign : minus) : sign === "-" || sign === "(" ? "" : sign) + valuePrefix;
            valueSuffix = (type === "s" ? prefixes[8 + prefixExponent / 3] : "") + valueSuffix + (valueNegative && sign === "(" ? ")" : "");

            // Break the formatted value into the integer ???value??? part that can be
            // grouped, and fractional or exponential ???suffix??? part that is not.
            if (maybeSuffix) {
              i = -1, n = value.length;
              while (++i < n) {
                if (c = value.charCodeAt(i), 48 > c || c > 57) {
                  valueSuffix = (c === 46 ? decimal + value.slice(i + 1) : value.slice(i)) + valueSuffix;
                  value = value.slice(0, i);
                  break;
                }
              }
            }
          }

          // If the fill character is not "0", grouping is applied before padding.
          if (comma && !zero) value = group(value, Infinity);

          // Compute the padding.
          var length = valuePrefix.length + value.length + valueSuffix.length,
              padding = length < width ? new Array(width - length + 1).join(fill) : "";

          // If the fill character is "0", grouping is applied after padding.
          if (comma && zero) value = group(padding + value, padding.length ? width - valueSuffix.length : Infinity), padding = "";

          // Reconstruct the final output based on the desired alignment.
          switch (align) {
            case "<": value = valuePrefix + value + valueSuffix + padding; break;
            case "=": value = valuePrefix + padding + value + valueSuffix; break;
            case "^": value = padding.slice(0, length = padding.length >> 1) + valuePrefix + value + valueSuffix + padding.slice(length); break;
            default: value = padding + valuePrefix + value + valueSuffix; break;
          }

          return numerals(value);
        }

        format.toString = function() {
          return specifier + "";
        };

        return format;
      }

      function formatPrefix(specifier, value) {
        var f = newFormat((specifier = formatSpecifier(specifier), specifier.type = "f", specifier)),
            e = Math.max(-8, Math.min(8, Math.floor(exponent(value) / 3))) * 3,
            k = Math.pow(10, -e),
            prefix = prefixes[8 + e / 3];
        return function(value) {
          return f(k * value) + prefix;
        };
      }

      return {
        format: newFormat,
        formatPrefix: formatPrefix
      };
    }

    var locale;
    var format;
    var formatPrefix;

    defaultLocale({
      thousands: ",",
      grouping: [3],
      currency: ["$", ""]
    });

    function defaultLocale(definition) {
      locale = formatLocale(definition);
      format = locale.format;
      formatPrefix = locale.formatPrefix;
      return locale;
    }

    function precisionFixed(step) {
      return Math.max(0, -exponent(Math.abs(step)));
    }

    function precisionPrefix(step, value) {
      return Math.max(0, Math.max(-8, Math.min(8, Math.floor(exponent(value) / 3))) * 3 - exponent(Math.abs(step)));
    }

    function precisionRound(step, max) {
      step = Math.abs(step), max = Math.abs(max) - step;
      return Math.max(0, exponent(max) - exponent(step)) + 1;
    }

    function tickFormat(start, stop, count, specifier) {
      var step = tickStep(start, stop, count),
          precision;
      specifier = formatSpecifier(specifier == null ? ",f" : specifier);
      switch (specifier.type) {
        case "s": {
          var value = Math.max(Math.abs(start), Math.abs(stop));
          if (specifier.precision == null && !isNaN(precision = precisionPrefix(step, value))) specifier.precision = precision;
          return formatPrefix(specifier, value);
        }
        case "":
        case "e":
        case "g":
        case "p":
        case "r": {
          if (specifier.precision == null && !isNaN(precision = precisionRound(step, Math.max(Math.abs(start), Math.abs(stop))))) specifier.precision = precision - (specifier.type === "e");
          break;
        }
        case "f":
        case "%": {
          if (specifier.precision == null && !isNaN(precision = precisionFixed(step))) specifier.precision = precision - (specifier.type === "%") * 2;
          break;
        }
      }
      return format(specifier);
    }

    function linearish(scale) {
      var domain = scale.domain;

      scale.ticks = function(count) {
        var d = domain();
        return ticks(d[0], d[d.length - 1], count == null ? 10 : count);
      };

      scale.tickFormat = function(count, specifier) {
        var d = domain();
        return tickFormat(d[0], d[d.length - 1], count == null ? 10 : count, specifier);
      };

      scale.nice = function(count) {
        if (count == null) count = 10;

        var d = domain();
        var i0 = 0;
        var i1 = d.length - 1;
        var start = d[i0];
        var stop = d[i1];
        var prestep;
        var step;
        var maxIter = 10;

        if (stop < start) {
          step = start, start = stop, stop = step;
          step = i0, i0 = i1, i1 = step;
        }
        
        while (maxIter-- > 0) {
          step = tickIncrement(start, stop, count);
          if (step === prestep) {
            d[i0] = start;
            d[i1] = stop;
            return domain(d);
          } else if (step > 0) {
            start = Math.floor(start / step) * step;
            stop = Math.ceil(stop / step) * step;
          } else if (step < 0) {
            start = Math.ceil(start * step) / step;
            stop = Math.floor(stop * step) / step;
          } else {
            break;
          }
          prestep = step;
        }

        return scale;
      };

      return scale;
    }

    function linear() {
      var scale = continuous();

      scale.copy = function() {
        return copy(scale, linear());
      };

      initRange.apply(scale, arguments);

      return linearish(scale);
    }

    const pi = Math.PI,
        tau = 2 * pi,
        epsilon = 1e-6,
        tauEpsilon = tau - epsilon;

    function Path() {
      this._x0 = this._y0 = // start of current subpath
      this._x1 = this._y1 = null; // end of current subpath
      this._ = "";
    }

    function path() {
      return new Path;
    }

    Path.prototype = path.prototype = {
      constructor: Path,
      moveTo: function(x, y) {
        this._ += "M" + (this._x0 = this._x1 = +x) + "," + (this._y0 = this._y1 = +y);
      },
      closePath: function() {
        if (this._x1 !== null) {
          this._x1 = this._x0, this._y1 = this._y0;
          this._ += "Z";
        }
      },
      lineTo: function(x, y) {
        this._ += "L" + (this._x1 = +x) + "," + (this._y1 = +y);
      },
      quadraticCurveTo: function(x1, y1, x, y) {
        this._ += "Q" + (+x1) + "," + (+y1) + "," + (this._x1 = +x) + "," + (this._y1 = +y);
      },
      bezierCurveTo: function(x1, y1, x2, y2, x, y) {
        this._ += "C" + (+x1) + "," + (+y1) + "," + (+x2) + "," + (+y2) + "," + (this._x1 = +x) + "," + (this._y1 = +y);
      },
      arcTo: function(x1, y1, x2, y2, r) {
        x1 = +x1, y1 = +y1, x2 = +x2, y2 = +y2, r = +r;
        var x0 = this._x1,
            y0 = this._y1,
            x21 = x2 - x1,
            y21 = y2 - y1,
            x01 = x0 - x1,
            y01 = y0 - y1,
            l01_2 = x01 * x01 + y01 * y01;

        // Is the radius negative? Error.
        if (r < 0) throw new Error("negative radius: " + r);

        // Is this path empty? Move to (x1,y1).
        if (this._x1 === null) {
          this._ += "M" + (this._x1 = x1) + "," + (this._y1 = y1);
        }

        // Or, is (x1,y1) coincident with (x0,y0)? Do nothing.
        else if (!(l01_2 > epsilon));

        // Or, are (x0,y0), (x1,y1) and (x2,y2) collinear?
        // Equivalently, is (x1,y1) coincident with (x2,y2)?
        // Or, is the radius zero? Line to (x1,y1).
        else if (!(Math.abs(y01 * x21 - y21 * x01) > epsilon) || !r) {
          this._ += "L" + (this._x1 = x1) + "," + (this._y1 = y1);
        }

        // Otherwise, draw an arc!
        else {
          var x20 = x2 - x0,
              y20 = y2 - y0,
              l21_2 = x21 * x21 + y21 * y21,
              l20_2 = x20 * x20 + y20 * y20,
              l21 = Math.sqrt(l21_2),
              l01 = Math.sqrt(l01_2),
              l = r * Math.tan((pi - Math.acos((l21_2 + l01_2 - l20_2) / (2 * l21 * l01))) / 2),
              t01 = l / l01,
              t21 = l / l21;

          // If the start tangent is not coincident with (x0,y0), line to.
          if (Math.abs(t01 - 1) > epsilon) {
            this._ += "L" + (x1 + t01 * x01) + "," + (y1 + t01 * y01);
          }

          this._ += "A" + r + "," + r + ",0,0," + (+(y01 * x20 > x01 * y20)) + "," + (this._x1 = x1 + t21 * x21) + "," + (this._y1 = y1 + t21 * y21);
        }
      },
      arc: function(x, y, r, a0, a1, ccw) {
        x = +x, y = +y, r = +r, ccw = !!ccw;
        var dx = r * Math.cos(a0),
            dy = r * Math.sin(a0),
            x0 = x + dx,
            y0 = y + dy,
            cw = 1 ^ ccw,
            da = ccw ? a0 - a1 : a1 - a0;

        // Is the radius negative? Error.
        if (r < 0) throw new Error("negative radius: " + r);

        // Is this path empty? Move to (x0,y0).
        if (this._x1 === null) {
          this._ += "M" + x0 + "," + y0;
        }

        // Or, is (x0,y0) not coincident with the previous point? Line to (x0,y0).
        else if (Math.abs(this._x1 - x0) > epsilon || Math.abs(this._y1 - y0) > epsilon) {
          this._ += "L" + x0 + "," + y0;
        }

        // Is this arc empty? We???re done.
        if (!r) return;

        // Does the angle go the wrong way? Flip the direction.
        if (da < 0) da = da % tau + tau;

        // Is this a complete circle? Draw two arcs to complete the circle.
        if (da > tauEpsilon) {
          this._ += "A" + r + "," + r + ",0,1," + cw + "," + (x - dx) + "," + (y - dy) + "A" + r + "," + r + ",0,1," + cw + "," + (this._x1 = x0) + "," + (this._y1 = y0);
        }

        // Is this arc non-empty? Draw an arc!
        else if (da > epsilon) {
          this._ += "A" + r + "," + r + ",0," + (+(da >= pi)) + "," + cw + "," + (this._x1 = x + r * Math.cos(a1)) + "," + (this._y1 = y + r * Math.sin(a1));
        }
      },
      rect: function(x, y, w, h) {
        this._ += "M" + (this._x0 = this._x1 = +x) + "," + (this._y0 = this._y1 = +y) + "h" + (+w) + "v" + (+h) + "h" + (-w) + "Z";
      },
      toString: function() {
        return this._;
      }
    };

    function constant(x) {
      return function constant() {
        return x;
      };
    }

    function array(x) {
      return typeof x === "object" && "length" in x
        ? x // Array, TypedArray, NodeList, array-like
        : Array.from(x); // Map, Set, iterable, string, or anything else
    }

    function Linear(context) {
      this._context = context;
    }

    Linear.prototype = {
      areaStart: function() {
        this._line = 0;
      },
      areaEnd: function() {
        this._line = NaN;
      },
      lineStart: function() {
        this._point = 0;
      },
      lineEnd: function() {
        if (this._line || (this._line !== 0 && this._point === 1)) this._context.closePath();
        this._line = 1 - this._line;
      },
      point: function(x, y) {
        x = +x, y = +y;
        switch (this._point) {
          case 0: this._point = 1; this._line ? this._context.lineTo(x, y) : this._context.moveTo(x, y); break;
          case 1: this._point = 2; // falls through
          default: this._context.lineTo(x, y); break;
        }
      }
    };

    function curveLinear(context) {
      return new Linear(context);
    }

    function x(p) {
      return p[0];
    }

    function y(p) {
      return p[1];
    }

    function line(x$1, y$1) {
      var defined = constant(true),
          context = null,
          curve = curveLinear,
          output = null;

      x$1 = typeof x$1 === "function" ? x$1 : (x$1 === undefined) ? x : constant(x$1);
      y$1 = typeof y$1 === "function" ? y$1 : (y$1 === undefined) ? y : constant(y$1);

      function line(data) {
        var i,
            n = (data = array(data)).length,
            d,
            defined0 = false,
            buffer;

        if (context == null) output = curve(buffer = path());

        for (i = 0; i <= n; ++i) {
          if (!(i < n && defined(d = data[i], i, data)) === defined0) {
            if (defined0 = !defined0) output.lineStart();
            else output.lineEnd();
          }
          if (defined0) output.point(+x$1(d, i, data), +y$1(d, i, data));
        }

        if (buffer) return output = null, buffer + "" || null;
      }

      line.x = function(_) {
        return arguments.length ? (x$1 = typeof _ === "function" ? _ : constant(+_), line) : x$1;
      };

      line.y = function(_) {
        return arguments.length ? (y$1 = typeof _ === "function" ? _ : constant(+_), line) : y$1;
      };

      line.defined = function(_) {
        return arguments.length ? (defined = typeof _ === "function" ? _ : constant(!!_), line) : defined;
      };

      line.curve = function(_) {
        return arguments.length ? (curve = _, context != null && (output = curve(context)), line) : curve;
      };

      line.context = function(_) {
        return arguments.length ? (_ == null ? context = output = null : output = curve(context = _), line) : context;
      };

      return line;
    }

    class Bump {
      constructor(context, x) {
        this._context = context;
        this._x = x;
      }
      areaStart() {
        this._line = 0;
      }
      areaEnd() {
        this._line = NaN;
      }
      lineStart() {
        this._point = 0;
      }
      lineEnd() {
        if (this._line || (this._line !== 0 && this._point === 1)) this._context.closePath();
        this._line = 1 - this._line;
      }
      point(x, y) {
        x = +x, y = +y;
        switch (this._point) {
          case 0: {
            this._point = 1;
            if (this._line) this._context.lineTo(x, y);
            else this._context.moveTo(x, y);
            break;
          }
          case 1: this._point = 2; // falls through
          default: {
            if (this._x) this._context.bezierCurveTo(this._x0 = (this._x0 + x) / 2, this._y0, this._x0, y, x, y);
            else this._context.bezierCurveTo(this._x0, this._y0 = (this._y0 + y) / 2, x, this._y0, x, y);
            break;
          }
        }
        this._x0 = x, this._y0 = y;
      }
    }

    function bumpX(context) {
      return new Bump(context, true);
    }

    /* src/App.svelte generated by Svelte v3.44.3 */

    const { Object: Object_1 } = globals;
    const file = "src/App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[48] = list[i];
    	child_ctx[50] = i;
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[51] = list[i];
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[54] = list[i];
    	return child_ctx;
    }

    function get_each_context_3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[57] = list[i];
    	return child_ctx;
    }

    function get_each_context_4(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[57] = list[i];
    	return child_ctx;
    }

    function get_each_context_5(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[62] = list[i];
    	return child_ctx;
    }

    function get_each_context_6(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[62] = list[i];
    	return child_ctx;
    }

    function get_each_context_7(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[62] = list[i];
    	return child_ctx;
    }

    // (242:2) {#each lineData as line}
    function create_each_block_7(ctx) {
    	let path0;
    	let path0_d_value;
    	let path0_opacity_value;
    	let path1;
    	let path1_d_value;
    	let path1_opacity_value;

    	const block = {
    		c: function create() {
    			path0 = svg_element("path");
    			path1 = svg_element("path");
    			attr_dev(path0, "d", path0_d_value = /*lineGenerator*/ ctx[14](/*line*/ ctx[62]));
    			attr_dev(path0, "fill", "none");
    			attr_dev(path0, "stroke", "#eeeeee");

    			attr_dev(path0, "opacity", path0_opacity_value = !/*highlight*/ ctx[8] && /*highlightIDs*/ ctx[16].includes(/*line*/ ctx[62].id)
    			? dehighlightOpacity
    			: 1);

    			attr_dev(path0, "stroke-width", /*backgroundLineStrokeWidth*/ ctx[10]);
    			add_location(path0, file, 242, 4, 7839);
    			attr_dev(path1, "d", path1_d_value = /*lineGenerator*/ ctx[14](/*line*/ ctx[62]));
    			attr_dev(path1, "fill", "none");
    			attr_dev(path1, "stroke", /*connectingLineColour*/ ctx[13]);

    			attr_dev(path1, "opacity", path1_opacity_value = !/*highlight*/ ctx[8] && /*highlightIDs*/ ctx[16].includes(/*line*/ ctx[62].id)
    			? dehighlightOpacity
    			: 1);

    			attr_dev(path1, "stroke-width", /*lineStrokeWidth*/ ctx[9]);
    			add_location(path1, file, 251, 4, 8080);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, path0, anchor);
    			insert_dev(target, path1, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*lineGenerator*/ 16384 && path0_d_value !== (path0_d_value = /*lineGenerator*/ ctx[14](/*line*/ ctx[62]))) {
    				attr_dev(path0, "d", path0_d_value);
    			}

    			if (dirty[0] & /*highlight*/ 256 && path0_opacity_value !== (path0_opacity_value = !/*highlight*/ ctx[8] && /*highlightIDs*/ ctx[16].includes(/*line*/ ctx[62].id)
    			? dehighlightOpacity
    			: 1)) {
    				attr_dev(path0, "opacity", path0_opacity_value);
    			}

    			if (dirty[0] & /*backgroundLineStrokeWidth*/ 1024) {
    				attr_dev(path0, "stroke-width", /*backgroundLineStrokeWidth*/ ctx[10]);
    			}

    			if (dirty[0] & /*lineGenerator*/ 16384 && path1_d_value !== (path1_d_value = /*lineGenerator*/ ctx[14](/*line*/ ctx[62]))) {
    				attr_dev(path1, "d", path1_d_value);
    			}

    			if (dirty[0] & /*connectingLineColour*/ 8192) {
    				attr_dev(path1, "stroke", /*connectingLineColour*/ ctx[13]);
    			}

    			if (dirty[0] & /*highlight*/ 256 && path1_opacity_value !== (path1_opacity_value = !/*highlight*/ ctx[8] && /*highlightIDs*/ ctx[16].includes(/*line*/ ctx[62].id)
    			? dehighlightOpacity
    			: 1)) {
    				attr_dev(path1, "opacity", path1_opacity_value);
    			}

    			if (dirty[0] & /*lineStrokeWidth*/ 512) {
    				attr_dev(path1, "stroke-width", /*lineStrokeWidth*/ ctx[9]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(path0);
    			if (detaching) detach_dev(path1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_7.name,
    		type: "each",
    		source: "(242:2) {#each lineData as line}",
    		ctx
    	});

    	return block;
    }

    // (262:2) {#each splitData as line}
    function create_each_block_6(ctx) {
    	let path;
    	let path_d_value;
    	let path_opacity_value;

    	const block = {
    		c: function create() {
    			path = svg_element("path");
    			attr_dev(path, "d", path_d_value = /*lineGenerator*/ ctx[14](/*line*/ ctx[62]));
    			attr_dev(path, "fill", "none");
    			attr_dev(path, "stroke", "#eeeeee");
    			attr_dev(path, "opacity", path_opacity_value = !/*highlight*/ ctx[8] ? 1 : dehighlightOpacity);
    			attr_dev(path, "stroke-width", /*backgroundLineStrokeWidth*/ ctx[10]);
    			add_location(path, file, 262, 4, 8360);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, path, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*lineGenerator*/ 16384 && path_d_value !== (path_d_value = /*lineGenerator*/ ctx[14](/*line*/ ctx[62]))) {
    				attr_dev(path, "d", path_d_value);
    			}

    			if (dirty[0] & /*highlight*/ 256 && path_opacity_value !== (path_opacity_value = !/*highlight*/ ctx[8] ? 1 : dehighlightOpacity)) {
    				attr_dev(path, "opacity", path_opacity_value);
    			}

    			if (dirty[0] & /*backgroundLineStrokeWidth*/ 1024) {
    				attr_dev(path, "stroke-width", /*backgroundLineStrokeWidth*/ ctx[10]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(path);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_6.name,
    		type: "each",
    		source: "(262:2) {#each splitData as line}",
    		ctx
    	});

    	return block;
    }

    // (271:2) {#each splitData as line}
    function create_each_block_5(ctx) {
    	let path;
    	let path_d_value;
    	let path_opacity_value;

    	const block = {
    		c: function create() {
    			path = svg_element("path");
    			attr_dev(path, "d", path_d_value = /*lineGenerator*/ ctx[14](/*line*/ ctx[62]));
    			attr_dev(path, "fill", "none");
    			attr_dev(path, "stroke", /*connectingLineColour*/ ctx[13]);
    			attr_dev(path, "opacity", path_opacity_value = !/*highlight*/ ctx[8] ? 1 : dehighlightOpacity);
    			attr_dev(path, "stroke-width", /*lineStrokeWidth*/ ctx[9]);
    			add_location(path, file, 271, 4, 8589);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, path, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*lineGenerator*/ 16384 && path_d_value !== (path_d_value = /*lineGenerator*/ ctx[14](/*line*/ ctx[62]))) {
    				attr_dev(path, "d", path_d_value);
    			}

    			if (dirty[0] & /*connectingLineColour*/ 8192) {
    				attr_dev(path, "stroke", /*connectingLineColour*/ ctx[13]);
    			}

    			if (dirty[0] & /*highlight*/ 256 && path_opacity_value !== (path_opacity_value = !/*highlight*/ ctx[8] ? 1 : dehighlightOpacity)) {
    				attr_dev(path, "opacity", path_opacity_value);
    			}

    			if (dirty[0] & /*lineStrokeWidth*/ 512) {
    				attr_dev(path, "stroke-width", /*lineStrokeWidth*/ ctx[9]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(path);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_5.name,
    		type: "each",
    		source: "(271:2) {#each splitData as line}",
    		ctx
    	});

    	return block;
    }

    // (286:4) {#each year.divisions as division}
    function create_each_block_4(ctx) {
    	let circle;
    	let circle_cx_value;
    	let circle_cy_value;
    	let circle_opacity_value;

    	const block = {
    		c: function create() {
    			circle = svg_element("circle");
    			attr_dev(circle, "cx", circle_cx_value = /*x*/ ctx[7](/*year*/ ctx[54].year));
    			attr_dev(circle, "cy", circle_cy_value = 20 + /*division*/ ctx[57].y * /*vertSpace*/ ctx[6]);
    			attr_dev(circle, "r", /*outerCircleRadius*/ ctx[11]);
    			attr_dev(circle, "fill", "#000000");
    			attr_dev(circle, "stroke", "#000000");
    			attr_dev(circle, "stroke-width", 1);

    			attr_dev(circle, "opacity", circle_opacity_value = /*highlightIDs*/ ctx[16].includes(/*division*/ ctx[57].data.data.divisionID)
    			? 1
    			: /*highlight*/ ctx[8] ? dehighlightOpacity : 1);

    			add_location(circle, file, 286, 6, 9063);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, circle, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*x*/ 128 && circle_cx_value !== (circle_cx_value = /*x*/ ctx[7](/*year*/ ctx[54].year))) {
    				attr_dev(circle, "cx", circle_cx_value);
    			}

    			if (dirty[0] & /*vertSpace*/ 64 && circle_cy_value !== (circle_cy_value = 20 + /*division*/ ctx[57].y * /*vertSpace*/ ctx[6])) {
    				attr_dev(circle, "cy", circle_cy_value);
    			}

    			if (dirty[0] & /*outerCircleRadius*/ 2048) {
    				attr_dev(circle, "r", /*outerCircleRadius*/ ctx[11]);
    			}

    			if (dirty[0] & /*highlight*/ 256 && circle_opacity_value !== (circle_opacity_value = /*highlightIDs*/ ctx[16].includes(/*division*/ ctx[57].data.data.divisionID)
    			? 1
    			: /*highlight*/ ctx[8] ? dehighlightOpacity : 1)) {
    				attr_dev(circle, "opacity", circle_opacity_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(circle);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_4.name,
    		type: "each",
    		source: "(286:4) {#each year.divisions as division}",
    		ctx
    	});

    	return block;
    }

    // (315:6) {#if year.year === yearExtent[0]}
    function create_if_block_1(ctx) {
    	let text_1;
    	let t_value = /*division*/ ctx[57].data.data.name + "";
    	let t;
    	let text_1_x_value;
    	let text_1_y_value;
    	let text_1_fill_value;
    	let text_1_opacity_value;

    	const block = {
    		c: function create() {
    			text_1 = svg_element("text");
    			t = text(t_value);
    			attr_dev(text_1, "x", text_1_x_value = /*x*/ ctx[7](/*year*/ ctx[54].year) - 12);
    			attr_dev(text_1, "y", text_1_y_value = 20 + /*division*/ ctx[57].y * /*vertSpace*/ ctx[6] + 4);
    			attr_dev(text_1, "font-size", 11);
    			attr_dev(text_1, "text-anchor", "end");
    			attr_dev(text_1, "fill", text_1_fill_value = /*cols*/ ctx[15][/*division*/ ctx[57].data.data.status].fill);

    			attr_dev(text_1, "opacity", text_1_opacity_value = /*highlightIDs*/ ctx[16].includes(/*division*/ ctx[57].data.data.divisionID)
    			? 1
    			: /*highlight*/ ctx[8] ? dehighlightOpacity : 1);

    			add_location(text_1, file, 315, 8, 9910);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, text_1, anchor);
    			append_dev(text_1, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*x*/ 128 && text_1_x_value !== (text_1_x_value = /*x*/ ctx[7](/*year*/ ctx[54].year) - 12)) {
    				attr_dev(text_1, "x", text_1_x_value);
    			}

    			if (dirty[0] & /*vertSpace*/ 64 && text_1_y_value !== (text_1_y_value = 20 + /*division*/ ctx[57].y * /*vertSpace*/ ctx[6] + 4)) {
    				attr_dev(text_1, "y", text_1_y_value);
    			}

    			if (dirty[0] & /*cols*/ 32768 && text_1_fill_value !== (text_1_fill_value = /*cols*/ ctx[15][/*division*/ ctx[57].data.data.status].fill)) {
    				attr_dev(text_1, "fill", text_1_fill_value);
    			}

    			if (dirty[0] & /*highlight*/ 256 && text_1_opacity_value !== (text_1_opacity_value = /*highlightIDs*/ ctx[16].includes(/*division*/ ctx[57].data.data.divisionID)
    			? 1
    			: /*highlight*/ ctx[8] ? dehighlightOpacity : 1)) {
    				attr_dev(text_1, "opacity", text_1_opacity_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(text_1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(315:6) {#if year.year === yearExtent[0]}",
    		ctx
    	});

    	return block;
    }

    // (329:6) {#if year.year === yearExtent[1]}
    function create_if_block(ctx) {
    	let text_1;
    	let t_value = /*divisionNames*/ ctx[17][/*division*/ ctx[57].data.data.name] + "";
    	let t;
    	let text_1_x_value;
    	let text_1_y_value;
    	let text_1_fill_value;
    	let text_1_opacity_value;

    	const block = {
    		c: function create() {
    			text_1 = svg_element("text");
    			t = text(t_value);
    			attr_dev(text_1, "x", text_1_x_value = /*x*/ ctx[7](/*year*/ ctx[54].year) + 12);
    			attr_dev(text_1, "y", text_1_y_value = 20 + /*division*/ ctx[57].y * /*vertSpace*/ ctx[6] + 4);
    			attr_dev(text_1, "font-size", 11);
    			attr_dev(text_1, "fill", text_1_fill_value = /*cols*/ ctx[15][/*division*/ ctx[57].data.data.status].fill);

    			attr_dev(text_1, "opacity", text_1_opacity_value = /*highlightIDs*/ ctx[16].includes(/*division*/ ctx[57].data.data.divisionID)
    			? 1
    			: /*highlight*/ ctx[8] ? dehighlightOpacity : 1);

    			add_location(text_1, file, 329, 8, 10367);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, text_1, anchor);
    			append_dev(text_1, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*x*/ 128 && text_1_x_value !== (text_1_x_value = /*x*/ ctx[7](/*year*/ ctx[54].year) + 12)) {
    				attr_dev(text_1, "x", text_1_x_value);
    			}

    			if (dirty[0] & /*vertSpace*/ 64 && text_1_y_value !== (text_1_y_value = 20 + /*division*/ ctx[57].y * /*vertSpace*/ ctx[6] + 4)) {
    				attr_dev(text_1, "y", text_1_y_value);
    			}

    			if (dirty[0] & /*cols*/ 32768 && text_1_fill_value !== (text_1_fill_value = /*cols*/ ctx[15][/*division*/ ctx[57].data.data.status].fill)) {
    				attr_dev(text_1, "fill", text_1_fill_value);
    			}

    			if (dirty[0] & /*highlight*/ 256 && text_1_opacity_value !== (text_1_opacity_value = /*highlightIDs*/ ctx[16].includes(/*division*/ ctx[57].data.data.divisionID)
    			? 1
    			: /*highlight*/ ctx[8] ? dehighlightOpacity : 1)) {
    				attr_dev(text_1, "opacity", text_1_opacity_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(text_1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(329:6) {#if year.year === yearExtent[1]}",
    		ctx
    	});

    	return block;
    }

    // (301:4) {#each year.divisions as division}
    function create_each_block_3(ctx) {
    	let circle;
    	let circle_cx_value;
    	let circle_cy_value;
    	let circle_fill_value;
    	let circle_stroke_value;
    	let circle_opacity_value;
    	let if_block0_anchor;
    	let if_block1_anchor;
    	let if_block0 = /*year*/ ctx[54].year === /*yearExtent*/ ctx[18][0] && create_if_block_1(ctx);
    	let if_block1 = /*year*/ ctx[54].year === /*yearExtent*/ ctx[18][1] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			circle = svg_element("circle");
    			if (if_block0) if_block0.c();
    			if_block0_anchor = empty();
    			if (if_block1) if_block1.c();
    			if_block1_anchor = empty();
    			attr_dev(circle, "cx", circle_cx_value = /*x*/ ctx[7](/*year*/ ctx[54].year));
    			attr_dev(circle, "cy", circle_cy_value = 20 + /*division*/ ctx[57].y * /*vertSpace*/ ctx[6]);
    			attr_dev(circle, "r", /*innerCircleRadius*/ ctx[12]);
    			attr_dev(circle, "fill", circle_fill_value = /*cols*/ ctx[15][/*division*/ ctx[57].data.data.status].fill);
    			attr_dev(circle, "stroke", circle_stroke_value = /*cols*/ ctx[15][/*division*/ ctx[57].data.data.status].stroke);
    			attr_dev(circle, "stroke-width", 1);

    			attr_dev(circle, "opacity", circle_opacity_value = /*highlightIDs*/ ctx[16].includes(/*division*/ ctx[57].data.data.divisionID)
    			? 1
    			: /*highlight*/ ctx[8] ? dehighlightOpacity : 1);

    			add_location(circle, file, 301, 6, 9463);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, circle, anchor);
    			if (if_block0) if_block0.m(target, anchor);
    			insert_dev(target, if_block0_anchor, anchor);
    			if (if_block1) if_block1.m(target, anchor);
    			insert_dev(target, if_block1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*x*/ 128 && circle_cx_value !== (circle_cx_value = /*x*/ ctx[7](/*year*/ ctx[54].year))) {
    				attr_dev(circle, "cx", circle_cx_value);
    			}

    			if (dirty[0] & /*vertSpace*/ 64 && circle_cy_value !== (circle_cy_value = 20 + /*division*/ ctx[57].y * /*vertSpace*/ ctx[6])) {
    				attr_dev(circle, "cy", circle_cy_value);
    			}

    			if (dirty[0] & /*innerCircleRadius*/ 4096) {
    				attr_dev(circle, "r", /*innerCircleRadius*/ ctx[12]);
    			}

    			if (dirty[0] & /*cols*/ 32768 && circle_fill_value !== (circle_fill_value = /*cols*/ ctx[15][/*division*/ ctx[57].data.data.status].fill)) {
    				attr_dev(circle, "fill", circle_fill_value);
    			}

    			if (dirty[0] & /*cols*/ 32768 && circle_stroke_value !== (circle_stroke_value = /*cols*/ ctx[15][/*division*/ ctx[57].data.data.status].stroke)) {
    				attr_dev(circle, "stroke", circle_stroke_value);
    			}

    			if (dirty[0] & /*highlight*/ 256 && circle_opacity_value !== (circle_opacity_value = /*highlightIDs*/ ctx[16].includes(/*division*/ ctx[57].data.data.divisionID)
    			? 1
    			: /*highlight*/ ctx[8] ? dehighlightOpacity : 1)) {
    				attr_dev(circle, "opacity", circle_opacity_value);
    			}

    			if (/*year*/ ctx[54].year === /*yearExtent*/ ctx[18][0]) if_block0.p(ctx, dirty);
    			if (/*year*/ ctx[54].year === /*yearExtent*/ ctx[18][1]) if_block1.p(ctx, dirty);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(circle);
    			if (if_block0) if_block0.d(detaching);
    			if (detaching) detach_dev(if_block0_anchor);
    			if (if_block1) if_block1.d(detaching);
    			if (detaching) detach_dev(if_block1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_3.name,
    		type: "each",
    		source: "(301:4) {#each year.divisions as division}",
    		ctx
    	});

    	return block;
    }

    // (280:2) {#each vizHierarchyData as year}
    function create_each_block_2(ctx) {
    	let text_1;

    	let t_value = (/*year*/ ctx[54].year === 1978 || /*year*/ ctx[54].year === 1979
    	? /*year*/ ctx[54].year.toString().substring(2)
    	: /*year*/ ctx[54].year) + "";

    	let t;
    	let text_1_x_value;
    	let each0_anchor;
    	let each1_anchor;
    	let each_value_4 = /*year*/ ctx[54].divisions;
    	validate_each_argument(each_value_4);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_4.length; i += 1) {
    		each_blocks_1[i] = create_each_block_4(get_each_context_4(ctx, each_value_4, i));
    	}

    	let each_value_3 = /*year*/ ctx[54].divisions;
    	validate_each_argument(each_value_3);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_3.length; i += 1) {
    		each_blocks[i] = create_each_block_3(get_each_context_3(ctx, each_value_3, i));
    	}

    	const block = {
    		c: function create() {
    			text_1 = svg_element("text");
    			t = text(t_value);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			each0_anchor = empty();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each1_anchor = empty();
    			attr_dev(text_1, "x", text_1_x_value = /*x*/ ctx[7](/*year*/ ctx[54].year));
    			attr_dev(text_1, "y", 10);
    			attr_dev(text_1, "text-anchor", "middle");
    			attr_dev(text_1, "font-size", 10);
    			add_location(text_1, file, 280, 4, 8826);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, text_1, anchor);
    			append_dev(text_1, t);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(target, anchor);
    			}

    			insert_dev(target, each0_anchor, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*x*/ 128 && text_1_x_value !== (text_1_x_value = /*x*/ ctx[7](/*year*/ ctx[54].year))) {
    				attr_dev(text_1, "x", text_1_x_value);
    			}

    			if (dirty[0] & /*x, vizHierarchyData, vertSpace, outerCircleRadius, highlightIDs, highlight*/ 592320) {
    				each_value_4 = /*year*/ ctx[54].divisions;
    				validate_each_argument(each_value_4);
    				let i;

    				for (i = 0; i < each_value_4.length; i += 1) {
    					const child_ctx = get_each_context_4(ctx, each_value_4, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_1[i] = create_each_block_4(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(each0_anchor.parentNode, each0_anchor);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}

    				each_blocks_1.length = each_value_4.length;
    			}

    			if (dirty[0] & /*x, vizHierarchyData, vertSpace, cols, highlightIDs, highlight, divisionNames, yearExtent, innerCircleRadius*/ 1020352) {
    				each_value_3 = /*year*/ ctx[54].divisions;
    				validate_each_argument(each_value_3);
    				let i;

    				for (i = 0; i < each_value_3.length; i += 1) {
    					const child_ctx = get_each_context_3(ctx, each_value_3, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_3(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each1_anchor.parentNode, each1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_3.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(text_1);
    			destroy_each(each_blocks_1, detaching);
    			if (detaching) detach_dev(each0_anchor);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_2.name,
    		type: "each",
    		source: "(280:2) {#each vizHierarchyData as year}",
    		ctx
    	});

    	return block;
    }

    // (344:2) {#each boundaryChanges as change}
    function create_each_block_1(ctx) {
    	let circle;
    	let circle_cx_value;
    	let circle_cy_value;
    	let circle_fill_value;

    	const block = {
    		c: function create() {
    			circle = svg_element("circle");
    			attr_dev(circle, "cx", circle_cx_value = /*x*/ ctx[7](/*change*/ ctx[51].year) + 4);
    			attr_dev(circle, "cy", circle_cy_value = 20 + /*change*/ ctx[51].y * /*vertSpace*/ ctx[6] - 4);
    			attr_dev(circle, "r", 3);

    			attr_dev(circle, "stroke", /*change*/ ctx[51].status === "district"
    			? "white"
    			: "white");

    			attr_dev(circle, "stroke-width", 1);

    			attr_dev(circle, "fill", circle_fill_value = /*change*/ ctx[51].status === "district"
    			? /*districtColour*/ ctx[3]
    			: "white");

    			add_location(circle, file, 344, 4, 10823);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, circle, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*x*/ 128 && circle_cx_value !== (circle_cx_value = /*x*/ ctx[7](/*change*/ ctx[51].year) + 4)) {
    				attr_dev(circle, "cx", circle_cx_value);
    			}

    			if (dirty[0] & /*vertSpace*/ 64 && circle_cy_value !== (circle_cy_value = 20 + /*change*/ ctx[51].y * /*vertSpace*/ ctx[6] - 4)) {
    				attr_dev(circle, "cy", circle_cy_value);
    			}

    			if (dirty[0] & /*districtColour*/ 8 && circle_fill_value !== (circle_fill_value = /*change*/ ctx[51].status === "district"
    			? /*districtColour*/ ctx[3]
    			: "white")) {
    				attr_dev(circle, "fill", circle_fill_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(circle);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(344:2) {#each boundaryChanges as change}",
    		ctx
    	});

    	return block;
    }

    // (354:2) {#each Object.keys(cols) as legendColor, i}
    function create_each_block(ctx) {
    	let circle;
    	let circle_fill_value;
    	let circle_stroke_value;
    	let text_1;
    	let t_value = /*legendColor*/ ctx[48] + "";
    	let t;
    	let text_1_fill_value;

    	const block = {
    		c: function create() {
    			circle = svg_element("circle");
    			text_1 = svg_element("text");
    			t = text(t_value);
    			attr_dev(circle, "cx", 10 + /*i*/ ctx[50] * 140);
    			attr_dev(circle, "cy", 300);
    			attr_dev(circle, "r", 6);
    			attr_dev(circle, "fill", circle_fill_value = /*cols*/ ctx[15][/*legendColor*/ ctx[48]].fill);
    			attr_dev(circle, "stroke", circle_stroke_value = /*cols*/ ctx[15][/*legendColor*/ ctx[48]].fill);
    			add_location(circle, file, 354, 4, 11137);
    			attr_dev(text_1, "x", 20 + /*i*/ ctx[50] * 140);
    			attr_dev(text_1, "y", 304);
    			attr_dev(text_1, "font-size", 12);
    			attr_dev(text_1, "fill", text_1_fill_value = /*cols*/ ctx[15][/*legendColor*/ ctx[48]].fill);
    			add_location(text_1, file, 361, 4, 11281);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, circle, anchor);
    			insert_dev(target, text_1, anchor);
    			append_dev(text_1, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*cols*/ 32768 && circle_fill_value !== (circle_fill_value = /*cols*/ ctx[15][/*legendColor*/ ctx[48]].fill)) {
    				attr_dev(circle, "fill", circle_fill_value);
    			}

    			if (dirty[0] & /*cols*/ 32768 && circle_stroke_value !== (circle_stroke_value = /*cols*/ ctx[15][/*legendColor*/ ctx[48]].fill)) {
    				attr_dev(circle, "stroke", circle_stroke_value);
    			}

    			if (dirty[0] & /*cols*/ 32768 && t_value !== (t_value = /*legendColor*/ ctx[48] + "")) set_data_dev(t, t_value);

    			if (dirty[0] & /*cols*/ 32768 && text_1_fill_value !== (text_1_fill_value = /*cols*/ ctx[15][/*legendColor*/ ctx[48]].fill)) {
    				attr_dev(text_1, "fill", text_1_fill_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(circle);
    			if (detaching) detach_dev(text_1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(354:2) {#each Object.keys(cols) as legendColor, i}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let label0;
    	let input0;
    	let t0;
    	let t1;
    	let label1;
    	let input1;
    	let t2;
    	let t3;
    	let label2;
    	let t4;
    	let input2;
    	let t5;
    	let input3;
    	let t6;
    	let label3;
    	let t7;
    	let input4;
    	let t8;
    	let label4;
    	let t9;
    	let input5;
    	let t10;
    	let input6;
    	let t11;
    	let label5;
    	let t12;
    	let input7;
    	let t13;
    	let input8;
    	let t14;
    	let label6;
    	let t15;
    	let input9;
    	let t16;
    	let input10;
    	let t17;
    	let label7;
    	let t18;
    	let input11;
    	let t19;
    	let input12;
    	let t20;
    	let label8;
    	let t21;
    	let input13;
    	let t22;
    	let label9;
    	let t23;
    	let input14;
    	let t24;
    	let label10;
    	let t25;
    	let input15;
    	let t26;
    	let label11;
    	let t27;
    	let input16;
    	let t28;
    	let label12;
    	let t29;
    	let input17;
    	let t30;
    	let svg;
    	let each0_anchor;
    	let each1_anchor;
    	let each2_anchor;
    	let each3_anchor;
    	let each4_anchor;
    	let t31;
    	let label13;
    	let t32;
    	let input18;
    	let mounted;
    	let dispose;
    	let each_value_7 = /*lineData*/ ctx[20];
    	validate_each_argument(each_value_7);
    	let each_blocks_5 = [];

    	for (let i = 0; i < each_value_7.length; i += 1) {
    		each_blocks_5[i] = create_each_block_7(get_each_context_7(ctx, each_value_7, i));
    	}

    	let each_value_6 = /*splitData*/ ctx[21];
    	validate_each_argument(each_value_6);
    	let each_blocks_4 = [];

    	for (let i = 0; i < each_value_6.length; i += 1) {
    		each_blocks_4[i] = create_each_block_6(get_each_context_6(ctx, each_value_6, i));
    	}

    	let each_value_5 = /*splitData*/ ctx[21];
    	validate_each_argument(each_value_5);
    	let each_blocks_3 = [];

    	for (let i = 0; i < each_value_5.length; i += 1) {
    		each_blocks_3[i] = create_each_block_5(get_each_context_5(ctx, each_value_5, i));
    	}

    	let each_value_2 = /*vizHierarchyData*/ ctx[19];
    	validate_each_argument(each_value_2);
    	let each_blocks_2 = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks_2[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	let each_value_1 = /*boundaryChanges*/ ctx[22];
    	validate_each_argument(each_value_1);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	let each_value = Object.keys(/*cols*/ ctx[15]);
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			label0 = element("label");
    			input0 = element("input");
    			t0 = text("\n  Highlight");
    			t1 = space();
    			label1 = element("label");
    			input1 = element("input");
    			t2 = text("\n  Compact");
    			t3 = space();
    			label2 = element("label");
    			t4 = text("Connecting lines stroke width\n  ");
    			input2 = element("input");
    			t5 = space();
    			input3 = element("input");
    			t6 = space();
    			label3 = element("label");
    			t7 = text("Connecting line colour:\n  ");
    			input4 = element("input");
    			t8 = space();
    			label4 = element("label");
    			t9 = text("Background connecting lines stroke width\n  ");
    			input5 = element("input");
    			t10 = space();
    			input6 = element("input");
    			t11 = space();
    			label5 = element("label");
    			t12 = text("Outer circles radius\n  ");
    			input7 = element("input");
    			t13 = space();
    			input8 = element("input");
    			t14 = space();
    			label6 = element("label");
    			t15 = text("Inner circles radius\n  ");
    			input9 = element("input");
    			t16 = space();
    			input10 = element("input");
    			t17 = space();
    			label7 = element("label");
    			t18 = text("Vertical spacing\n  ");
    			input11 = element("input");
    			t19 = space();
    			input12 = element("input");
    			t20 = space();
    			label8 = element("label");
    			t21 = text("County colour:\n  ");
    			input13 = element("input");
    			t22 = space();
    			label9 = element("label");
    			t23 = text("County level city colour:\n  ");
    			input14 = element("input");
    			t24 = space();
    			label10 = element("label");
    			t25 = text("District colour:\n  ");
    			input15 = element("input");
    			t26 = space();
    			label11 = element("label");
    			t27 = text("Prefecture level city colour:\n  ");
    			input16 = element("input");
    			t28 = space();
    			label12 = element("label");
    			t29 = text("Prefecture level city colour:\n  ");
    			input17 = element("input");
    			t30 = space();
    			svg = svg_element("svg");

    			for (let i = 0; i < each_blocks_5.length; i += 1) {
    				each_blocks_5[i].c();
    			}

    			each0_anchor = empty();

    			for (let i = 0; i < each_blocks_4.length; i += 1) {
    				each_blocks_4[i].c();
    			}

    			each1_anchor = empty();

    			for (let i = 0; i < each_blocks_3.length; i += 1) {
    				each_blocks_3[i].c();
    			}

    			each2_anchor = empty();

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].c();
    			}

    			each3_anchor = empty();

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			each4_anchor = empty();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t31 = space();
    			label13 = element("label");
    			t32 = text("County colour:\n  ");
    			input18 = element("input");
    			attr_dev(input0, "type", "checkbox");
    			add_location(input0, file, 189, 2, 5745);
    			add_location(label0, file, 188, 0, 5735);
    			attr_dev(input1, "type", "checkbox");
    			add_location(input1, file, 193, 2, 5827);
    			add_location(label1, file, 192, 0, 5817);
    			attr_dev(input2, "type", "number");
    			attr_dev(input2, "min", "0");
    			attr_dev(input2, "max", "10");
    			add_location(input2, file, 199, 2, 5938);
    			attr_dev(input3, "type", "range");
    			attr_dev(input3, "min", "0");
    			attr_dev(input3, "max", "10");
    			add_location(input3, file, 200, 2, 6010);
    			add_location(label2, file, 197, 0, 5896);
    			attr_dev(input4, "type", "color");
    			attr_dev(input4, "id", "favcolor");
    			attr_dev(input4, "name", "favcolor");
    			add_location(input4, file, 203, 2, 6136);
    			attr_dev(label3, "for", "favcolor");
    			add_location(label3, file, 202, 0, 6088);
    			attr_dev(input5, "type", "number");
    			attr_dev(input5, "min", "0");
    			attr_dev(input5, "max", "20");
    			add_location(input5, file, 207, 2, 6283);
    			attr_dev(input6, "type", "range");
    			attr_dev(input6, "min", "0");
    			attr_dev(input6, "max", "20");
    			add_location(input6, file, 208, 2, 6365);
    			add_location(label4, file, 205, 0, 6230);
    			attr_dev(input7, "type", "number");
    			attr_dev(input7, "min", "0");
    			attr_dev(input7, "max", "20");
    			add_location(input7, file, 212, 2, 6486);
    			attr_dev(input8, "type", "range");
    			attr_dev(input8, "min", "0");
    			attr_dev(input8, "max", "20");
    			add_location(input8, file, 213, 2, 6560);
    			add_location(label5, file, 210, 0, 6453);
    			attr_dev(input9, "type", "number");
    			attr_dev(input9, "min", "0");
    			attr_dev(input9, "max", "20");
    			add_location(input9, file, 217, 2, 6673);
    			attr_dev(input10, "type", "range");
    			attr_dev(input10, "min", "0");
    			attr_dev(input10, "max", "20");
    			add_location(input10, file, 218, 2, 6747);
    			add_location(label6, file, 215, 0, 6640);
    			attr_dev(input11, "type", "number");
    			attr_dev(input11, "min", "0");
    			attr_dev(input11, "max", "20");
    			add_location(input11, file, 222, 2, 6856);
    			attr_dev(input12, "type", "range");
    			attr_dev(input12, "min", "0");
    			attr_dev(input12, "max", "20");
    			add_location(input12, file, 223, 2, 6922);
    			add_location(label7, file, 220, 0, 6827);
    			attr_dev(input13, "type", "color");
    			attr_dev(input13, "id", "countycolor");
    			attr_dev(input13, "name", "countycolor");
    			add_location(input13, file, 226, 2, 7036);
    			attr_dev(label8, "for", "countycolor");
    			add_location(label8, file, 225, 0, 6994);
    			attr_dev(input14, "type", "color");
    			attr_dev(input14, "id", "countycitycolor");
    			attr_dev(input14, "name", "countycitycolor");
    			add_location(input14, file, 229, 2, 7185);
    			attr_dev(label9, "for", "countycitycolor");
    			add_location(label9, file, 228, 0, 7128);
    			attr_dev(input15, "type", "color");
    			attr_dev(input15, "id", "districtcolor");
    			attr_dev(input15, "name", "districtcolor");
    			add_location(input15, file, 232, 2, 7342);
    			attr_dev(label10, "for", "countycitycolor");
    			add_location(label10, file, 231, 0, 7294);
    			attr_dev(input16, "type", "color");
    			attr_dev(input16, "id", "prefecturecolor");
    			attr_dev(input16, "name", "prefecturecolor");
    			add_location(input16, file, 235, 2, 7501);
    			attr_dev(label11, "for", "prefecturecolor");
    			add_location(label11, file, 234, 0, 7440);
    			attr_dev(input17, "type", "color");
    			attr_dev(input17, "id", "autonomouscolor");
    			attr_dev(input17, "name", "autonomouscolor");
    			add_location(input17, file, 238, 2, 7675);
    			attr_dev(label12, "for", "autonomouscolor");
    			add_location(label12, file, 237, 0, 7614);
    			attr_dev(svg, "width", width);
    			attr_dev(svg, "height", height);
    			add_location(svg, file, 240, 0, 7785);
    			attr_dev(input18, "type", "color");
    			attr_dev(input18, "id", "countycolor");
    			attr_dev(input18, "name", "countycolor");
    			add_location(input18, file, 367, 2, 11449);
    			attr_dev(label13, "for", "countycolor");
    			add_location(label13, file, 366, 0, 11407);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, label0, anchor);
    			append_dev(label0, input0);
    			input0.checked = /*highlight*/ ctx[8];
    			append_dev(label0, t0);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, label1, anchor);
    			append_dev(label1, input1);
    			input1.checked = /*compact*/ ctx[0];
    			append_dev(label1, t2);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, label2, anchor);
    			append_dev(label2, t4);
    			append_dev(label2, input2);
    			set_input_value(input2, /*lineStrokeWidth*/ ctx[9]);
    			append_dev(label2, t5);
    			append_dev(label2, input3);
    			set_input_value(input3, /*lineStrokeWidth*/ ctx[9]);
    			insert_dev(target, t6, anchor);
    			insert_dev(target, label3, anchor);
    			append_dev(label3, t7);
    			append_dev(label3, input4);
    			set_input_value(input4, /*connectingLineColour*/ ctx[13]);
    			insert_dev(target, t8, anchor);
    			insert_dev(target, label4, anchor);
    			append_dev(label4, t9);
    			append_dev(label4, input5);
    			set_input_value(input5, /*backgroundLineStrokeWidth*/ ctx[10]);
    			append_dev(label4, t10);
    			append_dev(label4, input6);
    			set_input_value(input6, /*backgroundLineStrokeWidth*/ ctx[10]);
    			insert_dev(target, t11, anchor);
    			insert_dev(target, label5, anchor);
    			append_dev(label5, t12);
    			append_dev(label5, input7);
    			set_input_value(input7, /*outerCircleRadius*/ ctx[11]);
    			append_dev(label5, t13);
    			append_dev(label5, input8);
    			set_input_value(input8, /*outerCircleRadius*/ ctx[11]);
    			insert_dev(target, t14, anchor);
    			insert_dev(target, label6, anchor);
    			append_dev(label6, t15);
    			append_dev(label6, input9);
    			set_input_value(input9, /*innerCircleRadius*/ ctx[12]);
    			append_dev(label6, t16);
    			append_dev(label6, input10);
    			set_input_value(input10, /*innerCircleRadius*/ ctx[12]);
    			insert_dev(target, t17, anchor);
    			insert_dev(target, label7, anchor);
    			append_dev(label7, t18);
    			append_dev(label7, input11);
    			set_input_value(input11, /*vertSpace*/ ctx[6]);
    			append_dev(label7, t19);
    			append_dev(label7, input12);
    			set_input_value(input12, /*vertSpace*/ ctx[6]);
    			insert_dev(target, t20, anchor);
    			insert_dev(target, label8, anchor);
    			append_dev(label8, t21);
    			append_dev(label8, input13);
    			set_input_value(input13, /*countyColour*/ ctx[1]);
    			insert_dev(target, t22, anchor);
    			insert_dev(target, label9, anchor);
    			append_dev(label9, t23);
    			append_dev(label9, input14);
    			set_input_value(input14, /*countyLevelCityColour*/ ctx[2]);
    			insert_dev(target, t24, anchor);
    			insert_dev(target, label10, anchor);
    			append_dev(label10, t25);
    			append_dev(label10, input15);
    			set_input_value(input15, /*districtColour*/ ctx[3]);
    			insert_dev(target, t26, anchor);
    			insert_dev(target, label11, anchor);
    			append_dev(label11, t27);
    			append_dev(label11, input16);
    			set_input_value(input16, /*prefectureLevelCityColour*/ ctx[4]);
    			insert_dev(target, t28, anchor);
    			insert_dev(target, label12, anchor);
    			append_dev(label12, t29);
    			append_dev(label12, input17);
    			set_input_value(input17, /*autonomousCountyColour*/ ctx[5]);
    			insert_dev(target, t30, anchor);
    			insert_dev(target, svg, anchor);

    			for (let i = 0; i < each_blocks_5.length; i += 1) {
    				each_blocks_5[i].m(svg, null);
    			}

    			append_dev(svg, each0_anchor);

    			for (let i = 0; i < each_blocks_4.length; i += 1) {
    				each_blocks_4[i].m(svg, null);
    			}

    			append_dev(svg, each1_anchor);

    			for (let i = 0; i < each_blocks_3.length; i += 1) {
    				each_blocks_3[i].m(svg, null);
    			}

    			append_dev(svg, each2_anchor);

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].m(svg, null);
    			}

    			append_dev(svg, each3_anchor);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(svg, null);
    			}

    			append_dev(svg, each4_anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(svg, null);
    			}

    			insert_dev(target, t31, anchor);
    			insert_dev(target, label13, anchor);
    			append_dev(label13, t32);
    			append_dev(label13, input18);
    			set_input_value(input18, /*countyColour*/ ctx[1]);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "change", /*input0_change_handler*/ ctx[23]),
    					listen_dev(input1, "change", /*input1_change_handler*/ ctx[24]),
    					listen_dev(input2, "input", /*input2_input_handler*/ ctx[25]),
    					listen_dev(input3, "change", /*input3_change_input_handler*/ ctx[26]),
    					listen_dev(input3, "input", /*input3_change_input_handler*/ ctx[26]),
    					listen_dev(input4, "input", /*input4_input_handler*/ ctx[27]),
    					listen_dev(input5, "input", /*input5_input_handler*/ ctx[28]),
    					listen_dev(input6, "change", /*input6_change_input_handler*/ ctx[29]),
    					listen_dev(input6, "input", /*input6_change_input_handler*/ ctx[29]),
    					listen_dev(input7, "input", /*input7_input_handler*/ ctx[30]),
    					listen_dev(input8, "change", /*input8_change_input_handler*/ ctx[31]),
    					listen_dev(input8, "input", /*input8_change_input_handler*/ ctx[31]),
    					listen_dev(input9, "input", /*input9_input_handler*/ ctx[32]),
    					listen_dev(input10, "change", /*input10_change_input_handler*/ ctx[33]),
    					listen_dev(input10, "input", /*input10_change_input_handler*/ ctx[33]),
    					listen_dev(input11, "input", /*input11_input_handler*/ ctx[34]),
    					listen_dev(input12, "change", /*input12_change_input_handler*/ ctx[35]),
    					listen_dev(input12, "input", /*input12_change_input_handler*/ ctx[35]),
    					listen_dev(input13, "input", /*input13_input_handler*/ ctx[36]),
    					listen_dev(input14, "input", /*input14_input_handler*/ ctx[37]),
    					listen_dev(input15, "input", /*input15_input_handler*/ ctx[38]),
    					listen_dev(input16, "input", /*input16_input_handler*/ ctx[39]),
    					listen_dev(input17, "input", /*input17_input_handler*/ ctx[40]),
    					listen_dev(input18, "input", /*input18_input_handler*/ ctx[41])
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*highlight*/ 256) {
    				input0.checked = /*highlight*/ ctx[8];
    			}

    			if (dirty[0] & /*compact*/ 1) {
    				input1.checked = /*compact*/ ctx[0];
    			}

    			if (dirty[0] & /*lineStrokeWidth*/ 512 && to_number(input2.value) !== /*lineStrokeWidth*/ ctx[9]) {
    				set_input_value(input2, /*lineStrokeWidth*/ ctx[9]);
    			}

    			if (dirty[0] & /*lineStrokeWidth*/ 512) {
    				set_input_value(input3, /*lineStrokeWidth*/ ctx[9]);
    			}

    			if (dirty[0] & /*connectingLineColour*/ 8192) {
    				set_input_value(input4, /*connectingLineColour*/ ctx[13]);
    			}

    			if (dirty[0] & /*backgroundLineStrokeWidth*/ 1024 && to_number(input5.value) !== /*backgroundLineStrokeWidth*/ ctx[10]) {
    				set_input_value(input5, /*backgroundLineStrokeWidth*/ ctx[10]);
    			}

    			if (dirty[0] & /*backgroundLineStrokeWidth*/ 1024) {
    				set_input_value(input6, /*backgroundLineStrokeWidth*/ ctx[10]);
    			}

    			if (dirty[0] & /*outerCircleRadius*/ 2048 && to_number(input7.value) !== /*outerCircleRadius*/ ctx[11]) {
    				set_input_value(input7, /*outerCircleRadius*/ ctx[11]);
    			}

    			if (dirty[0] & /*outerCircleRadius*/ 2048) {
    				set_input_value(input8, /*outerCircleRadius*/ ctx[11]);
    			}

    			if (dirty[0] & /*innerCircleRadius*/ 4096 && to_number(input9.value) !== /*innerCircleRadius*/ ctx[12]) {
    				set_input_value(input9, /*innerCircleRadius*/ ctx[12]);
    			}

    			if (dirty[0] & /*innerCircleRadius*/ 4096) {
    				set_input_value(input10, /*innerCircleRadius*/ ctx[12]);
    			}

    			if (dirty[0] & /*vertSpace*/ 64 && to_number(input11.value) !== /*vertSpace*/ ctx[6]) {
    				set_input_value(input11, /*vertSpace*/ ctx[6]);
    			}

    			if (dirty[0] & /*vertSpace*/ 64) {
    				set_input_value(input12, /*vertSpace*/ ctx[6]);
    			}

    			if (dirty[0] & /*countyColour*/ 2) {
    				set_input_value(input13, /*countyColour*/ ctx[1]);
    			}

    			if (dirty[0] & /*countyLevelCityColour*/ 4) {
    				set_input_value(input14, /*countyLevelCityColour*/ ctx[2]);
    			}

    			if (dirty[0] & /*districtColour*/ 8) {
    				set_input_value(input15, /*districtColour*/ ctx[3]);
    			}

    			if (dirty[0] & /*prefectureLevelCityColour*/ 16) {
    				set_input_value(input16, /*prefectureLevelCityColour*/ ctx[4]);
    			}

    			if (dirty[0] & /*autonomousCountyColour*/ 32) {
    				set_input_value(input17, /*autonomousCountyColour*/ ctx[5]);
    			}

    			if (dirty[0] & /*lineGenerator, lineData, connectingLineColour, highlight, highlightIDs, lineStrokeWidth, backgroundLineStrokeWidth*/ 1140480) {
    				each_value_7 = /*lineData*/ ctx[20];
    				validate_each_argument(each_value_7);
    				let i;

    				for (i = 0; i < each_value_7.length; i += 1) {
    					const child_ctx = get_each_context_7(ctx, each_value_7, i);

    					if (each_blocks_5[i]) {
    						each_blocks_5[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_5[i] = create_each_block_7(child_ctx);
    						each_blocks_5[i].c();
    						each_blocks_5[i].m(svg, each0_anchor);
    					}
    				}

    				for (; i < each_blocks_5.length; i += 1) {
    					each_blocks_5[i].d(1);
    				}

    				each_blocks_5.length = each_value_7.length;
    			}

    			if (dirty[0] & /*lineGenerator, splitData, highlight, backgroundLineStrokeWidth*/ 2114816) {
    				each_value_6 = /*splitData*/ ctx[21];
    				validate_each_argument(each_value_6);
    				let i;

    				for (i = 0; i < each_value_6.length; i += 1) {
    					const child_ctx = get_each_context_6(ctx, each_value_6, i);

    					if (each_blocks_4[i]) {
    						each_blocks_4[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_4[i] = create_each_block_6(child_ctx);
    						each_blocks_4[i].c();
    						each_blocks_4[i].m(svg, each1_anchor);
    					}
    				}

    				for (; i < each_blocks_4.length; i += 1) {
    					each_blocks_4[i].d(1);
    				}

    				each_blocks_4.length = each_value_6.length;
    			}

    			if (dirty[0] & /*lineGenerator, splitData, connectingLineColour, highlight, lineStrokeWidth*/ 2122496) {
    				each_value_5 = /*splitData*/ ctx[21];
    				validate_each_argument(each_value_5);
    				let i;

    				for (i = 0; i < each_value_5.length; i += 1) {
    					const child_ctx = get_each_context_5(ctx, each_value_5, i);

    					if (each_blocks_3[i]) {
    						each_blocks_3[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_3[i] = create_each_block_5(child_ctx);
    						each_blocks_3[i].c();
    						each_blocks_3[i].m(svg, each2_anchor);
    					}
    				}

    				for (; i < each_blocks_3.length; i += 1) {
    					each_blocks_3[i].d(1);
    				}

    				each_blocks_3.length = each_value_5.length;
    			}

    			if (dirty[0] & /*vizHierarchyData, x, vertSpace, cols, highlightIDs, highlight, divisionNames, yearExtent, innerCircleRadius, outerCircleRadius*/ 1022400) {
    				each_value_2 = /*vizHierarchyData*/ ctx[19];
    				validate_each_argument(each_value_2);
    				let i;

    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2(ctx, each_value_2, i);

    					if (each_blocks_2[i]) {
    						each_blocks_2[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_2[i] = create_each_block_2(child_ctx);
    						each_blocks_2[i].c();
    						each_blocks_2[i].m(svg, each3_anchor);
    					}
    				}

    				for (; i < each_blocks_2.length; i += 1) {
    					each_blocks_2[i].d(1);
    				}

    				each_blocks_2.length = each_value_2.length;
    			}

    			if (dirty[0] & /*x, boundaryChanges, vertSpace, districtColour*/ 4194504) {
    				each_value_1 = /*boundaryChanges*/ ctx[22];
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_1[i] = create_each_block_1(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(svg, each4_anchor);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}

    				each_blocks_1.length = each_value_1.length;
    			}

    			if (dirty[0] & /*cols*/ 32768) {
    				each_value = Object.keys(/*cols*/ ctx[15]);
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(svg, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty[0] & /*countyColour*/ 2) {
    				set_input_value(input18, /*countyColour*/ ctx[1]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(label0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(label1);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(label2);
    			if (detaching) detach_dev(t6);
    			if (detaching) detach_dev(label3);
    			if (detaching) detach_dev(t8);
    			if (detaching) detach_dev(label4);
    			if (detaching) detach_dev(t11);
    			if (detaching) detach_dev(label5);
    			if (detaching) detach_dev(t14);
    			if (detaching) detach_dev(label6);
    			if (detaching) detach_dev(t17);
    			if (detaching) detach_dev(label7);
    			if (detaching) detach_dev(t20);
    			if (detaching) detach_dev(label8);
    			if (detaching) detach_dev(t22);
    			if (detaching) detach_dev(label9);
    			if (detaching) detach_dev(t24);
    			if (detaching) detach_dev(label10);
    			if (detaching) detach_dev(t26);
    			if (detaching) detach_dev(label11);
    			if (detaching) detach_dev(t28);
    			if (detaching) detach_dev(label12);
    			if (detaching) detach_dev(t30);
    			if (detaching) detach_dev(svg);
    			destroy_each(each_blocks_5, detaching);
    			destroy_each(each_blocks_4, detaching);
    			destroy_each(each_blocks_3, detaching);
    			destroy_each(each_blocks_2, detaching);
    			destroy_each(each_blocks_1, detaching);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(t31);
    			if (detaching) detach_dev(label13);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const dehighlightOpacity = 0.2;
    const width = 800;
    const height = 500;

    // Get the coordinates of a division from its id and the hierarchydata
    // This is one array for each id, with id, year and values.year and values.y properties
    function getCoords(id, hierarchydata) {
    	let divisionCoords = hierarchydata.map(yr => {
    		let obj = {};
    		obj.year = yr.year;
    		obj.id = id;
    		let y;

    		if (typeof yr.divisions.find(d => d.data.data.divisionID === id) !== "undefined") {
    			y = yr.divisions.find(d => d.data.data.divisionID === id).y;
    		} else {
    			y = null;
    		}

    		obj.values = { year: yr.year, y };
    		return obj;
    	});

    	return divisionCoords;
    }

    function instance($$self, $$props, $$invalidate) {
    	let x;
    	let cols;
    	let lineGenerator;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let keepCentral = true;
    	let highlight = false;
    	let compact = false;
    	const highlightIDs = [1, 2, 3, 10, 14];
    	let lineStrokeWidth = 3;
    	let backgroundLineStrokeWidth = 0;
    	let outerCircleRadius = 9;
    	let innerCircleRadius = 6;
    	let connectingLineColour = "#cccccc";
    	let countyColour = "#DA3B32";
    	let countyLevelCityColour = "#000000";
    	let districtColour = "#3463da";
    	let prefectureLevelCityColour = "#dacc34";
    	let autonomousCountyColour = "#a2c6eb";

    	const divisionNames = {
    		Longmen: "?????????",
    		Boluo: "?????????",
    		Huiyang: "?????????",
    		Huidong: "?????????",
    		Huicheng: "?????????",
    		Longchuan: "?????????",
    		Heping: "?????????",
    		Lianping: "?????????",
    		Yuancheng: "?????????",
    		Zijin: "?????????",
    		Luhe: "?????????",
    		Haifeng: "?????????",
    		Lufeng: "?????????",
    		Dongguan: "?????????",
    		"Shanwei urban": "????????????",
    		Nanshan: "?????????",
    		Dongyuan: "?????????",
    		Futian: "?????????",
    		Shenzen: "?????????",
    		Luohu: "?????????",
    		Yantian: "?????????",
    		Longgang: "?????????"
    	};

    	let vizData = huizhouData;

    	//let vizData = kunmingData;
    	// Extent of the years in the data
    	let yearExtent = extent(vizData, d => d.year);

    	// Add some some padding left and right
    	let yearDomain = [yearExtent[0] - 1, yearExtent[1] + 1];

    	let pointYearDomain = vizData.map(d => d.year);

    	let vizHierarchyData = vizData.map(d => {
    		let obj = {};
    		obj.year = d.year;
    		obj.divisions = returnDivisions(d, keepCentral);
    		return obj;
    	});

    	function returnDivisions(level, keepcentral) {
    		// Create a D3 hierarchy from the data
    		let huizhouHierarchy = hierarchy(level.data);

    		let secondLevels = huizhouHierarchy.children;

    		// This array will hold the divisions data, with their y positions
    		let divisions = [];

    		let y = 0;

    		secondLevels.forEach(d => {
    			let childDivisions = d.children.map((div, divInd) => {
    				let divisionObj = {};
    				divisionObj.data = div;
    				divisionObj.year = div.data.year;

    				// The y property of each division contains the index of its vertical position
    				// Reposition the first two downwards to keep Huizhou in the middle for 1978 and 1979
    				if (level.year === 1978 && keepcentral) {
    					divisionObj.y = divInd + y + 2;
    				} else if (level.year === 1979 && keepcentral) {
    					divisionObj.y = divInd + y + 1;
    				} else if ((level.year === 1983 || level.year === 1985) && keepcentral && div.data.divisionID !== 9 && div.data.divisionID !== 11) {
    					divisionObj.y = divInd + y + 1; /* Push everything down in 83 and 85 to keep Huizhou in the middle (id's 9 and 11 are the first 2 ones)  */
    				} else {
    					divisionObj.y = divInd + y;
    				}

    				return divisionObj;
    			});

    			divisions = divisions.concat(childDivisions);

    			// shift everything 1 y-step further down after each second level
    			y += childDivisions.length + 1;
    		});

    		return divisions;
    	}

    	// Get all the data for the lines
    	const lineData = Array.from({ length: 16 }, (_, i) => i + 1).map(d => getCoords(d, vizHierarchyData));

    	// Vertical spacing between the nodes
    	let vertSpace = 14;

    	// Colours
    	let cols2 = {
    		County: { fill: "#6CDB8B", stroke: "#1D6F1C" },
    		countyLevelCity: { fill: "#fde0ef", stroke: "#d973a8" },
    		district: { fill: "#e9a3c9", stroke: "#bf3d81" },
    		prefectureLevelCity: { fill: "#bf3d81", stroke: "#c51b7d" },
    		AutonomousCounty: { fill: "#a2c6eb", stroke: "#2d6196" }
    	};

    	const splitData = [
    		[
    			{
    				values: { year: 1985, y: keepCentral ? 8 : 7 }
    			},
    			{ values: { year: 1988, y: 10 } }
    		],
    		[
    			{
    				values: { year: 1985, y: keepCentral ? 8 : 7 }
    			},
    			{ values: { year: 1988, y: 11 } }
    		]
    	];

    	const boundaryChanges = [
    		{ year: 2003, y: 4, status: "district" },
    		{ year: 2003, y: 5, status: "shrink" },
    		{ year: 2003, y: 6, status: "shrink" }
    	];

    	const writable_props = [];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	function input0_change_handler() {
    		highlight = this.checked;
    		$$invalidate(8, highlight);
    	}

    	function input1_change_handler() {
    		compact = this.checked;
    		$$invalidate(0, compact);
    	}

    	function input2_input_handler() {
    		lineStrokeWidth = to_number(this.value);
    		$$invalidate(9, lineStrokeWidth);
    	}

    	function input3_change_input_handler() {
    		lineStrokeWidth = to_number(this.value);
    		$$invalidate(9, lineStrokeWidth);
    	}

    	function input4_input_handler() {
    		connectingLineColour = this.value;
    		$$invalidate(13, connectingLineColour);
    	}

    	function input5_input_handler() {
    		backgroundLineStrokeWidth = to_number(this.value);
    		$$invalidate(10, backgroundLineStrokeWidth);
    	}

    	function input6_change_input_handler() {
    		backgroundLineStrokeWidth = to_number(this.value);
    		$$invalidate(10, backgroundLineStrokeWidth);
    	}

    	function input7_input_handler() {
    		outerCircleRadius = to_number(this.value);
    		$$invalidate(11, outerCircleRadius);
    	}

    	function input8_change_input_handler() {
    		outerCircleRadius = to_number(this.value);
    		$$invalidate(11, outerCircleRadius);
    	}

    	function input9_input_handler() {
    		innerCircleRadius = to_number(this.value);
    		$$invalidate(12, innerCircleRadius);
    	}

    	function input10_change_input_handler() {
    		innerCircleRadius = to_number(this.value);
    		$$invalidate(12, innerCircleRadius);
    	}

    	function input11_input_handler() {
    		vertSpace = to_number(this.value);
    		$$invalidate(6, vertSpace);
    	}

    	function input12_change_input_handler() {
    		vertSpace = to_number(this.value);
    		$$invalidate(6, vertSpace);
    	}

    	function input13_input_handler() {
    		countyColour = this.value;
    		$$invalidate(1, countyColour);
    	}

    	function input14_input_handler() {
    		countyLevelCityColour = this.value;
    		$$invalidate(2, countyLevelCityColour);
    	}

    	function input15_input_handler() {
    		districtColour = this.value;
    		$$invalidate(3, districtColour);
    	}

    	function input16_input_handler() {
    		prefectureLevelCityColour = this.value;
    		$$invalidate(4, prefectureLevelCityColour);
    	}

    	function input17_input_handler() {
    		autonomousCountyColour = this.value;
    		$$invalidate(5, autonomousCountyColour);
    	}

    	function input18_input_handler() {
    		countyColour = this.value;
    		$$invalidate(1, countyColour);
    	}

    	$$self.$capture_state = () => ({
    		huizhouData,
    		kunmingData,
    		hierarchy,
    		scaleLinear: linear,
    		scalePoint: point,
    		line,
    		curveBumpX: bumpX,
    		extent,
    		keepCentral,
    		highlight,
    		compact,
    		highlightIDs,
    		dehighlightOpacity,
    		lineStrokeWidth,
    		backgroundLineStrokeWidth,
    		outerCircleRadius,
    		innerCircleRadius,
    		connectingLineColour,
    		countyColour,
    		countyLevelCityColour,
    		districtColour,
    		prefectureLevelCityColour,
    		autonomousCountyColour,
    		divisionNames,
    		vizData,
    		yearExtent,
    		yearDomain,
    		pointYearDomain,
    		width,
    		height,
    		vizHierarchyData,
    		returnDivisions,
    		getCoords,
    		lineData,
    		vertSpace,
    		cols2,
    		splitData,
    		boundaryChanges,
    		x,
    		lineGenerator,
    		cols
    	});

    	$$self.$inject_state = $$props => {
    		if ('keepCentral' in $$props) keepCentral = $$props.keepCentral;
    		if ('highlight' in $$props) $$invalidate(8, highlight = $$props.highlight);
    		if ('compact' in $$props) $$invalidate(0, compact = $$props.compact);
    		if ('lineStrokeWidth' in $$props) $$invalidate(9, lineStrokeWidth = $$props.lineStrokeWidth);
    		if ('backgroundLineStrokeWidth' in $$props) $$invalidate(10, backgroundLineStrokeWidth = $$props.backgroundLineStrokeWidth);
    		if ('outerCircleRadius' in $$props) $$invalidate(11, outerCircleRadius = $$props.outerCircleRadius);
    		if ('innerCircleRadius' in $$props) $$invalidate(12, innerCircleRadius = $$props.innerCircleRadius);
    		if ('connectingLineColour' in $$props) $$invalidate(13, connectingLineColour = $$props.connectingLineColour);
    		if ('countyColour' in $$props) $$invalidate(1, countyColour = $$props.countyColour);
    		if ('countyLevelCityColour' in $$props) $$invalidate(2, countyLevelCityColour = $$props.countyLevelCityColour);
    		if ('districtColour' in $$props) $$invalidate(3, districtColour = $$props.districtColour);
    		if ('prefectureLevelCityColour' in $$props) $$invalidate(4, prefectureLevelCityColour = $$props.prefectureLevelCityColour);
    		if ('autonomousCountyColour' in $$props) $$invalidate(5, autonomousCountyColour = $$props.autonomousCountyColour);
    		if ('vizData' in $$props) vizData = $$props.vizData;
    		if ('yearExtent' in $$props) $$invalidate(18, yearExtent = $$props.yearExtent);
    		if ('yearDomain' in $$props) $$invalidate(44, yearDomain = $$props.yearDomain);
    		if ('pointYearDomain' in $$props) $$invalidate(45, pointYearDomain = $$props.pointYearDomain);
    		if ('vizHierarchyData' in $$props) $$invalidate(19, vizHierarchyData = $$props.vizHierarchyData);
    		if ('vertSpace' in $$props) $$invalidate(6, vertSpace = $$props.vertSpace);
    		if ('cols2' in $$props) cols2 = $$props.cols2;
    		if ('x' in $$props) $$invalidate(7, x = $$props.x);
    		if ('lineGenerator' in $$props) $$invalidate(14, lineGenerator = $$props.lineGenerator);
    		if ('cols' in $$props) $$invalidate(15, cols = $$props.cols);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*compact*/ 1) {
    			$$invalidate(7, x = compact
    			? point().domain(pointYearDomain).range([80, 250])
    			: linear().domain(yearDomain).range([60, width - 120]));
    		}

    		if ($$self.$$.dirty[0] & /*countyColour, countyLevelCityColour, districtColour, prefectureLevelCityColour, autonomousCountyColour*/ 62) {
    			$$invalidate(15, cols = {
    				County: { fill: countyColour, stroke: "#ffffff" },
    				countyLevelCity: {
    					fill: countyLevelCityColour,
    					stroke: "#ffffff"
    				},
    				district: { fill: districtColour, stroke: "#ffffff" },
    				prefectureLevelCity: {
    					fill: prefectureLevelCityColour,
    					stroke: "#ffffff"
    				},
    				AutonomousCounty: {
    					fill: autonomousCountyColour,
    					stroke: "#2d6196"
    				}
    			});
    		}

    		if ($$self.$$.dirty[0] & /*x, vertSpace*/ 192) {
    			$$invalidate(14, lineGenerator = line().x(d => x(d.values.year)).y(d => 20 + d.values.y * vertSpace).defined(d => d.values.y !== null).curve(bumpX));
    		}
    	};

    	return [
    		compact,
    		countyColour,
    		countyLevelCityColour,
    		districtColour,
    		prefectureLevelCityColour,
    		autonomousCountyColour,
    		vertSpace,
    		x,
    		highlight,
    		lineStrokeWidth,
    		backgroundLineStrokeWidth,
    		outerCircleRadius,
    		innerCircleRadius,
    		connectingLineColour,
    		lineGenerator,
    		cols,
    		highlightIDs,
    		divisionNames,
    		yearExtent,
    		vizHierarchyData,
    		lineData,
    		splitData,
    		boundaryChanges,
    		input0_change_handler,
    		input1_change_handler,
    		input2_input_handler,
    		input3_change_input_handler,
    		input4_input_handler,
    		input5_input_handler,
    		input6_change_input_handler,
    		input7_input_handler,
    		input8_change_input_handler,
    		input9_input_handler,
    		input10_change_input_handler,
    		input11_input_handler,
    		input12_change_input_handler,
    		input13_input_handler,
    		input14_input_handler,
    		input15_input_handler,
    		input16_input_handler,
    		input17_input_handler,
    		input18_input_handler
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {}, null, [-1, -1, -1]);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    var app = new App({
    	target: document.body
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
