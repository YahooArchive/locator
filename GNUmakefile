NPMBIN = ./node_modules/.bin

.PHONY: test
test: lib
	-rm -rf artifacts/test/report.xml
	-mkdir -p artifacts/test
	$(NPMBIN)/mocha --reporter xunit tests/lib > artifacts/test/report.xml

lib-cov: clean-coverage
	@test -d artifacts || mkdir artifacts
	$(NPMBIN)/istanbul instrument --output artifacts/lib-cov --no-compact --variable global.__coverage__ lib

.PHONY: coverage
coverage: lib-cov
	COVER_LOCATOR=1 ISTANBUL_REPORTERS=text-summary,lcov $(NPMBIN)/mocha --reporter mocha-istanbul tests/lib
	-mkdir -p artifacts/test/coverage
	mv lcov-report artifacts/test/coverage
	mv lcov.info artifacts/test/coverage
	@echo
	@echo Open artifacts/test/coverage/lcov-report/index.html file in your browser

.PHONY: clean
clean: clean-coverage

.PHONY: clean-coverage
clean-coverage:
	-rm -rf artifacts/lib-cov
	-rm -rf artifacts/test/coverage/lcov-report
	-rm artifacts/test/coverage/lcov.info

