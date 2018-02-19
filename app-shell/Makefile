# opentrons app desktop shell makefile

SHELL := /bin/bash

# add node_modules/.bin to PATH
PATH := $(shell yarn bin):$(PATH)

# ui directory for production build
ui_dir := ../app

# set NODE_ENV for a command with $(env)=environment
env := cross-env NODE_ENV

# build and publish options
BRANCH_STABLE := master
BRANCH_EDGE := v3a

# required environment variables for publish
publish := $(and $(OT_BRANCH),$(OT_BUILD))

ifndef publish
	channel := local
else ifeq ($(OT_BRANCH),$(BRANCH_STABLE))
	channel := stable
else ifeq ($(OT_BRANCH),$(BRANCH_EDGE))
	channel := edge
	suffix := $(channel)-b$(OT_BUILD)
else
	channel := $(OT_BRANCH)
	suffix := $(channel)-b$(OT_BUILD)
endif

publish_files := "dist/**/opentrons-v*" "dist/**/$(channel)*.@(yml|json)"
publish_dir := dist/publish

builder := env=production NAME_SUFFIX=$(or $(suffix),$(channel)) \
	electron-builder --publish=never \
	-c.publish.bucket=$(OT_BUCKET_RUN_APP) \
	-c.publish.path=$(OT_FOLDER_RUN_APP) \
	-c.publish.channel=$(channel)

# standard targets
#####################################################################

foobar:
	echo $(eb_opts)

.PHONY: all
all: clean package

.PHONY: install
install:
	yarn

.PHONY: uninstall
uninstall:
	shx rm -rf node_modules

.PHONY: clean
clean:
	shx rm -rf dist

# artifacts
#####################################################################

.PHONY: ui
ui:
	$(MAKE) -C $(ui_dir)

.PHONY: package
package: ui
	$(builder) --dir

.PHONY: dist-posix
dist-posix: clean ui
	$(builder) --linux --mac
	$(MAKE) _dist-collect-artifacts

.PHONY: dist-mac
dist-mac: clean ui
	$(builder) --mac
	$(MAKE) _dist-collect-artifacts

.PHONY: dist-linux
dist-linux: clean ui
	$(builder) --linux
	$(MAKE) _dist-collect-artifacts

.PHONY: dist-win
dist-win: clean ui
	$(builder) --win
	$(MAKE) _dist-collect-artifacts

# copy distributable artifacts to the publish directory
.PHONY: _dist-collect-artifacts
_dist-collect-artifacts:
	shx mkdir -p dist/publish && shx cp $(publish_files) $(publish_dir)

# development
#####################################################################

.PHONY: dev
dev:
	$(env)=development PORT=$(port) electron lib/main.js
