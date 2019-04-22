# 1.1.5
 - Improve documentation
 - Rewrite README:
    - Acknowledge updated code and changes in plug-in's focus after the fork.
    - Document all exposed functions, including the 5 new ones.
    - Remove (with link) extensive discussion of the problem `Contexts` is designed to solve
    - Improve Example in the README and remove out of date example in the `demos` diretory

# 1.1.4
 - Ensure `.clear()` will clear top level listeners (unless told not to).

# 1.1.3
 - Cleanup export from `index.js` for applications that pre-check resolve

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
