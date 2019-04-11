# 1.1.1
 - Add and expose `modify()`, `selected()`, and `exists()` methods, bound to the service
 - Expose `clear()` as well
 - Add handling for removing `$rootScope` listeners via `unsubscribe()` method

# 1.1.0
 - Forked! :fork:
 - New author! :pencil:
 - Rename to ng-contexts :tada:

# 1.0.10

 - Added function this bindings to behave more lexically (use of `.bind(service)`)
 - Optional `model` argument for `current` and `get`, allowing user to control application of model function

# 1.0.9

 - Added `force` parameter to `publish` so users can react to events rather than just changes

# 1.0.8

 - Simplified `subscribe` (no longer a Promise)
 - Added `defer` parameter to `using` and `refreshing` to help avoid reacting to initial empty data"
