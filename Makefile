
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
	# Building scripts...
	if [ -d "./dist" ]; then rm -rf ./dist; fi
	if [ -d "./dist-scripts" ]; then rm -rf ./dist-scripts; fi
	npm run --silent build > '/dev/null' 2>&1
	npm run --silent build-scripts > '/dev/null' 2>&1
endif

.PHONY: script-clean-dirs
script-clean-dirs:
ifneq ("$(HEADLESS_SCRIPTS_SKIP_CLEAN)", "1")
	# Cleaning built code dirs...
	if [ -d "./dist" ]; then rm -rf ./dist; fi
	if [ -d "./dist-scripts" ]; then rm -rf ./dist-scripts; fi
endif

.PHONY: run_words
run_words:
	node dist-scripts/generate_words.js

.PHONY: run_create_hsm_key
run_create_hsm_key:
ifeq ($(keyname),)
	@echo "Usage: make create_hsm_key keyname=YOUR_KEYNAME"
else
	@echo "Creating new key..."
	node dist-scripts/create-hsm-wallet.js $(keyname)
endif

.PHONY: run_xpub_from_seed
run_xpub_from_seed:
ifeq ($(seed),)
	@echo "Usage: make xpub_from_seed seed=YOUR_SEED"
else
	node dist-scripts/get_xpub_from_seed.js $(seed)
endif

# Commands

.PHONY: words
words: script-build-dirs run_words script-clean-dirs

.PHONY: create_hsm_key
create_hsm_key: script-build-dirs run_create_hsm_key script-clean-dirs

.PHONY: xpub_from_seed
xpub_from_seed: script-build-dirs run_xpub_from_seed script-clean-dirs
