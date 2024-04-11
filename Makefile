
ifndef VERBOSE
.SILENT:
endif

.PHONY: all
all:
	@echo "No default action."

.PHONY: check
check:
	npm run lint

.PHONY: clean
clean: script-clean-dirs

.PHONY: build
build: script-build-dirs

.PHONY: script-build-dirs
script-build-dirs:
ifneq ("$(HEADLESS_SCRIPTS_SKIP_BUILD)", "1")
	# Building source code
	@echo "Building scripts...\n"
	if [ -d "./dist" ]; then rm -rf ./dist; fi
	if [ -d "./dist-scripts" ]; then rm -rf ./dist-scripts; fi
	npm run --silent build > '/dev/null' 2>&1
	npm run --silent build-scripts > '/dev/null' 2>&1
endif

.PHONY: script-clean-dirs
script-clean-dirs:
ifneq ("$(HEADLESS_SCRIPTS_SKIP_CLEAN)", "1")
	# Cleaning build dirs
	@echo "\nCleaning built code dirs...\n"
	if [ -d "./dist" ]; then rm -rf ./dist; fi
	if [ -d "./dist-scripts" ]; then rm -rf ./dist-scripts; fi
endif

.PHONY: run_words
run_words:
	node dist-scripts/generate_words.js

.PHONY: words
words: script-build-dirs run_words script-clean-dirs
