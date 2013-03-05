NPMBIN = ./node_modules/.bin

.PHONY: test
test: lib
	$(NPMBIN)/mocha --reporter spec tests/lib

lib-cov: clean-coverage
	$(NPMBIN)/istanbul instrument --output lib-cov --no-compact --variable global.__coverage__ lib

.PHONY: coverage
coverage: lib-cov
	COVER_RESOLVER=1 $(NPMBIN)/mocha --reporter mocha-istanbul tests/lib
	@echo
	@echo Open html-report/index.html file in your browser

.PHONY: clean
clean: clean-coverage

.PHONY: clean-coverage
clean-coverage:
	-rm -rf lib-cov
	-rm -rf html-report

