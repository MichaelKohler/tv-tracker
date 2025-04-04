# tv-tracker

Track TV shows you've watched. Note that this is mostly for myself, however feel free to contribute as well :)

## Development

This project is based on React Router.

```sh
npm ci
npx playwright install
npm run setup
npm run dev
```

This starts your app in development mode, rebuilding assets on file changes.

The database seed script creates a new user with some data you can use to get started:

- Email: `rachel@remix.run`
- Password: `rachelrox`

### Formatting

We use [Prettier](https://prettier.io/) for auto-formatting in this project. It's recommended to install an editor plugin (like the [VSCode Prettier plugin](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)) to get auto-formatting on save. There's also a `npm run format` script you can run to format all files in the project.

### Tests

To run all test, use

```sh
npm run validate
```

which will run all available tests.

## Database

Shows are stored in the `Show` table the first time a user adds a given show. Subsequent additions do not result in shows being added multiple times. At the same time episodes are fetched and stored in the `Episode` table.

Adding a show results in a link in `ShowsOnUser` to keep track which user has added which shows. This table also stores whether a user has archived a given show.

Episode links to users are stored in the `EpisodeOnUser` table. Whenever a new show is added, all episodes are marked as unwatched. When an episode gets marked as watched, a new entry in the `EpisodeOnUser` table is created. This saves storage space as not every episode needs to be added to every user.
