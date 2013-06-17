Contributing Code to `locator`
------------------------------

This components follows the same contribution model used by [Mojito][], you can
review the [Contributing-Code-to-Mojito file][] for more details.

Please be sure to sign our [CLA][] before you submit pull requests or otherwise contribute to `locator`. This protects `locator` developers, who rely on [locator's BSD license][].

[locator's BSD license]: https://github.com/yahoo/locator/blob/master/LICENSE.txt
[CLA]: http://developer.yahoo.com/cocktails/mojito/cla/
[Mojito]: https://github.com/yahoo/mojito
[Contributing-Code-to-Mojito file]: https://github.com/yahoo/mojito/wiki/Contributing-Code-to-Mojito

Dev mode installation
---------------------

- The main source files are located under `lib/`.
- Unit tests are located under `tests/lib/*`.

To install the dependencies:

    npm install

To run the unit tests (with coverage by default):

    npm test

To lint the app lib folder:

    npm run lint
