/**
 * Cupertino Pane 1.0.9
 * Multiplatform slide-over pane
 * https://github.com/roman-rr/cupertino-pane/
 *
 * Copyright 2019-2020 Roman Antonov (roman-rr)
 *
 * Released under the MIT License
 *
 * Released on: February 21, 2020
 */

class Support {
    static get touch() {
        return (window['Modernizr'] && window['Modernizr'].touch === true) || (function checkTouch() {
            return !!((window.navigator.maxTouchPoints > 0) || ('ontouchstart' in window) || (window['DocumentTouch'] && document instanceof window['DocumentTouch']));
        }());
    }
    static get observer() {
        return ('MutationObserver' in window || 'WebkitMutationObserver' in window);
    }
    static get passiveListener() {
        let supportsPassive = false;
        try {
            const opts = Object.defineProperty({}, 'passive', {
                // eslint-disable-next-line
                get() {
                    supportsPassive = true;
                },
            });
            window.addEventListener('testPassiveListener', null, opts);
        }
        catch (e) {
            // No support
        }
        return supportsPassive;
    }
    static get gestures() {
        return 'ongesturestart' in window;
    }
    static pointerEvents() {
    }
}

class Device {
    constructor() {
        this.ios = false;
        this.android = false;
        this.androidChrome = false;
        this.desktop = false;
        this.iphone = false;
        this.ipod = false;
        this.ipad = false;
        this.edge = false;
        this.ie = false;
        this.firefox = false;
        this.macos = false;
        this.windows = false;
        this.cordova = !!(window['cordova'] || window['phonegap']);
        this.phonegap = !!(window['cordova'] || window['phonegap']);
        this.electron = false;
        const platform = window.navigator.platform;
        const ua = window.navigator.userAgent;
        const screenWidth = window.screen.width;
        const screenHeight = window.screen.height;
        let android = ua.match(/(Android);?[\s\/]+([\d.]+)?/); // eslint-disable-line
        let ipad = ua.match(/(iPad).*OS\s([\d_]+)/);
        let ipod = ua.match(/(iPod)(.*OS\s([\d_]+))?/);
        let iphone = !this.ipad && ua.match(/(iPhone\sOS|iOS)\s([\d_]+)/);
        let ie = ua.indexOf('MSIE ') >= 0 || ua.indexOf('Trident/') >= 0;
        let edge = ua.indexOf('Edge/') >= 0;
        let firefox = ua.indexOf('Gecko/') >= 0 && ua.indexOf('Firefox/') >= 0;
        let windows = platform === 'Win32';
        let electron = ua.toLowerCase().indexOf('electron') >= 0;
        let macos = platform === 'MacIntel';
        // iPadOs 13 fix
        if (!ipad
            && macos
            && Support.touch
            && ((screenWidth === 1024 && screenHeight === 1366) // Pro 12.9
                || (screenWidth === 834 && screenHeight === 1194) // Pro 11
                || (screenWidth === 834 && screenHeight === 1112) // Pro 10.5
                || (screenWidth === 768 && screenHeight === 1024) // other
            )) {
            ipad = ua.match(/(Version)\/([\d.]+)/);
            macos = false;
        }
        this.ie = ie;
        this.edge = edge;
        this.firefox = firefox;
        // Android
        if (android && !windows) {
            this.os = 'android';
            this.osVersion = android[2];
            this.android = true;
            this.androidChrome = ua.toLowerCase().indexOf('chrome') >= 0;
        }
        if (ipad || iphone || ipod) {
            this.os = 'ios';
            this.ios = true;
        }
        // iOS
        if (iphone && !ipod) {
            this.osVersion = iphone[2].replace(/_/g, '.');
            this.iphone = true;
        }
        if (ipad) {
            this.osVersion = ipad[2].replace(/_/g, '.');
            this.ipad = true;
        }
        if (ipod) {
            this.osVersion = ipod[3] ? ipod[3].replace(/_/g, '.') : null;
            this.ipod = true;
        }
        // iOS 8+ changed UA
        if (this.ios && this.osVersion && ua.indexOf('Version/') >= 0) {
            if (this.osVersion.split('.')[0] === '10') {
                this.osVersion = ua.toLowerCase().split('version/')[1].split(' ')[0];
            }
        }
        // Webview
        this.webView = !!((iphone || ipad || ipod) && (ua.match(/.*AppleWebKit(?!.*Safari)/i) || window.navigator['standalone']))
            || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
        this.webview = this.webView;
        this.standalone = this.webView;
        // Desktop
        this.desktop = !(this.ios || this.android) || electron;
        if (this.desktop) {
            this.electron = electron;
            this.macos = macos;
            this.windows = windows;
            if (this.macos) {
                this.os = 'macos';
            }
            if (this.windows) {
                this.os = 'windows';
            }
        }
        // Pixel Ratio
        this.pixelRatio = window.devicePixelRatio || 1;
    }
}

class CupertinoPane {
    constructor(el, conf = {}) {
        this.el = el;
        this.settings = {
            initialBreak: 'middle',
            parentElement: null,
            backdrop: false,
            backdropTransparent: false,
            animationType: 'ease',
            animationDuration: 300,
            darkMode: false,
            bottomClose: false,
            freeMode: false,
            buttonClose: true,
            topperOverflow: true,
            topperOverflowOffset: 0,
            showDraggable: true,
            clickBottomOpen: true,
            simulateTouch: true,
            passiveListeners: true,
            breaks: {
                top: { enabled: true, offset: 0 },
                middle: { enabled: true, offset: 0 },
                bottom: { enabled: true, offset: 0 },
            },
            onDidDismiss: () => { },
            onWillDismiss: () => { },
            onDidPresent: () => { },
            onWillPresent: () => { },
            onDragStart: () => { },
            onDrag: () => { },
            onBackdropTap: () => { }
        };
        this.screen_height = window.screen.height;
        this.steps = [];
        this.pointerDown = false;
        this.breaks = {};
        this.brs = [];
        this.device = new Device();
        this.swipeNextPoint = (diff, maxDiff, closest) => {
            if (this.currentBreak === this.breaks['top']) {
                if (diff > maxDiff) {
                    if (this.settings.breaks['middle'].enabled) {
                        return this.breaks['middle'];
                    }
                    if (this.settings.breaks['bottom'].enabled) {
                        return this.breaks['bottom'];
                    }
                }
                return this.breaks['top'];
            }
            if (this.currentBreak === this.breaks['middle']) {
                if (diff < -maxDiff) {
                    if (this.settings.breaks['top'].enabled) {
                        return this.breaks['top'];
                    }
                }
                if (diff > maxDiff) {
                    if (this.settings.breaks['bottom'].enabled) {
                        return this.breaks['bottom'];
                    }
                }
                return this.breaks['middle'];
            }
            if (this.currentBreak === this.breaks['bottom']) {
                if (diff < -maxDiff) {
                    if (this.settings.breaks['middle'].enabled) {
                        return this.breaks['middle'];
                    }
                    if (this.settings.breaks['top'].enabled) {
                        return this.breaks['top'];
                    }
                }
                return this.breaks['bottom'];
            }
            return closest;
        };
        /************************************
         * Events
         */
        this.touchEvents = (() => {
            const touch = ['touchstart', 'touchmove', 'touchend', 'touchcancel'];
            let desktop = ['mousedown', 'mousemove', 'mouseup'];
            if (Support.pointerEvents) {
                desktop = ['pointerdown', 'pointermove', 'pointerup'];
            }
            const touchEventsTouch = {
                start: touch[0],
                move: touch[1],
                end: touch[2],
                cancel: touch[3],
            };
            const touchEventsDesktop = {
                start: desktop[0],
                move: desktop[1],
                end: desktop[2],
            };
            return Support.touch || !this.settings.simulateTouch ? touchEventsTouch : touchEventsDesktop;
        })();
        this.settings = Object.assign(Object.assign({}, this.settings), conf);
        this.el = document.querySelector(this.el);
        this.el.style.display = 'none';
        if (this.settings.parentElement) {
            this.settings.parentElement = document.querySelector(this.settings.parentElement);
        }
        else {
            this.settings.parentElement = this.el.parentElement;
        }
    }
    drawElements() {
        this.parentEl = this.settings.parentElement;
        // Wrapper
        this.wrapperEl = document.createElement('div');
        this.wrapperEl.className = `cupertino-pane-wrapper ${this.el.className}`;
        this.wrapperEl.style.position = 'absolute';
        this.wrapperEl.style.top = '0';
        this.wrapperEl.style.left = '0';
        // Panel
        this.paneEl = document.createElement('div');
        this.paneEl.className = 'pane';
        this.paneEl.style.position = 'fixed';
        this.paneEl.style.zIndex = '11';
        this.paneEl.style.width = '100%';
        this.paneEl.style.height = '100%';
        this.paneEl.style.background = '#ffffff';
        this.paneEl.style.borderTopLeftRadius = '20px';
        this.paneEl.style.borderTopRightRadius = '20px';
        this.paneEl.style.boxShadow = '0 4px 16px rgba(0,0,0,.12)';
        this.paneEl.style.overflow = 'hidden';
        this.paneEl.style.transform = `translateY(${this.breaks[this.settings.initialBreak]}px)`;
        // Draggable
        this.draggableEl = document.createElement('div');
        this.draggableEl.className = 'draggable';
        this.draggableEl.style.padding = '5px';
        // Move
        this.moveEl = document.createElement('div');
        this.moveEl.className = 'move';
        this.moveEl.style.margin = '0 auto';
        this.moveEl.style.height = '5px';
        this.moveEl.style.background = '#c0c0c0';
        this.moveEl.style.width = '36px';
        this.moveEl.style.borderRadius = '4px';
        // Content
        this.contentEl = this.el;
        this.contentEl.style.display = '';
        this.contentEl.style.transition = `opacity ${this.settings.animationDuration}ms ${this.settings.animationType} 0s`;
        this.contentEl.style.overflowX = 'hidden';
        // Backdrop
        this.backdropEl = document.createElement('div');
        this.backdropEl.className = 'backdrop';
        this.backdropEl.style.overflow = 'hidden';
        this.backdropEl.style.position = 'fixed';
        this.backdropEl.style.width = '100%';
        this.backdropEl.style.bottom = '0';
        this.backdropEl.style.right = '0';
        this.backdropEl.style.left = '0';
        this.backdropEl.style.top = '0';
        this.backdropEl.style.backgroundColor = 'rgba(0,0,0,.4)';
        this.backdropEl.style.zIndex = '10';
        this.backdropEl.style.opacity = this.settings.backdropTransparent ? '0' : '1';
        // Close button
        this.closeEl = document.createElement('div');
        this.closeEl.className = 'close-button';
        this.closeEl.style.width = '26px';
        this.closeEl.style.height = '26px';
        this.closeEl.style.position = 'absolute';
        this.closeEl.style.background = '#ebebeb';
        this.closeEl.style.top = '16px';
        this.closeEl.style.right = '20px';
        this.closeEl.style.borderRadius = '100%';
    }
    present(conf = { animate: false }) {
        if (document.querySelector(`.cupertino-pane-wrapper.${this.el.className.split(' ').join('.')}`)) {
            this.moveToBreak(this.settings.initialBreak);
            return;
        }
        // Emit event
        this.settings.onWillPresent();
        this.breaks = {
            top: 50,
            middle: Math.round(this.screen_height - (this.screen_height * 0.35)),
            bottom: this.screen_height - 80
        };
        ['top', 'middle', 'bottom'].forEach((val) => {
            // If initial break disabled - set first enabled
            if (!this.settings.breaks[this.settings.initialBreak].enabled) {
                if (this.settings.breaks[val].enabled) {
                    this.settings.initialBreak = val;
                }
            }
            // Add offsets
            if (this.settings.breaks[val]
                && this.settings.breaks[val].enabled
                && this.settings.breaks[val].offset) {
                this.breaks[val] -= this.settings.breaks[val].offset;
            }
        });
        this.currentBreak = this.breaks[this.settings.initialBreak];
        this.drawElements();
        this.parentEl.appendChild(this.wrapperEl);
        this.wrapperEl.appendChild(this.paneEl);
        this.paneEl.appendChild(this.draggableEl);
        this.paneEl.appendChild(this.contentEl);
        this.draggableEl.appendChild(this.moveEl);
        if (conf.animate) {
            this.paneEl.style.transform = `translateY(${this.screen_height}px)`;
            this.paneEl.style.transition = `transform ${this.settings.animationDuration}ms ${this.settings.animationType} 0s`;
            setTimeout(() => {
                this.paneEl.style.transform = `translateY(${this.breaks[this.settings.initialBreak]}px)`;
            }, 50);
            let initTransitionEv = this.paneEl.addEventListener('transitionend', (t) => {
                this.paneEl.style.transition = `initial`;
                initTransitionEv = undefined;
                // Emit event
                this.settings.onDidPresent();
            });
        }
        else {
            // Emit event
            this.settings.onDidPresent();
        }
        if (this.settings.backdrop) {
            this.wrapperEl.appendChild(this.backdropEl);
            if (this.settings.backdrop) {
                this.backdropEl.addEventListener('click', (t) => this.settings.onBackdropTap());
            }
        }
        if (!this.settings.showDraggable) {
            this.draggableEl.style.opacity = '0';
        }
        if (this.settings.darkMode) {
            this.paneEl.style.background = '#1c1c1d';
            this.paneEl.style.color = '#ffffff';
            this.moveEl.style.background = '#5a5a5e';
        }
        if (this.settings.buttonClose) {
            this.paneEl.appendChild(this.closeEl);
            this.closeEl.addEventListener('click', (t) => this.destroy({ animate: true }));
            let iconColor = '#7a7a7e';
            if (this.settings.darkMode) {
                this.closeEl.style.background = '#424246';
                iconColor = '#a8a7ae';
            }
            this.closeEl.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
          <path fill="${iconColor}" d="M278.6 256l68.2-68.2c6.2-6.2 6.2-16.4 0-22.6-6.2-6.2-16.4-6.2-22.6 0L256 233.4l-68.2-68.2c-6.2-6.2-16.4-6.2-22.6 0-3.1 3.1-4.7 7.2-4.7 11.3 0 4.1 1.6 8.2 4.7 11.3l68.2 68.2-68.2 68.2c-3.1 3.1-4.7 7.2-4.7 11.3 0 4.1 1.6 8.2 4.7 11.3 6.2 6.2 16.4 6.2 22.6 0l68.2-68.2 68.2 68.2c6.2 6.2 16.4 6.2 22.6 0 6.2-6.2 6.2-16.4 0-22.6L278.6 256z"/>
        </svg>`;
        }
        if (this.settings.bottomClose) {
            this.settings.breaks.bottom.enabled = true;
        }
        this.brs = [];
        ['top', 'middle', 'bottom'].forEach((val) => {
            if (this.settings.breaks[val].enabled) {
                this.brs.push(this.breaks[val]);
            }
        });
        // Determinate topper point
        this.topper = this.brs.reduce((prev, curr) => {
            return (Math.abs(curr) < Math.abs(prev) ? curr : prev);
        });
        // Determinate bottomer point
        this.bottomer = this.brs.reduce((prev, curr) => {
            return (Math.abs(curr) > Math.abs(prev) ? curr : prev);
        });
        // Get overflow element
        let attrElements = document.querySelectorAll(`.${this.el.className.split(' ')[0]} [overflow-y]`);
        if (!attrElements.length || attrElements.length > 1) {
            this.overflowEl = this.contentEl;
        }
        else {
            this.overflowEl = attrElements[0];
        }
        this.overflowEl.style.height = `${this.screen_height
            - this.breaks['top'] - 51
            - this.settings.topperOverflowOffset}px`;
        this.checkOpacityAttr(this.currentBreak);
        this.checkOverflowAttr(this.currentBreak);
        /****** Attach Events *******/
        this.attachEvents();
    }
    moveToBreak(val) {
        this.checkOpacityAttr(this.breaks[val]);
        this.checkOverflowAttr(this.breaks[val]);
        this.paneEl.style.transition = `transform ${this.settings.animationDuration}ms ${this.settings.animationType} 0s`;
        this.paneEl.style.transform = `translateY(${this.breaks[val]}px)`;
        let initTransitionEv = this.paneEl.addEventListener('transitionend', (t) => {
            this.paneEl.style.transition = `initial`;
            initTransitionEv = undefined;
        });
    }
    hide() {
        this.paneEl.style.transition = `transform ${this.settings.animationDuration}ms ${this.settings.animationType} 0s`;
        this.paneEl.style.transform = `translateY(${this.screen_height}px)`;
        let initTransitionEv = this.paneEl.addEventListener('transitionend', (t) => {
            this.paneEl.style.transition = `initial`;
            initTransitionEv = undefined;
        });
    }
    isHidden() {
        if (!document.querySelector(`.cupertino-pane-wrapper.${this.el.className.split(' ').join('.')}`)) {
            return null;
        }
        return this.paneEl.style.transform === `translateY(${this.screen_height}px)`;
    }
    checkOpacityAttr(val) {
        let attrElements = document.querySelectorAll(`.${this.el.className.split(' ')[0]} [hide-on-bottom]`);
        if (!attrElements.length)
            return;
        attrElements.forEach((item) => {
            item.style.transition = `opacity ${this.settings.animationDuration}ms ${this.settings.animationType} 0s`;
            item.style.opacity = (val >= this.breaks['bottom']) ? '0' : '1';
        });
    }
    checkOverflowAttr(val) {
        if (!this.settings.topperOverflow)
            return;
        this.overflowEl.style.overflowY = (val <= this.topper) ? 'auto' : 'hidden';
    }
    /**
     * Touch Start Event
     * @param t
     */
    touchStart(t) {
        const targetTouch = t.type === 'touchstart' && t.targetTouches && (t.targetTouches[0] || t.changedTouches[0]);
        const screenY = t.type === 'touchstart' ? targetTouch.screenY : t.screenY;
        if (t.type === 'pointerdown')
            this.pointerDown = true;
        // Event emitter
        this.settings.onDragStart();
        this.startP = screenY;
        this.steps.push(this.startP);
    }
    /**
     * Touch Move Event
     * @param t
     */
    touchMove(t) {
        // Handle desktop/mobile events
        const targetTouch = t.type === 'touchmove' && t.targetTouches && (t.targetTouches[0] || t.changedTouches[0]);
        const screenY = t.type === 'touchmove' ? targetTouch.screenY : t.screenY;
        if (t.type === 'pointermove' && !this.pointerDown)
            return;
        // Event emitter
        this.settings.onDrag();
        const translateYRegex = /\.*translateY\((.*)px\)/i;
        const p = parseFloat(translateYRegex.exec(this.paneEl.style.transform)[1]);
        // Delta
        const n = screenY;
        const diff = n - this.steps[this.steps.length - 1];
        const newVal = p + diff;
        // Not allow move panel with positive overflow scroll
        if (this.overflowEl.style.overflowY === 'auto') {
            this.overflowEl.addEventListener('scroll', (s) => {
                this.contentScrollTop = s.target.scrollTop;
            });
            if ((newVal > this.topper && this.contentScrollTop > 0)
                || (newVal <= this.topper)) {
                return;
            }
        }
        // Not allow drag upper than topper point
        // Not allow drag lower than bottom if free mode
        if ((newVal <= this.topper)
            || (this.settings.freeMode && !this.settings.bottomClose && (newVal >= this.bottomer))) {
            return;
        }
        this.checkOpacityAttr(newVal);
        this.checkOverflowAttr(newVal);
        this.paneEl.style.transition = 'initial';
        this.paneEl.style.transform = `translateY(${newVal}px)`;
        this.steps.push(n);
    }
    /**
     * Touch End Event
     * @param t
     */
    touchEnd(t) {
        const targetTouch = t.type === 'touchmove' && t.targetTouches && (t.targetTouches[0] || t.changedTouches[0]);
        const screenY = t.type === 'touchmove' ? targetTouch.screenY : t.screenY;
        if (t.type === 'pointerup')
            this.pointerDown = false;
        const translateYRegex = /\.*translateY\((.*)px\)/i;
        const p = parseFloat(translateYRegex.exec(this.paneEl.style.transform)[1]);
        // Determinate nearest point
        let closest = this.brs.reduce((prev, curr) => {
            return (Math.abs(curr - p) < Math.abs(prev - p) ? curr : prev);
        });
        // Swipe - next (if differ > 10)
        const diff = this.steps[this.steps.length - 1] - this.steps[this.steps.length - 2];
        // Set sensivity lower for web
        const swipeNextSensivity = window.hasOwnProperty('cordova') ? 4 : 3;
        if (Math.abs(diff) >= swipeNextSensivity) {
            closest = this.swipeNextPoint(diff, swipeNextSensivity, closest);
        }
        // Click to bottom - open middle
        if (this.settings.clickBottomOpen) {
            if (this.currentBreak === this.breaks['bottom'] && isNaN(diff)) {
                closest = this.settings.breaks['middle'].enabled
                    ? this.breaks['middle'] : this.settings.breaks['top'].enabled
                    ? this.breaks['top'] : this.breaks['bottom'];
            }
        }
        this.steps = [];
        this.currentBreak = closest;
        this.checkOpacityAttr(this.currentBreak);
        this.checkOverflowAttr(this.currentBreak);
        // Bottom closable
        if (this.settings.bottomClose && closest === this.breaks['bottom']) {
            this.destroy({ animate: true });
            return;
        }
        if (!this.settings.freeMode) {
            this.paneEl.style.transition = `transform ${this.settings.animationDuration}ms ${this.settings.animationType} 0s`;
            this.paneEl.style.transform = `translateY(${closest}px)`;
            let initTransitionEv = this.paneEl.addEventListener('transitionend', () => {
                this.paneEl.style.transition = `initial`;
                initTransitionEv = undefined;
            });
        }
    }
    destroy(conf = { animate: false }) {
        // Emit event
        this.settings.onWillDismiss();
        const resets = () => {
            this.parentEl.appendChild(this.contentEl);
            this.parentEl.removeChild(this.wrapperEl);
            /****** Detach Events *******/
            this.detachEvents();
            // Reset vars
            this.currentBreak = this.breaks[this.settings.initialBreak];
            // Reset styles
            this.contentEl.style.display = 'none';
            this.paneEl.style.transform = 'initial';
            // Emit event
            this.settings.onDidDismiss();
        };
        if (conf.animate) {
            this.paneEl.style.transition = `transform ${this.settings.animationDuration}ms ${this.settings.animationType} 0s`;
            this.paneEl.style.transform = `translateY(${this.screen_height}px)`;
            this.backdropEl.style.transition = `transform ${this.settings.animationDuration}ms ${this.settings.animationType} 0s`;
            this.backdropEl.style.backgroundColor = 'rgba(0,0,0,.0)';
            this.paneEl.addEventListener('transitionend', () => resets());
            return;
        }
        resets();
    }
    attachEvents() {
        // Touch Events
        if (!Support.touch && Support.pointerEvents) {
            this.paneEl.addEventListener(this.touchEvents.start, (t) => this.touchStart(t), false);
            this.paneEl.addEventListener(this.touchEvents.move, (t) => this.touchMove(t), false);
            this.paneEl.addEventListener(this.touchEvents.end, (t) => this.touchEnd(t), false);
        }
        else {
            if (Support.touch) {
                const passiveListener = this.touchEvents.start === 'touchstart' && Support.passiveListener && this.settings.passiveListeners ? { passive: true, capture: false } : false;
                this.paneEl.addEventListener(this.touchEvents.start, (t) => this.touchStart(t), passiveListener);
                this.paneEl.addEventListener(this.touchEvents.move, (t) => this.touchMove(t), Support.passiveListener ? { passive: false, capture: false } : false);
                this.paneEl.addEventListener(this.touchEvents.end, (t) => this.touchEnd(t), passiveListener);
                if (this.touchEvents['cancel']) {
                    this.paneEl.addEventListener(this.touchEvents['cancel'], (t) => this.touchEnd(t), passiveListener);
                }
            }
            if ((this.settings.simulateTouch && !this.device.ios && !this.device.android) || (this.settings.simulateTouch && !Support.touch && this.device.ios)) {
                this.paneEl.addEventListener('mousedown', (t) => this.touchStart(t), false);
                this.paneEl.addEventListener('mousemove', (t) => this.touchMove(t), false);
                this.paneEl.addEventListener('mouseup', (t) => this.touchEnd(t), false);
            }
        }
    }
    detachEvents() {
        // Touch Events
        if (!Support.touch && Support.pointerEvents) {
            this.paneEl.removeEventListener(this.touchEvents.start, (t) => this.touchStart(t), false);
            this.paneEl.removeEventListener(this.touchEvents.move, (t) => this.touchMove(t), false);
            this.paneEl.removeEventListener(this.touchEvents.end, (t) => this.touchEnd(t), false);
        }
        else {
            if (Support.touch) {
                const passiveListener = this.touchEvents.start === 'onTouchStart' && Support.passiveListener && this.settings.passiveListeners ? { passive: true, capture: false } : false;
                this.paneEl.removeEventListener(this.touchEvents.start, (t) => this.touchStart(t), passiveListener);
                this.paneEl.removeEventListener(this.touchEvents.move, (t) => this.touchMove(t), false);
                this.paneEl.removeEventListener(this.touchEvents.end, (t) => this.touchEnd(t), passiveListener);
                if (this.touchEvents['cancel']) {
                    this.paneEl.removeEventListener(this.touchEvents['cancel'], (t) => this.touchEnd(t), passiveListener);
                }
            }
            if ((this.settings.simulateTouch && !this.device.ios && !this.device.android) || (this.settings.simulateTouch && !Support.touch && this.device.ios)) {
                this.paneEl.removeEventListener('mousedown', (t) => this.touchStart(t), false);
                this.paneEl.removeEventListener('mousemove', (t) => this.touchMove(t), false);
                this.paneEl.removeEventListener('mouseup', (t) => this.touchEnd(t), false);
            }
        }
    }
}

export { CupertinoPane };
//# sourceMappingURL=cupertino-pane.esm.bundle.js.map
