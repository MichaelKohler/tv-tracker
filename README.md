# tv-tracker

Track TV shows you've watched. Note that this is mostly for myself, however feel free to contribute as well :)

## Development

This project is based on React Router. It's integrated with Sentry, so please change the DSN in `app/entry.client.tsx` and `app/entry.server.tsx` to reflect your own Sentry project.

```sh
vp install
vp exec playwright install
vp run dev:deps
vp run setup
vp dev
```

This starts your app in development mode, rebuilding assets on file changes. The data is stored in a local Postgres instance.

**Note**: Always use `vp install` to install dependencies. Only use `vp add <package>` when explicitly adding new packages.

The database seed script creates a new user with some data you can use to get started:

- Email: `rachel@remix.run`
- Password: `rachelrox`

### Formatting

We use [vite-plus](https://github.com/voidzero-dev/vite-plus) (`vp`) for formatting and linting in this project. Run `vp fmt .` to format all files, or `vp check` to check formatting and linting without making changes.

### Tests

To run all tests, use

```sh
vp run validate
```

which will run all available tests.

## Database

Shows are stored in the `Show` table the first time a user adds a given show. Subsequent additions do not result in shows being added multiple times. At the same time episodes are fetched and stored in the `Episode` table.

Adding a show results in a link in `ShowsOnUser` to keep track which user has added which shows. This table also stores whether a user has archived a given show.

Episode links to users are stored in the `EpisodeOnUser` table. Whenever a new show is added, all episodes are marked as unwatched. When an episode gets marked as watched, a new entry in the `EpisodeOnUser` table is created. This saves storage space as not every episode needs to be added to every user.

## Feature Flags

Certain features are configured through feature flags. I am using flipt.io for this. By default the `FLIPT_ENVIRONMENT` is set to an empty string, which means that everything will be enabled by default.
