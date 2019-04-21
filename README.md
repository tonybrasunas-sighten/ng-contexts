# :evergreen_tree: ng-contexts

> Intuitive state management for AngularJS applications

## TL;DR

`Contexts` define the selected state of your application.

The original plug-in provides these benefits:
 * :sparkles: Transparent management of context-based states of your interdependent `Services` and their related components.
 * :art: Non-invasive implementation. A "convention over configuration" approach that allows you to choose how to integrate and when to use.
 * :rocket: Fast, efficient and lazy - based on native PubSub, minimizing the complexity and size of the `$digest` cycle (check out [this post on `$broadcast`](http://www.bennadel.com/blog/2724-scope-broadcast-is-surprisingly-efficient-in-angularjs.htm))
 * :cloud: Light-weight - just 320 lines of code and under 3KB minified!

This fork, `ng-contexts`, adds several features:
  * :smile: Additional exposed functions for convenience, clarity, and power (`modify()`, `selected()`, `exists()`, `clear()`, etc.)
  * :mute: Ability to clear listeners left over when components are removed from the DOM

## Problem
A good description of the problem of intuitively and comprehensively managing selected state in Angular 1.x [is here](https://github.com/slurmulon/ng-current#problem).

## Usage

#### Initial Service Configuration

`ng-contexts` enables you to define a "state tree" -- a hierarchy of related contextualized data objects that synchronize
with your already-existant `Service`s and components, non-invasively.

To include a `Service` in your tree, simply establish the following properties on a service:
 * `this.name` (**required**) a unique name to identify the service (often lowercase version of service)
 * `this.model` (*optional*) pseudo-constructor function that's refreshed on updates to your Service entities
 * `this.rels` (*optional*) collection of immediate child entities, order independent
 * `this.all` (*optional*) function that will retrieve all potential Service entities that can be selected
 * `this.current` (*optional*) function to determine the current selected entity

And then inject `Contexts` and register the service at the end of your definition:

  `Contexts.register(this)`

That's it, that's the minimum configuration needed. You'll likely want to establish `this.all()` and `this.current()` functions only once in your application if you're creating a canonical method to fetch and select entities. If so, these functions can be defined in a shared service and inherited in your individual services.

#### Utilizing Exposed Functions
Once your tree is configured and you want to begin storing and working with selected state, these functions will be useful. They may be called directly in the relevant service or via injecting the service (or the `Contexts` service) into your controllers.

  - `this.select()` - Selects an entity for the context. If the entity's data is different from the existing selected data, this will publish to the tree and clear any nodes below it. Takes `Object` param which will overwrite/add to the selected entity any properties included on the object. Additional boolean `force` parameter will trigger a publish even if the data is not different.
  - `this.use()` - Subscribes to a function and will execute a callback when the function's value changes. Similar to Angular's `$scope.$watch` in creating a subscription to a data entity. Takes a `Function` name param for the function to use to determine whether data has changed. Takes second `Function` parameter which is the callback to be executed. Additional optional boolean `defer` param will prevent the callback from executing when the `use()` is first called.
  - `this.modify()` - Update selected data for a context without subscribing or publishing. Avoids triggering updates to the tree. Takes `Object` param which will overwrite/add to the selected entity any properties included on the object. Additional boolean `publish` parameter will trigger publish of the entity to the tree.
  - `this.exists()` - Returns a simple boolean value if there is a selected entity for the context. *Note: Uses the `uuid` property to avoid false positives when functions have been added via `model()` but no entity is selected.*
  - `this.get()` - Returns the selected entity. Takes a `String` parameter of the name of the entity.
  - `this.getOr()` - Returns the selected entity, or an alternative value if `exists()` is false. Takes a `String` parameter of the name of the entity, and a second parameter for what to return if `exists()` is false.
  - `this.selected()` - Returns the selected data entity for the service. Doesn't need a parameter. Shorthand for `Contexts.get([context.name])`
  - `this.clear()` - Explicitly clear all `select()` data and `use()` subscriptions for the service.


## Example
Below is a simple use case and implementation. We're managing a dynamic selected state for solar sales software, where our relevant services are: Users, Sites, Contacts, and Quotes. Each user can have multiple sites and contacts, and each site can have multiple quotes.

We establish a contexts tree like this:

```
                                 User
                                  |
                   +-----------------------------+
                   |                             |
                   v                             v
                 Site                         Contact
                   |
                   |
                   v
                 Quote
```

We configure our Services to establish this tree.

```javascript
/* First, inject `Contexts` service */
module.service('User', function(Contexts) {
  var self = this

  this.name = 'user'              // name to use as primary lookup and to establish relations
  this.rels = ['site', 'contact'] // define the tree of services that have an immediate relationship

  this.model = function(user) {   // model logic for a single `User` entity

    user.firstName = function() {
      return user.givenName + ' ' + user.familyName
    }

    return user
  }

  /*
   * User defined generator method to fetch all potential entities to select.
   * Typically something using `$http` or `$resource` with cache.
   * multiple users are considered here because
   * more than one user may use the application
   * in a single window session (asynchronous re-authentication)
   */
  this.all = function() {
    return [
      {id: 1, name: 'bob'},
      {id: 2, name: 'donna'}
    ]
  }

  /*
   * User defined method to determine the "current" user.
   * Can be via a url, a token, anything!
   * Here we're lazy and if there isn't already a selected entity, we're
   * simply returning the first element in the array.
   */
  this.current = function() {
    return self.all().then(function(users) {
      return Contexts.getOr('user', users[0])
    })
  }

  /*
   * Required registration as the final statement of your `Service`.
   * registers your Service with the global "tree" of contexts
   */
  Contexts.register(this)
})
```

We would now also define `Site`, `Contact` and `Quote` services that resemble `User`. Each of course is free to have its own implementation and functionality. Let's just look at `Site`:

```javascript
module.service('Site', function(Contexts) {
  var self = this

  this.name = 'site'
  this.rels = ['quote']

  this.model = function(site) {
    site.label = function() {
      return site.street_number + ' ' + site.street_name + ', ' + site.city + ', ' + site.state
    }

    return site
  }

  this.all = function() {
    /* Define the method to get all selectable entities for Site */
    return [
      {id: 1, street_number: '123', street_name: 'Magic Way', city: 'San Francisco', state: 'CA' },
      {id: 2, street_number: '456', street_name: 'JavaS Way', city: 'San Francisco', state: 'CA' }
    ]
  }

  this.current = function() {
    /* Define the method to identify the currenly selected entity */
    return self.all().then(function(sites) {
      return Contexts.getOr('site', sites[0])
    })
  }

  Contexts.register(this)
})
```

Once our `Services` are defined and wired together, any components or directives that inherit their contexts will be synchronized accordingly whenever anything related to the context is published or updated.

For instance, any `select()` called to update `User` will clear data and re-delegate to `Site` and `Contact`, and will also clear `Quote` beause `Quote` is related to `Site` which is related to `User`. Every controller, directive or component dependent on these contexts will also receive the udpates.

```javascript
module.directive('currentQuote', function(Contexts, Quote, $log) {
  return {
    restrict: 'EA',
    template: '<h1>Selected Quote</h1><p>{{ quote | json }}</p>',
    controller: function(scope) {
      /* Define a callback to be triggered whenever a new `User`, `Site`, or `Quote` is selected */
      Quote.use('current', function(quote) {
        $log.info('New quote selected', quote)

        scope.quote = quote
      })

      scope.selectQuote(quote) {
        /*
         * Handle a user selection of a new quote in the UI.
         * Will also publish the new entity and trigger the callback definied in the `use()` above
         */
        Quote.select(quote)
      }

      scope.updateQuoteCost(newCost) {
        /*
         * A sample controller function to update a property on an instance without publishing.
         * Handle user update to a property via the UI.
         */
        var cost = newCost
        Quote.modify({cost})
      }
    }
  }
})
```
To see a working example, check out [this Plunker](http://plnkr.co/edit/dyoDC72r3nNke6p2WaJR?p=preview).

## Installation

`npm install ng-contexts`

**ES5**
```javascript
var Current = require('ng-contexts')
```

**ES6**
```javascript
import Current from 'ng-contexts'
```

**Be sure to require `angular` first** so that it's accessible to `ng-contexts`:

```javascript
import angular
import Contexts from 'ng-contexts'
```

Then add it to your own module:

```javascript
angular.module('myModule', ['ng-contexts'])
```

---

If you aren't using a package tool like `webpack` or `browserify`, fall back to the traditional method:

**Full**
```html
<script type="text/javascript" src="/node_modules/ng-contexts/ng-contexts.js"></script>
```

**Minified**
```html
<script type="text/javascript" src="/node_modules/ng-contexts/ng-contexts.min.js"></script>
```
