# Installation

### Prerequisites :

Make sure you have the following installed:

- node
- yarn

Project built using version `node v13.6.0`.

### Install

Just run `yarn install` to install all the dependencies.

This will build and display the front-end at `http://localhost:3003`, but in order to run the application completely you need the server setup too! Find instructions to setup your server [here](https://gitlab.com/maitrungduc1410/transcriptor-server-next).

### Developing the transcriptor

All commits need to be pushed into the `dev` branch first, you can then merge it into the `master` branch for automatic deployment.

### Writing Tests

The transcriptor uses `emzyme` as the testing ulitiy to test the React components and `jest` as the test runner.
Read about enzyme [here](https://enzymejs.github.io/enzyme/) and jest [here](https://jestjs.io/docs/en/tutorial-react).

Make sure you run `$ yarn test` before you commit your changes, the transcriptor won't be deployed in case any of your test fails to pass.

### Developing the waveform-playlist-transcriptor package locally

The transcriptor uses the package `waveform-playlist-transcriptor` which is fork of the original `waveform-playlist` with a few additional features. Original repository [here](https://github.com/naomiaro/waveform-playlist). Find the forked repository [here](https://gitlab.com/CodHeK/waveform-playlist-transcriptor).

Make sure to make any changes if needed to the waveform package in the custom forked repository only.

### Developing the transcriptor

All commits need to be pushed into the `dev` branch first, you can then merge it into the `master` branch for automatic deployment.

### Writing Tests

The transcriptor uses `emzyme` as the testing ulitiy to test the React components and `jest` as the test runner.
Read about enzyme [here](https://enzymejs.github.io/enzyme/) and jest [here](https://jestjs.io/docs/en/tutorial-react).

Make sure you run `$ yarn test` before you commit your changes, the applications won't be deployed in case any of your test fails to pass.

### Developing the waveform-playlist-transcriptor package locally

The transcriptor uses the package `waveform-playlist-transcriptor` which is fork of the original `waveform-playlist` with a few additional features. Original repository [here](https://github.com/naomiaro/waveform-playlist). Find the forked repository [here](https://gitlab.com/CodHeK/waveform-playlist-transcriptor).

Make sure to make any changes if needed to the waveform package in the custom forked repository only.

### Configure

Make sure to add the API_HOST in your `.env` file.

Ex: `REACT_APP_API_HOST=http://localhost:3005`

**:warning: NOTE :**

All keys in `.env` must start with the prefix `REACT_APP_`. For more info refer [here](https://create-react-app.dev/docs/adding-custom-environment-variables/)

### User Manual

Find the instructions to use the Transcriptor [here](https://docs.google.com/presentation/d/1vOY-B61avXFZfxO5K1Het1JlrF4NG0sIDXNPeUHFw9U/edit?usp=sharing)

### Note:

- The project uses React Hooks which is in the newer versions of React, make sure you learn how hooks work, can refer to the link [here](https://reactjs.org/docs/hooks-intro.html).

# Develop

This project use [Commitlint](https://github.com/conventional-changelog/commitlint) as linter for Git commit. Every commit with need to follow standard (this project based on [Angular convention](https://github.com/angular/angular/blob/master/CONTRIBUTING.md#-commit-message-guidelines))

Your commit message must follow the following:

```
git commit -m "type(scope?): subject"
```

Real world examples can look like this:

```
git commit -m "chore: run tests on travis ci"
```

```
git commit -m "fix(server): send cors headers"
```

```
git commit -m "feat(blog): add comment section"
```

You can also provide body for commit message like follow:

```
git commit -m "chore: this is subject" -m "this is body"
```

Common types according to commitlint-config-conventional (based on the the [Angular convention](https://github.com/angular/angular/blob/master/CONTRIBUTING.md#-commit-message-guidelines)) can be:

- build: Changes that affect the build system or external dependencies (example scopes: gulp, broccoli, npm)
- ci: Changes to our CI configuration files and scripts (example scopes: Gitlab CI, Circle, BrowserStack, SauceLabs)
- chore: add something without touching production code (Eg: update npm dependencies)
- docs: Documentation only changes
- feat: A new feature
- fix: A bug fix
- perf: A code change that improves performance
- refactor: A code change that neither fixes a bug nor adds a feature
- revert: Reverts a previous commit
- style: Changes that do not affect the meaning of the code (Eg: adding white-space, formatting, missing semi-colons, etc)
- test: Adding missing tests or correcting existing tests
