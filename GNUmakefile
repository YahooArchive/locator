NPMBIN = ./node_modules/.bin

.PHONY: test
test: lib
	$(NPMBIN)/mocha --reporter spec tests/lib

lib-cov: clean-coverage
	@test -d artifacts || mkdir artifacts
	$(NPMBIN)/istanbul instrument --output artifacts/lib-cov --no-compact --variable global.__coverage__ lib

.PHONY: coverage
coverage: lib-cov
	COVER_LOCATOR=1 ISTANBUL_REPORTERS=text-summary,lcov $(NPMBIN)/mocha --reporter mocha-istanbul tests/lib
	mv lcov-report artifacts/
	mv lcov.info artifacts/
	@echo
	@echo Open artifacts/lcov-report/index.html file in your browser

.PHONY: clean
clean: clean-coverage

.PHONY: clean-coverage
clean-coverage:
	-rm -rf artifacts/lib-cov
	-rm -rf artifacts/lcov-report
	-rm artifacts/lcov.info

