
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
clean: .script-clean-dirs

.PHONY: build
build: .script-build-dirs

# Only clean and build the source code if HEADLESS_SCRIPTS_SKIP_BUILD is not "1"
# This allows local runs to build source code and container runs to skip building
# We can also skip building locally if we define the envvar.
.PHONY: .script-build-dirs
.script-build-dirs:
ifneq ("$(HEADLESS_SCRIPTS_SKIP_BUILD)", "1")
	# Building scripts...
	if [ -d "./dist" ]; then rm -rf ./dist; fi
	if [ -d "./dist-scripts" ]; then rm -rf ./dist-scripts; fi
	npm run --silent build > '/dev/null'
	npm run --silent build-scripts > '/dev/null'
endif

# Only clean the source code if HEADLESS_SCRIPTS_SKIP_CLEAN is not "1"
# This allows local runs to clean the built dirs and container runs to skip cleaning
# We can also skip cleaning locally if we define the envvar.
.PHONY: .script-clean-dirs
.script-clean-dirs:
ifneq ("$(HEADLESS_SCRIPTS_SKIP_CLEAN)", "1")
	# Cleaning built code dirs...
	if [ -d "./dist" ]; then rm -rf ./dist; fi
	if [ -d "./dist-scripts" ]; then rm -rf ./dist-scripts; fi
endif

# Internal target to run generate_words command.
.PHONY: .run_words
.run_words:
	node dist-scripts/generate_words.js

# Internal target to run create_hsm_key command.
.PHONY: .run_create_hsm_key
.run_create_hsm_key:
ifeq ($(keyname),)
	@echo "Usage: make create_hsm_key keyname=YOUR_KEYNAME"
else
	@echo "Creating new key..."
	node dist-scripts/create-hsm-wallet.js $(keyname)
endif

# Internal target to run xpub_from_seed command.
.PHONY: .run_xpub_from_seed
.run_xpub_from_seed:
ifeq ($(seed),)
	@echo "Usage: make xpub_from_seed seed=YOUR_SEED"
else
	node dist-scripts/get_xpub_from_seed.js $(seed)
endif

# Command: generate words
.PHONY: words
words: .script-build-dirs .run_words .script-clean-dirs

# Command: create HSM key
.PHONY: create_hsm_key
create_hsm_key: .script-build-dirs .run_create_hsm_key .script-clean-dirs

# Command: Derive xPub from seed
.PHONY: xpub_from_seed
xpub_from_seed: .script-build-dirs .run_xpub_from_seed .script-clean-dirs
