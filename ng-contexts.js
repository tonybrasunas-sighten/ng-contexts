;(function(angular) {
  'use strict'

  var mod = angular.module('ng-contexts', [])

  /**
   * Establishes a relational context that delegates
   * updates (from top to bottom) according to PubSub
   */
  mod.service('Contexts', ['$log', '$rootScope', '$q', function($log, $rootScope, $q) {
    var self = this
    var noop = function(data) { return data }

    /**
     * Tracks all context relations
     */
    this.contexts = {}

    /**
     * Tracks all context models
     */
    this.models = {}

    /**
     * Stores current active state for each registered context (by rel)
     */
    $rootScope.current = {}

    /**
     * Registers a service as a context and subscribes the provided
     * service's model to its own changes
     *
     * @param {Object} service typically `this` of the service
     */
    this.register = function(service) {
      this.contexts[service.name] = (service.rels  || [])
      this.models[service.name]   = (service.model || noop).bind(service)
      this.identifier             = (service.identifier || 'uuid')

      service.select = function() {
        return self.select.apply(service, [service.name].concat(Array.prototype.slice.call(arguments)))
      }

      service.refresh  = self.refreshing(service)
      service.use      = self.using(service)
      service.modify   = self.modifying(service)

      service.selected = function() {
        return self.getOr(service.name, false)
      }

      service.exists   = function() {
        return self.existing(service.name, false)
      }

      service.clear    = function() {
        return self.clear(service.name)
      }

      service.clearSubscriptions = function() {
        return self.clear(service.name, true, true, false)
      }

      service.$$hasContext = true

      $rootScope.current[name] = {}
    }

    /**
     * Creates a generator that allows users to provide
     * a binding function that reacts to a single Service's
     * changes (in other words, lazy functionality or data
     * that needs to re-process when data changes).
     *
     * @param {Service} angular service
     * @returns {Function} instance refresher accepting an own property to react to (method) and a callback (andThen)
     */
    this.refreshing = function(service) {
      return (function(method, andThen) {
        var generator = method instanceof Function ? method.call(service, service) : service[method].bind(service)
        var model     = service.model || noop

        if (generator instanceof Function) {
          $q.when(generator.call(service))
            .then(function(data) {
              andThen(
                data instanceof Array ? data.map.call(service, model, service) : model.call(service, data)
              )
            })
            .catch(function(error) {
              $log.error('[ng-contexts.refreshing] failed to refresh Service integration point', error)
            })
        } else {
          $log.error('[ng-contexts.refreshing] failed to find method on service', method)
        }
      }).bind(service)
    }

    /**
     * Updates the "current" entity instance relevant to the Service.
     * If none can be found, log error and return false.
     *
     * @param {obj} updates - the data to add or amend on the entity
     * @param {bool} publish - whether to initiate a publish
     * @returns {obj} updated entity instance
     */
    this.modifying = function(service) {
      return function(updates, publish = false) {
        if (this.exists()) {
          var current = this.selected()
          var updated = Object.assign(current, updates)

          if (publish) self.publish(service.name, updated)

          return updated

        } else {
          $log.error('[ng-contexts.modifying] No selected data to modify found for service', service)
          return false
        }
      }
    }

    /**
     * Creates an integration point where changes to the Service
     * are subscribed to and published hierarchically (single direction, down)
     * to any child Services. Nested publications occur transparently in their
     * own respective Services and are not invoked here.
     *
     * Generally used for subscribing and synchronizing your scope bindings to changes
     * that occur in the appropriate Service context tree/sub-tree (single direction, down).
     *
     * @param {Service} service - angular service
     * @returns {Function} usage point accepting an own property to react to (method) and a callback (andThen)
     */
    this.using = function(service) {
      return (function(method, andThen, defer) {
        /* Unless deferred, invoke refresh immediately and then ensure that provided
         * method is subscribed and refreshed w/ future updates to the service.
         */
        if (service.$$hasContext) {
          if (!defer) {
            service.refresh(method, andThen)
          }

          var subscription = self.subscribe(service.name, function(data) {
            service.refresh(method, andThen)

            /* Delegate subscribed changes to immediate related contexts (shallow) */
            if (service.rels && service.rels.length) {
              service.rels.forEach(function(rel) {
                self.publish(rel, data)
              })
            }
          })

          /* Expose intuitive 'stop()' for killing subscription */
          subscription.stop = subscription

          return subscription

        } else {
          $log.error('[ng-contexts.using] malformed Service context, please ensure you have added `Contexts.register(this)` at the end of this service', service)
          return false
        }
      }).bind(service)
    }

    /**
     * Traverse a context's current state relationships recursively
     * until all dependent states have been cleared. When not called
     * from select(), clear the context itself as well.
     *
     * @param {string} name - service name
     * @param {bool} clearSelf - whether to clear the calling context too
     * @param {bool} clearListener - whether to clear $rootScope listeners for this context
     * @param {bool} clearData - whether to clear data for this context
     */
    this.clear = function(name, clearSelf = true, clearListener = true, clearData = true) {
      var rels = self.contexts[name] || []
      rels.forEach(function(rel) {
        if (clearData) delete $rootScope.current[rel]
        if (clearListener) self.unsubscribe(rel)

        var next = self.contexts[rel]

        if (next instanceof Array && next.length) {
          next.forEach(function(childRel) {
            self.clear(childRel, clearSelf, clearListener, clearData)
          })
        }
      })

      if (clearSelf && clearData) delete $rootScope.current[name]

      if (clearListener) self.unsubscribe(name)

    }

    /**
     * Establishes a new current context for
     * a service by name/rel and publishes event
     *
     * @param {string} name - service name
     * @param {*} data - arbitrary data to select
     * @param {boolean} force - publish update even if the data is unchanged
     * @param {boolean} model - whether or not to apply model function against data
     * @returns {Object} object to use as representation of current state
     */
    this.select = function(name, data, force, model) {

      var old = $rootScope.current[name]
      var id = self.identifier

      /* Publish update if the current entity has changed, or if 'force' */
      if (!angular.equals(data, old) || force) {
        if (model) {
          data = self.models[name](data)
        }

        $rootScope.current[name] = data

          /* Clear related (and stale) contexts as new context becomes current */
          self.clear(name, false, false)

          /* Publish new state to related contexts */
          self.publish(name, data)
        }

      return data
    }

    /**
     * Determines whether there is a selected context
     *
     * @param {string} name
     * @returns {boolean}
     */
    this.existing = function(name, none = false) {
      var current = this.currentOr(name, none)

      return current && !!current[this.identifier]
    }

    /**
     * Returns the selected "current" data instance relevant to the Service
     * If none can be found, return false
     *
     * @returns {obj} current entity instance
     */
    this.selected = function(name, none = false) {
      return this.currentOr(name, none)
    }

    /**
     * Determines which object is currently used for the current Service context
     *
     * @param {string} name service name
     * @param {boolean} model whether or not to apply registered service model
     * @returns {Object} currently current state representation of the service
     */
    this.current = function(name, model) {
      var state = $rootScope.current[name]

      return model === false ? state : this.models[name](state || {})
    }

    /**
     * Utility function that provides either the current context (by name)
     * or, if the context has not been established yet, the `none` object.
     *
     * @param {string} name service name
     * @param {Object} none object to use as initial context when none exists yet
     * @param {boolean} model whether or not to apply registered service model
     * @returns {Object} current service context or `none` if it doesn't exist
     */
    this.currentOr = function(name, none, model) {
      var current = this.current(name, model)

      // provide "none" object when no current context exists yet
      if (!angular.isObject(current) && !angular.isUndefined(none)) {
        return none
      }

      return current
    }

    /**
     * Simple succinct aliases for getting current contexts
     */
    this.get   = self.current
    this.getOr = self.currentOr

    /**
     * Subscribes to a specific relation, performing
     * the user provided behavior whenever a related
     * publication occurs
     *
     * @param {string} rel relation to subscribe to
     * @param {Function} on behavior to invoke on publication
     */
    this.subscribe = function(rel, on) {
      var subscription = $rootScope.$on(rel, function(event, data) {
        on(data || {}, event)
      })

      return subscription
    }

    /**
     * Removes all $rootScope subscriptions for the given context
     *
     * @param {string} rel - relation to remove listens for
     */
    this.unsubscribe = function(rel) {
      $rootScope.$$listeners[rel] = []
    }

    /**
     * Publishes data to a service by its registered "rel".
     * If the service has any "rels", publish to those as well.
     * This process does not repeat (shallow)
     *
     * @param {string} rel the relation
     * @param {Object} data
     */
    this.publish = function(rel, data) {
      var rels = self.contexts[rel]                // related services to publish to next
      var pubs = rels ? [rel].concat(rels) : [rel] // complete set of services to publish to

      // broadcast data by traversing (top to bottom) shallow heirarchy
      // of directly related contexts (only 1 level deep)
      pubs.forEach(function(pub) {
        if (pub.constructor === String) {
          $rootScope.$broadcast(pub, data)
        } else {
          throw 'rels must be Strings'
        }
      })

      return data
    }
  }])
})(angular)

if (module && exports && module.exports === exports) {
  module.exports = 'ng-contexts'
}
