(function(window,document){(function (root) {

  // Store setTimeout reference so promise-polyfill will be unaffected by
  // other code modifying setTimeout (like sinon.useFakeTimers())
  var setTimeoutFunc = setTimeout;

  function noop() {
  }

  // Use polyfill for setImmediate for performance gains
  var asap = (typeof setImmediate === 'function' && setImmediate) ||
    function (fn) {
      setTimeoutFunc(fn, 0);
    };

  var onUnhandledRejection = function onUnhandledRejection(err) {
    if (typeof console !== 'undefined' && console) {
      console.warn('Possible Unhandled Promise Rejection:', err); // eslint-disable-line no-console
    }
  };

  // Polyfill for Function.prototype.bind
  function bind(fn, thisArg) {
    return function () {
      fn.apply(thisArg, arguments);
    };
  }

  function Promise(fn) {
    if (typeof this !== 'object') throw new TypeError('Promises must be constructed via new');
    if (typeof fn !== 'function') throw new TypeError('not a function');
    this._state = 0;
    this._handled = false;
    this._value = undefined;
    this._deferreds = [];

    doResolve(fn, this);
  }

  function handle(self, deferred) {
    while (self._state === 3) {
      self = self._value;
    }
    if (self._state === 0) {
      self._deferreds.push(deferred);
      return;
    }
    self._handled = true;
    asap(function () {
      var cb = self._state === 1 ? deferred.onFulfilled : deferred.onRejected;
      if (cb === null) {
        (self._state === 1 ? resolve : reject)(deferred.promise, self._value);
        return;
      }
      var ret;
      try {
        ret = cb(self._value);
      } catch (e) {
        reject(deferred.promise, e);
        return;
      }
      resolve(deferred.promise, ret);
    });
  }

  function resolve(self, newValue) {
    try {
      // Promise Resolution Procedure: https://github.com/promises-aplus/promises-spec#the-promise-resolution-procedure
      if (newValue === self) throw new TypeError('A promise cannot be resolved with itself.');
      if (newValue && (typeof newValue === 'object' || typeof newValue === 'function')) {
        var then = newValue.then;
        if (newValue instanceof Promise) {
          self._state = 3;
          self._value = newValue;
          finale(self);
          return;
        } else if (typeof then === 'function') {
          doResolve(bind(then, newValue), self);
          return;
        }
      }
      self._state = 1;
      self._value = newValue;
      finale(self);
    } catch (e) {
      reject(self, e);
    }
  }

  function reject(self, newValue) {
    self._state = 2;
    self._value = newValue;
    finale(self);
  }

  function finale(self) {
    if (self._state === 2 && self._deferreds.length === 0) {
      asap(function() {
        if (!self._handled) {
          onUnhandledRejection(self._value);
        }
      });
    }

    for (var i = 0, len = self._deferreds.length; i < len; i++) {
      handle(self, self._deferreds[i]);
    }
    self._deferreds = null;
  }

  function Handler(onFulfilled, onRejected, promise) {
    this.onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : null;
    this.onRejected = typeof onRejected === 'function' ? onRejected : null;
    this.promise = promise;
  }

  /**
   * Take a potentially misbehaving resolver function and make sure
   * onFulfilled and onRejected are only called once.
   *
   * Makes no guarantees about asynchrony.
   */
  function doResolve(fn, self) {
    var done = false;
    try {
      fn(function (value) {
        if (done) return;
        done = true;
        resolve(self, value);
      }, function (reason) {
        if (done) return;
        done = true;
        reject(self, reason);
      });
    } catch (ex) {
      if (done) return;
      done = true;
      reject(self, ex);
    }
  }

  Promise.prototype['catch'] = function (onRejected) {
    return this.then(null, onRejected);
  };

  Promise.prototype.then = function (onFulfilled, onRejected) {
    var prom = new (this.constructor)(noop);

    handle(this, new Handler(onFulfilled, onRejected, prom));
    return prom;
  };

  Promise.all = function (arr) {
    var args = Array.prototype.slice.call(arr);

    return new Promise(function (resolve, reject) {
      if (args.length === 0) return resolve([]);
      var remaining = args.length;

      function res(i, val) {
        try {
          if (val && (typeof val === 'object' || typeof val === 'function')) {
            var then = val.then;
            if (typeof then === 'function') {
              then.call(val, function (val) {
                res(i, val);
              }, reject);
              return;
            }
          }
          args[i] = val;
          if (--remaining === 0) {
            resolve(args);
          }
        } catch (ex) {
          reject(ex);
        }
      }

      for (var i = 0; i < args.length; i++) {
        res(i, args[i]);
      }
    });
  };

  Promise.resolve = function (value) {
    if (value && typeof value === 'object' && value.constructor === Promise) {
      return value;
    }

    return new Promise(function (resolve) {
      resolve(value);
    });
  };

  Promise.reject = function (value) {
    return new Promise(function (resolve, reject) {
      reject(value);
    });
  };

  Promise.race = function (values) {
    return new Promise(function (resolve, reject) {
      for (var i = 0, len = values.length; i < len; i++) {
        values[i].then(resolve, reject);
      }
    });
  };

  /**
   * Set the immediate function to execute callbacks
   * @param fn {function} Function to execute
   * @private
   */
  Promise._setImmediateFn = function _setImmediateFn(fn) {
    asap = fn;
  };

  Promise._setUnhandledRejectionFn = function _setUnhandledRejectionFn(fn) {
    onUnhandledRejection = fn;
  };

  root.Promise = Promise;

})(this);

/**
 * @name Tetra
 * @version 1.5.0
 * @author Nicolas RAIBAUD
 * @author Luis NOVO
 * @description Tetra bridge library
 */


  "use strict";

  var tetra, services, events, http, CONFIG, promise;

  /**
   * @name opts
   * @object
   * @description Defines the option parameters for the services
   */
  CONFIG = {};

  CONFIG.URL = 'http://terminal.ingenico.com';
  CONFIG.SERVICE_URL = CONFIG.URL + '/service';
  CONFIG.WAAS_URL = CONFIG.URL + '/waas';
  CONFIG.DESKTOP_WAID = '00000000';
  CONFIG.WP_VERSION = null;
  CONFIG.START_END = {
      "SE_START": {
          id: 1
      },
      // Warning :: SE_CHECK_PREPARE should not be used in a webapp
      "SE_CHECK_PREPARE": {
          id: 2
      },
      "SE_END": {
          id: 3
      }
  };

  /**
   * @name http
   * @function object
   * @description Defines the http helper functions to use by the services
   */
  http = {
      // Parsses the data to send to a post request
      parse: function (data) {
          var d, buffer = [];

          // adds each property
          for (d in data) {
              if (data.hasOwnProperty(d)) {
                  buffer.push(d + '=' + data[d]);
              }
          }

          // returns the value
          return encodeURI(buffer.join('&'));
      },

      // Creates an ajax call to a given url
      ajax: function (method, url, data, callback, error, timeout, async, expect) {

          // Creates the request and opens it
          var xmlreq = new XMLHttpRequest();
          xmlreq.open(method, url, async);

          // If the request is a post it parses the data if it exists
          if (method === 'POST' || method === 'PUT') {
              data = data && (typeof data === 'string' ? data : JSON.stringify(data));
              //data = data.replace(/\\\\/g, "\\");
          }

          // Sets the callback
          xmlreq.onreadystatechange = function () {

              var response;

              function onError() {
                  error && error({
                      msg: xmlreq.statusText || ('XMLHttpRequest error status ' + xmlreq.status),
                      status: xmlreq.status,
                      response: response
                  });
              }

              function onSuccess() {
                  callback && callback(response);
              }

              // When the request is completed, clears the listener and returns the callback
              if (xmlreq.readyState === 4) {
                  xmlreq.onreadystatechange = null;

                  // if the request was sucessfull, returns the response
                  if (xmlreq.status === 200 || xmlreq.status === 204) {

                      response = xmlreq && xmlreq.responseText ? JSON.parse(xmlreq.responseText) : null;

                      if (expect && typeof expect === 'function') {
                          // Expect test successfull
                          if (expect(response)) {
                              onSuccess();
                          } else { // Expect Failed
                              onError();
                          }

                          return;
                      }

                      // Has error in return
                      if (response && response.return) {
                          onError();
                      }
                      else { // We expect nothing
                          onSuccess();
                      }
                  }

                  // if not, returns an error
                  else {
                      response = xmlreq && xmlreq.responseText ? JSON.parse(xmlreq.responseText) : null;
                      onError();
                  }
              }
          };

          // it sets the timeout if passed
          if (timeout) {
              xmlreq.timeout = timeout;
          }

          xmlreq.setRequestHeader("Content-type", "application/x-www-form-urlencoded");

          // Sends the data
          xmlreq.send(data);
      },

      // Override for the post method
      post: function (url, data, callback, error, timeout, expect) {
          this.ajax('POST', url, data, callback, error, timeout, true, expect);
      },

      // Override for the get method
      get: function (url, callback, error, timeout) {
          this.ajax('GET', url, null, callback, error, timeout, true);
      },

      // Override for the delete method
      del: function (url, data, callback, error, timeout, async) {
          this.ajax('DELETE', url, data, callback, error, timeout, async);
      },

      // Override for the put method
      put: function (url, data, callback, error, timeout) {
          this.ajax('PUT', url, data, callback, error, timeout, true);
      }
  },
      services = [], // Private Services instances
      events = {}, // Private events,
      promise = null; // Tetra promises

  /***
   *
   * Get the timeout value
   *
   * @param timeout
   * @returns {*|timeout|Number|XMLHttpRequest.timeout}
   */
  function getTimeout(timeout) {
      return timeout || this.timeout || this.requestTimeout;
  }

  /***
   *
   * Get the delay value
   *
   * @param delay
   * @returns {*|number}
   */
  function getDelay(delay) {
      return delay || this.delay || this.requestDelay;
  }

  /***
   *
   * Get the delay value
   *
   * @param delay
   * @returns {*|number}
   */
  function getThen(then) {
      return then || this.then;
  }

  /***
   *
   * Define a service
   *
   * @param serviceName
   * @param options
   * @returns {{evtSource: window.EventSource, delay: (*|number), timeout: (*|timeout|Number|XMLHttpRequest.timeout), call: call, connect: connect, disconnect: disconnect, then: then, catch: catch, success: success, error: error, trigger: trigger, on: on, off: off, resolve: resolve, reject: reject, destroy: destroy}}
   * @constructor
   */
  var Service = function (options) {
      var me, sse, serviceName, namespace, formats, hidden;

      options = options || {},
          sse = {},
          hidden = false,
          serviceName = options.service,
          namespace = options.namespace,
          formats = options.formats;

      return me = {
          serviceName: serviceName,
          connected: false,
          promise: null,
          evtSource: null,
          handler: {
              resolve: null,
              reject: null,
              promise: null
          },
          requestDelay: options.requestDelay || tetra.requestDelay,
          requestTimeout: options.requestTimeout || tetra.requestTimeout,
          /***
           *
           * Connect to service
           *
           * @param options
           * @returns {me}
           */
          connect: function (options) {

              options = options || {};

              // Call by default on reject
              options.then = options.then || 'both';

              // Creates a promise
              this.doPromise(options, function (onSuccess, onError, timeout) {
                  if (!me.connected) {
                      var onSuccessWrapper = function (response) {
                          me.connected = true;
                          return onSuccess(response);
                      };

                      // Pass formats
                      var formatsParameters = '';
                      for (var format in formats) {
                          formatsParameters += 'format_' + (namespace || '') + '.' + format + '=' + formats[format] + '&';
                          //format_ingenico.device.chip.AidRegsterRequest.bytes
                          /*
                           "formats":{
                           "AidRegsterRequest.bytes":"tlv"
                           }
                           */
                      }

                      // Connect to service
                      return http.get(CONFIG.SERVICE_URL + '/' + serviceName + '?' + formatsParameters, onSuccessWrapper, onError, timeout);
                  } else {
                      console.info('Already connected');
                      return onSuccess();
                  }
              });

              return this;
          },
          /***
           *
           * Disconnect from service
           *
           * @param options
           * @returns {me}
           */
          disconnect: function (options) {

              options = options || {};

              // Call by default on both
              options.then = options.then || 'both';

              // Creates promise
              this.doPromise(options, function (onSuccess, onError, timeout) {
                  if (me.connected) {
                      var onSuccessWrapper = function (response) {
                          me.connected = false;
                          return onSuccess(response);
                      };

                      return http.del(CONFIG.SERVICE_URL + '/' + serviceName, {}, onSuccessWrapper, onError, timeout, options.async === false ? false : true);
                  } else {
                      console.info('Not connected');
                      return onSuccess();
                  }
              });

              return this;
          },
          /***
           *
           * Call a a service method
           *
           * @param methodName
           * @param options
           * @returns {me}
           */
          call: function (methodName, options) { // all options can be override here for this method

              options = options || {};

              // Call by default on resolved
              options.then = options.then || 'resolved';

              // Add a promise only if we are connected

              // Creates promise
              this.doPromise(options, function (onSuccess, onError, timeout) {
                  if (me.connected) {
                      // Creates the request params
                      var req = (namespace ? namespace + '.' : '') + methodName + 'Request',
                          res = (namespace ? namespace + '.' : '') + methodName + 'Response',
                          data = options.data || {};

                      // todo implement new RPC version
//   http://terminal.ingenico.com/service/local.device.chip0/ingenico.device.chip.ManageTransaction ?
// >>> http://terminal.ingenico.com/service/local.device.chip0/ingenico.device.chip.Chip/start

                      if (options.hide) {
                          hidden = true;
                          //  tetra.hide();
                      }

                      var onSuccessWrapper = function (response) {
                          if (hidden) {
                              hidden = false;
                              tetra.show();
                          }
                          return onSuccess(response);
                      };

                      var onErrorWrapper = function (response) {
                          if (hidden) {
                              hidden = false;
                              tetra.show();
                          }
                          return onError(response);
                      };

                      // Call the service method
                      return http.post(CONFIG.SERVICE_URL + '/' + serviceName + '?request=' + req + '&response=' + res, data, onSuccessWrapper, onErrorWrapper, timeout, options.expect);
                  } else {
                      return onError({msg: 'Not connected call'});
                  }
              });

              return this;
          },
          doPromise: function (options, fn) {
              return tetra.doPromise.apply(this, [options, fn]);
          },
          reset: function () {
              return tetra.reset.call(this);
          },
          then: function (onSuccess, onError) {
              return tetra.then.call(this, onSuccess, onError);
          },
          catch: function (error) {
              return tetra.then.call(this, null, error);
          },
          success: function (success) {
              return tetra.then.call(this, success, null);
          },
          error: function (error) {
              return tetra.then.call(this, null, error);
          },
          resolve: function (response) {
              return tetra.resolve.call(this, response, me.handler);
          },
          reject: function (reason) {
              return tetra.reject.call(this, reason, me.handler);
          },
          /***
           *
           * Add service envent, sse event
           *
           * @param eventName
           * @param callback
           * @param context
           * @returns {me}
           */
          on: function (eventName, callback, context) {

              if (eventName && !eventName.match(/\./) && eventName !== 'message') {
                  eventName = (namespace ? namespace + '.' : '') + eventName;
              }

              options = options || {};

              // Call by default on resolved
              options.then = options.then || 'resolved';

              // Creates promise
              this.doPromise(options, function (onSuccess, onError, timeout) {

                  if (!me.evtSource) {
                      return onError();
                  }

                  context = context || me;

                  sse[eventName] = {
                      eventName: eventName,
                      callback: callback,
                      context: context
                  };

                  // Add SSE event to SSE object
                  // me.evtSource.addEventListener(eventName, sse[eventName].callback.bind(context), false);
                  me.evtSource.addEventListener(eventName, function (response) {
                      var data = JSON.parse(response.data);
                      sse[eventName].callback.call(context, data);
                  }, false);

                  return onSuccess();
              });

              return this;
          },
          /***
           *
           * Open sse
           *
           */
          open: function (options) {

              options = options || {};

              // Call by default on resolved
              options.then = options.then || 'resolved';

              // Creates promise
              this.doPromise(options, function (onSuccess, onError, timeout) {

                  if (me.connected && !me.evtSource) {

                      me.evtSource = new window.EventSource(CONFIG.SERVICE_URL + '/' + serviceName + '/sse');
                      // Does not works on terminal ?!
                      me.evtSource.onerror = function (e) {
                          return onError(e);
                      };
                      me.evtSource.onopen = function (e) {
                          return onSuccess(e);
                      };

                      return onSuccess();
                  }
                  else {
                      return onError({msg: 'Not connected or event already opened'});
                  }

              });

              return this;
          },
          /***
           *
           * Close sse
           *
           */
          close: function (options) {
              options = options || {};

              // Call by default on resolved
              options.then = options.then || 'resolved';

              if (!me.evtSource) {
                  return this;
              }

              // Creates promise
              this.doPromise(options, function (onSuccess, onError, timeout) {
                  if (me.evtSource) {
                      me.off();
                      me.evtSource.close();
                      me.evtSource = null;

                      return onSuccess();
                  } else {
                      return onError({'msg': 'Event source not exist'});
                  }
              });

              return this;
          },
          /***
           *
           * Remove service event, sse event
           *
           * @param eventName
           * @returns {me}
           */
          off: function (eventName, handler, context) {

              if (eventName && !eventName.match(/\./) && eventName !== 'message') {
                  eventName = (namespace ? namespace + '.' : '') + eventName;
              }

              if (!me.evtSource) {
                  return this;
              }

              function remove(eventName) {

                  // Remove event
                  me.evtSource.removeEventListener(eventName, handler || sse[eventName].callback, false);

                  // Delete object
                  delete sse[eventName];
              }

              if (!eventName) { // Remove all events
                  for (var evt in sse) {
                      var evtName;

                      evtName = sse[evt].eventName;

                      // Remove event
                      remove(evtName);
                  }
              }
              else if (typeof eventName === 'string') { // Remove string event
                  remove(eventName);
              } else if (typeof eventName === 'object' && eventName instanceof Array) { // Remove array of events
                  for (var i = 0, len = eventName.length; i < len; i++) {
                      var evtName;

                      evtName = eventName[i];

                      // Remove event
                      remove(evtName);
                  }
              } else {

                  for (var evt in sse) { // Remove regex
                      var evtName;

                      evtName = sse[evt].eventName;

                      if (evtName.match(eventName)) {
                          // Remove event
                          remove(evtName);
                      }
                  }
              }

              return this;
          },
          /***
           *
           * Destroy the service
           *
           */
          destroy: function () {
              var service;

              this
                  .disconnect()
                  .close({success: this.reset});

              service = services.indexOf(this);
              services.splice(service, 1);
          }
      };
  };

  tetra = {
      version: '1.5.0',
      requestDelay: 0, //  Delay between requests
      requestTimeout: 0,  // ajax timeout request
      handler: {
          resolve: null,
          reject: null,
          promise: null
      },
      setup: function (properties, callback) {

          var serviceUrl = "http://terminal.ingenico.com/setup";

          function agregate(response) {
              // Agregate properties with Tetra properties
              response.requestDelay = tetra.requestDelay;
              response.requestTimeout = tetra.requestTimeout;
          }

          // Deprecated since 1.1.0
          if (callback && typeof callback === "function") {

              console.warn("Deprecated since 1.1.0");

              var options;

              if (typeof properties === 'function') {
                  http.get(serviceUrl, function (response) {
                      agregate(response);
                      return properties(response);
                  });

              } else if (typeof properties === 'object') {

                  options = JSON.parse(JSON.stringify(properties));

                  // Setup Tetra properties;
                  tetra.requestDelay = options.requestDelay || tetra.requestDelay;
                  tetra.requestTimeout = options.requestTimeout || tetra.requestTimeout;

                  delete options.requestDelay;
                  delete options.requestTimeout;

                  http.post(serviceUrl, options, callback);
              }

          } else {

              properties = properties || {};

              // Call by default on both
              properties.then = properties.then || 'both';

              if (properties && properties.data) {

                  var data = JSON.parse(JSON.stringify(properties.data));

                  // Setup Tetra properties;
                  tetra.requestDelay = properties.data.requestDelay || tetra.requestDelay;
                  tetra.requestTimeout = properties.data.requestTimeout || tetra.requestTimeout;

                  delete data.requestDelay;
                  delete data.requestTimeout;

                  // Creates a promise
                  this.doPromise(properties, function (onSuccess, onError, timeout) {
                      // Connect to service
                      return http.post(serviceUrl, data, onSuccess, onError, timeout);
                  });
              } else {
                  // Creates a promise
                  this.doPromise(properties, function (onSuccess, onError, timeout) {
                      // Connect to service
                      return http.get(serviceUrl, onSuccess, onError, timeout);
                  });
              }
          }

          return this;
      },
      /***
       *
       * Creates a new Serice instance
       *
       * @param serviceName
       * @param options
       * @returns {Service}
       */
      service: function (options) {

          var service;

          // Check if instance exist and return it
          for (var i = 0, len = services.length; i < len; i++) {
              var serviceInstance;

              serviceInstance = services[i];

              if (serviceInstance.serviceName === options.service) {
                  return serviceInstance;
              }
          }

          // Trow an error if we does not have serviceName
          if (!options.service) {
              return new Error('.service property is missing');
          }

          // Creates a new service
          service = new Service(options);

          // Register the new service as private
          services.push(service);

          return service;
      },
      /**
       * Disconnect all services
       * */
      disconnect: function () {

          for (var i = 0, len = services.length; i < len; i++) {
              var service;

              service = services[i];

              // Disconnect service
              if (service.connected) {

                  http.del(CONFIG.SERVICE_URL + '/' + service.serviceName, {},
                      function () {
                      }
                      , function () {
                      },
                      service.requestTimeout, false);
              }

          }
          return this;
      },
      /**
       * Destroy all services
       * */
      destroy: function () {
          for (var i = 0, len = services.length; i < len; i++) {
              var service;

              service = services[i];

              // Destroy service
              service.destroy();
          }
          return this;
      },
      /**
       * Creates a lookup call for a specific interface
       * */
      /* interface lookup: namespace + interfaceName (Services)
       Namespace: ingenico.device.buzzer
       Service: Buzzer
       interfaceName: => Namespace + '.' + Service => ingenico.device.buzzer.Buzzer
       */
      lookup: function (interfaceName, callback) {

          // Deprecated since 1.1.0
          if (callback && typeof callback === "function") {

              console.warn("Deprecated since 1.1.0");

              interfaceName && http.get(CONFIG.SERVICE_URL + "?interface=" + interfaceName, callback);
          } else {
              var options = callback || {};

              // Call by default on both
              options.then = options.then || 'both';

              // Creates a promise
              this.doPromise(options, function (onSuccess, onError, timeout) {
                  // Connect to service
                  return http.get(CONFIG.SERVICE_URL + "?interface=" + interfaceName, onSuccess, onError, timeout);
              });

          }

          return this;
      },
      hide: function () { // Hide layer
          console.log("INGENICO:WCE:hide");
      },
      show: function () { // Show layer
          console.log("INGENICO:WCE:show");
      },
      hideWP: function () { // Hide layer
          console.log("INGENICO:WCE:hideWP");
      },
      showWP: function () { // Show layer
          console.log("INGENICO:WCE:showWP");
      },
      weblet: {
          hide: function () { // Hide weblet
              console.log("INGENICO:WEBLET:hide");

              return this;
          },
          show: function () { // Show weblet
              console.log("INGENICO:WEBLET:show");

              return this;
          },
          notify: function (data) { // Notify weblet

              data = data || {};

              var badge = data.badge || 'default';
              var count = data.count || 0;
              var save = data.save || false;
              var id = data.id ? ':' + data.id : '';

              console.log("INGENICO:NOTIFY:" + badge + ":" + count + ":" + save + id);
              return this;
          },
          /***
           *
           * Add window tetra event
           *
           * @param eventName
           * @param callback
           * @param context
           * @returns {tetra}
           */
          on: function (eventName, callback, context) {

              // Manually start since 1.4.1
              if (eventName === 'wakeup') {
                  tetra.createWakeupEvent();
              }

              context = context || this;

              // Register event as private
              events[eventName] = {
                  eventName: eventName,
                  callback: callback.bind(context),
                  context: context
              };

              // Add listerner to window
              window.addEventListener(eventName, events[eventName].callback, false);

              return this;
          },
          /***
           *
           *  Trigger window tetra event
           *
           * @param eventName
           * @returns {tetra}
           */
          trigger: function (eventName, data) {

              data = data || {};

              function dispatch(eventName) {
                  var event;

                  event = new CustomEvent(eventName, data);

                  // Dispatch event
                  window.dispatchEvent(event);
              }

              if (!eventName) { // Trigger all events
                  for (var evt in events) { // Remove regex
                      var evtName;
                      evtName = events[evt].eventName;

                      // Dispatch event
                      dispatch(evtName);
                  }
              } else if (typeof eventName === 'string') { // Triggered string event
                  dispatch(eventName);
              } else if (typeof eventName === 'object' && eventName instanceof Array) { // Triggered array of events
                  for (var i = 0, len = eventName.length; i < len; i++) {

                      // Dispatch event
                      dispatch(eventName[i]);
                  }
              } else {
                  for (var evt in events) { // Triggered regex
                      var evtName;
                      evtName = events[evt].eventName;
                      if (evtName.match(eventName)) {

                          // Dispatch event
                          dispatch(evtName);
                      }
                  }
              }

              return this;
          },
          /**
           * Remove window tetra events
           * */
          off: function (eventName, handler, context) {
              function remove(eventName) {
                  // Remove event listenner from window
                  window.removeEventListener(eventName, handler || events[eventName].callback, false);

                  // Delete object
                  delete events[eventName];
              }

              if (!eventName) { // Remove all events
                  for (var evt in events) {
                      var evtName;
                      evtName = events[evt].eventName;
                      // Remove event
                      remove(evtName);
                  }
              } else if (typeof eventName === 'string') { // Remove string event

                  // Remove event
                  remove(eventName);
              } else if (typeof eventName === 'object' && eventName instanceof Array) { // Remove array of events
                  for (var i = 0, len = eventName.length; i < len; i++) {
                      // Remove event
                      remove(eventName[i]);
                  }
              } else {
                  for (var evt in events) { // Remove regex
                      var evtName;
                      evtName = events[evt].eventName;
                      if (evtName.match(eventName)) {
                          // Remove event
                          remove(evtName);
                      }
                  }
              }

              return this;
          }
      },
      waas: function (interfaceName,options) {

          var service, evtSource,evtSourceWaas, events,namespace;

          namespace = interfaceName.replace(/\.\w+$/,'');

          options = options || {},
          events = [];

          function Waas() {

              // todo bug me

              var Send = function (method) {
                  this.connectionId = null;
                // todo
                  //this.sendError = function() {
                  //};
                  this.sendResponse = function (data ,opts,callback, error, timeout, expect) {

                      var connectionId = '';

                      if(typeof opts === 'function') {
                          callback = arguments[2];
                          error = arguments[3];
                          timeout = arguments[4];
                          expect = arguments[5];
                      }

                      if(typeof opts === 'object' && opts.connectionId && CONFIG.WP_VERSION >= 2.06) {
                          connectionId = 'conn_id='+ opts.connectionId
                      }

                      if(this.connectionId  && CONFIG.WP_VERSION >= 2.06) {
                          connectionId = 'conn_id='+ this.connectionId;
                      }

                      http.post(CONFIG.WAAS_URL + '/' + interfaceName + '/' + method + '?' + connectionId, data || {}, callback, error, timeout, expect);
                      return this;
                  };
              };

              return {
                  clients:[],
                  sendEvent: function (eventName, data, opts,callback, error, timeout, expect) {

                      var connectionId = '';

                      if(typeof opts === 'function') {
                          callback = arguments[2];
                          error = arguments[3];
                          timeout = arguments[4];
                          expect = arguments[5];
                      }

                      if(typeof opts === 'object' && opts.connectionId && CONFIG.WP_VERSION >= 2.06) {
                          connectionId = 'conn_id='+ opts.connectionId
                      }

                      http.post(CONFIG.WAAS_URL + '/' +  namespace + '.' + eventName + '?' + connectionId, data || {}, callback, error, timeout, expect);
                      return this;
                  },
                  on: function (eventName, properties, callBack) {

                      if (properties && typeof properties === 'function') {
                          callBack = properties;
                          properties = {};
                      }

                      events.push({
                          eventName: eventName,
                          properties: properties,
                          callBack: callBack
                      });

                      return this;
                  },
                  start: function () {

                    if(!CONFIG.WP_VERSION) {
                      setTimeout(function(){
                        service.start();
                      },250);

                      return this;
                    }


                       var params,multi;

                       params = '?';

                       for (var i = 0, len = events.length; i < len; i++) {
                           var event = events[i];
                           var properties = event.properties;
                           var eventName = event.eventName;

                           // Add perms parameters
                           if (properties.perms && typeof properties.perms === 'object' && properties.perms instanceof Array) {
                               params += 'perms_' + eventName + '=' + properties.perms.toString() + '&';
                           }

                           // Add format parameters
                           if (properties.formats) {

                               var UpperEventName = eventName[0].toUpperCase() + eventName.slice(1);

                               for (var format in properties.formats) {
                                   params += 'format_' + namespace + '.' + UpperEventName + format + '=' + properties.formats[format] + '&';
                               }
                           }

                       }

                       if(CONFIG.WP_VERSION >= 2.06) {
                         multi = 'multi';
                         params += multi;
                       }


                       // Create events source
                      evtSource = new window.EventSource(CONFIG.WAAS_URL + '/' + interfaceName + params);
                      evtSourceWaas = new window.EventSource(CONFIG.WAAS_URL + '?' + multi);

                       // Add connect Listenner
                       evtSourceWaas.addEventListener('ingenico.webos.ServiceConnect',function(data){
                         service.clients.push(data.id);
                       });
                       // Add disconnect Listenner
                       evtSourceWaas.addEventListener('ingenico.webos.ServiceDisconnect',function(data){
                          service.clients.splice(service.clients.indexOf(data.id), 1);
                       });


                       // Add event listeners
                       for (var i = 0, len = events.length; i < len; i++) {
                            var event = events[i];

                            var send = new Send(event.eventName);
                            (function(send,event){

                              var attachedEventSource;
                              if(event.eventName === 'ingenico.webos.ServiceConnect' || event.eventName === 'ingenico.webos.ServiceDisconnect') {
                                evtSource.addEventListener(event.eventName,function(response) {
                                  event.callBack.call(this,response);
                                }, false);
                              } else {
                                evtSource.addEventListener(event.eventName, function(response) {
                                  var data = JSON.parse(response.data);
                                  send.connectionId = data.$wp_connId ||  data.id;
                                  event.callBack.call(send,response);
                                  send.connectionId = null;
                                }, false);
                              }
                            })(send,event);

                       }


                    return this;

                  }

                  //,stop:function(){

                  //}
              };
          }

          service = new Waas(interfaceName);

          return service;

      },
      /***
       *
       * Creates a promise
       *
       * @param options
       * @param fn
       */
      doPromise: function (options, fn) {

          var me = this;

          function doPromise() {

              var promise;

              // Creates a new promise
              promise = new window.Promise(function (resolve, reject) {


                  // Call the promise after a delay
                  window.setTimeout(function () {

                      return fn(function (response) {

                          // Register Handler
                          me.handler.resolve = resolve;
                          me.handler.reject = reject;
                          me.handler.promise = promise;

                          me.resolve(response, me.handler);

                      }, function (reason) {

                          // Register Handler
                          me.handler.resolve = resolve;
                          me.handler.reject = reject;
                          me.handler.promise = promise;

                          me.reject(reason, me.handler);

                      }, getTimeout.call(me, options.requestTimeout)); // Pass AJAX timeout for service call

                  }, getDelay.call(me, options.requestDelay));

              });

              return promise;
          }

          if (!this.promise || options.promise) {
              this.promise = doPromise();
          } else {
              var then = getThen.call(me, options.then);
              if (then === 'resolved') {
                  me.success(doPromise)
              } else if (then === 'rejected') {
                  me.error(doPromise)
              } else {
                  me.then(doPromise, doPromise);
              }

          }

          if (options.error || options.success) {
              me.then(options.success, options.error);
          }

          return this;
      },
      then: function (onSuccess, onError) {

          var me = this;

          if (onSuccess && !onError) {
              me.promise = me.promise.then(function (response) {
                  return onSuccess.call(me, response, me.handler);
                  // return me.promise;
              });
          } else if (onSuccess && onError) {

              me.promise = me.promise.then(function (response) {

                      return onSuccess.call(me, response, me.handler);
                      //return me.promise;
                  },
                  function (reason) {
                      return onError.call(me, reason, me.handler);
                      //   return me.promise;
                  }
              );
          }
          else {
              me.promise = me.promise.catch(function (reason) {
                  return onError.call(me, reason, me.handler);
                  //  return me.promise;
              });
          }

          return this;
      },
      /***
       *
       * Catch promise method
       *
       * @param error
       * @returns {me}
       */
      catch: function (error) {
          this.then(null, error);
          return this;
      },
      /***
       *
       * Success sugar for resolved promise
       *
       * @param success
       * @returns {me}
       */
      success: function (success) {
          this.then(success, null);
          return this;
      },
      /***
       *
       * Error sugar for rejected promise
       *
       * @param error
       * @returns {me}
       */
      error: function (error) {
          this.then(null, error);
          return this;
      },
      /***
       *
       * Resolve the current promise
       *
       * @param response
       * @returns {me}
       */
      resolve: function (response) {
          this.handler.resolve.call(this, response, this.handler);
          return this;
      },
      /***
       *
       * Reject the current promise
       *
       * @param reason
       * @returns {me}
       */
      reject: function (reason) {
          this.handler.reject.call(this, reason, this.handler);
          return this;
      },
      reset: function () {
          this.promise = null;
          return this;
      },
      checkServices: function (services, options) {
          var _services, me, tried, resolvePromise, rejectPromise;

          options = options || {};

          options.delay = options.delay || 1000;
          options.try = options.try || 20;
          options.then = options.then || 'both';

          me = this,
              tried = 0,
              _services = services.slice(0);

          function onSuccessWrapper() {
              _services.shift();
              tried = 0;
              check();
          }

          function onErrorWrapper() {
              tried++;
              setTimeout(check, options.delay);
          }

          function check() {
              if (_services.length && tried < options.try) {
                  tetra
                      .reset()
                      .lookup(_services[0],
                          {
                              expect: function (r) {
                                  return r && r.length;
                              }
                          }
                      )
                      .then(onSuccessWrapper, onErrorWrapper);

              } else {
                  if (tried === options.try) {
                      rejectPromise(_services[0]);
                  } else {
                      resolvePromise();
                  }

              }
          }

          return me.doPromise({}, function (resolve, reject) {
              resolvePromise = resolve;
              rejectPromise = reject;
              check();
          });

      }
  };

  /**
   * Add window events
   * */
  document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
          tetra.weblet.trigger('hide');
      } else {
          tetra.weblet.trigger('show');
      }
  });

  window.addEventListener("beforeunload", function (e) {
      e.preventDefault();
      tetra.weblet.trigger('close');

      tetra.disconnect();
  });

  /*** Listen to wakeup event ***/

  tetra.createWakeupEvent = function () {

      return tetra.service({ // Instantiate desktopenv service
              service: 'local.desktopenv.inactivityHandler',
              namespace: 'ingenico.desktopenv'
          })
          .reset()
          .disconnect()
          .close()
          .connect() // Connect to service
          .open()  // Open SSE
          .on('WakeupEvent', function (r) { // listen to event
              tetra.weblet.trigger('wakeup', r.cause);
          });
  };

  // Get WP version
  tetra.service({
     service: 'local.WebOs.Service',
     namespace: 'ingenico.webos'
  })
  .connect()
  .call('GetWPVersion')
  .success(function (r) { CONFIG.WP_VERSION = parseFloat(r.version,10); })
  .disconnect();

tetra.header = {
	showAll: function () {
		console.log('INGENICO:HEADER-LEDS:show:show');
	},
	hideAll: function () {
		console.log('INGENICO:HEADER-LEDS:hide:hide');
	},
	showLeds: function () {
		console.log('INGENICO:HEADER-LEDS::show');
	},
	hideLeds: function () {
		console.log('INGENICO:HEADER-LEDS::hide');
	},
	showBanner: function () {
		console.log('INGENICO:HEADER-LEDS:show:');
	},
	hideBanner: function () {
		console.log('INGENICO:HEADER-LEDS:hide:');
	}
};

/* Polyfill Notifcation */

var _notifications = {};
var notificationService = null;
var Notification = function (title, options) {

	  var me = this;

		function processEvent(evtName,data,remove) {
			if(data.tag && data.tag !== '') {
				_notifications[data.tag] && _notifications[data.tag][evtName] && _notifications[data.tag][evtName](_notifications[data.tag]);
				 remove && delete _notifications[data.tag];
			} else {
				for(var tag in _notifications) {
					_notifications[tag][evtName] && _notifications[tag][evtName](_notifications[tag]);
					remove && delete _notifications[tag];
				}
			}
		}


    if (typeof title !== 'string') {
        return new Error('Title is required');
    }

    options = options || {};

    var data = {};

    this.title = data.title = title;
		this.tag = data.tag = (options.tag || Math.random()) + '';
		this.ing_buttons = data.ing_buttons = options.ing_buttons || false;


    if (options.body) {
        data.body = options.body;
    }

		if (options.onshow) {
			this.onshow = options.onshow;
		}

		if (options.onclose) {
			this.onclose = options.onclose;
		}

		if (options.onshow) {
			this.onclick = options.onclick;
		}

		if(!notificationService) {

			notificationService =  tetra.service({
							service: 'local.webapp.' + CONFIG.DESKTOP_WAID,
							namespace: 'ingenico.webos'
					})
				.reset()
				.connect()
				.open()
				.on('ShowNotificationEvent', function (data) {
						 processEvent('onshow',data);
				 })
				 .on('ClickNotificationEvent', function (data) {
						 processEvent('onclick',data,true);
				 })
				 .on('CloseNotificationEvent', function (data) {
					 processEvent('onclose',data,true);
				 })
				 .call('Notification', {
						 data: data
				 })

		} else {
			notificationService
			.reset()
			.call('Notification', {
					data: data
			})
		}

		this.close = function() {
				notificationService
				.reset()
				.call('CloseNotification',{
					data:{
						tag:data.tag
					}
				}).then(function(){
						processEvent('onclose',data,true);
				})
		};


	_notifications[data.tag] = this;

    return this;
};

window.Notification = Notification;

tetra.printer = {
	setDiffuseMode: function () {
		console.log('INGENICO:WCE:printerDithering:diffuse');
	},
	setOrderedMode: function () {
		console.log('INGENICO:WCE:printerDithering:ordered');
	},
	setThreshold: function (value) {
		value = value || '';
		console.log('INGENICO:WCE:printerDithering:threshold:' + value)
	}
};


tetra.startEnd = function (properties) {

	var events, waas, supportedMethods,startEnd;

	function StartEnd() {

		var that;

		that = this;


		waas = tetra.waas('ingenico.transaction.StartEnd')
			.on('stateSE', function (response) {
				var state = JSON.parse(response.data).state;
				if (typeof state !== 'undefined') {
					if (state === 1) {
						that.enable();
					} else {
						that.disable();
					}

					return this.sendResponse({state: that.enabled});
				} else {

					return this.sendResponse({state: that.enabled});
				}
			})
			.on('getSEImplementedMethods',
				function () {
					var result;

					result = {
						"return": 1,
						"supportedMethods": supportedMethods
					};

					this.sendResponse(result)

				})
			.on('executeSE',
				{
					formats: {
						'Request.input': 'tlv'
					}
				},
				function (e) {
					var data, handler, me;

					me = this;
					data = JSON.parse(e.data);
					handler = events[data.serviceId];


					that.sendResponse = function (tlv, callBack) {
						me.sendResponse.call(me, {
							"return": 1,
							"output": tlv
						},{connectionId:data.$wp_connId}, callBack);
					};

					handler ? handler.call(this, data.input, that.enabled) : this.sendResponse({},{connectionId:data.$wp_connId});

				})
			.start();


		return this;

	};

	// todo enabled can come from instantiation, add save property ? add pass property ?
	StartEnd.prototype.enabled = 1;


	StartEnd.prototype.changeState = function (state) {
		return true;
	};

	StartEnd.prototype.disable = function () {
		var changeState = this.changeState(0);
		if (changeState) {
			this.enabled = 0;
			tetra.weblet.trigger('SE_DISABLED');
		}
	};

	StartEnd.prototype.enable = function () {
		var changeState = this.changeState(1);
		if (changeState) {
			this.enabled = 1;
			tetra.weblet.trigger('SE_ENABLED');
		}

	};

	StartEnd.prototype.sendResponse = function () {
	};

	StartEnd.prototype.on = function (eventName, options, callBack) {
		var supportedMethod;

		if (options && typeof options === "function") {
			events[eventName] = options;
			options = {};
		}

		if (callBack) {
			events[eventName] = callBack;
		}

		supportedMethod = {};
		supportedMethod.id = CONFIG.START_END[eventName].id;
		if (options && options.priority) {
			supportedMethod.priority = options.priority;
		}
		supportedMethods.push(supportedMethod);

		return startEnd;
	};


		events = {};
		supportedMethods = [];

		startEnd = new StartEnd();

		return startEnd;
};


tetra.system  = {
	// Launch an application (webapp or native app)
	run:function(properties) {

		var entryUrl = properties.webApp ? 'WebApps/' + properties.webApp : properties.path;

		return tetra.service({
        service: 'local.desktopenv.explorer',
        namespace: 'ingenico.desktopenv'
    })
		.reset()
		.connect()
		.call('SelectIcon',{data:{entryUrl:entryUrl}})
		.disconnect()
	}
};
 if (typeof module === "object" && module != null && module.exports) { module.exports = tetra; } else if (typeof define === "function" && define.amd) { define(function () { return tetra; });} else { window.tetra = tetra; }})(window,document);