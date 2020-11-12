/**
 * Copyright 2016 Google Inc. All Rights Reserved.
 *
 * Licensed under the W3C SOFTWARE AND DOCUMENT NOTICE AND LICENSE.
 *
 *  https://www.w3.org/Consortium/Legal/2015/copyright-software-and-document
 *
 */
(function() {
    'use strict';

// Exit early if we're not running in a browser.
    if (typeof window !== 'object') {
        return;
    }

// Exit early if all IntersectionObserver and IntersectionObserverEntry
// features are natively supported.
    if ('IntersectionObserver' in window &&
        'IntersectionObserverEntry' in window &&
        'intersectionRatio' in window.IntersectionObserverEntry.prototype) {

        // Minimal polyfill for Edge 15's lack of `isIntersecting`
        // See: https://github.com/w3c/IntersectionObserver/issues/211
        if (!('isIntersecting' in window.IntersectionObserverEntry.prototype)) {
            Object.defineProperty(window.IntersectionObserverEntry.prototype,
                'isIntersecting', {
                    get: function () {
                        return this.intersectionRatio > 0;
                    }
                });
        }
        return;
    }


    /**
     * A local reference to the document.
     */
    var document = window.document;


    /**
     * An IntersectionObserver registry. This registry exists to hold a strong
     * reference to IntersectionObserver instances currently observing a target
     * element. Without this registry, instances without another reference may be
     * garbage collected.
     */
    var registry = [];


    /**
     * Creates the global IntersectionObserverEntry constructor.
     * https://w3c.github.io/IntersectionObserver/#intersection-observer-entry
     * @param {Object} entry A dictionary of instance properties.
     * @constructor
     */
    function IntersectionObserverEntry(entry) {
        this.time = entry.time;
        this.target = entry.target;
        this.rootBounds = entry.rootBounds;
        this.boundingClientRect = entry.boundingClientRect;
        this.intersectionRect = entry.intersectionRect || getEmptyRect();
        this.isIntersecting = !!entry.intersectionRect;

        // Calculates the intersection ratio.
        var targetRect = this.boundingClientRect;
        var targetArea = targetRect.width * targetRect.height;
        var intersectionRect = this.intersectionRect;
        var intersectionArea = intersectionRect.width * intersectionRect.height;

        // Sets intersection ratio.
        if (targetArea) {
            // Round the intersection ratio to avoid floating point math issues:
            // https://github.com/w3c/IntersectionObserver/issues/324
            this.intersectionRatio = Number((intersectionArea / targetArea).toFixed(4));
        } else {
            // If area is zero and is intersecting, sets to 1, otherwise to 0
            this.intersectionRatio = this.isIntersecting ? 1 : 0;
        }
    }


    /**
     * Creates the global IntersectionObserver constructor.
     * https://w3c.github.io/IntersectionObserver/#intersection-observer-interface
     * @param {Function} callback The function to be invoked after intersection
     *     changes have queued. The function is not invoked if the queue has
     *     been emptied by calling the `takeRecords` method.
     * @param {Object=} opt_options Optional configuration options.
     * @constructor
     */
    function IntersectionObserver(callback, opt_options) {

        var options = opt_options || {};

        if (typeof callback != 'function') {
            throw new Error('callback must be a function');
        }

        if (options.root && options.root.nodeType != 1) {
            throw new Error('root must be an Element');
        }

        // Binds and throttles `this._checkForIntersections`.
        this._checkForIntersections = throttle(
            this._checkForIntersections.bind(this), this.THROTTLE_TIMEOUT);

        // Private properties.
        this._callback = callback;
        this._observationTargets = [];
        this._queuedEntries = [];
        this._rootMarginValues = this._parseRootMargin(options.rootMargin);

        // Public properties.
        this.thresholds = this._initThresholds(options.threshold);
        this.root = options.root || null;
        this.rootMargin = this._rootMarginValues.map(function(margin) {
            return margin.value + margin.unit;
        }).join(' ');
    }


    /**
     * The minimum interval within which the document will be checked for
     * intersection changes.
     */
    IntersectionObserver.prototype.THROTTLE_TIMEOUT = 100;


    /**
     * The frequency in which the polyfill polls for intersection changes.
     * this can be updated on a per instance basis and must be set prior to
     * calling `observe` on the first target.
     */
    IntersectionObserver.prototype.POLL_INTERVAL = null;

    /**
     * Use a mutation observer on the root element
     * to detect intersection changes.
     */
    IntersectionObserver.prototype.USE_MUTATION_OBSERVER = true;


    /**
     * Starts observing a target element for intersection changes based on
     * the thresholds values.
     * @param {Element} target The DOM element to observe.
     */
    IntersectionObserver.prototype.observe = function(target) {
        var isTargetAlreadyObserved = this._observationTargets.some(function(item) {
            return item.element == target;
        });

        if (isTargetAlreadyObserved) {
            return;
        }

        if (!(target && target.nodeType == 1)) {
            throw new Error('target must be an Element');
        }

        this._registerInstance();
        this._observationTargets.push({element: target, entry: null});
        this._monitorIntersections();
        this._checkForIntersections();
    };


    /**
     * Stops observing a target element for intersection changes.
     * @param {Element} target The DOM element to observe.
     */
    IntersectionObserver.prototype.unobserve = function(target) {
        this._observationTargets =
            this._observationTargets.filter(function(item) {

                return item.element != target;
            });
        if (!this._observationTargets.length) {
            this._unmonitorIntersections();
            this._unregisterInstance();
        }
    };


    /**
     * Stops observing all target elements for intersection changes.
     */
    IntersectionObserver.prototype.disconnect = function() {
        this._observationTargets = [];
        this._unmonitorIntersections();
        this._unregisterInstance();
    };


    /**
     * Returns any queue entries that have not yet been reported to the
     * callback and clears the queue. This can be used in conjunction with the
     * callback to obtain the absolute most up-to-date intersection information.
     * @return {Array} The currently queued entries.
     */
    IntersectionObserver.prototype.takeRecords = function() {
        var records = this._queuedEntries.slice();
        this._queuedEntries = [];
        return records;
    };


    /**
     * Accepts the threshold value from the user configuration object and
     * returns a sorted array of unique threshold values. If a value is not
     * between 0 and 1 and error is thrown.
     * @private
     * @param {Array|number=} opt_threshold An optional threshold value or
     *     a list of threshold values, defaulting to [0].
     * @return {Array} A sorted list of unique and valid threshold values.
     */
    IntersectionObserver.prototype._initThresholds = function(opt_threshold) {
        var threshold = opt_threshold || [0];
        if (!Array.isArray(threshold)) threshold = [threshold];

        return threshold.sort().filter(function(t, i, a) {
            if (typeof t != 'number' || isNaN(t) || t < 0 || t > 1) {
                throw new Error('threshold must be a number between 0 and 1 inclusively');
            }
            return t !== a[i - 1];
        });
    };


    /**
     * Accepts the rootMargin value from the user configuration object
     * and returns an array of the four margin values as an object containing
     * the value and unit properties. If any of the values are not properly
     * formatted or use a unit other than px or %, and error is thrown.
     * @private
     * @param {string=} opt_rootMargin An optional rootMargin value,
     *     defaulting to '0px'.
     * @return {Array<Object>} An array of margin objects with the keys
     *     value and unit.
     */
    IntersectionObserver.prototype._parseRootMargin = function(opt_rootMargin) {
        var marginString = opt_rootMargin || '0px';
        var margins = marginString.split(/\s+/).map(function(margin) {
            var parts = /^(-?\d*\.?\d+)(px|%)$/.exec(margin);
            if (!parts) {
                throw new Error('rootMargin must be specified in pixels or percent');
            }
            return {value: parseFloat(parts[1]), unit: parts[2]};
        });

        // Handles shorthand.
        margins[1] = margins[1] || margins[0];
        margins[2] = margins[2] || margins[0];
        margins[3] = margins[3] || margins[1];

        return margins;
    };


    /**
     * Starts polling for intersection changes if the polling is not already
     * happening, and if the page's visibility state is visible.
     * @private
     */
    IntersectionObserver.prototype._monitorIntersections = function() {
        if (!this._monitoringIntersections) {
            this._monitoringIntersections = true;

            // If a poll interval is set, use polling instead of listening to
            // resize and scroll events or DOM mutations.
            if (this.POLL_INTERVAL) {
                this._monitoringInterval = setInterval(
                    this._checkForIntersections, this.POLL_INTERVAL);
            }
            else {
                addEvent(window, 'resize', this._checkForIntersections, true);
                addEvent(document, 'scroll', this._checkForIntersections, true);

                if (this.USE_MUTATION_OBSERVER && 'MutationObserver' in window) {
                    this._domObserver = new MutationObserver(this._checkForIntersections);
                    this._domObserver.observe(document, {
                        attributes: true,
                        childList: true,
                        characterData: true,
                        subtree: true
                    });
                }
            }
        }
    };


    /**
     * Stops polling for intersection changes.
     * @private
     */
    IntersectionObserver.prototype._unmonitorIntersections = function() {
        if (this._monitoringIntersections) {
            this._monitoringIntersections = false;

            clearInterval(this._monitoringInterval);
            this._monitoringInterval = null;

            removeEvent(window, 'resize', this._checkForIntersections, true);
            removeEvent(document, 'scroll', this._checkForIntersections, true);

            if (this._domObserver) {
                this._domObserver.disconnect();
                this._domObserver = null;
            }
        }
    };


    /**
     * Scans each observation target for intersection changes and adds them
     * to the internal entries queue. If new entries are found, it
     * schedules the callback to be invoked.
     * @private
     */
    IntersectionObserver.prototype._checkForIntersections = function() {
        var rootIsInDom = this._rootIsInDom();
        var rootRect = rootIsInDom ? this._getRootRect() : getEmptyRect();

        this._observationTargets.forEach(function(item) {
            var target = item.element;
            var targetRect = getBoundingClientRect(target);
            var rootContainsTarget = this._rootContainsTarget(target);
            var oldEntry = item.entry;
            var intersectionRect = rootIsInDom && rootContainsTarget &&
                this._computeTargetAndRootIntersection(target, rootRect);

            var newEntry = item.entry = new IntersectionObserverEntry({
                time: now(),
                target: target,
                boundingClientRect: targetRect,
                rootBounds: rootRect,
                intersectionRect: intersectionRect
            });

            if (!oldEntry) {
                this._queuedEntries.push(newEntry);
            } else if (rootIsInDom && rootContainsTarget) {
                // If the new entry intersection ratio has crossed any of the
                // thresholds, add a new entry.
                if (this._hasCrossedThreshold(oldEntry, newEntry)) {
                    this._queuedEntries.push(newEntry);
                }
            } else {
                // If the root is not in the DOM or target is not contained within
                // root but the previous entry for this target had an intersection,
                // add a new record indicating removal.
                if (oldEntry && oldEntry.isIntersecting) {
                    this._queuedEntries.push(newEntry);
                }
            }
        }, this);

        if (this._queuedEntries.length) {
            this._callback(this.takeRecords(), this);
        }
    };


    /**
     * Accepts a target and root rect computes the intersection between then
     * following the algorithm in the spec.
     * TODO(philipwalton): at this time clip-path is not considered.
     * https://w3c.github.io/IntersectionObserver/#calculate-intersection-rect-algo
     * @param {Element} target The target DOM element
     * @param {Object} rootRect The bounding rect of the root after being
     *     expanded by the rootMargin value.
     * @return {?Object} The final intersection rect object or undefined if no
     *     intersection is found.
     * @private
     */
    IntersectionObserver.prototype._computeTargetAndRootIntersection =
        function(target, rootRect) {

            // If the element isn't displayed, an intersection can't happen.
            if (window.getComputedStyle(target).display == 'none') return;

            var targetRect = getBoundingClientRect(target);
            var intersectionRect = targetRect;
            var parent = getParentNode(target);
            var atRoot = false;

            while (!atRoot) {
                var parentRect = null;
                var parentComputedStyle = parent.nodeType == 1 ?
                    window.getComputedStyle(parent) : {};

                // If the parent isn't displayed, an intersection can't happen.
                if (parentComputedStyle.display == 'none') return;

                if (parent == this.root || parent == document) {
                    atRoot = true;
                    parentRect = rootRect;
                } else {
                    // If the element has a non-visible overflow, and it's not the <body>
                    // or <html> element, update the intersection rect.
                    // Note: <body> and <html> cannot be clipped to a rect that's not also
                    // the document rect, so no need to compute a new intersection.
                    if (parent != document.body &&
                        parent != document.documentElement &&
                        parentComputedStyle.overflow != 'visible') {
                        parentRect = getBoundingClientRect(parent);
                    }
                }

                // If either of the above conditionals set a new parentRect,
                // calculate new intersection data.
                if (parentRect) {
                    intersectionRect = computeRectIntersection(parentRect, intersectionRect);

                    if (!intersectionRect) break;
                }
                parent = getParentNode(parent);
            }
            return intersectionRect;
        };


    /**
     * Returns the root rect after being expanded by the rootMargin value.
     * @return {Object} The expanded root rect.
     * @private
     */
    IntersectionObserver.prototype._getRootRect = function() {
        var rootRect;
        if (this.root) {
            rootRect = getBoundingClientRect(this.root);
        } else {
            // Use <html>/<body> instead of window since scroll bars affect size.
            var html = document.documentElement;
            var body = document.body;
            rootRect = {
                top: 0,
                left: 0,
                right: html.clientWidth || body.clientWidth,
                width: html.clientWidth || body.clientWidth,
                bottom: html.clientHeight || body.clientHeight,
                height: html.clientHeight || body.clientHeight
            };
        }
        return this._expandRectByRootMargin(rootRect);
    };


    /**
     * Accepts a rect and expands it by the rootMargin value.
     * @param {Object} rect The rect object to expand.
     * @return {Object} The expanded rect.
     * @private
     */
    IntersectionObserver.prototype._expandRectByRootMargin = function(rect) {
        var margins = this._rootMarginValues.map(function(margin, i) {
            return margin.unit == 'px' ? margin.value :
                margin.value * (i % 2 ? rect.width : rect.height) / 100;
        });
        var newRect = {
            top: rect.top - margins[0],
            right: rect.right + margins[1],
            bottom: rect.bottom + margins[2],
            left: rect.left - margins[3]
        };
        newRect.width = newRect.right - newRect.left;
        newRect.height = newRect.bottom - newRect.top;

        return newRect;
    };


    /**
     * Accepts an old and new entry and returns true if at least one of the
     * threshold values has been crossed.
     * @param {?IntersectionObserverEntry} oldEntry The previous entry for a
     *    particular target element or null if no previous entry exists.
     * @param {IntersectionObserverEntry} newEntry The current entry for a
     *    particular target element.
     * @return {boolean} Returns true if a any threshold has been crossed.
     * @private
     */
    IntersectionObserver.prototype._hasCrossedThreshold =
        function(oldEntry, newEntry) {

            // To make comparing easier, an entry that has a ratio of 0
            // but does not actually intersect is given a value of -1
            var oldRatio = oldEntry && oldEntry.isIntersecting ?
                oldEntry.intersectionRatio || 0 : -1;
            var newRatio = newEntry.isIntersecting ?
                newEntry.intersectionRatio || 0 : -1;

            // Ignore unchanged ratios
            if (oldRatio === newRatio) return;

            for (var i = 0; i < this.thresholds.length; i++) {
                var threshold = this.thresholds[i];

                // Return true if an entry matches a threshold or if the new ratio
                // and the old ratio are on the opposite sides of a threshold.
                if (threshold == oldRatio || threshold == newRatio ||
                    threshold < oldRatio !== threshold < newRatio) {
                    return true;
                }
            }
        };


    /**
     * Returns whether or not the root element is an element and is in the DOM.
     * @return {boolean} True if the root element is an element and is in the DOM.
     * @private
     */
    IntersectionObserver.prototype._rootIsInDom = function() {
        return !this.root || containsDeep(document, this.root);
    };


    /**
     * Returns whether or not the target element is a child of root.
     * @param {Element} target The target element to check.
     * @return {boolean} True if the target element is a child of root.
     * @private
     */
    IntersectionObserver.prototype._rootContainsTarget = function(target) {
        return containsDeep(this.root || document, target);
    };


    /**
     * Adds the instance to the global IntersectionObserver registry if it isn't
     * already present.
     * @private
     */
    IntersectionObserver.prototype._registerInstance = function() {
        if (registry.indexOf(this) < 0) {
            registry.push(this);
        }
    };


    /**
     * Removes the instance from the global IntersectionObserver registry.
     * @private
     */
    IntersectionObserver.prototype._unregisterInstance = function() {
        var index = registry.indexOf(this);
        if (index != -1) registry.splice(index, 1);
    };


    /**
     * Returns the result of the performance.now() method or null in browsers
     * that don't support the API.
     * @return {number} The elapsed time since the page was requested.
     */
    function now() {
        return window.performance && performance.now && performance.now();
    }


    /**
     * Throttles a function and delays its execution, so it's only called at most
     * once within a given time period.
     * @param {Function} fn The function to throttle.
     * @param {number} timeout The amount of time that must pass before the
     *     function can be called again.
     * @return {Function} The throttled function.
     */
    function throttle(fn, timeout) {
        var timer = null;
        return function () {
            if (!timer) {
                timer = setTimeout(function() {
                    fn();
                    timer = null;
                }, timeout);
            }
        };
    }


    /**
     * Adds an event handler to a DOM node ensuring cross-browser compatibility.
     * @param {Node} node The DOM node to add the event handler to.
     * @param {string} event The event name.
     * @param {Function} fn The event handler to add.
     * @param {boolean} opt_useCapture Optionally adds the even to the capture
     *     phase. Note: this only works in modern browsers.
     */
    function addEvent(node, event, fn, opt_useCapture) {
        if (typeof node.addEventListener == 'function') {
            node.addEventListener(event, fn, opt_useCapture || false);
        }
        else if (typeof node.attachEvent == 'function') {
            node.attachEvent('on' + event, fn);
        }
    }


    /**
     * Removes a previously added event handler from a DOM node.
     * @param {Node} node The DOM node to remove the event handler from.
     * @param {string} event The event name.
     * @param {Function} fn The event handler to remove.
     * @param {boolean} opt_useCapture If the event handler was added with this
     *     flag set to true, it should be set to true here in order to remove it.
     */
    function removeEvent(node, event, fn, opt_useCapture) {
        if (typeof node.removeEventListener == 'function') {
            node.removeEventListener(event, fn, opt_useCapture || false);
        }
        else if (typeof node.detatchEvent == 'function') {
            node.detatchEvent('on' + event, fn);
        }
    }


    /**
     * Returns the intersection between two rect objects.
     * @param {Object} rect1 The first rect.
     * @param {Object} rect2 The second rect.
     * @return {?Object} The intersection rect or undefined if no intersection
     *     is found.
     */
    function computeRectIntersection(rect1, rect2) {
        var top = Math.max(rect1.top, rect2.top);
        var bottom = Math.min(rect1.bottom, rect2.bottom);
        var left = Math.max(rect1.left, rect2.left);
        var right = Math.min(rect1.right, rect2.right);
        var width = right - left;
        var height = bottom - top;

        return (width >= 0 && height >= 0) && {
            top: top,
            bottom: bottom,
            left: left,
            right: right,
            width: width,
            height: height
        };
    }


    /**
     * Shims the native getBoundingClientRect for compatibility with older IE.
     * @param {Element} el The element whose bounding rect to get.
     * @return {Object} The (possibly shimmed) rect of the element.
     */
    function getBoundingClientRect(el) {
        var rect;

        try {
            rect = el.getBoundingClientRect();
        } catch (err) {
            // Ignore Windows 7 IE11 "Unspecified error"
            // https://github.com/w3c/IntersectionObserver/pull/205
        }

        if (!rect) return getEmptyRect();

        // Older IE
        if (!(rect.width && rect.height)) {
            rect = {
                top: rect.top,
                right: rect.right,
                bottom: rect.bottom,
                left: rect.left,
                width: rect.right - rect.left,
                height: rect.bottom - rect.top
            };
        }
        return rect;
    }


    /**
     * Returns an empty rect object. An empty rect is returned when an element
     * is not in the DOM.
     * @return {Object} The empty rect.
     */
    function getEmptyRect() {
        return {
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
            width: 0,
            height: 0
        };
    }

    /**
     * Checks to see if a parent element contains a child element (including inside
     * shadow DOM).
     * @param {Node} parent The parent element.
     * @param {Node} child The child element.
     * @return {boolean} True if the parent node contains the child node.
     */
    function containsDeep(parent, child) {
        var node = child;
        while (node) {
            if (node == parent) return true;

            node = getParentNode(node);
        }
        return false;
    }


    /**
     * Gets the parent node of an element or its host element if the parent node
     * is a shadow root.
     * @param {Node} node The node whose parent to get.
     * @return {Node|null} The parent node or null if no parent exists.
     */
    function getParentNode(node) {
        var parent = node.parentNode;

        if (parent && parent.nodeType == 11 && parent.host) {
            // If the parent is a shadow root, return the host element.
            return parent.host;
        }

        if (parent && parent.assignedSlot) {
            // If the parent is distributed in a <slot>, return the parent of a slot.
            return parent.assignedSlot.parentNode;
        }

        return parent;
    }


// Exposes the constructors globally.
    window.IntersectionObserver = IntersectionObserver;
    window.IntersectionObserverEntry = IntersectionObserverEntry;

}());
// @see https://github.com/que-etc/resize-observer-polyfill
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
			typeof define === 'function' && define.amd ? define(factory) :
					(global.ResizeObserver = factory());
}(this, (function () { 'use strict';

	/**
	 * A collection of shims that provide minimal functionality of the ES6 collections.
	 *
	 * These implementations are not meant to be used outside of the ResizeObserver
	 * modules as they cover only a limited range of use cases.
	 */
	/* eslint-disable require-jsdoc, valid-jsdoc */
	var MapShim = (function () {
		if (typeof Map !== 'undefined') {
			return Map;
		}
		/**
		 * Returns index in provided array that matches the specified key.
		 *
		 * @param {Array<Array>} arr
		 * @param {*} key
		 * @returns {number}
		 */
		function getIndex(arr, key) {
			var result = -1;
			arr.some(function (entry, index) {
				if (entry[0] === key) {
					result = index;
					return true;
				}
				return false;
			});
			return result;
		}
		return /** @class */ (function () {
			function class_1() {
				this.__entries__ = [];
			}
			Object.defineProperty(class_1.prototype, "size", {
				/**
				 * @returns {boolean}
				 */
				get: function () {
					return this.__entries__.length;
				},
				enumerable: true,
				configurable: true
			});
			/**
			 * @param {*} key
			 * @returns {*}
			 */
			class_1.prototype.get = function (key) {
				var index = getIndex(this.__entries__, key);
				var entry = this.__entries__[index];
				return entry && entry[1];
			};
			/**
			 * @param {*} key
			 * @param {*} value
			 * @returns {void}
			 */
			class_1.prototype.set = function (key, value) {
				var index = getIndex(this.__entries__, key);
				if (~index) {
					this.__entries__[index][1] = value;
				}
				else {
					this.__entries__.push([key, value]);
				}
			};
			/**
			 * @param {*} key
			 * @returns {void}
			 */
			class_1.prototype.delete = function (key) {
				var entries = this.__entries__;
				var index = getIndex(entries, key);
				if (~index) {
					entries.splice(index, 1);
				}
			};
			/**
			 * @param {*} key
			 * @returns {void}
			 */
			class_1.prototype.has = function (key) {
				return !!~getIndex(this.__entries__, key);
			};
			/**
			 * @returns {void}
			 */
			class_1.prototype.clear = function () {
				this.__entries__.splice(0);
			};
			/**
			 * @param {Function} callback
			 * @param {*} [ctx=null]
			 * @returns {void}
			 */
			class_1.prototype.forEach = function (callback, ctx) {
				if (ctx === void 0) { ctx = null; }
				for (var _i = 0, _a = this.__entries__; _i < _a.length; _i++) {
					var entry = _a[_i];
					callback.call(ctx, entry[1], entry[0]);
				}
			};
			return class_1;
		}());
	})();

	/**
	 * Detects whether window and document objects are available in current environment.
	 */
	var isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined' && window.document === document;

	// Returns global object of a current environment.
	var global$1 = (function () {
		if (typeof global !== 'undefined' && global.Math === Math) {
			return global;
		}
		if (typeof self !== 'undefined' && self.Math === Math) {
			return self;
		}
		if (typeof window !== 'undefined' && window.Math === Math) {
			return window;
		}
		// eslint-disable-next-line no-new-func
		return Function('return this')();
	})();

	/**
	 * A shim for the requestAnimationFrame which falls back to the setTimeout if
	 * first one is not supported.
	 *
	 * @returns {number} Requests' identifier.
	 */
	var requestAnimationFrame$1 = (function () {
		if (typeof requestAnimationFrame === 'function') {
			// It's required to use a bounded function because IE sometimes throws
			// an "Invalid calling object" error if rAF is invoked without the global
			// object on the left hand side.
			return requestAnimationFrame.bind(global$1);
		}
		return function (callback) { return setTimeout(function () { return callback(Date.now()); }, 1000 / 60); };
	})();

	// Defines minimum timeout before adding a trailing call.
	var trailingTimeout = 2;
	/**
	 * Creates a wrapper function which ensures that provided callback will be
	 * invoked only once during the specified delay period.
	 *
	 * @param {Function} callback - Function to be invoked after the delay period.
	 * @param {number} delay - Delay after which to invoke callback.
	 * @returns {Function}
	 */
	function throttle (callback, delay) {
		var leadingCall = false, trailingCall = false, lastCallTime = 0;
		/**
		 * Invokes the original callback function and schedules new invocation if
		 * the "proxy" was called during current request.
		 *
		 * @returns {void}
		 */
		function resolvePending() {
			if (leadingCall) {
				leadingCall = false;
				callback();
			}
			if (trailingCall) {
				proxy();
			}
		}
		/**
		 * Callback invoked after the specified delay. It will further postpone
		 * invocation of the original function delegating it to the
		 * requestAnimationFrame.
		 *
		 * @returns {void}
		 */
		function timeoutCallback() {
			requestAnimationFrame$1(resolvePending);
		}
		/**
		 * Schedules invocation of the original function.
		 *
		 * @returns {void}
		 */
		function proxy() {
			var timeStamp = Date.now();
			if (leadingCall) {
				// Reject immediately following calls.
				if (timeStamp - lastCallTime < trailingTimeout) {
					return;
				}
				// Schedule new call to be in invoked when the pending one is resolved.
				// This is important for "transitions" which never actually start
				// immediately so there is a chance that we might miss one if change
				// happens amids the pending invocation.
				trailingCall = true;
			}
			else {
				leadingCall = true;
				trailingCall = false;
				setTimeout(timeoutCallback, delay);
			}
			lastCallTime = timeStamp;
		}
		return proxy;
	}

	// Minimum delay before invoking the update of observers.
	var REFRESH_DELAY = 20;
	// A list of substrings of CSS properties used to find transition events that
	// might affect dimensions of observed elements.
	var transitionKeys = ['top', 'right', 'bottom', 'left', 'width', 'height', 'size', 'weight'];
	// Check if MutationObserver is available.
	var mutationObserverSupported = typeof MutationObserver !== 'undefined';
	/**
	 * Singleton controller class which handles updates of ResizeObserver instances.
	 */
	var ResizeObserverController = /** @class */ (function () {
		/**
		 * Creates a new instance of ResizeObserverController.
		 *
		 * @private
		 */
		function ResizeObserverController() {
			/**
			 * Indicates whether DOM listeners have been added.
			 *
			 * @private {boolean}
			 */
			this.connected_ = false;
			/**
			 * Tells that controller has subscribed for Mutation Events.
			 *
			 * @private {boolean}
			 */
			this.mutationEventsAdded_ = false;
			/**
			 * Keeps reference to the instance of MutationObserver.
			 *
			 * @private {MutationObserver}
			 */
			this.mutationsObserver_ = null;
			/**
			 * A list of connected observers.
			 *
			 * @private {Array<ResizeObserverSPI>}
			 */
			this.observers_ = [];
			this.onTransitionEnd_ = this.onTransitionEnd_.bind(this);
			this.refresh = throttle(this.refresh.bind(this), REFRESH_DELAY);
		}
		/**
		 * Adds observer to observers list.
		 *
		 * @param {ResizeObserverSPI} observer - Observer to be added.
		 * @returns {void}
		 */
		ResizeObserverController.prototype.addObserver = function (observer) {
			if (!~this.observers_.indexOf(observer)) {
				this.observers_.push(observer);
			}
			// Add listeners if they haven't been added yet.
			if (!this.connected_) {
				this.connect_();
			}
		};
		/**
		 * Removes observer from observers list.
		 *
		 * @param {ResizeObserverSPI} observer - Observer to be removed.
		 * @returns {void}
		 */
		ResizeObserverController.prototype.removeObserver = function (observer) {
			var observers = this.observers_;
			var index = observers.indexOf(observer);
			// Remove observer if it's present in registry.
			if (~index) {
				observers.splice(index, 1);
			}
			// Remove listeners if controller has no connected observers.
			if (!observers.length && this.connected_) {
				this.disconnect_();
			}
		};
		/**
		 * Invokes the update of observers. It will continue running updates insofar
		 * it detects changes.
		 *
		 * @returns {void}
		 */
		ResizeObserverController.prototype.refresh = function () {
			var changesDetected = this.updateObservers_();
			// Continue running updates if changes have been detected as there might
			// be future ones caused by CSS transitions.
			if (changesDetected) {
				this.refresh();
			}
		};
		/**
		 * Updates every observer from observers list and notifies them of queued
		 * entries.
		 *
		 * @private
		 * @returns {boolean} Returns "true" if any observer has detected changes in
		 *      dimensions of it's elements.
		 */
		ResizeObserverController.prototype.updateObservers_ = function () {
			// Collect observers that have active observations.
			var activeObservers = this.observers_.filter(function (observer) {
				return observer.gatherActive(), observer.hasActive();
			});
			// Deliver notifications in a separate cycle in order to avoid any
			// collisions between observers, e.g. when multiple instances of
			// ResizeObserver are tracking the same element and the callback of one
			// of them changes content dimensions of the observed target. Sometimes
			// this may result in notifications being blocked for the rest of observers.
			activeObservers.forEach(function (observer) { return observer.broadcastActive(); });
			return activeObservers.length > 0;
		};
		/**
		 * Initializes DOM listeners.
		 *
		 * @private
		 * @returns {void}
		 */
		ResizeObserverController.prototype.connect_ = function () {
			// Do nothing if running in a non-browser environment or if listeners
			// have been already added.
			if (!isBrowser || this.connected_) {
				return;
			}
			// Subscription to the "Transitionend" event is used as a workaround for
			// delayed transitions. This way it's possible to capture at least the
			// final state of an element.
			document.addEventListener('transitionend', this.onTransitionEnd_);
			window.addEventListener('resize', this.refresh);
			if (mutationObserverSupported) {
				this.mutationsObserver_ = new MutationObserver(this.refresh);
				this.mutationsObserver_.observe(document, {
					attributes: true,
					childList: true,
					characterData: true,
					subtree: true
				});
			}
			else {
				document.addEventListener('DOMSubtreeModified', this.refresh);
				this.mutationEventsAdded_ = true;
			}
			this.connected_ = true;
		};
		/**
		 * Removes DOM listeners.
		 *
		 * @private
		 * @returns {void}
		 */
		ResizeObserverController.prototype.disconnect_ = function () {
			// Do nothing if running in a non-browser environment or if listeners
			// have been already removed.
			if (!isBrowser || !this.connected_) {
				return;
			}
			document.removeEventListener('transitionend', this.onTransitionEnd_);
			window.removeEventListener('resize', this.refresh);
			if (this.mutationsObserver_) {
				this.mutationsObserver_.disconnect();
			}
			if (this.mutationEventsAdded_) {
				document.removeEventListener('DOMSubtreeModified', this.refresh);
			}
			this.mutationsObserver_ = null;
			this.mutationEventsAdded_ = false;
			this.connected_ = false;
		};
		/**
		 * "Transitionend" event handler.
		 *
		 * @private
		 * @param {TransitionEvent} event
		 * @returns {void}
		 */
		ResizeObserverController.prototype.onTransitionEnd_ = function (_a) {
			var _b = _a.propertyName, propertyName = _b === void 0 ? '' : _b;
			// Detect whether transition may affect dimensions of an element.
			var isReflowProperty = transitionKeys.some(function (key) {
				return !!~propertyName.indexOf(key);
			});
			if (isReflowProperty) {
				this.refresh();
			}
		};
		/**
		 * Returns instance of the ResizeObserverController.
		 *
		 * @returns {ResizeObserverController}
		 */
		ResizeObserverController.getInstance = function () {
			if (!this.instance_) {
				this.instance_ = new ResizeObserverController();
			}
			return this.instance_;
		};
		/**
		 * Holds reference to the controller's instance.
		 *
		 * @private {ResizeObserverController}
		 */
		ResizeObserverController.instance_ = null;
		return ResizeObserverController;
	}());

	/**
	 * Defines non-writable/enumerable properties of the provided target object.
	 *
	 * @param {Object} target - Object for which to define properties.
	 * @param {Object} props - Properties to be defined.
	 * @returns {Object} Target object.
	 */
	var defineConfigurable = (function (target, props) {
		for (var _i = 0, _a = Object.keys(props); _i < _a.length; _i++) {
			var key = _a[_i];
			Object.defineProperty(target, key, {
				value: props[key],
				enumerable: false,
				writable: false,
				configurable: true
			});
		}
		return target;
	});

	/**
	 * Returns the global object associated with provided element.
	 *
	 * @param {Object} target
	 * @returns {Object}
	 */
	var getWindowOf = (function (target) {
		// Assume that the element is an instance of Node, which means that it
		// has the "ownerDocument" property from which we can retrieve a
		// corresponding global object.
		var ownerGlobal = target && target.ownerDocument && target.ownerDocument.defaultView;
		// Return the local global object if it's not possible extract one from
		// provided element.
		return ownerGlobal || global$1;
	});

	// Placeholder of an empty content rectangle.
	var emptyRect = createRectInit(0, 0, 0, 0);
	/**
	 * Converts provided string to a number.
	 *
	 * @param {number|string} value
	 * @returns {number}
	 */
	function toFloat(value) {
		return parseFloat(value) || 0;
	}
	/**
	 * Extracts borders size from provided styles.
	 *
	 * @param {CSSStyleDeclaration} styles
	 * @param {...string} positions - Borders positions (top, right, ...)
	 * @returns {number}
	 */
	function getBordersSize(styles) {
		var positions = [];
		for (var _i = 1; _i < arguments.length; _i++) {
			positions[_i - 1] = arguments[_i];
		}
		return positions.reduce(function (size, position) {
			var value = styles['border-' + position + '-width'];
			return size + toFloat(value);
		}, 0);
	}
	/**
	 * Extracts paddings sizes from provided styles.
	 *
	 * @param {CSSStyleDeclaration} styles
	 * @returns {Object} Paddings box.
	 */
	function getPaddings(styles) {
		var positions = ['top', 'right', 'bottom', 'left'];
		var paddings = {};
		for (var _i = 0, positions_1 = positions; _i < positions_1.length; _i++) {
			var position = positions_1[_i];
			var value = styles['padding-' + position];
			paddings[position] = toFloat(value);
		}
		return paddings;
	}
	/**
	 * Calculates content rectangle of provided SVG element.
	 *
	 * @param {SVGGraphicsElement} target - Element content rectangle of which needs
	 *      to be calculated.
	 * @returns {DOMRectInit}
	 */
	function getSVGContentRect(target) {
		var bbox = target.getBBox();
		return createRectInit(0, 0, bbox.width, bbox.height);
	}
	/**
	 * Calculates content rectangle of provided HTMLElement.
	 *
	 * @param {HTMLElement} target - Element for which to calculate the content rectangle.
	 * @returns {DOMRectInit}
	 */
	function getHTMLElementContentRect(target) {
		// Client width & height properties can't be
		// used exclusively as they provide rounded values.
		var clientWidth = target.clientWidth, clientHeight = target.clientHeight;
		// By this condition we can catch all non-replaced inline, hidden and
		// detached elements. Though elements with width & height properties less
		// than 0.5 will be discarded as well.
		//
		// Without it we would need to implement separate methods for each of
		// those cases and it's not possible to perform a precise and performance
		// effective test for hidden elements. E.g. even jQuery's ':visible' filter
		// gives wrong results for elements with width & height less than 0.5.
		if (!clientWidth && !clientHeight) {
			return emptyRect;
		}
		var styles = getWindowOf(target).getComputedStyle(target);
		var paddings = getPaddings(styles);
		var horizPad = paddings.left + paddings.right;
		var vertPad = paddings.top + paddings.bottom;
		// Computed styles of width & height are being used because they are the
		// only dimensions available to JS that contain non-rounded values. It could
		// be possible to utilize the getBoundingClientRect if only it's data wasn't
		// affected by CSS transformations let alone paddings, borders and scroll bars.
		var width = toFloat(styles.width), height = toFloat(styles.height);
		// Width & height include paddings and borders when the 'border-box' box
		// model is applied (except for IE).
		if (styles.boxSizing === 'border-box') {
			// Following conditions are required to handle Internet Explorer which
			// doesn't include paddings and borders to computed CSS dimensions.
			//
			// We can say that if CSS dimensions + paddings are equal to the "client"
			// properties then it's either IE, and thus we don't need to subtract
			// anything, or an element merely doesn't have paddings/borders styles.
			if (Math.round(width + horizPad) !== clientWidth) {
				width -= getBordersSize(styles, 'left', 'right') + horizPad;
			}
			if (Math.round(height + vertPad) !== clientHeight) {
				height -= getBordersSize(styles, 'top', 'bottom') + vertPad;
			}
		}
		// Following steps can't be applied to the document's root element as its
		// client[Width/Height] properties represent viewport area of the window.
		// Besides, it's as well not necessary as the <html> itself neither has
		// rendered scroll bars nor it can be clipped.
		if (!isDocumentElement(target)) {
			// In some browsers (only in Firefox, actually) CSS width & height
			// include scroll bars size which can be removed at this step as scroll
			// bars are the only difference between rounded dimensions + paddings
			// and "client" properties, though that is not always true in Chrome.
			var vertScrollbar = Math.round(width + horizPad) - clientWidth;
			var horizScrollbar = Math.round(height + vertPad) - clientHeight;
			// Chrome has a rather weird rounding of "client" properties.
			// E.g. for an element with content width of 314.2px it sometimes gives
			// the client width of 315px and for the width of 314.7px it may give
			// 314px. And it doesn't happen all the time. So just ignore this delta
			// as a non-relevant.
			if (Math.abs(vertScrollbar) !== 1) {
				width -= vertScrollbar;
			}
			if (Math.abs(horizScrollbar) !== 1) {
				height -= horizScrollbar;
			}
		}
		return createRectInit(paddings.left, paddings.top, width, height);
	}
	/**
	 * Checks whether provided element is an instance of the SVGGraphicsElement.
	 *
	 * @param {Element} target - Element to be checked.
	 * @returns {boolean}
	 */
	var isSVGGraphicsElement = (function () {
		// Some browsers, namely IE and Edge, don't have the SVGGraphicsElement
		// interface.
		if (typeof SVGGraphicsElement !== 'undefined') {
			return function (target) { return target instanceof getWindowOf(target).SVGGraphicsElement; };
		}
		// If it's so, then check that element is at least an instance of the
		// SVGElement and that it has the "getBBox" method.
		// eslint-disable-next-line no-extra-parens
		return function (target) { return (target instanceof getWindowOf(target).SVGElement &&
		typeof target.getBBox === 'function'); };
	})();
	/**
	 * Checks whether provided element is a document element (<html>).
	 *
	 * @param {Element} target - Element to be checked.
	 * @returns {boolean}
	 */
	function isDocumentElement(target) {
		return target === getWindowOf(target).document.documentElement;
	}
	/**
	 * Calculates an appropriate content rectangle for provided html or svg element.
	 *
	 * @param {Element} target - Element content rectangle of which needs to be calculated.
	 * @returns {DOMRectInit}
	 */
	function getContentRect(target) {
		if (!isBrowser) {
			return emptyRect;
		}
		if (isSVGGraphicsElement(target)) {
			return getSVGContentRect(target);
		}
		return getHTMLElementContentRect(target);
	}
	/**
	 * Creates rectangle with an interface of the DOMRectReadOnly.
	 * Spec: https://drafts.fxtf.org/geometry/#domrectreadonly
	 *
	 * @param {DOMRectInit} rectInit - Object with rectangle's x/y coordinates and dimensions.
	 * @returns {DOMRectReadOnly}
	 */
	function createReadOnlyRect(_a) {
		var x = _a.x, y = _a.y, width = _a.width, height = _a.height;
		// If DOMRectReadOnly is available use it as a prototype for the rectangle.
		var Constr = typeof DOMRectReadOnly !== 'undefined' ? DOMRectReadOnly : Object;
		var rect = Object.create(Constr.prototype);
		// Rectangle's properties are not writable and non-enumerable.
		defineConfigurable(rect, {
			x: x, y: y, width: width, height: height,
			top: y,
			right: x + width,
			bottom: height + y,
			left: x
		});
		return rect;
	}
	/**
	 * Creates DOMRectInit object based on the provided dimensions and the x/y coordinates.
	 * Spec: https://drafts.fxtf.org/geometry/#dictdef-domrectinit
	 *
	 * @param {number} x - X coordinate.
	 * @param {number} y - Y coordinate.
	 * @param {number} width - Rectangle's width.
	 * @param {number} height - Rectangle's height.
	 * @returns {DOMRectInit}
	 */
	function createRectInit(x, y, width, height) {
		return { x: x, y: y, width: width, height: height };
	}

	/**
	 * Class that is responsible for computations of the content rectangle of
	 * provided DOM element and for keeping track of it's changes.
	 */
	var ResizeObservation = /** @class */ (function () {
		/**
		 * Creates an instance of ResizeObservation.
		 *
		 * @param {Element} target - Element to be observed.
		 */
		function ResizeObservation(target) {
			/**
			 * Broadcasted width of content rectangle.
			 *
			 * @type {number}
			 */
			this.broadcastWidth = 0;
			/**
			 * Broadcasted height of content rectangle.
			 *
			 * @type {number}
			 */
			this.broadcastHeight = 0;
			/**
			 * Reference to the last observed content rectangle.
			 *
			 * @private {DOMRectInit}
			 */
			this.contentRect_ = createRectInit(0, 0, 0, 0);
			this.target = target;
		}
		/**
		 * Updates content rectangle and tells whether it's width or height properties
		 * have changed since the last broadcast.
		 *
		 * @returns {boolean}
		 */
		ResizeObservation.prototype.isActive = function () {
			var rect = getContentRect(this.target);
			this.contentRect_ = rect;
			return (rect.width !== this.broadcastWidth ||
			rect.height !== this.broadcastHeight);
		};
		/**
		 * Updates 'broadcastWidth' and 'broadcastHeight' properties with a data
		 * from the corresponding properties of the last observed content rectangle.
		 *
		 * @returns {DOMRectInit} Last observed content rectangle.
		 */
		ResizeObservation.prototype.broadcastRect = function () {
			var rect = this.contentRect_;
			this.broadcastWidth = rect.width;
			this.broadcastHeight = rect.height;
			return rect;
		};
		return ResizeObservation;
	}());

	var ResizeObserverEntry = /** @class */ (function () {
		/**
		 * Creates an instance of ResizeObserverEntry.
		 *
		 * @param {Element} target - Element that is being observed.
		 * @param {DOMRectInit} rectInit - Data of the element's content rectangle.
		 */
		function ResizeObserverEntry(target, rectInit) {
			var contentRect = createReadOnlyRect(rectInit);
			// According to the specification following properties are not writable
			// and are also not enumerable in the native implementation.
			//
			// Property accessors are not being used as they'd require to define a
			// private WeakMap storage which may cause memory leaks in browsers that
			// don't support this type of collections.
			defineConfigurable(this, { target: target, contentRect: contentRect });
		}
		return ResizeObserverEntry;
	}());

	var ResizeObserverSPI = /** @class */ (function () {
		/**
		 * Creates a new instance of ResizeObserver.
		 *
		 * @param {ResizeObserverCallback} callback - Callback function that is invoked
		 *      when one of the observed elements changes it's content dimensions.
		 * @param {ResizeObserverController} controller - Controller instance which
		 *      is responsible for the updates of observer.
		 * @param {ResizeObserver} callbackCtx - Reference to the public
		 *      ResizeObserver instance which will be passed to callback function.
		 */
		function ResizeObserverSPI(callback, controller, callbackCtx) {
			/**
			 * Collection of resize observations that have detected changes in dimensions
			 * of elements.
			 *
			 * @private {Array<ResizeObservation>}
			 */
			this.activeObservations_ = [];
			/**
			 * Registry of the ResizeObservation instances.
			 *
			 * @private {Map<Element, ResizeObservation>}
			 */
			this.observations_ = new MapShim();
			if (typeof callback !== 'function') {
				throw new TypeError('The callback provided as parameter 1 is not a function.');
			}
			this.callback_ = callback;
			this.controller_ = controller;
			this.callbackCtx_ = callbackCtx;
		}
		/**
		 * Starts observing provided element.
		 *
		 * @param {Element} target - Element to be observed.
		 * @returns {void}
		 */
		ResizeObserverSPI.prototype.observe = function (target) {
			if (!arguments.length) {
				throw new TypeError('1 argument required, but only 0 present.');
			}
			// Do nothing if current environment doesn't have the Element interface.
			if (typeof Element === 'undefined' || !(Element instanceof Object)) {
				return;
			}
			if (!(target instanceof getWindowOf(target).Element)) {
				throw new TypeError('parameter 1 is not of type "Element".');
			}
			var observations = this.observations_;
			// Do nothing if element is already being observed.
			if (observations.has(target)) {
				return;
			}
			observations.set(target, new ResizeObservation(target));
			this.controller_.addObserver(this);
			// Force the update of observations.
			this.controller_.refresh();
		};
		/**
		 * Stops observing provided element.
		 *
		 * @param {Element} target - Element to stop observing.
		 * @returns {void}
		 */
		ResizeObserverSPI.prototype.unobserve = function (target) {
			if (!arguments.length) {
				throw new TypeError('1 argument required, but only 0 present.');
			}
			// Do nothing if current environment doesn't have the Element interface.
			if (typeof Element === 'undefined' || !(Element instanceof Object)) {
				return;
			}
			if (!(target instanceof getWindowOf(target).Element)) {
				throw new TypeError('parameter 1 is not of type "Element".');
			}
			var observations = this.observations_;
			// Do nothing if element is not being observed.
			if (!observations.has(target)) {
				return;
			}
			observations.delete(target);
			if (!observations.size) {
				this.controller_.removeObserver(this);
			}
		};
		/**
		 * Stops observing all elements.
		 *
		 * @returns {void}
		 */
		ResizeObserverSPI.prototype.disconnect = function () {
			this.clearActive();
			this.observations_.clear();
			this.controller_.removeObserver(this);
		};
		/**
		 * Collects observation instances the associated element of which has changed
		 * it's content rectangle.
		 *
		 * @returns {void}
		 */
		ResizeObserverSPI.prototype.gatherActive = function () {
			var _this = this;
			this.clearActive();
			this.observations_.forEach(function (observation) {
				if (observation.isActive()) {
					_this.activeObservations_.push(observation);
				}
			});
		};
		/**
		 * Invokes initial callback function with a list of ResizeObserverEntry
		 * instances collected from active resize observations.
		 *
		 * @returns {void}
		 */
		ResizeObserverSPI.prototype.broadcastActive = function () {
			// Do nothing if observer doesn't have active observations.
			if (!this.hasActive()) {
				return;
			}
			var ctx = this.callbackCtx_;
			// Create ResizeObserverEntry instance for every active observation.
			var entries = this.activeObservations_.map(function (observation) {
				return new ResizeObserverEntry(observation.target, observation.broadcastRect());
			});
			this.callback_.call(ctx, entries, ctx);
			this.clearActive();
		};
		/**
		 * Clears the collection of active observations.
		 *
		 * @returns {void}
		 */
		ResizeObserverSPI.prototype.clearActive = function () {
			this.activeObservations_.splice(0);
		};
		/**
		 * Tells whether observer has active observations.
		 *
		 * @returns {boolean}
		 */
		ResizeObserverSPI.prototype.hasActive = function () {
			return this.activeObservations_.length > 0;
		};
		return ResizeObserverSPI;
	}());

	// Registry of internal observers. If WeakMap is not available use current shim
	// for the Map collection as it has all required methods and because WeakMap
	// can't be fully polyfilled anyway.
	var observers = typeof WeakMap !== 'undefined' ? new WeakMap() : new MapShim();
	/**
	 * ResizeObserver API. Encapsulates the ResizeObserver SPI implementation
	 * exposing only those methods and properties that are defined in the spec.
	 */
	var ResizeObserver = /** @class */ (function () {
		/**
		 * Creates a new instance of ResizeObserver.
		 *
		 * @param {ResizeObserverCallback} callback - Callback that is invoked when
		 *      dimensions of the observed elements change.
		 */
		function ResizeObserver(callback) {
			if (!(this instanceof ResizeObserver)) {
				throw new TypeError('Cannot call a class as a function.');
			}
			if (!arguments.length) {
				throw new TypeError('1 argument required, but only 0 present.');
			}
			var controller = ResizeObserverController.getInstance();
			var observer = new ResizeObserverSPI(callback, controller, this);
			observers.set(this, observer);
		}
		return ResizeObserver;
	}());
	// Expose public methods of ResizeObserver.
	[
		'observe',
		'unobserve',
		'disconnect'
	].forEach(function (method) {
		ResizeObserver.prototype[method] = function () {
			var _a;
			return (_a = observers.get(this))[method].apply(_a, arguments);
		};
	});

	var index = (function () {
		// Export existing implementation if available.
		if (typeof global$1.ResizeObserver !== 'undefined') {
			return global$1.ResizeObserver;
		}
		return ResizeObserver;
	})();

	return index;

})));
"use strict";

(function ($, _) {
  /**
   * @summary A reference to the jQuery object the plugin is registered with.
   * @memberof FooBar.
   * @name $
   * @type {jQuery}
   * @description This is used internally for all jQuery operations to help work around issues where multiple jQuery libraries have been included in a single page.
   * @example {@caption The following shows the issue when multiple jQuery's are included in a single page.}{@lang xml}
   * <script src="jquery-1.12.4.js"></script>
   * <script src="your-plugin.js"></script>
   * <script src="jquery-2.2.4.js"></script>
   * <script>
   * 	jQuery(function($){
   * 		$(".selector").yourPlugin(); // => This would throw a TypeError: $(...).yourPlugin is not a function
   * 	});
   * </script>
   * @example {@caption The reason the above throws an error is that the `$.fn.yourPlugin` function is registered to the first instance of jQuery in the page however the instance used to create the ready callback and actually try to execute `$(...).yourPlugin()` is the second. To resolve this issue ideally you would remove the second instance of jQuery however you can use the `FooBar.$` member to ensure you are always working with the instance of jQuery the plugin was registered with.}{@lang xml}
   * <script src="jquery-1.12.4.js"></script>
   * <script src="your-plugin.js"></script>
   * <script src="jquery-2.2.4.js"></script>
   * <script>
   * 	FooBar.$(function($){
   * 		$(".selector").yourPlugin(); // => It works!
   * 	});
   * </script>
   */
  _.$ = $;
})( // dependencies
jQuery,
/**
 * @summary The core namespace for the plugin containing all its code.
 * @global
 * @namespace FooBar
 * @description This plugin houses all it's code within a single `FooBar` global variable to prevent polluting the global namespace and to make accessing its various members simpler.
 * @example {@caption As this namespace is registered as a global on the `window` object, it can be accessed using the `window.` prefix.}
 * var fm = window.FooBar;
 * @example {@caption Or without it.}
 * var fm = FooBar;
 * @example {@caption When using this namespace I would recommend aliasing it to a short variable name such as `fm` or as used internally `_`.}
 * // alias the FooBar namespace
 * var _ = FooBar;
 * @example {@caption This is not required but lets us write less code and allows the alias to be minified by compressors like UglifyJS. How you choose to alias the namespace is up to you. You can use the simple `var` method as seen above or supply the namespace as a parameter when creating a new scope as seen below.}
 * // create a new scope to work in passing the namespace as a parameter
 * (function(_){
 *
 * 	// use `_.` to access members and methods
 *
 * })(FooBar);
 */
window.FooBar = window.FooBar || {});
"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

/*!
* FooBar.utils - Contains common utility methods and classes used in our plugins.
* @version 0.2.0
* @link https://github.com/steveush/foo-utils#readme
* @copyright Steve Usher 2020
* @license Released under the GPL-3.0 license.
*/

/**
 * @file This creates the global FooBar.utils namespace
 */
(function ($) {
  if (!$) {
    console.warn('jQuery must be included in the page prior to the FooBar.utils library.');
    return;
  }

  function __exists() {
    try {
      return !!window.FooBar.utils; // does the namespace already exist?
    } catch (err) {
      return false;
    }
  }

  if (!__exists()) {
    /**
     * @summary This namespace contains common utility methods and code shared between our plugins.
     * @global
     * @namespace FooBar.utils
     * @description This namespace relies on jQuery being included in the page prior to it being loaded.
     */
    window.FooBar.utils = {
      /**
       * @summary A reference to the jQuery object the library is registered with.
       * @memberof FooBar.utils.
       * @name $
       * @type {jQuery}
       * @description This is used internally for all jQuery operations to help work around issues where multiple jQuery libraries have been included in a single page.
       * @example {@caption The following shows the issue when multiple jQuery's are included in a single page.}{@lang html}
       * <script src="jquery-1.12.4.js"></script>
       * <script src="my-plugin.js"></script>
       * <script src="jquery-2.2.4.js"></script>
       * <script>
       * 	jQuery(function($){
       * 		$(".selector").myPlugin(); // => This would throw a TypeError: $(...).myPlugin is not a function
       * 	});
       * </script>
       * @example {@caption The reason the above throws an error is that the `$.fn.myPlugin` function is registered to the first instance of jQuery in the page however the instance used to create the ready callback and actually try to execute `$(...).myPlugin()` is the second. To resolve this issue ideally you would remove the second instance of jQuery however you can use the `FooBar.utils.$` member to ensure you are always working with the instance of jQuery the library was registered with.}{@lang html}
       * <script src="jquery-1.12.4.js"></script>
       * <script src="my-plugin.js"></script>
       * <script src="jquery-2.2.4.js"></script>
       * <script>
       * 	FooBar.utils.$(function($){
       * 		$(".selector").myPlugin(); // => It works!
       * 	});
       * </script>
       */
      $: $,

      /**
       * @summary The version of this library.
       * @memberof FooBar.utils.
       * @name version
       * @type {string}
       */
      version: '0.2.0'
    };
  } // at this point there will always be a FooBar.utils namespace registered to the global scope.

})(jQuery);

(function ($, _) {
  // only register methods if this version is the current version
  if (_.version !== '0.2.0') return;
  /**
   * @summary Contains common type checking utility methods.
   * @memberof FooBar.utils.
   * @namespace is
   */

  _.is = {};
  /**
   * @summary Checks if the `value` is an array.
   * @memberof FooBar.utils.is.
   * @function array
   * @param {*} value - The value to check.
   * @returns {boolean} `true` if the supplied `value` is an array.
   * @example {@run true}
   * // alias the FooBar.utils.is namespace
   * var _is = FooBar.utils.is;
   *
   * console.log( _is.array( [] ) ); // => true
   * console.log( _is.array( null ) ); // => false
   * console.log( _is.array( 123 ) ); // => false
   * console.log( _is.array( "" ) ); // => false
   */

  _.is.array = function (value) {
    return '[object Array]' === Object.prototype.toString.call(value);
  };
  /**
   * @summary Checks if the `value` is a boolean.
   * @memberof FooBar.utils.is.
   * @function boolean
   * @param {*} value - The value to check.
   * @returns {boolean} `true` if the supplied `value` is a boolean.
   * @example {@run true}
   * // alias the FooBar.utils.is namespace
   * var _is = FooBar.utils.is;
   *
   * console.log( _is.boolean( true ) ); // => true
   * console.log( _is.boolean( false ) ); // => true
   * console.log( _is.boolean( "true" ) ); // => false
   * console.log( _is.boolean( "false" ) ); // => false
   * console.log( _is.boolean( 1 ) ); // => false
   * console.log( _is.boolean( 0 ) ); // => false
   */


  _.is.boolean = function (value) {
    return '[object Boolean]' === Object.prototype.toString.call(value);
  };
  /**
   * @summary Checks if the `value` is an element.
   * @memberof FooBar.utils.is.
   * @function element
   * @param {*} value - The value to check.
   * @returns {boolean} `true` if the supplied `value` is an element.
   * @example {@run true}
   * // alias the FooBar.utils.is namespace
   * var _is = FooBar.utils.is,
   * 	// create an element to test
   * 	el = document.createElement("span");
   *
   * console.log( _is.element( el ) ); // => true
   * console.log( _is.element( $(el) ) ); // => false
   * console.log( _is.element( null ) ); // => false
   * console.log( _is.element( {} ) ); // => false
   */


  _.is.element = function (value) {
    return (typeof HTMLElement === "undefined" ? "undefined" : _typeof(HTMLElement)) === 'object' ? value instanceof HTMLElement : !!value && _typeof(value) === 'object' && value.nodeType === 1 && typeof value.nodeName === 'string';
  };
  /**
   * @summary Checks if the `value` is empty.
   * @memberof FooBar.utils.is.
   * @function empty
   * @param {*} value - The value to check.
   * @returns {boolean} `true` if the supplied `value` is empty.
   * @description The following values are considered to be empty by this method:
   *
   * <ul><!--
   * --><li>`""`			- An empty string</li><!--
   * --><li>`0`			- 0 as an integer</li><!--
   * --><li>`0.0`		- 0 as a float</li><!--
   * --><li>`[]`			- An empty array</li><!--
   * --><li>`{}`			- An empty object</li><!--
   * --><li>`$()`		- An empty jQuery object</li><!--
   * --><li>`false`</li><!--
   * --><li>`null`</li><!--
   * --><li>`undefined`</li><!--
   * --></ul>
   * @example {@run true}
   * // alias the FooBar.utils.is namespace
   * var _is = FooBar.utils.is;
   *
   * console.log( _is.empty( undefined ) ); // => true
   * console.log( _is.empty( null ) ); // => true
   * console.log( _is.empty( 0 ) ); // => true
   * console.log( _is.empty( 0.0 ) ); // => true
   * console.log( _is.empty( "" ) ); // => true
   * console.log( _is.empty( [] ) ); // => true
   * console.log( _is.empty( {} ) ); // => true
   * console.log( _is.empty( 1 ) ); // => false
   * console.log( _is.empty( 0.1 ) ); // => false
   * console.log( _is.empty( "one" ) ); // => false
   * console.log( _is.empty( ["one"] ) ); // => false
   * console.log( _is.empty( { "name": "My Object" } ) ); // => false
   */


  _.is.empty = function (value) {
    if (_.is.undef(value) || value === null) return true;
    if (_.is.number(value) && value === 0) return true;
    if (_.is.boolean(value) && value === false) return true;
    if (_.is.string(value) && value.length === 0) return true;
    if (_.is.array(value) && value.length === 0) return true;
    if (_.is.jq(value) && value.length === 0) return true;

    if (_.is.hash(value)) {
      for (var prop in value) {
        if (value.hasOwnProperty(prop)) return false;
      }

      return true;
    }

    return false;
  };
  /**
   * @summary Checks if the `value` is an error.
   * @memberof FooBar.utils.is.
   * @function error
   * @param {*} value - The value to check.
   * @returns {boolean} `true` if the supplied `value` is an error.
   * @example {@run true}
   * // alias the FooBar.utils.is namespace
   * var _is = FooBar.utils.is,
   * 	// create some errors to test
   * 	err1 = new Error("err1"),
   * 	err2 = new SyntaxError("err2");
   *
   * console.log( _is.error( err1 ) ); // => true
   * console.log( _is.error( err2 ) ); // => true
   * console.log( _is.error( null ) ); // => false
   * console.log( _is.error( 123 ) ); // => false
   * console.log( _is.error( "" ) ); // => false
   * console.log( _is.error( {} ) ); // => false
   * console.log( _is.error( [] ) ); // => false
   */


  _.is.error = function (value) {
    return '[object Error]' === Object.prototype.toString.call(value);
  };
  /**
   * @summary Checks if the `value` is a function.
   * @memberof FooBar.utils.is.
   * @function fn
   * @param {*} value - The value to check.
   * @returns {boolean} `true` if the supplied `value` is a function.
   * @example {@run true}
   * // alias the FooBar.utils.is namespace
   * var _is = FooBar.utils.is,
   * 	// create a function to test
   * 	func = function(){};
   *
   * console.log( _is.fn( func ) ); // => true
   * console.log( _is.fn( null ) ); // => false
   * console.log( _is.fn( 123 ) ); // => false
   * console.log( _is.fn( "" ) ); // => false
   */


  _.is.fn = function (value) {
    return value === window.alert || '[object Function]' === Object.prototype.toString.call(value);
  };
  /**
   * @summary Checks if the `value` is a hash.
   * @memberof FooBar.utils.is.
   * @function hash
   * @param {*} value - The value to check.
   * @returns {boolean} `true` if the supplied `value` is a hash.
   * @example {@run true}
   * // alias the FooBar.utils.is namespace
   * var _is = FooBar.utils.is;
   *
   * console.log( _is.hash( {"some": "prop"} ) ); // => true
   * console.log( _is.hash( {} ) ); // => true
   * console.log( _is.hash( window ) ); // => false
   * console.log( _is.hash( document ) ); // => false
   * console.log( _is.hash( "" ) ); // => false
   * console.log( _is.hash( 123 ) ); // => false
   */


  _.is.hash = function (value) {
    return _.is.object(value) && value.constructor === Object && !value.nodeType && !value.setInterval;
  };
  /**
   * @summary Checks if the `value` is a jQuery object.
   * @memberof FooBar.utils.is.
   * @function jq
   * @param {*} value - The value to check.
   * @returns {boolean} `true` if the supplied `value` is a jQuery object.
   * @example {@run true}
   * // alias the FooBar.utils.is namespace
   * var _is = FooBar.utils.is,
   * 	// create an element to test
   * 	el = document.createElement("span");
   *
   * console.log( _is.jq( $(el) ) ); // => true
   * console.log( _is.jq( $() ) ); // => true
   * console.log( _is.jq( el ) ); // => false
   * console.log( _is.jq( {} ) ); // => false
   * console.log( _is.jq( null ) ); // => false
   * console.log( _is.jq( 123 ) ); // => false
   * console.log( _is.jq( "" ) ); // => false
   */


  _.is.jq = function (value) {
    return !_.is.undef($) && value instanceof $;
  };
  /**
   * @summary Checks if the `value` is a number.
   * @memberof FooBar.utils.is.
   * @function number
   * @param {*} value - The value to check.
   * @returns {boolean}
   * @example {@run true}
   * // alias the FooBar.utils.is namespace
   * var _is = FooBar.utils.is;
   *
   * console.log( _is.number( 123 ) ); // => true
   * console.log( _is.number( undefined ) ); // => false
   * console.log( _is.number( null ) ); // => false
   * console.log( _is.number( "" ) ); // => false
   */


  _.is.number = function (value) {
    return '[object Number]' === Object.prototype.toString.call(value) && !isNaN(value);
  };
  /**
   * @summary Checks if the `value` is an object.
   * @memberof FooBar.utils.is.
   * @function object
   * @param {*} value - The value to check.
   * @returns {boolean} `true` if the supplied `value` is an object.
   * @example {@run true}
   * // alias the FooBar.utils.is namespace
   * var _is = FooBar.utils.is;
   *
   * console.log( _is.object( {"some": "prop"} ) ); // => true
   * console.log( _is.object( {} ) ); // => true
   * console.log( _is.object( window ) ); // => true
   * console.log( _is.object( document ) ); // => true
   * console.log( _is.object( undefined ) ); // => false
   * console.log( _is.object( null ) ); // => false
   * console.log( _is.object( "" ) ); // => false
   * console.log( _is.object( 123 ) ); // => false
   */


  _.is.object = function (value) {
    return '[object Object]' === Object.prototype.toString.call(value) && !_.is.undef(value) && value !== null;
  };
  /**
   * @summary Checks if the `value` is a promise.
   * @memberof FooBar.utils.is.
   * @function promise
   * @param {*} value - The object to check.
   * @returns {boolean} `true` if the supplied `value` is an object.
   * @description This is a simple check to determine if an object is a jQuery promise object. It simply checks the object has a `then` and `promise` function defined.
   *
   * The promise object is created as an object literal inside of `jQuery.Deferred`, it has no prototype, nor any other truly unique properties that could be used to distinguish it.
   *
   * This method should be a little more accurate than the internal jQuery one that simply checks for a `promise` function.
   * @example {@run true}
   * // alias the FooBar.utils.is namespace
   * var _is = FooBar.utils.is;
   *
   * console.log( _is.promise( $.Deferred() ) ); // => true
   * console.log( _is.promise( {} ) ); // => false
   * console.log( _is.promise( undefined ) ); // => false
   * console.log( _is.promise( null ) ); // => false
   * console.log( _is.promise( "" ) ); // => false
   * console.log( _is.promise( 123 ) ); // => false
   */


  _.is.promise = function (value) {
    return _.is.object(value) && _.is.fn(value.then) && _.is.fn(value.promise);
  };
  /**
   * @summary Checks if the `value` is a valid CSS length.
   * @memberof FooBar.utils.is.
   * @function size
   * @param {*} value - The value to check.
   * @returns {boolean} `true` if the `value` is a number or CSS length.
   * @example {@run true}
   * // alias the FooBar.utils.is namespace
   * var _is = FooBar.utils.is;
   *
   * console.log( _is.size( 80 ) ); // => true
   * console.log( _is.size( "80px" ) ); // => true
   * console.log( _is.size( "80em" ) ); // => true
   * console.log( _is.size( "80%" ) ); // => true
   * console.log( _is.size( {} ) ); // => false
   * console.log( _is.size( undefined ) ); // => false
   * console.log( _is.size( null ) ); // => false
   * console.log( _is.size( "" ) ); // => false
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/CSS/length|&lt;length&gt; - CSS | MDN} for more information on CSS length values.
   */


  _.is.size = function (value) {
    if (!(_.is.string(value) && !_.is.empty(value)) && !_.is.number(value)) return false;
    return /^(auto|none|(?:[\d.]*)+?(?:%|px|mm|q|cm|in|pt|pc|em|ex|ch|rem|vh|vw|vmin|vmax)?)$/.test(value);
  };
  /**
   * @summary Checks if the `value` is a string.
   * @memberof FooBar.utils.is.
   * @function string
   * @param {*} value - The value to check.
   * @returns {boolean} `true` if the `value` is a string.
   * @example {@run true}
   * // alias the FooBar.utils.is namespace
   * var _is = FooBar.utils.is;
   *
   * console.log( _is.string( "" ) ); // => true
   * console.log( _is.string( undefined ) ); // => false
   * console.log( _is.string( null ) ); // => false
   * console.log( _is.string( 123 ) ); // => false
   */


  _.is.string = function (value) {
    return '[object String]' === Object.prototype.toString.call(value);
  };
  /**
   * @summary Checks if the `value` is `undefined`.
   * @memberof FooBar.utils.is.
   * @function undef
   * @param {*} value - The value to check is undefined.
   * @returns {boolean} `true` if the supplied `value` is `undefined`.
   * @example {@run true}
   * // alias the FooBar.utils.is namespace
   * var _is = FooBar.utils.is;
   *
   * console.log( _is.undef( undefined ) ); // => true
   * console.log( _is.undef( null ) ); // => false
   * console.log( _is.undef( 123 ) ); // => false
   * console.log( _is.undef( "" ) ); // => false
   */


  _.is.undef = function (value) {
    return typeof value === 'undefined';
  };
})( // dependencies
FooBar.utils.$, FooBar.utils);

(function ($, _, _is) {
  // only register methods if this version is the current version
  if (_.version !== '0.2.0') return;
  /**
   * @memberof FooBar.utils.
   * @namespace fn
   * @summary Contains common function utility methods.
   */

  _.fn = {};
  var fnStr = Function.prototype.toString;
  /**
   * @summary The regular expression to test if a function uses the `this._super` method applied by the {@link FooBar.utils.fn.add} method.
   * @memberof FooBar.utils.fn.
   * @name CONTAINS_SUPER
   * @type {RegExp}
   * @default /\b_super\b/
   * @readonly
   * @description When the script is first loaded into the page this performs a quick check to see if the browser supports function decompilation. If it does the regular expression is set to match the expected `_super`, however if  function decompilation is not supported, the regular expression is set to match anything effectively making the test always return `true`.
   * @example {@run true}
   * // alias the FooBar.utils.fn namespace
   * var _fn = FooBar.utils.fn;
   *
   * // create some functions to test
   * function testFn1(){}
   * function testFn2(){
   * 	this._super();
   * }
   *
   * console.log( _fn.CONTAINS_SUPER.test( testFn1 ) ); // => false
   * console.log( _fn.CONTAINS_SUPER.test( testFn2 ) ); // => true
   *
   * // NOTE: in browsers that don't support functional decompilation both tests will return `true`
   */

  _.fn.CONTAINS_SUPER = /xyz/.test(fnStr.call(function () {
    //noinspection JSUnresolvedVariable,BadExpressionStatementJS
    xyz;
  })) ? /\b_super\b/ : /.*/;
  /**
   * @summary Adds or overrides the given method `name` on the `proto` using the supplied `fn`.
   * @memberof FooBar.utils.fn.
   * @function addOrOverride
   * @param {Object} proto - The prototype to add the method to.
   * @param {string} name - The name of the method to add, if this already exists the original will be exposed within the scope of the supplied `fn` as `this._super`.
   * @param {function} fn - The function to add to the prototype, if this is overriding an existing method you can use `this._super` to access the original within its' scope.
   * @description If the new method overrides a pre-existing one, this function will expose the overridden method as `this._super` within the new methods scope.
   *
   * This replaces having to write out the following to override a method and call its original:
   *
   * ```javascript
   * var original = MyClass.prototype.someMethod;
   * MyClass.prototype.someMethod = function(arg1, arg2){
   * 	// execute the original
   * 	original.call(this, arg1, arg2);
   * };
   * ```
   *
   * With the following:
   *
   * ```javascript
   * FooBar.utils.fn.addOrOverride( MyClass.prototype, "someMethod", function(arg1, arg2){
   * 	// execute the original
   * 	this._super(arg1, arg2);
   * });
   * ```
   *
   * This method is used by the {@link FooBar.utils.Class} to implement the inheritance of individual methods.
   * @example {@run true}
   * // alias the FooBar.utils.fn namespace
   * var _fn = FooBar.utils.fn;
   *
   * var proto = {
   * 	write: function( message ){
   * 		console.log( "Original#write: " + message );
   * 	}
   * };
   *
   * proto.write( "My message" ); // => "Original#write: My message"
   *
   * _fn.addOrOverride( proto, "write", function( message ){
   * 	message = "Override#write: " + message;
   * 	this._super( message );
   * } );
   *
   * proto.write( "My message" ); // => "Original#write: Override#write: My message"
   */

  _.fn.addOrOverride = function (proto, name, fn) {
    if (!_is.object(proto) || !_is.string(name) || _is.empty(name) || !_is.fn(fn)) return;

    var _super = proto[name],
        wrap = _is.fn(_super) && _.fn.CONTAINS_SUPER.test(fnStr.call(fn)); // only wrap the function if it overrides a method and makes use of `_super` within it's body.


    proto[name] = wrap ? function (_super, fn) {
      // create a new wrapped that exposes the original method as `_super`
      return function () {
        var tmp = this._super;
        this._super = _super;
        var ret = fn.apply(this, arguments);
        this._super = tmp;
        return ret;
      };
    }(_super, fn) : fn;
  };
  /**
   * @summary Use the `Function.prototype.apply` method on a class constructor using the `new` keyword.
   * @memberof FooBar.utils.fn.
   * @function apply
   * @param {Object} klass - The class to create.
   * @param {Array} [args=[]] - The arguments to pass to the constructor.
   * @returns {Object} The new instance of the `klass` created with the supplied `args`.
   * @description When using the default `Function.prototype.apply` you can't use it on class constructors requiring the `new` keyword, this method allows us to do that.
   * @example {@run true}
   * // alias the FooBar.utils.fn namespace
   * var _fn = FooBar.utils.fn;
   *
   * // create a class to test with
   * function Test( name, value ){
   * 	if ( !( this instanceof Test )){
   * 		console.log( "Test instantiated without the `new` keyword." );
   * 		return;
   * 	}
   * 	console.log( "Test: name = " + name + ", value = " + value );
   * }
   *
   * Test.apply( Test, ["My name", "My value"] ); // => "Test instantiated without the `new` keyword."
   * _fn.apply( Test, ["My name", "My value"] ); // => "Test: name = My name, value = My value"
   */


  _.fn.apply = function (klass, args) {
    args = _is.array(args) ? args : [];

    function Class() {
      return klass.apply(this, args);
    }

    Class.prototype = klass.prototype;
    return new Class();
  };
  /**
   * @summary Converts the default `arguments` object into a proper array.
   * @memberof FooBar.utils.fn.
   * @function arg2arr
   * @param {IArguments} args - The arguments object to create an array from.
   * @returns {Array}
   * @description This method is simply a replacement for calling `Array.prototype.slice.call()` to create an array from an `arguments` object.
   * @example {@run true}
   * // alias the FooBar.utils.fn namespace
   * var _fn = FooBar.utils.fn;
   *
   * function callMe(){
   * 	var args = _fn.arg2arr(arguments);
   * 	console.log( arguments instanceof Array ); // => false
   * 	console.log( args instanceof Array ); // => true
   * 	console.log( args ); // => [ "arg1", "arg2" ]
   * }
   *
   * callMe("arg1", "arg2");
   */


  _.fn.arg2arr = function (args) {
    return Array.prototype.slice.call(args);
  };
  /**
   * @summary Debounces the `fn` by the supplied `time`.
   * @memberof FooBar.utils.fn.
   * @function debounce
   * @param {function} fn - The function to debounce.
   * @param {number} time - The time in milliseconds to delay execution.
   * @returns {function}
   * @description This returns a wrapped version of the `fn` which delays its' execution by the supplied `time`. Additional calls to the function will extend the delay until the `time` expires.
   */


  _.fn.debounce = function (fn, time) {
    var timeout;
    return function () {
      var ctx = this,
          args = _.fn.arg2arr(arguments);

      clearTimeout(timeout);
      timeout = setTimeout(function () {
        fn.apply(ctx, args);
      }, time);
    };
  };
  /**
   * @summary Throttles the `fn` by the supplied `time`.
   * @memberof FooBar.utils.fn.
   * @function throttle
   * @param {function} fn - The function to throttle.
   * @param {number} time - The time in milliseconds to delay execution.
   * @returns {function}
   * @description This returns a wrapped version of the `fn` which ensures it's executed only once every `time` milliseconds. The first call to the function will be executed, after that only the last of any additional calls will be executed once the `time` expires.
   */


  _.fn.throttle = function (fn, time) {
    var last, timeout;
    return function () {
      var ctx = this,
          args = _.fn.arg2arr(arguments);

      if (!last) {
        fn.apply(ctx, args);
        last = Date.now();
      } else {
        clearTimeout(timeout);
        timeout = setTimeout(function () {
          if (Date.now() - last >= time) {
            fn.apply(ctx, args);
            last = Date.now();
          }
        }, time - (Date.now() - last));
      }
    };
  };
  /**
   * @summary Checks the given `value` and ensures a function is returned.
   * @memberof FooBar.utils.fn.
   * @function check
   * @param {?Object} thisArg=window - The `this` keyword within the returned function, if the supplied value is not an object this defaults to the `window`.
   * @param {*} value - The value to check, if not a function or the name of one then the `def` value is automatically returned.
   * @param {function} [def=jQuery.noop] - A default function to use if the `value` is not resolved to a function.
   * @param {Object} [ctx=window] - If the `value` is a string this is supplied to the {@link FooBar.utils.fn.fetch} method as the content to retrieve the function from.
   * @returns {function} A function that ensures the correct context is applied when executed.
   * @description This function is primarily used to check the value of a callback option that could be supplied as either a function or a string.
   *
   * When just the function name is supplied this method uses the {@link FooBar.utils.fn.fetch} method to resolve and wrap it to ensure when it's called the correct context is applied.
   *
   * Being able to resolve a function from a name allows callbacks to be easily set even through data attributes as you can just supply the full function name as a string and then use this method to retrieve the actual function.
   * @example {@run true}
   * // alias the FooBar.utils.fn namespace
   * var _fn = FooBar.utils.fn;
   *
   * // a simple `api` with a `sendMessage` function
   * window.api = {
   * 	sendMessage: function(){
   * 		this.write( "window.api.sendMessage" );
   * 	},
   * 	child: {
   * 		api: {
   * 			sendMessage: function(){
   * 				this.write( "window.api.child.api.sendMessage" );
   * 			}
   * 		}
   * 	}
   * };
   *
   * // a default function to use in case the check fails
   * var def = function(){
   * 	this.write( "default" );
   * };
   *
   * // an object to use as the `this` object within the scope of the checked functions
   * var thisArg = {
   * 	write: function( message ){
   * 		console.log( message );
   * 	}
   * };
   *
   * // check the value and return a wrapped function ensuring the correct context.
   * var fn = _fn.check( thisArg, null, def );
   * fn(); // => "default"
   *
   * fn = _fn.check( thisArg, "api.doesNotExist", def );
   * fn(); // => "default"
   *
   * fn = _fn.check( thisArg, api.sendMessage, def );
   * fn(); // => "window.api.sendMessage"
   *
   * fn = _fn.check( thisArg, "api.sendMessage", def );
   * fn(); // => "window.api.sendMessage"
   *
   * fn = _fn.check( thisArg, "api.sendMessage", def, window.api.child );
   * fn(); // => "window.api.child.api.sendMessage"
   */


  _.fn.check = function (thisArg, value, def, ctx) {
    def = _is.fn(def) ? def : $.noop;
    thisArg = _is.object(thisArg) ? thisArg : window;

    function wrap(fn) {
      return function () {
        return fn.apply(thisArg, arguments);
      };
    }

    value = _is.string(value) ? _.fn.fetch(value, ctx) : value;
    return _is.fn(value) ? wrap(value) : wrap(def);
  };
  /**
   * @summary Fetches a function given its `name`.
   * @memberof FooBar.utils.fn.
   * @function fetch
   * @param {string} name - The name of the function to fetch. This can be a `.` notated name.
   * @param {Object} [ctx=window] - The context to retrieve the function from, defaults to the `window` object.
   * @returns {?function} `null` if a function with the given name is not found within the context.
   * @example {@run true}
   * // alias the FooBar.utils.fn namespace
   * var _fn = FooBar.utils.fn;
   *
   * // create a dummy `api` with a `sendMessage` function to test
   * window.api = {
   * 	sendMessage: function( message ){
   * 		console.log( "api.sendMessage: " + message );
   * 	}
   * };
   *
   * // the below shows 3 different ways to fetch the `sendMessage` function
   * var send1 = _fn.fetch( "api.sendMessage" );
   * var send2 = _fn.fetch( "api.sendMessage", window );
   * var send3 = _fn.fetch( "sendMessage", window.api );
   *
   * // all the retrieved methods should be the same
   * console.log( send1 === send2 && send2 === send3 ); // => true
   *
   * // check if the function was found
   * if ( send1 != null ){
   * 	send1( "My message" ); // => "api.sendMessage: My message"
   * }
   */


  _.fn.fetch = function (name, ctx) {
    if (!_is.string(name) || _is.empty(name)) return null;
    ctx = _is.object(ctx) ? ctx : window;
    $.each(name.split('.'), function (i, part) {
      if (ctx[part]) ctx = ctx[part];else return false;
    });
    return _is.fn(ctx) ? ctx : null;
  };
  /**
   * @summary Enqueues methods using the given `name` from all supplied `objects` and executes each in order with the given arguments.
   * @memberof FooBar.utils.fn.
   * @function enqueue
   * @param {Array.<Object>} objects - The objects to call the method on.
   * @param {string} name - The name of the method to execute.
   * @param {*} [arg1] - The first argument to call the method with.
   * @param {...*} [argN] - Any additional arguments for the method.
   * @returns {Promise} If `resolved` the first argument supplied to any success callbacks is an array of all returned value(s). These values are encapsulated within their own array as if the method returned a promise it could be resolved with more than one argument.
   *
   * If `rejected` any fail callbacks are supplied the arguments the promise was rejected with plus an additional one appended by this method, an array of all objects that have already had their methods run. This allows you to perform rollback operations if required after a failure. The last object in this array would contain the method that raised the error.
   * @description This method allows an array of `objects` that implement a common set of methods to be executed in a supplied order. Each method in the queue is only executed after the successful completion of the previous. Success is evaluated as the method did not throw an error and if it returned a promise it was resolved.
   *
   * An example of this being used within the plugin is the loading and execution of methods on the various components. Using this method ensures components are loaded and have their methods executed in a static order regardless of when they were registered with the plugin or if the method is async. This way if `ComponentB`'s `preinit` relies on properties set in `ComponentA`'s `preinit` method you can register `ComponentB` with a lower priority than `ComponentA` and you can be assured `ComponentA`'s `preinit` completed successfully before `ComponentB`'s `preinit` is called event if it performs an async operation.
   * @example {@caption Shows a basic example of how you can use this method.}{@run true}
   * // alias the FooBar.utils.fn namespace
   * var _fn = FooBar.utils.fn;
   *
   * // create some dummy objects that implement the same members or methods.
   * var obj1 = {
   * 	"name": "obj1",
   * 	"appendName": function(str){
   * 		console.log( "Executing obj1.appendName..." );
   * 		return str + this.name;
   * 	}
   * };
   *
   * // this objects `appendName` method returns a promise
   * var obj2 = {
   * 	"name": "obj2",
   * 	"appendName": function(str){
   * 		console.log( "Executing obj2.appendName..." );
   * 		var self = this;
   * 		return $.Deferred(function(def){
   *			// use a setTimeout to delay execution
   *			setTimeout(function(){
   *					def.resolve(str + self.name);
   *			}, 300);
   * 		});
   * 	}
   * };
   *
   * // this objects `appendName` method is only executed once obj2's promise is resolved
   * var obj3 = {
   * 	"name": "obj3",
   * 	"appendName": function(str){
   * 		console.log( "Executing obj3.appendName..." );
   * 		return str + this.name;
   * 	}
   * };
   *
   * _fn.enqueue( [obj1, obj2, obj3], "appendName", "modified_by:" ).then(function(results){
   * 	console.log( results ); // => [ [ "modified_by:obj1" ], [ "modified_by:obj2" ], [ "modified_by:obj3" ] ]
   * });
   * @example {@caption If an error is thrown by one of the called methods or it returns a promise that is rejected, execution is halted and any fail callbacks are executed. The last argument is an array of objects that have had their methods run, the last object within this array is the one that raised the error.}{@run true}
   * // alias the FooBar.utils.fn namespace
   * var _fn = FooBar.utils.fn;
   *
   * // create some dummy objects that implement the same members or methods.
   * var obj1 = {
   * 	"name": "obj1",
   * 	"last": null,
   * 	"appendName": function(str){
   * 		console.log( "Executing obj1.appendName..." );
   * 		return this.last = str + this.name;
   * 	},
   * 	"rollback": function(){
   * 		console.log( "Executing obj1.rollback..." );
   * 		this.last = null;
   * 	}
   * };
   *
   * // this objects `appendName` method throws an error
   * var obj2 = {
   * 	"name": "obj2",
   * 	"last": null,
   * 	"appendName": function(str){
   * 		console.log( "Executing obj2.appendName..." );
   * 		//throw new Error("Oops, something broke.");
   * 		var self = this;
   * 		return $.Deferred(function(def){
   *			// use a setTimeout to delay execution
   *			setTimeout(function(){
   *					self.last = str + self.name;
   *					def.reject(Error("Oops, something broke."));
   *			}, 300);
   * 		});
   * 	},
   * 	"rollback": function(){
   * 		console.log( "Executing obj2.rollback..." );
   * 		this.last = null;
   * 	}
   * };
   *
   * // this objects `appendName` and `rollback` methods are never executed
   * var obj3 = {
   * 	"name": "obj3",
   * 	"last": null,
   * 	"appendName": function(str){
   * 		console.log( "Executing obj3.appendName..." );
   * 		return this.last = str + this.name;
   * 	},
   * 	"rollback": function(){
   * 		console.log( "Executing obj3.rollback..." );
   * 		this.last = null;
   * 	}
   * };
   *
   * _fn.enqueue( [obj1, obj2, obj3], "appendName", "modified_by:" ).fail(function(err, run){
   * 	console.log( err.message ); // => "Oops, something broke."
   * 	console.log( run ); // => [ {"name":"obj1","last":"modified_by:obj1"}, {"name":"obj2","last":"modified_by:obj2"} ]
   * 	var guilty = run[run.length - 1];
   * 	console.log( "Error thrown by: " + guilty.name ); // => "obj2"
   * 	run.reverse(); // reverse execution when rolling back to avoid dependency issues
   * 	return _fn.enqueue( run, "rollback" ).then(function(){
   * 		console.log( "Error handled and rollback performed." );
   * 		console.log( run ); // => [ {"name":"obj1","last":null}, {"name":"obj2","last":null} ]
   * 	});
   * });
   */


  _.fn.enqueue = function (objects, name, arg1, argN) {
    var args = _.fn.arg2arr(arguments),
        // get an array of all supplied arguments
    def = $.Deferred(),
        // the main deferred object for the function
    queue = $.Deferred(),
        // the deferred object to use as an queue
    promise = queue.promise(),
        // used to register component methods for execution
    results = [],
        // stores the results of each method to be returned by the main deferred
    run = [],
        // stores each object once its' method has been run
    first = true; // whether or not this is the first resolve callback
    // take the objects and name parameters out of the args array


    objects = args.shift();
    name = args.shift(); // safely execute a function, catch any errors and reject the deferred if required.

    function safe(obj, method) {
      try {
        run.push(obj);
        return method.apply(obj, args);
      } catch (err) {
        def.reject(err, run);
        return def;
      }
    } // loop through all the supplied objects


    $.each(objects, function (i, obj) {
      // if the obj has a function with the supplied name
      if (_is.fn(obj[name])) {
        // then register the method in the callback queue
        promise = promise.then(function () {
          // only register the result if this is not the first resolve callback, the first is triggered by this function kicking off the queue
          if (!first) {
            var resolveArgs = _.fn.arg2arr(arguments);

            results.push(resolveArgs);
          }

          first = false; // execute the method and return it's result, if the result is a promise
          // the next method will only be executed once it's resolved

          return safe(obj, obj[name]);
        });
      }
    }); // add one last callback to catch the final result

    promise.then(function () {
      // only register the result if this is not the first resolve callback
      if (!first) {
        var resolveArgs = _.fn.arg2arr(arguments);

        results.push(resolveArgs);
      }

      first = false; // resolve the main deferred with the array of all the method results

      def.resolve(results);
    }); // hook into failures and ensure the run array is appended to the args

    promise.fail(function () {
      var rejectArgs = _.fn.arg2arr(arguments);

      rejectArgs.push(run);
      def.reject.apply(def, rejectArgs);
    }); // kick off the queue

    queue.resolve();
    return def.promise();
  };
  /**
   * @summary Waits for the outcome of all promises regardless of failure and resolves supplying the results of just those that succeeded.
   * @memberof FooBar.utils.fn.
   * @function when
   * @param {Promise[]} promises - The array of promises to wait for.
   * @returns {Promise}
   */


  _.fn.when = function (promises) {
    if (!_is.array(promises) || _is.empty(promises)) return $.when();
    var d = $.Deferred(),
        results = [],
        remaining = promises.length;

    function reduceRemaining() {
      remaining--; // always mark as finished

      if (!remaining) d.resolve(results);
    }

    for (var i = 0; i < promises.length; i++) {
      if (_is.promise(promises[i])) {
        promises[i].then(function (res) {
          results.push(res); // on success, add to results
        }).always(reduceRemaining);
      } else {
        reduceRemaining();
      }
    }

    return d.promise(); // return a promise on the remaining values
  };
  /**
   * @summary Return a promise rejected using the supplied args.
   * @memberof FooBar.utils.fn.
   * @function rejectWith
   * @param {*} [arg1] - The first argument to reject the promise with.
   * @param {...*} [argN] - Any additional arguments to reject the promise with.
   * @returns {Promise}
   */


  _.fn.rejectWith = function (arg1, argN) {
    var def = $.Deferred(),
        args = _.fn.arg2arr(arguments);

    return def.reject.apply(def, args).promise();
  };
  /**
   * @summary Return a promise resolved using the supplied args.
   * @memberof FooBar.utils.fn.
   * @function resolveWith
   * @param {*} [arg1] - The first argument to resolve the promise with.
   * @param {...*} [argN] - Any additional arguments to resolve the promise with.
   * @returns {Promise}
   */


  _.fn.resolveWith = function (arg1, argN) {
    var def = $.Deferred(),
        args = _.fn.arg2arr(arguments);

    return def.resolve.apply(def, args).promise();
  };
  /**
   * @summary A resolved promise object.
   * @memberof FooBar.utils.fn.
   * @name resolved
   * @type {Promise}
   */


  _.fn.resolved = $.Deferred().resolve().promise();
  /**
   * @summary A rejected promise object.
   * @memberof FooBar.utils.fn.
   * @name rejected
   * @type {Promise}
   */

  _.fn.rejected = $.Deferred().reject().promise();
})( // dependencies
FooBar.utils.$, FooBar.utils, FooBar.utils.is);

(function (_, _is) {
  // only register methods if this version is the current version
  if (_.version !== '0.2.0') return;
  /**
   * @summary Contains common url utility methods.
   * @memberof FooBar.utils.
   * @namespace url
   */

  _.url = {}; // used for parsing a url into it's parts.

  var _a = document.createElement('a');
  /**
   * @summary Parses the supplied url into an object containing it's component parts.
   * @memberof FooBar.utils.url.
   * @function parts
   * @param {string} url - The url to parse.
   * @returns {FooBar.utils.url~Parts}
   * @example {@run true}
   * // alias the FooBar.utils.url namespace
   * var _url = FooBar.utils.url;
   *
   * console.log( _url.parts( "http://example.com/path/?param=true#something" ) ); // => {"hash":"#something", ...}
   */


  _.url.parts = function (url) {
    _a.href = url;
    var port = _a.port ? _a.port : ["http:", "https:"].indexOf(_a.protocol) !== -1 ? _a.protocol === "https:" ? "443" : "80" : "",
        host = _a.hostname + (port ? ":" + port : ""),
        origin = _a.origin ? _a.origin : _a.protocol + "//" + host,
        pathname = _a.pathname.slice(0, 1) === "/" ? _a.pathname : "/" + _a.pathname;
    return {
      hash: _a.hash,
      host: host,
      hostname: _a.hostname,
      href: _a.href,
      origin: origin,
      pathname: pathname,
      port: port,
      protocol: _a.protocol,
      search: _a.search
    };
  };
  /**
   * @summary Given a <code>url</code> that could be relative or full this ensures a full url is returned.
   * @memberof FooBar.utils.url.
   * @function full
   * @param {string} url - The url to ensure is full.
   * @returns {?string} `null` if the given `path` is not a string or empty.
   * @description Given a full url this will simply return it however if given a relative url this will create a full url using the current location to fill in the blanks.
   * @example {@run true}
   * // alias the FooBar.utils.url namespace
   * var _url = FooBar.utils.url;
   *
   * console.log( _url.full( "http://example.com/path/" ) ); // => "http://example.com/path/"
   * console.log( _url.full( "/path/" ) ); // => "{protocol}//{host}/path/"
   * console.log( _url.full( "path/" ) ); // => "{protocol}//{host}/{pathname}/path/"
   * console.log( _url.full( "../path/" ) ); // => "{protocol}//{host}/{calculated pathname}/path/"
   * console.log( _url.full() ); // => null
   * console.log( _url.full( 123 ) ); // => null
   */


  _.url.full = function (url) {
    if (!_is.string(url) || _is.empty(url)) return null;
    _a.href = url;
    return _a.href;
  };
  /**
   * @summary Gets or sets a parameter in the given <code>search</code> string.
   * @memberof FooBar.utils.url.
   * @function param
   * @param {string} search - The search string to use (usually `location.search`).
   * @param {string} key - The key of the parameter.
   * @param {?string} [value] - The value to set for the parameter. If not provided the current value for the `key` is returned.
   * @returns {?string} The value of the `key` in the given `search` string if no `value` is supplied or `null` if the `key` does not exist.
   * @returns {string} A modified `search` string if a `value` is supplied.
   * @example <caption>Shows how to retrieve a parameter value from a search string.</caption>{@run true}
   * // alias the FooBar.utils.url namespace
   * var _url = FooBar.utils.url,
   * 	// create a search string to test
   * 	search = "?wmode=opaque&autoplay=1";
   *
   * console.log( _url.param( search, "wmode" ) ); // => "opaque"
   * console.log( _url.param( search, "autoplay" ) ); // => "1"
   * console.log( _url.param( search, "nonexistent" ) ); // => null
   * @example <caption>Shows how to set a parameter value in the given search string.</caption>{@run true}
   * // alias the FooBar.utils.url namespace
   * var _url = FooBar.utils.url,
   * 	// create a search string to test
   * 	search = "?wmode=opaque&autoplay=1";
   *
   * console.log( _url.param( search, "wmode", "window" ) ); // => "?wmode=window&autoplay=1"
   * console.log( _url.param( search, "autoplay", "0" ) ); // => "?wmode=opaque&autoplay=0"
   * console.log( _url.param( search, "v", "2" ) ); // => "?wmode=opaque&autoplay=1&v=2"
   */


  _.url.param = function (search, key, value) {
    if (!_is.string(search) || !_is.string(key) || _is.empty(key)) return search;
    var regex, match, result, param;

    if (_is.undef(value)) {
      regex = new RegExp('[?|&]' + key + '=([^&;]+?)(&|#|;|$)'); // regex to match the key and it's value but only capture the value

      match = regex.exec(search) || ["", ""]; // match the param otherwise return an empty string match

      result = match[1].replace(/\+/g, '%20'); // replace any + character's with spaces

      return _is.string(result) && !_is.empty(result) ? decodeURIComponent(result) : null; // decode the result otherwise return null
    }

    if (_is.empty(value)) {
      regex = new RegExp('^([^#]*\?)(([^#]*)&)?' + key + '(\=[^&#]*)?(&|#|$)');
      result = search.replace(regex, '$1$3$5').replace(/^([^#]*)((\?)&|\?(#|$))/, '$1$3$4');
    } else {
      regex = new RegExp('([?&])' + key + '[^&]*'); // regex to match the key and it's current value but only capture the preceding ? or & char

      param = key + '=' + encodeURIComponent(value);
      result = search.replace(regex, '$1' + param); // replace any existing instance of the key with the new value
      // If nothing was replaced, then add the new param to the end

      if (result === search && !regex.test(result)) {
        // if no replacement occurred and the parameter is not currently in the result then add it
        result += (result.indexOf("?") !== -1 ? '&' : '?') + param;
      }
    }

    return result;
  }; //######################
  //## Type Definitions ##
  //######################

  /**
   * @summary A plain JavaScript object returned by the {@link FooBar.utils.url.parts} method.
   * @typedef {Object} FooBar.utils.url~Parts
   * @property {string} hash - A string containing a `#` followed by the fragment identifier of the URL.
   * @property {string} host - A string containing the host, that is the hostname, a `:`, and the port of the URL.
   * @property {string} hostname - A string containing the domain of the URL.
   * @property {string} href - A string containing the entire URL.
   * @property {string} origin - A string containing the canonical form of the origin of the specific location.
   * @property {string} pathname - A string containing an initial `/` followed by the path of the URL.
   * @property {string} port - A string containing the port number of the URL.
   * @property {string} protocol - A string containing the protocol scheme of the URL, including the final `:`.
   * @property {string} search - A string containing a `?` followed by the parameters of the URL. Also known as "querystring".
   * @see {@link FooBar.utils.url.parts} for example usage.
   */

})( // dependencies
FooBar.utils, FooBar.utils.is);

(function (_, _is, _fn) {
  // only register methods if this version is the current version
  if (_.version !== '0.2.0') return;
  /**
   * @summary Contains common string utility methods.
   * @memberof FooBar.utils.
   * @namespace str
   */

  _.str = {};
  /**
   * @summary Converts the given `target` to camel case.
   * @memberof FooBar.utils.str.
   * @function camel
   * @param {string} target - The string to camel case.
   * @returns {string}
   * @example {@run true}
   * // alias the FooBar.utils.str namespace
   * var _str = FooBar.utils.str;
   *
   * console.log( _str.camel( "max-width" ) ); // => "maxWidth"
   * console.log( _str.camel( "max--width" ) ); // => "maxWidth"
   * console.log( _str.camel( "max Width" ) ); // => "maxWidth"
   * console.log( _str.camel( "Max_width" ) ); // => "maxWidth"
   * console.log( _str.camel( "MaxWidth" ) ); // => "maxWidth"
   * console.log( _str.camel( "Abbreviations like CSS are left intact" ) ); // => "abbreviationsLikeCSSAreLeftIntact"
   */

  _.str.camel = function (target) {
    if (_is.empty(target)) return target;
    if (target.toUpperCase() === target) return target.toLowerCase();
    return target.replace(/^([A-Z])|[-\s_]+(\w)/g, function (match, p1, p2) {
      if (_is.string(p2)) return p2.toUpperCase();
      return p1.toLowerCase();
    });
  };
  /**
   * @summary Converts the given `target` to kebab case. Non-alphanumeric characters are converted to `-`.
   * @memberof FooBar.utils.str.
   * @function kebab
   * @param {string} target - The string to kebab case.
   * @returns {string}
   * @example {@run true}
   * // alias the FooBar.utils.str namespace
   * var _str = FooBar.utils.str;
   *
   * console.log( _str.kebab( "max-width" ) ); // => "max-width"
   * console.log( _str.kebab( "max--width" ) ); // => "max-width"
   * console.log( _str.kebab( "max Width" ) ); // => "max-width"
   * console.log( _str.kebab( "Max_width" ) ); // => "max-width"
   * console.log( _str.kebab( "MaxWidth" ) ); // => "max-width"
   * console.log( _str.kebab( "Non-alphanumeric ch@racters are converted to dashes!" ) ); // => "non-alphanumeric-ch-racters-are-converted-to-dashes"
   */


  _.str.kebab = function (target) {
    if (_is.empty(target)) return target;
    return target.match(/[A-Z]{2,}(?=[A-Z][a-z0-9]*|\b)|[A-Z]?[a-z0-9]*|[A-Z]|[0-9]+/g).filter(Boolean).map(function (x) {
      return x.toLowerCase();
    }).join('-');
  };
  /**
   * @summary Checks if the `target` contains the given `substr`.
   * @memberof FooBar.utils.str.
   * @function contains
   * @param {string} target - The string to check.
   * @param {string} substr - The string to check for.
   * @param {boolean} [ignoreCase=false] - Whether or not to ignore casing when performing the check.
   * @returns {boolean} `true` if the `target` contains the given `substr`.
   * @example {@run true}
   * // alias the FooBar.utils.str namespace
   * var _str = FooBar.utils.str,
   * 	// create a string to test
   * 	target = "To be, or not to be, that is the question.";
   *
   * console.log( _str.contains( target, "To be" ) ); // => true
   * console.log( _str.contains( target, "question" ) ); // => true
   * console.log( _str.contains( target, "no" ) ); // => true
   * console.log( _str.contains( target, "nonexistent" ) ); // => false
   * console.log( _str.contains( target, "TO BE" ) ); // => false
   * console.log( _str.contains( target, "TO BE", true ) ); // => true
   */


  _.str.contains = function (target, substr, ignoreCase) {
    if (!_is.string(target) || _is.empty(target) || !_is.string(substr) || _is.empty(substr)) return false;
    return substr.length <= target.length && (!!ignoreCase ? target.toUpperCase().indexOf(substr.toUpperCase()) : target.indexOf(substr)) !== -1;
  };
  /**
   * @summary Checks if the `target` contains the given `word`.
   * @memberof FooBar.utils.str.
   * @function containsWord
   * @param {string} target - The string to check.
   * @param {string} word - The word to check for.
   * @param {boolean} [ignoreCase=false] - Whether or not to ignore casing when performing the check.
   * @returns {boolean} `true` if the `target` contains the given `word`.
   * @description This method differs from {@link FooBar.utils.str.contains} in that it searches for whole words by splitting the `target` string on word boundaries (`\b`) and then comparing the individual parts.
   * @example {@run true}
   * // alias the FooBar.utils.str namespace
   * var _str = FooBar.utils.str,
   * 	// create a string to test
   * 	target = "To be, or not to be, that is the question.";
   *
   * console.log( _str.containsWord( target, "question" ) ); // => true
   * console.log( _str.containsWord( target, "no" ) ); // => false
   * console.log( _str.containsWord( target, "NOT" ) ); // => false
   * console.log( _str.containsWord( target, "NOT", true ) ); // => true
   * console.log( _str.containsWord( target, "nonexistent" ) ); // => false
   */


  _.str.containsWord = function (target, word, ignoreCase) {
    if (!_is.string(target) || _is.empty(target) || !_is.string(word) || _is.empty(word) || target.length < word.length) return false;
    var parts = target.split(/\W/);

    for (var i = 0, len = parts.length; i < len; i++) {
      if (ignoreCase ? parts[i].toUpperCase() === word.toUpperCase() : parts[i] === word) return true;
    }

    return false;
  };
  /**
   * @summary Checks if the `target` ends with the given `substr`.
   * @memberof FooBar.utils.str.
   * @function endsWith
   * @param {string} target - The string to check.
   * @param {string} substr - The substr to check for.
   * @returns {boolean} `true` if the `target` ends with the given `substr`.
   * @example {@run true}
   * // alias the FooBar.utils.str namespace
   * var _str = FooBar.utils.str;
   *
   * console.log( _str.endsWith( "something", "g" ) ); // => true
   * console.log( _str.endsWith( "something", "ing" ) ); // => true
   * console.log( _str.endsWith( "something", "no" ) ); // => false
   */


  _.str.endsWith = function (target, substr) {
    if (!_is.string(target) || _is.empty(target) || !_is.string(substr) || _is.empty(substr)) return target === substr;
    return target.slice(target.length - substr.length) === substr;
  };
  /**
   * @summary Escapes the `target` for use in a regular expression.
   * @memberof FooBar.utils.str.
   * @function escapeRegExp
   * @param {string} target - The string to escape.
   * @returns {string}
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions|Regular Expressions: Using Special Characters - JavaScript | MDN}
   */


  _.str.escapeRegExp = function (target) {
    if (_is.empty(target)) return target;
    return target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  };
  /**
   * @summary Generates a 32 bit FNV-1a hash from the given `target`.
   * @memberof FooBar.utils.str.
   * @function fnv1a
   * @param {string} target - The string to generate a hash from.
   * @returns {?number} `null` if the `target` is not a string or empty otherwise a 32 bit FNV-1a hash.
   * @example {@run true}
   * // alias the FooBar.utils.str namespace
   * var _str = FooBar.utils.str;
   *
   * console.log( _str.fnv1a( "Some string to generate a hash for." ) ); // => 207568994
   * console.log( _str.fnv1a( "Some string to generate a hash for" ) ); // => 1350435704
   * @see {@link https://en.wikipedia.org/wiki/Fowler%E2%80%93Noll%E2%80%93Vo_hash_function|Fowler–Noll–Vo hash function}
   */


  _.str.fnv1a = function (target) {
    if (!_is.string(target) || _is.empty(target)) return null;
    var i,
        l,
        hval = 0x811c9dc5;

    for (i = 0, l = target.length; i < l; i++) {
      hval ^= target.charCodeAt(i);
      hval += (hval << 1) + (hval << 4) + (hval << 7) + (hval << 8) + (hval << 24);
    }

    return hval >>> 0;
  };
  /**
   * @summary Returns the remainder of the `target` split on the first index of the given `substr`.
   * @memberof FooBar.utils.str.
   * @function from
   * @param {string} target - The string to split.
   * @param {string} substr - The substring to split on.
   * @returns {?string} `null` if the given `substr` does not exist within the `target`.
   * @example {@run true}
   * // alias the FooBar.utils.str namespace
   * var _str = FooBar.utils.str,
   * 	// create a string to test
   * 	target = "To be, or not to be, that is the question.";
   *
   * console.log( _str.from( target, "no" ) ); // => "t to be, that is the question."
   * console.log( _str.from( target, "that" ) ); // => " is the question."
   * console.log( _str.from( target, "question" ) ); // => "."
   * console.log( _str.from( target, "nonexistent" ) ); // => null
   */


  _.str.from = function (target, substr) {
    return _.str.contains(target, substr) ? target.substring(target.indexOf(substr) + substr.length) : null;
  };
  /**
   * @summary Joins any number of strings using the given `separator`.
   * @memberof FooBar.utils.str.
   * @function join
   * @param {string} separator - The separator to use to join the strings.
   * @param {string} part - The first string to join.
   * @param {...string} [partN] - Any number of additional strings to join.
   * @returns {?string}
   * @description This method differs from using the standard `Array.prototype.join` function to join strings in that it ignores empty parts and checks to see if each starts with the supplied `separator`. If the part starts with the `separator` it is removed before appending it to the final result.
   * @example {@run true}
   * // alias the FooBar.utils.str namespace
   * var _str = FooBar.utils.str;
   *
   * console.log( _str.join( "_", "all", "in", "one" ) ); // => "all_in_one"
   * console.log( _str.join( "_", "all", "_in", "one" ) ); // => "all_in_one"
   * console.log( _str.join( "/", "http://", "/example.com/", "/path/to/image.png" ) ); // => "http://example.com/path/to/image.png"
   * console.log( _str.join( "/", "http://", "/example.com", "/path/to/image.png" ) ); // => "http://example.com/path/to/image.png"
   * console.log( _str.join( "/", "http://", "example.com", "path/to/image.png" ) ); // => "http://example.com/path/to/image.png"
   */


  _.str.join = function (separator, part, partN) {
    if (!_is.string(separator) || !_is.string(part)) return null;

    var parts = _fn.arg2arr(arguments);

    separator = parts.shift();
    var i,
        l,
        result = parts.shift();

    for (i = 0, l = parts.length; i < l; i++) {
      part = parts[i];
      if (_is.empty(part)) continue;

      if (_.str.endsWith(result, separator)) {
        result = result.slice(0, result.length - separator.length);
      }

      if (_.str.startsWith(part, separator)) {
        part = part.slice(separator.length);
      }

      result += separator + part;
    }

    return result;
  };
  /**
   * @summary Checks if the `target` starts with the given `substr`.
   * @memberof FooBar.utils.str.
   * @function startsWith
   * @param {string} target - The string to check.
   * @param {string} substr - The substr to check for.
   * @returns {boolean} `true` if the `target` starts with the given `substr`.
   * @example {@run true}
   * // alias the FooBar.utils.str namespace
   * var _str = FooBar.utils.str;
   *
   * console.log( _str.startsWith( "something", "s" ) ); // => true
   * console.log( _str.startsWith( "something", "some" ) ); // => true
   * console.log( _str.startsWith( "something", "no" ) ); // => false
   */


  _.str.startsWith = function (target, substr) {
    if (_is.empty(target) || _is.empty(substr)) return false;
    return target.slice(0, substr.length) === substr;
  };
  /**
   * @summary Returns the first part of the `target` split on the first index of the given `substr`.
   * @memberof FooBar.utils.str.
   * @function until
   * @param {string} target - The string to split.
   * @param {string} substr - The substring to split on.
   * @returns {string} The `target` if the `substr` does not exist.
   * @example {@run true}
   * // alias the FooBar.utils.str namespace
   * var _str = FooBar.utils.str,
   * 	// create a string to test
   * 	target = "To be, or not to be, that is the question.";
   *
   * console.log( _str.until( target, "no" ) ); // => "To be, or "
   * console.log( _str.until( target, "that" ) ); // => "To be, or not to be, "
   * console.log( _str.until( target, "question" ) ); // => "To be, or not to be, that is the "
   * console.log( _str.until( target, "nonexistent" ) ); // => "To be, or not to be, that is the question."
   */


  _.str.until = function (target, substr) {
    return _.str.contains(target, substr) ? target.substring(0, target.indexOf(substr)) : target;
  };
  /**
   * @summary A basic string formatter that can use both index and name based placeholders but handles only string or number replacements.
   * @memberof FooBar.utils.str.
   * @function format
   * @param {string} target - The format string containing any placeholders to replace.
   * @param {string|number|Object|Array} arg1 - The first value to format the target with. If an object is supplied it's properties are used to match named placeholders. If an array, string or number is supplied it's values are used to match any index placeholders.
   * @param {...(string|number)} [argN] - Any number of additional strings or numbers to format the target with.
   * @returns {string} The string formatted with the supplied arguments.
   * @description This method allows you to supply the replacements as an object when using named placeholders or as an array or additional arguments when using index placeholders.
   *
   * This does not perform a simultaneous replacement of placeholders, which is why it's referred to as a basic formatter. This means replacements that contain placeholders within there value could end up being replaced themselves as seen in the last example.
   * @example {@caption The following shows how to use index placeholders.}{@run true}
   * // alias the FooBar.utils.str namespace
   * var _str = FooBar.utils.str,
   * 	// create a format string using index placeholders
   * 	format = "Hello, {0}, are you feeling {1}?";
   *
   * console.log( _str.format( format, "Steve", "OK" ) ); // => "Hello, Steve, are you feeling OK?"
   * // or
   * console.log( _str.format( format, [ "Steve", "OK" ] ) ); // => "Hello, Steve, are you feeling OK?"
   * @example {@caption While the above works perfectly fine the downside is that the placeholders provide no clues as to what should be supplied as a replacement value, this is were supplying an object and using named placeholders steps in.}{@run true}
   * // alias the FooBar.utils.str namespace
   * var _str = FooBar.utils.str,
   * 	// create a format string using named placeholders
   * 	format = "Hello, {name}, are you feeling {adjective}?";
   *
   * console.log( _str.format( format, {name: "Steve", adjective: "OK"} ) ); // => "Hello, Steve, are you feeling OK?"
   * @example {@caption The following demonstrates the issue with not performing a simultaneous replacement of placeholders.}{@run true}
   * // alias the FooBar.utils.str namespace
   * var _str = FooBar.utils.str;
   *
   * console.log( _str.format("{0}{1}", "{1}", "{0}") ); // => "{0}{0}"
   *
   * // If the replacement happened simultaneously the result would be "{1}{0}" but this method executes
   * // replacements synchronously as seen below:
   *
   * // "{0}{1}".replace( "{0}", "{1}" )
   * // => "{1}{1}".replace( "{1}", "{0}" )
   * // => "{0}{0}"
   */


  _.str.format = function (target, arg1, argN) {
    var args = _fn.arg2arr(arguments);

    target = args.shift(); // remove the target from the args

    if (_is.string(target) && args.length > 0) {
      if (args.length === 1 && (_is.array(args[0]) || _is.object(args[0]))) {
        args = args[0];
      }

      _.each(args, function (value, placeholder) {
        target = target.replace(new RegExp("\\{" + placeholder + "\\}", "gi"), value + "");
      });
    }

    return target;
  };
})( // dependencies
FooBar.utils, FooBar.utils.is, FooBar.utils.fn);

(function ($, _, _is, _fn, _str) {
  // only register methods if this version is the current version
  if (_.version !== '0.2.0') return;
  /**
   * @summary Contains common object utility methods.
   * @memberof FooBar.utils.
   * @namespace obj
   */

  _.obj = {}; // used by the obj.create method

  var Obj = function Obj() {};
  /**
   * @summary Creates a new object with the specified prototype.
   * @memberof FooBar.utils.obj.
   * @function create
   * @param {Object} proto - The object which should be the prototype of the newly-created object.
   * @returns {Object} A new object with the specified prototype.
   * @description This is a basic implementation of the {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/create|Object.create} method.
   */


  _.obj.create = function (proto) {
    if (!_is.object(proto)) throw TypeError('Argument must be an object');
    Obj.prototype = proto;
    var result = new Obj();
    Obj.prototype = null;
    return result;
  };
  /**
   * @summary Merge the contents of two or more objects together into the first `target` object.
   * @memberof FooBar.utils.obj.
   * @function extend
   * @param {Object} target - The object to merge properties into.
   * @param {Object} object - An object containing properties to merge.
   * @param {...Object} [objectN] - Additional objects containing properties to merge.
   * @returns {Object} The `target` merged with the contents from any additional objects.
   * @description This does not merge arrays by index as jQuery does, it treats them as a single property and replaces the array with a shallow copy of the new one.
   *
   * This method makes use of the {@link FooBar.utils.obj.merge} method internally.
   * @example {@run true}
   * // alias the FooBar.utils.obj namespace
   * var _obj = FooBar.utils.obj,
   * 	// create some objects to merge
   * 	defaults = {"name": "My Object", "enabled": false, "arr": [1,2,3]},
   * 	options = {"enabled": true, "something": 123, "arr": [4,5,6]};
   *
   * // merge the two objects into a new third one without modifying either of the originals
   * var settings = _obj.extend( {}, defaults, options );
   *
   * console.log( settings ); // => {"name": "My Object", "enabled": true, "arr": [4,5,6], "something": 123}
   * console.log( defaults ); // => {"name": "My Object", "enabled": true, "arr": [1,2,3]}
   * console.log( options ); // => {"enabled": true, "arr": [4,5,6], "something": 123}
   */


  _.obj.extend = function (target, object, objectN) {
    target = _is.object(target) ? target : {};

    var objects = _fn.arg2arr(arguments);

    objects.shift();
    $.each(objects, function (i, object) {
      _.obj.merge(target, object);
    });
    return target;
  };
  /**
   * @summary Merge the contents of two objects together into the first `target` object.
   * @memberof FooBar.utils.obj.
   * @function merge
   * @param {Object} target - The object to merge properties into.
   * @param {Object} object - The object containing properties to merge.
   * @returns {Object} The `target` merged with the contents from the `object`.
   * @description This does not merge arrays by index as jQuery does, it treats them as a single property and replaces the array with a shallow copy of the new one.
   *
   * This method is used internally by the {@link FooBar.utils.obj.extend} method.
   * @example {@run true}
   * // alias the FooBar.utils.obj namespace
   * var _obj = FooBar.utils.obj,
   * 	// create some objects to merge
   * 	target = {"name": "My Object", "enabled": false, "arr": [1,2,3]},
   * 	object = {"enabled": true, "something": 123, "arr": [4,5,6]};
   *
   * console.log( _obj.merge( target, object ) ); // => {"name": "My Object", "enabled": true, "arr": [4,5,6], "something": 123}
   */


  _.obj.merge = function (target, object) {
    target = _is.hash(target) ? target : {};
    object = _is.hash(object) ? object : {};

    for (var prop in object) {
      if (object.hasOwnProperty(prop)) {
        if (_is.hash(object[prop])) {
          target[prop] = _is.hash(target[prop]) ? target[prop] : {};

          _.obj.merge(target[prop], object[prop]);
        } else if (_is.array(object[prop])) {
          target[prop] = object[prop].slice();
        } else {
          target[prop] = object[prop];
        }
      }
    }

    return target;
  };
  /**
   * @summary Merge the validated properties of the `object` into the `target` using the optional `mappings`.
   * @memberof FooBar.utils.obj.
   * @function mergeValid
   * @param {Object} target - The object to merge properties into.
   * @param {FooBar.utils.obj~Validators} validators - An object containing validators for the `target` object properties.
   * @param {Object} object - The object containing properties to merge.
   * @param {FooBar.utils.obj~Mappings} [mappings] - An object containing property name mappings.
   * @returns {Object} The modified `target` object containing any valid properties from the supplied `object`.
   * @example {@caption Shows the basic usage for this method and shows how invalid properties or those with no corresponding validator are ignored.}{@run true}
   * // alias the FooBar.utils.obj and FooBar.utils.is namespaces
   * var _obj = FooBar.utils.obj,
   * 	_is = FooBar.utils.is;
   *
   * //create the target object and it's validators
   * var target = {"name":"John","location":"unknown"},
   * 	validators = {"name":_is.string,"location":_is.string};
   *
   * // create the object to merge into the target
   * var object = {
   * 	"name": 1234, // invalid
   * 	"location": "Liverpool", // updated
   * 	"notMerged": true // ignored
   * };
   *
   * // merge the object into the target, invalid properties or those with no corresponding validator are ignored.
   * console.log( _obj.mergeValid( target, validators, object ) ); // => { "name": "John", "location": "Liverpool" }
   * @example {@caption Shows how to supply a mappings object for this method.}{@run true}
   * // alias the FooBar.utils.obj and FooBar.utils.is namespaces
   * var _obj = FooBar.utils.obj,
   * 	_is = FooBar.utils.is;
   *
   * //create the target object and it's validators
   * var target = {"name":"John","location":"unknown"},
   * 	validators = {"name":_is.string,"location":_is.string};
   *
   * // create the object to merge into the target
   * var object = {
   * 	"name": { // ignored
   * 		"proper": "Christopher", // mapped to name if short is invalid
   * 		"short": "Chris" // map to name
   * 	},
   * 	"city": "London" // map to location
   * };
   *
   * // create the mapping object
   * var mappings = {
   * 	"name": [ "name.short", "name.proper" ], // try use the short name and fallback to the proper
   * 	"location": "city"
   * };
   *
   * // merge the object into the target using the mappings, invalid properties or those with no corresponding validator are ignored.
   * console.log( _obj.mergeValid( target, validators, object, mappings ) ); // => { "name": "Chris", "location": "London" }
   */


  _.obj.mergeValid = function (target, validators, object, mappings) {
    if (!_is.hash(object) || !_is.hash(validators)) return target;
    validators = _is.hash(validators) ? validators : {};
    mappings = _is.hash(mappings) ? mappings : {};
    var prop, maps, value;

    for (prop in validators) {
      if (!validators.hasOwnProperty(prop) || !_is.fn(validators[prop])) continue;
      maps = _is.array(mappings[prop]) ? mappings[prop] : _is.string(mappings[prop]) ? [mappings[prop]] : [prop];
      $.each(maps, function (i, map) {
        value = _.obj.prop(object, map);
        if (_is.undef(value)) return; // continue

        if (validators[prop](value)) {
          _.obj.prop(target, prop, value);

          return false; // break
        }
      });
    }

    return target;
  };
  /**
   * @summary Get or set a property value given its `name`.
   * @memberof FooBar.utils.obj.
   * @function prop
   * @param {Object} object - The object to inspect for the property.
   * @param {string} name - The name of the property to fetch. This can be a `.` notated name.
   * @param {*} [value] - If supplied this is the value to set for the property.
   * @returns {*} The value for the `name` property, if it does not exist then `undefined`.
   * @returns {undefined} If a `value` is supplied this method returns nothing.
   * @example {@caption Shows how to get a property value from an object.}{@run true}
   * // alias the FooBar.utils.obj namespace
   * var _obj = FooBar.utils.obj,
   * 	// create an object to test
   * 	object = {
   * 		"name": "My Object",
   * 		"some": {
   * 			"thing": 123
   * 		}
   * 	};
   *
   * console.log( _obj.prop( object, "name" ) ); // => "My Object"
   * console.log( _obj.prop( object, "some.thing" ) ); // => 123
   * @example {@caption Shows how to set a property value for an object.}{@run true}
   * // alias the FooBar.utils.obj namespace
   * var _obj = FooBar.utils.obj,
   * 	// create an object to test
   * 	object = {
   * 		"name": "My Object",
   * 		"some": {
   * 			"thing": 123
   * 		}
   * 	};
   *
   * _obj.prop( object, "name", "My Updated Object" );
   * _obj.prop( object, "some.thing", 987 );
   *
   * console.log( object ); // => { "name": "My Updated Object", "some": { "thing": 987 } }
   */


  _.obj.prop = function (object, name, value) {
    if (!_is.object(object) || _is.empty(name)) return;
    var parts, last;

    if (_is.undef(value)) {
      if (_str.contains(name, '.')) {
        parts = name.split('.');
        last = parts.length - 1;
        $.each(parts, function (i, part) {
          if (i === last) {
            value = object[part];
          } else if (_is.hash(object[part])) {
            object = object[part];
          } else {
            // exit early
            return false;
          }
        });
      } else if (!_is.undef(object[name])) {
        value = object[name];
      }

      return value;
    }

    if (_str.contains(name, '.')) {
      parts = name.split('.');
      last = parts.length - 1;
      $.each(parts, function (i, part) {
        if (i === last) {
          object[part] = value;
        } else {
          object = _is.hash(object[part]) ? object[part] : object[part] = {};
        }
      });
    } else if (!_is.undef(object[name])) {
      object[name] = value;
    }
  }; //######################
  //## Type Definitions ##
  //######################

  /**
   * @summary An object used by the {@link FooBar.utils.obj.mergeValid|mergeValid} method to map new values onto the `target` object.
   * @typedef {Object.<string,(string|Array.<string>)>} FooBar.utils.obj~Mappings
   * @description The mappings object is a single level object. If you want to map a property from/to a child object on either the source or target objects you must supply the name using `.` notation as seen in the below example with the `"name.first"` to `"Name.Short"` mapping.
   * @example {@caption The basic structure of a mappings object is the below.}
   * {
   * 	"TargetName": "SourceName", // for top level properties
   * 	"Child.TargetName": "Child.SourceName" // for child properties
   * }
   * @example {@caption Given the following target object.}
   * var target = {
   * 	"name": {
   * 		"first": "",
   * 		"last": null
   * 	},
   * 	"age": 0
   * };
   * @example {@caption And the following object to merge.}
   * var object = {
   * 	"Name": {
   * 		"Full": "Christopher",
   * 		"Short": "Chris"
   * 	},
   * 	"Age": 32
   * };
   * @example {@caption The mappings object would look like the below.}
   * var mappings = {
   * 	"name.first": "Name.Short",
   * 	"age": "Age"
   * };
   * @example {@caption If you want the `"name.first"` property to try to use the `"Name.Short"` value but fallback to `"Name.Proper"` you can specify the mapping value as an array.}
   * var mappings = {
   * 	"name.first": [ "Name.Short", "Name.Proper" ],
   * 	"age": "Age"
   * };
   */

  /**
   * @summary An object used by the {@link FooBar.utils.obj.mergeValid|mergeValid} method to validate properties.
   * @typedef {Object.<string,function(*):boolean>} FooBar.utils.obj~Validators
   * @description The validators object is a single level object. If you want to validate a property of a child object you must supply the name using `.` notation as seen in the below example with the `"name.first"` and `"name.last"` properties.
   *
   * Any function that accepts a value to test as the first argument and returns a boolean can be used as a validator. This means the majority of the {@link FooBar.utils.is} methods can be used directly. If the property supports multiple types just provide your own function as seen with `"name.last"` in the below example.
   * @example {@caption The basic structure of a validators object is the below.}
   * {
   * 	"PropName": function(*):boolean, // for top level properties
   * 	"Child.PropName": function(*):boolean // for child properties
   * }
   * @example {@caption Given the following target object.}
   * var target = {
   * 	"name": {
   * 		"first": "", // must be a string
   * 		"last": null // must be a string or null
   * 	},
   * 	"age": 0 // must be a number
   * };
   * @example {@caption The validators object could be created as seen below.}
   * // alias the FooBar.utils.is namespace
   * var _is = FooBar.utils.is;
   *
   * var validators = {
   * 	"name.first": _is.string,
   * 	"name.last": function(value){
   * 		return _is.string(value) || value === null;
   * 	},
   * 	"age": _is.number
   * };
   */

})( // dependencies
FooBar.utils.$, FooBar.utils, FooBar.utils.is, FooBar.utils.fn, FooBar.utils.str);

(function ($, _, _is) {
  // only register methods if this version is the current version
  if (_.version !== '0.2.0') return; // any methods that have dependencies but don't fall into a specific subset or namespace can be added here

  /**
   * @summary The callback for the {@link FooBar.utils.ready} method.
   * @callback FooBar.utils~readyCallback
   * @param {jQuery} $ - The instance of jQuery the plugin was registered with.
   * @this window
   * @see Take a look at the {@link FooBar.utils.ready} method for example usage.
   */

  /**
   * @summary Waits for the DOM to be accessible and then executes the supplied callback.
   * @memberof FooBar.utils.
   * @function ready
   * @param {FooBar.utils~readyCallback} callback - The function to execute once the DOM is accessible.
   * @example {@caption This method can be used as a replacement for the jQuery ready callback to avoid an error in another script stopping our scripts from running.}
   * FooBar.utils.ready(function($){
   * 	// do something
   * });
   */

  _.ready = function (callback) {
    function onready() {
      try {
        callback.call(window, _.$);
      } catch (err) {
        console.error(err);
      }
    }

    if (Function('/*@cc_on return true@*/')() ? document.readyState === "complete" : document.readyState !== "loading") onready();else document.addEventListener('DOMContentLoaded', onready, false);
  };
  /**
   * @summary Executed once for each array index or object property until it returns a truthy value.
   * @callback FooBar.utils~findCallback
   * @param {*} value - The current value being iterated over. This could be either an element in an array or the value of an object property.
   * @param {(number|string)} [key] - The array index or property name of the `value`.
   * @param {(Object|Array)} [object] - The array or object currently being searched.
   * @returns {boolean} A truthy value.
   */

  /**
   * @summary Returns the value of the first element or property in the provided target that satisfies the provided test function.
   * @memberof FooBar.utils.
   * @function find
   * @param {(Object|Array)} target - The object or array to search.
   * @param {FooBar.utils~findCallback} callback - A function to execute for each value in the target.
   * @param {*} [thisArg] - The `this` value within the `callback`.
   * @returns {*} The value of the first element or property in the provided target that satisfies the provided test function. Otherwise, `undefined` is returned.
   */


  _.find = function (target, callback, thisArg) {
    if (!_is.fn(callback)) return;
    thisArg = _is.undef(thisArg) ? callback : thisArg;
    var i, l;

    if (_is.array(target)) {
      for (i = 0, l = target.length; i < l; i++) {
        if (callback.call(thisArg, target[i], i, target)) {
          return target[i];
        }
      }
    } else if (_is.object(target)) {
      var keys = Object.keys(target);

      for (i = 0, l = keys.length; i < l; i++) {
        if (callback.call(thisArg, target[keys[i]], keys[i], target)) {
          return target[keys[i]];
        }
      }
    }
  };
  /**
   * @summary Executed once for each array index or object property.
   * @callback FooBar.utils~eachCallback
   * @param {*} value - The current value being iterated over. This could be either an element in an array or the value of an object property.
   * @param {(number|string)} [key] - The array index or property name of the `value`.
   * @param {(Object|Array)} [object] - The array or object currently being searched.
   * @returns {(boolean|void)} Return `false` to break out of the loop, all other values are ignored.
   */

  /**
   * @summary Iterate over all indexes or properties of the provided target executing the provided callback once per value.
   * @memberof FooBar.utils.
   * @function each
   * @param {(Object|Array)} object - The object or array to search.
   * @param {FooBar.utils~eachCallback} callback - A function to execute for each value in the target.
   * @param {*} [thisArg] - The `this` value within the `callback`.
   */


  _.each = function (object, callback, thisArg) {
    if (!_is.fn(callback)) return;
    thisArg = _is.undef(thisArg) ? callback : thisArg;
    var i, l, result;

    if (_is.array(object)) {
      for (i = 0, l = object.length; i < l; i++) {
        result = callback.call(thisArg, object[i], i, object);
        if (result === false) break;
      }
    } else if (_is.object(object)) {
      var keys = Object.keys(object);

      for (i = 0, l = keys.length; i < l; i++) {
        result = callback.call(thisArg, object[keys[i]], keys[i], object);
        if (result === false) break;
      }
    }
  };
  /**
   * @summary Compares two version numbers.
   * @memberof FooBar.utils.
   * @function versionCompare
   * @param {string} version1 - The first version to use in the comparison.
   * @param {string} version2 - The second version to compare to the first.
   * @returns {number} `0` if the version are equal.
   * `-1` if `version1` is less than `version2`.
   * `1` if `version1` is greater than `version2`.
   * `NaN` if either of the supplied versions do not conform to MAJOR.MINOR.PATCH format.
   * @description This method will compare two version numbers that conform to the basic MAJOR.MINOR.PATCH format returning the result as a simple number. This method will handle short version string comparisons e.g. `1.0` versus `1.0.1`.
   * @example {@caption The following shows the results of comparing various version strings.}
   * console.log( FooBar.utils.versionCompare( "0", "0" ) ); // => 0
   * console.log( FooBar.utils.versionCompare( "0.0", "0" ) ); // => 0
   * console.log( FooBar.utils.versionCompare( "0.0", "0.0.0" ) ); // => 0
   * console.log( FooBar.utils.versionCompare( "0.1", "0.0.0" ) ); // => 1
   * console.log( FooBar.utils.versionCompare( "0.1", "0.0.1" ) ); // => 1
   * console.log( FooBar.utils.versionCompare( "1", "0.1" ) ); // => 1
   * console.log( FooBar.utils.versionCompare( "1.10", "1.9" ) ); // => 1
   * console.log( FooBar.utils.versionCompare( "1.9", "1.10" ) ); // => -1
   * console.log( FooBar.utils.versionCompare( "1", "1.1" ) ); // => -1
   * console.log( FooBar.utils.versionCompare( "1.0.9", "1.1" ) ); // => -1
   * @example {@caption If either of the supplied version strings does not match the MAJOR.MINOR.PATCH format then `NaN` is returned.}
   * console.log( FooBar.utils.versionCompare( "not-a-version", "1.1" ) ); // => NaN
   * console.log( FooBar.utils.versionCompare( "1.1", "not-a-version" ) ); // => NaN
   * console.log( FooBar.utils.versionCompare( "not-a-version", "not-a-version" ) ); // => NaN
   */


  _.versionCompare = function (version1, version2) {
    // if either of the versions do not match the expected format return NaN
    if (!(/[\d.]/.test(version1) && /[\d.]/.test(version2))) return NaN;
    /**
     * @summary Splits and parses the given version string into a numeric array.
     * @param {string} version - The version string to split and parse.
     * @returns {Array.<number>}
     * @ignore
     */

    function split(version) {
      var parts = version.split('.'),
          result = [];

      for (var i = 0, len = parts.length; i < len; i++) {
        result[i] = parseInt(parts[i]);
        if (isNaN(result[i])) result[i] = 0;
      }

      return result;
    } // get the base numeric arrays for each version


    var v1parts = split(version1),
        v2parts = split(version2); // ensure both arrays are the same length by padding the shorter with 0

    while (v1parts.length < v2parts.length) {
      v1parts.push(0);
    }

    while (v2parts.length < v1parts.length) {
      v2parts.push(0);
    } // perform the actual comparison


    for (var i = 0; i < v1parts.length; ++i) {
      if (v2parts.length === i) return 1;
      if (v1parts[i] === v2parts[i]) continue;
      if (v1parts[i] > v2parts[i]) return 1;else return -1;
    }

    if (v1parts.length !== v2parts.length) return -1;
    return 0;
  }; // A variable to hold the last number used to generate an ID in the current page.


  var uniqueId = 0;
  /**
   * @summary Generate and apply a unique id for the given `$element`.
   * @memberof FooBar.utils.
   * @function uniqueId
   * @param {jQuery} $element - The jQuery element object to retrieve an id from or generate an id for.
   * @param {string} [prefix="uid-"] - A prefix to append to the start of any generated ids.
   * @returns {string} Either the `$element`'s existing id or a generated one that has been applied to it.
   * @example {@run true}
   * // alias the FooBar.utils namespace
   * var _ = FooBar.utils;
   *
   * // create some elements to test
   * var $hasId = $("<span/>", {id: "exists"});
   * var $generatedId = $("<span/>");
   * var $generatedPrefixedId = $("<span/>");
   *
   * console.log( _.uniqueId( $hasId ) ); // => "exists"
   * console.log( $hasId.attr( "id" ) ); // => "exists"
   * console.log( _.uniqueId( $generatedId ) ); // => "uid-1"
   * console.log( $generatedId.attr( "id" ) ); // => "uid-1"
   * console.log( _.uniqueId( $generatedPrefixedId, "plugin-" ) ); // => "plugin-2"
   * console.log( $generatedPrefixedId.attr( "id" ) ); // => "plugin-2"
   */

  _.uniqueId = function ($element, prefix) {
    var id = $element.attr('id');

    if (_is.empty(id)) {
      prefix = _is.string(prefix) && !_is.empty(prefix) ? prefix : "uid-";
      id = prefix + ++uniqueId;
      $element.attr('id', id).data('__uniqueId__', true);
    }

    return id;
  };
  /**
   * @summary Remove the id from the given `$element` if it was set using the {@link FooBar.utils.uniqueId|uniqueId} method.
   * @memberof FooBar.utils.
   * @function removeUniqueId
   * @param {jQuery} $element - The jQuery element object to remove a generated id from.
   * @example {@run true}
   * // alias the FooBar.utils namespace
   * var _ = FooBar.utils;
   *
   * // create some elements to test
   * var $hasId = $("<span/>", {id: "exists"});
   * var $generatedId = $("<span/>");
   * var $generatedPrefixedId = $("<span/>");
   *
   * console.log( _.uniqueId( $hasId ) ); // => "exists"
   * console.log( _.uniqueId( $generatedId ) ); // => "uid-1"
   * console.log( _.uniqueId( $generatedPrefixedId, "plugin-" ) ); // => "plugin-2"
   */


  _.removeUniqueId = function ($element) {
    if ($element.data('__uniqueId__')) {
      $element.removeAttr('id').removeData('__uniqueId__');
    }
  };
  /**
   * @summary Convert CSS class names into CSS selectors.
   * @memberof FooBar.utils.
   * @function selectify
   * @param {(string|string[]|object)} classes - A space delimited string of CSS class names or an array of them with each item being included in the selector using the OR (`,`) syntax as a separator. If an object is supplied the result will be an object with the same property names but the values converted to selectors.
   * @returns {(object|string)}
   * @example {@caption Shows how the method can be used.}
   * // alias the FooBar.utils namespace
   * var _ = FooBar.utils;
   *
   * console.log( _.selectify("my-class") ); // => ".my-class"
   * console.log( _.selectify("my-class my-other-class") ); // => ".my-class.my-other-class"
   * console.log( _.selectify(["my-class", "my-other-class"]) ); // => ".my-class,.my-other-class"
   * console.log( _.selectify({
   * 	class1: "my-class",
   * 	class2: "my-class my-other-class",
   * 	class3: ["my-class", "my-other-class"]
   * }) ); // => { class1: ".my-class", class2: ".my-class.my-other-class", class3: ".my-class,.my-other-class" }
   */


  _.selectify = function (classes) {
    if (_is.empty(classes)) return null;

    if (_is.hash(classes)) {
      var result = {},
          selector;

      for (var name in classes) {
        if (!classes.hasOwnProperty(name)) continue;
        selector = _.selectify(classes[name]);

        if (selector) {
          result[name] = selector;
        }
      }

      return result;
    }

    if (_is.string(classes) || _is.array(classes)) {
      if (_is.string(classes)) classes = [classes];
      return classes.map(function (str) {
        return _is.string(str) ? "." + str.split(/\s/g).join(".") : null;
      }).join(",");
    }

    return null;
  };
  /**
   * @summary Parses the supplied `src` and `srcset` values and returns the best matching URL for the supplied render size.
   * @memberof FooBar.utils.
   * @function src
   * @param {string} src - The default src for the image.
   * @param {string} srcset - The srcset containing additional image sizes.
   * @param {number} srcWidth - The width of the `src` image.
   * @param {number} srcHeight - The height of the `src` image.
   * @param {number} renderWidth - The rendered width of the image element.
   * @param {number} renderHeight - The rendered height of the image element.
   * @param {number} [devicePixelRatio] - The device pixel ratio to use while parsing. Defaults to the current device pixel ratio.
   * @returns {(string|null)} Returns the parsed responsive src or null if no src is provided.
   * @description This can be used to parse the correct src to use when loading an image through JavaScript.
   * @example {@caption The following shows using the method with the srcset w-descriptor.}{@run true}
   * var src = "test-240x120.jpg",
   * 	width = 240, // the naturalWidth of the 'src' image
   * 	height = 120, // the naturalHeight of the 'src' image
   * 	srcset = "test-480x240.jpg 480w, test-720x360.jpg 720w, test-960x480.jpg 960w";
   *
   * console.log( FooBar.utils.src( src, srcset, width, height, 240, 120, 1 ) ); // => "test-240x120.jpg"
   * console.log( FooBar.utils.src( src, srcset, width, height, 240, 120, 2 ) ); // => "test-480x240.jpg"
   * console.log( FooBar.utils.src( src, srcset, width, height, 480, 240, 1 ) ); // => "test-480x240.jpg"
   * console.log( FooBar.utils.src( src, srcset, width, height, 480, 240, 2 ) ); // => "test-960x480.jpg"
   * console.log( FooBar.utils.src( src, srcset, width, height, 720, 360, 1 ) ); // => "test-720x360.jpg"
   * console.log( FooBar.utils.src( src, srcset, width, height, 960, 480, 1 ) ); // => "test-960x480.jpg"
   * @example {@caption The following shows using the method with the srcset h-descriptor.}{@run true}
   * var src = "test-240x120.jpg",
   * 	width = 240, // the naturalWidth of the 'src' image
   * 	height = 120, // the naturalHeight of the 'src' image
   * 	srcset = "test-480x240.jpg 240h, test-720x360.jpg 360h, test-960x480.jpg 480h";
   *
   * console.log( FooBar.utils.src( src, srcset, width, height, 240, 120, 1 ) ); // => "test-240x120.jpg"
   * console.log( FooBar.utils.src( src, srcset, width, height, 240, 120, 2 ) ); // => "test-480x240.jpg"
   * console.log( FooBar.utils.src( src, srcset, width, height, 480, 240, 1 ) ); // => "test-480x240.jpg"
   * console.log( FooBar.utils.src( src, srcset, width, height, 480, 240, 2 ) ); // => "test-960x480.jpg"
   * console.log( FooBar.utils.src( src, srcset, width, height, 720, 360, 1 ) ); // => "test-720x360.jpg"
   * console.log( FooBar.utils.src( src, srcset, width, height, 960, 480, 1 ) ); // => "test-960x480.jpg"
   * @example {@caption The following shows using the method with the srcset x-descriptor.}{@run true}
   * var src = "test-240x120.jpg",
   * 	width = 240, // the naturalWidth of the 'src' image
   * 	height = 120, // the naturalHeight of the 'src' image
   * 	srcset = "test-480x240.jpg 2x, test-720x360.jpg 3x, test-960x480.jpg 4x";
   *
   * console.log( FooBar.utils.src( src, srcset, width, height, 240, 120, 1 ) ); // => "test-240x120.jpg"
   * console.log( FooBar.utils.src( src, srcset, width, height, 240, 120, 2 ) ); // => "test-480x240.jpg"
   * console.log( FooBar.utils.src( src, srcset, width, height, 480, 240, 1 ) ); // => "test-240x120.jpg"
   * console.log( FooBar.utils.src( src, srcset, width, height, 480, 240, 2 ) ); // => "test-480x240.jpg"
   * console.log( FooBar.utils.src( src, srcset, width, height, 720, 360, 1 ) ); // => "test-240x120.jpg"
   * console.log( FooBar.utils.src( src, srcset, width, height, 960, 480, 1 ) ); // => "test-240x120.jpg"
   */


  _.src = function (src, srcset, srcWidth, srcHeight, renderWidth, renderHeight, devicePixelRatio) {
    if (!_is.string(src)) return null; // if there is no srcset just return the src

    if (!_is.string(srcset)) return src; // first split the srcset into its individual sources

    var sources = srcset.replace(/(\s[\d.]+[whx]),/g, '$1 @,@ ').split(' @,@ '); // then parse those sources into objects containing the url, width, height and pixel density

    var list = sources.map(function (val) {
      return {
        url: /^\s*(\S*)/.exec(val)[1],
        w: parseFloat((/\S\s+(\d+)w/.exec(val) || [0, Infinity])[1]),
        h: parseFloat((/\S\s+(\d+)h/.exec(val) || [0, Infinity])[1]),
        x: parseFloat((/\S\s+([\d.]+)x/.exec(val) || [0, 1])[1])
      };
    }); // if there is no items parsed from the srcset then just return the src

    if (!list.length) return src; // add the current src into the mix by inspecting the first parsed item to figure out how to handle it

    list.unshift({
      url: src,
      w: list[0].w !== Infinity && list[0].h === Infinity ? srcWidth : Infinity,
      h: list[0].h !== Infinity && list[0].w === Infinity ? srcHeight : Infinity,
      x: 1
    }); // get the current viewport info and use it to determine the correct src to load

    var dpr = _is.number(devicePixelRatio) ? devicePixelRatio : window.devicePixelRatio || 1,
        area = {
      w: renderWidth * dpr,
      h: renderHeight * dpr,
      x: dpr
    },
        props = ['w', 'h', 'x']; // first check each of the viewport properties against the max values of the same properties in our src array
    // only src's with a property greater than the viewport or equal to the max are kept

    props.forEach(function (prop) {
      var max = Math.max.apply(null, list.map(function (item) {
        return item[prop];
      }));
      list = list.filter(function (item) {
        return item[prop] >= area[prop] || item[prop] === max;
      });
    }); // next reduce our src array by comparing the viewport properties against the minimum values of the same properties of each src
    // only src's with a property equal to the minimum are kept

    props.forEach(function (prop) {
      var min = Math.min.apply(null, list.map(function (item) {
        return item[prop];
      }));
      list = list.filter(function (item) {
        return item[prop] === min;
      });
    }); // return the first url as it is the best match for the current viewport

    return list[0].url;
  };
  /**
   * @summary Get the scroll parent for the supplied element optionally filtering by axis.
   * @memberof FooBar.utils.
   * @function scrollParent
   * @param {(string|Element|jQuery)} element - The selector, element or jQuery element to find the scroll parent of.
   * @param {string} [axis="xy"] - The axis to check. By default this method will check both the X and Y axis.
   * @param {jQuery} [def] - The default jQuery element to return if no result was found. Defaults to the supplied elements document.
   * @returns {jQuery}
   */


  _.scrollParent = function (element, axis, def) {
    element = _is.jq(element) ? element : $(element);
    axis = _is.string(axis) && /^(x|y|xy|yx)$/i.test(axis) ? axis : "xy";
    var $doc = $(!!element.length && element[0].ownerDocument || document);
    def = _is.jq(def) ? def : $doc;
    if (!element.length) return def;
    var position = element.css("position"),
        excludeStaticParent = position === "absolute",
        scroll = /(auto|scroll)/i,
        axisX = /x/i,
        axisY = /y/i,
        $parent = element.parentsUntil(def).filter(function (i, el) {
      var $el = $(this);
      if (excludeStaticParent && $el.css("position") === "static") return false;
      var scrollY = axisY.test(axis) && el.scrollHeight > el.clientHeight && scroll.test($el.css("overflow-y")),
          scrollX = axisX.test(axis) && el.scrollWidth > el.clientWidth && scroll.test($el.css("overflow-x"));
      return scrollY || scrollX;
    }).eq(0);
    if ($parent.is("html")) $parent = $doc;
    return position === "fixed" || !$parent.length ? def : $parent;
  };
})( // dependencies
FooBar.utils.$, FooBar.utils, FooBar.utils.is);

(function ($, _, _is) {
  // only register methods if this version is the current version
  if (_.version !== '0.2.0') return;
  /**
   * @summary Contains common utility methods and members for the CSS animation property.
   * @memberof FooBar.utils.
   * @namespace animation
   */

  _.animation = {};

  function raf(callback) {
    return setTimeout(callback, 1000 / 60);
  }

  function caf(requestID) {
    clearTimeout(requestID);
  }
  /**
   * @summary A cross browser wrapper for the `requestAnimationFrame` method.
   * @memberof FooBar.utils.animation.
   * @function requestFrame
   * @param {function} callback - The function to call when it's time to update your animation for the next repaint.
   * @return {number} - The request id that uniquely identifies the entry in the callback list.
   */


  _.animation.requestFrame = (window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame || raf).bind(window);
  /**
   * @summary A cross browser wrapper for the `cancelAnimationFrame` method.
   * @memberof FooBar.utils.animation.
   * @function cancelFrame
   * @param {number} requestID - The ID value returned by the call to {@link FooBar.utils.animation.requestFrame|requestFrame} that requested the callback.
   */

  _.animation.cancelFrame = (window.cancelAnimationFrame || window.mozCancelAnimationFrame || window.webkitCancelAnimationFrame || window.msCancelAnimationFrame || caf).bind(window); // create a test element to check for the existence of the various animation properties

  var testElement = document.createElement('div');
  /**
   * @summary Whether or not animations are supported by the current browser.
   * @memberof FooBar.utils.animation.
   * @name supported
   * @type {boolean}
   */

  _.animation.supported =
  /**
   * @ignore
   * @summary Performs a one time test to see if animations are supported
   * @param {HTMLElement} el - An element to test with.
   * @returns {boolean} `true` if animations are supported.
   */
  function (el) {
    var style = el.style;
    return _is.string(style['animation']) || _is.string(style['WebkitAnimation']) || _is.string(style['MozAnimation']) || _is.string(style['msAnimation']) || _is.string(style['OAnimation']);
  }(testElement);
  /**
   * @summary The `animationend` event name for the current browser.
   * @memberof FooBar.utils.animation.
   * @name end
   * @type {string}
   * @description Depending on the browser this returns one of the following values:
   *
   * <ul><!--
   * --><li>`"animationend"`</li><!--
   * --><li>`"webkitAnimationEnd"`</li><!--
   * --><li>`"msAnimationEnd"`</li><!--
   * --><li>`"oAnimationEnd"`</li><!--
   * --><li>`null` - If the browser doesn't support animations</li><!--
   * --></ul>
   */


  _.animation.end =
  /**
   * @ignore
   * @summary Performs a one time test to determine which `animationend` event to use for the current browser.
   * @param {HTMLElement} el - An element to test with.
   * @returns {?string} The correct `animationend` event for the current browser, `null` if the browser doesn't support animations.
   */
  function (el) {
    var style = el.style;
    if (_is.string(style['animation'])) return 'animationend';
    if (_is.string(style['WebkitAnimation'])) return 'webkitAnimationEnd';
    if (_is.string(style['MozAnimation'])) return 'animationend';
    if (_is.string(style['msAnimation'])) return 'msAnimationEnd';
    if (_is.string(style['OAnimation'])) return 'oAnimationEnd';
    return null;
  }(testElement);
  /**
   * @summary Gets the `animation-duration` value for the supplied jQuery element.
   * @memberof FooBar.utils.animation.
   * @function duration
   * @param {jQuery} $element - The jQuery element to retrieve the duration from.
   * @param {number} [def=0] - The default value to return if no duration is set.
   * @returns {number} The value of the `animation-duration` property converted to a millisecond value.
   */


  _.animation.duration = function ($element, def) {
    def = _is.number(def) ? def : 0;
    if (!_is.jq($element)) return def; // we can use jQuery.css() method to retrieve the value cross browser

    var duration = $element.css('animation-duration');

    if (/^([\d.]*)+?(ms|s)/i.test(duration)) {
      // if we have a valid duration value split it into it's components
      var parts = duration.split(","),
          max = 0;
      parts.forEach(function (part) {
        var match = part.match(/^\s*?([\d.]*)+?(ms|s)\s*?$/i),
            value = parseFloat(match[1]),
            unit = match[2].toLowerCase();

        if (unit === 's') {
          // convert seconds to milliseconds
          value = value * 1000;
        }

        if (value > max) max = value;
      });
      return max;
    }

    return def;
  };
  /**
   * @summary Gets the `animation-iteration-count` value for the supplied jQuery element.
   * @memberof FooBar.utils.animation.
   * @function iterations
   * @param {jQuery} $element - The jQuery element to retrieve the duration from.
   * @param {number} [def=1] - The default value to return if no iteration count is set.
   * @returns {number} The value of the `animation-iteration-count` property.
   */


  _.animation.iterations = function ($element, def) {
    def = _is.number(def) ? def : 1;
    if (!_is.jq($element)) return def; // we can use jQuery.css() method to retrieve the value cross browser

    var iterations = $element.css('animation-iteration-count');

    if (/^(([\d.]+)|infinite)/i.test(iterations)) {
      // if we have a valid iterations value split it into it's components
      var parts = iterations.split(","),
          max = 0;
      parts.forEach(function (part) {
        var value = parseFloat(part);
        if (isNaN(value)) value = Infinity;
        if (value > max) max = value;
      });
      return max;
    }

    return def;
  };
  /**
   * @summary The callback function to execute when starting a animation.
   * @callback FooBar.utils.animation~startCallback
   * @param {jQuery} $element - The element to start the animation on.
   * @this Element
   */

  /**
   * @summary Start a animation by toggling the supplied `className` on the `$element`.
   * @memberof FooBar.utils.animation.
   * @function start
   * @param {jQuery} $element - The jQuery element to start the animation on.
   * @param {(string|FooBar.utils.animation~startCallback)} classNameOrFunc - One or more class names (separated by spaces) to be toggled or a function that performs the required actions to start the animation.
   * @param {boolean} [state] - A Boolean (not just truthy/falsy) value to determine whether the class should be added or removed.
   * @param {number} [timeout] - The maximum time, in milliseconds, to wait for the `animationend` event to be raised. If not provided this will be automatically set to the elements `animation-duration` multiplied by the `animation-iteration-count` property plus an extra 50 milliseconds.
   * @returns {Promise}
   * @description This method lets us use CSS animations by toggling a class and using the `animationend` event to perform additional actions once the animation has completed across all browsers. In browsers that do not support animations this method would behave the same as if just calling jQuery's `.toggleClass` method.
   *
   * The last parameter `timeout` is used to create a timer that behaves as a safety net in case the `animationend` event is never raised and ensures the deferred returned by this method is resolved or rejected within a specified time.
   *
   * If no `timeout` is supplied the `animation-duration` and `animation-iterations-count` must be set on the `$element` before this method is called so one can be generated.
   * @see {@link https://developer.mozilla.org/en/docs/Web/CSS/animation-duration|animation-duration - CSS | MDN} for more information on the `animation-duration` CSS property.
   */


  _.animation.start = function ($element, classNameOrFunc, state, timeout) {
    var deferred = $.Deferred(),
        promise = deferred.promise();
    $element = $element.first();

    if (_.animation.supported) {
      $element.prop('offsetTop');
      var safety = $element.data('animation_safety');

      if (_is.hash(safety) && _is.number(safety.timer)) {
        clearTimeout(safety.timer);
        $element.removeData('animation_safety').off(_.animation.end + '.utils');
        safety.deferred.reject();
      }

      if (!_is.number(timeout)) {
        var iterations = _.animation.iterations($element);

        if (iterations === Infinity) {
          deferred.reject("No timeout supplied with an infinite animation.");
          return promise;
        }

        timeout = _.animation.duration($element) * iterations + 50;
      }

      safety = {
        deferred: deferred,
        timer: setTimeout(function () {
          // This is the safety net in case a animation fails for some reason and the animationend event is never raised.
          // This will remove the bound event and resolve the deferred
          $element.removeData('animation_safety').off(_.animation.end + '.utils');
          deferred.resolve();
        }, timeout)
      };
      $element.data('animation_safety', safety);
      $element.on(_.animation.end + '.utils', function (e) {
        if ($element.is(e.target)) {
          clearTimeout(safety.timer);
          $element.removeData('animation_safety').off(_.animation.end + '.utils');
          deferred.resolve();
        }
      });
    }

    _.animation.requestFrame(function () {
      if (_is.fn(classNameOrFunc)) {
        classNameOrFunc.apply($element.get(0), [$element]);
      } else {
        $element.toggleClass(classNameOrFunc, state);
      }

      if (!_.animation.supported) {
        // If the browser doesn't support animations then just resolve the deferred
        deferred.resolve();
      }
    });

    return promise;
  };
})( // dependencies
FooBar.utils.$, FooBar.utils, FooBar.utils.is);

(function ($, _, _is, _animation) {
  // only register methods if this version is the current version
  if (_.version !== '0.2.0') return;
  /**
   * @summary Contains common utility methods and members for the CSS transition property.
   * @memberof FooBar.utils.
   * @namespace transition
   */

  _.transition = {}; // create a test element to check for the existence of the various transition properties

  var testElement = document.createElement('div');
  /**
   * @summary Whether or not transitions are supported by the current browser.
   * @memberof FooBar.utils.transition.
   * @name supported
   * @type {boolean}
   */

  _.transition.supported =
  /**
   * @ignore
   * @summary Performs a one time test to see if transitions are supported
   * @param {HTMLElement} el - An element to test with.
   * @returns {boolean} `true` if transitions are supported.
   */
  function (el) {
    var style = el.style;
    return _is.string(style['transition']) || _is.string(style['WebkitTransition']) || _is.string(style['MozTransition']) || _is.string(style['msTransition']) || _is.string(style['OTransition']);
  }(testElement);
  /**
   * @summary The `transitionend` event name for the current browser.
   * @memberof FooBar.utils.transition.
   * @name end
   * @type {string}
   * @description Depending on the browser this returns one of the following values:
   *
   * <ul><!--
   * --><li>`"transitionend"`</li><!--
   * --><li>`"webkitTransitionEnd"`</li><!--
   * --><li>`"msTransitionEnd"`</li><!--
   * --><li>`"oTransitionEnd"`</li><!--
   * --><li>`null` - If the browser doesn't support transitions</li><!--
   * --></ul>
   */


  _.transition.end =
  /**
   * @ignore
   * @summary Performs a one time test to determine which `transitionend` event to use for the current browser.
   * @param {HTMLElement} el - An element to test with.
   * @returns {?string} The correct `transitionend` event for the current browser, `null` if the browser doesn't support transitions.
   */
  function (el) {
    var style = el.style;
    if (_is.string(style['transition'])) return 'transitionend';
    if (_is.string(style['WebkitTransition'])) return 'webkitTransitionEnd';
    if (_is.string(style['MozTransition'])) return 'transitionend';
    if (_is.string(style['msTransition'])) return 'msTransitionEnd';
    if (_is.string(style['OTransition'])) return 'oTransitionEnd';
    return null;
  }(testElement);
  /**
   * @summary Gets the `transition-duration` value for the supplied jQuery element.
   * @memberof FooBar.utils.transition.
   * @function duration
   * @param {jQuery} $element - The jQuery element to retrieve the duration from.
   * @param {number} [def=0] - The default value to return if no duration is set.
   * @returns {number} The value of the `transition-duration` property converted to a millisecond value.
   */


  _.transition.duration = function ($element, def) {
    def = _is.number(def) ? def : 0;
    if (!_is.jq($element)) return def; // we can use jQuery.css() method to retrieve the value cross browser

    var duration = $element.css('transition-duration');

    if (/^([\d.]*)+?(ms|s)/i.test(duration)) {
      // if we have a valid duration value split it into it's components
      var parts = duration.split(","),
          max = 0;
      parts.forEach(function (part) {
        var match = part.match(/^\s*?([\d.]*)+?(ms|s)\s*?$/i),
            value = parseFloat(match[1]),
            unit = match[2].toLowerCase();

        if (unit === 's') {
          // convert seconds to milliseconds
          value = value * 1000;
        }

        if (value > max) max = value;
      });
      return max;
    }

    return def;
  };
  /**
   * @summary The callback function to execute when starting a transition.
   * @callback FooBar.utils.transition~startCallback
   * @param {jQuery} $element - The element to start the transition on.
   * @this Element
   */

  /**
   * @summary Start a transition by toggling the supplied `className` on the `$element`.
   * @memberof FooBar.utils.transition.
   * @function start
   * @param {jQuery} $element - The jQuery element to start the transition on.
   * @param {(string|FooBar.utils.transition~startCallback)} classNameOrFunc - One or more class names (separated by spaces) to be toggled or a function that performs the required actions to start the transition.
   * @param {boolean} [state] - A Boolean (not just truthy/falsy) value to determine whether the class should be added or removed.
   * @param {number} [timeout] - The maximum time, in milliseconds, to wait for the `transitionend` event to be raised. If not provided this will be automatically set to the elements `transition-duration` property plus an extra 50 milliseconds.
   * @returns {Promise}
   * @description This method lets us use CSS transitions by toggling a class and using the `transitionend` event to perform additional actions once the transition has completed across all browsers. In browsers that do not support transitions this method would behave the same as if just calling jQuery's `.toggleClass` method.
   *
   * The last parameter `timeout` is used to create a timer that behaves as a safety net in case the `transitionend` event is never raised and ensures the deferred returned by this method is resolved or rejected within a specified time.
   * @see {@link https://developer.mozilla.org/en/docs/Web/CSS/transition-duration|transition-duration - CSS | MDN} for more information on the `transition-duration` CSS property.
   */


  _.transition.start = function ($element, classNameOrFunc, state, timeout) {
    var deferred = $.Deferred(),
        promise = deferred.promise();
    $element = $element.first();

    if (_.transition.supported) {
      $element.prop('offsetTop');
      var safety = $element.data('transition_safety');

      if (_is.hash(safety) && _is.number(safety.timer)) {
        clearTimeout(safety.timer);
        $element.removeData('transition_safety').off(_.transition.end + '.utils');
        safety.deferred.reject();
      }

      timeout = _is.number(timeout) ? timeout : _.transition.duration($element) + 50;
      safety = {
        deferred: deferred,
        timer: setTimeout(function () {
          // This is the safety net in case a transition fails for some reason and the transitionend event is never raised.
          // This will remove the bound event and resolve the deferred
          $element.removeData('transition_safety').off(_.transition.end + '.utils');
          deferred.resolve();
        }, timeout)
      };
      $element.data('transition_safety', safety);
      $element.on(_.transition.end + '.utils', function (e) {
        if ($element.is(e.target)) {
          clearTimeout(safety.timer);
          $element.removeData('transition_safety').off(_.transition.end + '.utils');
          deferred.resolve();
        }
      });
    }

    _animation.requestFrame(function () {
      if (_is.fn(classNameOrFunc)) {
        classNameOrFunc.apply($element.get(0), [$element]);
      } else {
        $element.toggleClass(classNameOrFunc, state);
      }

      if (!_.transition.supported) {
        // If the browser doesn't support transitions then just resolve the deferred
        deferred.resolve();
      }
    });

    return promise;
  };
})( // dependencies
FooBar.utils.$, FooBar.utils, FooBar.utils.is, FooBar.utils.animation);

(function ($, _, _is, _obj, _fn) {
  // only register methods if this version is the current version
  if (_.version !== '0.2.0') return;
  /**
   * @summary A base class providing some helper methods for prototypal inheritance.
   * @memberof FooBar.utils.
   * @constructs Class
   * @description This is a base class for making prototypal inheritance simpler to work with. It provides an easy way to inherit from another class and exposes a `_super` method within the scope of any overriding methods that allows a simple way to execute the overridden function.
   *
   * Have a look at the {@link FooBar.utils.Class.extend|extend} and {@link FooBar.utils.Class.override|override} method examples to see some basic usage.
   * @example {@caption When using this base class the actual construction of a class is performed by the `construct` method.}
   * var MyClass = FooBar.utils.Class.extend({
   * 	construct: function(arg1, arg2){
   * 		// handle the construction logic here
   * 	}
   * });
   *
   * // use the class
   * var myClass = new MyClass( "arg1:value", "arg2:value" );
   */

  _.Class = function () {};
  /**
   * @ignore
   * @summary The original function when within the scope of an overriding method.
   * @memberof FooBar.utils.Class#
   * @function _super
   * @param {...*} [argN] - The same arguments as the base method.
   * @returns {*} The result of the base method.
   * @description This is only available within the scope of an overriding method if it was created using the {@link FooBar.utils.Class.extend|extend}, {@link FooBar.utils.Class.override|override} or {@link FooBar.utils.fn.addOrOverride} methods.
   * @see {@link FooBar.utils.fn.addOrOverride} to see an example of how this property is used.
   */

  /**
   * @summary Creates a new class that inherits from this one which in turn allows itself to be extended.
   * @memberof FooBar.utils.Class.
   * @function extend
   * @param {Object} [definition] - An object containing any methods to implement/override.
   * @returns {function} A new class that inherits from the base class.
   * @description Every class created using this method has both the {@link FooBar.utils.Class.extend|extend} and {@link FooBar.utils.Class.override|override} static methods added to it to allow it to be extended.
   * @example {@caption The below shows an example of how to implement inheritance using this method.}{@run true}
   * // create a base Person class
   * var Person = FooBar.utils.Class.extend({
   * 	construct: function(isDancing){
   * 		this.dancing = isDancing;
   * 	},
   * 	dance: function(){
   * 		return this.dancing;
   * 	}
   * });
   *
   * var Ninja = Person.extend({
   * 	construct: function(){
   * 		// Call the inherited version of construct()
   * 		this._super( false );
   * 	},
   * 	dance: function(){
   * 		// Call the inherited version of dance()
   * 		return this._super();
   * 	},
   * 	swingSword: function(){
   * 		return true;
   * 	}
   * });
   *
   * var p = new Person(true);
   * console.log( p.dance() ); // => true
   *
   * var n = new Ninja();
   * console.log( n.dance() ); // => false
   * console.log( n.swingSword() ); // => true
   * console.log(
   * 	p instanceof Person && p.constructor === Person && p instanceof FooBar.utils.Class
   * 	&& n instanceof Ninja && n.constructor === Ninja && n instanceof Person && n instanceof FooBar.utils.Class
   * ); // => true
   */


  _.Class.extend = function (definition) {
    definition = _is.hash(definition) ? definition : {};

    var proto = _obj.create(this.prototype); // create a new prototype to work with so we don't modify the original
    // iterate over all properties in the supplied definition and update the prototype


    for (var name in definition) {
      if (!definition.hasOwnProperty(name)) continue;

      _fn.addOrOverride(proto, name, definition[name]);
    } // if no construct method is defined add a default one that does nothing


    proto.construct = _is.fn(proto.construct) ? proto.construct : function () {}; // create the new class using the prototype made above

    function Class() {
      if (!_is.fn(this.construct)) throw new SyntaxError('FooBar.utils.Class objects must be constructed with the "new" keyword.');
      this.construct.apply(this, arguments);
    }

    Class.prototype = proto; //noinspection JSUnresolvedVariable

    Class.prototype.constructor = _is.fn(proto.__ctor__) ? proto.__ctor__ : Class;
    Class.extend = _.Class.extend;
    Class.override = _.Class.override;
    Class.bases = _.Class.bases;
    Class.__base__ = this;
    return Class;
  };
  /**
   * @summary Overrides a single method on this class.
   * @memberof FooBar.utils.Class.
   * @function override
   * @param {string} name - The name of the function to override.
   * @param {function} fn - The new function to override with, the `_super` method will be made available within this function.
   * @description This is a helper method for overriding a single function of a {@link FooBar.utils.Class} or one of its child classes. This uses the {@link FooBar.utils.fn.addOrOverride} method internally and simply provides the correct prototype.
   * @example {@caption The below example wraps the `Person.prototype.dance` method with a new one that inverts the result. Note the override applies even to instances of the class that are already created.}{@run true}
   * var Person = FooBar.utils.Class.extend({
   *   construct: function(isDancing){
   *     this.dancing = isDancing;
   *   },
   *   dance: function(){
   *     return this.dancing;
   *   }
   * });
   *
   * var p = new Person(true);
   * console.log( p.dance() ); // => true
   *
   * Person.override("dance", function(){
   * 	// Call the original version of dance()
   * 	return !this._super();
   * });
   *
   * console.log( p.dance() ); // => false
   */


  _.Class.override = function (name, fn) {
    _fn.addOrOverride(this.prototype, name, fn);
  };
  /**
   * @summary The base class for this class.
   * @memberof FooBar.utils.Class.
   * @name __base__
   * @type {?FooBar.utils.Class}
   * @private
   */


  _.Class.__base__ = null;
  /**
   * @summary Get an array of all base classes for this class.
   * @memberof FooBar.utils.Class.
   * @function bases
   * @returns {FooBar.utils.Class[]}
   */

  _.Class.bases = function () {
    function _get(klass, result) {
      if (!_is.array(result)) result = [];

      if (_is.fn(klass) && klass.__base__ !== null) {
        result.unshift(klass.__base__);
        return _get(klass.__base__, result);
      }

      return result;
    }

    var initial = [];
    return _get(this, initial);
  };
})( // dependencies
FooBar.utils.$, FooBar.utils, FooBar.utils.is, FooBar.utils.obj, FooBar.utils.fn);

(function (_, _is, _str) {
  // only register methods if this version is the current version
  if (_.version !== '0.2.0') return;
  /**
   * @summary A base event class providing just a type and defaultPrevented properties.
   * @memberof FooBar.utils.
   * @class Event
   * @param {string} type - The type for this event.
   * @augments FooBar.utils.Class
   * @borrows FooBar.utils.Class.extend as extend
   * @borrows FooBar.utils.Class.override as override
   * @description This is a very basic event class that is used internally by the {@link FooBar.utils.EventClass#trigger} method when the first parameter supplied is simply the event name.
   *
   * To trigger your own custom event you will need to inherit from this class and then supply the instantiated event object as the first parameter to the {@link FooBar.utils.EventClass#trigger} method.
   * @example {@caption The following shows how to use this class to create a custom event.}
   * var MyEvent = FooBar.utils.Event.extend({
   * 	construct: function(type, customProp){
   * 	    this._super(type);
   * 	    this.myCustomProp = customProp;
   * 	}
   * });
   *
   * // to use the class you would then instantiate it and pass it as the first argument to a FooBar.utils.EventClass's trigger method
   * var eventClass = ...; // any class inheriting from FooBar.utils.EventClass
   * var event = new MyEvent( "my-event-type", true );
   * eventClass.trigger(event);
   */

  _.Event = _.Class.extend(
  /** @lends FooBar.utils.Event.prototype */
  {
    /**
     * @ignore
     * @constructs
     * @param {string} type
     **/
    construct: function construct(type) {
      if (_is.empty(type)) throw new SyntaxError('FooBar.utils.Event objects must be supplied a `type`.');

      var self = this,
          parsed = _.Event.parse(type);
      /**
       * @summary The type of event.
       * @memberof FooBar.utils.Event#
       * @name type
       * @type {string}
       * @readonly
       */


      self.type = parsed.type;
      /**
       * @summary The namespace of the event.
       * @memberof FooBar.utils.Event#
       * @name namespace
       * @type {string}
       * @readonly
       */

      self.namespace = parsed.namespace;
      /**
       * @summary Whether the default action should be taken or not.
       * @memberof FooBar.utils.Event#
       * @name defaultPrevented
       * @type {boolean}
       * @readonly
       */

      self.defaultPrevented = false;
      /**
       * @summary The original {@link FooBar.utils.EventClass} that triggered this event.
       * @memberof FooBar.utils.Event#
       * @name target
       * @type {FooBar.utils.EventClass}
       */

      self.target = null;
    },

    /**
     * @summary Informs the class that raised this event that its default action should not be taken.
     * @memberof FooBar.utils.Event#
     * @function preventDefault
     */
    preventDefault: function preventDefault() {
      this.defaultPrevented = true;
    },

    /**
     * @summary Gets whether the default action should be taken or not.
     * @memberof FooBar.utils.Event#
     * @function isDefaultPrevented
     * @returns {boolean}
     */
    isDefaultPrevented: function isDefaultPrevented() {
      return this.defaultPrevented;
    }
  });
  /**
   * @summary Parse the provided event string into a type and namespace.
   * @memberof FooBar.utils.Event.
   * @function parse
   * @param {string} event - The event to parse.
   * @returns {{namespaced: boolean, type: string, namespace: string}} Returns an object containing the type and namespace for the event.
   */

  _.Event.parse = function (event) {
    event = _is.string(event) && !_is.empty(event) ? event : null;

    var namespaced = _str.contains(event, ".");

    return {
      namespaced: namespaced,
      type: namespaced ? _str.startsWith(event, ".") ? null : _str.until(event, ".") : event,
      namespace: namespaced ? _str.from(event, ".") : null
    };
  };
  /**
   * @summary A base class that implements a basic events interface.
   * @memberof FooBar.utils.
   * @class EventClass
   * @augments FooBar.utils.Class
   * @borrows FooBar.utils.Class.extend as extend
   * @borrows FooBar.utils.Class.override as override
   * @description This is a very basic events implementation that provides just enough to cover most needs.
   */


  _.EventClass = _.Class.extend(
  /** @lends FooBar.utils.EventClass.prototype */
  {
    /**
     * @ignore
     * @constructs
     **/
    construct: function construct() {
      /**
       * @summary An object containing all the required info to execute a listener.
       * @typedef {Object} FooBar.utils.EventClass~RegisteredListener
       * @property {string} namespace - The namespace for the listener.
       * @property {function} fn - The callback function for the listener.
       * @property {*} thisArg - The `this` value to execute the callback with.
       */

      /**
       * @summary An object containing a mapping of events to listeners.
       * @typedef {Object.<string, Array<FooBar.utils.EventClass~RegisteredListener>>} FooBar.utils.EventClass~RegisteredEvents
       */

      /**
       * @summary The object used to register event handlers.
       * @memberof FooBar.utils.EventClass#
       * @name events
       * @type {FooBar.utils.EventClass~RegisteredEvents}
       */
      this.events = {};
    },

    /**
     * @summary Destroy the current instance releasing used resources.
     * @memberof FooBar.utils.EventClass#
     * @function destroy
     */
    destroy: function destroy() {
      this.events = {};
    },

    /**
     * @summary Attach multiple event listeners to the class.
     * @memberof FooBar.utils.EventClass#
     * @function on
     * @param {Object.<string, function>} events - An object containing event types to listener mappings.
     * @param {*} [thisArg] - The value of `this` within the listeners. Defaults to the class raising the event.
     * @returns {this}
     */

    /**
    * @summary Attach an event listener for one or more events to the class.
    * @memberof FooBar.utils.EventClass#
    * @function on
    * @param {string} events - One or more space-separated event types.
    * @param {function} listener - A function to execute when the event is triggered.
    * @param {*} [thisArg] - The value of `this` within the `listener`. Defaults to the class raising the event.
    * @returns {this}
    */
    on: function on(events, listener, thisArg) {
      var self = this;

      if (_is.object(events)) {
        thisArg = listener;
        Object.keys(events).forEach(function (key) {
          if (_is.fn(events[key])) {
            key.split(" ").forEach(function (type) {
              self.addListener(type, events[key], thisArg);
            });
          }
        });
      } else if (_is.string(events) && _is.fn(listener)) {
        events.split(" ").forEach(function (type) {
          self.addListener(type, listener, thisArg);
        });
      }

      return self;
    },

    /**
     * @summary Adds a single event listener to the current class.
     * @memberof FooBar.utils.EventClass#
     * @function addListener
     * @param {string} event - The event type, this can not contain any whitespace.
     * @param {function} listener - A function to execute when the event is triggered.
     * @param {*} [thisArg] - The value of `this` within the `listener`. Defaults to the class raising the event.
     * @returns {boolean} Returns `true` if added.
     */
    addListener: function addListener(event, listener, thisArg) {
      if (!_is.string(event) || /\s/.test(event) || !_is.fn(listener)) return false;

      var self = this,
          parsed = _.Event.parse(event);

      thisArg = _is.undef(thisArg) ? self : thisArg;

      if (!_is.array(self.events[parsed.type])) {
        self.events[parsed.type] = [];
      }

      var exists = self.events[parsed.type].some(function (h) {
        return h.namespace === parsed.namespace && h.fn === listener && h.thisArg === thisArg;
      });

      if (!exists) {
        self.events[parsed.type].push({
          namespace: parsed.namespace,
          fn: listener,
          thisArg: thisArg
        });
        return true;
      }

      return false;
    },

    /**
     * @summary Remove multiple event listeners from the class.
     * @memberof FooBar.utils.EventClass#
     * @function off
     * @param {Object.<string, function>} events - An object containing event types to listener mappings.
     * @param {*} [thisArg] - The value of `this` within the `listener` function. Defaults to the class raising the event.
     * @returns {this}
     */

    /**
    * @summary Remove an event listener from the class.
    * @memberof FooBar.utils.EventClass#
    * @function off
    * @param {string} events - One or more space-separated event types.
    * @param {function} listener - A function to execute when the event is triggered.
    * @param {*} [thisArg] - The value of `this` within the `listener`. Defaults to the class raising the event.
    * @returns {this}
    */
    off: function off(events, listener, thisArg) {
      var self = this;

      if (_is.object(events)) {
        thisArg = listener;
        Object.keys(events).forEach(function (key) {
          key.split(" ").forEach(function (type) {
            self.removeListener(type, events[key], thisArg);
          });
        });
      } else if (_is.string(events)) {
        events.split(" ").forEach(function (type) {
          self.removeListener(type, listener, thisArg);
        });
      }

      return self;
    },

    /**
     * @summary Removes a single event listener from the current class.
     * @memberof FooBar.utils.EventClass#
     * @function removeListener
     * @param {string} event - The event type, this can not contain any whitespace.
     * @param {function} [listener] - The listener registered to the event type.
     * @param {*} [thisArg] - The value of `this` registered for the `listener`. Defaults to the class raising the event.
     * @returns {boolean} Returns `true` if removed.
     */
    removeListener: function removeListener(event, listener, thisArg) {
      if (!_is.string(event) || /\s/.test(event)) return false;

      var self = this,
          parsed = _.Event.parse(event),
          types = [];

      thisArg = _is.undef(thisArg) ? self : thisArg;

      if (!_is.empty(parsed.type)) {
        types.push(parsed.type);
      } else if (!_is.empty(parsed.namespace)) {
        types.push.apply(types, Object.keys(self.events));
      }

      types.forEach(function (type) {
        if (!_is.array(self.events[type])) return;
        self.events[type] = self.events[type].filter(function (h) {
          if (listener != null) {
            return !(h.namespace === parsed.namespace && h.fn === listener && h.thisArg === thisArg);
          }

          if (parsed.namespace != null) {
            return h.namespace !== parsed.namespace;
          }

          return false;
        });

        if (self.events[type].length === 0) {
          delete self.events[type];
        }
      });
      return true;
    },

    /**
     * @summary Trigger an event on the current class.
     * @memberof FooBar.utils.EventClass#
     * @function trigger
     * @param {(string|FooBar.utils.Event)} event - Either a space-separated string of event types or a custom event object to raise.
     * @param {Array} [args] - An array of additional arguments to supply to the listeners after the event object.
     * @returns {(FooBar.utils.Event|FooBar.utils.Event[]|null)} Returns the {@link FooBar.utils.Event|event object} of the triggered event. If more than one event was triggered an array of {@link FooBar.utils.Event|event objects} is returned. If no `event` was supplied or triggered `null` is returned.
     */
    trigger: function trigger(event, args) {
      args = _is.array(args) ? args : [];
      var self = this,
          result = [];

      if (event instanceof _.Event) {
        result.push(event);
        self.emit(event, args);
      } else if (_is.string(event)) {
        event.split(" ").forEach(function (type) {
          var e = new _.Event(type);
          result.push(e);
          self.emit(e, args);
        });
      }

      return _is.empty(result) ? null : result.length === 1 ? result[0] : result;
    },

    /**
     * @summary Emits the supplied event on the current class.
     * @memberof FooBar.utils.EventClass#
     * @function emit
     * @param {FooBar.utils.Event} event - The event object to emit.
     * @param {Array} [args] - An array of additional arguments to supply to the listener after the event object.
     */
    emit: function emit(event, args) {
      if (!(event instanceof FooBar.utils.Event)) return;
      var self = this;
      args = _is.array(args) ? args : [];
      if (event.target === null) event.target = self;

      if (_is.array(self.events[event.type])) {
        self.events[event.type].forEach(function (h) {
          if (event.namespace != null && h.namespace !== event.namespace) return;
          h.fn.apply(h.thisArg, [event].concat(args));
        });
      }

      if (_is.array(self.events["__all__"])) {
        self.events["__all__"].forEach(function (h) {
          h.fn.apply(h.thisArg, [event].concat(args));
        });
      }
    }
  });
})( // dependencies
FooBar.utils, FooBar.utils.is, FooBar.utils.str);

(function ($, _, _is) {
  // only register methods if this version is the current version
  if (_.version !== '0.2.0') return;
  /**
   * @summary A simple bounding rectangle class.
   * @memberof FooBar.utils.
   * @class Bounds
   * @augments FooBar.utils.Class
   * @borrows FooBar.utils.Class.extend as extend
   * @borrows FooBar.utils.Class.override as override
   */

  _.Bounds = _.Class.extend(
  /** @lends FooBar.utils.Bounds.prototype */
  {
    /**
     * @ignore
     * @constructs
     **/
    construct: function construct() {
      var self = this;
      /**
       * @summary The top position.
       * @memberof FooBar.utils.Bounds#
       * @name top
       * @type {number}
       */

      self.top = 0;
      /**
       * @summary The right position.
       * @memberof FooBar.utils.Bounds#
       * @name right
       * @type {number}
       */

      self.right = 0;
      /**
       * @summary The bottom position.
       * @memberof FooBar.utils.Bounds#
       * @name bottom
       * @type {number}
       */

      self.bottom = 0;
      /**
       * @summary The left position.
       * @memberof FooBar.utils.Bounds#
       * @name left
       * @type {number}
       */

      self.left = 0;
      /**
       * @summary The width of the rectangle described by the position properties.
       * @memberof FooBar.utils.Bounds#
       * @name width
       * @type {number}
       */

      self.width = 0;
      /**
       * @summary The height of the rectangle described by the position properties.
       * @memberof FooBar.utils.Bounds#
       * @name height
       * @type {number}
       */

      self.height = 0;
    },

    /**
     * @summary Inflate the bounds by the specified amount.
     * @memberof FooBar.utils.Bounds#
     * @function inflate
     * @param {number} amount - A positive number will expand the bounds while a negative one will shrink it.
     * @returns {FooBar.utils.Bounds}
     */
    inflate: function inflate(amount) {
      var self = this;

      if (_is.number(amount)) {
        self.top -= amount;
        self.right += amount;
        self.bottom += amount;
        self.left -= amount;
        self.width += amount * 2;
        self.height += amount * 2;
      }

      return self;
    },

    /**
     * @summary Checks if the supplied bounds object intersects with this one.
     * @memberof FooBar.utils.Bounds#
     * @function intersects
     * @param {FooBar.utils.Bounds} bounds - The bounds to check.
     * @returns {boolean}
     */
    intersects: function intersects(bounds) {
      var self = this;
      return self.left <= bounds.right && bounds.left <= self.right && self.top <= bounds.bottom && bounds.top <= self.bottom;
    }
  });

  var __$window;
  /**
   * @summary Gets the bounding rectangle of the current viewport.
   * @memberof FooBar.utils.
   * @function getViewportBounds
   * @param {number} [inflate] - An amount to inflate the bounds by. A positive number will expand the bounds outside of the visible viewport while a negative one would shrink it.
   * @returns {FooBar.utils.Bounds}
   */


  _.getViewportBounds = function (inflate) {
    if (!__$window) __$window = $(window);
    var bounds = new _.Bounds();
    bounds.top = __$window.scrollTop();
    bounds.left = __$window.scrollLeft();
    bounds.width = __$window.width();
    bounds.height = __$window.height();
    bounds.right = bounds.left + bounds.width;
    bounds.bottom = bounds.top + bounds.height;
    bounds.inflate(inflate);
    return bounds;
  };
  /**
   * @summary Get the bounding rectangle for the supplied element.
   * @memberof FooBar.utils.
   * @function getElementBounds
   * @param {(jQuery|HTMLElement|string)} element - The jQuery wrapper around the element, the element itself, or a CSS selector to retrieve the element with.
   * @returns {FooBar.utils.Bounds}
   */


  _.getElementBounds = function (element) {
    if (!_is.jq(element)) element = $(element);
    var bounds = new _.Bounds();

    if (element.length !== 0) {
      var offset = element.offset();
      bounds.top = offset.top;
      bounds.left = offset.left;
      bounds.width = element.width();
      bounds.height = element.height();
    }

    bounds.right = bounds.left + bounds.width;
    bounds.bottom = bounds.top + bounds.height;
    return bounds;
  };
})(FooBar.utils.$, FooBar.utils, FooBar.utils.is);

(function ($, _, _is, _fn, _obj) {
  // only register methods if this version is the current version
  if (_.version !== '0.2.0') return;
  /**
   * @summary A simple timer that triggers events.
   * @memberof FooBar.utils.
   * @class Timer
   * @param {number} [interval=1000] - The internal tick interval of the timer.
   */

  _.Timer = _.EventClass.extend(
  /** @lends FooBar.utils.Timer */
  {
    /**
     * @ignore
     * @constructs
     * @param {number} [interval=1000]
     */
    construct: function construct(interval) {
      this._super();
      /**
       * @summary The internal tick interval of the timer in milliseconds.
       * @memberof FooBar.utils.Timer#
       * @name interval
       * @type {number}
       * @default 1000
       * @readonly
       */


      this.interval = _is.number(interval) ? interval : 1000;
      /**
       * @summary Whether the timer is currently running or not.
       * @memberof FooBar.utils.Timer#
       * @name isRunning
       * @type {boolean}
       * @default false
       * @readonly
       */

      this.isRunning = false;
      /**
       * @summary Whether the timer is currently paused or not.
       * @memberof FooBar.utils.Timer#
       * @name isPaused
       * @type {boolean}
       * @default false
       * @readonly
       */

      this.isPaused = false;
      /**
       * @summary Whether the timer can resume from a previous state or not.
       * @memberof FooBar.utils.Timer#
       * @name canResume
       * @type {boolean}
       * @default false
       * @readonly
       */

      this.canResume = false;
      /**
       * @summary Whether the timer can restart or not.
       * @memberof FooBar.utils.Timer#
       * @name canRestart
       * @type {boolean}
       * @default false
       * @readonly
       */

      this.canRestart = false;
      /**
       * @summary The internal tick timeout ID.
       * @memberof FooBar.utils.Timer#
       * @name __timeout
       * @type {?number}
       * @default null
       * @private
       */

      this.__timeout = null;
      /**
       * @summary Whether the timer is incrementing or decrementing.
       * @memberof FooBar.utils.Timer#
       * @name __decrement
       * @type {boolean}
       * @default false
       * @private
       */

      this.__decrement = false;
      /**
       * @summary The total time for the timer.
       * @memberof FooBar.utils.Timer#
       * @name __time
       * @type {number}
       * @default 0
       * @private
       */

      this.__time = 0;
      /**
       * @summary The remaining time for the timer.
       * @memberof FooBar.utils.Timer#
       * @name __remaining
       * @type {number}
       * @default 0
       * @private
       */

      this.__remaining = 0;
      /**
       * @summary The current time for the timer.
       * @memberof FooBar.utils.Timer#
       * @name __current
       * @type {number}
       * @default 0
       * @private
       */

      this.__current = 0;
      /**
       * @summary The final time for the timer.
       * @memberof FooBar.utils.Timer#
       * @name __finish
       * @type {number}
       * @default 0
       * @private
       */

      this.__finish = 0;
      /**
       * @summary The last arguments supplied to the {@link FooBar.utils.Timer#start|start} method.
       * @memberof FooBar.utils.Timer#
       * @name __restart
       * @type {Array}
       * @default []
       * @private
       */

      this.__restart = [];
    },

    /**
     * @summary Resets the timer back to a fresh starting state.
     * @memberof FooBar.utils.Timer#
     * @function __reset
     * @private
     */
    __reset: function __reset() {
      clearTimeout(this.__timeout);
      this.__timeout = null;
      this.__decrement = false;
      this.__time = 0;
      this.__remaining = 0;
      this.__current = 0;
      this.__finish = 0;
      this.isRunning = false;
      this.isPaused = false;
      this.canResume = false;
    },

    /**
     * @summary Generates event args to be passed to listeners of the timer events.
     * @memberof FooBar.utils.Timer#
     * @function __eventArgs
     * @param {...*} [args] - Any number of additional arguments to pass to an event listener.
     * @return {Array} - The first 3 values of the result will always be the current time, the total time and boolean indicating if the timer is decremental.
     * @private
     */
    __eventArgs: function __eventArgs(args) {
      return [this.__current, this.__time, this.__decrement].concat(_fn.arg2arr(arguments));
    },

    /**
     * @summary Performs the tick for the timer checking and modifying the various internal states.
     * @memberof FooBar.utils.Timer#
     * @function __tick
     * @private
     */
    __tick: function __tick() {
      var self = this;
      self.trigger("tick", self.__eventArgs());

      if (self.__current === self.__finish) {
        self.trigger("complete", self.__eventArgs());

        self.__reset();
      } else {
        if (self.__decrement) {
          self.__current--;
        } else {
          self.__current++;
        }

        self.__remaining--;
        self.canResume = self.__remaining > 0;
        self.__timeout = setTimeout(function () {
          self.__tick();
        }, self.interval);
      }
    },

    /**
     * @summary Starts the timer using the supplied `time` and whether or not to increment or decrement from the value.
     * @memberof FooBar.utils.Timer#
     * @function start
     * @param {number} time - The total time in seconds for the timer.
     * @param {boolean} [decrement=false] - Whether the timer should increment or decrement from or to the supplied time.
     */
    start: function start(time, decrement) {
      var self = this;
      if (self.isRunning) return;
      decrement = _is.boolean(decrement) ? decrement : false;
      self.__restart = [time, decrement];
      self.__decrement = decrement;
      self.__time = time;
      self.__remaining = time;
      self.__current = decrement ? time : 0;
      self.__finish = decrement ? 0 : time;
      self.canRestart = true;
      self.isRunning = true;
      self.isPaused = false;
      self.trigger("start", self.__eventArgs());

      self.__tick();
    },

    /**
     * @summary Starts the timer counting down to `0` from the supplied `time`.
     * @memberof FooBar.utils.Timer#
     * @function countdown
     * @param {number} time - The total time in seconds for the timer.
     */
    countdown: function countdown(time) {
      this.start(time, true);
    },

    /**
     * @summary Starts the timer counting up from `0` to the supplied `time`.
     * @memberof FooBar.utils.Timer#
     * @function countup
     * @param {number} time - The total time in seconds for the timer.
     */
    countup: function countup(time) {
      this.start(time, false);
    },

    /**
     * @summary Stops and then restarts the timer using the last arguments supplied to the {@link FooBar.utils.Timer#start|start} method.
     * @memberof FooBar.utils.Timer#
     * @function restart
     */
    restart: function restart() {
      this.stop();

      if (this.canRestart) {
        this.start.apply(this, this.__restart);
      }
    },

    /**
     * @summary Stops the timer.
     * @memberof FooBar.utils.Timer#
     * @function stop
     */
    stop: function stop() {
      if (this.isRunning || this.isPaused) {
        this.__reset();

        this.trigger("stop", this.__eventArgs());
      }
    },

    /**
     * @summary Pauses the timer and returns the remaining seconds.
     * @memberof FooBar.utils.Timer#
     * @function pause
     * @return {number} - The number of seconds remaining for the timer.
     */
    pause: function pause() {
      var self = this;

      if (self.__timeout != null) {
        clearTimeout(self.__timeout);
        self.__timeout = null;
      }

      if (self.isRunning) {
        self.isRunning = false;
        self.isPaused = true;
        self.trigger("pause", self.__eventArgs());
      }

      return self.__remaining;
    },

    /**
     * @summary Resumes the timer from a previously paused state.
     * @memberof FooBar.utils.Timer#
     * @function resume
     */
    resume: function resume() {
      var self = this;

      if (self.canResume) {
        self.isRunning = true;
        self.isPaused = false;
        self.trigger("resume", self.__eventArgs());

        self.__tick();
      }
    },

    /**
     * @summary Resets the timer back to a fresh starting state.
     * @memberof FooBar.utils.Timer#
     * @function reset
     */
    reset: function reset() {
      this.__reset();

      this.trigger("reset", this.__eventArgs());
    }
  });
})(FooBar.utils.$, FooBar.utils, FooBar.utils.is, FooBar.utils.fn, FooBar.utils.obj);

(function ($, _, _is, _fn) {
  // only register methods if this version is the current version
  if (_.version !== '0.2.0') return;
  /**
   * @summary A factory for classes allowing them to be registered and created using a friendly name.
   * @memberof FooBar.utils.
   * @class Factory
   * @description This class allows other classes to register themselves for use at a later time. Depending on how you intend to use the registered classes you can also specify a load and execution order through the `priority` parameter of the {@link FooBar.utils.Factory#register|register} method.
   * @augments FooBar.utils.Class
   * @borrows FooBar.utils.Class.extend as extend
   * @borrows FooBar.utils.Class.override as override
   */

  _.Factory = _.Class.extend(
  /** @lends FooBar.utils.Factory.prototype */
  {
    /**
     * @ignore
     * @constructs
     **/
    construct: function construct() {
      /**
       * @summary An object containing all the required info to create a new instance of a registered class.
       * @typedef {Object} FooBar.utils.Factory~RegisteredClass
       * @property {string} name - The friendly name of the registered class.
       * @property {function} klass - The constructor for the registered class.
       * @property {number} priority - The priority for the registered class.
       */

      /**
       * @summary An object containing all registered classes.
       * @memberof FooBar.utils.Factory#
       * @name registered
       * @type {Object.<string, FooBar.utils.Factory~RegisteredClass>}
       * @readonly
       * @example {@caption The following shows the structure of this object. The `<name>` placeholders would be the name the class was registered with.}
       * {
       * 	"<name>": {
       * 		"name": <string>,
       * 		"klass": <function>,
       * 		"priority": <number>
       * 	},
       * 	"<name>": {
       * 		"name": <string>,
       * 		"klass": <function>,
       * 		"priority": <number>
       * 	},
       * 	...
       * }
       */
      this.registered = {};
    },

    /**
     * @summary Checks if the factory contains a class registered using the supplied `name`.
     * @memberof FooBar.utils.Factory#
     * @function contains
     * @param {string} name - The name of the class to check.
     * @returns {boolean}
     * @example {@run true}
     * // create a new instance of the factory, this is usually exposed by the class that will be using the factory.
     * var factory = new FooBar.utils.Factory();
     *
     * // create a class to register
     * function Test(){}
     *
     * // register the class with the factory with the default priority
     * factory.register( "test", Test );
     *
     * // test if the class was registered
     * console.log( factory.contains( "test" ) ); // => true
     */
    contains: function contains(name) {
      return !_is.undef(this.registered[name]);
    },

    /**
     * @summary Creates new instances of all registered classes using there registered priority and the supplied arguments.
     * @memberof FooBar.utils.Factory#
     * @function load
     * @param {Object.<string, (function|string)>} overrides - An object containing classes to override any matching registered classes with, if no overrides are required you can pass `false` or `null`.
     * @param {*} arg1 - The first argument to supply when creating new instances of all registered classes.
     * @param {...*} [argN] - Any number of additional arguments to supply when creating new instances of all registered classes.
     * @returns {Array.<Object>} An array containing new instances of all registered classes.
     * @description The class indexes within the result array are determined by the `priority` they were registered with, the higher the `priority` the lower the index.
     *
     * This method is designed to be used when all registered classes share a common interface or base type and constructor arguments.
     * @example {@caption The following loads all registered classes into an array ordered by there priority.}{@run true}
     * // create a new instance of the factory, this is usually exposed by the class that will be using the factory.
     * var factory = new FooBar.utils.Factory();
     *
     * // create a base Extension class
     * var Extension = FooBar.utils.Class.extend({
     * 	construct: function( type, options ){
     * 		this.type = type;
     * 		this.options = options;
     * 	},
     * 	getType: function(){
     * 		return this.type;
     * 	}
     * });
     *
     * // create various item, this would usually be in another file
     * var MyExtension1 = Extension.extend({
     * 	construct: function(options){
     * 		this._super( "my-extension-1", options );
     * 	}
     * });
     * factory.register( "my-extension-1", MyExtension1, 0 );
     *
     * // create various item, this would usually be in another file
     * var MyExtension2 = Extension.extend({
     * 	construct: function(options){
     * 		this._super( "my-extension-2", options );
     * 	}
     * });
     * factory.register( "my-extension-2", MyExtension2, 1 );
     *
     * // load all registered classes according to there priority passing the options to all constructors
     * var loaded = factory.load( null, {"something": true} );
     *
     * // only two classes should be loaded
     * console.log( loaded.length ); // => 2
     *
     * // the MyExtension2 class is loaded first due to it's priority being higher than the MyExtension1 class.
     * console.log( loaded[0] instanceof MyExtension2 && loaded[0] instanceof Extension ); // => true
     * console.log( loaded[1] instanceof MyExtension1 && loaded[1] instanceof Extension ); // => true
     *
     * // do something with the loaded classes
     * @example {@caption The following loads all registered classes into an array ordered by there priority but uses the overrides parameter to swap out one of them for a custom implementation.}{@run true}
     * // create a new instance of the factory, this is usually exposed by the class that will be using the factory.
     * var factory = new FooBar.utils.Factory();
     *
     * // create a base Extension class
     * var Extension = FooBar.utils.Class.extend({
     * 	construct: function( type, options ){
     * 		this.type = type;
     * 		this.options = options;
     * 	},
     * 	getType: function(){
     * 		return this.type;
     * 	}
     * });
     *
     * // create a new extension, this would usually be in another file
     * var MyExtension1 = Extension.extend({
     * 	construct: function(options){
     * 		this._super( "my-extension-1", options );
     * 	}
     * });
     * factory.register( "my-extension-1", MyExtension1, 0 );
     *
     * // create a new extension, this would usually be in another file
     * var MyExtension2 = Extension.extend({
     * 	construct: function(options){
     * 		this._super( "my-extension-2", options );
     * 	}
     * });
     * factory.register( "my-extension-2", MyExtension2, 1 );
     *
     * // create a custom extension that is not registered but overrides the default "my-extension-1"
     * var UpdatedMyExtension1 = MyExtension1.extend({
     * 	construct: function(options){
     * 		this._super( options );
     * 		// do something different to the original MyExtension1 class
     * 	}
     * });
     *
     * // load all registered classes but swaps out the registered "my-extension-1" for the supplied override.
     * var loaded = factory.load( {"my-extension-1": UpdatedMyExtension1}, {"something": true} );
     *
     * // only two classes should be loaded
     * console.log( loaded.length ); // => 2
     *
     * // the MyExtension2 class is loaded first due to it's priority being higher than the UpdatedMyExtension1 class which inherited a priority of 0.
     * console.log( loaded[0] instanceof MyExtension2 && loaded[0] instanceof Extension ); // => true
     * console.log( loaded[1] instanceof UpdatedMyExtension1 && loaded[1] instanceof MyExtension1 && loaded[1] instanceof Extension ); // => true
     *
     * // do something with the loaded classes
     */
    load: function load(overrides, arg1, argN) {
      var self = this,
          args = _fn.arg2arr(arguments),
          reg = [],
          loaded = [],
          name,
          klass;

      overrides = args.shift() || {};

      for (name in self.registered) {
        if (!self.registered.hasOwnProperty(name)) continue;
        var component = self.registered[name];

        if (overrides.hasOwnProperty(name)) {
          klass = overrides[name];
          if (_is.string(klass)) klass = _fn.fetch(overrides[name]);

          if (_is.fn(klass)) {
            component = {
              name: name,
              klass: klass,
              priority: self.registered[name].priority
            };
          }
        }

        reg.push(component);
      }

      for (name in overrides) {
        if (!overrides.hasOwnProperty(name) || self.registered.hasOwnProperty(name)) continue;
        klass = overrides[name];
        if (_is.string(klass)) klass = _fn.fetch(overrides[name]);

        if (_is.fn(klass)) {
          reg.push({
            name: name,
            klass: klass,
            priority: 0
          });
        }
      }

      reg.sort(function (a, b) {
        return b.priority - a.priority;
      });
      $.each(reg, function (i, r) {
        if (_is.fn(r.klass)) {
          loaded.push(_fn.apply(r.klass, args));
        }
      });
      return loaded;
    },

    /**
     * @summary Create a new instance of a class registered with the supplied `name` and arguments.
     * @memberof FooBar.utils.Factory#
     * @function make
     * @param {string} name - The name of the class to create.
     * @param {*} arg1 - The first argument to supply to the new instance.
     * @param {...*} [argN] - Any number of additional arguments to supply to the new instance.
     * @returns {Object}
     * @example {@caption The following shows how to create a new instance of a registered class.}{@run true}
     * // create a new instance of the factory, this is usually done by the class that will be using it.
     * var factory = new FooBar.utils.Factory();
     *
     * // create a Logger class to register, this would usually be in another file
     * var Logger = FooBar.utils.Class.extend({
     * 	write: function( message ){
     * 		console.log( "Logger#write: " + message );
     * 	}
     * });
     *
     * factory.register( "logger", Logger );
     *
     * // create a new instances of the class registered as "logger"
     * var logger = factory.make( "logger" );
     * logger.write( "My message" ); // => "Logger#write: My message"
     */
    make: function make(name, arg1, argN) {
      var self = this,
          args = _fn.arg2arr(arguments),
          reg;

      name = args.shift();
      reg = self.registered[name];

      if (_is.hash(reg) && _is.fn(reg.klass)) {
        return _fn.apply(reg.klass, args);
      }

      return null;
    },

    /**
     * @summary Gets an array of all registered names.
     * @memberof FooBar.utils.Factory#
     * @function names
     * @param {boolean} [prioritize=false] - Whether or not to order the names by the priority they were registered with.
     * @returns {Array.<string>}
     * @example {@run true}
     * // create a new instance of the factory, this is usually exposed by the class that will be using the factory.
     * var factory = new FooBar.utils.Factory();
     *
     * // create some classes to register
     * function Test1(){}
     * function Test2(){}
     *
     * // register the classes with the factory with the default priority
     * factory.register( "test-1", Test1 );
     * factory.register( "test-2", Test2, 1 );
     *
     * // log all registered names
     * console.log( factory.names() ); // => ["test-1","test-2"]
     * console.log( factory.names( true ) ); // => ["test-2","test-1"] ~ "test-2" appears before "test-1" as it was registered with a higher priority
     */
    names: function names(prioritize) {
      prioritize = _is.boolean(prioritize) ? prioritize : false;
      var names = [],
          name;

      if (prioritize) {
        var reg = [];

        for (name in this.registered) {
          if (!this.registered.hasOwnProperty(name)) continue;
          reg.push(this.registered[name]);
        }

        reg.sort(function (a, b) {
          return b.priority - a.priority;
        });
        $.each(reg, function (i, r) {
          names.push(r.name);
        });
      } else {
        for (name in this.registered) {
          if (!this.registered.hasOwnProperty(name)) continue;
          names.push(name);
        }
      }

      return names;
    },

    /**
     * @summary Registers a `klass` constructor with the factory using the given `name`.
     * @memberof FooBar.utils.Factory#
     * @function register
     * @param {string} name - The friendly name of the class.
     * @param {function} klass - The class constructor to register.
     * @param {number} [priority=0] - This determines the index for the class when using either the {@link FooBar.utils.Factory#load|load} or {@link FooBar.utils.Factory#names|names} methods, a higher value equals a lower index.
     * @returns {boolean} `true` if the `klass` was successfully registered.
     * @description Once a class is registered you can use either the {@link FooBar.utils.Factory#load|load} or {@link FooBar.utils.Factory#make|make} methods to create new instances depending on your use case.
     * @example {@run true}
     * // create a new instance of the factory, this is usually exposed by the class that will be using the factory.
     * var factory = new FooBar.utils.Factory();
     *
     * // create a class to register
     * function Test(){}
     *
     * // register the class with the factory with the default priority
     * var succeeded = factory.register( "test", Test );
     *
     * console.log( succeeded ); // => true
     * console.log( factory.registered.hasOwnProperty( "test" ) ); // => true
     * console.log( factory.registered[ "test" ].name === "test" ); // => true
     * console.log( factory.registered[ "test" ].klass === Test ); // => true
     * console.log( factory.registered[ "test" ].priority === 0 ); // => true
     */
    register: function register(name, klass, priority) {
      if (!_is.string(name) || _is.empty(name) || !_is.fn(klass)) return false;
      priority = _is.number(priority) ? priority : 0;
      var current = this.registered[name];
      this.registered[name] = {
        name: name,
        klass: klass,
        priority: !_is.undef(current) ? current.priority : priority
      };
      return true;
    }
  });
})( // dependencies
FooBar.utils.$, FooBar.utils, FooBar.utils.is, FooBar.utils.fn);

(function (_, _fn, _str) {
  // only register methods if this version is the current version
  if (_.version !== '0.2.0') return; // this is done to handle Content Security in Chrome and other browsers blocking access to the localStorage object under certain configurations.
  // see: https://www.chromium.org/for-testers/bug-reporting-guidelines/uncaught-securityerror-failed-to-read-the-localstorage-property-from-window-access-is-denied-for-this-document

  var localAvailable = false;

  try {
    localAvailable = !!window.localStorage;
  } catch (err) {
    localAvailable = false;
  }
  /**
   * @summary A debug utility class that can be enabled across sessions using the given `key` by storing its state in `localStorage`.
   * @memberof FooBar.utils.
   * @class Debugger
   * @param {string} key - The key to use to store the debug state in `localStorage`.
   * @augments FooBar.utils.Class
   * @borrows FooBar.utils.Class.extend as extend
   * @borrows FooBar.utils.Class.override as override
   * @description This class allows you to write additional debug info to the console within your code which by default is not actually output. You can then enable the debugger and it will start to output the results to the console.
   *
   * The most useful feature of this is the ability to store the debug state across page sessions by using `localStorage`. This allows you to enable the debugger and then refresh the page to view any debugger output that occurs on page load.
   */


  _.Debugger = _.Class.extend(
  /** @lends FooBar.utils.Debugger.prototype */
  {
    /**
     * @ignore
     * @constructs
     * @param {string} key
     **/
    construct: function construct(key) {
      /**
       * @summary The key used to store the debug state in `localStorage`.
       * @memberof FooBar.utils.Debugger#
       * @name key
       * @type {string}
       */
      this.key = key;
      /**
       * @summary Whether or not the debugger is currently enabled.
       * @memberof FooBar.utils.Debugger#
       * @name enabled
       * @type {boolean}
       * @readonly
       * @description The value for this property is synced with the current state stored in `localStorage` and should never be set from outside of this class.
       */

      this.enabled = localAvailable ? !!localStorage.getItem(this.key) : false;
    },

    /**
     * @summary Enable the debugger causing additional info to be logged to the console.
     * @memberof FooBar.utils.Debugger#
     * @function enable
     * @example
     * var d = new FooBar.utils.Debugger( "FOO_DEBUG" );
     * d.log( "Never logged" );
     * d.enable();
     * d.log( "I am logged!" );
     */
    enable: function enable() {
      if (!localAvailable) return;
      this.enabled = true;
      localStorage.setItem(this.key, "debug");
    },

    /**
     * @summary Disable the debugger stopping additional info being logged to the console.
     * @memberof FooBar.utils.Debugger#
     * @function disable
     * @example
     * var d = new FooBar.utils.Debugger( "FOO_DEBUG" );
     * d.log( "Never logged" );
     * d.enable();
     * d.log( "I am logged!" );
     * d.disable();
     * d.log( "Never logged" );
     */
    disable: function disable() {
      if (!localAvailable) return;
      this.enabled = false;
      localStorage.removeItem(this.key);
    },

    /**
     * @summary Logs the supplied message and additional arguments to the console when enabled.
     * @memberof FooBar.utils.Debugger#
     * @function log
     * @param {string} message - The message to log to the console.
     * @param {*} [argN] - Any number of additional arguments to supply after the message.
     * @description This method basically wraps the `console.log` method and simply checks the enabled state of the debugger before passing along any supplied arguments.
     */
    log: function log(message, argN) {
      if (!this.enabled) return;
      console.log.apply(console, _fn.arg2arr(arguments));
    },

    /**
     * @summary Logs the formatted message and additional arguments to the console when enabled.
     * @memberof FooBar.utils.Debugger#
     * @function logf
     * @param {string} message - The message containing named `replacements` to log to the console.
     * @param {Object.<string, string>} replacements - An object containing key value pairs used to perform a named format on the `message`.
     * @param {*} [argN] - Any number of additional arguments to supply after the message.
     * @see {@link FooBar.utils.str.format} for more information on supplying the replacements object.
     */
    logf: function logf(message, replacements, argN) {
      if (!this.enabled) return;

      var args = _fn.arg2arr(arguments);

      message = args.shift();
      replacements = args.shift();
      args.unshift(_str.format(message, replacements));
      this.log.apply(this, args);
    }
  });
})( // dependencies
FooBar.utils, FooBar.utils.fn, FooBar.utils.str);

(function ($, _, _fn) {
  // only register methods if this version is the current version
  if (_.version !== '0.2.0') return;
  /**
   * @summary A wrapper around the fullscreen API to ensure cross browser compatibility.
   * @memberof FooBar.utils.
   * @class FullscreenAPI
   * @augments FooBar.utils.EventClass
   * @borrows FooBar.utils.EventClass.extend as extend
   * @borrows FooBar.utils.EventClass.override as override
   */

  _.FullscreenAPI = _.EventClass.extend(
  /** @lends FooBar.utils.FullscreenAPI */
  {
    /**
     * @ignore
     * @constructs
     */
    construct: function construct() {
      this._super();
      /**
       * @summary An object containing a single browsers various methods and events needed for this wrapper.
       * @typedef {?Object} FooBar.utils.FullscreenAPI~BrowserAPI
       * @property {string} enabled
       * @property {string} element
       * @property {string} request
       * @property {string} exit
       * @property {Object} events
       * @property {string} events.change
       * @property {string} events.error
       */

      /**
       * @summary An object containing the supported fullscreen browser API's.
       * @typedef {Object.<string, FooBar.utils.FullscreenAPI~BrowserAPI>} FooBar.utils.FullscreenAPI~SupportedBrowsers
       */

      /**
       * @summary Contains the various browser specific method and event names.
       * @memberof FooBar.utils.FullscreenAPI#
       * @name apis
       * @type {FooBar.utils.FullscreenAPI~SupportedBrowsers}
       */


      this.apis = {
        w3: {
          enabled: "fullscreenEnabled",
          element: "fullscreenElement",
          request: "requestFullscreen",
          exit: "exitFullscreen",
          events: {
            change: "fullscreenchange",
            error: "fullscreenerror"
          }
        },
        webkit: {
          enabled: "webkitFullscreenEnabled",
          element: "webkitCurrentFullScreenElement",
          request: "webkitRequestFullscreen",
          exit: "webkitExitFullscreen",
          events: {
            change: "webkitfullscreenchange",
            error: "webkitfullscreenerror"
          }
        },
        moz: {
          enabled: "mozFullScreenEnabled",
          element: "mozFullScreenElement",
          request: "mozRequestFullScreen",
          exit: "mozCancelFullScreen",
          events: {
            change: "mozfullscreenchange",
            error: "mozfullscreenerror"
          }
        },
        ms: {
          enabled: "msFullscreenEnabled",
          element: "msFullscreenElement",
          request: "msRequestFullscreen",
          exit: "msExitFullscreen",
          events: {
            change: "MSFullscreenChange",
            error: "MSFullscreenError"
          }
        }
      };
      /**
       * @summary The current browsers specific method and event names.
       * @memberof FooBar.utils.FullscreenAPI#
       * @name api
       * @type {FooBar.utils.FullscreenAPI~BrowserAPI}
       */

      this.api = this.getAPI();
      /**
       * @summary Whether or not the fullscreen API is supported in the current browser.
       * @memberof FooBar.utils.FullscreenAPI#
       * @name supported
       * @type {boolean}
       */

      this.supported = this.api != null;

      this.__listen();
    },

    /**
     * @summary Destroys the current wrapper unbinding events and freeing up resources.
     * @memberof FooBar.utils.FullscreenAPI#
     * @function destroy
     * @returns {boolean}
     */
    destroy: function destroy() {
      this.__stopListening();

      return this._super();
    },

    /**
     * @summary Fetches the correct API for the current browser.
     * @memberof FooBar.utils.FullscreenAPI#
     * @function getAPI
     * @return {?FooBar.utils.FullscreenAPI~BrowserAPI} Returns `null` if the fullscreen API is not supported.
     */
    getAPI: function getAPI() {
      for (var vendor in this.apis) {
        if (!this.apis.hasOwnProperty(vendor)) continue; // Check if document has the "enabled" property

        if (this.apis[vendor].enabled in document) {
          // It seems this browser supports the fullscreen API
          return this.apis[vendor];
        }
      }

      return null;
    },

    /**
     * @summary Gets the current fullscreen element or null.
     * @memberof FooBar.utils.FullscreenAPI#
     * @function element
     * @returns {?Element}
     */
    element: function element() {
      return this.supported ? document[this.api.element] : null;
    },

    /**
     * @summary Requests the browser to place the specified element into fullscreen mode.
     * @memberof FooBar.utils.FullscreenAPI#
     * @function request
     * @param {Element} element - The element to place into fullscreen mode.
     * @returns {Promise} A Promise which is resolved once the element is placed into fullscreen mode.
     */
    request: function request(element) {
      if (this.supported && !!element[this.api.request]) {
        var result = element[this.api.request]();
        return !result ? $.Deferred(this.__resolver(this.api.request)).promise() : result;
      }

      return _fn.rejected;
    },

    /**
     * @summary Requests that the browser switch from fullscreen mode back to windowed mode.
     * @memberof FooBar.utils.FullscreenAPI#
     * @function exit
     * @returns {Promise} A Promise which is resolved once fullscreen mode is exited.
     */
    exit: function exit() {
      if (this.supported && !!this.element()) {
        var result = document[this.api.exit]();
        return !result ? $.Deferred(this.__resolver(this.api.exit)).promise() : result;
      }

      return _fn.rejected;
    },

    /**
     * @summary Toggles the supplied element between fullscreen and windowed modes.
     * @memberof FooBar.utils.FullscreenAPI#
     * @function toggle
     * @param {Element} element - The element to switch between modes.
     * @returns {Promise} A Promise that is resolved once fullscreen mode is either entered or exited.
     */
    toggle: function toggle(element) {
      return !!this.element() ? this.exit() : this.request(element);
    },

    /**
     * @summary Starts listening to the document level fullscreen events and triggers an abbreviated version on this class.
     * @memberof FooBar.utils.FullscreenAPI#
     * @function __listen
     * @private
     */
    __listen: function __listen() {
      var self = this;
      if (!self.supported) return;
      $(document).on(self.api.events.change + ".utils", function () {
        self.trigger("change");
      }).on(self.api.events.error + ".utils", function () {
        self.trigger("error");
      });
    },

    /**
     * @summary Stops listening to the document level fullscreen events.
     * @memberof FooBar.utils.FullscreenAPI#
     * @function __stopListening
     * @private
     */
    __stopListening: function __stopListening() {
      var self = this;
      if (!self.supported) return;
      $(document).off(self.api.events.change + ".utils").off(self.api.events.error + ".utils");
    },

    /**
     * @summary Creates a resolver function to patch browsers which do not return a Promise from there request and exit methods.
     * @memberof FooBar.utils.FullscreenAPI#
     * @function __resolver
     * @param {string} method - The request or exit method the resolver is being created for.
     * @returns {resolver}
     * @private
     */
    __resolver: function __resolver(method) {
      var self = this;
      /**
       * @summary Binds to the fullscreen change and error events and resolves or rejects the supplied deferred accordingly.
       * @callback FooBar.utils.FullscreenAPI~resolver
       * @param {jQuery.Deferred} def - The jQuery.Deferred object to resolve.
       */

      return function resolver(def) {
        // Reject the promise if asked to exitFullscreen and there is no element currently in fullscreen
        if (method === self.api.exit && !!self.element()) {
          setTimeout(function () {
            def.reject(new TypeError());
          }, 1);
          return;
        } // When receiving an internal fullscreenchange event, fulfill the promise


        function change() {
          def.resolve();
          $(document).off(self.api.events.change, change).off(self.api.events.error, error);
        } // When receiving an internal fullscreenerror event, reject the promise


        function error() {
          def.reject(new TypeError());
          $(document).off(self.api.events.change, change).off(self.api.events.error, error);
        }

        $(document).on(self.api.events.change, change).on(self.api.events.error, error);
      };
    }
  });
  /**
   * @summary A cross browser wrapper for the fullscreen API.
   * @memberof FooBar.utils.
   * @name fullscreen
   * @type {FooBar.utils.FullscreenAPI}
   */

  _.fullscreen = new _.FullscreenAPI();
})(FooBar.utils.$, FooBar.utils, FooBar.utils.fn);
"use strict";

(function ($, _, _utils, _is, _fn, _str, _obj, _t, _a) {
  /**
   * @summary Exposes the `methods` from the `source` on the `target`.
   * @memberof FooBar.utils.fn.
   * @function expose
   * @param {Object} source - The object to expose methods from.
   * @param {Object} target - The object to expose methods on.
   * @param {String[]} methods - An array of method names to expose.
   * @param {*} [thisArg] - The value of `this` within the exposed `methods`. Defaults to the `source` object.
   */
  _fn.expose = function (source, target, methods, thisArg) {
    if (_is.object(source) && _is.object(target) && _is.array(methods)) {
      thisArg = _is.undef(thisArg) ? source : thisArg;
      methods.forEach(function (method) {
        if (_is.string(method) && _is.fn(source[method])) {
          target[method] = source[method].bind(thisArg);
        }
      });
    }
  };
  /**
   * @summary Executed while an elements transitions are disabled allowing changes to be made immediately.
   * @callback FooBar.utils.transition~doWhileDisabled
   * @param {jQuery} $element - The jQuery element with transitions disabled.
   */

  /**
   * @summary Disable transitions temporarily on the provided element so changes can be made immediately within the provided callback.
   * @memberof FooBar.utils.transition.
   * @function disable
   * @param {jQuery} $element - The jQuery element to disable transitions on.
   * @param {FooBar.utils.transition~doWhileDisabled} callback - A function to execute while the elements transitions are disabled.
   * @param {*} [thisArg] - The `this` value within the `callback`. Defaults to the callback itself.
   */


  _t.disable = function ($element, callback, thisArg) {
    if (!_is.jq($element) || !_is.fn(callback)) return;
    thisArg = _is.undef(thisArg) ? callback : thisArg;
    $element.addClass("fbr-transitions-disabled");
    callback.call(thisArg, $element);
    $element.prop("offsetHeight");
    $element.removeClass("fbr-transitions-disabled");
  };
  /**
   * @summary Called to perform modifications on the supplied element.
   * @callback FooBar.utils.transition~modifyCallback
   * @param {jQuery} $element - The jQuery element to modify.
   */

  /**
   * @summary Modify the provided `$element` by executing the `callback`.
   * @memberof FooBar.utils.transition.
   * @function modify
   * @param {jQuery} $element - The jQuery element to modify.
   * @param {FooBar.utils.transition~modifyCallback} callback - The callback that modifies the provided `$element`.
   * @param {boolean} [immediate=false] - Whether or not to disable transitions while performing the modification.
   * @param {number} [timeout] - The safety timeout for any transitions triggered by the modification.
   * @returns {Promise} Resolved once the modification is complete.
   */


  _t.modify = function ($element, callback, immediate, timeout) {
    if (immediate) {
      _t.disable($element, callback);

      return _fn.resolved;
    }

    return _t.start($element, callback, false, timeout);
  };

  _a.nextFrame = function (callback, thisArg) {
    if (!_is.fn(callback)) return _fn.rejectWith('Provided callback is not a function.');
    thisArg = _is.undef(thisArg) ? callback : thisArg;
    return $.Deferred(function (def) {
      _a.requestFrame(function () {
        try {
          callback.call(thisArg);
          def.resolve();
        } catch (err) {
          def.rejectWith(err);
        }
      });
    }).promise();
  };
})(FooBar.$, FooBar, FooBar.utils, FooBar.utils.is, FooBar.utils.fn, FooBar.utils.str, FooBar.utils.obj, FooBar.utils.transition, FooBar.utils.animation);
"use strict";

(function ($, _, _is, _fn, _obj) {
  /**
   * @summary A registry class allowing classes to be easily registered and created.
   * @memberof FooBar.utils.
   * @class ClassRegistry
   * @param {FooBar.utils.ClassRegistry~Options} [options] - The options for the registry.
   * @augments FooBar.utils.Class
   * @borrows FooBar.utils.Class.extend as extend
   * @borrows FooBar.utils.Class.override as override
   * @borrows FooBar.utils.Class.bases as bases
   */
  _.ClassRegistry = _.Class.extend(
  /** @lends FooBar.utils.ClassRegistry.prototype */
  {
    /**
     * @ignore
     * @constructs
     * @param {FooBar.utils.ClassRegistry~Options} [options] - The options for the registry.
     */
    construct: function construct(options) {
      var self = this;
      /**
       * @summary The options for the registry.
       * @typedef {?Object} FooBar.utils.ClassRegistry~Options
       * @property {boolean} [allowBase] - Whether or not to allow base classes to be created. Base classes are registered with a priority below 0.
       */

      /**
       * @summary The options for this instance.
       * @memberof FooBar.utils.ClassRegistry#
       * @name opt
       * @type {FooBar.utils.ClassRegistry~Options}
       */

      self.opt = _obj.extend({
        allowBase: true
      }, options);
      /**
       * @summary An object detailing a registered class.
       * @typedef {?Object} FooBar.utils.ClassRegistry~RegisteredClass
       * @property {string} name - The name of the class.
       * @property {function:FooBar.utils.Class} ctor - The class constructor.
       * @property {string} selector - The CSS selector for the class.
       * @property {Object} config - The configuration object for the class providing default values that can be overridden at runtime.
       * @property {number} priority - This determines the index for the class when using the {@link FooBar.utils.ClassRegistry#find|find} method, a higher value equals a lower index.
       */

      /**
       * @summary An object containing all registered classes.
       * @memberof FooBar.utils.ClassRegistry#
       * @name registered
       * @type {Object.<string, FooBar.utils.ClassRegistry~RegisteredClass>}
       * @readonly
       * @example {@caption The following shows the structure of this object. The `<name>` placeholders would be the name the class was registered with.}
       * {
       * 	"<name>": {
       * 		"name": <string>,
       * 		"ctor": <function>,
       * 		"selector": <string>,
       * 		"config": <object>,
       * 		"priority": <number>
       * 	},
       * 	"<name>": {
       * 		"name": <string>,
       * 		"ctor": <function>,
       * 		"selector": <string>,
       * 		"config": <object>,
       * 		"priority": <number>
       * 	},
       * 	...
       * }
       */

      self.registered = {};
    },

    /**
     * @summary The callback function for the {@link FooBar.utils.ClassRegistry#each|each} method.
     * @callback FooBar.utils.ClassRegistry~eachCallback
     * @param {FooBar.utils.ClassRegistry~RegisteredClass} registered - The current registered class being iterated over.
     * @returns {(boolean|undefined)} Return `false` to break out of the loop, all other values are ignored.
     */

    /**
     * @summary Iterates over all registered classes executing the provided callback once per class.
     * @param {FooBar.utils.ClassRegistry~eachCallback} callback - The callback to execute for each registered class.
     * @param {boolean} [prioritize=false] - Whether or not the registered classes should be prioritized before iteration.
     * @param {*} [thisArg] - The value of `this` within the callback.
     */
    each: function each(callback, prioritize, thisArg) {
      prioritize = _is.boolean(prioritize) ? prioritize : false;
      var self = this,
          names = Object.keys(self.registered),
          registered = names.map(function (name) {
        return self.registered[name];
      });

      if (prioritize) {
        registered.sort(function (a, b) {
          return b.priority - a.priority;
        });
      }

      var i = 0,
          l = registered.length;

      for (; i < l; i++) {
        var result = callback.call(thisArg, registered[i]);
        if (result === false) break;
      }
    },

    /**
     * @summary The callback function for the {@link FooBar.utils.ClassRegistry#find|find} method.
     * @callback FooBar.utils.ClassRegistry~findCallback
     * @param {FooBar.utils.ClassRegistry~RegisteredClass} registered - The current registered class being iterated over.
     * @returns {boolean} `true` to return the current registered class.
     */

    /**
     * @summary Iterates through all registered classes until the supplied `callback` returns a truthy value.
     * @param {FooBar.utils.ClassRegistry~findCallback} callback - The callback to execute for each registered class.
     * @param {boolean} [prioritize=false] - Whether or not the registered classes should be prioritized before iteration.
     * @param {*} [thisArg] - The value of `this` within the callback.
     * @returns {?FooBar.utils.ClassRegistry~RegisteredClass} `null` if no registered class satisfied the `callback`.
     */
    find: function find(callback, prioritize, thisArg) {
      prioritize = _is.boolean(prioritize) ? prioritize : false;
      var self = this,
          names = Object.keys(self.registered),
          registered = names.map(function (name) {
        return self.registered[name];
      });

      if (prioritize) {
        registered.sort(function (a, b) {
          return b.priority - a.priority;
        });
      }

      var i = 0,
          l = registered.length;

      for (; i < l; i++) {
        if (callback.call(thisArg, registered[i])) {
          return registered[i];
        }
      }

      return null;
    },

    /**
     * @summary Register a class constructor with the provided `name`.
     * @memberof FooBar.utils.ClassRegistry#
     * @function register
     * @param {string} name - The name of the class.
     * @param {function:FooBar.utils.Class} klass - The class constructor to register.
     * @param {Object} [config] - The configuration object for the class providing default values that can be overridden at runtime.
     * @param {number} [priority=0] - This determines the index for the class when using the {@link FooBar.utils.ClassRegistry#find|find} method, a higher value equals a lower index.
     * @returns {boolean} Returns `true` if the class was successfully registered.
     */
    register: function register(name, klass, config, priority) {
      var self = this;

      if (_is.string(name) && !_is.empty(name) && _is.fn(klass)) {
        priority = _is.number(priority) ? priority : 0;
        var current = self.registered[name];
        self.registered[name] = {
          name: name,
          ctor: klass,
          config: _is.hash(config) ? config : {},
          priority: !_is.undef(current) ? current.priority : priority
        };
        return true;
      }

      return false;
    },

    /**
     * @summary Create a new instance of a registered class by `name`.
     * @memberof FooBar.utils.ClassRegistry#
     * @function create
     * @param {string} name - The name of the class to create.
     * @param {Object} [config] - Any custom configuration to supply to the class.
     * @param {...*} [argN] - Any number of additional arguments to pass to the class constructor.
     * @returns {?FooBar.utils.Class} Returns `null` if no registered class can handle the supplied `element`.
     */
    create: function create(name, config, argN) {
      var self = this,
          args = _fn.arg2arr(arguments);

      name = args.shift();

      if (_is.string(name) && self.registered.hasOwnProperty(name)) {
        var registered = self.registered[name];
        var allowed = true;
        if (registered.priority < 0 && !self.opt.allowBase) allowed = false;

        if (allowed && _is.fn(registered.ctor)) {
          config = args.shift(); // get a merged user supplied config including any options supplied using data attributes

          config = self.mergeConfigurations(registered.name, config);
          args.unshift.apply(args, [registered.name, config]);
          return _fn.apply(registered.ctor, args);
        }
      }

      return null;
    },

    /**
     * @summary Get the merged configuration for a class.
     * @memberof FooBar.utils.ClassRegistry#
     * @function mergeConfigurations
     * @param {string} name - The name of the class to get the config for.
     * @param {Object} [config] - The user supplied defaults to override.
     * @returns {Object}
     */
    mergeConfigurations: function mergeConfigurations(name, config) {
      var self = this;

      if (_is.string(name) && self.registered.hasOwnProperty(name)) {
        // check params
        config = _is.hash(config) ? config : {};
        var baseClasses = self.getBaseClasses(name),
            eArgs = [{}];
        baseClasses.push(self.registered[name]);
        baseClasses.forEach(function (reg) {
          eArgs.push(reg.config);
        });
        eArgs.push(config);
        return _obj.extend.apply(_obj, eArgs);
      }

      return {};
    },

    /**
     * @summary Gets the registered base class for this instance.
     * @memberof FooBar.utils.ClassRegistry#
     * @function getBaseClass
     * @returns {?FooBar.utils.ClassRegistry~RegisteredClass}
     */
    getBaseClass: function getBaseClass() {
      return this.find(function (registered) {
        return registered.priority < 0;
      }, true);
    },

    /**
     * @summary Get all registered base classes for the supplied `name`.
     * @memberof FooBar.utils.ClassRegistry#
     * @function getBaseClasses
     * @param {string} name - The name of the class to get the bases for.
     * @returns {FooBar.utils.ClassRegistry~RegisteredClass[]}
     */
    getBaseClasses: function getBaseClasses(name) {
      var self = this,
          reg = self.registered[name],
          result = [];

      if (!_is.undef(reg)) {
        reg.ctor.bases().forEach(function (base) {
          var found = self.fromType(base);

          if (_is.hash(found)) {
            result.push(found);
          }
        });
      }

      return result;
    },

    /**
     * @summary Attempts to find a registered class given the type/constructor.
     * @memberof FooBar.utils.ClassRegistry#
     * @function fromType
     * @param {function:FooBar.utils.Class} type - The type/constructor of the registered class to find.
     * @returns {(FooBar.utils.ClassRegistry~RegisteredClass|undefined)} Returns the registered class if found. Otherwise, `undefined` is returned.
     */
    fromType: function fromType(type) {
      if (!_is.fn(type)) return;
      return this.find(function (registered) {
        return registered.ctor === type;
      });
    }
  });
})(FooBar.utils.$, FooBar.utils, FooBar.utils.is, FooBar.utils.fn, FooBar.utils.obj);
"use strict";

(function ($, _, _is, _fn, _obj, _str) {
  /**
   * @summary The base component class used by the plugin to provide advanced functionality to an `element`.
   * @memberof FooBar.utils.
   * @class Component
   * @param {string} name - The name of the component.
   * @param {(jQuery|Element)} element - The element the component is being created for.
   * @param {FooBar.utils.Component~Configuration} [config] - The configuration object for the component.
   * @param {FooBar.utils.Component} [parent] - The parent component for this component.
   * @augments FooBar.utils.EventClass
   * @borrows FooBar.utils.Class.extend as extend
   * @borrows FooBar.utils.Class.override as override
   * @borrows FooBar.utils.Class.bases as bases
   */
  _.Component = _.EventClass.extend(
  /** @lends FooBar.utils.Component.prototype */
  {
    /**
     * @ignore
     * @constructs
     * @param {string} name - The name of the component.
     * @param {(jQuery|Element)} element - The element the component is being created for.
     * @param {FooBar.utils.Component~Configuration} [config] - The configuration object for the component.
     * @param {FooBar.utils.Component} [parent] - The parent component for this component.
     */
    construct: function construct(name, element, config, parent) {
      var self = this;

      self._super();
      /**
       * @summary The default configuration object used by all components.
       * @typedef {?Object} FooBar.utils.Component~Configuration
       * @property {FooBar.utils.Component~Options} [options] - An object containing any options for a component.
       * @property {Object} [i18n] - An object containing any i18n strings for a component.
       * @property {Object} [classes] - An object containing any CSS classes for a component.
       */

      /**
       * @summary The default options object used by all components.
       * @typedef {?Object} FooBar.utils.Component~Options
       * @property {boolean} [domEvents=false] - Whether or not this component should also trigger events on its DOM {@link FooBar.utils.Component#el|element}.
       * @property {boolean} [bubbleEvents=true] - Whether or not this component should bubble events.
       */

      /**
       * @summary The name of this component.
       * @memberof FooBar.utils.Component#
       * @name name
       * @type {string}
       */


      self.name = name;
      if (!_is.string(self.name)) throw "Invalid argument `name`.";
      /**
       * @summary The jQuery wrapper for this components primary element.
       * @memberof FooBar.utils.Component#
       * @name $el
       * @type {jQuery}
       */

      self.$el = _is.jq(element) ? element : $(element);
      if (self.$el.length === 0) throw "Invalid argument `element`.";
      /**
       * @summary This components primary element.
       * @memberof FooBar.utils.Component#
       * @name el
       * @type {Element}
       */

      self.el = self.$el.get(0);
      /**
       * @summary The parent component for this component.
       * @memberof FooBar.utils.Component#
       * @name parent
       * @type {?FooBar.utils.Component}
       */

      self.parent = parent instanceof _.Component ? parent : null;
      /**
       * @summary The raw configuration object as it was supplied to this components constructor.
       * @memberof FooBar.utils.Component#
       * @name raw
       * @type {FooBar.utils.Component~Configuration}
       */

      self.raw = _is.hash(config) ? config : {};
      /**
       * @summary The options for this component.
       * @memberof FooBar.utils.Component#
       * @name opt
       * @type {FooBar.utils.Component~Options}
       */

      self.opt = _obj.extend({
        domEvents: false,
        bubbleEvents: true
      }, self.raw.options);
      /**
       * @summary The i18n strings for this component.
       * @memberof FooBar.utils.Component#
       * @name i18n
       * @type {Object}
       */

      self.i18n = _is.hash(self.raw.i18n) ? self.raw.i18n : {};
      /**
       * @summary The CSS classes for this component.
       * @memberof FooBar.utils.Component#
       * @name cls
       * @type {Object}
       */

      self.cls = _is.hash(self.raw.classes) ? self.raw.classes : {};
      /**
       * @summary The CSS selectors for this component.
       * @memberof FooBar.utils.Component#
       * @name sel
       * @type {Object}
       */

      self.sel = _is.hash(self.raw.classes) ? _.selectify(self.raw.classes) : {};
      /**
       * @summary The Promise object returned from the {@link FooBar.utils.Component#init|init} method.
       * @memberof FooBar.utils.Component#
       * @name __initialize
       * @type {?Promise}
       * @private
       */

      self.__initialize = null;
      /**
       * @summary Whether or not this component is being initialized.
       * @memberof FooBar.utils.Component#
       * @name isInitializing
       * @type {boolean}
       */

      self.isInitializing = false;
      /**
       * @summary Whether or not this component has been initialized.
       * @memberof FooBar.utils.Component#
       * @name isInitialized
       * @type {boolean}
       */

      self.isInitialized = false;
      /**
       * @summary Whether or not this component is being destroyed.
       * @memberof FooBar.utils.Component#
       * @name isDestroying
       * @type {boolean}
       */

      self.isDestroying = false;
      /**
       * @summary Whether or not this component has been destroyed.
       * @memberof FooBar.utils.Component#
       * @name isDestroyed
       * @type {boolean}
       */

      self.isDestroyed = false;
    },

    /**
     * @summary Merges the supplied config into the component updating various properties.
     * @memberof FooBar.utils.Component#
     * @function configure
     * @param {FooBar.utils.Component~Configuration} config - The configuration object to merge.
     */
    configure: function configure(config) {
      if (!_is.hash(config)) return;
      var self = this;

      _obj.merge(self.raw, config);

      if (_is.hash(config.options)) _obj.merge(self.opt, config.options);
      if (_is.hash(config.i18n)) _obj.merge(self.i18n, config.i18n);

      if (_is.hash(config.classes)) {
        _obj.merge(self.cls, config.classes);

        self.sel = _.selectify(self.cls);
      }

      self.trigger("configure", [config]);
    },

    /**
     * @summary Initializes the component adding extra functionality to the {@link FooBar.utils.Component#$el|element}.
     * @memberof FooBar.utils.Component#
     * @function init
     * @returns {Promise}
     */
    init: function init() {
      var self = this;
      if (_is.promise(self.__initialize)) return self.__initialize;
      self.isInitializing = true;
      self.trigger("initializing");
      return self.__initialize = _fn.resolved.then(function () {
        self.trigger("before-setup");
        return self.beforeSetup();
      }).then(function () {
        self.trigger("setup");
        return self.setup();
      }).then(function () {
        self.trigger("after-setup");
        return self.afterSetup();
      }).then(function () {
        self.isInitializing = false;
        self.isInitialized = true;
        self.trigger("initialized");
      }, function (err) {
        self.isInitializing = false;
        self.isInitialized = false;
        self.trigger("setup-error", err);
      });
    },

    /**
     * @summary Used by subclasses to perform any internal work before the component setup is called.
     * @memberof FooBar.utils.Component#
     * @function beforeSetup
     * @returns {(Promise|void)}
     */
    beforeSetup: function beforeSetup() {},

    /**
     * @summary Used by subclasses to perform any additional setup the component requires.
     * @memberof FooBar.utils.Component#
     * @function setup
     * @returns {(Promise|void)}
     */
    setup: function setup() {},

    /**
     * @summary Used by subclasses to perform any internal work after the component setup is called.
     * @memberof FooBar.utils.Component#
     * @function afterSetup
     * @returns {(Promise|void)}
     */
    afterSetup: function afterSetup() {},

    /**
     * @summary Destroys the component removing any added functionality and returning the {@link FooBar.utils.Component#$el|element} to its original state.
     * @memberof FooBar.utils.Component#
     * @function destroy
     */
    destroy: function destroy() {
      var self = this;
      self.isDestroying = true;
      self.trigger("destroying");
      self.trigger("before-teardown");
      self.beforeTeardown();
      self.trigger("teardown");
      self.teardown();
      self.trigger("after-teardown");
      self.afterTeardown();
      self.__initialize = null;
      self.isInitialized = false;
      self.isDestroying = false;
      self.isDestroyed = true;
      self.trigger("destroyed");

      self._super();
    },

    /**
     * @summary Used by subclasses to perform any internal work before the component teardown is called.
     * @memberof FooBar.utils.Component#
     * @function beforeTeardown
     */
    beforeTeardown: function beforeTeardown() {},

    /**
     * @summary Used by subclasses to perform any additional teardown the component requires.
     * @memberof FooBar.utils.Component#
     * @function teardown
     */
    teardown: function teardown() {},

    /**
     * @summary Used by subclasses to perform any internal work after the component teardown is called.
     * @memberof FooBar.utils.Component#
     * @function afterTeardown
     */
    afterTeardown: function afterTeardown() {},

    /**
     * @summary Emits the supplied event on the current class.
     * @memberof FooBar.utils.Component#
     * @function emit
     * @param {FooBar.utils.Event} event - The event object to emit.
     * @param {Array} [args] - An array of additional arguments to supply to the listener after the event object.
     */
    emit: function emit(event, args) {
      var self = this;

      if (event instanceof _.Event) {
        var bubbled = event.target !== null && event.target !== self;

        if (!bubbled || bubbled && self.opt.bubbleEvents) {
          self._super(event, args);

          if (self.opt.domEvents) {
            var eventName = event.type;
            if (_is.string(event.namespace)) eventName += "." + event.namespace;
            self.$el.trigger(eventName, args);
          }
        }

        if (self.opt.bubbleEvents && self.parent instanceof _.Component) {
          self.parent.emit(event, args);
        }
      }
    }
  });
})(FooBar.utils.$, FooBar.utils, FooBar.utils.is, FooBar.utils.fn, FooBar.utils.obj, FooBar.utils.str);
"use strict";

(function ($, _, _is, _fn, _obj) {
  /**
   * @summary A registry class allowing components to be easily registered and created.
   * @memberof FooBar.utils.
   * @class ComponentRegistry
   * @param {FooBar.utils.ComponentRegistry~Options} [options] - The options for the registry.
   * @augments FooBar.utils.Class
   * @borrows FooBar.utils.Class.extend as extend
   * @borrows FooBar.utils.Class.override as override
   * @borrows FooBar.utils.Class.bases as bases
   */
  _.ComponentRegistry = _.Class.extend(
  /** @lends FooBar.utils.ComponentRegistry.prototype */
  {
    /**
     * @ignore
     * @constructs
     * @param {FooBar.utils.ComponentRegistry~Options} [options] - The options for the registry.
     */
    construct: function construct(options) {
      var self = this;
      /**
       * @summary The options for the registry.
       * @typedef {?Object} FooBar.utils.ComponentRegistry~Options
       * @property {boolean} [allowBase] - Whether or not to allow base components to be created. Base components are registered with a priority below 0.
       */

      /**
       * @summary The options for this instance.
       * @memberof FooBar.utils.ComponentRegistry#
       * @name opt
       * @type {FooBar.utils.ComponentRegistry~Options}
       */

      self.opt = _obj.extend({
        allowBase: true
      }, options);
      /**
       * @summary An object detailing a registered component.
       * @typedef {?Object} FooBar.utils.ComponentRegistry~RegisteredComponent
       * @property {string} name - The name of the component.
       * @property {FooBar.utils.Component} ctor - The component constructor.
       * @property {string} selector - The CSS selector for the component.
       * @property {FooBar.utils.Component~Configuration} config - The configuration object for the component providing default values that can be overridden at runtime.
       * @property {number} priority - This determines the index for the component when using the {@link FooBar.utils.ComponentRegistry#find|find} method, a higher value equals a lower index.
       */

      /**
       * @summary An object containing all registered components.
       * @memberof FooBar.utils.ComponentRegistry#
       * @name registered
       * @type {Object.<string, FooBar.utils.ComponentRegistry~RegisteredComponent>}
       * @readonly
       * @example {@caption The following shows the structure of this object. The `<name>` placeholders would be the name the component was registered with.}
       * {
       * 	"<name>": {
       * 		"name": <string>,
       * 		"ctor": <function>,
       * 		"selector": <string>,
       * 		"config": <object>,
       * 		"priority": <number>
       * 	},
       * 	"<name>": {
       * 		"name": <string>,
       * 		"ctor": <function>,
       * 		"selector": <string>,
       * 		"config": <object>,
       * 		"priority": <number>
       * 	},
       * 	...
       * }
       */

      self.registered = {};
    },

    /**
     * @summary The callback function for the {@link FooBar.utils.ComponentRegistry#each|each} method.
     * @callback FooBar.utils.ComponentRegistry~eachCallback
     * @param {FooBar.utils.ComponentRegistry~RegisteredComponent} registered - The current registered component being iterated over.
     * @returns {(boolean|undefined)} Return `false` to break out of the loop, all other values are ignored.
     */

    /**
     * @summary Iterates over all registered components executing the provided callback once per component.
     * @param {FooBar.utils.ComponentRegistry~eachCallback} callback - The callback to execute for each registered component.
     * @param {boolean} [prioritize=false] - Whether or not the registered components should be prioritized before iteration.
     * @param {*} [thisArg] - The value of `this` within the callback.
     */
    each: function each(callback, prioritize, thisArg) {
      prioritize = _is.boolean(prioritize) ? prioritize : false;
      var self = this,
          names = Object.keys(self.registered),
          registered = names.map(function (name) {
        return self.registered[name];
      });

      if (prioritize) {
        registered.sort(function (a, b) {
          return b.priority - a.priority;
        });
      }

      var i = 0,
          l = registered.length;

      for (; i < l; i++) {
        var result = callback.call(thisArg, registered[i]);
        if (result === false) break;
      }
    },

    /**
     * @summary The callback function for the {@link FooBar.utils.ComponentRegistry#find|find} method.
     * @callback FooBar.utils.ComponentRegistry~findCallback
     * @param {FooBar.utils.ComponentRegistry~RegisteredComponent} registered - The current registered component being iterated over.
     * @returns {boolean} `true` to return the current registered component.
     */

    /**
     * @summary Iterates through all registered components until the supplied `callback` returns a truthy value.
     * @param {FooBar.utils.ComponentRegistry~findCallback} callback - The callback to execute for each registered component.
     * @param {boolean} [prioritize=false] - Whether or not the registered components should be prioritized before iteration.
     * @param {*} [thisArg] - The value of `this` within the callback.
     * @returns {?FooBar.utils.ComponentRegistry~RegisteredComponent} `null` if no registered component satisfied the `callback`.
     */
    find: function find(callback, prioritize, thisArg) {
      prioritize = _is.boolean(prioritize) ? prioritize : false;
      var self = this,
          names = Object.keys(self.registered),
          registered = names.map(function (name) {
        return self.registered[name];
      });

      if (prioritize) {
        registered.sort(function (a, b) {
          return b.priority - a.priority;
        });
      }

      var i = 0,
          l = registered.length;

      for (; i < l; i++) {
        if (callback.call(thisArg, registered[i])) {
          return registered[i];
        }
      }

      return null;
    },

    /**
     * @summary Register a component constructor with the provided `name`.
     * @memberof FooBar.utils.ComponentRegistry#
     * @function register
     * @param {string} name - The name of the component.
     * @param {FooBar.utils.Component} component - The component constructor to register.
     * @param {string} selector - The CSS selector string used to determine whether a component handles an element.
     * @param {FooBar.utils.Component~Configuration} [config] - The configuration object for the component providing default values that can be overridden at runtime.
     * @param {number} [priority=0] - This determines the index for the component when using the {@link FooBar.utils.ComponentRegistry#find|find} method, a higher value equals a lower index.
     * @returns {boolean} Returns `true` if the component was successfully registered.
     */
    register: function register(name, component, selector, config, priority) {
      var self = this;

      if (_is.string(name) && !_is.empty(name) && _is.fn(component) && _is.string(selector)) {
        priority = _is.number(priority) ? priority : 0;
        var current = self.registered[name];
        self.registered[name] = {
          name: name,
          ctor: component,
          selector: selector,
          config: _is.hash(config) ? config : {},
          priority: !_is.undef(current) ? current.priority : priority
        };
        return true;
      }

      return false;
    },

    /**
     * @summary Create a new instance of a registered component by inspecting the supplied `element`.
     * @memberof FooBar.utils.ComponentRegistry#
     * @function create
     * @param {(jQuery|Element)} element - The element to create a new component for.
     * @param {FooBar.utils.Component~Configuration} [config] - Any custom configuration to supply to the component.
     * @param {FooBar.utils.Component} [parent] - The parent component for the new component.
     * @param {...*} [argN] - Any number of additional arguments to pass to the component constructor.
     * @returns {?FooBar.utils.Component} Returns `null` if no registered component can handle the supplied `element`.
     */
    create: function create(element, config, parent, argN) {
      var self = this,
          args = _fn.arg2arr(arguments);

      element = args.shift();
      var registered = self.fromElement(element);

      if (registered !== null) {
        var allowed = true;
        if (registered.priority < 0 && !self.opt.allowBase) allowed = false;

        if (allowed && _is.fn(registered.ctor)) {
          config = args.shift();
          parent = args.shift(); // get a merged user supplied config including any options supplied using data attributes

          config = self.mergeConfigurations(registered.name, config, element, parent);
          args.unshift.apply(args, [registered.name, element, config, parent]);
          return _fn.apply(registered.ctor, args);
        }
      }

      return null;
    },

    /**
     * @summary Create new instances of all registered components found within the provided `root` element.
     * @memberof FooBar.utils.ComponentRegistry#
     * @function createAll
     * @param {(jQuery|element)} root - The element to search for components.
     * @param {FooBar.utils.Component~Configuration} [config] - Any custom configuration to supply to the components.
     * @param {FooBar.utils.Component} [parent] - The parent component for new components.
     * @param {...*} [argN] - Any number of additional arguments to pass to the component constructors.
     * @returns {Array.<FooBar.utils.Component>} Returns an array of all created components.
     */
    createAll: function createAll(root, config, parent, argN) {
      var self = this,
          args = _fn.arg2arr(arguments),
          result = [];

      root = args.shift();
      root = _is.jq(root) ? root : $(root);

      if (root.length > 0) {
        var selectors = [],
            registeredBase = self.getBaseComponent();

        if (registeredBase !== null) {
          selectors.push(registeredBase.selector);
        } else {
          self.each(function (registered) {
            selectors.push(registered.selector);
          }, true);
        }

        root.find(selectors.join(",")).each(function (i, element) {
          var cArgs = args.slice();
          cArgs.unshift(element);
          var component = self.create.apply(self, cArgs);

          if (component instanceof _.Component) {
            result.push(component);
          }
        });
      }

      return result;
    },

    /**
     * @summary Get the merged configuration for a component including values supplied through data attributes.
     * @memberof FooBar.utils.ComponentRegistry#
     * @function mergeConfigurations
     * @param {string} name - The name of the component to get the config for.
     * @param {FooBar.utils.Component~Configuration} [config] - The user supplied defaults to override.
     * @param {(jQuery|Element)} [element] - The element to pull data attributes from.
     * @param {FooBar.utils.Component} [parent] - The parent component for the new component.
     * @returns {FooBar.utils.Component~Configuration}
     */
    mergeConfigurations: function mergeConfigurations(name, config, element, parent) {
      var self = this;

      if (_is.string(name) && self.registered.hasOwnProperty(name)) {
        // check params
        config = _is.hash(config) ? config : {};
        element = _is.jq(element) ? element : $(element); // if supplied a parent merge its configuration for the component into the provided config

        if (parent instanceof _.Component && _is.hash(parent.raw[name])) {
          config = _obj.extend({}, config, parent.raw[name]);
        } // if we have a valid element merge any data attributes into the provided config


        if (element.length > 0) {
          config = _obj.extend({}, config, element.data());
        }

        var baseComponents = self.getBaseComponents(name),
            eArgs = [{}];
        baseComponents.push(self.registered[name]);
        baseComponents.forEach(function (reg) {
          eArgs.push(reg.config);
        });
        eArgs.push(config);
        return _obj.extend.apply(_obj, eArgs);
      }

      return {};
    },

    /**
     * @summary Gets the registered base component for this instance.
     * @memberof FooBar.utils.ComponentRegistry#
     * @function getBaseComponent
     * @returns {?FooBar.utils.ComponentRegistry~RegisteredComponent}
     */
    getBaseComponent: function getBaseComponent() {
      return this.find(function (registered) {
        return registered.priority < 0;
      }, true);
    },

    /**
     * @summary Get all registered base components for the supplied `name`.
     * @memberof FooBar.utils.ComponentRegistry#
     * @function getBaseComponents
     * @param {string} name - The name of the component to get the bases for.
     * @returns {FooBar.utils.ComponentRegistry~RegisteredComponent[]}
     */
    getBaseComponents: function getBaseComponents(name) {
      var self = this,
          reg = self.registered[name],
          result = [];

      if (!_is.undef(reg)) {
        reg.ctor.bases().forEach(function (base) {
          var found = self.fromType(base);

          if (_is.hash(found)) {
            result.push(found);
          }
        });
      }

      return result;
    },

    /**
     * @summary Attempts to find a registered component given the type/constructor.
     * @memberof FooBar.utils.ComponentRegistry#
     * @function fromType
     * @param {FooBar.utils.Component} type - The type/constructor of the registered component to find.
     * @returns {(FooBar.utils.ComponentRegistry~RegisteredComponent|undefined)} Returns the registered component if found. Otherwise, `undefined` is returned.
     */
    fromType: function fromType(type) {
      if (!_is.fn(type)) return;
      return this.find(function (registered) {
        return registered.ctor === type;
      });
    },

    /**
     * @summary Attempts to find a registered component that can handle the provided element.
     * @memberof FooBar.utils.ComponentRegistry#
     * @function fromElement
     * @param {(jQuery|Element)} element - The jQuery wrapper around an element or the actual element itself.
     * @returns {(FooBar.utils.ComponentRegistry~RegisteredComponent|undefined)} Returns the registered component if found. Otherwise, `undefined` is returned.
     */
    fromElement: function fromElement(element) {
      element = _is.jq(element) ? element : $(element);
      if (element.length === 0) return;
      return this.find(function (registered) {
        return element.is(registered.selector);
      }, true);
    }
  });
})(FooBar.utils.$, FooBar.utils, FooBar.utils.is, FooBar.utils.fn, FooBar.utils.obj);
"use strict";

(function ($, _, _is, _fn, _obj) {
  /**
   * @summary A parent component that manages all child components found within its element.
   * @memberof FooBar.utils.
   * @class ParentComponent
   * @param {string} name - The name of the component.
   * @param {(jQuery|HTMLElement)} element - The root element to manage.
   * @param {FooBar.utils.ParentComponent~Configuration} config - The configuration for the component.
   * @param {FooBar.utils.ParentComponent} parent - The parent component for this component.
   * @param {FooBar.utils.ComponentRegistry} childRegistry - The child component registry used to created child components.
   * @augments FooBar.utils.Component
   * @borrows FooBar.utils.Class.extend as extend
   * @borrows FooBar.utils.Class.override as override
   * @borrows FooBar.utils.Class.bases as bases
   */
  _.ParentComponent = _.Component.extend(
  /** @lends FooBar.utils.ParentComponent.prototype */
  {
    /**
     * @ignore
     * @constructs
     * @param {string} name - The name of the component.
     * @param {(jQuery|HTMLElement)} element - The root element to manage.
     * @param {FooBar.utils.ParentComponent~Configuration} config - The configuration for the component.
     * @param {FooBar.utils.Component} parent - The parent component for this component.
     * @param {FooBar.utils.ComponentRegistry} childRegistry - The child component registry used to created child components.
     */
    construct: function construct(name, element, config, parent, childRegistry) {
      var self = this; // call the base FooBar.utils.Component#construct method

      self._super(name, element, config, parent);
      /**
       * @summary The configuration object for a parent component.
       * @typedef {FooBar.utils.Component~Configuration} FooBar.utils.ParentComponent~Configuration
       * @property {FooBar.utils.Component~Configuration} [defaults] - An object containing a default configuration shared by all child components created by this parent.
       */

      /**
       * @summary The raw configuration object for this instance.
       * @memberof FooBar.ParentComponent#
       * @name raw
       * @type {FooBar.utils.ParentComponent~Configuration}
       */

      /**
       * @summary The registry of child components for this instance.
       * @memberof FooBar.utils.ParentComponent#
       * @name childRegistry
       * @type {FooBar.utils.ComponentRegistry}
       */


      self.childRegistry = childRegistry;
      var registeredBase = childRegistry.getBaseComponent();
      /**
       * @summary The base component type for all child components.
       * @memberof FooBar.utils.ParentComponent#
       * @name childComponentBase
       * @type {FooBar.utils.Component}
       */

      self.childComponentBase = registeredBase !== null ? registeredBase.ctor : _.Component;
      /**
       * @summary An array of all child components being managed.
       * @memberof FooBar.utils.ParentComponent#
       * @name children
       * @type {Array.<FooBar.utils.Component>}
       */

      self.children = [];
    },
    //region Internal Methods

    /**
     * @summary Create and then initialize all child components found within the {@link FooBar.utils.ParentComponent#el|element} before the {@link FooBar.utils.ParentComponent#setup|setup} method is called.
     * @memberof FooBar.utils.ParentComponent#
     * @function beforeSetup
     * @returns {Promise}
     */
    beforeSetup: function beforeSetup() {
      var self = this,
          wait = self.createChildren().map(function (child) {
        return child.init().fail(function () {
          child.destroy();
        });
      });
      return _fn.when(wait);
    },

    /**
     * @summary Destroy all managed components after calling the {@link FooBar.utils.ParentComponent#teardown|teardown} method.
     * @memberof FooBar.utils.ParentComponent#
     * @function afterTeardown
     */
    afterTeardown: function afterTeardown() {
      var self = this;
      self.children.slice().forEach(function (child) {
        child.destroy();
      });
    },
    //endregion

    /**
     * @summary Create a single component using the child registry and the provided element.
     * @memberof FooBar.utils.ParentComponent#
     * @function registryCreate
     * @param {(string|jQuery|Element)} element - The element to create a child component for.
     * @returns {?FooBar.utils.Component}
     */
    registryCreate: function registryCreate(element) {
      var self = this;
      return self.childRegistry.create(element, self.raw.defaults, self);
    },

    /**
     * @summary Create all child components found within the element using the child registry.
     * @memberof FooBar.utils.ParentComponent#
     * @function registryCreateAll
     * @returns {FooBar.utils.Component[]}
     */
    registryCreateAll: function registryCreateAll() {
      var self = this;
      return self.childRegistry.createAll(self.$el, self.raw.defaults, self);
    },

    /**
     * @summary Find a child component.
     * @memberof FooBar.utils.ParentComponent#
     * @function findChild
     * @param {function(FooBar.utils.Component):boolean} callback - The callback used to find the child.
     * @returns {(FooBar.utils.Component|undefined)} Returns the child component that satisfies the provided callback. Otherwise, `undefined` is returned.
     */
    findChild: function findChild(callback) {
      return _.find(this.children, callback);
    },

    /**
     * @summary Create a new instance of a child component from the provided element.
     * @memberof FooBar.utils.ParentComponent#
     * @function createChild
     * @param {(string|jQuery|Element)} element - A selector or element to create a child from. The element must exist within this parents {@link FooBar.utils.ParentComponent#el|element}.
     * @returns {?FooBar.utils.Component} Returns a new child component if created. Otherwise, `null` is returned.
     */
    createChild: function createChild(element) {
      var self = this;
      var $target = self.$el.find(element);

      if ($target.length > 0) {
        element = $target.get(0);
        var child = self.findChild(function (child) {
          return child.el === element;
        });

        if (child instanceof self.childComponentBase) {
          child.destroy();
        }

        child = self.registryCreate($target);

        if (child instanceof self.childComponentBase) {
          child.on({
            "initialized": self.onChildInitialized,
            "destroyed": self.onChildDestroyed
          }, self);
          return (
            /** @type {?FooBar.utils.Component} */
            child
          );
        }
      }

      return null;
    },

    /**
     * @summary Create new instances of all child components found within the {@link FooBar.utils.ParentComponent#el|element}.
     * @memberof FooBar.utils.ParentComponent#
     * @function createChildren
     * @returns {Array.<FooBar.utils.Component>}
     */
    createChildren: function createChildren() {
      var self = this;

      if (_is.array(self.children)) {
        self.children.slice().forEach(function (bar) {
          bar.destroy();
        });
      }

      var created = self.registryCreateAll();
      created.forEach(function (child) {
        child.on({
          "initialized": self.onChildInitialized,
          "destroyed": self.onChildDestroyed
        }, self);
      });
      return created;
    },
    //region Listeners

    /**
     * @summary Whenever a child component created by this parent is initialized this listener is called.
     * @memberof FooBar.utils.ParentComponent#
     * @function onChildInitialized
     * @param {FooBar.utils.Event} e - An object containing basic details about the event.
     * @description This listener adds any initialized child components to the {@link FooBar.utils.ParentComponent#children|children} array.
     */
    onChildInitialized: function onChildInitialized(e) {
      var self = this;

      if (e.target instanceof self.childComponentBase) {
        var index = self.children.indexOf(e.target);

        if (index === -1) {
          self.children.push(e.target);
        }
      }
    },

    /**
     * @summary Whenever a child component created by this parent is destroyed this listener is called.
     * @memberof FooBar.utils.ParentComponent#
     * @function onChildDestroyed
     * @param {FooBar.utils.Event} e - An object containing basic details about the event.
     * @description This listener performs cleanup of any attached events on destroyed child components and removes
     * them from the {@link FooBar.utils.ParentComponent#children|children} array.
     */
    onChildDestroyed: function onChildDestroyed(e) {
      var self = this;

      if (e.target instanceof self.childComponentBase) {
        e.target.off({
          "initialized": self.onChildInitialized,
          "destroyed": self.onChildDestroyed
        }, self);
        var index = self.children.indexOf(e.target);

        if (index !== -1) {
          self.children.splice(index, 1);
        }
      }
    } //endregion

  });
})(FooBar.utils.$, FooBar.utils, FooBar.utils.is, FooBar.utils.fn, FooBar.utils.obj);
"use strict";

(function ($, _, _fn, _obj) {
  /**
   * @summary A parent component that manages all child components found within its observed element.
   * @memberof FooBar.utils.
   * @class ObservedParentComponent
   * @param {string} name - The name of the component.
   * @param {(jQuery|HTMLElement)} element - The root element to manage.
   * @param {FooBar.utils.ParentComponent~Configuration} config - The configuration for the component.
   * @param {FooBar.utils.ParentComponent} parent - The parent component for this component.
   * @param {FooBar.utils.ComponentRegistry} childRegistry - The child component registry used to created child components.
   * @augments FooBar.utils.ParentComponent
   * @borrows FooBar.utils.Class.extend as extend
   * @borrows FooBar.utils.Class.override as override
   * @borrows FooBar.utils.Class.bases as bases
   */
  _.ObservedParentComponent = _.ParentComponent.extend(
  /** @lends FooBar.utils.ObservedParentComponent.prototype */
  {
    /**
     * @ignore
     * @constructs
     * @param {string} name - The name of the component.
     * @param {(jQuery|HTMLElement)} element - The root element to manage.
     * @param {FooBar.utils.ParentComponent~Configuration} config - The configuration for the component.
     * @param {FooBar.utils.ParentComponent} parent - The parent component for this component.
     * @param {FooBar.utils.ComponentRegistry} childRegistry - The child component registry used to created child components.
     */
    construct: function construct(name, element, config, parent, childRegistry) {
      var self = this;

      self._super(name, element, config, parent, childRegistry);
      /**
       * @summary The configuration object for an observed parent component.
       * @typedef {FooBar.utils.Component~Configuration} FooBar.utils.ObservedParentComponent~Configuration
       * @property {FooBar.utils.ObservedParentComponent~Options} [options] - The options for the observed parent component.
       * @property {FooBar.utils.Component~Configuration} [defaults] - An object containing a default configuration shared by all child components created by this parent.
       */

      /**
       * @summary The options object for an observed parent component.
       * @typedef {?Object} FooBar.utils.ObservedParentComponent~Options
       * @property {number} [observeThrottle=1000/60] - Limit observations to X milliseconds.
       */

      /**
       * @summary The raw configuration object as it was supplied to this components constructor.
       * @memberof FooBar.utils.ObservedParentComponent#
       * @name raw
       * @type {FooBar.utils.ObservedParentComponent~Configuration}
       */

      /**
       * @summary The options for this component.
       * @memberof FooBar.utils.ObservedParentComponent#
       * @name opt
       * @type {FooBar.utils.ObservedParentComponent~Options}
       */


      self.opt = _obj.merge({
        observeThrottle: 1000 / 60
      }, self.opt);
      /**
       * @summary The ResizeObserver used by this component to adapt to size changes.
       * @memberof FooBar.utils.ObservedParentComponent#
       * @name rObserver
       * @type {ResizeObserver}
       */

      self.rObserver = new ResizeObserver(_fn.throttle(self.onResizeObserved.bind(self), self.opt.observeThrottle));
      /**
       * @summary The MutationObserver used by this component to adapt to CSS class changes.
       * @memberof FooBar.utils.ObservedParentComponent#
       * @name mObserver
       * @type {MutationObserver}
       */

      self.mObserver = new MutationObserver(_fn.throttle(self.onMutationObserved.bind(self), self.opt.observeThrottle));
      /**
       * @summary Whether or not the component is currently observing its {@link FooBar.utils.ObservedParentComponent#el|element}.
       * @memberof FooBar.utils.ObservedParentComponent#
       * @name isObserved
       * @type {boolean}
       */

      self.isObserved = false;
    },

    /**
     * @summary Unobserve the component element before the teardown is called.
     * @memberof FooBar.utils.Component#
     * @function beforeTeardown
     */
    beforeTeardown: function beforeTeardown() {
      var self = this;
      self.unobserve();

      self._super();
    },

    /**
     * @summary Initiates the observing of the components {@link FooBar.utils.ObservedParentComponent#el|element}.
     * @memberof FooBar.utils.ObservedParentComponent#
     * @function observe
     */
    observe: function observe() {
      var self = this;

      if (self.isInitialized && self.el instanceof Node && !self.isObserved) {
        self.rObserver.observe(self.el);
        self.mObserver.observe(self.el, {
          attributes: true,
          attributeFilter: ["class"]
        });
        self.isObserved = true;
      }
    },

    /**
     * @summary Ends the observing of the components {@link FooBar.utils.ObservedParentComponent#el|element}.
     * @memberof FooBar.utils.ObservedParentComponent#
     * @function unobserve
     */
    unobserve: function unobserve() {
      var self = this;

      if (self.isInitialized && self.el instanceof Node && self.isObserved) {
        self.rObserver.disconnect();
        self.mObserver.disconnect();
        self.isObserved = false;
      }
    },

    /**
     * @summary Called whenever a size change has been observed.
     * @memberof FooBar.utils.ObservedParentComponent#
     * @function onSizeChange
     */
    onSizeChange: function onSizeChange() {},

    /**
     * @summary Called whenever a CSS class change has been observed.
     * @memberof FooBar.utils.ObservedParentComponent#
     * @function onClassChange
     */
    onClassChange: function onClassChange() {},
    //region Listeners

    /**
     * @summary The callback function for the ResizeObserver.
     * @memberof FooBar.utils.ObservedParentComponent#
     * @function onResizeObserved
     * @param entries
     */
    onResizeObserved: function onResizeObserved(entries) {
      var self = this; // there should only ever be a single entry as we only monitor the bar element
      // but just in case lets iterate the collection

      var resized = false;
      entries.forEach(function (entry) {
        if (!resized && entry.target.id === self.el.id) {
          resized = true;
          self.onSizeChange();
        }
      });
    },

    /**
     * @summary The callback function for the MutationObserver.
     * @memberof FooBar.utils.ObservedParentComponent#
     * @function onMutationObserved
     * @param mutations
     */
    onMutationObserved: function onMutationObserved(mutations) {
      var self = this; // even though we only watch a single element there can still be multiple mutations
      // and even though there should only be a single element being monitored we want to make
      // sure so lets iterate the collection

      var updated = false;
      mutations.forEach(function (mutation) {
        if (!updated && mutation.target.id === self.el.id) {
          updated = true;
          self.onClassChange();
        }
      });
    } //endregion

  });
})(FooBar.utils.$, FooBar.utils, FooBar.utils.fn, FooBar.utils.obj);
"use strict";

(function ($, _, _is, _obj) {
  /**
   * @summary Used to split all `symbol` elements from a single `svg` into multiple stand-alone `svg` elements.
   * @memberof FooBar.utils.
   * @class SVGSplitter
   * @param {FooBar.utils.SVGSplitter~Options} [options] - The options for the splitter.
   * @augments FooBar.utils.Class
   * @borrows FooBar.utils.Class.extend as extend
   * @borrows FooBar.utils.Class.override as override
   * @borrows FooBar.utils.Class.bases as bases
   */
  _.SVGSplitter = _.Class.extend(
  /** @lends FooBar.utils.SVGSplitter.prototype */
  {
    /**
     * @summary Performs the actual construction of a new instance of this class.
     * @memberof FooBar.utils.SVGSplitter#
     * @constructs
     * @param {FooBar.utils.SVGSplitter~Options} [options] - The options for the splitter.
     * @augments FooBar.utils.Class
     */
    construct: function construct(options) {
      var self = this;
      /**
       * @summary The options for the SVGSplitter class.
       * @typedef {Object} FooBar.utils.SVGSplitter~Options
       * @property {string} [xmlns="http://www.w3.org/2000/svg"] - The SVG XML namespace.
       * @property {string[]} [ignore] - An array of attribute names that will not be copied when splitting `symbol` elements into stand-alone `svg` elements.
       * @property {RegExp} [filterRegex] - The Regular Expression used to parse the target from a `filter` attribute.
       */

      /**
       * @summary The options for this instance of the splitter.
       * @memberof FooBar.utils.SVGSplitter#
       * @name opt
       * @type {FooBar.utils.SVGSplitter~Options}
       */

      self.opt = _obj.extend({
        xmlns: "http://www.w3.org/2000/svg",
        ignore: [],
        filterRegex: /^(?:url\(["']?)(#.*?)(?:["']?\))/
      }, options);
    },

    /**
     * @summary Get all attribute names from the supplied element.
     * @memberof FooBar.utils.SVGSplitter#
     * @function getAttributeNames
     * @param {Element} element - The element to retrieve all attribute names from.
     * @returns {string[]}
     */
    getAttributeNames: function getAttributeNames(element) {
      if (element instanceof Element) {
        if (element.getAttributeNames) return element.getAttributeNames();
        var attrs = Array.prototype.slice.call(element.attributes);
        return attrs.map(function (attr) {
          return attr.name;
        });
      }

      return [];
    },

    /**
     * @summary Copy all attributes from one element to another.
     * @memberof FooBar.utils.SVGSplitter#
     * @function copyAttributes
     * @param {Element} source - The element to copy attributes from.
     * @param {Element} target - The element to copy attributes to.
     * @param {string[]} [ignore] - An optional array of attributes names to ignore.
     */
    copyAttributes: function copyAttributes(source, target, ignore) {
      if (source instanceof Element && target instanceof Element) {
        ignore = _is.array(ignore) ? ignore : [];
        this.getAttributeNames(source).forEach(function (name) {
          if (ignore.indexOf(name) !== -1) return;
          target.setAttribute(name, source.getAttribute(name));
        });
      }
    },

    /**
     * @summary Get the `href` or `xlink:href` attribute from the supplied element.
     * @memberof FooBar.utils.SVGSplitter#
     * @function getHref
     * @param {SVGElement} element - The element to get the attribute from.
     * @returns {?string} `null` if the element is not an SVGElement or no attribute could be found.
     */
    getHref: function getHref(element) {
      if (element instanceof SVGElement) {
        if (element.hasAttribute("href")) return element.getAttribute("href");
        if (element.hasAttribute("xlink:href")) return element.getAttribute("xlink:href");
      }

      return null;
    },

    /**
     * @summary Get the target of the supplied <use> elements `href` or `xlink:href` attribute.
     * @memberof FooBar.utils.SVGSplitter#
     * @function getUseDef
     * @param {SVGUseElement} use - The <use> element to parse.
     * @returns {?Node}
     */
    getUseDef: function getUseDef(use) {
      if (use instanceof SVGUseElement) {
        var selector = this.getHref(use);

        if (_is.string(selector)) {
          var element = use.ownerSVGElement.querySelector(selector);

          if (element instanceof Element) {
            return element.cloneNode(true);
          }
        }
      }

      return null;
    },

    /**
     * @summary Get the target of the supplied elements `filter` attribute.
     * @memberof FooBar.utils.SVGSplitter#
     * @function getFilterDef
     * @param {SVGElement} element - The element to parse.
     * @returns {?Node}
     */
    getFilterDef: function getFilterDef(element) {
      if (element instanceof SVGElement) {
        var attr = element.getAttribute("filter");

        if (_is.string(attr)) {
          var match = attr.match(this.opt.filterRegex);

          if (match !== null && match.length === 2) {
            // fetch the filter from the parent
            var filter = element.ownerSVGElement.querySelector(match[1]);

            if (filter instanceof SVGFilterElement) {
              return filter.cloneNode(true);
            }
          }
        }
      }

      return null;
    },

    /**
     * @summary Get all defs used by the supplied `symbol` element.
     * @memberof FooBar.utils.SVGSplitter#
     * @function getDefs
     * @param {SVGSymbolElement} symbol - The `symbol` to parse.
     * @returns {Node[]}
     */
    getDefs: function getDefs(symbol) {
      var self = this,
          defs = [];

      if (symbol instanceof SVGSymbolElement) {
        var uses = symbol.querySelectorAll("use");

        for (var i = 0, l = uses.length; i < l; i++) {
          var found = self.getUseDef(uses[i]);

          if (found instanceof Node && defs.indexOf(found) === -1) {
            defs.push(found);
          }
        }

        var elements = symbol.querySelectorAll('[filter]');

        for (var _i = 0, _l = elements.length; _i < _l; _i++) {
          var filter = self.getFilterDef(elements[_i]);

          if (filter instanceof Node && defs.indexOf(filter) === -1) {
            defs.unshift(filter);
          }
        }
      }

      return defs;
    },

    /**
     * @summary Create a stand-alone `svg` from the supplied `symbol` element.
     * @memberof FooBar.utils.SVGSplitter#
     * @function createSVGElement
     * @param {SVGSymbolElement} symbol - The `symbol` to parse.
     * @returns {?Element}
     */
    createSVGElement: function createSVGElement(symbol) {
      var self = this;

      if (symbol instanceof SVGSymbolElement) {
        var svg = document.createElementNS(self.opt.xmlns, "svg");
        self.copyAttributes(symbol.ownerSVGElement, svg, self.opt.ignore);
        self.copyAttributes(symbol, svg, self.opt.ignore);
        var length = symbol.childNodes.length;

        for (var i = 0, node; i < length; i++) {
          node = symbol.childNodes[i];
          if (node.nodeType !== 1) continue;
          svg.appendChild(node.cloneNode(true));
        }

        var definitions = self.getDefs(symbol);

        if (definitions.length > 0) {
          var defs = svg.querySelector("defs");

          if (defs === null) {
            defs = document.createElementNS(self.opt.xmlns, "defs");
            svg.insertBefore(defs, svg.firstChild);
          }

          definitions.forEach(function (def) {
            defs.appendChild(def);
          });
        }

        return svg;
      }

      return null;
    },

    /**
     * @summary Parse the supplied `svg` element and split out all `symbol` elements with an ID into there own `svg` element.
     * @memberof FooBar.utils.SVGSplitter#
     * @function parse
     * @param {SVGSVGElement} svg - The `svg` element to parse.
     * @returns {Object<string, SVGSVGElement>}
     */
    parse: function parse(svg) {
      var self = this,
          result = {};

      if (svg instanceof SVGSVGElement) {
        var symbols = svg.querySelectorAll("symbol[id]");

        for (var i = 0, l = symbols.length; i < l; i++) {
          if (symbols[i].id === "") continue;
          var created = self.createSVGElement(symbols[i]);

          if (created instanceof SVGSVGElement) {
            result[symbols[i].id] = created;
          }
        }
      }

      return result;
    }
  });
})(FooBar.utils.$, FooBar.utils, FooBar.utils.is, FooBar.utils.obj);
"use strict";

(function ($, _, _is, _obj, _str) {
  /**
   * @summary An SVG registry that provides CSS stylable stand-alone `svg` icons generated from SVG sprites.
   * @memberof FooBar.utils.
   * @class SVGRegistry
   * @param {FooBar.utils.SVGRegistry~Options} options - The options for the manager.
   * @augments FooBar.utils.Class
   * @borrows FooBar.utils.Class.extend as extend
   * @borrows FooBar.utils.Class.override as override
   * @borrows FooBar.utils.Class.bases as bases
   */
  _.SVGRegistry = _.Class.extend(
  /** @lends FooBar.utils.SVGRegistry.prototype */
  {
    /**
     * @ignore
     * @constructs
     * @param {FooBar.utils.SVGRegistry~Options} options - The options for the manager.
     */
    construct: function construct(options) {
      var self = this;
      /**
       * @summary The options for the SVGRegistry class.
       * @typedef {?Object} FooBar.utils.SVGRegistry~Options
       * @property {?string} [id=null] - The default id used to register additional `svg` elements from the page.
       * @property {string} [iconClass=""] - The CSS class to add to every icon. This is also used as a prefix when generating a unique CSS class for an icon based off its <symbol> id.
       * @property {FooBar.utils.SVGSplitter~Options} [splitter={ignore:["id","class"]}] - The options supplied to the SVG splitter used by the manager.
       */

      /**
       * @summary The options for this instance of the manager.
       * @memberof FooBar.utils.SVGRegistry#
       * @name opt
       * @type {FooBar.utils.SVGRegistry~Options}
       */

      self.opt = _obj.extend({
        id: null,
        iconClass: "",
        splitter: {
          ignore: ["id", "class"]
        }
      }, options);
      /**
       * @summary An object containing all registered icons.
       * @memberof FooBar.utils.SVGRegistry#
       * @name registered
       * @type {Object<string, Object<string, SVGSVGElement>>}
       */

      self.registered = {
        defaults: {}
      };
      /**
       * @summary The SVG splitter used to separate sprites into stand-alone `svg` elements.
       * @memberof FooBar.utils.SVGRegistry#
       * @name splitter
       * @type {FooBar.SVGSplitter}
       */

      self.splitter = new _.SVGSplitter(self.opt.splitter);
    },

    /**
     * @summary Initializes the manager registering any `svg` elements found in the page using the `id` option.
     * @memberof FooBar.utils.SVGRegistry#
     * @function init
     */
    init: function init() {
      var self = this;

      if (_is.string(self.opt.id) && self.opt.id.length > 0) {
        $("svg[id|='" + self.opt.id + "']").each(function (i, svg) {
          if (svg.id === self.opt.id) {
            self.register("defaults", svg);
          } else if (svg.id.length > self.opt.id.length) {
            // if we're here that means the id begins with "foobar-icons-" so trim it to get the name
            var name = svg.id.splice(0, self.opt.id.length + 1);
            self.register(name, svg);
          }
        });
      }
    },

    /**
     * @summary Register an `svg` with the provided `name`.
     * @memberof FooBar.utils.SVGRegistry#
     * @function register
     * @param {string} name - The name for the `svg`, if it already exists any differences will be merged.
     * @param {(string|jQuery|SVGSVGElement)} svg - The SVG to register.
     * @returns {boolean}
     */
    register: function register(name, svg) {
      if (_is.string(name)) {
        var self = this,
            $svg = $(svg);

        if ($svg.length === 1 && $svg.is("svg")) {
          var icons = self.splitter.parse($svg.get(0)),
              current = self.registered[name];
          self.registered[name] = _obj.extend({}, self.registered.defaults, current, icons);
          return true;
        }
      }

      return false;
    },

    /**
     * @summary Check if the provided icon exists.
     * @memberof FooBar.utils.SVGRegistry#
     * @function exists
     * @param {string} iconName - The name of the icon to check for.
     * @param {string} [svgName="defaults"] - The registered SVG to check for the icon.
     * @returns {boolean}
     */
    exists: function exists(iconName, svgName) {
      var self = this; // have to provide at least an icon name to check

      if (_is.string(iconName)) {
        var icons = _is.string(svgName) && self.registered.hasOwnProperty(svgName) ? self.registered[svgName] : null;

        if (icons === null || !icons.hasOwnProperty(iconName)) {
          icons = self.registered.defaults;
        }

        return icons[iconName] instanceof SVGSVGElement;
      }

      return false;
    },

    /**
     * @summary Get an icon.
     * @memberof FooBar.utils.SVGRegistry#
     * @function get
     * @param {string} iconName - The name of the icon to get.
     * @param {string} [svgName="defaults"] - The SVG to retrieve the icon from.
     * @param {string[]} [classes] - Any additional CSS classes to add to the returned icon.
     * @returns {?Node}
     */
    get: function get(iconName, svgName, classes) {
      var self = this; // have to provide at least the icon name to try fetch something

      if (_is.string(iconName)) {
        var icons = _is.string(svgName) && self.registered.hasOwnProperty(svgName) ? self.registered[svgName] : null;

        if (icons === null || !icons.hasOwnProperty(iconName)) {
          icons = self.registered.defaults;
        }

        if (icons[iconName] instanceof Element) {
          // 2 default CSS classes: fbr-icon fbr-icon-ICON_NAME
          var classNames = [self.opt.iconClass, self.opt.iconClass + "-" + iconName];

          if (_is.array(classes)) {
            // merge any additional CSS classes
            classes.forEach(function (className) {
              // only merge if string and unique
              if (_is.string(className) && classNames.indexOf(className) === -1) {
                classNames.push(className);
              }
            });
          } // here we make a clone of the registered icon so that it is not modified


          var clone = icons[iconName].cloneNode(true);
          clone.setAttribute("class", classNames.join(" "));
          return clone;
        }
      }

      return null;
    },

    /**
     * @summary Get all icons for the provided SVG name.
     * @memberof FooBar.utils.SVGRegistry#
     * @function all
     * @param {string} [svgName="defaults"] - The name of the SVG to retrieve icons from.
     * @param {string[]} [classes] - Any additional CSS classes to add to the returned icons.
     * @returns {Object<string, Node>} An array of all icons for the provided `svgName`.
     */
    all: function all(svgName, classes) {
      var self = this,
          all = {};
      var icons = _is.string(svgName) && self.registered.hasOwnProperty(svgName) ? self.registered[svgName] : self.registered.defaults;
      Object.keys(icons).forEach(function (key) {
        all[key] = self.get(key, svgName, classes);
      });
      return all;
    }
  });
})(FooBar.utils.$, FooBar.utils, FooBar.utils.is, FooBar.utils.obj, FooBar.utils.str);
"use strict";

(function ($, _, _utils, _is, _fn, _obj) {
  /**
   * @summary A registry class allowing components to be easily registered and created.
   * @memberof FooBar.
   * @class ToggleRuleRegistry
   * @param {FooBar.utils.ClassRegistry~Options} [options] - The options for the registry.
   * @augments FooBar.utils.ClassRegistry
   * @borrows FooBar.utils.Class.extend as extend
   * @borrows FooBar.utils.Class.override as override
   * @borrows FooBar.utils.Class.bases as bases
   */
  _.ToggleRuleRegistry = _utils.ClassRegistry.extend(
  /** @lends FooBar.ToggleRuleRegistry.prototype */
  {
    /**
     * @ignore
     * @constructs
     * @param {FooBar.utils.ClassRegistry~Options} [options] - The options for the registry.
     */
    construct: function construct(options) {
      var self = this; // call the super while supplying our own default value

      self._super(_obj.merge({
        allowBase: false
      }, options));
    },
    prioritize: function prioritize(options) {
      var self = this,
          names = Object.keys(self.registered),
          registered = names.map(function (name) {
        return self.registered[name];
      });
      registered.sort(function (a, b) {
        return b.priority - a.priority;
      });
      var optionsMap = options.reduce(function (map, option) {
        if (_is.hash(option) && _is.string(option.name)) {
          map[option.name] = option;
        }

        return map;
      }, {});
      var result = [];
      registered.forEach(function (reg) {
        if (optionsMap.hasOwnProperty(reg.name)) {
          result.push(optionsMap[reg.name]);
        }
      });
      return result;
    },

    /**
     * @summary Create an array of all rules from the provided option.
     * @param {*} option - The option to create the rules from.
     * @param {*} [argN] - Any additional arguments to supply to the rule constructor after the name and configuration.
     * @returns {FooBar.ToggleRule[]}
     */
    fromOption: function fromOption(option, argN) {
      var self = this,
          args = _fn.arg2arr(arguments);

      option = args.shift();
      var options = _is.hash(option) ? [option] : _is.array(option) ? option : [],
          prioritized = self.prioritize(options);
      return prioritized.reduce(function (result, opt) {
        var ruleArgs = args.slice();
        ruleArgs.unshift(opt);
        ruleArgs.unshift(opt.name);
        var rule = self.create.apply(self, ruleArgs);
        if (rule !== null) result.push(rule);
        return result;
      }, []);
    },

    /**
     *
     * @param {FooBar.ToggleRule[]} openRules
     * @param {FooBar.ToggleRule[]} closeRules
     */
    beforeInitialized: function beforeInitialized(openRules, closeRules) {
      if (_is.array(openRules) && _is.array(closeRules)) {
        var wait = closeRules.concat(openRules).filter(function (rule) {
          return !rule.cfg.allowTransition;
        }).map(function (rule) {
          var result = rule.init();

          if (_is.promise(result)) {
            return result.fail(function () {
              rule.destroy();
            });
          }

          return null;
        });
        return _fn.when(wait);
      }

      return _fn.resolved;
    },
    afterInitialized: function afterInitialized(openRules, closeRules) {
      if (_is.array(openRules) && _is.array(closeRules)) {
        var wait = closeRules.concat(openRules).filter(function (rule) {
          return rule.cfg.allowTransition;
        }).map(function (rule) {
          var result = rule.init();

          if (_is.promise(result)) {
            return result.fail(function () {
              rule.destroy();
            });
          }

          return null;
        });
        return _fn.when(wait);
      }

      return _fn.resolved;
    },
    teardownRules: function teardownRules(openRules, closeRules) {
      if (_is.array(openRules) && _is.array(closeRules)) {
        openRules.concat(closeRules).forEach(function (rule) {
          rule.destroy();
        });
      }
    },
    setOpenRulesState: function setOpenRulesState(parent, state, rules) {
      var self = this;
      if (state === null || ['open', 'closed'].indexOf(state) === -1) return rules;

      var immediate = _utils.find(rules, function (rule) {
        return rule.name === 'immediate';
      });

      var transition = _utils.find(rules, function (rule) {
        return rule.name === 'transition';
      });

      if (state === 'open') {
        // the bar should start in an open state
        // there is already a rule configured to open the bar on page load so exit early
        if (immediate instanceof _.ToggleRule || transition instanceof _.ToggleRule) {
          return rules;
        } // if we're here then we need to add in a rule to open the bar


        var rule = self.create('immediate', {}, parent, 'open');

        if (rule instanceof _.ToggleRule) {
          rules.unshift(rule);
        }
      } else if (state === 'closed') {
        // the bar should start in a closed state
        var index = -1;

        if (immediate instanceof _.ToggleRule) {
          index = rules.indexOf(immediate);
          if (index !== -1) rules.splice(index, 1);
        }

        if (transition instanceof _.ToggleRule) {
          index = rules.indexOf(transition);
          if (index !== -1) rules.splice(index, 1);
        }
      }

      return rules;
    },
    setCloseRulesState: function setCloseRulesState(parent, state, rules) {
      var self = this;

      var immediate = _utils.find(rules, function (rule) {
        return rule.name === 'immediate';
      });

      var transition = _utils.find(rules, function (rule) {
        return rule.name === 'transition';
      });

      if (state === 'open') {
        // the bar should start in an open state
        var index = -1; // if a rule to close the bar immediately exists remove it

        if (immediate instanceof _.ToggleRule) {
          index = rules.indexOf(immediate);
          if (index !== -1) rules.splice(index, 1);
        } // if a rule to close the bar with transition exists remove it


        if (transition instanceof _.ToggleRule) {
          index = rules.indexOf(transition);
          if (index !== -1) rules.splice(index, 1);
        }
      } else if (state === 'closed') {
        // the bar should start in a closed state
        // there is already a rule configured to close the bar
        if (immediate instanceof _.ToggleRule || transition instanceof _.ToggleRule) {
          return rules;
        } // if we're here then we need to add in a rule to close the bar


        var rule = self.create('immediate', {}, parent, 'close');

        if (rule instanceof _.ToggleRule) {
          rules.unshift(rule);
        }
      }

      return rules;
    }
  });
})(FooBar.$, FooBar, FooBar.utils, FooBar.utils.is, FooBar.utils.fn, FooBar.utils.obj);
"use strict";

(function ($, _, _utils) {
  /**
   * @summary Icon registry for FooBar.
   * @memberof FooBar.
   * @name icons
   * @type {FooBar.utils.SVGRegistry}
   */
  _.icons = new _utils.SVGRegistry({
    id: "foobar-icons",
    iconClass: "fbr-icon"
  });
  /**
   * @summary Toggle rules registry for FooBar.
   * @memberof FooBar.
   * @name toggleRules
   * @type {FooBar.ToggleRuleRegistry}
   */

  _.toggleRules = new _.ToggleRuleRegistry();
  /**
   * @summary Bar registry for FooBar.
   * @memberof FooBar.
   * @name bars
   * @type {FooBar.utils.ComponentRegistry}
   */

  _.bars = new _utils.ComponentRegistry();
  /**
   * @summary Item registry for FooBar.
   * @memberof FooBar.
   * @name items
   * @type {FooBar.utils.ComponentRegistry}
   */

  _.items = new _utils.ComponentRegistry();
})(FooBar.$, FooBar, FooBar.utils);
"use strict";

(function (_icons) {
  var defaults = "<svg xmlns=\"http://www.w3.org/2000/svg\">\n\t<defs>\n\t\t<symbol id=\"plus\" viewBox=\"0 0 16 16\">\n\t\t\t<path d=\"M15 7h-6v-6h-2v6h-6v2h6v6h2v-6h6z\"></path>\n\t\t</symbol>\n\t\t<symbol id=\"plus2\" viewBox=\"0 0 16 16\">\n\t\t\t<path d=\"M15.5 6h-5.5v-5.5c0-0.276-0.224-0.5-0.5-0.5h-3c-0.276 0-0.5 0.224-0.5 0.5v5.5h-5.5c-0.276 0-0.5 0.224-0.5 0.5v3c0 0.276 0.224 0.5 0.5 0.5h5.5v5.5c0 0.276 0.224 0.5 0.5 0.5h3c0.276 0 0.5-0.224 0.5-0.5v-5.5h5.5c0.276 0 0.5-0.224 0.5-0.5v-3c0-0.276-0.224-0.5-0.5-0.5z\"></path>\n\t\t</symbol>\n\t\t<symbol id=\"plus3\" viewBox=\"0 0 16 16\">\n\t\t\t<path d=\"M16 5h-5v-5h-6v5h-5v6h5v5h6v-5h5z\"></path>\n\t\t</symbol>\n\t\t<symbol id=\"minus\" viewBox=\"0 0 16 16\">\n\t\t\t<path d=\"M1 7h14v2h-14v-2z\"></path>\n\t\t</symbol>\n\t\t<symbol id=\"minus2\" viewBox=\"0 0 16 16\">\n\t\t\t<path d=\"M0 6.5v3c0 0.276 0.224 0.5 0.5 0.5h15c0.276 0 0.5-0.224 0.5-0.5v-3c0-0.276-0.224-0.5-0.5-0.5h-15c-0.276 0-0.5 0.224-0.5 0.5z\"></path>\n\t\t</symbol>\n\t\t<symbol id=\"minus3\" viewBox=\"0 0 16 16\">\n\t\t\t<path d=\"M0 5h16v6h-16z\"></path>\n\t\t</symbol>\n\t\t<symbol id=\"cross\" viewBox=\"0 0 16 16\">\n\t\t\t<path d=\"M12.207 10.793l-1.414 1.414-2.793-2.793-2.793 2.793-1.414-1.414 2.793-2.793-2.793-2.793 1.414-1.414 2.793 2.793 2.793-2.793 1.414 1.414-2.793 2.793 2.793 2.793z\"></path>\n\t\t</symbol>\n\t\t<symbol id=\"cross2\" viewBox=\"0 0 16 16\">\n\t\t\t<path d=\"M13.957 3.457l-1.414-1.414-4.543 4.543-4.543-4.543-1.414 1.414 4.543 4.543-4.543 4.543 1.414 1.414 4.543-4.543 4.543 4.543 1.414-1.414-4.543-4.543z\"></path>\n\t\t</symbol>\n\t\t<symbol id=\"cross3\" viewBox=\"0 0 16 16\">\n\t\t\t<path d=\"M15.854 12.854c-0-0-0-0-0-0l-4.854-4.854 4.854-4.854c0-0 0-0 0-0 0.052-0.052 0.090-0.113 0.114-0.178 0.066-0.178 0.028-0.386-0.114-0.529l-2.293-2.293c-0.143-0.143-0.351-0.181-0.529-0.114-0.065 0.024-0.126 0.062-0.178 0.114 0 0-0 0-0 0l-4.854 4.854-4.854-4.854c-0-0-0-0-0-0-0.052-0.052-0.113-0.090-0.178-0.114-0.178-0.066-0.386-0.029-0.529 0.114l-2.293 2.293c-0.143 0.143-0.181 0.351-0.114 0.529 0.024 0.065 0.062 0.126 0.114 0.178 0 0 0 0 0 0l4.854 4.854-4.854 4.854c-0 0-0 0-0 0-0.052 0.052-0.090 0.113-0.114 0.178-0.066 0.178-0.029 0.386 0.114 0.529l2.293 2.293c0.143 0.143 0.351 0.181 0.529 0.114 0.065-0.024 0.126-0.062 0.178-0.114 0-0 0-0 0-0l4.854-4.854 4.854 4.854c0 0 0 0 0 0 0.052 0.052 0.113 0.090 0.178 0.114 0.178 0.066 0.386 0.029 0.529-0.114l2.293-2.293c0.143-0.143 0.181-0.351 0.114-0.529-0.024-0.065-0.062-0.126-0.114-0.178z\"></path>\n\t\t</symbol>\n\t\t<symbol id=\"arrow-up\" viewBox=\"0 0 16 16\">\n\t\t\t<path d=\"M0 10.5l1 1 7-7 7 7 1-1-8-8-8 8z\"></path>\n\t\t</symbol>\n\t\t<symbol id=\"arrow-up2\" viewBox=\"0 0 16 16\">\n\t\t\t<path d=\"M0 10.5l2 2 6-6 6 6 2-2-8-8-8 8z\"></path>\n\t\t</symbol>\n\t\t<symbol id=\"arrow-up3\" viewBox=\"0 0 16 16\">\n\t\t\t<path d=\"M0 10.5l3 3 5-5 5 5 3-3-8-8z\"></path>\n\t\t</symbol>\n\t\t<symbol id=\"arrow-right\" viewBox=\"0 0 16 16\">\n\t\t\t<path d=\"M5.5 0l-1 1 7 7-7 7 1 1 8-8-8-8z\"></path>\n\t\t</symbol>\n\t\t<symbol id=\"arrow-right2\" viewBox=\"0 0 16 16\">\n\t\t\t<path d=\"M5.5 0l-2 2 6 6-6 6 2 2 8-8-8-8z\"></path>\n\t\t</symbol>\n\t\t<symbol id=\"arrow-right3\" viewBox=\"0 0 16 16\">\n\t\t\t<path d=\"M5.5 0l-3 3 5 5-5 5 3 3 8-8z\"></path>\n\t\t</symbol>\n\t\t<symbol id=\"arrow-down\" viewBox=\"0 0 16 16\">\n\t\t\t<path d=\"M16 5.5l-1-1-7 7-7-7-1 1 8 8 8-8z\"></path>\n\t\t</symbol>\n\t\t<symbol id=\"arrow-down2\" viewBox=\"0 0 16 16\">\n\t\t\t<path d=\"M16 5.5l-2-2-6 6-6-6-2 2 8 8 8-8z\"></path>\n\t\t</symbol>\n\t\t<symbol id=\"arrow-down3\" viewBox=\"0 0 16 16\">\n\t\t\t<path d=\"M16 5.5l-3-3-5 5-5-5-3 3 8 8z\"></path>\n\t\t</symbol>\n\t\t<symbol id=\"arrow-left\" viewBox=\"0 0 16 16\">\n\t\t\t<path d=\"M10.5 16l1-1-7-7 7-7-1-1-8 8 8 8z\"></path>\n\t\t</symbol>\n\t\t<symbol id=\"arrow-left2\" viewBox=\"0 0 16 16\">\n\t\t\t<path d=\"M10.5 16l2-2-6-6 6-6-2-2-8 8 8 8z\"></path>\n\t\t</symbol>\n\t\t<symbol id=\"arrow-left3\" viewBox=\"0 0 16 16\">\n\t\t\t<path d=\"M10.5 16l3-3-5-5 5-5-3-3-8 8z\"></path>\n\t\t</symbol>\n\t\t<symbol id=\"spinner\" viewBox=\"0 0 16 16\">\n\t\t\t<path d=\"M8 16c-2.137 0-4.146-0.832-5.657-2.343s-2.343-3.52-2.343-5.657c0-1.513 0.425-2.986 1.228-4.261 0.781-1.239 1.885-2.24 3.193-2.895l0.672 1.341c-1.063 0.533-1.961 1.347-2.596 2.354-0.652 1.034-0.997 2.231-0.997 3.461 0 3.584 2.916 6.5 6.5 6.5s6.5-2.916 6.5-6.5c0-1.23-0.345-2.426-0.997-3.461-0.635-1.008-1.533-1.822-2.596-2.354l0.672-1.341c1.308 0.655 2.412 1.656 3.193 2.895 0.803 1.274 1.228 2.748 1.228 4.261 0 2.137-0.832 4.146-2.343 5.657s-3.52 2.343-5.657 2.343z\"></path>\n\t\t</symbol>\n\t</defs>\n</svg>";

  _icons.register("defaults", defaults);
})(FooBar.icons);
"use strict";

(function ($, _, _utils, _is, _fn, _obj) {
  /**
   * @summary A single instance class that manages all FooBars within the supplied root element.
   * @memberof FooBar.
   * @class Plugin
   * @param {(jQuery|HTMLElement)} element - The root element the instance will manage.
   * @param {FooBar.Plugin~Configuration} config - The configuration object for the instance.
   * @augments FooBar.utils.ParentComponent
   * @borrows FooBar.utils.Class.extend as extend
   * @borrows FooBar.utils.Class.override as override
   * @borrows FooBar.utils.Class.bases as bases
   */
  _.Plugin = _utils.ParentComponent.extend(
  /** @lends FooBar.Plugin.prototype */
  {
    /**
     * @ignore
     * @constructs
     * @param {(jQuery|HTMLElement)} element - The root element the instance will manage.
     * @param {FooBar.Plugin~Configuration} config - The configuration object for the instance.
     */
    construct: function construct(element, config) {
      var self = this; // call the base FooBar.utils.ParentComponent#construct method

      self._super("foobar", element, config, null, _.bars);
      /**
       * @summary The bar manager configuration object.
       * @typedef {FooBar.utils.ParentComponent~Configuration} FooBar.Plugin~Configuration
       */

      /**
       * @summary The raw configuration object for this instance.
       * @memberof FooBar.Plugin#
       * @name raw
       * @type {FooBar.Plugin~Configuration}
       */

      /**
       * @summary An array of all bar components managed by this instance.
       * @memberof FooBar.Plugin#
       * @name children
       * @type {Array.<FooBar.Bar>}
       */

      /**
       * @summary The state stored in local storage for the plugin.
       * @memberof FooBar.Plugin#
       * @name stored
       * @type {Object.<string, string>}
       */


      self.stored = JSON.parse(localStorage.getItem(self.name)) || {};
      /**
       * @summary Whether or not the plugin is bound to the document element.
       * @memberof FooBar.Plugin#
       * @name isDocumentElement
       * @type {boolean}
       */

      self.isDocumentElement = self.el === document.documentElement;
      /**
       * @summary The jQuery window object for the plugin.
       * @memberof FooBar.Plugin#
       * @name $window
       * @type {jQuery}
       */

      self.$window = $(window);
      /**
       * @summary The jQuery scroll parent object for the plugin.
       * @memberof FooBar.Plugin#
       * @name $scrollParent
       * @type {jQuery}
       */

      self.$scrollParent = self.isDocumentElement ? self.$window : self.$el;
      /**
       * @summary The jQuery viewport object for the plugin.
       * @memberof FooBar.Plugin#
       * @name $viewport
       * @type {jQuery}
       */

      self.$viewport = self.isDocumentElement ? $(document) : self.$el;
      /**
       * @summary Contains the original offsets for the element being managed by this instance of the plugin.
       * @memberof FooBar.Plugin#
       * @name offsets
       * @type {{top: number, left: number, bottom: number, right: number}}
       */

      self.offsets = {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0
      };
      self.screenLG = window.matchMedia("(max-width: 960px)");
      self.screenMD = window.matchMedia("(max-width: 782px)");
      self.screenSM = window.matchMedia("(max-width: 600px)");
      self.screenXS = window.matchMedia("(max-width: 480px)");
      self.isWPToolbar = self.$el.hasClass('wp-toolbar');
      self.useWPBody = false;
      /**
       * @summary The type of offset being used, either padding or margin.
       * @memberof FooBar.Plugin#
       * @name offsetType
       * @type {string}
       */

      self.offsetType = self.isWPToolbar ? 'padding' : 'margin';
      self.$offsetRoot = self.$el;
      self.offsetRoot = self.$offsetRoot.get(0);
      self.onScreenChange = self.onScreenChange.bind(self);
    },
    shouldUseWPBody: function shouldUseWPBody() {
      var self = this;
      return self.isWPToolbar && (self.screenSM.matches || self.screenXS.matches) && self.$el.find('#wpbody').length > 0;
    },
    parseOffsets: function parseOffsets(reset) {
      var self = this,
          style = getComputedStyle(self.offsetRoot),
          result = Object.keys(self.offsets).reduce(function (result, prop) {
        var propName = self.offsetType + '-' + prop,
            propValue = parseInt(style.getPropertyValue(propName)) || 0;
        result[prop] = {
          name: propName,
          value: propValue
        };
        if (reset) self.offsetRoot.style.removeProperty(propName);
        return result;
      }, {});
      if (reset) self.offsetRoot.offsetHeight;
      return result;
    },
    onScreenChange: function onScreenChange(e) {
      var self = this,
          props = Object.keys(self.offsets);
      self.offsetRoot.style.setProperty('transition', 'none', 'important');
      var changed = false,
          current = self.parseOffsets(true);
      var shouldUseWPBody = self.shouldUseWPBody();

      if (self.useWPBody !== shouldUseWPBody) {
        self.useWPBody = shouldUseWPBody;
        self.offsetRoot.style.removeProperty('transition');
        self.$offsetRoot = self.useWPBody ? self.$el.find('#wpbody') : self.$el;
        self.offsetRoot = self.$offsetRoot.get(0);
        self.offsetRoot.style.setProperty('transition', 'none', 'important');
        self.offsetRoot.offsetHeight;
        current = self.parseOffsets(true);
        changed = true;
      }

      var parsed = self.parseOffsets();
      props.forEach(function (prop) {
        if (current[prop].value > 0 && current[prop].value !== parsed[prop].value) {
          self.offsetRoot.style.setProperty(current[prop].name, current[prop].value + 'px', 'important');
        }
      });
      self.offsetRoot.offsetHeight;
      self.offsetRoot.style.removeProperty('transition'); // finally check if any offsets changed

      props.forEach(function (prop) {
        if (self.offsets[prop].value !== parsed[prop].value) {
          changed = true;
        }
      }); // if they have then set the current object values and raise an event

      if (changed) {
        var old = self.offsets;
        self.offsets = parsed;
        self.trigger('offset-change', [self.offsets, old]);
      }
    },
    beforeSetup: function beforeSetup() {
      var self = this;
      self.useWPBody = self.shouldUseWPBody();
      self.$offsetRoot = self.useWPBody ? self.$el.find('#wpbody') : self.$el;
      self.offsetRoot = self.$offsetRoot.get(0);
      self.offsets = self.parseOffsets();
      self.screenLG.addListener(self.onScreenChange);
      self.screenMD.addListener(self.onScreenChange);
      self.screenSM.addListener(self.onScreenChange);
      self.screenXS.addListener(self.onScreenChange);
      self.$window.on("beforeunload", {
        self: self
      }, self.onBeforeUnload);
      return self._super();
    },
    afterTeardown: function afterTeardown() {
      var self = this;
      self.screenLG.removeListener(self.onScreenChange);
      self.screenMD.removeListener(self.onScreenChange);
      self.screenSM.removeListener(self.onScreenChange);
      self.screenXS.removeListener(self.onScreenChange);

      self._super();
    },

    /**
     * @summary Create a single bar using the child registry and the provided element.
     * @memberof FooBar.Plugin#
     * @function registryCreate
     * @param {(string|jQuery|Element)} element - The element to create a bar component for.
     * @returns {?FooBar.Bar}
     */
    registryCreate: function registryCreate(element) {
      var self = this;
      return (
        /** @type {?FooBar.Bar} */
        self.childRegistry.create(element, self.raw.defaults, self, _.items)
      );
    },

    /**
     * @summary Create all bar components found within the element using the child registry.
     * @memberof FooBar.Plugin#
     * @function registryCreateAll
     * @returns {FooBar.Bar[]}
     */
    registryCreateAll: function registryCreateAll() {
      var self = this;
      return (
        /** @type {FooBar.Bar[]} */
        self.childRegistry.createAll(self.$el, self.raw.defaults, self, _.items)
      );
    },
    observe: function observe() {
      this.children.forEach(function (child) {
        child.observe();
      });
    },
    unobserve: function unobserve() {
      this.children.forEach(function (child) {
        child.unobserve();
      });
    },
    state: function state(id, value) {
      var self = this;

      if (_is.string(id)) {
        if (_is.undef(value)) {
          return self.stored.hasOwnProperty(id) ? self.stored[id] : null;
        }

        self.stored[id] = value;
      }

      return self.stored;
    },
    forget: function forget(id) {
      var self = this;

      if (_is.string(id)) {
        if (self.stored.hasOwnProperty(id)) {
          delete self.stored[id];
        }
      } else {
        self.stored = {};
      }
    },
    store: function store() {
      var self = this;

      if (Object.keys(self.stored).length > 0) {
        localStorage.setItem(self.name, JSON.stringify(self.stored));
      } else {
        localStorage.removeItem(self.name);
      }
    },
    onBeforeUnload: function onBeforeUnload(e) {
      e.data.self.store();
    }
  });
})(FooBar.$, FooBar, FooBar.utils, FooBar.utils.is, FooBar.utils.fn, FooBar.utils.obj);
"use strict";

(function ($, _, _utils, _is, _fn, _obj, _str, _t, _a) {
  /**
   * @summary The base bar class providing the core functionality of FooBar.
   * @memberof FooBar.
   * @class Bar
   * @param {string} name - The name the bar was registered with.
   * @param {(jQuery|Element)} element - The element the bar is being created for.
   * @param {FooBar.Bar~Configuration} config - The configuration for the bar.
   * @param {FooBar.Plugin} plugin - The plugin for the bar.
   * @augments FooBar.utils.ObservedParentComponent
   * @borrows FooBar.utils.Class.extend as extend
   * @borrows FooBar.utils.Class.override as override
   * @borrows FooBar.utils.Class.bases as bases
   */
  _.Bar = _utils.ObservedParentComponent.extend(
  /** @lends FooBar.Bar.prototype */
  {
    /**
     * @ignore
     * @constructs
     * @param {string} name - The name the bar was registered with.
     * @param {(jQuery|Element)} element - The element the bar is being created for.
     * @param {FooBar.Bar~Configuration} config - The configuration for the bar.
     * @param {FooBar.Plugin} plugin - The plugin for the bar.
     * @param {FooBar.utils.ComponentRegistry} itemsRegistry - The registry containing all items for the bar.
     */
    construct: function construct(name, element, config, plugin, itemsRegistry) {
      var self = this; // call the base FooBar.utils.ObservedParentComponent#construct method

      self._super(name, element, config, plugin, itemsRegistry);
      /**
       * @summary A simple configuration object used by all bars.
       * @typedef {FooBar.utils.ObservedParentComponent~Configuration} FooBar.Bar~Configuration
       * @property {Object} [regex] - An object containing Regular Expressions used by the bar.
       */

      /**
       * @summary The raw configuration object as it was supplied to this bars constructor.
       * @memberof FooBar.Bar#
       * @name raw
       * @type {FooBar.Bar~Configuration}
       */

      /**
       * @summary The plugin controlling this bar.
       * @memberof FooBar.Bar#
       * @name parent
       * @type {FooBar.Plugin}
       */

      /**
       * @summary The Regular Expressions for this bar.
       * @memberof FooBar.Bar#
       * @name regex
       * @type {Object}
       */


      self.regex = _is.hash(self.raw.regex) ? self.raw.regex : {};
      /**
       * @summary The ID of this bar.
       * @memberof FooBar.Bar#
       * @name id
       * @type {string}
       */

      self.id = self.$el.prop("id");
      /**
       * @summary The layout used by this bar.
       * @memberof FooBar.Bar#
       * @name layout
       * @type {string}
       */

      self.layout = self.getCSSOption(self.regex.layout);
      /**
       * @summary The transition used by this bar.
       * @memberof FooBar.Bar#
       * @name transition
       * @type {string}
       */

      self.transition = self.getCSSOption(self.regex.transition);
      /**
       * @summary The item transition used by this bar.
       * @memberof FooBar.Bar#
       * @name itemTransition
       * @type {string}
       */

      self.itemTransition = self.getCSSOption(self.regex.itemTransition);
      /**
       * @summary Whether or not the bar is currently open.
       * @memberof FooBar.Bar#
       * @name isOpen
       * @type {boolean}
       */

      self.isOpen = self.$el.hasClass(self.cls.open);
      /**
       * @summary Whether or not the bar is using any toggle transitions.
       * @memberof FooBar.Bar#
       * @name hasTransition
       * @type {boolean}
       */

      self.hasTransition = !_is.empty(self.transition);
      /**
       * @summary Whether or not the bar is using any item transitions.
       * @memberof FooBar.Bar#
       * @name hasItemTransition
       * @type {boolean}
       */

      self.hasItemTransition = !_is.empty(self.itemTransition);
      /**
       * @summary The jQuery loader div element.
       * @memberof FooBar.Bar#
       * @name $loader
       * @type {jQuery}
       */

      self.$loader = $("<div/>", {
        "class": self.cls.loader
      });
      /**
       * @summary The jQuery inner div element.
       * @memberof FooBar.Bar#
       * @name $inner
       * @type {jQuery}
       */

      self.$inner = self.$el.find(self.sel.inner);
      /**
       * @summary The jQuery toggle button element.
       * @memberof FooBar.Bar#
       * @name $toggle
       * @type {jQuery}
       */

      self.$toggle = self.$el.find(self.sel.toggle);
      /**
       * @summary The jQuery content div element.
       * @memberof FooBar.Bar#
       * @name $content
       * @type {jQuery}
       */

      self.$content = self.$el.find(self.sel.content);
      /**
       * @summary The jQuery previous button element.
       * @memberof FooBar.Bar#
       * @name $prev
       * @type {jQuery}
       */

      self.$prev = self.$content.find(self.sel.prev);
      /**
       * @summary The jQuery next button element.
       * @memberof FooBar.Bar#
       * @name $next
       * @type {jQuery}
       */

      self.$next = self.$content.find(self.sel.next);
      /**
       * @summary The active item for this bar.
       * @memberof FooBar.Bar#
       * @name item
       * @type {?FooBar.Item}
       */

      self.item = null;
      /**
       * @summary The last recorded height of the bar.
       * @memberof FooBar.Bar#
       * @name lastHeight
       * @type {number}
       */

      self.lastHeight = 0;
      /**
       * @summary The last recorded width of the bar.
       * @memberof FooBar.Bar#
       * @name lastWidth
       * @type {number}
       */

      self.lastWidth = self.$el.width();
      /**
       * @summary The minimum height for the bar.
       * @memberof FooBar.Bar#
       * @name minHeight
       * @type {number}
       */

      self.minHeight = parseInt(self.$el.css('min-height')) || 0;
      /**
       * @summary The container for this bar.
       * @memberof FooBar.Bar#
       * @name ctnr
       * @type {FooBar.Container}
       */

      self.ctnr = new _.Container(self);
      /**
       * @summary An array of all open rules.
       * @memberof FooBar.Bar#
       * @name openRules
       * @type {FooBar.ToggleRule[]}
       */

      self.openRules = _.toggleRules.fromOption(self.opt.open, self, "open");
      /**
       * @summary An array of all close rules.
       * @memberof FooBar.Bar#
       * @name openRules
       * @type {FooBar.ToggleRule[]}
       */

      self.closeRules = _.toggleRules.fromOption(self.opt.close, self, "close");
      /**
       * @summary An array of all items for this bar.
       * @memberof FooBar.Bar#
       * @name children
       * @type {Array.<FooBar.Item>}
       */

      /**
       * @summary Find a child item.
       * @memberof FooBar.Bar#
       * @function findChild
       * @param {function(FooBar.Item):boolean} callback - The callback used to find the item.
       * @returns {(FooBar.Item|undefined)}
       */
    },
    //region Init Methods
    init: function init() {
      var self = this;
      return self._super().then(function () {
        return _a.nextFrame(function () {
          self.onSizeChange();
          self.observe();
        });
      });
    },
    beforeSetup: function beforeSetup() {
      var self = this; // the bar always starts in a closed state regardless of the CSS classes applied in the markup

      _t.disable(self.$el, function ($el) {
        $el.removeClass(self.cls.open).addClass(self.cls.closed);
      });

      return self._super().then(function () {
        if (self.children.length > 0) {
          var state = self.state();

          if (state === 'dismissed') {
            return _fn.rejectWith(self.i18n.dismissed);
          }

          self.openRules = _.toggleRules.setOpenRulesState(self, state, self.openRules);
          self.closeRules = _.toggleRules.setCloseRulesState(self, state, self.closeRules);
          self.ctnr.init();

          if (self.children.length > 1) {
            // if no prev or next button exists and there are multiple items then create and append them to the inner
            if (self.$prev.length === 0) self.$prev = $("<button/>", {
              "class": self.cls.prev,
              type: "button"
            }).prependTo(self.$content);
            if (self.$next.length === 0) self.$next = $("<button/>", {
              "class": self.cls.next,
              type: "button"
            }).appendTo(self.$content); // bind the various listeners and set the icons

            self.$prev.on("click.foobar", {
              self: self
            }, self.onPrevClick);
            self.$next.on("click.foobar", {
              self: self
            }, self.onNextClick);
          }

          self.$toggle.on("click.foobar", {
            self: self
          }, self.onToggleClick);
          self.$el.on("click.foobar", "[data-foobar-action]", {
            self: self
          }, self.onActionClick);
          self.icons(self.opt.icons, self.opt.svg);
          return;
        }

        return _fn.rejectWith(self.i18n.empty);
      });
    },
    afterSetup: function afterSetup() {
      var self = this;

      if (self.children.length > 0) {
        // toggle CSS class that indicates there are multiple items being displayed
        self.$el.toggleClass(self.cls.multiple, self.children.length > 1);
        self.item = self.findChild(function (item) {
          return item.isActive;
        }); // if no active item was found then set it to the first item

        if (!(self.item instanceof _.Item)) self.item = self.children[0];
        return self.item.active(true, null, true).then(function () {
          return self.height(self.item.lastContentHeight, true);
        }).then(function () {
          return _.toggleRules.beforeInitialized(self.openRules, self.closeRules);
        }).then(function () {
          return _t.modify(self.$el, function ($el) {
            $el.addClass(self.cls.initialized);
          }, !self.hasTransition, self.opt.transitionTimeout);
        }).then(function () {
          return _.toggleRules.afterInitialized(self.openRules, self.closeRules);
        });
      }

      return _fn.rejectWith(self.i18n.empty);
    },
    //endregion
    //region Destroy Methods
    beforeTeardown: function beforeTeardown() {
      var self = this;

      self._super();

      self.$el.removeClass(self.cls.initialized);
    },
    afterTeardown: function afterTeardown() {
      var self = this;

      self._super();

      self.ctnr.destroy();

      _.toggleRules.teardownRules(self.openRules, self.closeRules);

      self.$prev.off("click.foobar");
      self.$next.off("click.foobar");
      self.$toggle.off("click.foobar");
    },
    //endregion
    prev: function prev(immediate) {
      var self = this;

      if (self.children.length > 1) {
        var index = self.children.indexOf(self.item) - 1;
        if (index < 0) index = self.children.length - 1;
        var wait = [];
        wait.push(self.item.active(false, "prev", immediate));
        self.item = self.children[index];
        wait.push(self.item.active(true, "prev", immediate).then(function () {
          return self.height(self.item.lastContentHeight);
        }));
        return _fn.when(wait);
      }

      return _fn.resolved;
    },
    next: function next(immediate) {
      var self = this;

      if (self.children.length > 1) {
        var index = self.children.indexOf(self.item) + 1;
        if (index >= self.children.length) index = 0;
        var wait = [];
        wait.push(self.item.active(false, "next", immediate));
        self.item = self.children[index];
        wait.push(self.item.active(true, "next", immediate).then(function () {
          return self.height(self.item.lastContentHeight);
        }));
        return _fn.when(wait);
      }

      return _fn.resolved;
    },
    toggle: function toggle(state, immediate) {
      var self = this;

      if (!_is.boolean(state)) {
        state = !self.$el.hasClass(self.cls.open);
      }

      self.isOpen = state;
      self.ctnr.update(!self.hasTransition || immediate);
      self.parent.unobserve();
      return _t.modify(self.$el, function ($el) {
        $el.toggleClass(self.cls.open, state).toggleClass(self.cls.closed, !state);
      }, !self.hasTransition || immediate, self.opt.transitionTimeout).always(function () {
        self.parent.observe();
        self.state(self.isOpen ? 'open' : 'closed');
      });
    },
    dismiss: function dismiss(immediate) {
      var self = this;
      self.$el.addClass(self.cls.dismissed);
      return self.toggle(false, immediate).then(function () {
        self.destroy();
        self.$el.remove();
        self.state('dismissed');
      });
    },
    height: function height(value, immediate) {
      var self = this;

      if (_is.number(value)) {
        if (self.minHeight > 0 && value < self.minHeight) value = self.minHeight;
        if (self.lastHeight === value) return _fn.resolved;
        self.lastHeight = value;
        self.ctnr.update(!self.hasItemTransition || immediate);
        self.parent.unobserve();
        return _t.modify(self.$el, function ($el) {
          $el.css("height", value);
        }, !self.hasItemTransition || immediate, self.opt.transitionTimeout).always(function () {
          self.parent.observe();
        });
      }

      return self.$el.css("height");
    },
    width: function width() {
      var self = this;
      var inlineMax = self.$el.css('max-width');
      self.el.style.removeProperty('max-width');
      self.el.offsetWidth;
      var width = self.$el.width(),
          actualMax = self.$el.css('max-width');

      if (inlineMax !== actualMax) {
        self.$el.css('max-width');
      }

      self.el.offsetWidth;
      return width;
    },
    perform: function perform(action, immediate) {
      var self = this;

      switch (action) {
        case 'prev':
          return self.prev(immediate);

        case 'next':
          return self.next(immediate);

        case 'dismiss':
          return self.dismiss(immediate);

        case 'open':
          return self.toggle(true, immediate);

        case 'close':
          return self.toggle(false, immediate);

        case 'toggle':
          return self.toggle(null, immediate);

        default:
          return _fn.rejectWith(_str.format(self.i18n.unsupported, {
            action: action
          }));
      }
    },
    modify: function modify(doModifyCallback, immediate) {
      var self = this,
          wasObserved = self.isObserved;
      if (wasObserved) self.unobserve();
      return _t.modify(self.$el, doModifyCallback, immediate, self.opt.transitionTimeout).always(function () {
        if (wasObserved) self.observe();
      });
    },
    __$icons: function __$icons() {
      var self = this;
      return {
        expand: self.$toggle,
        collapse: self.$toggle,
        dismiss: self.$toggle,
        prev: self.$prev,
        next: self.$next,
        loading: self.$loader
      };
    },
    icons: function icons(_icons, svgName) {
      var self = this;

      if (_is.hash(_icons)) {
        var $icons = self.__$icons();

        if (!_is.string(svgName)) svgName = self.opt.svg;
        var changed = false;
        Object.keys(_icons).forEach(function (name) {
          // first make sure this is a recognized icon
          if ($icons.hasOwnProperty(name) && _is.jq($icons[name]) && $icons[name].length > 0 && _.icons.exists(_icons[name], svgName)) {
            var $icon = $icons[name].find(self.sel.icons[name]),
                icon = _.icons.get(_icons[name], svgName, [self.cls.icons[name]]);

            var allowed = true;

            if (name === "collapse" && self.opt.dismiss || name === "dismiss" && !self.opt.dismiss) {
              allowed = false;
            }

            if (allowed) {
              // if an element already exists, replace it, otherwise just append the icon.
              if ($icon.length > 0) $icon.replaceWith(icon);else $icons[name].append(icon);
              changed = true;
            }
          }
        });

        if (changed) {
          _obj.extend(self.opt.icons, _icons);

          self.opt.svg = svgName;
        }
      }

      return _obj.merge({}, self.opt.icons);
    },
    getCSSOption: function getCSSOption(regex) {
      var self = this;

      if (regex instanceof RegExp) {
        var match = self.el.className.match(regex);

        if (match !== null && match.length === 2) {
          return match[1];
        }
      }

      return null;
    },
    disableTransitionsTemporarily: function disableTransitionsTemporarily(doWhileDisabled) {
      var self = this;

      _t.disable(self.$el, doWhileDisabled, self);
    },
    state: function state(value) {
      var self = this;
      if (!self.opt.remember || self.opt.preview) return null;

      if (_is.undef(value)) {
        return self.parent.state(self.id);
      }

      self.parent.state(self.id, value);
    },
    forget: function forget() {
      var self = this;

      if (!self.opt.preview) {
        self.parent.forget(self.id);
      }
    },
    //region Listeners
    onPrevClick: function onPrevClick(e) {
      e.preventDefault();
      e.data.self.prev();
    },
    onNextClick: function onNextClick(e) {
      e.preventDefault();
      e.data.self.next();
    },
    onToggleClick: function onToggleClick(e) {
      e.preventDefault();
      var self = e.data.self;
      if (self.opt.dismiss && self.isOpen) self.dismiss(self.opt.dismissImmediate);else self.toggle();
    },
    onActionClick: function onActionClick(e) {
      e.preventDefault();
      var self = e.data.self,
          $this = $(this),
          action = $this.data('foobar-action'),
          immediate = $this.data('immediate');
      self.perform(action, immediate);
    },
    onSizeChange: function onSizeChange() {
      var self = this,
          width = self.width();

      if (width !== self.lastWidth) {
        self.lastWidth = width;
        self.ctnr.update(true);
      }

      if (self.item instanceof _.Item) {
        if (self.item.update()) {
          // the content size has changed so update the bar
          self.height(self.item.lastContentHeight, true);
        }
      }
    },
    onClassChange: function onClassChange() {
      var self = this;
      self.lastWidth = self.$el.width();
      self.minHeight = parseInt(self.$el.css('min-height')) || 0;
      self.isOpen = self.$el.hasClass(self.cls.open);
      self.layout = self.getCSSOption(self.regex.layout);
      self.transition = self.getCSSOption(self.regex.transition);
      self.itemTransition = self.getCSSOption(self.regex.itemTransition);
      self.hasTransition = !_is.empty(self.transition);
      self.hasItemTransition = !_is.empty(self.itemTransition);
      self.ctnr.onClassChange();
    } //endregion

  });

  _.bars.register("bar", _.Bar, ".foobar", {
    options: {
      icons: {
        expand: "plus",
        collapse: "minus",
        dismiss: "cross",
        prev: "arrow-left",
        next: "arrow-right",
        loading: "spinner"
      },
      offset: 0,
      push: false,
      remember: false,
      dismiss: false,
      dismissImmediate: false,
      open: {},
      close: {},
      transitionTimeout: 350,
      on: {},
      preview: false,
      svg: "defaults"
    },
    pushable: ['top', 'top-inline', 'left', 'right'],
    alwaysPush: [],
    toggleOffset: 10,
    toggleSize: 46,
    regex: {
      layout: /(?:\s|^)?fbr-layout-(.*?)(?:\s|$)/,
      transition: /(?:\s|^)?fbr-transition-(?!item-)?(.*?)(?:\s|$)/,
      itemTransition: /(?:\s|^)?fbr-transition-item-(.*?)(?:\s|$)/
    },
    classes: {
      el: "foobar",
      container: "foobar-container",
      containerContent: "foobar-container-content",
      dismissed: "fbr-dismissed",
      closed: "fbr-closed",
      open: "fbr-open",
      loader: "fbr-loader",
      inner: "fbr-inner",
      content: "fbr-content",
      toggle: "fbr-toggle",
      items: "fbr-items",
      prev: "fbr-prev",
      next: "fbr-next",
      item: "fbr-item",
      initialized: "fbr-initialized",
      multiple: "fbr-multiple-items",
      icons: {
        expand: "fbr-expand-icon",
        collapse: "fbr-collapse-icon",
        dismiss: "fbr-dismiss-icon",
        prev: "fbr-prev-icon",
        next: "fbr-next-icon",
        loading: "fbr-loading-icon"
      }
    },
    i18n: {
      empty: "No content found.",
      unsupported: "The provided '{action}' action is not supported.",
      dismissed: "The bar has been dismissed previously and will not be initialized."
    },
    defaults: {}
  }, -1);
})(FooBar.$, FooBar, FooBar.utils, FooBar.utils.is, FooBar.utils.fn, FooBar.utils.obj, FooBar.utils.str, FooBar.utils.transition, FooBar.utils.animation);
"use strict";

(function ($, _, _utils, _is, _str) {
  _.Container = _utils.EventClass.extend({
    construct: function construct(bar) {
      var self = this;

      self._super();

      self.bar = bar;
      self.plugin = bar.parent;
      self.isPushable = self.canPush();
      self.cls = self.getCSSClasses();
      self.positionProp = self.getPositionProp();
      self.pushProp = self.getPushProp();
      self.lastPush = 0;
      self.lastRoot = self.plugin.offsetRoot;
    },
    init: function init() {
      this.setup();
    },
    setup: function setup() {
      var self = this;
      self.plugin.on('offset-change', self.onOffsetChange, self);
      self.setBarProps();
      self.plugin.$el.addClass(self.cls.layout).addClass(self.cls.pushable).addClass(self.cls.transition);
    },
    destroy: function destroy() {
      var self = this;
      self.plugin.off('offset-change', self.onOffsetChange, self);
      self.teardown();

      self._super();
    },
    teardown: function teardown() {
      var self = this; // remove all touched bar CSS properties

      self.bar.$el.css({
        top: '',
        right: '',
        bottom: '',
        left: '',
        maxWidth: '',
        maxHeight: ''
      });

      if (!_is.empty(self.pushProp)) {
        self.plugin.offsetRoot.style.removeProperty(self.pushProp);
      }

      self.plugin.$el.removeClass(self.cls.layout).removeClass(self.cls.pushable).removeClass(self.cls.transition).removeClass(self.cls.open).removeClass(self.cls.closed);
    },
    getPositionProp: function getPositionProp() {
      var layout = this.bar.layout;

      if (_str.startsWith(layout, "top")) {
        return "top";
      } else if (_str.startsWith(layout, "bottom")) {
        return "bottom";
      } else if (_str.startsWith(layout, "left")) {
        return "left";
      } else if (_str.startsWith(layout, "right")) {
        return "right";
      }

      return "";
    },
    getPushProp: function getPushProp() {
      var self = this;
      if (_is.empty(self.positionProp)) return "";
      return self.plugin.offsetType + '-' + self.positionProp;
    },
    canPush: function canPush() {
      var bar = this.bar;
      return bar.opt.push && bar.raw.pushable.indexOf(bar.layout) !== -1 || bar.raw.alwaysPush.indexOf(bar.layout) !== -1;
    },
    getCSSClasses: function getCSSClasses() {
      var self = this;
      return {
        pushable: self.isPushable ? 'foobar-push' : '',
        transition: self.isPushable && self.bar.hasTransition ? 'foobar-push-transition' : '',
        layout: 'foobar-' + self.bar.layout,
        open: 'foobar-' + self.bar.layout + '-open',
        closed: 'foobar-' + self.bar.layout + '-closed'
      };
    },
    setBarProps: function setBarProps() {
      var self = this,
          bar = self.bar,
          offsets = self.plugin.offsets,
          css = {};

      if (offsets.left.value > 0 && ['left', 'left-top', 'left-center', 'left-bottom'].indexOf(bar.layout) !== -1) {
        css.left = offsets.left.value + 'px';
      } else {
        css.left = '';
      }

      if (offsets.right.value > 0 && ['right', 'right-top', 'right-center', 'right-bottom'].indexOf(bar.layout) !== -1) {
        css.right = offsets.right.value + 'px';
      } else {
        css.right = '';
      }

      if (offsets.top.value > 0) {
        if (['left-top', 'right-top'].indexOf(bar.layout) !== -1) {
          css.top = offsets.top.value + bar.raw.toggleOffset + bar.raw.toggleSize + 'px';
        } else if (['left-center', 'right-center'].indexOf(bar.layout) !== -1) {
          css.top = 'calc(50% + ' + offsets.top.value / 2 + 'px)';
        } else if (['top', 'top-left', 'top-right', 'top-inline', 'left', 'right'].indexOf(bar.layout) !== -1) {
          css.top = offsets.top.value + 'px';
        }
      } else {
        css.top = '';
      }

      if (['inline', 'top-inline'].indexOf(bar.layout) === -1) {
        if (offsets.top.value > 0 || offsets.bottom.value > 0) {
          css.maxHeight = 'calc(100% - ' + (offsets.top.value + offsets.bottom.value) + 'px)';
        } else {
          css.maxHeight = '';
        }
      }

      bar.el.style.setProperty('transition', 'none', 'important');
      bar.$el.css(css);
      bar.el.offsetHeight;
      bar.el.style.removeProperty('transition');
    },
    onClassChange: function onClassChange() {
      var self = this;
      self.teardown();
      self.plugin.offsetRoot.offsetHeight;
      self.isPushable = self.canPush();
      self.cls = self.getCSSClasses();
      self.positionProp = self.getPositionProp();
      self.pushProp = self.getPushProp();
      self.lastPush = 0;
      self.setup();
      self.update(true);
    },
    onOffsetChange: function onOffsetChange() {
      this.update(true);
    },
    update: function update(immediate) {
      var self = this,
          offsets = self.plugin.offsets;
      self.setBarProps();
      self.plugin.$el.toggleClass(self.cls.open, self.bar.isOpen).toggleClass(self.cls.closed, !self.bar.isOpen);

      if (self.isPushable) {
        var value = offsets.hasOwnProperty(self.positionProp) ? offsets[self.positionProp].value : 0;

        if (self.bar.isOpen && ['top', 'bottom'].indexOf(self.positionProp) !== -1) {
          value += self.bar.lastHeight;
        } else if (self.bar.isOpen && ['left', 'right'].indexOf(self.positionProp) !== -1) {
          value += self.bar.lastWidth;
        }

        if (self.lastPush !== value || self.lastRoot !== self.plugin.offsetRoot) {
          self.lastPush = value;
          self.lastRoot = self.plugin.offsetRoot;
          self.plugin.offsetRoot.style.removeProperty(self.pushProp);

          if (value > 0) {
            if (immediate) {
              self.plugin.offsetRoot.style.setProperty('transition', 'none', 'important');
              self.plugin.offsetRoot.style.setProperty(self.pushProp, value + 'px', 'important');
              self.plugin.offsetRoot.offsetHeight;
              self.plugin.offsetRoot.style.removeProperty('transition');
            } else {
              self.plugin.offsetRoot.style.setProperty(self.pushProp, value + 'px', 'important');
            }
          }
        }
      }
    }
  });
})(FooBar.$, FooBar, FooBar.utils, FooBar.utils.is, FooBar.utils.str);
"use strict";

(function ($, _, _utils, _fn, _obj) {
  _.ToggleRule = _utils.Class.extend(
  /** @lends FooBar.ToggleRule.prototype */
  {
    construct: function construct(name, config, parent, action) {
      var self = this;
      self.name = name;
      self.cfg = _obj.extend({}, config);
      self.parent = parent;
      self.plugin = parent.parent;
      self.action = action;
    },
    init: function init() {
      var self = this;
      return _fn.resolved.then(function () {
        return self.setup();
      });
    },
    setup: function setup() {},
    destroy: function destroy() {
      var self = this;
      self.teardown();
    },
    teardown: function teardown() {},
    apply: function apply() {
      var self = this;

      switch (self.action) {
        case "open":
          if (!self.parent.isOpen) {
            self.parent.trigger("open-rule", [self]);
            return self.parent.toggle(true, !self.cfg.allowTransition);
          }

          return _fn.resolved;

        case "close":
          if (self.parent.isOpen) {
            self.parent.trigger("close-rule", [self]);
            return self.parent.toggle(false, !self.cfg.allowTransition);
          }

          return _fn.resolved;

        default:
          return _fn.rejectWith("Unknown action '" + self.action + "' in rule '" + self.name + "'.");
      }
    }
  });

  _.toggleRules.register("toggle-rule", _.ToggleRule, {
    allowTransition: true
  }, -1);
})(FooBar.$, FooBar, FooBar.utils, FooBar.utils.fn, FooBar.utils.obj);
"use strict";

(function ($, _, _utils, _fn, _obj) {
  _.ToggleRule.ElementVisibility = _.ToggleRule.extend(
  /** @lends FooBar.ToggleRule.ElementVisibility.prototype */
  {
    construct: function construct(name, config, parent, action) {
      var self = this;

      self._super(name, config, parent, action);

      self.$root = self.plugin.$viewport;
      self.$target = self.$root.find(self.cfg.selector);
      self.iObserver = new IntersectionObserver(self.onIntersectionObserved.bind(self), {
        // this is done as the polyfill doesn't support passing in the document as the root but does default to it if supplied null
        root: self.plugin.isDocumentElement && !!IntersectionObserver.prototype.POLL_INTERVAL ? null : self.$root.get(0),
        rootMargin: self.cfg.rootMargin,
        threshold: self.cfg.threshold
      });
    },
    setup: function setup() {
      var self = this;

      if (self.$target.length > 0) {
        self.iObserver.observe(self.$target.get(0));
      }
    },
    teardown: function teardown() {
      var self = this;
      self.iObserver.disconnect();
    },
    onIntersectionObserved: function onIntersectionObserved(entries) {
      var self = this;
      entries.forEach(function (entry) {
        if (entry.target === self.$target.get(0)) {
          switch (self.action) {
            case "open":
            case "close":
              if (entry.isIntersecting && self.cfg.visible || !entry.isIntersecting && !self.cfg.visible) {
                if (self.cfg.once) self.iObserver.disconnect();
                self.apply();
              }

              break;
          }
        }
      });
    }
  });

  _.toggleRules.register("element-visibility", _.ToggleRule.ElementVisibility, {
    selector: null,
    rootMargin: "0px",
    threshold: 0,
    visible: true,
    once: true
  }, 10);
})(FooBar.$, FooBar, FooBar.utils, FooBar.utils.fn, FooBar.utils.obj);
"use strict";

(function ($, _, _utils, _is, _obj) {
  _.ToggleRule.ExitIntent = _.ToggleRule.extend(
  /** @lends FooBar.ToggleRule.ExitIntent.prototype */
  {
    construct: function construct(name, config, parent, action) {
      var self = this;

      self._super(name, config, parent, action);

      self.$root = self.plugin.$viewport;
      self.root = self.$root.get(0);
      self.isElement = self.root instanceof Element;
      self.delayId = null;
    },
    setup: function setup() {
      var self = this;

      if (_is.number(self.cfg.delay) && self.cfg.delay > 0) {
        self.delayId = setTimeout(function () {
          self.$root.on("mouseout.foobar", {
            self: self
          }, self.onMouseout);
        }, self.cfg.delay * 1000);
      } else {
        self.$root.on("mouseout.foobar", {
          self: self
        }, self.onMouseout);
      }
    },
    teardown: function teardown() {
      var self = this;
      clearTimeout(self.delayId);
      self.delayId = null;
      self.$root.off("mouseout.foobar", self.onMouseout);
    },
    onMouseout: function onMouseout(e) {
      var self = e.data.self;

      switch (self.action) {
        case "open":
        case "close":
          if (self.getIsExiting(e)) {
            if (self.cfg.once) self.$root.off("mouseout.foobar", self.onMouseout);
            self.apply();
          }

          break;
      }
    },
    getIsExiting: function getIsExiting(mouseoutEvent) {
      var self = this,
          elementExit = self.isElement && !self.root.contains(mouseoutEvent.toElement),
          viewportExit = !self.isElement && mouseoutEvent.toElement === null && mouseoutEvent.relatedTarget === null;
      return elementExit || viewportExit;
    }
  });

  _.toggleRules.register("exit-intent", _.ToggleRule.ExitIntent, {
    delay: 0,
    once: true
  });
})(FooBar.$, FooBar, FooBar.utils, FooBar.utils.is, FooBar.utils.obj);
"use strict";

(function ($, _, _utils, _obj) {
  _.ToggleRule.Immediate = _.ToggleRule.extend(
  /** @lends FooBar.ToggleRule.Immediate.prototype */
  {
    setup: function setup() {
      return this.apply();
    }
  });

  _.toggleRules.register("immediate", _.ToggleRule.Immediate, {
    allowTransition: false
  });
})(FooBar.$, FooBar, FooBar.utils, FooBar.utils.obj);
"use strict";

(function ($, _, _utils, _is, _obj) {
  _.ToggleRule.Scroll = _.ToggleRule.extend(
  /** @lends FooBar.ToggleRule.Scroll.prototype */
  {
    construct: function construct(name, config, parent, action) {
      var self = this;

      self._super(name, config, parent, action);

      self.$document = $(document);
      self.$root = self.plugin.$scrollParent;
      self.isElement = self.$root.get(0) instanceof Element;
    },
    update: function update() {
      var self = this;
      self.teardown();
      self.$document = $(document);
      self.$root = self.plugin.$scrollParent;
      self.isElement = self.$root.get(0) instanceof Element;
      self.setup();
    },
    setup: function setup() {
      var self = this;

      if (_is.number(self.cfg.value) && self.cfg.value > 0) {
        self.$root.on("scroll.foobar", {
          self: self
        }, self.onScroll);
      }
    },
    teardown: function teardown() {
      var self = this;
      self.$root.off("scroll.foobar", self.onScroll);
    },
    onScroll: function onScroll(e) {
      var self = e.data.self;

      switch (self.action) {
        case "open":
        case "close":
          if (self.compare(self.getScrollOffset(), self.cfg.value, self.cfg.comparator)) {
            if (self.cfg.once) self.$root.off("scroll.foobar", self.onScroll);
            self.apply();
          }

          break;
      }
    },
    compare: function compare(scrollOffset, value, comparator) {
      if (_is.fn(comparator)) {
        return comparator.call(this, scrollOffset, value);
      }

      if (_is.string(comparator)) {
        switch (comparator) {
          case "<":
            return scrollOffset < value;

          case ">":
            return scrollOffset > value;

          case "<=":
            return scrollOffset <= value;

          case ">=":
            return scrollOffset >= value;

          case "===":
            return scrollOffset === value;
        }
      }

      return false;
    },
    getScrollOffset: function getScrollOffset() {
      var self = this;

      switch (self.name) {
        case "scroll-top":
          return self.$root.scrollTop();

        case "scroll-bottom":
          var scrollHeight = self.isElement ? self.$root.prop("scrollHeight") : self.$document.height();
          return scrollHeight - self.$root.height() - self.$root.scrollTop();
      }
    }
  });

  _.toggleRules.register("scroll-top", _.ToggleRule.Scroll, {
    value: 0,
    comparator: ">=",
    once: true
  });

  _.toggleRules.register("scroll-bottom", _.ToggleRule.Scroll, {
    value: 0,
    comparator: "<=",
    once: true
  });
})(FooBar.$, FooBar, FooBar.utils, FooBar.utils.is, FooBar.utils.obj);
"use strict";

(function ($, _, _utils, _fn, _obj) {
  _.ToggleRule.Transition = _.ToggleRule.extend(
  /** @lends FooBar.ToggleRule.Transition.prototype */
  {
    setup: function setup() {
      return this.apply();
    }
  });

  _.toggleRules.register("transition", _.ToggleRule.Transition);
})(FooBar.$, FooBar, FooBar.utils, FooBar.utils.fn, FooBar.utils.obj);
"use strict";

(function ($, _, _utils, _is, _fn, _t) {
  /**
   * @summary The base item class that simply knows how to fetch its dimensions.
   * @memberof FooBar.
   * @class Item
   * @param {string} name - The name the item was registered with.
   * @param {(jQuery|Element)} element - The element for the item.
   * @param {FooBar.Item~Configuration} [config] - The configuration for the item.
   * @param {FooBar.Bar} [bar] - The parent bar this item belongs to.
   * @augments FooBar.utils.Component
   * @borrows FooBar.utils.Class.extend as extend
   * @borrows FooBar.utils.Class.override as override
   * @borrows FooBar.utils.Class.bases as bases
   */
  _.Item = _utils.Component.extend(
  /** @lends FooBar.Item.prototype */
  {
    /**
     * @ignore
     * @constructs
     * @param {string} name - The name the item was registered with.
     * @param {(jQuery|Element)} element - The element for the item.
     * @param {FooBar.Item~Configuration} [config] - The configuration for the item.
     * @param {FooBar.Bar} [bar] - The parent bar this item belongs to.
     */
    construct: function construct(name, element, config, bar) {
      var self = this; // call the base FooBar.utils.Component#construct method

      self._super(name, element, config, bar);
      /**
       * @summary The default configuration object for an item.
       * @typedef {FooBar.utils.Component~Configuration} FooBar.Item~Configuration
       * @property {string} [classes.inner="fbr-item-inner"] - The CSS class used on the items inner element.
       */

      /**
       * @summary The raw configuration object as it was supplied to this items constructor.
       * @memberof FooBar.Item#
       * @name raw
       * @type {FooBar.Item~Configuration}
       */

      /**
       * @summary The bar this item belongs to.
       * @memberof FooBar.Item#
       * @name parent
       * @type {FooBar.Bar}
       */

      /**
       * @summary The jQuery wrapper for this items inner element.
       * @memberof FooBar.Item#
       * @name $inner
       * @type {jQuery}
       */


      self.$inner = self.$el.find(self.sel.inner);
      /**
       * @summary Whether or not this item is active.
       * @memberof FooBar.Item#
       * @name isActive
       * @type {boolean}
       */

      self.isActive = self.$el.hasClass(self.cls.active);
      /**
       * @summary Whether or not this item is currently loading.
       * @memberof FooBar.Item#
       * @name isLoading
       * @type {boolean}
       */

      self.isLoading = false;
      /**
       * @summary Whether or not this item has been loaded.
       * @memberof FooBar.Item#
       * @name isLoaded
       * @type {boolean}
       */

      self.isLoaded = false;
      /**
       * @summary The last height recorded for the items content.
       * @memberof FooBar.Item#
       * @name lastContentHeight
       * @type {number}
       */

      self.lastContentHeight = 0;
      /**
       * @summary The Promise object returned from the {@link FooBar.Item#fetch|fetch} method.
       * @memberof FooBar.Item#
       * @name __fetched
       * @type {?Promise}
       * @private
       */

      self.__fetched = null;
      /**
       * @summary The jQuery element of the loader if one was needed.
       * @memberof FooBar.Item#
       * @name __$loader
       * @type {?jQuery}
       * @private
       */

      self.__$loader = null;
    },

    /**
     * @summary Gets or sets the items active state.
     * @memberof FooBar.Item#
     * @function active
     * @param {boolean} [state] - Whether or not this item is active.
     * @param {string} [action] - The action performed that is changing the state.
     * @param {boolean} [immediate=false] - Whether or not to allow transitions and perform the change immediately.
     * @returns {(Promise|boolean)} If no parameters are supplied this sets and then returns the {@link FooBar.Item#isActive|isActive} property by checking if the item has the active CSS class.
     */
    active: function active(state, action, immediate) {
      var self = this;

      if (_is.boolean(state)) {
        self.isActive = state; // first check the action and determine the class to use if any

        var actionClass = null;

        switch (action) {
          case "prev":
            // when activated start in the prev position,
            // when deactivated finish in the next position
            actionClass = state ? self.cls.prev : self.cls.next;
            break;

          case "next":
            // when activated start in the next position,
            // when deactivated finish in the prev position
            actionClass = state ? self.cls.next : self.cls.prev;
            break;
        }

        self.update(); // if there is no transition or action supplied then changes are applied immediately

        immediate = immediate || !self.parent.hasItemTransition || actionClass === null;

        if (state && !self.isLoaded && !self.isLoading) {
          self.fetch(immediate);
        } // if there is a transition and an action class then apply it immediately


        if (!immediate && actionClass !== null) {
          _t.disable(self.$el, function ($el) {
            $el.addClass(actionClass);
          });
        } // toggle the active class


        var promise = _t.modify(self.$el, function ($el) {
          $el.toggleClass(self.cls.active, state);
        }, immediate, self.parent.opt.transitionTimeout); // if there was an action class applied then remove it once the item is active


        if (!immediate && actionClass !== null) {
          var removeActionClass = function removeActionClass() {
            _t.disable(self.$el, function ($el) {
              $el.removeClass(actionClass);
            });
          };

          promise.then(removeActionClass, removeActionClass);
        }

        return promise;
      }

      return self.isActive = self.$el.hasClass(self.cls.active);
    },
    fetch: function fetch(immediate) {
      var self = this;
      if (_is.promise(self.__fetched)) return self.__fetched;
      self.isLoading = true;
      return self.__fetched = _fn.resolved.then(function () {
        self.trigger("before-load");
        return self.beforeLoad();
      }).then(function () {
        self.trigger("load");
        var load = self.load(); // only if the load method returns a promise show the loader

        if (_is.promise(load)) self.toggleLoader(true, true);
        return load;
      }).then(function () {
        self.trigger("after-load");
        return self.afterLoad();
      }).then(function () {
        return self.fetchComplete(true, null, immediate);
      }, function (err) {
        return self.fetchComplete(false, err, immediate);
      });
    },
    fetchComplete: function fetchComplete(success, error, immediate) {
      var self = this;
      self.update();
      var promise = self.isActive ? self.parent.height(self.lastContentHeight, immediate) : _fn.resolved;
      return promise.always(function () {
        return self.toggleLoader(false, immediate).always(function () {
          self.isLoading = false;
          self.isLoaded = success;

          if (success) {
            self.trigger("load-complete");
          } else {
            self.trigger("load-error", error);
          }
        });
      });
    },
    toggleLoader: function toggleLoader(state, immediate) {
      var self = this;
      state = _is.boolean(state) ? state : false;

      if (state) {
        var addClass = function addClass($el) {
          $el.addClass(self.cls.loading);
        };

        if (_is.jq(self.__$loader)) self.__$loader.remove();
        self.__$loader = self.parent.$loader.clone().appendTo(self.$el);

        _t.disable(self.$inner, addClass);

        _t.disable(self.__$loader, addClass);

        return _fn.resolved;
      }

      if (!_is.jq(self.__$loader)) return _fn.resolved;
      var timeout = self.parent.opt.transitionTimeout,
          wait = [];

      function removeClass($el) {
        $el.removeClass(self.cls.loading);
      }

      wait.push(_t.modify(self.$inner, removeClass, immediate, timeout));
      wait.push(_t.modify(self.__$loader, removeClass, immediate, timeout).then(function () {
        if (_is.jq(self.__$loader)) self.__$loader.remove();
        self.__$loader = null;
      }));
      return _fn.when(wait);
    },
    beforeLoad: function beforeLoad() {},

    /**
     * @summary Performs any required loading for the item. This method is called only once, the first time an item becomes active.
     * @memberof FooBar.Item#
     * @function load
     * @returns {(Promise|void)}
     */
    load: function load() {},
    afterLoad: function afterLoad() {},

    /**
     * @summary Gets the scrollHeight of the items inner element.
     * @memberof FooBar.Item#
     * @function innerScrollHeight
     * @returns {number}
     */
    innerScrollHeight: function innerScrollHeight() {
      var self = this,
          current = self.$inner.height();
      self.$inner.css("height", "");
      var scrollHeight = self.$inner.prop("scrollHeight");
      if (current > 0) self.$inner.height(current);
      return scrollHeight;
    },
    update: function update() {
      var self = this,
          height = self.innerScrollHeight();

      if (self.lastContentHeight !== height) {
        self.lastContentHeight = height;
        self.$inner.css("height", height);
        return true;
      }

      return false;
    }
  });

  _.items.register("item", _.Item, ".fbr-item", {
    options: {},
    classes: {
      inner: "fbr-item-inner",
      active: "fbr-active",
      prev: "fbr-item-prev",
      next: "fbr-item-next",
      loading: "fbr-loading"
    },
    i18n: {}
  }, -1);
})(FooBar.$, FooBar, FooBar.utils, FooBar.utils.is, FooBar.utils.fn, FooBar.utils.transition);
"use strict";

(function ($, _, _utils, _is, _fn, _obj) {
  /**
   * @summary The default instance of the FooBar plugin.
   * @memberof FooBar.
   * @name plugin
   * @type {FooBar.Plugin}
   */
  _.plugin = new _.Plugin(document.documentElement, {
    defaults: {}
  }); // expose certain methods directly from the FooBar.plugin instance

  _fn.expose(_.plugin, _, ["on", "off", "trigger", "destroy", "configure", "forget"]);
  /**
   * @summary Add an event listener to the core plugin.
   * @memberof FooBar.
   * @function on
   * @see FooBar.utils.Component#on
   */

  /**
   * @summary Remove an event listener from the core plugin.
   * @memberof FooBar.
   * @function off
   * @see FooBar.utils.Component#off
   */

  /**
   * @summary Trigger an event on the core plugin.
   * @memberof FooBar.
   * @function trigger
   * @see FooBar.utils.Component#trigger
   */

  /**
   * @summary Destroy the plugin.
   * @memberof FooBar.
   * @function destroy
   * @see FooBar.utils.Component#destroy
   */

  /**
   * @summary Configure the plugin.
   * @memberof FooBar.
   * @function configure
   * @see FooBar.utils.Component#configure
   */

  /**
   * @summary Forget the remembered state of a single specific bar or all bars in the page.
   * @memberof FooBar.
   * @function forget
   * @see FooBar.Plugin#forget
   */
  // Create the documented public API for the plugin

  /**
   * @summary Create a new bar for the provided element `id`.
   * @memberof FooBar.
   * @function create
   * @param {string} id - The id of the element to create a bar for.
   * @returns {?FooBar.Bar} Returns a new bar if it was created. Otherwise, `null` is returned.
   */


  _.create = function (id) {
    if (_is.string(id)) {
      var $target = _.plugin.$el.find("#" + id);

      if ($target.length > 0) {
        return (
          /** @type {?FooBar.Bar} */
          _.plugin.createChild($target)
        );
      }
    }

    return null;
  };
  /**
   * @summary Create all bars found in the document.
   * @memberof FooBar.
   * @function createAll
   * @returns {FooBar.Bar[]}
   */


  _.createAll = function () {
    return (
      /** @type {FooBar.Bar[]} */
      _.plugin.createChildren()
    );
  };
  /**
   * @summary Get an initialized bar using the provided id.
   * @memberof FooBar.
   * @function get
   * @param {string} id - The id of the bar to get.
   * @returns {(FooBar.Bar|undefined)} Returns the bar component matching the provided `id` otherwise, `undefined` is returned.
   */


  _.get = function (id) {
    if (!_is.string(id)) return;
    return (
      /** @type {(FooBar.Bar|undefined)} */
      _.plugin.findChild(function (bar) {
        return bar.el.id === id;
      })
    );
  };
  /**
   * @summary Get all initialized bars.
   * @memberof FooBar.
   * @function getAll
   * @returns {FooBar.Bar[]}
   */


  _.getAll = function () {
    return _.plugin.children.slice();
  };
  /**
   * @summary Destroy all initialized bars.
   * @memberof FooBar.
   * @function destroyAll
   */


  _.destroyAll = function () {
    _.getAll().forEach(function (bar) {
      bar.destroy();
    });
  };
  /**
   * @summary Dismisses all initialized bars.
   * @memberof FooBar.
   * @function dismissAll
   * @param {boolean} [immediate=false] - Whether or not to remove the bar immediately or allow it to transition out.
   */


  _.dismissAll = function (immediate) {
    _.getAll().forEach(function (bar) {
      bar.dismiss(immediate);
    });
  };
})(FooBar.$, FooBar, FooBar.utils, FooBar.utils.is, FooBar.utils.fn, FooBar.utils.obj);
"use strict";

(function ($, _, _utils, _is, _fn, _obj) {
  _utils.ready(function () {
    _.icons.init();

    _.plugin.configure(window.FOOBAR);

    _.plugin.init().then(function () {
      _.plugin.trigger("ready");
    });
  });
})(FooBar.$, FooBar, FooBar.utils, FooBar.utils.is, FooBar.utils.fn, FooBar.utils.obj);